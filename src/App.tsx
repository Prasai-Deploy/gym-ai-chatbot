import React from 'react';
import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router';
import { useTheme } from './hooks/useTheme';

const AppContent: React.FC = () => {
  // Initialize theme from localStorage on load
  useTheme();
  
  return <AppRouter />;
};

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
