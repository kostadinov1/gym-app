// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
//
// IMPORTANT: SQL is inlined as a plain string instead of importing the .sql file.
// Metro bundler cannot reliably import .sql files as text without complex tooling.
// When you add a new migration (run `npx drizzle-kit generate`), copy the generated
// .sql content into a new `const m000X` string below and add it to the migrations object.

import journal from './meta/_journal.json';

const m0000 = `CREATE TABLE \`exercises\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`slug\` text,
	\`primary_muscle_group\` text NOT NULL,
	\`secondary_muscle_groups\` text DEFAULT '[]' NOT NULL,
	\`exercise_type\` text NOT NULL,
	\`movement_pattern\` text NOT NULL,
	\`equipment_type\` text NOT NULL,
	\`force_type\` text,
	\`status\` text DEFAULT 'active' NOT NULL,
	\`difficulty\` text,
	\`tags\` text DEFAULT '[]' NOT NULL,
	\`aliases\` text DEFAULT '[]' NOT NULL,
	\`default_increment\` real DEFAULT 0 NOT NULL,
	\`unit\` text DEFAULT 'kg' NOT NULL,
	\`is_custom\` integer DEFAULT false NOT NULL,
	\`is_system_template\` integer DEFAULT false NOT NULL,
	\`user_id\` text
);
--> statement-breakpoint
CREATE TABLE \`routine_exercises\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`routine_id\` text NOT NULL,
	\`exercise_id\` text NOT NULL,
	\`order_index\` integer NOT NULL,
	\`target_sets\` integer NOT NULL,
	\`target_reps\` integer NOT NULL,
	\`target_weight\` real NOT NULL,
	\`target_duration_seconds\` integer,
	\`rest_seconds\` integer DEFAULT 90 NOT NULL,
	\`increment_weight\` real DEFAULT 0 NOT NULL,
	\`increment_reps\` integer DEFAULT 0 NOT NULL,
	\`increment_duration_seconds\` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (\`routine_id\`) REFERENCES \`workout_routines\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`exercise_id\`) REFERENCES \`exercises\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`session_sets\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`session_id\` text NOT NULL,
	\`exercise_id\` text NOT NULL,
	\`set_number\` integer NOT NULL,
	\`reps\` integer NOT NULL,
	\`weight\` real NOT NULL,
	\`duration_seconds\` integer,
	\`is_completed\` integer DEFAULT false NOT NULL,
	FOREIGN KEY (\`session_id\`) REFERENCES \`workout_sessions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`exercise_id\`) REFERENCES \`exercises\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`workout_plans\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`description\` text,
	\`duration_weeks\` integer DEFAULT 4 NOT NULL,
	\`start_date\` text NOT NULL,
	\`end_date\` text NOT NULL,
	\`is_active\` integer DEFAULT true NOT NULL,
	\`created_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`workout_routines\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`plan_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`day_of_week\` integer,
	\`routine_type\` text DEFAULT 'workout' NOT NULL,
	FOREIGN KEY (\`plan_id\`) REFERENCES \`workout_plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`workout_sessions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`routine_id\` text NOT NULL,
	\`start_time\` text NOT NULL,
	\`end_time\` text,
	\`status\` text DEFAULT 'completed' NOT NULL,
	FOREIGN KEY (\`routine_id\`) REFERENCES \`workout_routines\`(\`id\`) ON UPDATE no action ON DELETE no action
);`;

const m0001 = `CREATE TABLE \`user_settings\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text,
	\`unit_system\` text DEFAULT 'kg' NOT NULL,
	\`available_plates\` text DEFAULT '[]' NOT NULL,
	\`theme\` text DEFAULT 'system' NOT NULL,
	\`updated_at\` integer DEFAULT 0 NOT NULL,
	\`last_synced_at\` integer
);
--> statement-breakpoint
ALTER TABLE \`exercises\` ADD \`updated_at\` integer;--> statement-breakpoint
ALTER TABLE \`exercises\` ADD \`is_deleted\` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE \`exercises\` ADD \`last_synced_at\` integer;--> statement-breakpoint
ALTER TABLE \`routine_exercises\` ADD \`updated_at\` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`routine_exercises\` ADD \`is_deleted\` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE \`routine_exercises\` ADD \`last_synced_at\` integer;--> statement-breakpoint
ALTER TABLE \`session_sets\` ADD \`updated_at\` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`session_sets\` ADD \`is_deleted\` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE \`session_sets\` ADD \`last_synced_at\` integer;--> statement-breakpoint
ALTER TABLE \`workout_plans\` ADD \`updated_at\` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`workout_plans\` ADD \`is_deleted\` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE \`workout_plans\` ADD \`last_synced_at\` integer;--> statement-breakpoint
ALTER TABLE \`workout_routines\` ADD \`updated_at\` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`workout_routines\` ADD \`is_deleted\` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE \`workout_routines\` ADD \`last_synced_at\` integer;--> statement-breakpoint
ALTER TABLE \`workout_sessions\` ADD \`updated_at\` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`workout_sessions\` ADD \`is_deleted\` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE \`workout_sessions\` ADD \`last_synced_at\` integer;`;

export default {
  journal,
  migrations: {
    m0000,
    m0001,
  },
};
