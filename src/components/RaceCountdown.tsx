import React, { useState, useEffect } from 'react';
import { Clock, Flag, Play } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { isPastDepartureTime, isCourseFinished, getRaceParisTargetTime } from '../utils/raceCountdown';

export interface RaceCountdownProps {
  course: Partial<CourseHippique> | null | undefined;
  className?: string;
  compact?: boolean;
}

export const RaceCountdown: React.FC<RaceCountdownProps> = ({ course, className = '', compact = false }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!course) return null;

  const hasPastDeparture = isPastDepartureTime(course);
  const finished = isCourseFinished(course);
  const hasOfficialArrival = Boolean(course.arriveeOfficielle && course.arriveeOfficielle.trim());

  const isProvisional = Boolean(
    hasOfficialArrival && (
      course.statutCourse?.toLowerCase()?.includes('provisoire') ||
      (course as any).statutArrivee === 'provisoire' ||
      !finished
    )
  );

  // 1. Arrivée Provisoire
  if (hasOfficialArrival && isProvisional) {
    if (compact) {
      return (
        <span className={`inline-flex items-center gap-1 font-mono font-bold text-amber-400 text-xs ${className}`}>
          <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span>Arrivée Provisoire</span>
        </span>
      );
    }
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-500/50 text-xs font-extrabold shadow-sm ${className}`}>
        <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
        <span>Arrivée Provisoire</span>
      </div>
    );
  }

  // 2. Arrivée Certifiée & Confirmée
  if (hasOfficialArrival && (finished || !isProvisional)) {
    if (compact) {
      return (
        <span className={`inline-flex items-center gap-1 font-mono font-bold text-emerald-400 text-xs ${className}`}>
          <Flag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Arrivée Certifiée & Confirmée</span>
        </span>
      );
    }
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold shadow-sm ${className}`}>
        <Flag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Arrivée Certifiée & Confirmée</span>
      </div>
    );
  }

  // 2. Départ Dépassé (isPastDepartureTime == true) -> 'Course en cours'
  if (hasPastDeparture || course.statutCourse === 'Course en cours') {
    if (compact) {
      return (
        <span className={`inline-flex items-center gap-1.5 font-mono font-black text-rose-400 text-xs ${className}`}>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span>Course en cours</span>
        </span>
      );
    }
    return (
      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 text-rose-300 border border-rose-500/60 text-xs font-black shadow-md ${className}`}>
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
        </span>
        <span className="uppercase tracking-wider">Course en cours</span>
      </div>
    );
  }

  // 3. Décompte en Temps Réel avant le départ
  const targetDate = getRaceParisTargetTime(course.date, course.heure);
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/90 text-rose-300 border border-rose-500/60 text-xs font-black ${className}`}>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
        <span>Course en cours</span>
      </div>
    );
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-black text-amber-400 text-xs ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          {hours > 0 ? `${formattedHours}h ${formattedMinutes}m` : `${formattedMinutes}:${formattedSeconds}`}
        </span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/40 text-xs shadow-md ${className}`}>
      <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Départ dans :</span>
      <span className="font-mono font-black text-amber-400 text-sm tracking-wide">
        {hours > 0 ? `${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s` : `${formattedMinutes}m ${formattedSeconds}s`}
      </span>
    </div>
  );
};
