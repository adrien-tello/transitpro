import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './app/router';
import { ToastProvider } from './components/ui/Toast';
import { queryClient } from './lib/queryClient';
import './styles/index.css';
import './lib/theme'; // keeps the theme in sync (system changes, printing)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
