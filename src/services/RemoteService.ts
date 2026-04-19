// ---------------------------------------------------------------------------
// RemoteService — IAppService implementation for registered/logged-in users.
// All methods delegate to the existing src/api/* functions unchanged.
// ---------------------------------------------------------------------------

import type { IAppService, HomeScreenData } from './types';
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
  async getHomeScreenData(): Promise<HomeScreenData> {
    const today = new Date().toISOString().split('T')[0];
    const todaySchemaDay = (new Date().getDay() + 6) % 7; // 0=Mon…6=Sun

    const [plans, routines] = await Promise.all([
      plansApi.getPlans(),
      workoutsApi.getRoutines(),
    ]);

    // Same priority as LocalService:
    // 1. Plan currently in range
    // 2. Most recently ended past plan
    // 3. Nearest upcoming future plan
    let chosen = plans.find(p => p.start_date <= today && p.end_date >= today);
    if (!chosen) {
      const past = plans.filter(p => p.end_date < today).sort((a, b) => a.end_date < b.end_date ? 1 : -1);
      if (past.length > 0) chosen = past[0];
    }
    if (!chosen) chosen = plans.filter(p => p.start_date > today).sort((a, b) => a.start_date < b.start_date ? -1 : 1)[0];

    if (!chosen) return { plan: null, routines: [], todaySchemaDay };

    const planRoutines = routines.filter(r => r.plan_id === chosen!.id);

    return {
      plan: {
        id: chosen.id,
        name: chosen.name,
        startDate: chosen.start_date,
        endDate: chosen.end_date,
        durationWeeks: chosen.duration_weeks,
      },
      routines: planRoutines,
      todaySchemaDay,
    };
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
