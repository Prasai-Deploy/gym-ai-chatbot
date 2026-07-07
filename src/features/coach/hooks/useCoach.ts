import { useState } from 'react';

export const useCoach = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleCoach = () => setIsOpen(!isOpen);

  return {
    isOpen,
    setIsOpen,
    toggleCoach
  };
};
