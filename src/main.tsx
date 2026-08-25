import './lib/httpInterceptor';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

// Ensure HTML splash loader is dismissed once React boots
const appLoader = document.getElementById('app-loader');
if (appLoader) {
  appLoader.style.transition = 'opacity 0.25s ease';
  appLoader.style.opacity = '0';
  setTimeout(() => appLoader.remove(), 250);
}
