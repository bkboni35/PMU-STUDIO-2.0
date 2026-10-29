import React, { useState, useEffect, useRef } from 'react';
import { Zap, RefreshCw, Radio, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { CourseHippique } from '../types/turf';

interface LivePmu2sControlBarProps {
  course: CourseHippique;
  onCourseUpdated?: (updatedCourse: CourseHippique) => void;
}

export const LivePmu2sControlBar: React.FC<LivePmu2sControlBarProps> = ({
  course,
  onCourseUpdated,
}) => {
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [pingCount, setPingCount] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [liveArrivalResult, setLiveArrivalResult] = useState<string | null>(course.arriveeOfficielle || null);
  const [liveStatusLabel, setLiveStatusLabel] = useState<string>(course.statutCourse || 'À venir');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [oddsChangeCount, setOddsChangeCount] = useState<number>(0);

  // Fonction d'interrogation ultra-rapide de l'API PMU Turf Info (toutes les 2s)
  const fetchPmuLiveArrival = async () => {
    if (isFetching) return;
    setIsFetching(true);

    try {
      // Formatage date pour API PMU (YYYYMMDD ou ISO)
      const rawDate = course.date || new Date().toISOString().split('T')[0];
      const dateFormatted = rawDate.replace(/-/g, '');
      const reunion = course.reunion || 'R1';
      const courseNum = course.course || course.courseNumero || 'C1';

      // 1. Appel combiné API PMU Officielle & Middleware Facts
      const pmuUrl = `/api/pmu/${dateFormatted}/${reunion}/${courseNum}`;
      const verifyUrl = `/api/verify-race-facts`;

      const [pmuRes, verifyRes] = await Promise.all([
        fetch(pmuUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course, url: course.sourceUrl }),
        }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastPingTime(nowStr);
      setPingCount((prev) => prev + 1);

      // Traitement du résultat retourné par l'API Officielle PMU Turf Info
      const pmuData = pmuRes?.course || pmuRes;
      const participantsList = pmuRes?.participants || pmuData?.participants || [];
      const verifyData = verifyRes;

      let detectedArrival = pmuData?.ordreArrivee || pmuData?.combinaisonArrivee || verifyData?.arriveeOfficielle || course.arriveeOfficielle || '';
      let detectedStatus = verifyData?.statutCourse || course.statutCourse || 'Course en cours';
      let isOfficiel = Boolean(pmuData?.statut === 'ARRIVEE_OFFICIELLE' || verifyData?.isOfficial || verifyData?.statutArrivee === 'officielle');
      let isProvisoire = Boolean(pmuData?.statut === 'ARRIVEE_PROVISOIRE' || verifyData?.isProvisional || verifyData?.statutArrivee === 'provisoire');

      // Extraction de l'ordre d'arrivée depuis la liste des participants si présente
      if (!detectedArrival && Array.isArray(participantsList) && participantsList.length > 0) {
        const placed = participantsList
          .filter((pm: any) => typeof pm.ordreArrivee === 'number' && pm.ordreArrivee > 0)
          .sort((a: any, b: any) => a.ordreArrivee - b.ordreArrivee);
        if (placed.length >= 3) {
          detectedArrival = placed.map((pm: any) => pm.numProno || pm.numOrdre).join(' - ');
        }
      }

      // Actualisation des cotes en fonction des mouvements du marché PMU
      let hasOddsChanged = false;
      let totalChangesThisPing = 0;
      const updatedPartants = (course.partants || []).map((p) => {
        const num = Number(p.numero);
        const match = Array.isArray(participantsList)
          ? participantsList.find((pm: any) => Number(pm.numProno || pm.numOrdre || pm.num) === num)
          : null;

        let liveCote = p.coteProbable;
        if (match) {
          const directRapport = match.dernierRapportDirect?.rapport;
          const refRapport = match.dernierRapportReference?.rapport;
          if (typeof directRapport === 'number' && directRapport > 0) {
            liveCote = directRapport;
          } else if (typeof refRapport === 'number' && refRapport > 0) {
            liveCote = refRapport;
          }
        }

        if (liveCote !== undefined && liveCote !== p.coteProbable) {
          hasOddsChanged = true;
          totalChangesThisPing++;
          return {
            ...p,
            cotePrecedente: p.coteProbable,
            coteProbable: liveCote,
          };
        }
        return p;
      });

      if (hasOddsChanged) {
        setOddsChangeCount((prev) => prev + totalChangesThisPing);
      }

      if (isOfficiel) {
        detectedStatus = 'Arrivée officielle';
      } else if (isProvisoire) {
        detectedStatus = 'Arrivée provisoire';
      }

      if (detectedArrival && detectedArrival.trim()) {
        setLiveArrivalResult(detectedArrival);
      }
      setLiveStatusLabel(detectedStatus);

      // Notification globale si cotes, arrivée ou statut actualisés
      if (onCourseUpdated && (hasOddsChanged || detectedArrival !== course.arriveeOfficielle || isOfficiel || isProvisoire)) {
        const updatedCourse: CourseHippique = {
          ...course,
          partants: updatedPartants,
          arriveeOfficielle: detectedArrival || course.arriveeOfficielle,
          statutCourse: detectedStatus as any,
          statut: isOfficiel ? 'ARRIVEE_OFFICIELLE' : isProvisoire ? 'ARRIVEE_PROVISOIRE' : 'ATTENTE',
          cotesScellees: isOfficiel ? true : course.cotesScellees,
          donneesFigees: isOfficiel ? true : course.donneesFigees,
          derniereMiseAJour: new Date().toISOString(),
        };
        onCourseUpdated(updatedCourse);
      }

      // Si l'arrivée officielle définitive est confirmée, on arrête le mode 2s automatique
      if (isOfficiel) {
        setIsLiveActive(false);
      }
    } catch (e) {
      console.warn("Erreur interrogation PMU 2s:", e);
    } finally {
      setIsFetching(false);
    }
  };

  // Gestion du timer intervalle 2s
  useEffect(() => {
    if (isLiveActive) {
      fetchPmuLiveArrival(); // Exécution immédiate au clic
      intervalRef.current = setInterval(() => {
        fetchPmuLiveArrival();
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLiveActive, course.id, course.sourceUrl]);

  const toggleLivePmuMode = () => {
    setIsLiveActive((prev) => !prev);
  };

  return (
    <div className={`p-3.5 rounded-2xl border transition-all duration-300 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
      isLiveActive 
        ? 'bg-gradient-to-r from-red-950 via-slate-950 to-slate-900 border-2 border-red-500 shadow-red-900/30' 
        : 'bg-slate-900/90 border border-slate-800'
    }`}>
      {/* Côté Gauche : Titre et statut */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl transition-all ${
          isLiveActive ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' : 'bg-slate-800 text-slate-400 border border-slate-700'
        }`}>
          {isLiveActive ? <Radio className="w-5 h-5 text-red-400 animate-spin" /> : <Zap className="w-5 h-5" />}
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>DIRECT PMU TURF INFO</span>
              <span className="px-2 py-0.2 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono">
                API 2s
              </span>
            </span>

            {isLiveActive ? (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
                🔴 LIVE PMU 2S ACTIF ({pingCount} pings)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                Inactif
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Actualise les <strong>cotes en fonction du marché</strong> et l'<strong>arrivée en temps réel</strong> via l'API Officielle PMU (2s).</span>
            {lastPingTime && isLiveActive && (
              <span className="text-amber-300 font-mono font-bold text-[10px]">
                • Dernier ping : {lastPingTime}
              </span>
            )}
            {oddsChangeCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                ⚡ {oddsChangeCount} mouvement(s) de cotes détecté(s)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Côté Droit : Badges Cotes/Arrivée & Bouton principal */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
        {/* Résultat d'arrivée en direct si détecté */}
        {liveArrivalResult ? (
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/50 text-xs font-mono font-black text-emerald-300 shadow-inner flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Arrivée PMU: <strong className="text-white font-extrabold">{liveArrivalResult}</strong></span>
          </div>
        ) : (
          isLiveActive && (
            <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Surveillance Cotes & Arrivée...</span>
            </div>
          )
        )}

        {/* Bouton Toggle 2s */}
        <button
          type="button"
          onClick={toggleLivePmuMode}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 shrink-0 ${
            isLiveActive
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white ring-2 ring-red-400 shadow-red-600/40 animate-pulse'
              : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/20'
          }`}
          title="Lancer le polling en direct PMU Turf Info à 2 secondes d'intervalle"
        >
          {isFetching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : isLiveActive ? (
            <Radio className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4 stroke-[2.5]" />
          )}

          <span>
            {isLiveActive ? '🔴 Arrêter Polling 2s PMU' : '⚡ Activer Direct PMU 2s'}
          </span>
        </button>
      </div>
    </div>
  );
};
