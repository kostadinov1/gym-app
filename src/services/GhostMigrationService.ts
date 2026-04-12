// ---------------------------------------------------------------------------
// GhostMigrationService — collects the local SQLite snapshot and sends it
// to POST /migrate on the backend.
//
// Called after a ghost user registers.  On success the caller must:
//   1. Store { migrated_at, server_user_id } in AsyncStorage (idempotency).
//   2. Call queryClient.clear() to flush stale local cache.
//   3. Call promoteGuest(token) to flip the auth context to remote mode.
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { eq } from 'drizzle-orm';

import { db } from '../db/client';
import {
  exercises as exercisesTable,
  workout_plans,
  workout_routines,
  routine_exercises,
  workout_sessions,
  session_sets,
} from '../db/schema';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const MIGRATION_KEY = 'ghost_migration';

// ---------------------------------------------------------------------------
// Types mirroring app/schemas/migration.py
// ---------------------------------------------------------------------------

export interface MigrationResult {
  success: boolean;
  counts: {
    custom_exercises: number;
    plans: number;
    routines: number;
    sessions: number;
    sets: number;
  };
  errors: string[];
}

interface MigrationRecord {
  migrated_at: string;
  server_user_id: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a stored migration record if this ghost user has already migrated,
 * so the caller can skip re-migration.
 */
export async function getMigrationRecord(): Promise<MigrationRecord | null> {
  const raw = await AsyncStorage.getItem(MIGRATION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as MigrationRecord; }
  catch { return null; }
}

/**
 * Collects local SQLite data and POSTs it to /migrate.
 * Throws on network / server errors so the caller can surface them.
 */
export async function runGhostMigration(): Promise<MigrationResult> {
  const token = await SecureStore.getItemAsync('userToken');
  if (!token) throw new Error('No auth token — register before migrating.');

  const payload = await buildPayload();

  const response = await fetch(`${BASE_URL}/migrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const err = await response.json();
      detail = err.detail ?? JSON.stringify(err);
    } catch { /* ignore */ }
    throw new Error(detail);
  }

  const result: MigrationResult = await response.json();

  if (result.success) {
    // Decode user id from JWT (middle segment)
    const serverUserId = decodeUserIdFromToken(token);
    await AsyncStorage.setItem(
      MIGRATION_KEY,
      JSON.stringify({ migrated_at: new Date().toISOString(), server_user_id: serverUserId }),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

async function buildPayload() {
  // ── Custom exercises ────────────────────────────────────────────────────
  const customRows = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.user_id, 'local'));

  const custom_exercises = customRows.map(e => ({
    local_id:                e.id,
    name:                    e.name,
    slug:                    e.slug ?? null,
    primary_muscle_group:    e.primary_muscle_group,
    secondary_muscle_groups: parseArr(e.secondary_muscle_groups),
    exercise_type:           e.exercise_type,
    movement_pattern:        e.movement_pattern,
    equipment_type:          e.equipment_type,
    force_type:              e.force_type ?? null,
    status:                  e.status,
    difficulty:              e.difficulty ?? null,
    tags:                    parseArr(e.tags),
    aliases:                 parseArr(e.aliases),
    default_increment:       e.default_increment,
    unit:                    e.unit,
  }));

  // ── System exercises referenced in routine_exercises ───────────────────
  // Collect unique slugs so the backend can build its id map
  const systemRows = await db
    .select({ id: exercisesTable.id, slug: exercisesTable.slug })
    .from(exercisesTable)
    .where(eq(exercisesTable.is_system_template, true));

  const systemIdToSlug = new Map(systemRows.map(r => [r.id, r.slug]));

  // ── Plans ───────────────────────────────────────────────────────────────
  const planRows      = await db.select().from(workout_plans);
  const routineRows   = await db.select().from(workout_routines);
  const reRows        = await db.select().from(routine_exercises);
  const sessionRows   = await db.select().from(workout_sessions);
  const setRows       = await db.select().from(session_sets);

  // Collect all system exercise local_ids used in routine_exercises
  const usedSystemLocalIds = new Set<string>();
  for (const re of reRows) {
    if (!customRows.find(c => c.id === re.exercise_id)) {
      usedSystemLocalIds.add(re.exercise_id);
    }
  }
  // And those used in session sets
  for (const s of setRows) {
    if (!customRows.find(c => c.id === s.exercise_id)) {
      usedSystemLocalIds.add(s.exercise_id);
    }
  }

  // Build slug list + a local_id→slug map for the backend to resolve
  const system_exercise_slugs: string[] = [];
  const localIdToSlug = new Map<string, string>();
  for (const localId of usedSystemLocalIds) {
    const slug = systemIdToSlug.get(localId);
    if (slug) {
      localIdToSlug.set(localId, slug);
      if (!system_exercise_slugs.includes(slug)) {
        system_exercise_slugs.push(slug);
      }
    }
  }

  // Build a unified local_id→exercise_local_id for the payload.
  // Custom exercises: use local_id directly (backend maps via custom_exercises).
  // System exercises: use slug as the key (backend maps via system_exercise_slugs).
  const resolveExerciseLocalId = (localId: string): string => {
    if (customRows.find(c => c.id === localId)) return localId;
    return localIdToSlug.get(localId) ?? localId;
  };

  const plans = planRows.map(plan => {
    const planRoutines = routineRows.filter(r => r.plan_id === plan.id);

    return {
      local_id:       plan.id,
      name:           plan.name,
      description:    plan.description ?? null,
      duration_weeks: plan.duration_weeks,
      start_date:     plan.start_date,
      end_date:       plan.end_date,
      is_active:      plan.is_active,
      routines: planRoutines.map(r => {
        const exercises = reRows
          .filter(re => re.routine_id === r.id)
          .sort((a, b) => a.order_index - b.order_index)
          .map(re => ({
            local_id:                   re.id,
            exercise_local_id:          resolveExerciseLocalId(re.exercise_id),
            order_index:                re.order_index,
            target_sets:                re.target_sets,
            target_reps:                re.target_reps,
            target_weight:              re.target_weight,
            target_duration_seconds:    re.target_duration_seconds ?? null,
            rest_seconds:               re.rest_seconds,
            increment_weight:           re.increment_weight,
            increment_reps:             re.increment_reps,
            increment_duration_seconds: re.increment_duration_seconds,
          }));

        return {
          local_id:     r.id,
          name:         r.name,
          day_of_week:  r.day_of_week ?? null,
          routine_type: r.routine_type,
          exercises,
        };
      }),
    };
  });

  // ── Sessions ────────────────────────────────────────────────────────────
  const sessions = sessionRows.map(s => {
    const sets = setRows
      .filter(st => st.session_id === s.id)
      .sort((a, b) => a.set_number - b.set_number)
      .map(st => ({
        local_id:          st.id,
        exercise_local_id: resolveExerciseLocalId(st.exercise_id),
        set_number:        st.set_number,
        reps:              st.reps,
        weight:            st.weight,
        duration_seconds:  st.duration_seconds ?? null,
        is_completed:      st.is_completed,
      }));

    return {
      local_id:         s.id,
      routine_local_id: s.routine_id,
      start_time:       s.start_time,
      end_time:         s.end_time ?? null,
      status:           s.status,
      sets,
    };
  });

  return { custom_exercises, system_exercise_slugs, plans, sessions };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArr(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; }
  catch { return []; }
}

function decodeUserIdFromToken(token: string): string {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub ?? '';
  } catch {
    return '';
  }
}
