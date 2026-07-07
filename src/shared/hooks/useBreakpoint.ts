import { useState, useEffect } from 'react';

export function useBreakpoint(breakpoint: string): boolean {
  const [isMatch, setIsMatch] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${breakpoint})`);
    
    // Initial check
    setIsMatch(mediaQuery.matches);

    // Event listener for changes
    const handler = (e: MediaQueryListEvent) => setIsMatch(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMatch;
}
