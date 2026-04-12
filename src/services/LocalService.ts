// ---------------------------------------------------------------------------
// LocalService — IAppService implementation for ghost (offline) users.
// Reads and writes to the local SQLite database via drizzle-orm.
//
// Phase 4: Read methods implemented.
// Phase 5: Write methods — still TODO stubs (throw on call).
// ---------------------------------------------------------------------------

import { eq, and, like, gte, lte, desc } from 'drizzle-orm';

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

const TODO = (method: string): never => {
  throw new Error(`LocalService.${method} is not yet implemented (Phase 5)`);
};

/** Parse a JSON-encoded text column back to a string array. */
const parseArr = (raw: string): string[] => {
  try { return JSON.parse(raw) as string[]; }
  catch { return []; }
};

// ---------------------------------------------------------------------------
// LocalService
// ---------------------------------------------------------------------------

export class LocalService implements IAppService {
  // ── Exercises ────────────────────────────────────────────────────────────

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

    return rows.map(r => ({
      ...r,
      status:                  r.status as 'active' | 'deprecated',
      difficulty:              r.difficulty as Exercise['difficulty'],
      secondary_muscle_groups: parseArr(r.secondary_muscle_groups),
      tags:                    parseArr(r.tags),
      aliases:                 parseArr(r.aliases),
    }));
  }

  // ── Write stubs (Phase 5) ─────────────────────────────────────────────────
  createExercise(_data: CreateExerciseDto)                        { return TODO('createExercise'); }
  updateExercise(_id: string, _data: UpdateExerciseDto)           { return TODO('updateExercise'); }
  deleteExercise(_id: string)                                     { return TODO('deleteExercise'); }
  copyExercise(_id: string)                                       { return TODO('copyExercise'); }

  // ── Plans ─────────────────────────────────────────────────────────────────

  async getPlans(): Promise<Plan[]> {
    const rows = await db.select().from(workout_plans);
    return rows.map(r => ({
      id:             r.id,
      name:           r.name,
      description:    r.description ?? undefined,
      start_date:     r.start_date,
      end_date:       r.end_date,
      duration_weeks: r.duration_weeks,
      is_active:      r.is_active,
    }));
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

    return {
      id:             plan.id,
      name:           plan.name,
      description:    plan.description ?? undefined,
      start_date:     plan.start_date,
      end_date:       plan.end_date,
      duration_weeks: plan.duration_weeks,
      is_active:      plan.is_active,
      routines,
    };
  }

  // ── Write stubs (Phase 5) ─────────────────────────────────────────────────
  createPlan(_data: CreatePlanDto)                { return TODO('createPlan'); }
  updatePlan(_id: string, _data: UpdatePlanDto)   { return TODO('updatePlan'); }
  deletePlan(_id: string)                         { return TODO('deletePlan'); }

  // ── Routines ──────────────────────────────────────────────────────────────

  async getRoutines(): Promise<Routine[]> {
    // Only routines that belong to active plans
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
          id:               r.id,
          name:             r.name,
          day_of_week:      r.day_of_week ?? undefined,
          last_completed_at: lastSession?.end_time ?? null,
          routine_type:     r.routine_type as 'workout' | 'rest',
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

  // ── Write stubs (Phase 5) ─────────────────────────────────────────────────
  createRoutine(
    _planId: string, _name: string, _dayOfWeek: number, _type?: 'workout' | 'rest',
  ) { return TODO('createRoutine'); }
  updateRoutine(_routineId: string, _name: string)                   { return TODO('updateRoutine'); }
  deleteRoutine(_routineId: string)                                   { return TODO('deleteRoutine'); }
  moveRoutine(_routineId: string, _newDay: number)                   { return TODO('moveRoutine'); }
  addExerciseTarget(_routineId: string, _data: AddExerciseDto)       { return TODO('addExerciseTarget'); }
  updateRoutineExercise(_targetId: string, _data: Partial<AddExerciseDto>) { return TODO('updateRoutineExercise'); }
  deleteRoutineExercise(_targetId: string)                           { return TODO('deleteRoutineExercise'); }
  reorderExercises(_routineId: string, _exerciseIds: string[])       { return TODO('reorderExercises'); }
  finishWorkout(_data: FinishWorkoutDto)                             { return TODO('finishWorkout'); }

  // ── History ───────────────────────────────────────────────────────────────

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

    return rows.map(r => ({
      id:           r.id,
      routine_name: r.routine_name,
      date:         r.date,
      status:       r.status,
    }));
  }

  async getStats(): Promise<UserStats> {
    const allCompleted = await db
      .select({ start_time: workout_sessions.start_time, end_time: workout_sessions.end_time })
      .from(workout_sessions)
      .where(eq(workout_sessions.status, 'completed'));

    const total_workouts = allCompleted.length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const workouts_this_month = allCompleted.filter(s => s.start_time >= startOfMonth).length;

    // Last completed session by end_time
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

  // ── Write stub (Phase 5) ──────────────────────────────────────────────────
  updateSession(_sessionId: string, _data: UpdateSessionDto) { return TODO('updateSession'); }

  // ── Analytics — deferred for ghost users ─────────────────────────────────
  // Ghost users see an empty state; chart computation is ported in a later phase.
  async getVolumeChart(
    _period: '1M' | '3M' | '6M' | '1Y' | 'ALL',
    _planId?: string,
    _anchorDate?: string,
  ): Promise<ChartPoint[]> {
    return [];
  }
}
