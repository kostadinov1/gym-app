import { client } from './client';
import { Exercise } from '../types';

export interface ExerciseFilters {
  q?: string;
  muscle_group?: string;
  exercise_type?: string;
  movement_pattern?: string;
  equipment_type?: string;
  status?: 'active' | 'deprecated';
  is_system?: boolean;
}

export interface CreateExerciseDto {
  name: string;
  slug?: string;
  primary_muscle_group?: string;
  secondary_muscle_groups?: string[];
  exercise_type?: string;
  movement_pattern?: string;
  equipment_type?: string;
  force_type?: string;
  status?: 'active' | 'deprecated';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  tags?: string[];
  aliases?: string[];
  default_increment: number;
  unit: string;
}

export interface UpdateExerciseDto {
  name?: string;
  slug?: string;
  primary_muscle_group?: string;
  secondary_muscle_groups?: string[];
  exercise_type?: string;
  movement_pattern?: string;
  equipment_type?: string;
  force_type?: string;
  status?: 'active' | 'deprecated';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  tags?: string[];
  aliases?: string[];
  default_increment?: number;
  unit?: string;
}

const toQuery = (filters?: ExerciseFilters) => {
  if (!filters) return '';
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const getExercises = () => {
  return client<Exercise[]>('/exercises/');
};

export const getExercisesFiltered = (filters?: ExerciseFilters) => {
  return client<Exercise[]>(`/exercises/${toQuery(filters)}`);
};

export const createExercise = (data: CreateExerciseDto) => {
  return client<Exercise>('/exercises/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateExercise = (id: string, data: UpdateExerciseDto) => {
  return client<Exercise>(`/exercises/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteExercise = (id: string) => {
  return client(`/exercises/${id}`, {
    method: 'DELETE',
  });
};

export const copyExercise = (id: string) => {
  return client<Exercise>(`/exercises/${id}/copy`, {
    method: 'POST',
  });
};
