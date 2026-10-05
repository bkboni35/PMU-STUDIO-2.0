import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppInitializer } from './components/AppInitializer';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppInitializer>
        <App />
      </AppInitializer>
    </ErrorBoundary>
  </StrictMode>,
);

