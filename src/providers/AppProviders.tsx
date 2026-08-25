import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { BrandingProvider } from '../context/BrandingContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeProvider } from '../design-system/ThemeProvider';
import { InstallPrompt } from '../components/InstallPrompt';
import { OfflineBanner } from '../components/OfflineBanner';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system">
        <BrowserRouter>
          {/* BrandingProvider must nest INSIDE AuthProvider — it needs useAuth()
              to know when a user has signed in before it can look up their gym. */}
          <AuthProvider>
            <BrandingProvider>
              {children}
              <OfflineBanner />
              <InstallPrompt />
            </BrandingProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
