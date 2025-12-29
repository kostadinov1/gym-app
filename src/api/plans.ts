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