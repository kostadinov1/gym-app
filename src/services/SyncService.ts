// ---------------------------------------------------------------------------
// SyncService — background sync for registered users.
//
// Architecture:
//   • SQLite (LocalService) is always the source of truth.
//   • SyncService pushes dirty records to the server and pulls server changes.
//   • Runs only when the user is authenticated (not a ghost user).
//   • Triggered by: app coming to foreground, periodic interval (5 min).
//   • All errors are caught and logged — a sync failure never surfaces to the user.
//
// Sync cycle:
//   1. PUSH  → getPendingSync() → POST /sync/push → markSynced()
//   2. PULL  → GET /sync/pull?since=<lastPullAt> → applyServerChanges()
//
// Conflict resolution: last-write-wins on updated_at (server enforces the same rule).
// ---------------------------------------------------------------------------

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../api/client';
import type { LocalService, PendingSyncData } from './LocalService';

const LAST_PULL_AT_KEY = 'sync_last_pull_at';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Server response types
// ---------------------------------------------------------------------------

interface PushResponse {
  accepted: number;
  errors:   string[];
}

interface PullResponse {
  changes: PendingSyncData;
  server_time_ms: number; // Unix ms — stored as next pull cursor
}

// ---------------------------------------------------------------------------
// SyncService (module-level singleton)
// ---------------------------------------------------------------------------

let _token:         string | null = null;
let _service:       LocalService | null = null;
let _intervalId:    ReturnType<typeof setInterval> | null = null;
let _appStateSub:   ReturnType<typeof AppState.addEventListener> | null = null;
let _isSyncing      = false;

async function syncCycle(): Promise<void> {
  if (!_token || !_service || _isSyncing) return;

  _isSyncing = true;
  try {
    await push();
    await pull();
  } catch (e) {
    // Network errors are expected when offline — silently swallow them.
    console.log('[Sync] cycle failed (offline?):', e);
  } finally {
    _isSyncing = false;
  }
}

async function push(): Promise<void> {
  if (!_service) return;

  const pending = await _service.getPendingSync();
  const totalPending =
    pending.exercises.length +
    pending.plans.length +
    pending.routines.length +
    pending.routineExercises.length +
    pending.sessions.length +
    pending.sets.length +
    pending.settings.length;

  if (totalPending === 0) return;

  console.log(`[Sync] pushing ${totalPending} records`);

  const response = await client<PushResponse>('/sync/push', {
    method: 'POST',
    body: JSON.stringify({
      exercises:         pending.exercises,
      plans:             pending.plans,
      routines:          pending.routines,
      routine_exercises: pending.routineExercises,
      sessions:          pending.sessions,
      sets:              pending.sets,
      settings:          pending.settings,
    }),
  });

  if (response.errors.length > 0) {
    console.warn('[Sync] push errors:', response.errors);
  }

  // Stamp last_synced_at on all records that were accepted
  await _service.markSynced({
    exerciseIds:        pending.exercises.map(r => r.id),
    planIds:            pending.plans.map(r => r.id),
    routineIds:         pending.routines.map(r => r.id),
    routineExerciseIds: pending.routineExercises.map(r => r.id),
    sessionIds:         pending.sessions.map(r => r.id),
    setIds:             pending.sets.map(r => r.id),
    settingsIds:        pending.settings.map(r => r.id),
  });

  console.log(`[Sync] pushed ${response.accepted} records`);
}

async function pull(): Promise<void> {
  if (!_service) return;

  const lastPullAt = await AsyncStorage.getItem(LAST_PULL_AT_KEY);
  const since = lastPullAt ?? '0';

  const response = await client<PullResponse>(`/sync/pull?since=${since}`);

  const totalChanges =
    response.changes.exercises.length +
    response.changes.plans.length +
    response.changes.routines.length +
    response.changes.routineExercises.length +
    response.changes.sessions.length +
    response.changes.sets.length +
    response.changes.settings.length;

  if (totalChanges > 0) {
    console.log(`[Sync] applying ${totalChanges} server changes`);
    await _service.applyServerChanges(response.changes);
  }

  // Advance the pull cursor to the server's current time
  await AsyncStorage.setItem(LAST_PULL_AT_KEY, String(response.server_time_ms));
}

function onAppStateChange(nextState: AppStateStatus): void {
  if (nextState === 'active') {
    syncCycle();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const SyncService = {
  start(token: string, service: LocalService): void {
    _token   = token;
    _service = service;

    // Trigger immediately on start
    syncCycle();

    // Listen for app foreground events
    _appStateSub = AppState.addEventListener('change', onAppStateChange);

    // Periodic fallback in case the app stays in foreground for a long time
    _intervalId = setInterval(syncCycle, SYNC_INTERVAL_MS);

    console.log('[Sync] started');
  },

  updateToken(token: string): void {
    _token = token;
  },

  stop(): void {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    if (_appStateSub !== null) {
      _appStateSub.remove();
      _appStateSub = null;
    }
    _token   = null;
    _service = null;
    _isSyncing = false;
    console.log('[Sync] stopped');
  },

  /** Trigger a manual sync cycle (e.g., after finishing a workout). */
  trigger(): void {
    syncCycle();
  },
};
