import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { config } from '@/constants/config';
import { store } from '@/app/store';
import { AppProviders } from '@/app/providers';
import { createAppRouter } from '@/app/router';
import '@/styles/index.css';

async function start() {
  if (config.useMockApi) {
    const { enableMockApi } = await import('@/services/api/mock');
    enableMockApi();
  } else if (!config.apiBaseUrl) {
    console.error('VITE_API_BASE_URL is not set. Copy .env.example to .env and configure it.');
  }
  const router = createAppRouter();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders store={store}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

void start();
