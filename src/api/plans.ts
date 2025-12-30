import { client } from './client';

export interface Plan {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  duration_weeks: number;
  is_active: boolean;
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  start_date: string; // ISO String
  duration_weeks: number;
}


export interface RoutineExercise {
    exercise_id: string;
    target_sets: number;
    target_reps: number;
    target_weight: number;
    increment_value: number;
}

export interface RoutineDetail {
    id: string;
    name: string;
    day_of_week: number;
    exercises: RoutineExercise[];
}

export interface PlanDetail extends Plan {
    routines: RoutineDetail[];
}


export interface AddExerciseDto {
    exercise_id: string;
    order_index: number;
    target_sets: number;
    target_reps: number;
    target_weight: number;
    rest_seconds: number;
    increment_value: number;
}


// Fetch all active plans
export const getPlans = () => {
  return client<Plan[]>('/plans/');
};

// Create a new plan
export const createPlan = (data: CreatePlanDto) => {
  return client<Plan>('/plans/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Archive/Delete a plan
export const deletePlan = (id: string) => {
  return client(`/plans/${id}`, {
    method: 'DELETE',
  });
};




export const getPlanDetails = (id: string) => {
    return client<PlanDetail>(`/plans/${id}`);
};

// We also need a way to create a routine (assign a day)
export const createRoutine = (planId: string, name: string, dayOfWeek: number) => {
    return client(`/plans/${planId}/routines`, {
        method: 'POST',
        body: JSON.stringify({ name, day_of_week: dayOfWeek })
    });
};

export const addExerciseTarget = (routineId: string, data: AddExerciseDto) => {
    return client(`/plans/routines/${routineId}/exercises`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
};
