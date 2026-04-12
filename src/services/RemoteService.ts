// ---------------------------------------------------------------------------
// RemoteService — IAppService implementation for registered/logged-in users.
// All methods delegate to the existing src/api/* functions unchanged.
// ---------------------------------------------------------------------------

import type { IAppService } from './types';
import * as exercisesApi from '../api/exercises';
import * as plansApi from '../api/plans';
import * as workoutsApi from '../api/workouts';
import * as historyApi from '../api/history';

export class RemoteService implements IAppService {
  // ── Exercises ────────────────────────────────────────────────────────────
  getExercisesFiltered(filters?: exercisesApi.ExerciseFilters) {
    return exercisesApi.getExercisesFiltered(filters);
  }
  createExercise(data: exercisesApi.CreateExerciseDto) {
    return exercisesApi.createExercise(data);
  }
  updateExercise(id: string, data: exercisesApi.UpdateExerciseDto) {
    return exercisesApi.updateExercise(id, data);
  }
  deleteExercise(id: string) {
    return exercisesApi.deleteExercise(id) as Promise<void>;
  }
  copyExercise(id: string) {
    return exercisesApi.copyExercise(id);
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  getPlans() {
    return plansApi.getPlans();
  }
  createPlan(data: plansApi.CreatePlanDto) {
    return plansApi.createPlan(data);
  }
  getPlanDetails(id: string) {
    return plansApi.getPlanDetails(id);
  }
  updatePlan(id: string, data: plansApi.UpdatePlanDto) {
    return plansApi.updatePlan(id, data);
  }
  deletePlan(id: string) {
    return plansApi.deletePlan(id) as Promise<void>;
  }

  // ── Routines ──────────────────────────────────────────────────────────────
  createRoutine(
    planId: string,
    name: string,
    dayOfWeek: number,
    type: 'workout' | 'rest' = 'workout',
  ) {
    return plansApi.createRoutine(planId, name, dayOfWeek, type) as Promise<any>;
  }
  updateRoutine(routineId: string, name: string) {
    return plansApi.updateRoutine(routineId, name) as Promise<void>;
  }
  deleteRoutine(routineId: string) {
    return plansApi.deleteRoutine(routineId) as Promise<void>;
  }
  moveRoutine(routineId: string, newDay: number) {
    return plansApi.moveRoutine(routineId, newDay) as Promise<void>;
  }
  addExerciseTarget(routineId: string, data: plansApi.AddExerciseDto) {
    return plansApi.addExerciseTarget(routineId, data) as Promise<void>;
  }
  updateRoutineExercise(targetId: string, data: Partial<plansApi.AddExerciseDto>) {
    return plansApi.updateRoutineExercise(targetId, data) as Promise<void>;
  }
  deleteRoutineExercise(targetId: string) {
    return plansApi.deleteRoutineExercise(targetId) as Promise<void>;
  }
  reorderExercises(routineId: string, exerciseIds: string[]) {
    return plansApi.reorderExercises(routineId, exerciseIds) as Promise<void>;
  }

  // ── Workouts ──────────────────────────────────────────────────────────────
  getRoutines() {
    return workoutsApi.getRoutines();
  }
  startRoutine(routineId: string) {
    return workoutsApi.startRoutine(routineId);
  }
  finishWorkout(data: workoutsApi.FinishWorkoutDto) {
    return workoutsApi.finishWorkout(data) as Promise<void>;
  }

  // ── History ───────────────────────────────────────────────────────────────
  getHistory(startDate: string, endDate: string) {
    return historyApi.getHistory(startDate, endDate);
  }
  getStats() {
    return historyApi.getStats();
  }
  getSessionDetails(sessionId: string) {
    return historyApi.getSessionDetails(sessionId);
  }
  updateSession(sessionId: string, data: historyApi.UpdateSessionDto) {
    return historyApi.updateSession(sessionId, data) as Promise<void>;
  }
  getVolumeChart(
    period: '1M' | '3M' | '6M' | '1Y' | 'ALL',
    planId?: string,
    anchorDate?: string,
  ) {
    return historyApi.getVolumeChart(period, planId, anchorDate);
  }
}
