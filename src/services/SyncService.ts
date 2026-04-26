// ---------------------------------------------------------------------------
// SyncService — background sync for registered users.
//
// Architecture:
//   • SQLite (LocalService) is always the source of truth.
//   • SyncService pushes dirty records to the server and pulls server changes.
//   • Runs only when the user is authenticated (not a ghost user).
//   • Triggered by: app foreground (AppState), periodic interval (5 min),
//     or manually via SyncService.trigger().
//   • All errors are caught and logged — sync failure never surfaces to the user.
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

const LAST_PULL_AT_KEY  = 'sync_last_pull_at';
const SYNC_INTERVAL_MS  = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Server response types
// ---------------------------------------------------------------------------

interface PushResponse {
  accepted: number;
  errors:   string[];
}

interface PullResponse {
  changes:        PendingSyncData;
  server_time_ms: number;
}

// ---------------------------------------------------------------------------
// Observable status — lets React components subscribe to sync state
// ---------------------------------------------------------------------------

export interface SyncStatus {
  isSyncing:    boolean;
  pendingCount: number;       // records not yet pushed
  lastSyncedAt: number | null; // Unix ms of the last successful full cycle
  lastError:    string | null;
}

type StatusListener = (status: SyncStatus) => void;

const _listeners = new Set<StatusListener>();

let _status: SyncStatus = {
  isSyncing:    false,
  pendingCount: 0,
  lastSyncedAt: null,
  lastError:    null,
};

function emit(patch: Partial<SyncStatus>): void {
  _status = { ..._status, ...patch };
  _listeners.forEach(fn => fn(_status));
}

// ---------------------------------------------------------------------------
// Module-level singleton state
// ---------------------------------------------------------------------------

let _token:       string | null = null;
let _service:     LocalService | null = null;
let _intervalId:  ReturnType<typeof setInterval> | null = null;
let _appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------

async function syncCycle(): Promise<void> {
  if (!_token || !_service || _status.isSyncing) return;

  emit({ isSyncing: true, lastError: null });
  try {
    await push();
    await pull();
    emit({ isSyncing: false, lastSyncedAt: Date.now(), pendingCount: 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Network errors are expected when offline — log but don't surface to user.
    console.warn('[Sync] cycle failed (offline?):', msg);
    emit({ isSyncing: false, lastError: msg });
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

  emit({ pendingCount: totalPending });
  if (totalPending === 0) return;

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

  // Extract IDs that the server rejected so we don't mark them as synced.
  // Format is "<entity> <id>: <message>" — parse out the ID token.
  const failedIds = new Set<string>(
    response.errors.map(e => e.split(':')[0].trim().split(' ').pop() ?? '')
  );

  const keep = <T extends { id: string }>(records: T[]) =>
    records.filter(r => !failedIds.has(r.id)).map(r => r.id);

  await _service.markSynced({
    exerciseIds:        keep(pending.exercises),
    planIds:            keep(pending.plans),
    routineIds:         keep(pending.routines),
    routineExerciseIds: keep(pending.routineExercises),
    sessionIds:         keep(pending.sessions),
    setIds:             keep(pending.sets),
    settingsIds:        keep(pending.settings),
  });
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
    await _service.applyServerChanges(response.changes);
  }

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

    syncCycle(); // immediate on login

    _appStateSub = AppState.addEventListener('change', onAppStateChange);
    _intervalId  = setInterval(syncCycle, SYNC_INTERVAL_MS);
  },

  updateToken(token: string): void {
    _token = token;
  },

  stop(): void {
    if (_intervalId  !== null) { clearInterval(_intervalId);   _intervalId  = null; }
    if (_appStateSub !== null) { _appStateSub.remove();        _appStateSub = null; }
    _token   = null;
    _service = null;
    emit({ isSyncing: false, pendingCount: 0, lastError: null });
  },

  /** Manually kick off a sync cycle — e.g., from a UI button or after finishing a workout. */
  trigger(): void {
    syncCycle();
  },

  /** Subscribe to sync status changes. Returns an unsubscribe function. */
  subscribe(listener: StatusListener): () => void {
    _listeners.add(listener);
    listener(_status); // emit current state immediately so the subscriber isn't blind
    return () => _listeners.delete(listener);
  },

  /** Read the current status snapshot without subscribing. */
  getStatus(): SyncStatus {
    return _status;
  },
};
