import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Scale, Sparkles } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { checkOfficialArrivalAuditStatus } from '../utils/raceCountdown';

interface ArrivalAuditProgressRingBadgeProps {
  course: CourseHippique;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onTriggerAudit?: () => void;
  isAuditing?: boolean;
}

export const ArrivalAuditProgressRingBadge: React.FC<ArrivalAuditProgressRingBadgeProps> = ({
  course,
  size = 'md',
  showLabel = true,
  onTriggerAudit,
  isAuditing = false,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  // Tick 1s pour actualiser la jauge circulaire et le compte à rebours
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const auditReferenceTime = course.arrivalAuditTimestamp || course.officialArrivalAt;
  const isAuditCompleted = Boolean(course.arrivalAuditCompleted);

  const auditStatus = checkOfficialArrivalAuditStatus(
    auditReferenceTime,
    isAuditCompleted
  );

  const remainingSeconds = auditStatus.remainingSeconds;
  const totalSeconds = auditStatus.totalDelaySeconds || 300;
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds);
  const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / totalSeconds));
  const progressPercent = Math.round(progressRatio * 100);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedMMSS = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Détermination de l'état d'alerte et de la couleur :
  // 1. VERT (> 180s) : Début du délai de 5 minutes (contrôle serein)
  // 2. ORANGE (60s à 180s) : Milieu du délai (attention requise)
  // 3. ROUGE (< 60s) : Fin imminente du délai des 5 minutes (alerte critique)
  // 4. VERT ÉMERAUDE : Audit complété et homologué (300s écoulées)
  // 5. ROUGE ÉCARLATE : Modification constatée
  type AlertLevel = 'green' | 'orange' | 'red' | 'completed' | 'modification';

  let alertLevel: AlertLevel = 'green';
  if (course.arrivalAuditModificationDetected) {
    alertLevel = 'modification';
  } else if (isAuditCompleted) {
    alertLevel = 'completed';
  } else if (remainingSeconds <= 60) {
    alertLevel = 'red';
  } else if (remainingSeconds <= 180) {
    alertLevel = 'orange';
  } else {
    alertLevel = 'green';
  }

  // SVG Ring Dimension configs
  const ringConfigs = {
    sm: { dimension: 40, radius: 15, stroke: 3.5, fontSize: 'text-[9px]' },
    md: { dimension: 56, radius: 22, stroke: 4.5, fontSize: 'text-[11px]' },
    lg: { dimension: 72, radius: 28, stroke: 5.5, fontSize: 'text-xs' },
  };

  const { dimension, radius, stroke, fontSize } = ringConfigs[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Visual themes with precise Green -> Orange -> Red transition
  const themeStyles = {
    green: {
      ringColor: '#10b981', // emerald-500
      ringBgColor: '#064e3b', // emerald-950
      badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-emerald-950/40',
      textColor: 'text-emerald-400',
      badgeTag: 'bg-emerald-500 text-slate-950',
      label: 'Délai 5 min (Conforme)',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      pulse: '',
    },
    orange: {
      ringColor: '#f97316', // orange-500
      ringBgColor: '#431407', // orange-950
      badgeBg: 'bg-orange-950/80 border-orange-500/60 text-orange-200 shadow-orange-900/40',
      textColor: 'text-orange-400',
      badgeTag: 'bg-orange-500 text-slate-950',
      label: 'Délai Moyen (< 3 min)',
      glow: 'shadow-[0_0_14px_rgba(249,115,22,0.35)]',
      pulse: '',
    },
    red: {
      ringColor: '#ef4444', // red-500
      ringBgColor: '#450a0a', // red-950
      badgeBg: 'bg-red-950/90 border-red-500/80 text-red-200 shadow-red-900/50',
      textColor: 'text-red-400',
      badgeTag: 'bg-red-600 text-white',
      label: 'Échéance Imminente (< 60s)',
      glow: 'shadow-[0_0_18px_rgba(239,68,68,0.5)]',
      pulse: 'animate-pulse',
    },
    completed: {
      ringColor: '#10b981', // emerald-500
      ringBgColor: '#064e3b', // emerald-950
      badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-emerald-950/40',
      textColor: 'text-emerald-400',
      badgeTag: 'bg-emerald-500 text-slate-950',
      label: 'Audit Homologué',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
      pulse: '',
    },
    modification: {
      ringColor: '#e11d48', // rose-600
      ringBgColor: '#4c0519', // rose-950
      badgeBg: 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-900/60',
      textColor: 'text-rose-300',
      badgeTag: 'bg-rose-600 text-white',
      label: 'Arrivée Rectifiée',
      glow: 'shadow-[0_0_20px_rgba(225,29,72,0.5)]',
      pulse: 'animate-pulse',
    },
  };

  const currentTheme = themeStyles[alertLevel];

  // Si l'audit est complété ou rectifié
  if (alertLevel === 'completed') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border ${currentTheme.badgeBg} ${currentTheme.glow} transition-all duration-300`}
        title="Contrôle des 5 minutes des commissaires complété et validé définitivement"
      >
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={dimension} height={dimension} className="transform -rotate-90">
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              stroke={currentTheme.ringBgColor}
              strokeWidth={stroke}
              fill="transparent"
            />
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              stroke={currentTheme.ringColor}
              strokeWidth={stroke}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {showLabel && (
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${currentTheme.badgeTag}`}>
                Audit 5 min
              </span>
              <span className="text-[11px] font-bold text-emerald-300">
                Certifié Conforme
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              300s écoulées · Homologation finale
            </span>
          </div>
        )}
      </div>
    );
  }

  if (alertLevel === 'modification') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border ${currentTheme.badgeBg} ${currentTheme.glow} ${currentTheme.pulse} transition-all duration-300`}
        title="Modification d'arrivée constatée suite à réclamation/disqualification"
      >
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
        </div>
        {showLabel && (
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${currentTheme.badgeTag}`}>
                Commissaires
              </span>
              <span className="text-[11px] font-black text-rose-200">
                Ordre Rectifié !
              </span>
            </div>
            <span className="text-[10px] text-rose-300 font-mono">
              Enquête / Allures modifiées
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-2xl border ${currentTheme.badgeBg} ${currentTheme.glow} ${currentTheme.pulse} transition-all duration-300 group`}
      title={`Contrôle réglementaire des 5 minutes : ${remainingSeconds}s restantes avant homologation définitive`}
    >
      {/* SVG Circular Progress Ring */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width={dimension} height={dimension} className="transform -rotate-90 drop-shadow-sm">
          {/* Background Track Circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={currentTheme.ringBgColor}
            strokeWidth={stroke}
            fill="transparent"
          />
          {/* Animated Dynamic Progress Ring */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={currentTheme.ringColor}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Center Countdown or Icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {size === 'sm' ? (
            <span className={`font-mono font-black ${fontSize} ${currentTheme.textColor}`}>
              {remainingSeconds}s
            </span>
          ) : (
            <>
              <span className={`font-mono font-black ${fontSize} ${currentTheme.textColor} leading-none`}>
                {formattedMMSS}
              </span>
              <span className="text-[7px] text-slate-400 font-mono mt-0.5 leading-none">
                {remainingSeconds}s
              </span>
            </>
          )}
        </div>
      </div>

      {/* Label and detailed badge information */}
      {showLabel && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${currentTheme.badgeTag}`}>
              {alertLevel === 'red' ? '⚡ Alerte Fin' : alertLevel === 'orange' ? '⏳ 5 min' : 'Audit PMU'}
            </span>
            <span className={`text-[11px] font-black ${currentTheme.textColor} flex items-center gap-1`}>
              {alertLevel === 'red' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
              {alertLevel === 'orange' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
              {alertLevel === 'green' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              <span>{currentTheme.label}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
            <span>
              Restant : <strong className={currentTheme.textColor}>{remainingSeconds}s</strong> ({progressPercent}%)
            </span>
            {onTriggerAudit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerAudit();
                }}
                disabled={isAuditing}
                className="text-[9px] font-bold text-amber-300 hover:text-white underline ml-1 cursor-pointer"
              >
                {isAuditing ? 'Audit...' : 'Vérifier'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
