import { client } from './client';

export interface HistorySession {
  id: string;
  routine_name: string;
  date: string; // ISO date
  status: string;
}

export const getHistory = (startDate: string, endDate: string) => {
  // Query Params: ?start_date=...&end_date=...
  return client<HistorySession[]>(`/history/?start_date=${startDate}&end_date=${endDate}`);
};