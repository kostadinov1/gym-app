// ---------------------------------------------------------------------------
// LocalService — IAppService implementation for ghost (offline) users.
// Reads and writes to the local SQLite database via drizzle-orm.
//
// STATUS: Stub — methods are implemented in phases 4 and 5.
//         Each unimplemented method throws a clear error so failures are
//         obvious during development rather than silently returning null.
// ---------------------------------------------------------------------------

import type { IAppService } from './types';
import type { ExerciseFilters, CreateExerciseDto, UpdateExerciseDto } from '../api/exercises';
import type { CreatePlanDto, UpdatePlanDto, AddExerciseDto } from '../api/plans';
import type { FinishWorkoutDto } from '../api/workouts';
import type { UpdateSessionDto } from '../api/history';

const TODO = (method: string): never => {
  throw new Error(`LocalService.${method} is not yet implemented (Phase 4/5)`);
};

export class LocalService implements IAppService {
  // ── Exercises ────────────────────────────────────────────────────────────
  getExercisesFiltered(_filters?: ExerciseFilters) { return TODO('getExercisesFiltered'); }
  createExercise(_data: CreateExerciseDto) { return TODO('createExercise'); }
  updateExercise(_id: string, _data: UpdateExerciseDto) { return TODO('updateExercise'); }
  deleteExercise(_id: string) { return TODO('deleteExercise'); }
  copyExercise(_id: string) { return TODO('copyExercise'); }

  // ── Plans ─────────────────────────────────────────────────────────────────
  getPlans() { return TODO('getPlans'); }
  createPlan(_data: CreatePlanDto) { return TODO('createPlan'); }
  getPlanDetails(_id: string) { return TODO('getPlanDetails'); }
  updatePlan(_id: string, _data: UpdatePlanDto) { return TODO('updatePlan'); }
  deletePlan(_id: string) { return TODO('deletePlan'); }

  // ── Routines ──────────────────────────────────────────────────────────────
  createRoutine(_planId: string, _name: string, _dayOfWeek: number, _type?: 'workout' | 'rest') { return TODO('createRoutine'); }
  updateRoutine(_routineId: string, _name: string) { return TODO('updateRoutine'); }
  deleteRoutine(_routineId: string) { return TODO('deleteRoutine'); }
  moveRoutine(_routineId: string, _newDay: number) { return TODO('moveRoutine'); }
  addExerciseTarget(_routineId: string, _data: AddExerciseDto) { return TODO('addExerciseTarget'); }
  updateRoutineExercise(_targetId: string, _data: Partial<AddExerciseDto>) { return TODO('updateRoutineExercise'); }
  deleteRoutineExercise(_targetId: string) { return TODO('deleteRoutineExercise'); }
  reorderExercises(_routineId: string, _exerciseIds: string[]) { return TODO('reorderExercises'); }

  // ── Workouts ──────────────────────────────────────────────────────────────
  getRoutines() { return TODO('getRoutines'); }
  startRoutine(_routineId: string) { return TODO('startRoutine'); }
  finishWorkout(_data: FinishWorkoutDto) { return TODO('finishWorkout'); }

  // ── History ───────────────────────────────────────────────────────────────
  getHistory(_startDate: string, _endDate: string) { return TODO('getHistory'); }
  getStats() { return TODO('getStats'); }
  getSessionDetails(_sessionId: string) { return TODO('getSessionDetails'); }
  updateSession(_sessionId: string, _data: UpdateSessionDto) { return TODO('updateSession'); }
  getVolumeChart(
    _period: '1M' | '3M' | '6M' | '1Y' | 'ALL',
    _planId?: string,
    _anchorDate?: string,
  ) { return TODO('getVolumeChart'); }
}
