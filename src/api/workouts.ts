import { client } from './client';

export interface Routine {
  id: string;
  name: string;
  day_of_week?: number;
  last_completed_at?: string | null; // <--- NEW FIELD
}

export interface SetTarget {
  set_number: number;
  target_reps: number;
  target_weight: number;
}

export interface ExercisePreview {
  exercise_id: string;
  name: string;
  sets: SetTarget[];
  increment_weight: number;
  increment_reps: number;
}

export interface RoutineStartResponse {
  routine_id: string;
  name: string;
  exercises: ExercisePreview[];
}

export interface FinishWorkoutDto {
  routine_id: string;
  start_time: string; // ISO String
  end_time: string;   // ISO String
  sets: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    is_completed: boolean;
  }[];
}


// 1. Get List of Routines (Pull A, Pull B...)
export const getRoutines = () => {
  return client<Routine[]>('/workouts/routines');
};

// 2. Start a specific routine
export const startRoutine = (routineId: string) => {
  return client<RoutineStartResponse>(`/workouts/start/${routineId}`);
};



export const finishWorkout = (data: FinishWorkoutDto) => {
  return client('/workouts/finish', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};