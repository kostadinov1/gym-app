CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`unit_system` text DEFAULT 'kg' NOT NULL,
	`available_plates` text DEFAULT '[]' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`last_synced_at` integer
);
--> statement-breakpoint
ALTER TABLE `exercises` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `exercises` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `exercises` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `session_sets` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `session_sets` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `session_sets` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `workout_plans` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_plans` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_plans` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `workout_routines` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_routines` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_routines` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `last_synced_at` integer;