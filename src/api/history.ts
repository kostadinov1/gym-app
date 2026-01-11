import { client } from './client';

export interface HistorySession {
  id: string;
  routine_name: string;
  date: string; // ISO date
  status: string;
}

export interface UserStats {
  total_workouts: number;
  workouts_this_month: number;
  last_workout_date?: string;
}

export interface SessionSetDetail {
    exercise_name: string;
    set_number: number;
    reps: number;
    weight: number;
    is_completed: boolean;
}

export interface SessionDetail {
    id: string;
    routine_name: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    sets: SessionSetDetail[];
}


export const getHistory = (startDate: string, endDate: string) => {
  // Query Params: ?start_date=...&end_date=...
  return client<HistorySession[]>(`/history/?start_date=${startDate}&end_date=${endDate}`);
};

export const getStats = () => {
  return client<UserStats>('/history/stats');
};

export const getSessionDetails = (sessionId: string) => {
    return client<SessionDetail>(`/history/${sessionId}`);
};