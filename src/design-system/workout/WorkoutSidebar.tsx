import React from 'react';
import { Drawer } from '../components/Drawer';
import { ExerciseQueue, QueueExercise } from './ExerciseQueue';

export interface WorkoutSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: QueueExercise[];
  activeExerciseId: string;
  onSelectExercise: (id: string) => void;
}

export const WorkoutSidebar: React.FC<WorkoutSidebarProps> = React.memo(({
  isOpen,
  onClose,
  exercises,
  activeExerciseId,
  onSelectExercise,
}) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Exercise Queue" side="right">
      <ExerciseQueue
        exercises={exercises}
        activeExerciseId={activeExerciseId}
        onSelectExercise={(id) => {
          onSelectExercise(id);
          onClose();
        }}
      />
    </Drawer>
  );
});

WorkoutSidebar.displayName = 'WorkoutSidebar';
