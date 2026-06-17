import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { AuthCallback } from './pages/AuthCallback.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Lazy load the main App (Dashboard)
const App = lazy(() => import('./App.tsx'));

const FullScreenSpinner = () => (
  <div className="h-screen flex items-center justify-center" style={{ background: 'var(--surface-primary)' }}>
    <div className="w-10 h-10 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
  </div>
);

function Root() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<FullScreenSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// Remove the native HTML splash screen once React has mounted
const loader = document.getElementById('app-loader');
if (loader) {
  loader.remove();
}
