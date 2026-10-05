import { initNanoBananaPalette } from '../components/GeminiNanoBananaPaletteSelector';

export type ThemeMode = 'system' | 'dark' | 'light';

const THEME_STORAGE_KEY = 'hippoanalyse_theme_mode_v1';

/**
 * Récupère le mode de thème sauvegardé ou 'system' par défaut
 */
export function getStoredThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'system') {
      return raw as ThemeMode;
    }
  } catch {
    // fallback
  }
  return 'dark';
}

/**
 * Détermine si le thème effectif actuel est Sombre ou Clair
 */
export function getEffectiveTheme(mode: ThemeMode = getStoredThemeMode()): 'dark' | 'light' {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  
  // mode system
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

/**
 * Applique le thème sur le document HTML (<html class="dark" ou "light">)
 */
export function applyTheme(mode: ThemeMode = getStoredThemeMode()): 'dark' | 'light' {
  const effective = getEffectiveTheme(mode);
  if (typeof document === 'undefined') return effective;

  const root = document.documentElement;

  if (effective === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }

  return effective;
}

/**
 * Sauvegarde la préférence de thème et l'applique immédiatement
 */
export function setStoredThemeMode(mode: ThemeMode): 'dark' | 'light' {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (err) {
    console.error('Erreur stockage thème:', err);
  }

  const effective = applyTheme(mode);

  // Émettre un événement pour synchroniser l'ensemble des composants React
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hippoanalyse-theme-changed', { detail: { mode, effective } })
    );
  }

  return effective;
}

/**
 * Initialise l'écouteur de changement de préférence système automatique
 */
export function initThemeListener(): () => void {
  // Application initiale
  applyTheme();
  initNanoBananaPalette();

  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }


  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    const mode = getStoredThemeMode();
    if (mode === 'system') {
      applyTheme('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // fallback navigateurs plus anciens
    (mediaQuery as any).addListener(handleChange);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleChange);
    } else {
      (mediaQuery as any).removeListener(handleChange);
    }
  };
}
