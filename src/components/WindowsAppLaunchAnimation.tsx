import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Play,
  CheckCircle2,
  Sparkles,
  Zap,
  Download,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Laptop,
  Trophy,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { downloadWindowsBatchInstaller, downloadWindowsDesktopShortcut } from '../utils/installGenerators';
import { getUserAppUrl } from '../utils/appUrls';

interface WindowsAppLaunchAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchSuccess?: () => void;
}

export const WindowsAppLaunchAnimation: React.FC<WindowsAppLaunchAnimationProps> = ({
  isOpen,
  onClose,
  onLaunchSuccess,
}) => {
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState("Initialisation du système Windows 11...");
  const [isReady, setIsReady] = useState(false);
  const [activeHorseIndex, setActiveHorseIndex] = useState(0);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const userUrl = getUserAppUrl();

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsReady(false);
      return;
    }

    // Cycling horse animation
    const horseTimer = setInterval(() => {
      setActiveHorseIndex((prev) => (prev + 1) % 4);
    }, 400);

    // Progressive loading sequence
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 8) + 4;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setStageText("✅ Application Windows 11 prête ! Moteur V38 chargé.");
        setIsReady(true);
        clearInterval(interval);
      } else {
        setProgress(currentProgress);
        if (currentProgress < 25) {
          setStageText("💻 Vérification des pilotes Windows x64 & environnement...");
        } else if (currentProgress < 55) {
          setStageText("🏇 Chargement des 4 disciplines : Plat • Attelé • Monté • Obstacle...");
        } else if (currentProgress < 85) {
          setStageText("📊 Connexion aux flux en direct LONACI / PMU & cotes...");
        } else {
          setStageText("⚡ Finalisation de l'interface Windows autonome...");
        }
      }
    }, 120);

    return () => {
      clearInterval(interval);
      clearInterval(horseTimer);
    };
  }, [isOpen]);

  const handleLaunchAppNow = () => {
    if (onLaunchSuccess) {
      onLaunchSuccess();
    }
    onClose();
  };

  const handleDownloadBatch = () => {
    downloadWindowsBatchInstaller();
    setDownloadNotice("Installeur Windows (.BAT) téléchargé ! Double-cliquez pour créer le raccourci Bureau.");
    setTimeout(() => setDownloadNotice(null), 5000);
  };

  const handleDownloadUrlShortcut = () => {
    downloadWindowsDesktopShortcut();
    setDownloadNotice("Raccourci Bureau (.URL) téléchargé avec succès !");
    setTimeout(() => setDownloadNotice(null), 5000);
  };

  if (!isOpen) return null;

  const disciplines = [
    { name: 'PLAT (Galop)', icon: '🏇', color: 'from-amber-500 to-amber-600', text: 'text-amber-400' },
    { name: 'ATTELÉ (Sulky)', icon: '🛷', color: 'from-blue-500 to-blue-600', text: 'text-blue-400' },
    { name: 'MONTÉ (Selle)', icon: '🏇', color: 'from-emerald-500 to-emerald-600', text: 'text-emerald-400' },
    { name: 'OBSTACLE (Haies)', icon: '🐎', color: 'from-pink-500 to-pink-600', text: 'text-pink-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-2 sm:px-2 sm:pb-2 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      {/* Windows 11 Desktop Application Window Frame */}
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-blue-500/60 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col transform transition-all duration-300 scale-100 ring-4 ring-blue-500/20 mt-0 sm:mt-1">
        
        {/* Windows Titlebar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-md">
              <Monitor className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-extrabold text-slate-200 tracking-tight flex items-center gap-2">
              <span>HippoAnalyse Pro V38</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Windows 11 x64
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-400 rounded-full" />
              <div className="w-2.5 h-2.5 border border-slate-400 rounded-xs" />
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Window Content Body */}
        <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Branding */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-xl shadow-amber-500/30 text-3xl shrink-0 animate-bounce">
              🏇
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                  Windows Desktop Application
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                  Moteur V38 Certifié
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Lancement de <span className="text-amber-400">HIPPOANALYSE</span> sur Windows
              </h2>
              <p className="text-xs text-slate-300">
                Lancement dynamique de l'application autonome pour PC Windows 10 & 11
              </p>
            </div>
          </div>

          {/* Animated 4 Disciplines Live Running Strip */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Simulation Moteur 4 Disciplines :</span>
              </span>
              <span className="text-emerald-400 font-mono font-black">{progress}%</span>
            </div>

            {/* Disciplines Runner Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {disciplines.map((d, idx) => {
                const isActive = activeHorseIndex === idx;
                return (
                  <div
                    key={d.name}
                    className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400 shadow-md scale-105 ring-1 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 opacity-70'
                    }`}
                  >
                    <span className="text-xl">{d.icon}</span>
                    <div className="min-w-0">
                      <div className={`text-[11px] font-black truncate ${d.text}`}>
                        {d.name}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {isActive ? '▶ En course' : 'Prêt'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar Container */}
            <div className="relative w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-200 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Stage Description */}
            <div className="text-center font-mono text-xs text-amber-300 font-semibold min-h-[20px]">
              {stageText}
            </div>
          </div>

          {/* Feedback notice if batch / url shortcut downloaded */}
          {downloadNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadNotice}</span>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="space-y-3 pt-2">
            {/* Primary Launch Button */}
            <button
              type="button"
              onClick={handleLaunchAppNow}
              className={`w-full py-4 px-6 rounded-2xl text-slate-950 font-black text-base flex items-center justify-center gap-2.5 shadow-2xl transition-all duration-300 transform ${
                isReady
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 scale-102 shadow-amber-500/30 cursor-pointer animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 cursor-pointer'
              }`}
            >
              <Play className="w-6 h-6 fill-slate-950 text-slate-950" />
              <span>Ouvrir l'Application Windows HippoAnalyse</span>
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </button>

            {/* Secondary Windows Installation Downloads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadBatch}
                className="py-2.5 px-4 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 text-xs font-black transition-all flex items-center justify-center gap-2"
                title="Télécharger l'installeur automatique .BAT pour créer le raccourci sur votre Bureau Windows"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Installer le Raccourci Bureau (.BAT)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadUrlShortcut}
                className="py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-black transition-all flex items-center justify-center gap-2"
                title="Télécharger le fichier raccourci direct (.URL) pour Windows"
              >
                <Laptop className="w-4 h-4 text-amber-400" />
                <span>Raccourci Direct Bureau (.URL)</span>
              </button>
            </div>
          </div>

          {/* Security & System Info Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800 gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Certifié sans virus • Windows 10/11 Compatible</span>
            </div>
            <span className="text-slate-400 font-semibold">
              Concepteur : <strong className="text-white">Ghislain BONI</strong> / +(225) 01 01 24 61 06
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
