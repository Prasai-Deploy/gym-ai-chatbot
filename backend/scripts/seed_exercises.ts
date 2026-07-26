import { supabaseAdmin } from '../src/database/supabase';
import { randomUUID } from 'crypto';
import { logger } from '../src/logger';

async function seed() {
  logger.info('Starting Exercise Library Seed...');
  
  // 1. Seed Categories
  const categories = ['Strength', 'Cardio', 'Mobility'];
  for (const cat of categories) {
    await supabaseAdmin.from('exercise_categories').upsert({ name: cat }, { onConflict: 'name' });
  }

  // 2. Seed Muscle Groups
  const muscles = ['Chest', 'Back', 'Legs', 'Core', 'Shoulders', 'Arms'];
  for (const muscle of muscles) {
    await supabaseAdmin.from('muscle_groups').upsert({ name: muscle }, { onConflict: 'name' });
  }

  // 3. Seed Equipment
  const equipment = ['Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Bodyweight', 'Resistance Band'];
  for (const eq of equipment) {
    await supabaseAdmin.from('equipment').upsert({ name: eq }, { onConflict: 'name' });
  }

  // 4. Seed Movement Patterns
  const patterns = ['Push', 'Pull', 'Squat', 'Hinge', 'Carry', 'Core'];
  for (const pattern of patterns) {
    await supabaseAdmin.from('movement_patterns').upsert({ name: pattern }, { onConflict: 'name' });
  }

  // 5. Seed Core Exercises
  const exercises = [
    {
      name: 'Barbell Bench Press',
      slug: 'barbell-bench-press',
      description: 'A classic upper body pushing exercise.',
      difficulty: 'intermediate',
    },
    {
      name: 'Barbell Back Squat',
      slug: 'barbell-back-squat',
      description: 'A fundamental lower body movement.',
      difficulty: 'intermediate',
    },
    {
      name: 'Pull Up',
      slug: 'pull-up',
      description: 'A vertical pull using bodyweight.',
      difficulty: 'advanced',
    },
    {
      name: 'Push Up',
      slug: 'push-up',
      description: 'A horizontal push using bodyweight.',
      difficulty: 'beginner',
    }
  ];

  for (const ex of exercises) {
    const { data: existing } = await supabaseAdmin.from('exercises').select('id').eq('slug', ex.slug).single();
    if (!existing) {
      const exId = randomUUID();
      await supabaseAdmin.from('exercises').insert({
        id: exId,
        name: ex.name,
        slug: ex.slug,
        description: ex.description,
        difficulty: ex.difficulty,
      });
      logger.info(`Inserted exercise: ${ex.name}`);
    } else {
      logger.info(`Exercise already exists: ${ex.name}`);
    }
  }

  logger.info('Seed completed successfully.');
}

seed().catch(err => {
  logger.error(err, 'Failed to seed exercises');
  process.exit(1);
});
