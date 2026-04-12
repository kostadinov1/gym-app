// ---------------------------------------------------------------------------
// progressionEngine — pure TypeScript port of workouts.py:68–113
//
// Calculates progression targets for a routine based on how many weeks have
// elapsed since the plan's start date.  No side effects; safe to call from
// both LocalService and (future) unit tests.
// ---------------------------------------------------------------------------

import type { RoutineStartResponse, ExercisePreview, SetTarget } from '../api/workouts';

export interface ProgressionExerciseRow {
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  target_duration_seconds: number | null;
  increment_weight: number;
  increment_reps: number;
  increment_duration_seconds: number;
}

export function calculateWorkoutTargets(input: {
  routine_id: string;
  routine_name: string;
  routine_type: string;         // 'workout' | 'rest'
  plan_start_date: string | null;
  exercises: ProgressionExerciseRow[];
}): RoutineStartResponse {
  // Mirror Python exactly:
  //   if routine_type == 'rest': weeks_passed = 0
  //   else if plan.start_date:
  //     delta = now - plan_start
  //     if delta.days > 0: weeks_passed = delta.days // 7
  let weeks_passed = 0;

  if (input.routine_type !== 'rest' && input.plan_start_date) {
    const now = Date.now();
    const planStart = new Date(input.plan_start_date).getTime();
    const days = Math.floor((now - planStart) / 86_400_000);
    if (days > 0) {
      weeks_passed = Math.floor(days / 7);
    }
  }

  const responseExercises: ExercisePreview[] = input.exercises.map(rx => {
    // Base + (Increment × Weeks)
    const calculated_weight = rx.target_weight + rx.increment_weight * weeks_passed;
    const calculated_reps   = rx.target_reps   + rx.increment_reps   * weeks_passed;
    const calculated_duration =
      rx.target_duration_seconds !== null
        ? rx.target_duration_seconds + rx.increment_duration_seconds * weeks_passed
        : null;

    const sets: SetTarget[] = [];
    for (let i = 1; i <= rx.target_sets; i++) {
      sets.push({
        set_number:              i,
        target_reps:             Math.round(calculated_reps),
        target_weight:           calculated_weight,
        target_duration_seconds: calculated_duration,
      });
    }

    return {
      exercise_id:                rx.exercise_id,
      name:                       rx.exercise_name,
      sets,
      increment_weight:           rx.increment_weight,
      increment_reps:             rx.increment_reps,
      increment_duration_seconds: rx.increment_duration_seconds,
    };
  });

  return {
    routine_id: input.routine_id,
    name:       input.routine_name,
    exercises:  responseExercises,
  };
}
