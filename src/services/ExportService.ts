// ---------------------------------------------------------------------------
// ExportService — export workout history as Strong-compatible CSV or JSON.
//
// Works for both LocalService and RemoteService since it reads data via
// IAppService and writes to the device cache directory via expo-file-system.
//
// Usage:
//   const svc = new ExportService(db);
//   await svc.export('csv');   // opens native share sheet
//   await svc.export('json');  // same
// ---------------------------------------------------------------------------

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { IAppService } from './types';
import type { SessionDetail } from '../api/history';

export type ExportFormat = 'csv' | 'json';

// ---------------------------------------------------------------------------
// Strong CSV column order (Hevy-compatible with minor header mapping)
// ---------------------------------------------------------------------------
// Date, Workout Name, Exercise Name, Set Order, Weight (kg), Reps, Duration, Notes

const CSV_HEADER = 'Date,Workout Name,Exercise Name,Set Order,Weight (kg),Reps,Duration,Notes';

function toStrongDate(iso: string): string {
  // "2026-04-12T09:30:00.000Z" → "2026-04-12 09:30:00"
  return iso.replace('T', ' ').replace(/\.\d+Z?$/, '').replace('Z', '');
}

function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Wrap in quotes if the field contains comma, quote or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// ExportService
// ---------------------------------------------------------------------------

export class ExportService {
  private db: IAppService;

  constructor(db: IAppService) {
    this.db = db;
  }

  async export(format: ExportFormat): Promise<void> {
    // Fetch a wide history window (5 years back) to capture everything
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 5, 0, 1).toISOString();
    const endDate = now.toISOString();

    const sessions = await this.db.getHistory(startDate, endDate);

    // Fetch full details for each session
    const details: SessionDetail[] = await Promise.all(
      sessions.map(s => this.db.getSessionDetails(s.id)),
    );

    const content = format === 'csv'
      ? this.formatCsv(details)
      : this.formatJson(details);

    const ext = format === 'csv' ? 'csv' : 'json';
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `gymtracker_export_${timestamp}.${ext}`;

    const file = new File(Paths.cache, filename);
    file.write(content);
    const uri = file.uri;

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Sharing is not available on this device.');
    }

    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export Workout Data' });
  }

  // ── Strong CSV ────────────────────────────────────────────────────────────

  private formatCsv(sessions: SessionDetail[]): string {
    const rows: string[] = [CSV_HEADER];

    for (const session of sessions) {
      const date = toStrongDate(session.start_time);
      const workoutName = escapeCsvField(session.routine_name);

      // Group sets by exercise (preserving encounter order)
      const byExercise: Map<string, typeof session.sets> = new Map();
      for (const set of session.sets) {
        if (!byExercise.has(set.exercise_id)) byExercise.set(set.exercise_id, []);
        byExercise.get(set.exercise_id)!.push(set);
      }

      for (const sets of byExercise.values()) {
        for (const set of sets) {
          const duration = set.duration_seconds ? String(set.duration_seconds) : '';
          rows.push([
            escapeCsvField(date),
            workoutName,
            escapeCsvField(set.exercise_name),
            escapeCsvField(set.set_number),
            escapeCsvField(set.weight),
            escapeCsvField(set.reps),
            escapeCsvField(duration),
            '', // Notes — not tracked
          ].join(','));
        }
      }
    }

    return rows.join('\n');
  }

  // ── Full-fidelity JSON ────────────────────────────────────────────────────

  private formatJson(sessions: SessionDetail[]): string {
    const payload = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      session_count: sessions.length,
      sessions: sessions.map(s => ({
        id:               s.id,
        routine_name:     s.routine_name,
        start_time:       s.start_time,
        end_time:         s.end_time,
        duration_minutes: s.duration_minutes,
        sets: s.sets.map(set => ({
          exercise_id:      set.exercise_id,
          exercise_name:    set.exercise_name,
          set_number:       set.set_number,
          weight:           set.weight,
          reps:             set.reps,
          duration_seconds: set.duration_seconds,
          is_completed:     set.is_completed,
        })),
      })),
    };

    return JSON.stringify(payload, null, 2);
  }
}
