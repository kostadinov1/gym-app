import { client } from './client'; // You need to export the generic client function from client.ts first!
import { Exercise } from '../types';

// We need a Type for creating (without ID)
export interface CreateExerciseDto {
  name: string;
  default_increment: number;
  unit: string;
}


export interface UpdateExerciseDto {
  name?: string;
  default_increment?: number;
  unit?: string;
}

export const updateExercise = (id: string, data: UpdateExerciseDto) => {
  return client(`/exercises/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const getExercises = () => {
  return client<Exercise[]>('/exercises/');
};

export const createExercise = (data: CreateExerciseDto) => {
  return client<Exercise>('/exercises/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};


export const deleteExercise = (id: string) => {
  return client(`/exercises/${id}`, {
    method: 'DELETE',
  });
};