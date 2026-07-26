export const transitions = {
  default: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  fast: 'all 0.1s cubic-bezier(0.16, 1, 0.3, 1)',
  slow: 'all 0.3s ease-out',
  transform: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  colors: 'background-color 0.2s ease-out, color 0.2s ease-out, border-color 0.2s ease-out',
} as const;
