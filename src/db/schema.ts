import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// exercises
// user_id = null    → system template (bundled catalog, read-only)
// user_id = 'local' → created by the ghost user (custom)
// user_id = <uuid>  → created by a registered user (synced)
//
// Sync metadata is only relevant for custom exercises (is_system_template = false).
// System templates are seeded locally and never pushed to the server.
// ---------------------------------------------------------------------------
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug'),
  primary_muscle_group: text('primary_muscle_group').notNull(),
  // Arrays stored as JSON strings — parse/stringify in service layer
  secondary_muscle_groups: text('secondary_muscle_groups').notNull().default('[]'),
  exercise_type: text('exercise_type').notNull(),
  movement_pattern: text('movement_pattern').notNull(),
  equipment_type: text('equipment_type').notNull(),
  force_type: text('force_type'),
  status: text('status').notNull().default('active'),
  difficulty: text('difficulty'),
  tags: text('tags').notNull().default('[]'),
  aliases: text('aliases').notNull().default('[]'),
  default_increment: real('default_increment').notNull().default(0),
  unit: text('unit').notNull().default('kg'),
  is_custom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  is_system_template: integer('is_system_template', { mode: 'boolean' }).notNull().default(false),
  user_id: text('user_id'), // null = system, 'local' = ghost user custom, <uuid> = registered user
  // Sync metadata (custom exercises only — system templates never sync)
  updated_at: integer('updated_at'),      // Unix ms — set on every write; null for system templates
  is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  last_synced_at: integer('last_synced_at'), // null = unsynced / pending
});

// ---------------------------------------------------------------------------
// workout_plans
// ---------------------------------------------------------------------------
export const workout_plans = sqliteTable('workout_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  duration_weeks: integer('duration_weeks').notNull().default(4),
  start_date: text('start_date').notNull(), // ISO 8601 string
  end_date: text('end_date').notNull(),     // ISO 8601 string
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull(),
  // Sync metadata
  updated_at: integer('updated_at').notNull().default(0), // Unix ms
  is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  last_synced_at: integer('last_synced_at'), // null = unsynced / pending
});

// ---------------------------------------------------------------------------
// workout_routines
// ---------------------------------------------------------------------------
export const workout_routines = sqliteTable('workout_routines', {
  id: text('id').primaryKey(),
  plan_id: text('plan_id')
    .notNull()
    .references(() => workout_plans.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  day_of_week: integer('day_of_week'), // 0 = Monday … 6 = Sunday, null = no fixed day
  routine_type: text('routine_type').notNull().default('workout'), // 'workout' | 'rest'
  // Sync metadata
  updated_at: integer('updated_at').notNull().default(0), // Unix ms
  is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  last_synced_at: integer('last_synced_at'), // null = unsynced / pending
});

// ---------------------------------------------------------------------------
// routine_exercises  (exercises assigned to a routine with progression config)
// ---------------------------------------------------------------------------
export const routine_exercises = sqliteTable('routine_exercises', {
  id: text('id').primaryKey(),
  routine_id: text('routine_id')
    .notNull()
    .references(() => workout_routines.id, { onDelete: 'cascade' }),
  exercise_id: text('exercise_id')
    .notNull()
    .references(() => exercises.id),
  order_index: integer('order_index').notNull(),
  target_sets: integer('target_sets').notNull(),
  target_reps: integer('target_reps').notNull(),
  target_weight: real('target_weight').notNull(),
  target_duration_seconds: integer('target_duration_seconds'),
  rest_seconds: integer('rest_seconds').notNull().default(90),
  increment_weight: real('increment_weight').notNull().default(0),
  increment_reps: integer('increment_reps').notNull().default(0),
  increment_duration_seconds: integer('increment_duration_seconds').notNull().default(0),
  // Sync metadata
  updated_at: integer('updated_at').notNull().default(0), // Unix ms
  is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  last_synced_at: integer('last_synced_at'), // null = unsynced / pending
});

// ---------------------------------------------------------------------------
// workout_sessions  (a single logged workout)
// No cascade on routine_id — history must survive routine/plan deletion.
// ---------------------------------------------------------------------------
export const workout_sessions = sqliteTable('workout_sessions', {
  id: text('id').primaryKey(),
  routine_id: text('routine_id')
    .notNull()
    .references(() => workout_routines.id), // intentionally no cascade
  start_time: text('start_time').notNull(), // ISO 8601 string
  end_time: text('end_time'),               // null while in-progress
  status: text('status').notNull().default('completed'), // 'completed' | 'in_progress'
  // Sync metadata
  updated_at: integer('updated_at').notNull().default(0), // Unix ms
  is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  last_synced_at: integer('last_synced_at'), // null = unsynced / pending
});

// ---------------------------------------------------------------------------
// session_sets  (individual sets within a session)
// ---------------------------------------------------------------------------
export const session_sets = sqliteTable('session_sets', {
  id: text('id').primaryKey(),
  session_id: text('session_id')
    .notNull()
    .references(() => workout_sessions.id, { onDelete: 'cascade' }),
  exercise_id: text('exercise_id')
    .notNull()
    .references(() => exercises.id),
  set_number: integer('set_number').notNull(),
  reps: integer('reps').notNull(),
  weight: real('weight').notNull(),
  duration_seconds: integer('duration_seconds'),
  is_completed: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  // Sync metadata
  updated_at: integer('updated_at').notNull().default(0), // Unix ms
  is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  last_synced_at: integer('last_synced_at'), // null = unsynced / pending
});

// ---------------------------------------------------------------------------
// user_settings
// Persists user preferences in SQLite so they sync across devices.
// Previously stored in AsyncStorage — migrating here makes them syncable.
// user_id = null → ghost/local user  |  user_id = <uuid> → registered user
// ---------------------------------------------------------------------------
export const user_settings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  user_id: text('user_id'), // null = ghost user, <uuid> = registered user
  unit_system: text('unit_system').notNull().default('kg'), // 'kg' | 'lbs'
  available_plates: text('available_plates').notNull().default('[]'), // JSON string
  theme: text('theme').notNull().default('system'), // 'light' | 'dark' | 'system'
  // Sync metadata
  updated_at: integer('updated_at').notNull().default(0), // Unix ms
  last_synced_at: integer('last_synced_at'), // null = unsynced / pending
});
