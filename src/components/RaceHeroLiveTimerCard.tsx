import React, { useState, useEffect } from 'react';
import { Timer, Clock, ShieldAlert, CheckCircle2, Zap, AlertTriangle, RefreshCw, FlaskConical, RotateCcw } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import {
  getRaceParisTargetTime,
  getDualDepartureTimes,
  shouldPromoteProvisionalToOfficial,
} from '../utils/raceCountdown';

interface RaceHeroLiveTimerCardProps {
  course: CourseHippique;
  onOpenDelayModal?: () => void;
}

export const RaceHeroLiveTimerCard: React.FC<RaceHeroLiveTimerCardProps> = ({ course, onOpenDelayModal }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    totalMinutes: number;
    pastMinutes: number;
    isPast: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    totalMinutes: 0,
    pastMinutes: 0,
    isPast: false,
  });

  const [delayMinutes, setDelayMinutes] = useState<number>(0);
  const [showSimMenu, setShowSimMenu] = useState<boolean>(false);
  const [simCountdownSecs, setSimCountdownSecs] = useState<number | null>(null);

  // Read delay for this race from localStorage
  useEffect(() => {
    const checkDelay = () => {
      try {
        const stored = localStorage.getItem('hippo_race_delays');
        if (stored && course) {
          const delays = JSON.parse(stored);
          const key = `${course.date}_${course.heure}`.toLowerCase().replace(/\s+/g, '');
          const genericKey = (course.heure || '').toLowerCase().replace(/\s+/g, '');
          if (delays[key]) {
            setDelayMinutes(delays[key].delayMinutes || 0);
          } else if (delays[genericKey]) {
            setDelayMinutes(delays[genericKey].delayMinutes || 0);
          } else {
            setDelayMinutes(0);
          }
        } else {
          setDelayMinutes(0);
        }
      } catch {
        setDelayMinutes(0);
      }
    };

    checkDelay();
    window.addEventListener('hippo_race_delay_updated', checkDelay);
    window.addEventListener('storage', checkDelay);
    return () => {
      window.removeEventListener('hippo_race_delay_updated', checkDelay);
      window.removeEventListener('storage', checkDelay);
    };
  }, [course]);

  // Main high-precision interval tick every 1 second (1000ms)
  useEffect(() => {
    const updateCountdown = () => {
      try {
        // Mode simulation de compte à rebours court si activé
        if (simCountdownSecs !== null) {
          if (simCountdownSecs <= 0) {
            setTimeLeft({
              hours: 0,
              minutes: 0,
              seconds: 0,
              totalSeconds: 0,
              totalMinutes: 0,
              pastMinutes: 0,
              isPast: true,
            });
            return;
          }
          setSimCountdownSecs(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
          const totalSecs = simCountdownSecs;
          const h = Math.floor(totalSecs / 3600);
          const m = Math.floor((totalSecs % 3600) / 60);
          const s = totalSecs % 60;
          setTimeLeft({
            hours: h,
            minutes: m,
            seconds: s,
            totalSeconds: totalSecs,
            totalMinutes: Math.floor(totalSecs / 60),
            pastMinutes: 0,
            isPast: false,
          });
          return;
        }

        const now = new Date();
        const targetTime = getRaceParisTargetTime(course.date, course.heure || '13h55');
        if (delayMinutes > 0) {
          targetTime.setTime(targetTime.getTime() + delayMinutes * 60 * 1000);
        }

        const diffMs = targetTime.getTime() - now.getTime();

        if (diffMs <= 0) {
          const pastSecs = Math.abs(diffMs) / 1000;
          const pastMins = Math.floor(pastSecs / 60);
          setTimeLeft({
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalSeconds: 0,
            totalMinutes: 0,
            pastMinutes: pastMins,
            isPast: true,
          });
          return;
        }

        const totalSecs = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        const totalMins = Math.floor(totalSecs / 60);

        setTimeLeft({
          hours: h,
          minutes: m,
          seconds: s,
          totalSeconds: totalSecs,
          totalMinutes: totalMins,
          pastMinutes: 0,
          isPast: false,
        });
      } catch (err) {
        console.error("Error computing race hero countdown:", err);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [course, delayMinutes, simCountdownSecs]);

  const { franceTime, ciTime } = getDualDepartureTimes(course.heure || '13h55', course.date);

  // RÈGLE COMMISSAIRES & CYCLE DE VIE DE L'ÉPREUVE :
  // 1. Compte à rebours avant le départ (timeLeft.isPast === false && !hasArrival)
  // 2. Compte à rebours terminé (0 min 0 s) : COURSE EN COURS (et SURTOUT PAS ARRIVÉE CERTIFIÉE ET CONFIRMÉE !)
  // 3. Dès que l'arrivée est disponible : ARRIVÉE PROVISOIRE (délai 1 min Plat ou 3 min Trot sans enquête)
  // 4. Dès que l'arrivée est confirmée : basculement automatique sur ARRIVÉE CERTIFIÉE ET CONFIRMÉE !

  const hasArrival = Boolean(course.arriveeOfficielle && course.arriveeOfficielle.trim());
  const arrivalNumbers = hasArrival
    ? course.arriveeOfficielle.split(/[-,\s]+/).filter(n => n.trim()).slice(0, 5)
    : [];

  const promotionCheck = shouldPromoteProvisionalToOfficial(
    course.provisionalArrivalAt,
    course.discipline,
    course.hasEnquete
  );

  const isExplicitOfficial = 
    hasArrival && (
      course.statutCourse === 'Arrivée officielle' ||
      course.statutCourse === 'Course terminée' ||
      (course as any).statutArrivee === 'officielle' ||
      (course as any).statut === 'ARRIVEE_OFFICIELLE' ||
      Boolean((course as any).donneesFigees)
    );

  const isExplicitProvisional = 
    hasArrival && (
      course.statutCourse?.toLowerCase().includes('provisoire') ||
      (course as any).statutArrivee === 'provisoire' ||
      (course as any).statut === 'ARRIVEE_PROVISOIRE'
    );

  // Déclenchement automatique de la promotion provisoire ➔ officielle
  const isAutoPromoteTriggered = hasArrival && (!isExplicitOfficial || isExplicitProvisional) && promotionCheck.shouldPromote;

  const isOfficial = hasArrival && (isExplicitOfficial || isAutoPromoteTriggered);
  const isProvisional = hasArrival && !isOfficial;

  // Si le compte à rebours est terminé (0 min 0 s / isPast = true) et AUCUNE arrivée n'est encore disponible :
  // Statut = COURSE EN COURS
  const isRunning = !hasArrival && (
    timeLeft.isPast ||
    course.statutCourse === 'Course en cours' ||
    (course as any).statut === 'ATTENTE'
  );

  const isUrgent5Min = !hasArrival && !timeLeft.isPast && timeLeft.totalMinutes <= 5;
  const isImminent10Min = !hasArrival && !timeLeft.isPast && timeLeft.totalMinutes <= 10 && !isUrgent5Min;

  // Déclenchement automatique vers l'arrivée officielle confirmée dès expiration du délai sans enquête
  useEffect(() => {
    if (isAutoPromoteTriggered && course) {
      window.dispatchEvent(new CustomEvent('hippo_auto_confirm_arrival', {
        detail: {
          courseId: course.id || course.sourceUrl,
          arriveeOfficielle: course.arriveeOfficielle,
        }
      }));
    }
  }, [isAutoPromoteTriggered, course]);

  // Compute a visual progress percentage for remaining time (scaling from 60 min -> 0)
  const maxRefSecs = 3600; // 60 minutes
  const progressPercent = timeLeft.isPast
    ? 100
    : Math.min(100, Math.max(0, Math.round(((maxRefSecs - Math.min(maxRefSecs, timeLeft.totalSeconds)) / maxRefSecs) * 100)));

  const handleOpenDelayModal = () => {
    if (onOpenDelayModal) {
      onOpenDelayModal();
    } else {
      window.dispatchEvent(new CustomEvent('hippo_open_delay_modal'));
    }
  };

  const handleSimulateRunning = () => {
    setSimCountdownSecs(null);
    setShowSimMenu(false);
    window.dispatchEvent(new CustomEvent('hippo_simulate_race_state', {
      detail: { state: 'running' }
    }));
  };

  const handleSimulateProvisional = () => {
    setSimCountdownSecs(null);
    setShowSimMenu(false);
    window.dispatchEvent(new CustomEvent('hippo_simulate_race_state', {
      detail: { state: 'provisional', arrival: '7 - 6 - 8 - 4 - 2' }
    }));
  };

  const handleSimulateConfirmed = () => {
    setSimCountdownSecs(null);
    setShowSimMenu(false);
    window.dispatchEvent(new CustomEvent('hippo_simulate_race_state', {
      detail: { state: 'confirmed', arrival: '7 - 6 - 8 - 4 - 2' }
    }));
  };

  const handleSimulate10sCountdown = () => {
    setShowSimMenu(false);
    window.dispatchEvent(new CustomEvent('hippo_simulate_race_state', {
      detail: { state: 'reset' }
    }));
    setSimCountdownSecs(10);
  };

  const handleReset = () => {
    setSimCountdownSecs(null);
    setShowSimMenu(false);
    window.dispatchEvent(new CustomEvent('hippo_simulate_race_state', {
      detail: { state: 'reset' }
    }));
  };

  const rankLabels = ['🥇 1er', '🥈 2e', '🥉 3e', '4e', '5e'];

  return (
    <div className={`mb-5 p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden shadow-xl ${
      isOfficial
        ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
        : isProvisional
        ? 'bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-amber-500/70 shadow-amber-950/50 ring-2 ring-amber-500/40'
        : isRunning
        ? 'bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 border-rose-500/70 shadow-rose-950/50 ring-2 ring-rose-500/40'
        : isUrgent5Min
        ? 'bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-rose-950/90 border-rose-500/80 ring-2 ring-rose-500/50 shadow-rose-950/60 animate-pulse'
        : isImminent10Min
        ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-amber-400/80 shadow-amber-950/50 ring-1 ring-amber-400/50'
        : 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-700/80'
    }`}>
      {/* Background glow effects */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
        isOfficial ? 'bg-emerald-500' : isProvisional ? 'bg-amber-500' : isRunning ? 'bg-rose-500' : isUrgent5Min ? 'bg-rose-500' : isImminent10Min ? 'bg-amber-500' : 'bg-indigo-500'
      }`} />

      {/* Header bar: Live Indicator + Section Title + Delay & Simulation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Live indicator dot */}
          <span className="relative flex h-3 w-3 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isOfficial ? 'bg-emerald-400' : isProvisional ? 'bg-amber-400' : isRunning ? 'bg-rose-400' : isUrgent5Min ? 'bg-rose-400' : isImminent10Min ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              isOfficial ? 'bg-emerald-500' : isProvisional ? 'bg-amber-500' : isRunning ? 'bg-rose-500' : isUrgent5Min ? 'bg-rose-500' : isImminent10Min ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
          </span>

          <span className="text-xs sm:text-sm font-black tracking-wide text-white flex items-center gap-1.5 uppercase">
            <Timer className={`w-4 h-4 ${
              isOfficial ? 'text-emerald-400' : isProvisional ? 'text-amber-400' : isRunning ? 'text-rose-400 animate-spin' : isUrgent5Min ? 'text-rose-400 animate-spin' : isImminent10Min ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
            }`} />
            <span>
              {isOfficial
                ? 'Arrivée Certifiée & Confirmée'
                : isProvisional
                ? 'Arrivée Provisoire des Commissaires'
                : isRunning
                ? 'Épreuve en Direct'
                : 'Minuteur de Départ en Direct'}
            </span>
          </span>

          {/* Refresh every 1s badge */}
          <span className="px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-bold text-[10px] border border-slate-700 flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5 text-amber-400 animate-spin" />
            <span>Mise à jour 1s</span>
          </span>
        </div>

        {/* Dual Timezone Badge & Delay Button & Quick Test Simulator */}
        <div className="flex items-center gap-2 relative">
          {/* Delay Badge if applied */}
          {delayMinutes > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/60 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Retard +{delayMinutes} min</span>
            </span>
          )}

          {/* Quick Delay Button */}
          <button
            type="button"
            onClick={handleOpenDelayModal}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
            title="Activer ou modifier les retards de départ en temps réel"
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Gérer retards</span>
          </button>

          {/* Simulateur interactif de cycle (Départ -> Provisoire -> Confirmée) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSimMenu(prev => !prev)}
              className="px-2.5 py-1 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-700/60 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
              title="Tester les états en direct : Course en cours, Arrivée Provisoire, Arrivée Confirmée"
            >
              <FlaskConical className="w-3 h-3 text-indigo-400" />
              <span>Test Cycle</span>
            </button>

            {showSimMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs">
                <div className="px-2 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Simulation du cycle de course
                </div>
                <button
                  type="button"
                  onClick={handleSimulate10sCountdown}
                  className="px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-800 text-amber-300 font-bold flex items-center gap-2 transition"
                >
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Test Compte à rebours 10s</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateRunning}
                  className="px-2.5 py-1.5 text-left rounded-lg hover:bg-rose-950/70 text-rose-300 font-bold flex items-center gap-2 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>2. 0m 0s ➔ COURSE EN COURS</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateProvisional}
                  className="px-2.5 py-1.5 text-left rounded-lg hover:bg-amber-950/70 text-amber-300 font-bold flex items-center gap-2 transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. ARRIVÉE PROVISOIRE</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateConfirmed}
                  className="px-2.5 py-1.5 text-left rounded-lg hover:bg-emerald-950/70 text-emerald-300 font-bold flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. ARRIVÉE CERTIFIÉE ET CONFIRMÉE</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white font-medium flex items-center gap-2 border-t border-slate-800 mt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Réinitialiser minuteur</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Digital Clock Display Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Left: Status / Digits block */}
        <div className="md:col-span-7 flex flex-wrap items-center justify-between sm:justify-start gap-2 bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800/80 shadow-inner">
          {/* Status Label above or side */}
          <div className="w-full mb-1 flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isOfficial
                  ? 'Statut officiel :'
                  : isProvisional
                  ? 'Arrivée provisoire :'
                  : isRunning
                  ? 'Course en cours :'
                  : 'Temps restant exact avant le départ :'}
              </span>
            </span>

            {/* Departure times */}
            <span className="font-bold text-amber-300 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              🇨🇮 {ciTime} GMT | 🇫🇷 {franceTime} FR
            </span>
          </div>

          {/* 1. ÉTAT ARRIVÉE CERTIFIÉE ET CONFIRMÉE */}
          {isOfficial ? (
            <div className="flex flex-col gap-2 py-1 w-full">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-lg sm:text-2xl font-black text-emerald-300 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                    <span>ARRIVÉE CERTIFIÉE ET CONFIRMÉE</span>
                    <span className="text-[10px] font-black text-emerald-950 bg-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Homologuée ✓
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    Les résultats officiels et rapports de la course sont validés et scellés.
                  </div>
                </div>
              </div>

              {/* 5 Numéros Gagnants Certifiés */}
              {arrivalNumbers.length > 0 && (
                <div className="flex items-center gap-2 sm:gap-2.5 mt-1 flex-wrap">
                  {arrivalNumbers.map((numStr, idx) => {
                    const num = parseInt(numStr, 10);
                    const horse = course.partants?.find(p => p.numero === num);
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-emerald-400">{rankLabels[idx] || `${idx + 1}e`}</span>
                        <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black font-mono text-lg flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-300">
                          {numStr}
                        </span>
                        {horse && (
                          <span className="text-[9px] font-bold text-slate-300 truncate max-w-[65px] text-center mt-0.5">
                            {horse.nom}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : isProvisional ? (
            /* 2. ÉTAT ARRIVÉE PROVISOIRE */
            <div className="flex flex-col gap-2 py-1 w-full">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-7 h-7 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <div className="text-lg sm:text-2xl font-black text-amber-300 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                    <span>ARRIVÉE PROVISOIRE</span>
                    <span className="text-[10px] font-black text-amber-950 bg-amber-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      En attente d'homologation
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    {course.hasEnquete ? (
                      <span className="text-rose-300 font-bold">⚠️ Enquête des commissaires en cours... Reste ARRIVÉE PROVISOIRE</span>
                    ) : (
                      <span className="text-amber-200">
                        ⏳ Homologation officielle automatique dans <strong className="text-amber-300 font-mono text-sm underline">{promotionCheck.remainingSeconds}s</strong> ({promotionCheck.delayMinutes} min {promotionCheck.delayMinutes === 3 ? 'Trot' : 'Galop'})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5 Numéros Provisoires */}
              {arrivalNumbers.length > 0 && (
                <div className="flex items-center gap-2 sm:gap-2.5 mt-1 flex-wrap">
                  {arrivalNumbers.map((numStr, idx) => {
                    const num = parseInt(numStr, 10);
                    const horse = course.partants?.find(p => p.numero === num);
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-amber-400">{rankLabels[idx] || `${idx + 1}e`}</span>
                        <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-slate-950 font-black font-mono text-lg flex items-center justify-center shadow border border-amber-300">
                          {numStr}
                        </span>
                        {horse && (
                          <span className="text-[9px] font-bold text-slate-300 truncate max-w-[65px] text-center mt-0.5">
                            {horse.nom}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : isRunning ? (
            /* 3. ÉTAT COMPTE À REBOURS TERMINÉ (0 min 0 s) : COURSE EN COURS */
            <div className="flex items-center gap-2.5 py-1">
              <span className="relative flex h-5 w-5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 shadow-lg shadow-rose-500/50" />
              </span>
              <div>
                <div className="text-lg sm:text-2xl font-black text-rose-200 uppercase tracking-tight animate-pulse flex items-center gap-2 flex-wrap">
                  <span>COURSE EN COURS</span>
                  <span className="text-xs font-bold text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/50">
                    Départ donné à {ciTime} GMT
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium mt-0.5">
                  Les chevaux sont en piste. Actualisation en direct et attente de l'arrivée provisoire...
                </div>
              </div>
            </div>
          ) : (
            /* 4. ÉTAT DÉCOMPTE ACTIF AVANT LE DÉPART (HH : MM : SS) */
            <div className="flex items-center gap-1.5 sm:gap-2 font-mono my-0.5">
              {/* Hours Box */}
              {timeLeft.hours > 0 && (
                <>
                  <div className="flex flex-col items-center">
                    <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xl sm:text-3xl font-black shadow-lg ${
                      isUrgent5Min ? 'bg-rose-950/90 text-rose-300 border-rose-500/80' : 'bg-slate-900 text-amber-300 border-amber-500/40'
                    }`}>
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans font-bold uppercase mt-0.5">Heures</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-slate-500 pb-4 animate-pulse">:</span>
                </>
              )}

              {/* Minutes Box */}
              <div className="flex flex-col items-center">
                <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xl sm:text-3xl font-black shadow-lg ${
                  isUrgent5Min
                    ? 'bg-rose-950/90 text-rose-200 border-rose-500/80 ring-2 ring-rose-500/50'
                    : isImminent10Min
                    ? 'bg-amber-950/90 text-amber-200 border-amber-400 ring-1 ring-amber-400/50'
                    : 'bg-slate-900 text-amber-400 border-amber-500/30'
                }`}>
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <span className="text-[10px] text-slate-400 font-sans font-bold uppercase mt-0.5">Minutes</span>
              </div>

              <span className={`text-xl sm:text-2xl font-black pb-4 animate-ping ${
                isUrgent5Min ? 'text-rose-400' : 'text-amber-400'
              }`}>:</span>

              {/* Seconds Box - Updates every second */}
              <div className="flex flex-col items-center">
                <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xl sm:text-3xl font-black shadow-lg transition-transform ${
                  isUrgent5Min
                    ? 'bg-rose-900 text-white border-rose-400 scale-105 shadow-rose-900/60'
                    : isImminent10Min
                    ? 'bg-amber-900/90 text-amber-100 border-amber-300 scale-102'
                    : 'bg-slate-900 text-emerald-400 border-emerald-500/40'
                }`}>
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <span className="text-[10px] text-emerald-400 font-sans font-extrabold uppercase mt-0.5">Secondes</span>
              </div>

              {/* Urgency Badge */}
              {isUrgent5Min && (
                <div className="ml-2 px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs uppercase animate-bounce tracking-wide shadow-lg border border-rose-300">
                  ⚡ DÉPART IMMINENT !
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Progress bar & visual indicator */}
        <div className="md:col-span-5 bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Progression vers l'arrivée</span>
              </span>
              <span className={`font-mono text-xs font-black ${
                isOfficial
                  ? 'text-emerald-400'
                  : isProvisional
                  ? 'text-amber-400 animate-pulse'
                  : isRunning
                  ? 'text-rose-400 animate-pulse'
                  : isUrgent5Min
                  ? 'text-rose-400 animate-pulse'
                  : 'text-emerald-400'
              }`}>
                {isOfficial
                  ? 'CONFIRMÉE 100%'
                  : isProvisional
                  ? `PROVISOIRE (${promotionCheck.remainingSeconds}s)`
                  : isRunning
                  ? 'COURSE EN COURS'
                  : `${progressPercent}%`}
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-full bg-slate-900 rounded-full h-3.5 p-0.5 border border-slate-800 relative overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isOfficial
                    ? 'bg-emerald-500'
                    : isProvisional
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 animate-pulse'
                    : isRunning
                    ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 animate-pulse'
                    : isUrgent5Min
                    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 animate-pulse'
                    : isImminent10Min
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                    : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                }`}
                style={{ width: `${isOfficial || isProvisional || isRunning ? 100 : Math.max(8, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Footer note inside card */}
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-medium">
            <span>Départ prévu : <strong className="text-amber-300">{ciTime} CI</strong> ({franceTime} FR)</span>
            <span className="text-slate-500">Heure de Paris/LONACI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
