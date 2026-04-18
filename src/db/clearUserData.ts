// ---------------------------------------------------------------------------
// clearLocalUserData — wipes all user-created rows from SQLite on sign-out.
//
// Called by AuthContext.signOut() so that every sign-out path (manual logout,
// session expiry, account deletion) gets a clean slate automatically.
//
// What IS wiped:
//   • workout_plans, workout_routines, routine_exercises
//   • workout_sessions, session_sets
//   • user_settings
//   • custom exercises (is_custom = true) — ghost or registered user's own data
//
// What is NOT wiped:
//   • System exercises (is_system_template = true / is_custom = false)
//     These are the read-only catalog, seeded at startup — not user data.
//
// If the wipe fails, sign-out still proceeds — being stuck logged in is worse
// than leaving stale rows that the next sync pull will overwrite anyway.
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import { eq } from 'drizzle-orm';
import { db } from './client';
import {
  exercises,
  workout_plans,
  workout_routines,
  routine_exercises,
  workout_sessions,
  session_sets,
  user_settings,
} from './schema';

const LAST_PULL_AT_KEY = 'sync_last_pull_at';

export async function clearLocalUserData(): Promise<void> {
  try {
    await db.transaction(async tx => {
      // Order matters — delete children before parents to respect FK constraints.
      // (SQLite enforces FKs when PRAGMA foreign_keys = ON, which Expo SQLite sets.)
      await tx.delete(session_sets);
      await tx.delete(workout_sessions);
      await tx.delete(routine_exercises);
      await tx.delete(workout_routines);
      await tx.delete(workout_plans);
      await tx.delete(user_settings);

      // Only wipe custom exercises — system catalog stays intact.
      await tx.delete(exercises).where(eq(exercises.is_custom, true));
    });

    // Reset the sync pull cursor so the next user starts a fresh pull from the server.
    await AsyncStorage.removeItem(LAST_PULL_AT_KEY);

    console.log('[DB] Local user data cleared');
  } catch (e) {
    // Log but do not re-throw — sign-out must always succeed.
    console.error('[DB] clearLocalUserData failed:', e);
  }
}
