import { useState, useEffect } from 'react';

export type DiffXMode = 'EXCLUDE' | 'GREY' | 'OFF';

// Initial values loaded from localStorage if available
const STORAGE_KEY_THRESHOLD = 'hippo_systeme74_threshold';
const STORAGE_KEY_MODE = 'hippo_systeme74_mode';

let currentThreshold: number = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THRESHOLD);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= -50 && parsed <= 80) return parsed;
    }
  } catch {}
  return 20;
})();

let currentMode: DiffXMode = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    if (saved === 'EXCLUDE' || saved === 'GREY' || saved === 'OFF') return saved;
  } catch {}
  return 'OFF';
})();

const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.warn('[Systeme74Store] Error in listener:', e);
    }
  });
}

export function getSysteme74Threshold(): number {
  return currentThreshold;
}

export function getSysteme74Mode(): DiffXMode {
  return currentMode;
}

export function setSysteme74Threshold(val: number) {
  const clamped = Math.max(-50, Math.min(80, Math.round(val)));
  if (currentThreshold !== clamped) {
    currentThreshold = clamped;
    try {
      localStorage.setItem(STORAGE_KEY_THRESHOLD, String(clamped));
    } catch {}
    notifyAll();
  }
}

export function setSysteme74Mode(mode: DiffXMode) {
  if (currentMode !== mode) {
    currentMode = mode;
    try {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    } catch {}
    notifyAll();
  }
}

/**
 * Hook réactif garantissant la synchronisation en temps réel du seuil Système 74
 * à travers TOUS les tableaux de l'application.
 */
export function useSysteme74() {
  const [threshold, setThresholdState] = useState<number>(currentThreshold);
  const [mode, setModeState] = useState<DiffXMode>(currentMode);

  useEffect(() => {
    const handler = () => {
      setThresholdState(currentThreshold);
      setModeState(currentMode);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    threshold,
    mode,
    isActive: mode === 'EXCLUDE',
    isGrey: mode === 'GREY',
    isOff: mode === 'OFF',
    setThreshold: setSysteme74Threshold,
    setMode: setSysteme74Mode,
  };
}
