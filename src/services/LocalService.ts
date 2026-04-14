// ---------------------------------------------------------------------------
// LocalService — IAppService implementation for all users (ghost + registered).
//
// SQLite is the single source of truth for all users. Writes always land here
// first; SyncService pushes dirty records to the server in the background.
//
// Sync conventions:
//   • Every write sets updated_at = Date.now() and keeps last_synced_at = null
//     (SyncService stamps last_synced_at after a confirmed server push).
//   • Deletions are soft-deletes (is_deleted = true) so tombstones can sync.
//     Exception: session_sets are managed atomically within updateSession;
//     they're replaced wholesale and the parent session's updated_at covers them.
//   • Read queries filter out is_deleted = true rows.
// ---------------------------------------------------------------------------

import { eq, and, like, gte, lte, lt, gt, desc, inArray, or, isNull } from 'drizzle-orm';

import type { IAppService } from './types';
import type { Exercise } from '../types/index';
import type { ExerciseFilters, CreateExerciseDto, UpdateExerciseDto } from '../api/exercises';
import type {
  Plan, PlanDetail, CreatePlanDto, UpdatePlanDto,
  AddExerciseDto, RoutineDetail, RoutineExercise as PlanRoutineExercise,
} from '../api/plans';
import type { Routine, RoutineStartResponse, FinishWorkoutDto } from '../api/workouts';
import type {
  HistorySession, UserStats, SessionDetail, UpdateSessionDto, ChartPoint,
} from '../api/history';

import { db } from '../db/client';
import {
  exercises as exercisesTable,
  workout_plans,
  workout_routines,
  routine_exercises,
  workout_sessions,
  session_sets,
  user_settings,
} from '../db/schema';
import { calculateWorkoutTargets } from './progressionEngine';

// ---------------------------------------------------------------------------
// Sync types — used by SyncService to read pending records
// ---------------------------------------------------------------------------

export type SyncableExercise        = typeof exercisesTable.$inferSelect;
export type SyncablePlan            = typeof workout_plans.$inferSelect;
export type SyncableRoutine         = typeof workout_routines.$inferSelect;
export type SyncableRoutineExercise = typeof routine_exercises.$inferSelect;
export type SyncableSession         = typeof workout_sessions.$inferSelect;
export type SyncableSet             = typeof session_sets.$inferSelect;
export type SyncableSettings        = typeof user_settings.$inferSelect;

export interface PendingSyncData {
  exercises:        SyncableExercise[];
  plans:            SyncablePlan[];
  routines:         SyncableRoutine[];
  routineExercises: SyncableRoutineExercise[];
  sessions:         SyncableSession[];
  sets:             SyncableSet[];
  settings:         SyncableSettings[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** UUID v4 — crypto.randomUUID() with Math.random() fallback. */
const randomUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

/** Parse a JSON-encoded text column back to a string array. */
const parseArr = (raw: string): string[] => {
  try { return JSON.parse(raw) as string[]; }
  catch { return []; }
};

/** Add N weeks to an ISO date string, return "YYYY-MM-DD". */
const addWeeks = (isoDate: string, weeks: number): string => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
};

/** now() as Unix milliseconds — stamped on every write. */
const now = (): number => Date.now();

/** Condition: record is not yet synced or has changed since last sync. */
const pendingSync = (updatedAt: typeof workout_plans.updated_at, lastSyncedAt: typeof workout_plans.last_synced_at) =>
  or(isNull(lastSyncedAt), lt(lastSyncedAt, updatedAt));

/** Map a raw exercises row to the Exercise API type. */
const rowToExercise = (r: typeof exercisesTable.$inferSelect): Exercise => ({
  ...r,
  status:                  r.status as 'active' | 'deprecated',
  difficulty:              r.difficulty as Exercise['difficulty'],
  secondary_muscle_groups: parseArr(r.secondary_muscle_groups),
  tags:                    parseArr(r.tags),
  aliases:                 parseArr(r.aliases),
});

/** Map a raw workout_plans row to the Plan API type. */
const rowToPlan = (r: typeof workout_plans.$inferSelect): Plan => ({
  id:             r.id,
  name:           r.name,
  description:    r.description ?? undefined,
  start_date:     r.start_date,
  end_date:       r.end_date,
  duration_weeks: r.duration_weeks,
  is_active:      r.is_active,
});

// ---------------------------------------------------------------------------
// LocalService
// ---------------------------------------------------------------------------

export class LocalService implements IAppService {
  // =========================================================================
  // Exercises — reads
  // =========================================================================

