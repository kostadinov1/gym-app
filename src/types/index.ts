export interface Exercise {
  id: string;
  name: string;
  slug?: string | null;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  exercise_type: string;
  movement_pattern: string;
  equipment_type: string;
  force_type?: string | null;
  status: 'active' | 'deprecated';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
  tags: string[];
  aliases: string[];
  default_increment: number;
  unit: string;
  is_custom: boolean;
  is_system_template: boolean;
  user_id?: string | null;
}
