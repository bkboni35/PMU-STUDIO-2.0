import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Brain,
  Layers,
  Timer,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface AnalysisProgressBarProps {
  isLoading: boolean;
  onFinished?: () => void;
  targetDurationMs?: number; // default ~20-25s (< 30s)
}

interface StepInfo {
  pct: number;
  label: string;
  subLabel: string;
  badge: string;
  model: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ANALYSIS_STEPS: StepInfo[] = [
  {
    pct: 20,
    label: 'ÉTAPE 1 — Extraction & Structuration',
    subLabel: 'Numéros, noms, âges, sexes, distances, jockeys, entraîneurs, musiques, gains, fers, cotes',
    badge: 'Faible Latence',
    model: 'Gemini Flash-Lite',
    icon: Zap,
  },
  {
    pct: 42,
    label: 'ÉTAPE 2 — Analyse Individuelle des Partants',
    subLabel: 'Forme récente, régularité, aptitude distance/terrain/hippodrome, duo driver, ratio risque/cote',
    badge: 'Analyse Cheval/Cheval',
    model: 'Gemini Flash',
    icon: Activity,
  },
  {
    pct: 66,
    label: 'ÉTAPE 3 — Analyse Approfondie & Interactions',
    subLabel: 'Interactions complexes, gros volumes, confrontations directes, tactique de train de course',
    badge: 'Raisonnement Complexe',
    model: 'Gemini 3.1 Pro',
    icon: Brain,
  },
  {
    pct: 85,
    label: 'ÉTAPE 4 — Contre-Analyse & Garde-Fou',
    subLabel: 'Traque : incohérences, chevaux oubliés, surévaluation favori, outsiders cachés, anti-contamination',
    badge: 'Contre-Auditeur',
    model: 'Modèle Flash',
    icon: ShieldCheck,
  },
  {
    pct: 100,
    label: 'ÉTAPE 5 — Décision Algorithmique Finale',
    subLabel: 'Données validées : Décision Certifiée, Bases incontournables & Sélection 8 chevaux du Quinté+ (Temps garanti < 120s, moyenne 30-60s)',
    badge: 'Décision Certifiée',
    model: 'Gemini 3.1 Pro / Superviseur',
    icon: Sparkles,
  },
];

export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({
  isLoading,
  onFinished,
  targetDurationMs = 18000,
}) => {
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let timerInterval: NodeJS.Timeout | null = null;
    const startTime = Date.now();

    if (isLoading) {
      setProgress(5);
      setElapsedSeconds(0);
      setCurrentStepIndex(0);

      // Chronomètre seconde par seconde
      timerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setElapsedSeconds(Number(elapsed.toFixed(1)));
      }, 100);

      // Progression fluide
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / targetDurationMs, 0.95);
        // Formule d'accélération naturelle (easing out)
        const currentPct = Math.round(5 + (1 - Math.pow(1 - ratio, 1.8)) * 90);
        setProgress(currentPct);

        // Déterminer l'étape active
        let stepIdx = 0;
        for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
          if (currentPct >= ANALYSIS_STEPS[i].pct) {
            stepIdx = i;
          }
        }
        setCurrentStepIndex(stepIdx);
      }, 150);
    } else {
      if (progress > 0 && progress < 100) {
        setProgress(100);
        setCurrentStepIndex(ANALYSIS_STEPS.length - 1);
        if (onFinished) {
          setTimeout(onFinished, 600);
        }
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isLoading, targetDurationMs, onFinished]);

  if (!isLoading && progress === 0) {
    return null;
  }

  const activeStep = ANALYSIS_STEPS[currentStepIndex] || ANALYSIS_STEPS[0];
  const Icon = activeStep.icon;

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl border-2 border-amber-500/50 p-5 sm:p-6 shadow-2xl space-y-4 my-3 animate-fadeIn">
      {/* Top Header : Status, Percentage & Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
              <Icon className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Traitement de la course en cours
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Décision Certifiée</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center gap-1">
                <Timer className="w-3 h-3 text-amber-400" />
                <span>Traitement garanti &lt; 60s (moyenne 15-20s)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black flex items-center gap-1">
                <Brain className="w-3 h-3 text-blue-400" />
                <span>temps de traitement des courses Traitement garanti &lt; 120s (moyenne 30-60s)</span>
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              {activeStep.label}
            </h4>
          </div>
        </div>

        {/* Right side : Big Percentage & Stopwatch */}
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono justify-end">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>{elapsedSeconds.toFixed(1)}s / max 60s</span>
            </div>
            <span className="text-xs text-slate-400 block font-medium truncate max-w-[160px]">
              {activeStep.model}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-inner">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* The Animated Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3.5 bg-slate-950/90 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-300 ease-out shadow-lg relative"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="truncate">{activeStep.subLabel}</span>
          <span className="font-bold text-slate-300 ml-2 shrink-0">
            Étape {currentStepIndex + 1} / {ANALYSIS_STEPS.length}
          </span>
        </div>
      </div>

      {/* Mini Step Badges Row */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {ANALYSIS_STEPS.map((step, idx) => {
          const isDone = progress >= step.pct;
          const isCurrent = currentStepIndex === idx;

          return (
            <div
              key={step.pct}
              className={`p-2 rounded-xl text-center border transition-all ${
                isCurrent
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : isDone
                  ? 'bg-slate-950/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 flex items-center justify-center">
                    {idx + 1}
                  </span>
                )}
                <span className="text-[10px] font-black">{step.pct}%</span>
              </div>
              <span className="text-[9px] font-semibold block truncate">
                {step.badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