  async getExercisesFiltered(filters?: ExerciseFilters): Promise<Exercise[]> {
    const conditions = [eq(exercisesTable.is_deleted, false)];

    if (filters?.q) {
      conditions.push(like(exercisesTable.name, `%${filters.q}%`));
    }
    if (filters?.muscle_group) {
      conditions.push(eq(exercisesTable.primary_muscle_group, filters.muscle_group));
    }
    if (filters?.exercise_type) {
      conditions.push(eq(exercisesTable.exercise_type, filters.exercise_type));
    }
    if (filters?.movement_pattern) {
      conditions.push(eq(exercisesTable.movement_pattern, filters.movement_pattern));
    }
    if (filters?.equipment_type) {
      conditions.push(eq(exercisesTable.equipment_type, filters.equipment_type));
    }
    if (filters?.status) {
      conditions.push(eq(exercisesTable.status, filters.status));
    }
    if (filters?.is_system !== undefined) {
      conditions.push(eq(exercisesTable.is_system_template, filters.is_system));
    }

    const rows = await db.select().from(exercisesTable).where(and(...conditions));
    return rows.map(rowToExercise);
  }

  // =========================================================================
  // Exercises — writes
  // =========================================================================

  async createExercise(data: CreateExerciseDto): Promise<Exercise> {
    const id = randomUUID();
    await db.insert(exercisesTable).values({
      id,
      name:                    data.name,
      slug:                    data.slug ?? null,
      primary_muscle_group:    data.primary_muscle_group ?? '',
      secondary_muscle_groups: JSON.stringify(data.secondary_muscle_groups ?? []),
      exercise_type:           data.exercise_type ?? '',
      movement_pattern:        data.movement_pattern ?? '',
      equipment_type:          data.equipment_type ?? '',
      force_type:              data.force_type ?? null,
      status:                  data.status ?? 'active',
      difficulty:              data.difficulty ?? null,
      tags:                    JSON.stringify(data.tags ?? []),
      aliases:                 JSON.stringify(data.aliases ?? []),
      default_increment:       data.default_increment,
      unit:                    data.unit,
      is_custom:               true,
      is_system_template:      false,
      user_id:                 'local',
      updated_at:              now(),
      is_deleted:              false,
      last_synced_at:          null,
    });

    const [row] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id))
      .limit(1);

