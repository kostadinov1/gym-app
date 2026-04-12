// ---------------------------------------------------------------------------
// LocalService — IAppService implementation for ghost (offline) users.
// Reads and writes to the local SQLite database via drizzle-orm.
//
// Phase 4: Read methods ✅
// Phase 5: Write methods ✅
// ---------------------------------------------------------------------------

import { eq, and, like, gte, lte, lt, gt, desc, inArray } from 'drizzle-orm';

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
} from '../db/schema';
import { calculateWorkoutTargets } from './progressionEngine';

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
    const conditions = [];

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db.select().from(exercisesTable).where(whereClause);
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
    });

    const [row] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id))
      .limit(1);

    return rowToExercise(row);
  }

  async updateExercise(id: string, data: UpdateExerciseDto): Promise<Exercise> {
    // Build a partial update — only set fields that are explicitly provided
    const set: Record<string, unknown> = {};
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

    if (Object.keys(set).length > 0) {
      await db.update(exercisesTable).set(set).where(eq(exercisesTable.id, id));
    }

    const [row] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id))
      .limit(1);

    if (!row) throw new Error(`Exercise not found: ${id}`);
    return rowToExercise(row);
  }

  async deleteExercise(id: string): Promise<void> {
    await db.delete(exercisesTable).where(eq(exercisesTable.id, id));
  }

  async copyExercise(id: string): Promise<Exercise> {
    const [source] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id))
      .limit(1);

    if (!source) throw new Error(`Exercise not found: ${id}`);

    // Collect all existing custom exercise names to avoid collisions
    const existingNames = new Set(
      (await db
        .select({ name: exercisesTable.name })
        .from(exercisesTable)
        .where(eq(exercisesTable.user_id, 'local'))
      ).map(r => r.name),
    );

    // Generate a unique name: "Bench Press" → "Bench Press 2" → "Bench Press 3" …
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
      secondary_muscle_groups: source.secondary_muscle_groups, // already JSON string
      exercise_type:           source.exercise_type,
      movement_pattern:        source.movement_pattern,
      equipment_type:          source.equipment_type,
      force_type:              source.force_type,
      status:                  source.status,
      difficulty:              source.difficulty,
      tags:                    source.tags,     // already JSON string
      aliases:                 source.aliases,  // already JSON string
      default_increment:       source.default_increment,
      unit:                    source.unit,
      is_custom:               true,
      is_system_template:      false,
      user_id:                 'local',
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
    const rows = await db.select().from(workout_plans);
    return rows.map(rowToPlan);
  }

  async getPlanDetails(id: string): Promise<PlanDetail> {
    const [plan] = await db
      .select()
      .from(workout_plans)
      .where(eq(workout_plans.id, id))
      .limit(1);

    if (!plan) throw new Error(`Plan not found: ${id}`);

    const routineRows = await db
      .select()
      .from(workout_routines)
      .where(eq(workout_routines.plan_id, id));

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
          .where(eq(routine_exercises.routine_id, r.id))
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

    // Mirror plans.py:44-58 — reject if dates overlap with any active plan
    const conflicts = await db
      .select({ name: workout_plans.name })
      .from(workout_plans)
      .where(
        and(
          eq(workout_plans.is_active, true),
          lt(workout_plans.start_date, endDate),
          gt(workout_plans.end_date,   startDate),
        ),
      );

    if (conflicts.length > 0) {
      const names = conflicts.map(c => c.name).join(', ');
      throw new Error(`Plan dates overlap with existing active plans: ${names}`);
    }

    const id  = randomUUID();
    const now = new Date().toISOString();

    await db.insert(workout_plans).values({
      id,
      name:           data.name,
      description:    data.description ?? null,
      duration_weeks: data.duration_weeks,
      start_date:     startDate,
      end_date:       endDate,
      is_active:      true,
      created_at:     now,
    });

    const [row] = await db
      .select()
      .from(workout_plans)
      .where(eq(workout_plans.id, id))
      .limit(1);

    return rowToPlan(row);
  }

  async updatePlan(id: string, data: UpdatePlanDto): Promise<Plan> {
    const set: Record<string, unknown> = {};
    if (data.name        !== undefined) set.name        = data.name;
    if (data.description !== undefined) set.description = data.description;
    if (data.is_active   !== undefined) set.is_active   = data.is_active;

    // Recalculate end_date when start_date changes
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

    if (Object.keys(set).length > 0) {
      await db.update(workout_plans).set(set).where(eq(workout_plans.id, id));
    }

    const [row] = await db
      .select()
      .from(workout_plans)
      .where(eq(workout_plans.id, id))
      .limit(1);

    if (!row) throw new Error(`Plan not found: ${id}`);
    return rowToPlan(row);
  }

  async deletePlan(id: string): Promise<void> {
    // Mirror plans.py:120-153 — archive if has history, hard-delete if not
    const routineRows = await db
      .select({ id: workout_routines.id })
      .from(workout_routines)
      .where(eq(workout_routines.plan_id, id));

    const routineIds = routineRows.map(r => r.id);

    let hasHistory = false;
    if (routineIds.length > 0) {
      const [historyRow] = await db
        .select({ id: workout_sessions.id })
        .from(workout_sessions)
        .where(
          and(
            inArray(workout_sessions.routine_id, routineIds),
            eq(workout_sessions.status, 'completed'),
          ),
        )
        .limit(1);
      hasHistory = !!historyRow;
    }

    if (hasHistory) {
      // Soft-delete: preserve history by archiving the plan
      await db
        .update(workout_plans)
        .set({ is_active: false })
        .where(eq(workout_plans.id, id));
    } else {
      // Hard-delete: cascade via schema FK (onDelete: 'cascade')
      await db.delete(workout_plans).where(eq(workout_plans.id, id));
    }
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
      .where(eq(workout_plans.is_active, true));

    return Promise.all(
      routineRows.map(async r => {
        const [lastSession] = await db
          .select({ end_time: workout_sessions.end_time })
          .from(workout_sessions)
          .where(
            and(
              eq(workout_sessions.routine_id, r.id),
              eq(workout_sessions.status, 'completed'),
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
      .where(eq(workout_routines.id, routineId))
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
      .where(eq(routine_exercises.routine_id, routineId))
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
      plan_id:      planId,
      name,
      day_of_week:  dayOfWeek,
      routine_type: type,
    });
    return { id, name, day_of_week: dayOfWeek, routine_type: type, exercises: [] };
  }

  async updateRoutine(routineId: string, name: string): Promise<void> {
    await db
      .update(workout_routines)
      .set({ name })
      .where(eq(workout_routines.id, routineId));
  }

  async deleteRoutine(routineId: string): Promise<void> {
    // routine_exercises cascades via FK onDelete; just delete the routine
    await db.delete(workout_routines).where(eq(workout_routines.id, routineId));
  }

  async moveRoutine(routineId: string, newDay: number): Promise<void> {
    await db
      .update(workout_routines)
      .set({ day_of_week: newDay })
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
    });
  }

  async updateRoutineExercise(targetId: string, data: Partial<AddExerciseDto>): Promise<void> {
    const set: Record<string, unknown> = {};
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
    if (Object.keys(set).length > 0) {
      await db.update(routine_exercises).set(set).where(eq(routine_exercises.id, targetId));
    }
  }

  async deleteRoutineExercise(targetId: string): Promise<void> {
    await db.delete(routine_exercises).where(eq(routine_exercises.id, targetId));
  }

  async reorderExercises(_routineId: string, exerciseIds: string[]): Promise<void> {
    // exerciseIds are routine_exercises.id values in the desired display order.
    // Update each row's order_index to its new position.
    await Promise.all(
      exerciseIds.map((targetId, index) =>
        db
          .update(routine_exercises)
          .set({ order_index: index })
          .where(eq(routine_exercises.id, targetId)),
      ),
    );
  }

  // =========================================================================
  // Workouts — writes
  // =========================================================================

  async finishWorkout(data: FinishWorkoutDto): Promise<void> {
    const sessionId = randomUUID();

    await db.insert(workout_sessions).values({
      id:         sessionId,
      routine_id: data.routine_id,
      start_time: data.start_time,
      end_time:   data.end_time,
      status:     'completed',
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
        })),
      );
    }
  }

  // =========================================================================
  // History — reads
  // =========================================================================

  async getHistory(startDate: string, endDate: string): Promise<HistorySession[]> {
    // Pad date-only strings so "2026-04-30" covers the full day
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
      .where(eq(workout_sessions.status, 'completed'));

    const total_workouts = allCompleted.length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const workouts_this_month = allCompleted.filter(s => s.start_time >= startOfMonth).length;

    const [lastRow] = await db
      .select({ end_time: workout_sessions.end_time })
      .from(workout_sessions)
      .where(eq(workout_sessions.status, 'completed'))
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
      .where(eq(workout_sessions.id, sessionId))
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
      .where(eq(session_sets.session_id, sessionId))
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
    // Mirror history.py:171-189 — replace all sets atomically
    await db.transaction(async tx => {
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
          })),
        );
      }
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
    // Ghost users see the empty state; chart computation is deferred.
    return [];
  }
}
