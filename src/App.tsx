import React from 'react';
import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router';

const AppContent: React.FC = () => {
  return <AppRouter />;
};

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
