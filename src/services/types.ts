// ---------------------------------------------------------------------------
// IAppService — the single contract all screens code against.
// Two implementations: RemoteService (logged-in users, hits the API)
//                      LocalService  (ghost users, reads/writes SQLite)
// ---------------------------------------------------------------------------

import type { Exercise } from '../types';
import type { ExerciseFilters, CreateExerciseDto, UpdateExerciseDto } from '../api/exercises';
import type {
  Plan, PlanDetail, CreatePlanDto, UpdatePlanDto,
  AddExerciseDto, RoutineDetail,
} from '../api/plans';
import type {
  Routine, RoutineStartResponse, FinishWorkoutDto,
} from '../api/workouts';

export interface HomeScreenData {
  plan: {
    id: string;
    name: string;
    startDate: string;   // YYYY-MM-DD
    endDate: string;     // YYYY-MM-DD
    durationWeeks: number;
  } | null;
  routines: Routine[];   // only from the resolved plan
  todaySchemaDay: number; // 0=Mon … 6=Sun
}
import type {
  HistorySession, UserStats, SessionDetail, UpdateSessionDto, ChartPoint,
} from '../api/history';

export interface IAppService {
  // ── Exercises ────────────────────────────────────────────────────────────
  getExercisesFiltered(filters?: ExerciseFilters): Promise<Exercise[]>;
  createExercise(data: CreateExerciseDto): Promise<Exercise>;
  updateExercise(id: string, data: UpdateExerciseDto): Promise<Exercise>;
  deleteExercise(id: string): Promise<void>;
  copyExercise(id: string): Promise<Exercise>;

  // ── Plans ─────────────────────────────────────────────────────────────────
  getPlans(): Promise<Plan[]>;
  createPlan(data: CreatePlanDto): Promise<Plan>;
  getPlanDetails(id: string): Promise<PlanDetail>;
  updatePlan(id: string, data: UpdatePlanDto): Promise<Plan>;
  deletePlan(id: string): Promise<void>;

  // ── Routines ──────────────────────────────────────────────────────────────
  createRoutine(
    planId: string,
    name: string,
    dayOfWeek: number,
    type?: 'workout' | 'rest',
  ): Promise<RoutineDetail>;
  updateRoutine(routineId: string, name: string): Promise<void>;
  deleteRoutine(routineId: string): Promise<void>;
  moveRoutine(routineId: string, newDay: number): Promise<void>;
  addExerciseTarget(routineId: string, data: AddExerciseDto): Promise<void>;
  updateRoutineExercise(targetId: string, data: Partial<AddExerciseDto>): Promise<void>;
  deleteRoutineExercise(targetId: string): Promise<void>;
  reorderExercises(routineId: string, exerciseIds: string[]): Promise<void>;

  // ── Workouts ──────────────────────────────────────────────────────────────
  getRoutines(): Promise<Routine[]>;
  getHomeScreenData(): Promise<HomeScreenData>;
  startRoutine(routineId: string): Promise<RoutineStartResponse>;
  finishWorkout(data: FinishWorkoutDto): Promise<void>;

  // ── History ───────────────────────────────────────────────────────────────
  getHistory(startDate: string, endDate: string): Promise<HistorySession[]>;
  getStats(): Promise<UserStats>;
  getSessionDetails(sessionId: string): Promise<SessionDetail>;
  updateSession(sessionId: string, data: UpdateSessionDto): Promise<void>;
  getVolumeChart(
    period: '1M' | '3M' | '6M' | '1Y' | 'ALL',
    planId?: string,
    anchorDate?: string,
  ): Promise<ChartPoint[]>;
}
