import React, { useState, useRef, useEffect } from 'react';
import { Trophy, Play, Pause, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, Clock, Calendar, MapPin, Award, ArrowRight, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { shouldPromoteProvisionalToOfficial, checkOfficialArrivalAuditStatus } from '../utils/raceCountdown';
import { getFriday02Meetings } from '../data/plrFriday02Data';
import { getCuratedPmuMeetings } from '../data/pmuMeetingsData';
import { getRaceHistory } from '../utils/favoritesStorage';
import { convertToAbidjanGMT, getIvoryCoastDate } from '../utils/timeConversion';

interface BandePassanteArriveesProps {
  currentCourse: CourseHippique;
  onSelectArrivalCourse?: (arrival: any) => void;
  onRefreshArrival?: () => void;
  onUpdateArrival?: (arrivalStr: string) => void;
  isRefreshing?: boolean;
  isHeaderMode?: boolean;
}

export const BandePassanteArrivees: React.FC<BandePassanteArriveesProps> = ({
  currentCourse,
  onSelectArrivalCourse,
  onRefreshArrival,
  onUpdateArrival,
  isRefreshing = false,
  isHeaderMode = false,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<'normal' | 'fast'>('normal');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualArrivalInput, setManualArrivalInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // La course affichée dans le détail est displayCourse
  const displayCourse = currentCourse;

  // Remise à zéro automatique de la bande passante dès 00h00 GMT heure de Côte d'Ivoire (Abidjan)
  const allDailyRaces = React.useMemo(() => {
    const historyItems = getRaceHistory();
    const abidjanDateIso = getIvoryCoastDate(0); // "YYYY-MM-DD"
    const abidjanDateFr = abidjanDateIso.split('-').reverse().join('/'); // "DD/MM/YYYY"

    const isFromTodayAbidjan = (c: CourseHippique) => {
      if (!c || !c.date) return true;
      const d = c.date.trim();
      if (d === abidjanDateIso || d === abidjanDateFr) return true;
      const lowerD = d.toLowerCase();
      if (lowerD.includes("aujourd'hui") || lowerD.includes("aujourd’hui")) return true;
      return false;
    };

    const races: CourseHippique[] = [];
    if (displayCourse && isFromTodayAbidjan(displayCourse)) {
      races.push(displayCourse);
    }

    if (Array.isArray(historyItems)) {
      for (const item of historyItems) {
        if (!item || !item.course) continue;
        if (!isFromTodayAbidjan(item.course)) continue; // Écarter les épreuves du jour précédent (Remise à zéro à 00h00)

        const isDuplicate = races.some(
          (r) =>
            r.id === item.course.id ||
            (r.reunion === item.course.reunion && r.course === item.course.course)
        );
        if (!isDuplicate) {
          races.push(item.course);
        }
      }
    }

    return races;
  }, [displayCourse]);

  // Détection automatique des prochaines épreuves de 9 partants et plus
  const upcomingDailyRacesOf9Plus = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('hippo_calendar_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.meetings)) {
          return parsed.meetings.filter((m: any) => {
            const partantsCount = m.nombrePartants ?? m.partants?.length ?? 0;
            const isAtLeast9 = partantsCount >= 9;
            const isNotFinished = m.statut !== 'Terminé' && !m.arriveeOfficielle;
            const isTodayOrFuture = m.dateRelative === "Aujourd'hui" || m.dateRelative === 'Demain';
            return isAtLeast9 && isNotFinished && isTodayOrFuture;
          });
        }
      }
    } catch (e) {
      console.error("Erreur lecture upcoming races:", e);
    }
    return [];
  }, [displayCourse]);

  // Date du jour calculée dynamiquement en français
  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dateDuJourAffichee = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  const {
    reunion = 'R1',
    course: cNum = 'C1',
    hippodrome = 'Hippodrome',
    prixNom = 'Course Quinté+',
    titre = 'Grand Prix',
    discipline = 'Attelé',
    distance = 2700,
    date = "Aujourd'hui",
    heure = '13h50',
    arriveeOfficielle,
    partants = [],
    synthese,
  } = displayCourse;

  const hasOfficialArrival = Boolean(arriveeOfficielle && arriveeOfficielle.trim());

  // Détection si l'arrivée est provisoire ou officielle
  const isProvisional = Boolean(
    hasOfficialArrival && (
      displayCourse.statutCourse?.toLowerCase()?.includes('provisoire') ||
      (displayCourse as any).statutArrivee === 'provisoire'
    )
  );

  const isOfficial = Boolean(hasOfficialArrival && !isProvisional);

  // Parse arrival numbers if real official arrival is available (NEVER invent arrivals)
  const arrivalNumbers: number[] = hasOfficialArrival
    ? (arriveeOfficielle || '')
        .split(/[-,\s]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))
    : [];

  // Map each arrival position with horse object from current course
  const arrivalHorses = arrivalNumbers.map((num, idx) => {
    const horse = partants.find((p) => p.numero === num);
    return {
      rank: idx + 1,
      numero: num,
      nom: horse?.nom || `Cheval N°${num}`,
      driver: horse?.driver || 'Driver/Jockey',
      entraineur: horse?.entraineur || 'Entraîneur',
      cote: horse?.coteProbable,
      ferrure: horse?.ferrure || 'F',
      musique: horse?.musique || '—',
    };
  });

  const nomAffiche = prixNom || titre;

  // Manual scroll controls
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  // Modale de détails de l'arrivée (partagée)
  const renderDetailModal = () => (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-2 sm:px-2 sm:pb-2 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-none sm:rounded-2xl p-4 sm:p-5 max-w-lg w-full shadow-2xl space-y-4 mt-0 sm:mt-2">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                  {reunion} {cNum}
                </span>
                <h3 className="font-black text-white text-base">
                  {hippodrome}
                </h3>
              </div>
              <p className="text-xs text-slate-400">{nomAffiche}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDetailOpen(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Date du jour mise en évidence dans la modale */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">Date du jour : <strong className="text-amber-300">{dateDuJourAffichee}</strong></span>
        </div>

        {/* Official Arrival 5 First Placed Horses */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
            {hasOfficialArrival ? (isProvisional ? '⚠️ Arrivée Provisoire PMU (En cours de confirmation)' : '🏆 Arrivée Définitive Officielle PMU') : '⏳ En attente de l\'arrivée directe (Départ à ' + heure + ')'}
          </span>

          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {arrivalHorses.map((h, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black font-mono text-base sm:text-lg shadow-lg ${
                    idx === 0
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300'
                      : idx === 1
                      ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 ring-1 ring-white'
                      : idx === 2
                      ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 ring-1 ring-amber-600'
                      : 'bg-slate-800 text-white border border-slate-700'
                  }`}
                >
                  {h.numero}
                </div>
                <span className="text-[10px] font-black text-amber-400 mt-1">
                  {hasOfficialArrival ? (idx === 0 ? '🥇 1er' : idx === 1 ? '🥈 2e' : idx === 2 ? '🥉 3e' : `${idx + 1}e`) : `Fav ${idx + 1}`}
                </span>
                <span className="text-[10px] text-white font-bold truncate max-w-[70px]">
                  {h.nom}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Discipline & Distance :</span>
            <span className="text-white font-bold">{discipline} · {distance}m</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Horaire de l'épreuve :</span>
            <span className="text-amber-400 font-bold">{date} à {heure}</span>
          </div>
        </div>

        {/* Modal action button */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDetailOpen(false);
                setManualArrivalInput(arriveeOfficielle || '');
                setIsManualInputOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center gap-1 shadow-md shadow-emerald-600/30"
            >
              ✏️ Saisir / Modifier Arrivée
            </button>
            <a
              href={(displayCourse.sourceUrl || '').replace('partants-pmu', 'arrivee-rapports').replace('partants-pronostics', 'arrivee-rapports') || 'https://www.geny.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-all flex items-center gap-1 border border-amber-500/30"
            >
              <span>Geny.com</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={() => setIsDetailOpen(false)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  // Modale de saisie manuelle (partagée)
  const renderManualInputModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl space-y-4 my-1 sm:my-2">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-black text-white text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <span>Saisie Directe de l'Arrivée Officielle</span>
          </h3>
          <button
            type="button"
            onClick={() => setIsManualInputOpen(false)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Saisissez les numéros des chevaux à l'arrivée séparés par des tirets ou des espaces (ex: <strong className="text-amber-300">16 - 5 - 17 - 6 - 1</strong>) pour {reunion} {cNum} :
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualArrivalInput.trim() && onUpdateArrival) {
              onUpdateArrival(manualArrivalInput.trim());
            }
            setIsManualInputOpen(false);
          }}
          className="space-y-3"
        >
          <input
            type="text"
            value={manualArrivalInput}
            onChange={(e) => setManualArrivalInput(e.target.value)}
            placeholder="ex: 16 - 5 - 17 - 6 - 1"
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-emerald-500/60 text-amber-300 font-mono font-black text-sm focus:outline-none focus:border-emerald-400 placeholder:text-slate-600 shadow-inner"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsManualInputOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95"
            >
              Confirmer & Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (isHeaderMode) {
    return (
      <>
        <div className="w-full h-full bg-transparent overflow-hidden relative select-none flex items-center justify-between gap-2">
          <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollContainerRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={() => setIsDetailOpen(true)}
            className="flex-1 py-1 overflow-x-auto scrollbar-none flex items-center cursor-pointer"
            title="Cliquez pour afficher les détails ou modifier l'arrivée officielle"
          >
            <div
              className={`flex items-center gap-4 w-max ${
                !isPaused ? 'animate-ticker' : 'ticker-paused'
              }`}
              style={{
                animationDuration: scrollSpeed === 'fast' ? '25s' : '45s',
              }}
            >
              {[1, 2].map((cycle) => (
                <div key={cycle} className="flex items-center gap-4 shrink-0">
                  {allDailyRaces.map((r, rIdx) => {
                    const isAnalyzedCourse = (r.id === displayCourse.id) || (r.reunion === displayCourse.reunion && r.course === displayCourse.course);
                    const rHasArr = Boolean(r.arriveeOfficielle && r.arriveeOfficielle.trim());
                    const rIsProv = Boolean(rHasArr && (r.statutCourse?.toLowerCase().includes('provisoire') || (r as any).statutArrivee === 'provisoire'));
                    const arrNums = rHasArr ? r.arriveeOfficielle!.split(/[-,\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : [];

                    return (
                      <div
                        key={`${cycle}-${r.id || rIdx}`}
                        onClick={() => {
                          if (onSelectArrivalCourse) onSelectArrivalCourse(r);
                          setIsDetailOpen(true);
                        }}
                        className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl transition-all shrink-0 shadow-lg group cursor-pointer border ${
                          isAnalyzedCourse
                            ? 'bg-gradient-to-r from-amber-950/90 via-slate-950 to-amber-950/80 border-2 border-amber-400 shadow-amber-500/20 ring-1 ring-amber-500/50'
                            : 'bg-slate-950/90 border-slate-800 hover:border-amber-500/60'
                        }`}
                      >
                        {/* Reunion/Course Badge */}
                        <span className={`px-2 py-0.5 rounded-lg font-black text-xs flex items-center gap-1 ${
                          isAnalyzedCourse
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md'
                            : rHasArr ? (rIsProv ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950') : 'bg-rose-500 text-white'
                        }`}>
                          {isAnalyzedCourse && <span>🌟 ANALYSÉE :</span>}
                          <span>{r.reunion}{r.course}</span>
                        </span>

                        <span className="font-extrabold text-xs text-white truncate max-w-[140px] group-hover:text-amber-300">
                          {r.prixNom || r.hippodrome}
                        </span>

                        {rHasArr ? (
                          <div className="flex items-center gap-1.5 ml-1">
                            {arrNums.slice(0, 5).map((num, rankIdx) => {
                              const pHorse = r.partants?.find(p => p.numero === num);
                              const coteVal = pHorse?.coteProbable;
                              return (
                                <div key={`ticker-num-${cycle}-${r.id || rIdx}-${num}-${rankIdx}`} className="flex items-center gap-1">
                                  <span className={`w-8 h-8 rounded-xl text-[16px] font-black font-mono flex items-center justify-center shadow-md ${
                                    rankIdx === 0
                                      ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-2 border-amber-300 shadow-amber-500/40'
                                      : 'bg-slate-900 text-amber-300 border border-slate-700'
                                  }`}>
                                    {num}
                                  </span>
                                  {coteVal !== undefined && (
                                    <span className="text-[10px] text-amber-300 font-mono font-bold">
                                      ({coteVal}/1)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            <span>Départ {r.heure ? `${convertToAbidjanGMT(r.heure, r.date)} GMT` : '11h50 GMT'}</span>
                          </span>
                        )}

                        <span className="text-slate-700 font-black text-xs ml-1">|</span>
                      </div>
                    );
                  })}

                  {/* Prochaines Courses de 9 partants et plus (Défilantes en avant-course) */}
                  {upcomingDailyRacesOf9Plus.map((m: any, mIdx: number) => {
                    const partantsCount = m.nombrePartants ?? m.partants?.length ?? 9;
                    const abidjanTime = convertToAbidjanGMT(m.heure, m.date);
                    return (
                      <div
                        key={`up-${mIdx}`}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-red-950/80 via-slate-950 to-red-950/70 border border-red-500/50 hover:border-red-400 transition-all shrink-0 shadow-lg text-rose-100"
                        title={`Prochaine course de ${partantsCount} partants (≥ 9) - Départ à ${abidjanTime} GMT Abidjan`}
                      >
                        <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>DEPART DIRECT (≥9)</span>
                        </span>
                        <span className="font-extrabold text-xs text-white">
                          {m.reunion}{m.courseNumero || 'C1'}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          {m.hippodrome} · <strong className="text-amber-400 font-bold">{partantsCount} partants</strong> · <strong className="text-rose-400 font-bold">{abidjanTime} GMT</strong>
                        </span>
                        <span className="text-slate-700 font-black text-xs ml-1">|</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Button for Direct Input / Refresh in Header */}
          <div className="flex items-center gap-1.5 shrink-0 z-20 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setManualArrivalInput(arriveeOfficielle || '');
                setIsManualInputOpen(true);
              }}
              className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold transition-all text-[11px] flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
              title="Saisir ou modifier l'arrivée officielle immédiatement"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Saisir Arrivée</span>
            </button>
          </div>
        </div>

        {/* Modal de détails (Accessible également depuis Header Mode) */}
        {isDetailOpen && renderDetailModal()}
        {/* Modal de saisie manuelle (Accessible également depuis Header Mode) */}
        {isManualInputOpen && renderManualInputModal()}
      </>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-slate-950 via-[#0a1325] to-slate-950 border-y-2 border-amber-500 shadow-2xl overflow-hidden relative my-3 rounded-2xl">
      {/* Ambient glowing gold edge highlights */}
      <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

      {/* Top Header Bar : Status, Date du jour and Controls */}
      <div className="px-3 sm:px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pulsing Live Dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-sm shadow-rose-500/50"></span>
          </span>

          <span className="font-black text-rose-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span>ARRIVÉES DU JOUR ({allDailyRaces.length}) & AVANT-COURSES (≥9 partants : {upcomingDailyRacesOf9Plus.length})</span>
          </span>

          {/* Date du jour mise en avant */}
          <div className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-amber-500/30 text-slate-200 text-[11px] font-extrabold flex items-center gap-1.5 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
            <span>Date du jour : <strong className="text-amber-300 font-black">{dateDuJourAffichee}</strong></span>
          </div>

          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase">
            {reunion} {cNum} · {hippodrome}
          </span>

          {hasOfficialArrival ? (() => {
            const isProvisional = currentCourse.statutCourse?.toLowerCase().includes('provisoire') || (currentCourse as any).statutArrivee === 'provisoire';
            const promotionCheck = shouldPromoteProvisionalToOfficial(
              currentCourse.provisionalArrivalAt,
              currentCourse.discipline,
              currentCourse.hasEnquete
            );
            const auditStatus = checkOfficialArrivalAuditStatus(
              currentCourse.officialArrivalAt,
              currentCourse.arrivalAuditCompleted
            );

            if (isProvisional) {
              return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 uppercase flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {currentCourse.hasEnquete ? (
                    <span className="text-rose-300">⚠️ ARRIVÉE PROVISOIRE (Enquête commissaires en cours... Reste PROVISOIRE)</span>
                  ) : (
                    <span>⚠️ ARRIVÉE PROVISOIRE (Officielle dans {promotionCheck.remainingSeconds}s · {promotionCheck.delayMinutes} min {promotionCheck.delayMinutes === 3 ? 'Trot' : 'Galop'})</span>
                  )}
                </span>
              );
            }

            if (currentCourse.arrivalAuditModificationDetected) {
              return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/60 uppercase flex items-center gap-1.5 animate-bounce">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>🚨 ARRIVÉE OFFICIELLE MODIFIÉE (Audit 5 min commissaires)</span>
                </span>
              );
            }

            if (currentCourse.arrivalAuditCompleted) {
              return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 uppercase flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🏆 ARRIVÉE OFFICIELLE CONFIRMÉE (Audit 5 min validé ✓)</span>
                </span>
              );
            }

            return (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 uppercase flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>🏆 ARRIVÉE OFFICIELLE (Contrôle post-arrivée dans {auditStatus.remainingSeconds}s)</span>
              </span>
            );
          })() : (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Départ {heure} · En attente de l'arrivée
            </span>
          )}
        </div>

        {/* Play / Pause & Controls */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {onRefreshArrival && (
            <button
              type="button"
              onClick={onRefreshArrival}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold border border-rose-400 shadow-sm transition-all text-[10px] active:scale-95"
              title="Actualiser en direct l'arrivée officielle"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>{isRefreshing ? 'Recherche...' : '🔴 Refresh Arrivée'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-bold transition-colors ${
              isPaused
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={isPaused ? 'Reprendre le défilement' : 'Mettre en pause'}
          >
            {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
            <span>{isPaused ? 'Lecture' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={() => setScrollSpeed((s) => (s === 'normal' ? 'fast' : 'normal'))}
            className={`px-2 py-0.5 rounded-lg border font-bold transition-colors ${
              scrollSpeed === 'fast'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Vitesse du bandeau défilant"
          >
            {scrollSpeed === 'fast' ? '⚡ Rapide' : '⏱️ Vitesse'}
          </button>

          <button
            type="button"
            onClick={() => setIsDetailOpen(true)}
            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition-colors text-[10px]"
            title="Afficher la fiche détaillée de l'arrivée"
          >
            📋 Détails
          </button>

          <button
            type="button"
            onClick={() => {
              setManualArrivalInput(arriveeOfficielle || '');
              setIsManualInputOpen(true);
            }}
            className="px-2 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold transition-colors text-[10px]"
            title="Saisir ou corriger manuellement l'arrivée officielle"
          >
            ✏️ Saisir Arrivée
          </button>

          <div className="flex items-center gap-1 border-l border-slate-700/80 pl-1.5 ml-0.5">
            <button
              type="button"
              onClick={handleScrollLeft}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
              title="Défiler vers la gauche"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
              title="Défiler vers la droite"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrolling Ticker Track displaying the 3 last analyzed races */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="py-2.5 px-3 overflow-x-auto scrollbar-none select-none flex items-center cursor-pointer"
        title="Cliquez pour voir les détails de l'arrivée officielle"
      >
        <div
          className={`flex items-center gap-4 w-max ${
            !isPaused ? 'animate-ticker' : 'ticker-paused'
          }`}
          style={{
            animationDuration: scrollSpeed === 'fast' ? '22s' : '40s',
          }}
        >
          {/* Repeat sequence 3 times for a seamless infinite loop */}
          {[1, 2, 3].map((cycle) => (
            <div key={cycle} className="flex items-center gap-6 shrink-0">
              {/* Date du jour Badge inside the Ticker */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/30 text-amber-300 text-xs font-black shrink-0 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                <span>{dateDuJourAffichee}</span>
              </div>

              {allDailyRaces.map((r, rIdx) => {
                const isCurrent =
                  r.id === displayCourse.id ||
                  (r.reunion === displayCourse.reunion && r.course === displayCourse.course);
                const rHasArr = Boolean(r.arriveeOfficielle && r.arriveeOfficielle.trim());
                const rIsProv = Boolean(
                  rHasArr &&
                    (r.statutCourse?.toLowerCase().includes('provisoire') ||
                      (r as any).statutArrivee === 'provisoire')
                );
                const arrNums = rHasArr
                  ? r.arriveeOfficielle!
                      .split(/[-,\s]+/)
                      .map((s) => parseInt(s.trim(), 10))
                      .filter((n) => !isNaN(n))
                  : [];

                return (
                  <div
                    key={`${cycle}-${r.id || rIdx}`}
                    onClick={() => {
                      if (onSelectArrivalCourse) onSelectArrivalCourse(r);
                      setIsDetailOpen(true);
                    }}
                    className="flex items-center gap-3 shrink-0 group cursor-pointer"
                  >
                    {/* Badge Course / Réunion */}
                    <span
                      className={`px-2.5 py-1 rounded-xl font-black text-xs flex items-center gap-1 shadow-md ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 border border-amber-300'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isCurrent && <span>🌟</span>}
                      <span>
                        {r.reunion}
                        {r.course}
                      </span>
                      <span className="text-[10px] opacity-80 font-normal max-w-[120px] truncate">
                        ({r.prixNom || r.hippodrome})
                      </span>
                    </span>

                    {/* Badge Arrivée / Statut */}
                    {rHasArr ? (
                      <span
                        className={`text-xs font-black tracking-wider uppercase px-2.5 py-1 rounded-lg border shadow-sm ${
                          rIsProv
                            ? 'bg-amber-600/90 text-amber-100 border-amber-400'
                            : 'bg-emerald-600/90 text-white border-emerald-400'
                        }`}
                      >
                        {rIsProv ? 'ARRIVÉE PROVISOIRE' : 'ARRIVÉE OFFICIELLE'} :
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-500/40 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                        <span>ARRIVÉE À VENIR ({r.heure ? `${convertToAbidjanGMT(r.heure, r.date)} GMT Abidjan` : '11h50 GMT'})</span>
                      </span>
                    )}

                    {/* Chevaux à l'arrivée */}
                    {rHasArr ? (
                      <div className="flex items-center gap-2">
                        {arrNums.slice(0, 5).map((num, hIdx) => {
                          const pHorse = r.partants?.find((p) => p.numero === num);
                          const rawCote = pHorse?.coteProbable;
                          const formattedCote =
                            typeof rawCote === 'number'
                              ? `${rawCote}/1`
                              : rawCote
                              ? `${rawCote}`
                              : null;

                          return (
                            <div key={`ticker-bottom-${cycle}-${r.id || rIdx}-${num}-${hIdx}`} className="flex items-center gap-1">
                              <span className="text-[9px] font-black text-amber-400">
                                {hIdx === 0
                                  ? '🥇'
                                  : hIdx === 1
                                  ? '🥈'
                                  : hIdx === 2
                                  ? '🥉'
                                  : `${hIdx + 1}e`}
                              </span>
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono shadow-md text-sm ${
                                  hIdx === 0
                                    ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 ring-2 ring-amber-300 font-extrabold'
                                    : 'bg-black text-amber-400 border border-amber-500/80'
                                }`}
                              >
                                {num}
                              </div>
                              {formattedCote && (
                                <span className="text-[10px] text-amber-300 font-mono font-bold">
                                  ({formattedCote})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Analyse en cours</span>
                    )}

                    <div className="text-amber-500/40 font-black text-base px-2">✦</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Detail for the Last Analyzed Course Arrival */}
      {isDetailOpen && renderDetailModal()}

      {/* Modale de saisie / modification manuelle d'arrivée */}
      {isManualInputOpen && renderManualInputModal()}
    </div>
  );
};
