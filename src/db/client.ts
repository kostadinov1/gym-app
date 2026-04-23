import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations/migrations';
import * as schema from './schema';

// Open (or create) the SQLite database file.
// The file lives in the app's private storage — no other app can read it.
const sqlite = openDatabaseSync('gymlogic.db');

// Drizzle wraps the raw SQLite handle with type-safe query builders.
export const db = drizzle(sqlite, { schema });

// Run all pending migrations synchronously on startup.
// Drizzle tracks applied migrations in a __drizzle_migrations table —
// safe to call every launch; already-applied migrations are skipped.
export async function runMigrations() {
  await migrate(db, migrations);
}
