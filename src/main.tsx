import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppInitializer } from './components/AppInitializer';
import { AppSafeBoundary } from './components/AppSafeBoundary';
import './index.css';

// Mounting point v2.0.0
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppSafeBoundary>
      <AppInitializer>
        <App />
      </AppInitializer>
    </AppSafeBoundary>
  </StrictMode>,
);


