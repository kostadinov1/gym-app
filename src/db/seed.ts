import { db } from './client';
import { exercises } from './schema';
import { eq, sql } from 'drizzle-orm';
import systemExercisesData from '../../assets/system_exercises.json';

interface RawExercise {
  name: string;
  slug: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  exercise_type: string;
  movement_pattern: string;
  equipment_type: string;
  force_type?: string | null;
  status: string;
  difficulty?: string | null;
  tags: string[];
  aliases: string[];
  default_increment: number;
  unit: string;
}

// Generates a simple UUID v4 — no external dependency needed.
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Seeds the local SQLite database with the bundled system exercise catalog.
 * Safe to call on every app launch — checks row count first and skips if
 * already seeded. The catalog is inserted in a single transaction for speed.
 */
export async function seedSystemExercises(): Promise<void> {
  // Fast check: if any system templates exist, seeding is already done.
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(exercises)
    .where(eq(exercises.is_system_template, true));

  if (existing[0]?.count > 0) return;

  const rows = (systemExercisesData as RawExercise[]).map((ex) => ({
    id: generateUUID(),
    name: ex.name,
    slug: ex.slug,
    primary_muscle_group: ex.primary_muscle_group,
    secondary_muscle_groups: JSON.stringify(ex.secondary_muscle_groups ?? []),
    exercise_type: ex.exercise_type,
    movement_pattern: ex.movement_pattern,
    equipment_type: ex.equipment_type,
    force_type: ex.force_type ?? null,
    status: ex.status ?? 'active',
    difficulty: ex.difficulty ?? null,
    tags: JSON.stringify(ex.tags ?? []),
    aliases: JSON.stringify(ex.aliases ?? []),
    default_increment: ex.default_increment ?? 0,
    unit: ex.unit ?? 'kg',
    is_custom: false,
    is_system_template: true,
    user_id: null,
  }));

  // Insert in batches of 50 to stay within SQLite variable limits.
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(exercises).values(rows.slice(i, i + BATCH));
  }

}
