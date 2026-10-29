import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ShieldCheck, AlertTriangle, X, Zap, BellRing, Sparkles } from 'lucide-react';

export interface HomologationAlertData {
  courseTitle: string;
  reunionCourse: string;
  arriveeProvisoire?: string;
  arriveeOfficielle: string;
  timestamp: string;
  hippodrome?: string;
}

interface HomologationArrivalBannerProps {
  alertData: HomologationAlertData;
  onClose: () => void;
  onViewDetails?: () => void;
}

export const HomologationArrivalBanner: React.FC<HomologationArrivalBannerProps> = ({
  alertData,
  onClose,
  onViewDetails,
}) => {
  const [isBlinking, setIsBlinking] = useState(true);

  // Toggle blinking state every 700ms for extra visual urgency
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking((prev) => !prev);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden my-3 rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950/90 to-slate-950 border-2 border-emerald-400/90 shadow-[0_0_30px_rgba(16,185,129,0.35)] p-4 text-white transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      {/* Background glow animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 animate-pulse pointer-events-none" />

      {/* Top flashing badge strip */}
      <div className="flex items-center justify-between gap-2 border-b border-emerald-500/30 pb-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Flashing status indicator dot */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase transition-colors duration-300 flex items-center gap-1.5 shadow-md ${
              isBlinking
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/50'
                : 'bg-emerald-500 text-slate-950 shadow-emerald-500/50'
            }`}
          >
            <BellRing className="w-3 h-3 animate-bounce" />
            POLLING ARRIVÉE : STATUT PASSÉ DE PROVISOIRE À OFFICIELLE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs font-mono text-emerald-300/80 bg-slate-900/80 px-2 py-0.5 rounded-md border border-emerald-500/20">
            ⏰ {alertData.timestamp}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/60 active:scale-95 cursor-pointer"
            title="Fermer l'alerte"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main banner content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              HOMOLOGATION DES RAPPORTS VALIDÉE
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wide">
              {alertData.reunionCourse} {alertData.hippodrome ? `• ${alertData.hippodrome}` : ''} — {alertData.courseTitle}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            🚨 <span className="font-bold text-amber-300">Alerte Turfiste :</span> Le cycle de polling 15s vient de confirmer la validation définitive de l'arrivée par la société de courses ! Les rapports officiels et les gains sont désormais certifiés.
          </p>

          {/* Transition details pill */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {alertData.arriveeProvisoire && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Statut précédent : <strong className="text-amber-300">PROVISOIRE</strong> ({alertData.arriveeProvisoire})</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-emerald-200 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/50 shadow-inner">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Arrivée Officielle Homologuée : <strong className="text-amber-300 font-mono text-sm tracking-wider">{alertData.arriveeOfficielle}</strong></span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              VOIR LES RAPPORTS
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all border border-slate-700 active:scale-95 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
