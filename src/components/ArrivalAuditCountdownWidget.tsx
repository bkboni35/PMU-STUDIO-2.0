import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Scale, Info } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { checkOfficialArrivalAuditStatus, POST_OFFICIAL_AUDIT_DELAY_MS } from '../utils/raceCountdown';
import { ArrivalAuditProgressRingBadge } from './ArrivalAuditProgressRingBadge';

interface ArrivalAuditCountdownWidgetProps {
  course: CourseHippique;
  onTriggerArrivalAudit?: () => void;
  isAuditingArrival?: boolean;
}

export const ArrivalAuditCountdownWidget: React.FC<ArrivalAuditCountdownWidgetProps> = ({
  course,
  onTriggerArrivalAudit,
  isAuditingArrival = false,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  // Horloge 1s pour actualiser le compte à rebours en temps réel de manière fluide
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Détermination de l'horodatage de référence (arrivalAuditTimestamp ou officialArrivalAt)
  const auditReferenceTime = course.arrivalAuditTimestamp || course.officialArrivalAt;
  const isAuditCompleted = Boolean(course.arrivalAuditCompleted);

  const auditStatus = checkOfficialArrivalAuditStatus(
    auditReferenceTime,
    isAuditCompleted
  );

  const remainingSeconds = auditStatus.remainingSeconds;
  const totalSeconds = auditStatus.totalDelaySeconds || 300;
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSeconds / totalSeconds) * 100)));

  // Formatage des minutes et secondes (ex: "04m 38s" / "278s")
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedMMSS = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const formattedMinutesSec = `${minutes}m ${String(seconds).padStart(2, '0')}s`;

  // Formatage de l'heure d'enregistrement et de l'heure d'échéance des 5 minutes
  const formatTimeStr = (ts: number | null) => {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const startTimeStr = formatTimeStr(auditStatus.officialTimestamp);
  const dueTimeStr = auditStatus.officialTimestamp
    ? formatTimeStr(auditStatus.officialTimestamp + POST_OFFICIAL_AUDIT_DELAY_MS)
    : null;

  // 1. Cas : Modification d'arrivée constatée après enquête des commissaires
  if (course.arrivalAuditModificationDetected) {
    return (
      <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-rose-900/80 to-slate-950 border-2 border-rose-500 shadow-xl space-y-3 animate-pulse">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-rose-500 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                  Audit Commissaires Acté
                </span>
                <span className="text-xs font-black text-rose-200">
                  Modification d'arrivée officielle détectée !
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-1">
                L'arrivée officielle a été rectifiée suite à réclamation/disqualification des commissaires.
              </p>
              {course.arrivalAuditPreviousArrival && (
                <p className="text-[11px] text-rose-300/90 mt-0.5 font-mono">
                  Ordre initial constaté : <strong>{course.arrivalAuditPreviousArrival}</strong> ➔ Nouvel ordre officiel appliqué : <strong>{course.arriveeOfficielle}</strong>
                </p>
              )}
            </div>
          </div>
          {course.arrivalAuditTimestamp && (
            <span className="text-[10px] font-mono text-rose-300 bg-rose-950/90 px-2.5 py-1 rounded-lg border border-rose-500/40">
              Contrôlé le {new Date(course.arrivalAuditTimestamp).toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. Cas : Contrôle des 5 minutes entièrement complété et certifié sans modification
  if (course.arrivalAuditCompleted) {
    return (
      <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-emerald-300">
                Contrôle 5 min post-arrivée validé par les commissaires
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                ✓ 300s écoulées · Homologation définitive
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Aucune réclamation ni modification détectée. Les rapports et l'ordre d'arrivée sont certifiés conformes.
            </p>
          </div>
        </div>

        {course.arrivalAuditTimestamp && (
          <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0">
            Audit certifié à {new Date(course.arrivalAuditTimestamp).toLocaleTimeString('fr-FR')}
          </span>
        )}
      </div>
    );
  }

  // 3. Cas : Compte à rebours actif de 5 minutes (300 secondes)
  return (
    <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl space-y-3.5 relative overflow-hidden">
      {/* Background glowing gradient */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header section with badge & title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                Contrôle Réglementaire PMU (5 min / 300s)
              </span>
              <span className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Contrôle de conformité des commissaires en cours</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Surveillance automatique des réclamations, enquêtes vidéo et rétrogradations d'allures post-arrivée.
            </p>
          </div>
        </div>

        {/* Progress Ring Badge & Digital Countdown Timer Display */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto flex-wrap">
          <ArrivalAuditProgressRingBadge
            course={course}
            size="md"
            showLabel={false}
            onTriggerAudit={onTriggerArrivalAudit}
            isAuditing={isAuditingArrival}
          />
          <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-amber-500/30 shadow-inner">
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                Échéance Contrôle
              </span>
              <span className="font-mono text-sm sm:text-base font-black text-amber-300 tracking-wider">
                {formattedMMSS}
              </span>
            </div>
            <div className="h-7 w-px bg-slate-800" />
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                Secondes
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-amber-400">
                {remainingSeconds}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (300s Countdown Visual Indicator) */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Progression du délai des 5 minutes :</span>
          </span>
          <span className="font-mono font-bold text-amber-300">
            {elapsedSeconds}s / {totalSeconds}s ({progressPercent}%)
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-950 rounded-full border border-slate-800 p-0.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-1000 ease-linear shadow-sm shadow-amber-500/30"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer Info & Manual Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            {startTimeStr && dueTimeStr ? (
              <>
                Arrivée constatée à <strong className="text-slate-200 font-mono">{startTimeStr}</strong> • Audit final programmé à <strong className="text-amber-300 font-mono">{dueTimeStr}</strong>
              </>
            ) : (
              <>
                Délai de sécurité 5 minutes (300s) déclenché dès l'affichage officiel de l'arrivée.
              </>
            )}
          </span>
        </div>

        {onTriggerArrivalAudit && (
          <button
            type="button"
            onClick={onTriggerArrivalAudit}
            disabled={isAuditingArrival}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
            title="Vérifier immédiatement auprès des commissaires sans attendre l'expiration des 5 minutes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditingArrival ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isAuditingArrival ? 'Audit en cours...' : 'Vérifier modifications'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
