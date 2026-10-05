import React, { useState, useEffect } from 'react';
import { Timer, AlarmClock, CheckCircle2, Clock, ShieldAlert, Zap, Play } from 'lucide-react';
import { getRaceParisTargetTime, getDualDepartureTimes } from '../utils/raceCountdown';

interface CountdownTimerProps {
  date: string; // "DD/MM/YYYY" ou "Aujourd'hui"
  heure: string; // "HH:mm" ou "18h15"
  compact?: boolean;
  showDepartureBadge?: boolean;
  isFinished?: boolean;
  statutCourse?: string;
  isProvisional?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  date,
  heure,
  compact = false,
  showDepartureBadge = true,
  isFinished = false,
  statutCourse,
  isProvisional = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalMinutes: number;
    pastMinutes: number;
    isPast: boolean;
  } | null>(null);

  const [timezoneMode, setTimezoneMode] = useState<'france' | 'ivory_coast'>('ivory_coast');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('hippo_timezone_mode');
      if (stored === 'france' || stored === 'ivory_coast') {
        setTimezoneMode(stored);
      }
    } catch {}
  }, []);

  const { franceTime, ciTime } = getDualDepartureTimes(heure);
  const displayDepartureHour = timezoneMode === 'ivory_coast' ? ciTime : franceTime;

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const now = new Date();
        const targetTime = getRaceParisTargetTime(date, heure);
        const difference = targetTime.getTime() - now.getTime();

        if (difference <= 0) {
          const pastMins = Math.floor(Math.abs(difference) / (1000 * 60));
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalMinutes: 0, pastMinutes: pastMins, isPast: true });
          return;
        }

        const h = Math.floor(difference / (1000 * 60 * 60));
        const m = Math.floor((difference / (1000 * 60)) % 60);
        const s = Math.floor((difference / 1000) % 60);
        const totalMins = Math.floor(difference / (1000 * 60));

        setTimeLeft({ hours: h, minutes: m, seconds: s, totalMinutes: totalMins, pastMinutes: 0, isPast: false });
      } catch (e) {
        console.error("Countdown calculation error:", e);
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [date, heure]);

  if (!timeLeft) return null;

  const isExplicitProvisional = isProvisional || statutCourse?.toLowerCase()?.includes('provisoire');
  const isExplicitOfficial = !isExplicitProvisional && (statutCourse?.toLowerCase()?.includes('officiel'));
  const isExplicitFinished = !isExplicitProvisional && !isExplicitOfficial && (statutCourse?.toLowerCase()?.includes('termin'));

  // 1. Statut quand l'arrivée est provisoire (commissaires / homologation en cours)
  if (isExplicitProvisional) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${compact ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} font-black text-amber-300 bg-amber-950/90 rounded-xl border border-amber-500/60 shadow-sm animate-pulse`}>
        <ShieldAlert className={`${compact ? 'w-3 h-3 text-amber-400' : 'w-3.5 h-3.5 text-amber-400'}`} />
        <span>Arrivée provisoire</span>
      </div>
    );
  }

  // 2. Statut quand l'arrivée est officielle
  if (isExplicitOfficial) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${compact ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} font-black text-emerald-300 bg-emerald-950/80 rounded-xl border border-emerald-500/50 shadow-sm`}>
        <CheckCircle2 className={`${compact ? 'w-3 h-3 text-emerald-400' : 'w-3.5 h-3.5 text-emerald-400'}`} />
        <span>Arrivée officielle</span>
      </div>
    );
  }

  // 3. Statut quand la course est déclarée terminée sans arrivée officielle renseignée
  if (isExplicitFinished) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${compact ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} font-black text-slate-400 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm`}>
        <CheckCircle2 className={`${compact ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-400'}`} />
        <span>Course terminée</span>
      </div>
    );
  }

  // 4. Statut quand l'heure de départ est dépassée
  if (timeLeft.isPast) {
    // Si la course est partie depuis moins de 25 minutes : afficher "Course en cours"
    if (timeLeft.pastMinutes < 25) {
      return (
        <div className={`inline-flex items-center gap-1.5 ${compact ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} font-black text-rose-200 bg-rose-950/80 rounded-xl border border-rose-500/60 animate-pulse shadow-md shadow-rose-950/40`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <Clock className={`${compact ? 'w-3 h-3 text-rose-300' : 'w-3.5 h-3.5 text-rose-300'}`} />
          <span>Course en cours (Départ : {timezoneMode === 'ivory_coast' ? `${ciTime} CI` : `${franceTime} FR`})</span>
        </div>
      );
    }

    // 5. Statut Course terminée pour épreuves passées (> 25 minutes)
    return (
      <div className={`inline-flex items-center gap-1.5 ${compact ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} font-black text-slate-400 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm`}>
        <CheckCircle2 className={`${compact ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-400'}`} />
        <span>Course terminée</span>
      </div>
    );
  }

  // 5. Statut course à venir : "Départ pour [Heure] min" et Compte à Rebours en Direct
  const isImminent10Min = timeLeft.totalMinutes <= 10;
  const isUrgent5Min = timeLeft.totalMinutes <= 5;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {/* Badge Heure Officielle de Départ clair et bizonne */}
      {showDepartureBadge && (
        <div className={`inline-flex items-center gap-1.5 ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} font-extrabold rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0 shadow-xs`}>
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Départ pour{' '}
            <strong className="text-white font-mono">
              {timezoneMode === 'ivory_coast' ? `${ciTime} min (CI/GMT)` : `${franceTime} min (FR)`}
            </strong>
            <span className="text-[10px] text-slate-400 ml-1">
              [{timezoneMode === 'ivory_coast' ? `${franceTime} FR` : `${ciTime} CI`}]
            </span>
          </span>
        </div>
      )}

      {/* Compte à rebours activé avec chiffres en direct */}
      <div
        className={`inline-flex items-center gap-1.5 ${compact ? 'px-2.5 py-0.5' : 'px-3 py-1'} rounded-xl border transition-all shrink-0 ${
          isUrgent5Min
            ? 'bg-rose-500/20 border-rose-500/80 text-rose-300 animate-pulse font-black shadow-lg shadow-rose-950/50 ring-2 ring-rose-500/50'
            : isImminent10Min
            ? 'bg-gradient-to-r from-amber-500/25 via-amber-600/30 to-amber-500/25 border-amber-400 text-amber-200 animate-pulse font-black shadow-md ring-1 ring-amber-400/60'
            : 'bg-slate-900/90 border-slate-800 text-slate-300 shadow-xs'
        }`}
      >
        {isUrgent5Min ? (
          <AlarmClock className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 text-rose-400 animate-spin`} />
        ) : isImminent10Min ? (
          <Timer className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 text-amber-300 animate-pulse`} />
        ) : (
          <Timer className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 text-slate-400`} />
        )}

        <div className="flex items-center gap-1 font-mono font-black">
          {isImminent10Min && (
            <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-tight mr-0.5">
              DÉPART IMMINENT :
            </span>
          )}

          {timeLeft.hours > 0 && (
            <>
              <span className={compact ? 'text-xs' : 'text-sm'}>{String(timeLeft.hours).padStart(2, '0')}h</span>
              <span className="opacity-50">:</span>
            </>
          )}
          <span className={compact ? 'text-xs' : 'text-sm'}>{String(timeLeft.minutes).padStart(2, '0')}m</span>
          <span className="opacity-50">:</span>
          <span className={compact ? 'text-[11px]' : 'text-xs'}>{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </div>

        {!compact && isImminent10Min && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90 ml-1">
            DÉPART IMMINENT
          </span>
        )}
      </div>
    </div>
  );
};
