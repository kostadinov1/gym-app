import { client } from './client';

export interface Routine {
  id: string;
  plan_id: string;
  name: string;
  day_of_week?: number;
  last_completed_at?: string | null;
  routine_type: 'workout' | 'rest';
}

export interface SetTarget {
  set_number: number;
  target_reps: number;
  target_weight: number;
  target_duration_seconds?: number | null;
}

export interface ExercisePreview {
  exercise_id: string;
  name: string;
  sets: SetTarget[];
  increment_weight: number;
  increment_reps: number;
  increment_duration_seconds: number;
}

export interface RoutineStartResponse {
  routine_id: string;
  name: string;
  exercises: ExercisePreview[];
}

export interface FinishWorkoutDto {
  routine_id: string;
  start_time: string;
  end_time: string;
  sets: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    duration_seconds?: number | null;
    is_completed: boolean;
  }[];
}

export const getRoutines = () => {
  return client<Routine[]>('/workouts/routines');
};

export const startRoutine = (routineId: string) => {
  return client<RoutineStartResponse>(`/workouts/start/${routineId}`);
};

export const finishWorkout = (data: FinishWorkoutDto) => {
  return client('/workouts/finish', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
