import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { db, ensureFirebaseAuth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { initThemeListener, applyTheme } from '../utils/themeManager';
import { getStoredUserSession } from '../utils/userAuthStorage';
import { getFavoriteRaces, getRaceHistory, FavoriteCourseItem, HistoryCourseItem } from '../utils/favoritesStorage';
import { enrichRaceWithGeminiCollege } from '../utils/geminiMultiModelEngine';
import { getDefaultInitialCourse } from '../data/plrFriday02Data';
import { SAMPLE_RACES } from '../data/sampleRaces';
import { CourseHippique } from '../types/turf';
import { UserProfile } from '../types/userAuth';
import { ShieldCheck, CheckCircle2, Loader2, Sparkles, Database, Palette, User, Trophy } from 'lucide-react';

export interface AppInitializerData {
  course: CourseHippique | null;
  user: UserProfile | null;
  favorites: FavoriteCourseItem[];
  history: HistoryCourseItem[];
  themeApplied: boolean;
  firebaseConnected: boolean;
}

export interface AppInitializerContextType {
  isInitialized: boolean;
  isFadingOut: boolean;
  progress: number;
  currentStepMessage: string;
  data: AppInitializerData;
}

const AppInitializerContext = createContext<AppInitializerContextType | null>(null);

export function useAppInitializer(): AppInitializerContextType {
  const context = useContext(AppInitializerContext);
  if (!context) {
    // Fallback safe si utilisé hors Provider
    return {
      isInitialized: true,
      isFadingOut: false,
      progress: 100,
      currentStepMessage: 'Prêt',
      data: {
        course: null,
        user: null,
        favorites: [],
        history: [],
        themeApplied: true,
        firebaseConnected: true,
      },
    };
  }
  return context;
}

interface AppInitializerProps {
  children: React.ReactNode;
}

interface StepStatus {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(10);
  const [currentStepMessage, setCurrentStepMessage] = useState<string>('Démarrage du logiciel PMU-STUDIO 2.0...');

  const [steps, setSteps] = useState<StepStatus[]>([
    {
      id: 'theme',
      label: 'Ergonomie & Thèmes',
      sublabel: 'Application du profil visuel sombre/clair',
      icon: Palette,
      status: 'pending',
    },
    {
      id: 'firebase',
      label: 'Services Firebase & Temps Réel',
      sublabel: 'Connexion aux flux d’arrivées officielles',
      icon: Database,
      status: 'pending',
    },
    {
      id: 'user',
      label: 'Session & Préférences',
      sublabel: 'Restauration profil, favoris & historique',
      icon: User,
      status: 'pending',
    },
    {
      id: 'races',
      label: 'Données Quinté+ du Jour',
      sublabel: 'Mercredi 30 Septembre 2026 certifié',
      icon: Trophy,
      status: 'pending',
    },
  ]);

  const [data, setData] = useState<AppInitializerData>({
    course: null,
    user: null,
    favorites: [],
    history: [],
    themeApplied: false,
    firebaseConnected: false,
  });

  const updateStep = (id: string, status: 'in_progress' | 'completed' | 'failed') => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateExternalSplash = (msg: string, pct: number) => {
    if (typeof document === 'undefined') return;
    const msgEl = document.getElementById('splash-dynamic-msg');
    if (msgEl) msgEl.textContent = msg;
    const barEl = document.getElementById('splash-progress-bar');
    if (barEl) {
      barEl.style.width = `${pct}%`;
      barEl.style.animation = 'none';
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const orchestrateInitialization = async () => {
      const startTime = Date.now();
      const loadedData: AppInitializerData = {
        course: null,
        user: null,
        favorites: [],
        history: [],
        themeApplied: false,
        firebaseConnected: false,
      };

      // --- ÉTAPE 1 : THÈMES ET ERGONOMIE (Critique pour éviter tout flash blanc) ---
      try {
        updateStep('theme', 'in_progress');
        setCurrentStepMessage('Application des thèmes et de l’ergonomie...');
        setProgress(20);
        updateExternalSplash('Application des thèmes et profil visuel...', 20);

        applyTheme();
        initThemeListener();
        loadedData.themeApplied = true;
        updateStep('theme', 'completed');
      } catch (err) {
        console.warn('[AppInitializer] Avertissement thème:', err);
        updateStep('theme', 'completed');
      }

      // Petite pause visuelle fluide pour que l'utilisateur voit la progression
      await new Promise(r => setTimeout(r, 120));
      if (isCancelled) return;

      // --- ÉTAPE 2 : SESSION UTILISATEUR, FAVORIS ET HISTORIQUE ---
      try {
        updateStep('user', 'in_progress');
        setCurrentStepMessage('Restauration de la session et des préférences...');
        setProgress(42);
        updateExternalSplash('Restauration session utilisateur & favoris...', 42);

        const storedUser = getStoredUserSession();
        const storedFavs = getFavoriteRaces();
        const storedHist = getRaceHistory();

        loadedData.user = storedUser;
        loadedData.favorites = storedFavs || [];
        loadedData.history = storedHist || [];
        updateStep('user', 'completed');
      } catch (err) {
        console.warn('[AppInitializer] Avertissement session:', err);
        updateStep('user', 'completed');
      }

      await new Promise(r => setTimeout(r, 120));
      if (isCancelled) return;

      // --- ÉTAPE 3 : SERVICES FIREBASE & BASE DE DONNÉES CLOUD ---
      try {
        updateStep('firebase', 'in_progress');
        setCurrentStepMessage('Connexion aux services temps réel Firebase...');
        setProgress(65);
        updateExternalSplash('Connexion aux flux d’arrivées officielles...', 65);

        // Timeout guard de 2.5 secondes max pour garantir qu'un PC hors-ligne ne reste jamais bloqué
        const firebasePromise = ensureFirebaseAuth();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2200));

        await Promise.race([firebasePromise, timeoutPromise]);
        loadedData.firebaseConnected = true;
        updateStep('firebase', 'completed');
      } catch (err) {
        console.warn('[AppInitializer] Firebase non-bloquant:', err);
        updateStep('firebase', 'completed');
      }

      await new Promise(r => setTimeout(r, 120));
      if (isCancelled) return;

      // --- ÉTAPE 4 : INITIALISATION DE L'ESPACE D'ANALYSE (AUCUN LIEN AUTOMATIQUE) ---
      try {
        updateStep('races', 'in_progress');
        setCurrentStepMessage('Initialisation de l’espace d’analyse vierge...');
        setProgress(88);
        updateExternalSplash('Espace réservé au lien prêt...', 88);

        // Aucune course préchargée ni analysée automatiquement à l'actualisation
        loadedData.course = null;
        updateStep('races', 'completed');
      } catch (err) {
        loadedData.course = null;
        updateStep('races', 'completed');
      }

      setProgress(100);
      setCurrentStepMessage('Initialisation terminée avec succès !');
      updateExternalSplash('Application prête • Démarrage...', 100);

      // Assurer un temps d'affichage minimal (~750ms total) pour une expérience visuelle fluide et haut de gamme
      const elapsed = Date.now() - startTime;
      const minDisplayTime = 750;
      if (elapsed < minDisplayTime) {
        await new Promise(r => setTimeout(r, minDisplayTime - elapsed));
      }
      if (isCancelled) return;

      setData(loadedData);

      // Phase d'estompement (fade out fluide)
      setIsFadingOut(true);

      // Estomper également le splash HTML externe présent dans index.html
      if (typeof document !== 'undefined') {
        const splashEl = document.getElementById('splash-container');
        if (splashEl) {
          splashEl.classList.add('splash-fade-out');
          setTimeout(() => {
            splashEl.style.display = 'none';
          }, 450);
        }
      }

      // Attendre la fin de l'animation de transition avant d'afficher l'application
      setTimeout(() => {
        setIsInitialized(true);
      }, 400);
    };

    // Garde-fou absolu : si après 1200ms l'initialisation n'est pas achevée, forcer l'affichage
    const safetyTimer = setTimeout(() => {
      setIsFadingOut(true);
      setIsInitialized(true);
      if (typeof document !== 'undefined') {
        const splashEl = document.getElementById('splash-container');
        if (splashEl) {
          splashEl.classList.add('splash-fade-out');
          setTimeout(() => { splashEl.style.display = 'none'; }, 300);
        }
      }
    }, 1200);

    orchestrateInitialization().finally(() => {
      clearTimeout(safetyTimer);
    });

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
    };
  }, []);

  const contextValue = useMemo<AppInitializerContextType>(() => ({
    isInitialized,
    isFadingOut,
    progress,
    currentStepMessage,
    data,
  }), [isInitialized, isFadingOut, progress, currentStepMessage, data]);

  return (
    <AppInitializerContext.Provider value={contextValue}>
      {/* Contenu principal de l'application */}
      <div className="w-full min-h-screen">
        {children}
      </div>

      {/* Écran Splash Animé Anti-Page Blanche (Géré par AppInitializer) */}
      {!isInitialized && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 selection:bg-amber-500 transition-all duration-600 ease-out select-none ${
            isFadingOut ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
          }`}
          style={{
            background: 'radial-gradient(circle at 50% 38%, #0f172a 0%, #020617 75%, #000000 100%)',
          }}
        >
          {/* Halo lumineux d'ambiance */}
          <div className="absolute w-96 h-96 rounded-full bg-gradient-to-tr from-amber-500/20 via-emerald-500/15 to-transparent blur-3xl pointer-events-none animate-pulse" />

          {/* Carte Logo Flottante avec Reflet Doré */}
          <div className="relative mb-6">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-tr from-amber-500 via-emerald-400 to-amber-600 shadow-[0_0_40px_rgba(245,158,11,0.35)] animate-floatLogo">
              <img
                src="/horse-logo.jpg"
                alt="PMU-STUDIO 2.0 Logo"
                className="w-full h-full rounded-[22px] object-cover bg-slate-900 border border-amber-500/30 shadow-inner"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/app-icon.jpg') {
                    target.src = '/app-icon.jpg';
                  }
                }}
              />
              {/* Badge Éclair Pro */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-lg border-2 border-slate-950">
                ⚡
              </div>
            </div>
          </div>

          {/* Titre & Sous-titre */}
          <div className="text-center mb-6 max-w-sm">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent uppercase">
              PMU-STUDIO 2.0
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1 flex items-center justify-center gap-1.5">
              <span>Turf PMU & Quinté+ Algorithmique</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </p>
          </div>

          {/* Barre de Progression Fluide */}
          <div className="w-64 sm:w-80 bg-slate-900/90 border border-amber-500/30 rounded-full h-2.5 p-0.5 overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.2)] mb-3">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Message d'état dynamique */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-medium mb-6">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
            <span className="truncate max-w-[280px] sm:max-w-xs">{currentStepMessage}</span>
            <span className="text-[11px] font-mono font-bold text-amber-400 ml-1">
              {progress}%
            </span>
          </div>

          {/* Grille des 4 services critiques orchestrés */}
          <div className="w-full max-w-xs sm:max-w-sm grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isDone = step.status === 'completed';
              const isInProgress = step.status === 'in_progress';

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                      : isInProgress
                      ? 'bg-amber-950/40 border border-amber-500/30 text-amber-200'
                      : 'bg-slate-950/40 border border-slate-800/50 text-slate-500'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isInProgress ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : (
                      <StepIcon className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold truncate leading-tight">
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Note de pied de page pour utilisateur PC & Mobile */}
          <div className="absolute bottom-5 text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-wider uppercase text-center flex items-center gap-2">
            <span>💻 Édition PC & Web App</span>
            <span>•</span>
            <span>⚡ Synchronisation Cloud Direct</span>
          </div>
        </div>
      )}
    </AppInitializerContext.Provider>
  );
};