    return rowToExercise(row);
  }

  async updateExercise(id: string, data: UpdateExerciseDto): Promise<Exercise> {
    const set: Record<string, unknown> = { updated_at: now() };
    if (data.name                    !== undefined) set.name                    = data.name;
    if (data.slug                    !== undefined) set.slug                    = data.slug;
    if (data.primary_muscle_group    !== undefined) set.primary_muscle_group    = data.primary_muscle_group;
    if (data.exercise_type           !== undefined) set.exercise_type           = data.exercise_type;
    if (data.movement_pattern        !== undefined) set.movement_pattern        = data.movement_pattern;
    if (data.equipment_type          !== undefined) set.equipment_type          = data.equipment_type;
    if (data.force_type              !== undefined) set.force_type              = data.force_type;
    if (data.status                  !== undefined) set.status                  = data.status;
    if (data.difficulty              !== undefined) set.difficulty              = data.difficulty;
    if (data.default_increment       !== undefined) set.default_increment       = data.default_increment;
    if (data.unit                    !== undefined) set.unit                    = data.unit;
    if (data.secondary_muscle_groups !== undefined) {
      set.secondary_muscle_groups = JSON.stringify(data.secondary_muscle_groups);
    }
    if (data.tags    !== undefined) set.tags    = JSON.stringify(data.tags);
    if (data.aliases !== undefined) set.aliases = JSON.stringify(data.aliases);

    await db.update(exercisesTable).set(set).where(eq(exercisesTable.id, id));

    const [row] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id))
      .limit(1);

    if (!row) throw new Error(`Exercise not found: ${id}`);
    return rowToExercise(row);
  }

  async deleteExercise(id: string): Promise<void> {
    // Soft-delete so the tombstone can be pushed to the server during sync.
    await db
      .update(exercisesTable)
      .set({ is_deleted: true, updated_at: now() })
      .where(eq(exercisesTable.id, id));
  }

  async copyExercise(id: string): Promise<Exercise> {
    const [source] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id))
      .limit(1);

    if (!source) throw new Error(`Exercise not found: ${id}`);

    const existingNames = new Set(
      (await db
        .select({ name: exercisesTable.name })
        .from(exercisesTable)
        .where(and(eq(exercisesTable.user_id, 'local'), eq(exercisesTable.is_deleted, false)))
      ).map(r => r.name),
    );

    const baseName = source.name.trim() || 'Custom Exercise';
    let uniqueName = baseName;
    let suffix = 2;
    while (existingNames.has(uniqueName)) {
      uniqueName = `${baseName} ${suffix}`;
      suffix += 1;
    }

    const newId = randomUUID();
    await db.insert(exercisesTable).values({
      id:                      newId,
      name:                    uniqueName,
      slug:                    null,
      primary_muscle_group:    source.primary_muscle_group,
      secondary_muscle_groups: source.secondary_muscle_groups,
      exercise_type:           source.exercise_type,
      movement_pattern:        source.movement_pattern,
      equipment_type:          source.equipment_type,
      force_type:              source.force_type,
      status:                  source.status,
      difficulty:              source.difficulty,
      tags:                    source.tags,
      aliases:                 source.aliases,
      default_increment:       source.default_increment,
      unit:                    source.unit,
      is_custom:               true,
      is_system_template:      false,
      user_id:                 'local',
      updated_at:              now(),
      is_deleted:              false,
      last_synced_at:          null,
    });

    const [row] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, newId))
      .limit(1);

    return rowToExercise(row);
  }

  // =========================================================================
  // Plans — reads
  // =========================================================================

  async getPlans(): Promise<Plan[]> {
    const rows = await db
      .select()
      .from(workout_plans)
      .where(eq(workout_plans.is_deleted, false));
    return rows.map(rowToPlan);
  }

  async getPlanDetails(id: string): Promise<PlanDetail> {
    const [plan] = await db
      .select()
      .from(workout_plans)
      .where(and(eq(workout_plans.id, id), eq(workout_plans.is_deleted, false)))
      .limit(1);

    if (!plan) throw new Error(`Plan not found: ${id}`);

    const routineRows = await db
      .select()
      .from(workout_routines)
      .where(and(eq(workout_routines.plan_id, id), eq(workout_routines.is_deleted, false)));

    const routines: RoutineDetail[] = await Promise.all(
      routineRows.map(async r => {
        const exRows = await db
          .select({
            re_id:                      routine_exercises.id,
            exercise_id:                routine_exercises.exercise_id,
            exercise_name:              exercisesTable.name,
            target_sets:                routine_exercises.target_sets,
            target_reps:                routine_exercises.target_reps,
            target_weight:              routine_exercises.target_weight,
            target_duration_seconds:    routine_exercises.target_duration_seconds,
            rest_seconds:               routine_exercises.rest_seconds,
            increment_weight:           routine_exercises.increment_weight,
            increment_reps:             routine_exercises.increment_reps,
            increment_duration_seconds: routine_exercises.increment_duration_seconds,
          })
          .from(routine_exercises)
          .leftJoin(exercisesTable, eq(routine_exercises.exercise_id, exercisesTable.id))
          .where(and(
            eq(routine_exercises.routine_id, r.id),
            eq(routine_exercises.is_deleted, false),
          ))
          .orderBy(routine_exercises.order_index);

        const exercises: PlanRoutineExercise[] = exRows.map(e => ({
          id:                         e.re_id,
          exercise_id:                e.exercise_id,
          name:                       e.exercise_name ?? 'Unknown',
          target_sets:                e.target_sets,
          target_reps:                e.target_reps,
          target_weight:              e.target_weight,
          target_duration_seconds:    e.target_duration_seconds,
          rest_seconds:               e.rest_seconds,
          increment_weight:           e.increment_weight,
          increment_reps:             e.increment_reps,
          increment_duration_seconds: e.increment_duration_seconds,
        }));

        return {
          id:           r.id,
          name:         r.name,
          day_of_week:  r.day_of_week ?? 0,
          routine_type: r.routine_type as 'workout' | 'rest',
          exercises,
        };
      }),
    );

    return { ...rowToPlan(plan), routines };
  }

  // =========================================================================
  // Plans — writes
  // =========================================================================

  async createPlan(data: CreatePlanDto): Promise<Plan> {
    const startDate = data.start_date;
    const endDate   = addWeeks(startDate, data.duration_weeks);

    const conflicts = await db
      .select({ name: workout_plans.name })
      .from(workout_plans)
      .where(
        and(
          eq(workout_plans.is_active, true),
          eq(workout_plans.is_deleted, false),
          lt(workout_plans.start_date, endDate),
          gt(workout_plans.end_date,   startDate),
        ),
      );

    if (conflicts.length > 0) {
      const names = conflicts.map(c => c.name).join(', ');
      throw new Error(`Plan dates overlap with existing active plans: ${names}`);
    }

    const id     = randomUUID();
    const nowIso = new Date().toISOString();

    await db.insert(workout_plans).values({
      id,
      name:           data.name,
      description:    data.description ?? null,
      duration_weeks: data.duration_weeks,
      start_date:     startDate,
      end_date:       endDate,
      is_active:      true,
      created_at:     nowIso,
      updated_at:     now(),
      is_deleted:     false,
      last_synced_at: null,
    });

    const [row] = await db
      .select()
      .from(workout_plans)
      .where(eq(workout_plans.id, id))
      .limit(1);

    return rowToPlan(row);
  }

  async updatePlan(id: string, data: UpdatePlanDto): Promise<Plan> {
    const set: Record<string, unknown> = { updated_at: now() };
    if (data.name        !== undefined) set.name        = data.name;
    if (data.description !== undefined) set.description = data.description;
    if (data.is_active   !== undefined) set.is_active   = data.is_active;

    if (data.start_date !== undefined) {
      set.start_date = data.start_date;
      const [existing] = await db
        .select({ duration_weeks: workout_plans.duration_weeks })
        .from(workout_plans)
        .where(eq(workout_plans.id, id))
        .limit(1);
      if (existing) {
        set.end_date = addWeeks(data.start_date, existing.duration_weeks);
      }
    }

    await db.update(workout_plans).set(set).where(eq(workout_plans.id, id));

    const [row] = await db
      .select()
      .from(workout_plans)
      .where(eq(workout_plans.id, id))
      .limit(1);

    if (!row) throw new Error(`Plan not found: ${id}`);
    return rowToPlan(row);
  }

  async deletePlan(id: string): Promise<void> {
    // Always soft-delete: set is_deleted=true so the tombstone can sync to server.
    // Also set is_active=false so the plan disappears from the UI immediately.
    // SyncService will push the deletion; a background cleanup job can purge
    // fully-synced tombstones later if needed.
    await db
      .update(workout_plans)
      .set({ is_deleted: true, is_active: false, updated_at: now() })
      .where(eq(workout_plans.id, id));
  }

  // =========================================================================
  // Routines — reads
  // =========================================================================

  async getRoutines(): Promise<Routine[]> {
    const routineRows = await db
      .select({
        id:           workout_routines.id,
        name:         workout_routines.name,
        day_of_week:  workout_routines.day_of_week,
        routine_type: workout_routines.routine_type,
      })
      .from(workout_routines)
      .innerJoin(workout_plans, eq(workout_routines.plan_id, workout_plans.id))
      .where(and(
        eq(workout_plans.is_active, true),
        eq(workout_plans.is_deleted, false),
        eq(workout_routines.is_deleted, false),
      ));

    return Promise.all(
      routineRows.map(async r => {
        const [lastSession] = await db
          .select({ end_time: workout_sessions.end_time })
          .from(workout_sessions)
          .where(
            and(
              eq(workout_sessions.routine_id, r.id),
              eq(workout_sessions.status, 'completed'),
              eq(workout_sessions.is_deleted, false),
            ),
          )
          .orderBy(desc(workout_sessions.end_time))
          .limit(1);

        return {
          id:                r.id,
          name:              r.name,
          day_of_week:       r.day_of_week ?? undefined,
          last_completed_at: lastSession?.end_time ?? null,
          routine_type:      r.routine_type as 'workout' | 'rest',
        };
      }),
    );
  }

  async startRoutine(routineId: string): Promise<RoutineStartResponse> {
    const [row] = await db
      .select({
        id:              workout_routines.id,
        name:            workout_routines.name,
        routine_type:    workout_routines.routine_type,
        plan_start_date: workout_plans.start_date,
      })
      .from(workout_routines)
      .innerJoin(workout_plans, eq(workout_routines.plan_id, workout_plans.id))
      .where(and(
        eq(workout_routines.id, routineId),
        eq(workout_routines.is_deleted, false),
      ))
      .limit(1);

    if (!row) throw new Error(`Routine not found: ${routineId}`);

    const exRows = await db
      .select({
        exercise_id:                routine_exercises.exercise_id,
        exercise_name:              exercisesTable.name,
        target_sets:                routine_exercises.target_sets,
        target_reps:                routine_exercises.target_reps,
        target_weight:              routine_exercises.target_weight,
        target_duration_seconds:    routine_exercises.target_duration_seconds,
        increment_weight:           routine_exercises.increment_weight,
        increment_reps:             routine_exercises.increment_reps,
        increment_duration_seconds: routine_exercises.increment_duration_seconds,
      })
      .from(routine_exercises)
      .leftJoin(exercisesTable, eq(routine_exercises.exercise_id, exercisesTable.id))
      .where(and(
        eq(routine_exercises.routine_id, routineId),
        eq(routine_exercises.is_deleted, false),
      ))
      .orderBy(routine_exercises.order_index);

    return calculateWorkoutTargets({
      routine_id:      row.id,
      routine_name:    row.name,
      routine_type:    row.routine_type,
      plan_start_date: row.plan_start_date,
      exercises: exRows.map(e => ({
        exercise_id:                e.exercise_id,
        exercise_name:              e.exercise_name ?? 'Unknown',
        target_sets:                e.target_sets,
        target_reps:                e.target_reps,
        target_weight:              e.target_weight,
        target_duration_seconds:    e.target_duration_seconds,
        increment_weight:           e.increment_weight,
        increment_reps:             e.increment_reps,
        increment_duration_seconds: e.increment_duration_seconds,
      })),
    });
  }

  // =========================================================================
  // Routines — writes
  // =========================================================================

  async createRoutine(
    planId: string,
    name: string,
    dayOfWeek: number,
    type: 'workout' | 'rest' = 'workout',
  ): Promise<RoutineDetail> {
    const id = randomUUID();
    await db.insert(workout_routines).values({
      id,
      plan_id:        planId,
      name,
      day_of_week:    dayOfWeek,
      routine_type:   type,
      updated_at:     now(),
      is_deleted:     false,
      last_synced_at: null,
    });
    return { id, name, day_of_week: dayOfWeek, routine_type: type, exercises: [] };
  }

  async updateRoutine(routineId: string, name: string): Promise<void> {
    await db
      .update(workout_routines)
      .set({ name, updated_at: now() })
      .where(eq(workout_routines.id, routineId));
  }

  async deleteRoutine(routineId: string): Promise<void> {
    // Soft-delete the routine — routine_exercises are also soft-deleted so the
    // server knows to remove them during sync.
    const ts = now();
    await db.transaction(async tx => {
      await tx
        .update(workout_routines)
        .set({ is_deleted: true, updated_at: ts })
        .where(eq(workout_routines.id, routineId));
      await tx
        .update(routine_exercises)
        .set({ is_deleted: true, updated_at: ts })
        .where(eq(routine_exercises.routine_id, routineId));
    });
  }

  async moveRoutine(routineId: string, newDay: number): Promise<void> {
    await db
      .update(workout_routines)
      .set({ day_of_week: newDay, updated_at: now() })
      .where(eq(workout_routines.id, routineId));
  }

  async addExerciseTarget(routineId: string, data: AddExerciseDto): Promise<void> {
    await db.insert(routine_exercises).values({
      id:                         randomUUID(),
      routine_id:                 routineId,
      exercise_id:                data.exercise_id,
      order_index:                data.order_index,
      target_sets:                data.target_sets,
      target_reps:                data.target_reps,
      target_weight:              data.target_weight,
      target_duration_seconds:    data.target_duration_seconds ?? null,
      rest_seconds:               data.rest_seconds,
      increment_weight:           data.increment_weight,
      increment_reps:             data.increment_reps,
      increment_duration_seconds: data.increment_duration_seconds ?? 0,
      updated_at:                 now(),
      is_deleted:                 false,
      last_synced_at:             null,
    });
  }

  async updateRoutineExercise(targetId: string, data: Partial<AddExerciseDto>): Promise<void> {
    const set: Record<string, unknown> = { updated_at: now() };
    if (data.exercise_id             !== undefined) set.exercise_id             = data.exercise_id;
    if (data.order_index             !== undefined) set.order_index             = data.order_index;
    if (data.target_sets             !== undefined) set.target_sets             = data.target_sets;
    if (data.target_reps             !== undefined) set.target_reps             = data.target_reps;
    if (data.target_weight           !== undefined) set.target_weight           = data.target_weight;
    if (data.target_duration_seconds !== undefined) set.target_duration_seconds = data.target_duration_seconds;
    if (data.rest_seconds            !== undefined) set.rest_seconds            = data.rest_seconds;
    if (data.increment_weight        !== undefined) set.increment_weight        = data.increment_weight;
    if (data.increment_reps          !== undefined) set.increment_reps          = data.increment_reps;
    if (data.increment_duration_seconds !== undefined) {
      set.increment_duration_seconds = data.increment_duration_seconds;
    }
    await db.update(routine_exercises).set(set).where(eq(routine_exercises.id, targetId));
  }

  async deleteRoutineExercise(targetId: string): Promise<void> {
    await db
      .update(routine_exercises)
      .set({ is_deleted: true, updated_at: now() })
      .where(eq(routine_exercises.id, targetId));
  }

  async reorderExercises(_routineId: string, exerciseIds: string[]): Promise<void> {
    const ts = now();
    await Promise.all(
      exerciseIds.map((targetId, index) =>
        db
          .update(routine_exercises)
          .set({ order_index: index, updated_at: ts })
          .where(eq(routine_exercises.id, targetId)),
      ),
    );
  }

  // =========================================================================
  // Workouts — writes
  // =========================================================================

  async finishWorkout(data: FinishWorkoutDto): Promise<void> {
    const sessionId = randomUUID();
    const ts        = now();

    await db.insert(workout_sessions).values({
      id:             sessionId,
      routine_id:     data.routine_id,
      start_time:     data.start_time,
      end_time:       data.end_time,
      status:         'completed',
      updated_at:     ts,
      is_deleted:     false,
      last_synced_at: null,
    });

    if (data.sets.length > 0) {
      await db.insert(session_sets).values(
        data.sets.map(s => ({
          id:               randomUUID(),
          session_id:       sessionId,
          exercise_id:      s.exercise_id,
          set_number:       s.set_number,
          reps:             s.reps,
          weight:           s.weight,
          duration_seconds: s.duration_seconds ?? null,
          is_completed:     s.is_completed,
          updated_at:       ts,
          is_deleted:       false,
          last_synced_at:   null,
        })),
      );
    }
  }

  // =========================================================================
  // History — reads
  // =========================================================================

  async getHistory(startDate: string, endDate: string): Promise<HistorySession[]> {
    const safeEnd = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;

    const rows = await db
      .select({
        id:           workout_sessions.id,
        routine_name: workout_routines.name,
        date:         workout_sessions.start_time,
        status:       workout_sessions.status,
      })
      .from(workout_sessions)
      .innerJoin(workout_routines, eq(workout_sessions.routine_id, workout_routines.id))
      .where(
        and(
          eq(workout_sessions.is_deleted, false),
          gte(workout_sessions.start_time, startDate),
          lte(workout_sessions.start_time, safeEnd),
        ),
      )
      .orderBy(desc(workout_sessions.start_time));

    return rows;
  }

  async getStats(): Promise<UserStats> {
    const allCompleted = await db
      .select({ start_time: workout_sessions.start_time })
      .from(workout_sessions)
      .where(and(
        eq(workout_sessions.status, 'completed'),
        eq(workout_sessions.is_deleted, false),
      ));

    const total_workouts = allCompleted.length;

    const nowDate      = new Date();
    const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString();
    const workouts_this_month = allCompleted.filter(s => s.start_time >= startOfMonth).length;

    const [lastRow] = await db
      .select({ end_time: workout_sessions.end_time })
      .from(workout_sessions)
      .where(and(
        eq(workout_sessions.status, 'completed'),
        eq(workout_sessions.is_deleted, false),
      ))
      .orderBy(desc(workout_sessions.end_time))
      .limit(1);

    return {
      total_workouts,
      workouts_this_month,
      last_workout_date: lastRow?.end_time ?? undefined,
    };
  }

  async getSessionDetails(sessionId: string): Promise<SessionDetail> {
    const [session] = await db
      .select({
        id:           workout_sessions.id,
        routine_name: workout_routines.name,
        start_time:   workout_sessions.start_time,
        end_time:     workout_sessions.end_time,
      })
      .from(workout_sessions)
      .innerJoin(workout_routines, eq(workout_sessions.routine_id, workout_routines.id))
      .where(and(
        eq(workout_sessions.id, sessionId),
        eq(workout_sessions.is_deleted, false),
      ))
      .limit(1);

    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const setsRows = await db
      .select({
        exercise_id:      session_sets.exercise_id,
        exercise_name:    exercisesTable.name,
        set_number:       session_sets.set_number,
        reps:             session_sets.reps,
        weight:           session_sets.weight,
        duration_seconds: session_sets.duration_seconds,
        is_completed:     session_sets.is_completed,
      })
      .from(session_sets)
      .leftJoin(exercisesTable, eq(session_sets.exercise_id, exercisesTable.id))
      .where(and(
        eq(session_sets.session_id, sessionId),
        eq(session_sets.is_deleted, false),
      ))
      .orderBy(session_sets.set_number);

    const endTime = session.end_time ?? session.start_time;
    const duration_minutes = Math.round(
      (new Date(endTime).getTime() - new Date(session.start_time).getTime()) / 60_000,
    );

    return {
      id:               session.id,
      routine_name:     session.routine_name,
      start_time:       session.start_time,
      end_time:         endTime,
      duration_minutes,
      sets: setsRows.map(s => ({
        exercise_id:      s.exercise_id,
        exercise_name:    s.exercise_name ?? 'Unknown',
        set_number:       s.set_number,
        reps:             s.reps,
        weight:           s.weight,
        duration_seconds: s.duration_seconds,
        is_completed:     s.is_completed,
      })),
    };
  }

  // =========================================================================
  // History — writes
  // =========================================================================

  async updateSession(sessionId: string, data: UpdateSessionDto): Promise<void> {
    const ts = now();
    await db.transaction(async tx => {
      // Hard-delete existing sets — they're replaced wholesale. The parent
      // session's updated_at stamp is what SyncService uses to detect the change.
      await tx.delete(session_sets).where(eq(session_sets.session_id, sessionId));

      if (data.sets.length > 0) {
        await tx.insert(session_sets).values(
          data.sets.map(s => ({
            id:               randomUUID(),
            session_id:       sessionId,
            exercise_id:      s.exercise_id,
            set_number:       s.set_number,
            reps:             s.reps,
            weight:           s.weight,
            duration_seconds: s.duration_seconds ?? null,
            is_completed:     s.is_completed,
            updated_at:       ts,
            is_deleted:       false,
            last_synced_at:   null,
          })),
        );
      }

      // Bump the session's updated_at so SyncService picks it up
      await tx
        .update(workout_sessions)
        .set({ updated_at: ts })
        .where(eq(workout_sessions.id, sessionId));
    });
  }

  // =========================================================================
  // Analytics — deferred for ghost users
  // =========================================================================

  async getVolumeChart(
    _period: '1M' | '3M' | '6M' | '1Y' | 'ALL',
    _planId?: string,
    _anchorDate?: string,
  ): Promise<ChartPoint[]> {
    return [];
  }

  // =========================================================================
  // Sync support — called by SyncService, not part of IAppService
  // =========================================================================

  /**
   * Returns all records that are dirty (updated since last sync or never synced).
   * Includes is_deleted=true tombstones — they must be pushed to the server too.
   */
  async getPendingSync(): Promise<PendingSyncData> {
    const [
      pendingExercises,
      pendingPlans,
      pendingRoutines,
      pendingRoutineExercises,
      pendingSessions,
      pendingSets,
      pendingSettings,
    ] = await Promise.all([
      // Custom exercises only — system templates are never synced
      db.select().from(exercisesTable).where(
        and(
          eq(exercisesTable.is_custom, true),
          pendingSync(exercisesTable.updated_at, exercisesTable.last_synced_at),
        ),
      ),
      db.select().from(workout_plans).where(
        pendingSync(workout_plans.updated_at, workout_plans.last_synced_at),
      ),
      db.select().from(workout_routines).where(
        pendingSync(workout_routines.updated_at, workout_routines.last_synced_at),
      ),
      db.select().from(routine_exercises).where(
        pendingSync(routine_exercises.updated_at, routine_exercises.last_synced_at),
      ),
      db.select().from(workout_sessions).where(
        pendingSync(workout_sessions.updated_at, workout_sessions.last_synced_at),
      ),
      db.select().from(session_sets).where(
        pendingSync(session_sets.updated_at, session_sets.last_synced_at),
      ),
      db.select().from(user_settings).where(
        pendingSync(user_settings.updated_at, user_settings.last_synced_at),
      ),
    ]);

    return {
      exercises:        pendingExercises,
      plans:            pendingPlans,
      routines:         pendingRoutines,
      routineExercises: pendingRoutineExercises,
      sessions:         pendingSessions,
      sets:             pendingSets,
      settings:         pendingSettings,
    };
  }

  /**
   * Stamps last_synced_at on successfully pushed records.
   * Called by SyncService after a confirmed server acknowledgement.
   */
  async markSynced(ids: {
    exerciseIds?:        string[];
    planIds?:            string[];
    routineIds?:         string[];
    routineExerciseIds?: string[];
    sessionIds?:         string[];
    setIds?:             string[];
    settingsIds?:        string[];
  }): Promise<void> {
    const ts = now();
    const tasks: Promise<unknown>[] = [];

    if (ids.exerciseIds?.length)
      tasks.push(db.update(exercisesTable).set({ last_synced_at: ts }).where(inArray(exercisesTable.id, ids.exerciseIds)));
    if (ids.planIds?.length)
      tasks.push(db.update(workout_plans).set({ last_synced_at: ts }).where(inArray(workout_plans.id, ids.planIds)));
    if (ids.routineIds?.length)
      tasks.push(db.update(workout_routines).set({ last_synced_at: ts }).where(inArray(workout_routines.id, ids.routineIds)));
    if (ids.routineExerciseIds?.length)
      tasks.push(db.update(routine_exercises).set({ last_synced_at: ts }).where(inArray(routine_exercises.id, ids.routineExerciseIds)));
    if (ids.sessionIds?.length)
      tasks.push(db.update(workout_sessions).set({ last_synced_at: ts }).where(inArray(workout_sessions.id, ids.sessionIds)));
    if (ids.setIds?.length)
      tasks.push(db.update(session_sets).set({ last_synced_at: ts }).where(inArray(session_sets.id, ids.setIds)));
    if (ids.settingsIds?.length)
      tasks.push(db.update(user_settings).set({ last_synced_at: ts }).where(inArray(user_settings.id, ids.settingsIds)));

    await Promise.all(tasks);
  }

  /**
   * Applies a batch of records pulled from the server.
   * Last-write-wins: only overwrites a local record if server's updated_at is newer.
   */
  async applyServerChanges(changes: PendingSyncData): Promise<void> {
    await db.transaction(async tx => {
      for (const ex of changes.exercises) {
        if (!ex.updated_at) continue;
        const [local] = await tx.select({ updated_at: exercisesTable.updated_at })
          .from(exercisesTable).where(eq(exercisesTable.id, ex.id)).limit(1);
        if (!local || (local.updated_at ?? 0) <= ex.updated_at) {
          await tx.insert(exercisesTable).values(ex)
            .onConflictDoUpdate({ target: exercisesTable.id, set: ex });
        }
      }

      for (const plan of changes.plans) {
        const [local] = await tx.select({ updated_at: workout_plans.updated_at })
          .from(workout_plans).where(eq(workout_plans.id, plan.id)).limit(1);
        if (!local || local.updated_at <= plan.updated_at) {
          await tx.insert(workout_plans).values(plan)
            .onConflictDoUpdate({ target: workout_plans.id, set: plan });
        }
      }

      for (const routine of changes.routines) {
        const [local] = await tx.select({ updated_at: workout_routines.updated_at })
          .from(workout_routines).where(eq(workout_routines.id, routine.id)).limit(1);
        if (!local || local.updated_at <= routine.updated_at) {
          await tx.insert(workout_routines).values(routine)
            .onConflictDoUpdate({ target: workout_routines.id, set: routine });
        }
      }

      for (const re of changes.routineExercises) {
        const [local] = await tx.select({ updated_at: routine_exercises.updated_at })
          .from(routine_exercises).where(eq(routine_exercises.id, re.id)).limit(1);
        if (!local || local.updated_at <= re.updated_at) {
          await tx.insert(routine_exercises).values(re)
            .onConflictDoUpdate({ target: routine_exercises.id, set: re });
        }
      }

      for (const session of changes.sessions) {
        const [local] = await tx.select({ updated_at: workout_sessions.updated_at })
          .from(workout_sessions).where(eq(workout_sessions.id, session.id)).limit(1);
        if (!local || local.updated_at <= session.updated_at) {
          await tx.insert(workout_sessions).values(session)
            .onConflictDoUpdate({ target: workout_sessions.id, set: session });
        }
      }

      for (const set of changes.sets) {
        const [local] = await tx.select({ updated_at: session_sets.updated_at })
          .from(session_sets).where(eq(session_sets.id, set.id)).limit(1);
        if (!local || local.updated_at <= set.updated_at) {
          await tx.insert(session_sets).values(set)
            .onConflictDoUpdate({ target: session_sets.id, set: set });
        }
      }

      for (const setting of changes.settings) {
        const [local] = await tx.select({ updated_at: user_settings.updated_at })
          .from(user_settings).where(eq(user_settings.id, setting.id)).limit(1);
        if (!local || local.updated_at <= setting.updated_at) {
          await tx.insert(user_settings).values(setting)
            .onConflictDoUpdate({ target: user_settings.id, set: setting });
        }
      }
    });
  }
}
