import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Calendar,
  Globe,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Play,
  Copy,
  Check,
  Trophy,
  Clock,
  MapPin,
  Flame,
  Search,
  Code,
  Layers,
  Sparkles,
  Square,
  CheckSquare,
  BookmarkCheck,
  Zap,
  CheckCheck,
} from 'lucide-react';
import { PmuMeeting } from '../types/turf';
import { getIvoryCoastDate } from '../utils/timeConversion';
import { scrollToTopInstant } from '../utils/scrollHelper';
import { CountdownTimer } from './CountdownTimer';

// Helpers de persistance et de synchronisation des courses sélectionnées
const getStoredSelectedRaceIds = (): string[] => {
  try {
    const saved = localStorage.getItem('hippo_selected_next_race_ids');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((x: string) => Boolean(x) && x !== '__UNINITIALIZED__');
      }
    }
  } catch {}
  return [];
};

const saveAndBroadcastSelectedRaceIds = (ids: string[], source = 'PmuApiHubModal') => {
  try {
    localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify(ids));
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('hippo_selected_races_changed', {
          detail: { selectedRaceIds: ids, source },
        })
      );
      window.dispatchEvent(new Event('hippo_calendar_updated'));
    }, 0);
  } catch (err) {
    console.warn('Erreur stockage ou broadcast:', err);
  }
};

interface PmuApiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMeeting?: (meeting: PmuMeeting) => void;
}

export const PmuApiHubModal: React.FC<PmuApiHubModalProps> = ({
  isOpen,
  onClose,
  onSelectMeeting,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'tester' | 'guide'>('live');
  const modalBodyRef = React.useRef<HTMLDivElement | null>(null);

  const resetModalScroll = useCallback(() => {
    scrollToTopInstant(modalBodyRef);
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
      modalBodyRef.current.scrollLeft = 0;
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      resetModalScroll();
    }
  }, [isOpen, activeTab, resetModalScroll]);

  useEffect(() => {
    if (isOpen) {
      resetModalScroll();
      const raf1 = requestAnimationFrame(() => {
        resetModalScroll();
        const raf2 = requestAnimationFrame(resetModalScroll);
        return () => cancelAnimationFrame(raf2);
      });
      const timer1 = setTimeout(resetModalScroll, 0);
      const timer2 = setTimeout(resetModalScroll, 40);
      const timer3 = setTimeout(resetModalScroll, 120);

      return () => {
        cancelAnimationFrame(raf1);
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen, activeTab, resetModalScroll]);
  const [selectedDate, setSelectedDate] = useState<string>(() => getIvoryCoastDate(0) || '2026-10-12');
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<PmuMeeting[]>([]);
  const [quinteCourse, setQuinteCourse] = useState<PmuMeeting | null>(null);
  const [filterHippo, setFilterHippo] = useState('');

  // Gestion des courses choisies pour l'onglet "PROCHAINE COURSE"
  const [selectedNextRaceIds, setSelectedNextRaceIds] = useState<string[]>(getStoredSelectedRaceIds);

  // Synchronisation en direct avec le stockage local et les événements d'autres composants
  useEffect(() => {
    const handleSync = (e?: any) => {
      if (e?.detail?.source === 'PmuApiHubModal') return;
      const ids = getStoredSelectedRaceIds();
      setSelectedNextRaceIds(ids);
    };

    handleSync();
    window.addEventListener('hippo_selected_races_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('hippo_selected_races_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [isOpen]);

  // Persister les réunions dans le cache global du calendrier
  const persistMeetingsToCalendar = useCallback((meetingsToPersist: PmuMeeting[]) => {
    try {
      const raw = localStorage.getItem('hippo_calendar_data');
      let cal: { meetings: PmuMeeting[]; updatedAt?: string } = { meetings: [] };
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.meetings)) {
            cal = parsed;
          }
        } catch {}
      }

      const map = new Map<string, PmuMeeting>();
      cal.meetings.forEach((m) => map.set(m.id, m));
      meetingsToPersist.forEach((m) => {
        map.set(m.id, { ...(map.get(m.id) || {}), ...m });
      });

      cal.meetings = Array.from(map.values());
      cal.updatedAt = new Date().toISOString();
      localStorage.setItem('hippo_calendar_data', JSON.stringify(cal));
      setTimeout(() => {
        window.dispatchEvent(new Event('hippo_calendar_updated'));
      }, 0);
    } catch (err) {
      console.warn('Erreur mise à jour calendrier local:', err);
    }
  }, []);

  // Cocher / Décocher une course pour l'onglet "PROCHAINE COURSE" (Mise à jour fonctionnelle synchrone & réactive)
  const toggleRaceForUpcomingTab = useCallback((meeting: PmuMeeting) => {
    if (!meeting) return;
    const raceId = meeting.id;
    if (!raceId) return;

    setSelectedNextRaceIds((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev.filter((id) => Boolean(id) && id !== '__UNINITIALIZED__') : [];
      const isSelected = cleanPrev.includes(raceId);
      const nextIds = isSelected ? cleanPrev.filter((id) => id !== raceId) : [...cleanPrev, raceId];

      if (!isSelected) {
        persistMeetingsToCalendar([meeting]);
      }
      saveAndBroadcastSelectedRaceIds(nextIds, 'PmuApiHubModal');
      return nextIds;
    });
  }, [persistMeetingsToCalendar]);

  // Cocher / Décocher toutes les courses d'une réunion en un clic (Mise à jour fonctionnelle synchrone & réactive)
  const toggleAllRacesInMeeting = useCallback((meetingCourses: PmuMeeting[]) => {
    if (!meetingCourses || meetingCourses.length === 0) return;
    const meetingIds = meetingCourses.map((c) => c.id).filter(Boolean);
    if (meetingIds.length === 0) return;

    setSelectedNextRaceIds((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev.filter((id) => Boolean(id) && id !== '__UNINITIALIZED__') : [];
      const allSelected = meetingIds.every((id) => cleanPrev.includes(id));
      let nextIds: string[];
      if (allSelected) {
        nextIds = cleanPrev.filter((id) => !meetingIds.includes(id));
      } else {
        nextIds = Array.from(new Set([...cleanPrev, ...meetingIds]));
      }

      if (!allSelected) {
        persistMeetingsToCalendar(meetingCourses);
      }
      saveAndBroadcastSelectedRaceIds(nextIds, 'PmuApiHubModal');
      return nextIds;
    });
  }, [persistMeetingsToCalendar]);

  // Actions de sélection en masse
  const handleSelectAllFiltered = useCallback((meetingsList: PmuMeeting[]) => {
    if (meetingsList.length === 0) return;
    const targetIds = meetingsList.map((m) => m.id).filter(Boolean);
    setSelectedNextRaceIds((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev.filter((id) => Boolean(id) && id !== '__UNINITIALIZED__') : [];
      const newIds = Array.from(new Set([...cleanPrev, ...targetIds]));
      persistMeetingsToCalendar(meetingsList);
      saveAndBroadcastSelectedRaceIds(newIds, 'PmuApiHubModal');
      return newIds;
    });
  }, [persistMeetingsToCalendar]);

  const handleSelectNinePlus = useCallback((meetingsList: PmuMeeting[]) => {
    const ninePlus = meetingsList.filter((m) => {
      const count = m.partants && m.partants.length > 0
        ? m.partants.length
        : (m.exactPartantsCount || m.nombrePartants || 0);
      return count >= 9;
    });
    if (ninePlus.length === 0) return;
    const targetIds = ninePlus.map((m) => m.id).filter(Boolean);
    setSelectedNextRaceIds((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev.filter((id) => Boolean(id) && id !== '__UNINITIALIZED__') : [];
      const newIds = Array.from(new Set([...cleanPrev, ...targetIds]));
      persistMeetingsToCalendar(ninePlus);
      saveAndBroadcastSelectedRaceIds(newIds, 'PmuApiHubModal');
      return newIds;
    });
  }, [persistMeetingsToCalendar]);

  const handleDeselectAll = useCallback(() => {
    setSelectedNextRaceIds([]);
    saveAndBroadcastSelectedRaceIds([], 'PmuApiHubModal');
  }, []);

  // Testeur d'endpoint
  const [testEndpoint, setTestEndpoint] = useState<string>('programme_jour');
  const [testReunion, setTestReunion] = useState<string>('R1');
  const [testCourse, setTestCourse] = useState<string>('C4');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testStatusCode, setTestStatusCode] = useState<number | null>(null);
  const [testLatencyMs, setTestLatencyMs] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Charger le programme du jour au chargement
  const loadDailyProgram = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pmu/programme-complet/${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.meetings)) {
          const cleanMeetings = data.meetings.map((m: any, idx: number) => ({
            ...m,
            id: m.id || `pmu-live-${dateStr.replace(/-/g, '')}-${(m.reunion || 'r1').toLowerCase()}-${(m.courseNumero || `c${idx + 1}`).toLowerCase()}`,
          }));
          setMeetings(cleanMeetings);
          const q = cleanMeetings.find((m: PmuMeeting) => m.estQuinte);
          setQuinteCourse(q || null);
          persistMeetingsToCalendar(cleanMeetings);
        }
      } else {
        // Fallback calendar endpoint
        const calRes = await fetch(`/api/pmu-calendar?date=${dateStr}&refresh=true`);
        if (calRes.ok) {
          const calData = await calRes.json();
          if (Array.isArray(calData.meetings)) {
            const cleanMeetings = calData.meetings.map((m: any, idx: number) => ({
              ...m,
              id: m.id || `pmu-live-${dateStr.replace(/-/g, '')}-${(m.reunion || 'r1').toLowerCase()}-${(m.courseNumero || `c${idx + 1}`).toLowerCase()}`,
            }));
            setMeetings(cleanMeetings);
            const q = cleanMeetings.find((m: PmuMeeting) => m.estQuinte);
            setQuinteCourse(q || null);
            persistMeetingsToCalendar(cleanMeetings);
          }
        }
      }
    } catch (err) {
      console.warn('Erreur chargement programme PMU:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDailyProgram(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // Exécution du test d'endpoint
  const runEndpointTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    setTestStatusCode(null);
    setTestLatencyMs(null);

    const start = performance.now();
    let url = '';

    // Conversion date au format JJMMAAAA
    const cleanDate = selectedDate.replace(/-/g, '');
    const dd = cleanDate.slice(6, 8);
    const mm = cleanDate.slice(4, 6);
    const yyyy = cleanDate.slice(0, 4);
    const dateFormatted = `${dd}${mm}${yyyy}`;

    switch (testEndpoint) {
      case 'programme_jour':
        url = `/api/pmu/programme/${dateFormatted}`;
        break;
      case 'programme_complet':
        url = `/api/pmu/programme-complet/${dateFormatted}`;
        break;
      case 'reunion_detail':
        url = `/api/pmu/programme/${dateFormatted}/${testReunion}`;
        break;
      case 'course_detail':
        url = `/api/pmu/${dateFormatted}/${testReunion}/${testCourse}`;
        break;
      case 'participants':
        url = `/api/pmu/participants/${dateFormatted}/${testReunion}/${testCourse}`;
        break;
      case 'rapports':
        url = `/api/pmu/rapports/${dateFormatted}/${testReunion}/${testCourse}`;
        break;
      case 'open_pmu_arrivees':
        url = `/api/open-pmu/arrivees?date=${selectedDate}`;
        break;
      default:
        url = `/api/pmu/programme/${dateFormatted}`;
    }

    try {
      const res = await fetch(url);
      const latency = Math.round(performance.now() - start);
      setTestLatencyMs(latency);
      setTestStatusCode(res.status);

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: `Réponse non-JSON reçue (HTTP ${res.status}): ${text.slice(0, 150)}...` };
      }
      setTestResult(json);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Erreur réseau' });
      setTestStatusCode(500);
    } finally {
      setTestLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filtrage des réunions par hippodrome / discipline (EXCLUSIVEMENT ≥ 9 PARTANTS)
  const filteredMeetings = meetings.filter((m) => {
    const partantsCount = m.partants && m.partants.length > 0
      ? m.partants.length
      : (m.exactPartantsCount || m.nombrePartants || 0);
    if (partantsCount < 9) return false;

    if (!filterHippo.trim()) return true;
    const q = filterHippo.toLowerCase().trim();
    return (
      (m.hippodrome || '').toLowerCase().includes(q) ||
      (m.reunion || '').toLowerCase().includes(q) ||
      (m.nomCoursePhare || '').toLowerCase().includes(q) ||
      (m.discipline || '').toLowerCase().includes(q)
    );
  });

  // Regroupement par réunion
  const reunionsMap = new Map<string, PmuMeeting[]>();
  filteredMeetings.forEach((m) => {
    const list = reunionsMap.get(m.reunion) || [];
    list.push(m);
    reunionsMap.set(m.reunion, list);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-1 sm:p-3 sm:pt-2 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[96vh] sm:max-h-[calc(100vh-1rem)] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden mt-0 sm:mt-1">
        {/* En-tête */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Centre d'Actualisation Quotidienne & Connecteur PMU API
                </h2>
                <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  API TurfInfo Live
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  Open PMU API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Alimentation directe en temps réel des programmes, réunions, courses, partants et rapports officiels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-5 gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveTab('live');
              resetModalScroll();
            }}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'live'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Programme du Jour ({meetings.length} courses)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tester');
              resetModalScroll();
            }}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tester'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Explorateur d'Endpoints & Testeur Live</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('guide');
              resetModalScroll();
            }}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Guide d'Intégration & Architecture</span>
          </button>
        </div>

        {/* Corps modal scrollable */}
        <div ref={modalBodyRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/50">
          {/* ONGLET 1 : PROGRAMME EN DIRECT */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              {/* Barre de contrôle date & filtre */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">Date consultée :</span>
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => loadDailyProgram(selectedDate)}
                    disabled={loading}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Actualiser le Programme</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer hippodrome, épreuve..."
                    value={filterHippo}
                    onChange={(e) => setFilterHippo(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Bandeau : SÉLECTION POUR L'ONGLET « PROCHAINE COURSE » */}
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-800/90 to-slate-900 border border-amber-500/40 rounded-xl p-3 sm:p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <BookmarkCheck className="w-4 h-4 text-amber-400" />
                        POSITIONNER DANS L'ONGLET « PROCHAINE COURSE »
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40">
                        {selectedNextRaceIds.length} course(s) positionnée(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 max-w-2xl">
                      Cochez les cases pour choisir les courses à positionner dans la rubrique & l'onglet <strong>« PROCHAINE COURSE »</strong> afin de les analyser ultérieurement en 1 clic.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSelectAllFiltered(filteredMeetings)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Cocher toutes les courses affichées pour l'onglet Prochaine Course"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tout cocher ({filteredMeetings.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectNinePlus(filteredMeetings)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                    title="Cocher uniquement les courses de 9 partants et plus"
                  >
                    Courses ≥ 9 partants
                  </button>
                  {selectedNextRaceIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                      title="Tout décocher"
                    >
                      Tout décocher
                    </button>
                  )}
                </div>
              </div>

              {/* Résumé de l'épreuve Quinté+ si détectée avec case à cocher */}
              {quinteCourse && (
                <div className={`bg-gradient-to-r from-amber-950/40 via-slate-800/80 to-amber-950/30 border rounded-xl p-3 sm:p-4 flex items-center justify-between flex-wrap gap-3 transition-all ${
                  selectedNextRaceIds.includes(quinteCourse.id)
                    ? 'border-amber-400 ring-1 ring-amber-400/40 shadow-lg'
                    : 'border-amber-500/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
                      <Trophy className="w-6 h-6 fill-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-amber-500/40 text-xs">
                          {quinteCourse.reunion} {quinteCourse.courseNumero} · Épreuve Quinté+
                        </span>
                        <div className="shrink-0 font-mono">
                          <CountdownTimer date={quinteCourse.date || selectedDate} heure={quinteCourse.heure} compact />
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white mt-1">
                        {quinteCourse.nomCoursePhare} — {quinteCourse.hippodrome}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {quinteCourse.discipline} · {quinteCourse.distance}m · Dotation : {Number(quinteCourse.allocation).toLocaleString()} € · {quinteCourse.nombrePartants} partants
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Case à cocher Quinté+ pour Prochaine Course */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleRaceForUpcomingTab(quinteCourse);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer select-none transition-all ${
                        selectedNextRaceIds.includes(quinteCourse.id)
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300 ring-1 ring-amber-400/50 shadow-md font-bold'
                          : 'bg-slate-900/90 border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-white'
                      }`}
                      title="Cliquer pour cocher/décocher ce Quinté+ pour l'onglet PROCHAINE COURSE"
                    >
                      {selectedNextRaceIds.includes(quinteCourse.id) ? (
                        <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold">
                        {selectedNextRaceIds.includes(quinteCourse.id)
                          ? '📌 Positionné dans « PROCHAINE COURSE »'
                          : 'Positionner dans « PROCHAINE COURSE »'}
                      </span>
                    </button>

                    {onSelectMeeting && (
                      <button
                        onClick={() => {
                          onSelectMeeting(quinteCourse);
                          onClose();
                        }}
                        className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Analyser le Quinté+</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Liste des réunions */}
              {loading ? (
                <div className="text-center py-12 space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <p className="text-sm text-slate-400">Interrogation de l'API Officielle PMU TurfInfo...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-sm font-bold text-white">Aucune course trouvée pour cette date.</p>
                  <p className="text-xs text-slate-400">Vérifiez la date ou cliquez sur "Actualiser le Programme".</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(reunionsMap.entries()).map(([rNum, courses]) => {
                    const meetingRaceIds = courses.map((c) => c.id);
                    const selectedInMeetingCount = meetingRaceIds.filter((id) => selectedNextRaceIds.includes(id)).length;
                    const allInMeetingSelected = courses.length > 0 && selectedInMeetingCount === courses.length;

                    return (
                    <div key={rNum} className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
                      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-950 bg-amber-400 px-2 py-0.5 rounded text-xs">
                            {rNum}
                          </span>
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {courses[0]?.hippodrome || 'Hippodrome'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({courses.length} courses)
                          </span>
                        </div>

                        {/* Bouton pour cocher / décocher toutes les courses de la réunion en un clic */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleAllRacesInMeeting(courses);
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            allInMeetingSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-1 ring-amber-300'
                              : selectedInMeetingCount > 0
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                              : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-700 hover:border-amber-500/50 hover:bg-slate-800'
                          }`}
                          title={
                            allInMeetingSelected
                              ? `Décocher toutes les ${courses.length} courses de ${rNum}`
                              : `Cocher toutes les ${courses.length} courses de ${rNum} en 1 clic pour PROCHAINE COURSE`
                          }
                        >
                          {allInMeetingSelected ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Toute la réunion cochée ({selectedInMeetingCount}/{courses.length})</span>
                            </>
                          ) : selectedInMeetingCount > 0 ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cocher toute la réunion ({selectedInMeetingCount}/{courses.length})</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                              <span>Cocher toute la réunion {rNum} ({courses.length})</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="divide-y divide-slate-800/60">
                        {courses.map((c) => {
                          const isRacePositioned = selectedNextRaceIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              className={`p-3 transition-colors flex items-center justify-between gap-3 flex-wrap ${
                                isRacePositioned
                                  ? 'bg-amber-950/25 border-l-4 border-amber-500 hover:bg-amber-950/35'
                                  : 'hover:bg-slate-900/50'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap min-w-0">
                                {/* Case à cocher pour choisir les courses à positionner dans PROCHAINE COURSE */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleRaceForUpcomingTab(c);
                                  }}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition-all shrink-0 ${
                                    isRacePositioned
                                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold shadow-xs ring-1 ring-amber-500/40'
                                      : 'bg-slate-950/80 border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200'
                                  }`}
                                  title="Cliquer pour cocher/décocher cette course dans l'onglet PROCHAINE COURSE"
                                >
                                  {isRacePositioned ? (
                                    <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                                  )}
                                  <span className="text-[11px] font-bold">
                                    {isRacePositioned
                                      ? '📌 Positionnée (PROCHAINE COURSE)'
                                      : 'Positionner dans PROCHAINE COURSE'}
                                  </span>
                                </button>

                                {/* Compte à rebours dynamique en temps réel placé devant chaque course */}
                                <div className="shrink-0 font-mono">
                                  <CountdownTimer date={c.date || selectedDate} heure={c.heure} compact />
                                </div>
                                <span className="font-mono font-bold text-amber-400 text-xs w-8 text-center shrink-0 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                  {c.courseNumero}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-white flex items-center gap-1">
                                      {c.estQuinte && <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                                      <span>{c.nomCoursePhare}</span>
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                      {c.discipline}
                                    </span>
                                    {c.corde && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-amber-300/80">
                                        {c.corde}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      {c.heure}
                                    </span>
                                    <span>{c.distance}m</span>
                                    <span className={c.nombrePartants >= 9 ? 'text-amber-300/90 font-medium' : ''}>
                                      {c.nombrePartants} partants
                                    </span>
                                    <span>{Number(c.allocation).toLocaleString()} €</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {onSelectMeeting && (
                                  <button
                                    onClick={() => {
                                      onSelectMeeting(c);
                                      onClose();
                                    }}
                                    className="text-xs bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                    title="Charger et analyser cette course maintenant"
                                  >
                                    <Zap className="w-3.5 h-3.5 text-amber-400 hover:text-slate-950" />
                                    <span>Charger Course</span>
                                  </button>
                                )}
                                <a
                                  href={`https://online.turfinfo.api.pmu.fr/rest/client/1/programme/${c.id.replace('pmu-live-', '').split('-')[0]}/${rNum}/${c.courseNumero}/participants?specialisation=INTERNET`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-500 hover:text-amber-400 p-1.5 rounded"
                                  title="Voir JSON PMU officiel"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : TESTEUR D'ENDPOINTS LIVE */}
          {activeTab === 'tester' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  <span>Sélectionnez un Endpoint Officiel à Tester en Direct</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Type d'Endpoint :</label>
                    <select
                      value={testEndpoint}
                      onChange={(e) => setTestEndpoint(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="programme_jour">1. Programme d'une date (/api/pmu/programme/:date)</option>
                      <option value="programme_complet">2. Programme complet normalisé (/api/pmu/programme-complet/:date)</option>
                      <option value="reunion_detail">3. Détail d'une réunion (/api/pmu/programme/:date/:reunion)</option>
                      <option value="course_detail">4. Détail d'une course (/api/pmu/:date/:reunion/:course)</option>
                      <option value="participants">5. Partants & cotes (/api/pmu/participants/:date/:reunion/:course)</option>
                      <option value="rapports">6. Rapports définitifs (/api/pmu/rapports/:date/:reunion/:course)</option>
                      <option value="open_pmu_arrivees">7. Arrivées Open PMU API (/api/open-pmu/arrivees?date=...)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {(testEndpoint === 'reunion_detail' || testEndpoint === 'course_detail' || testEndpoint === 'participants' || testEndpoint === 'rapports') && (
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-300 block mb-1">Réunion :</label>
                        <input
                          type="text"
                          value={testReunion}
                          onChange={(e) => setTestReunion(e.target.value)}
                          placeholder="R1"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {(testEndpoint === 'course_detail' || testEndpoint === 'participants' || testEndpoint === 'rapports') && (
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-300 block mb-1">Course :</label>
                        <input
                          type="text"
                          value={testCourse}
                          onChange={(e) => setTestCourse(e.target.value)}
                          placeholder="C4"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    <div className="flex-1 self-end">
                      <button
                        onClick={runEndpointTest}
                        disabled={testLoading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Play className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin' : ''}`} />
                        <span>Tester l'appel</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Résultat JSON du test */}
              {testResult && (
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Statut HTTP :</span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          testStatusCode === 200
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {testStatusCode} {testStatusCode === 200 ? 'OK' : 'Notice'}
                      </span>
                      {testLatencyMs !== null && (
                        <span className="text-xs font-mono text-slate-400">
                          Latence : {testLatencyMs} ms
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copié !' : 'Copier JSON'}</span>
                    </button>
                  </div>

                  <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 3 : GUIDE D'INTÉGRATION */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>Catalogue des Endpoints Essentiels PMU TurfInfo & Open PMU</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                        <th className="py-2 px-3">Endpoint</th>
                        <th className="py-2 px-3">Méthode</th>
                        <th className="py-2 px-3">Format Paramètres</th>
                        <th className="py-2 px-3">Objectif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      <tr>
                        <td className="py-2 px-3 text-amber-400">/api/pmu/programme/:date</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                        <td className="py-2 px-3 text-slate-400">JJMMAAAA ou YYYY-MM-DD</td>
                        <td className="py-2 px-3 font-sans text-slate-300">Récupérer toutes les réunions et courses de la journée</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-amber-400">/api/pmu/programme/:date/:reunion</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                        <td className="py-2 px-3 text-slate-400">date: JJMMAAAA, reunion: R1</td>
                        <td className="py-2 px-3 font-sans text-slate-300">Détail d'une réunion spécifique avec toutes ses épreuves</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-amber-400">/api/pmu/:date/:reunion/:course</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                        <td className="py-2 px-3 text-slate-400">date, reunion (R1), course (C4)</td>
                        <td className="py-2 px-3 font-sans text-slate-300">Conditions de la course + participants bruts</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-amber-400">/api/pmu/participants/:date/:reunion/:course</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                        <td className="py-2 px-3 text-slate-400">date, reunion, course</td>
                        <td className="py-2 px-3 font-sans text-slate-300">Partants normalisés (poids / 10, corde, cotes directes)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-amber-400">/api/pmu/rapports/:date/:reunion/:course</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                        <td className="py-2 px-3 text-slate-400">date, reunion, course</td>
                        <td className="py-2 px-3 font-sans text-slate-300">Rapports définitifs (Simple, Couplé, Trio, Quinté)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-sky-400">/api/open-pmu/arrivees?date=...</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                        <td className="py-2 px-3 text-slate-400">date: YYYY-MM-DD ou MM/DD/YYYY</td>
                        <td className="py-2 px-3 font-sans text-slate-300">Arrivées officielles passées pour le backtesting</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  <span>Pipeline de Transformation & Normalisation</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5">
                    <span className="font-bold text-white block">1. Normalisation des Poids</span>
                    <p className="text-slate-400 text-[11px]">
                      L'API PMU transmet <code className="text-amber-400">handicapPoids: 605</code> ou <code className="text-amber-400">poidsConditionMonte: 605</code> en dixièmes de kg. Le moteur normalise automatiquement vers <code className="text-emerald-400">60.5 kg</code>.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5">
                    <span className="font-bold text-white block">2. Cotes Directes & Référence</span>
                    <p className="text-slate-400 text-[11px]">
                      Extraction de <code className="text-amber-400">dernierRapportDirect.rapport</code> (cote temps réel) et <code className="text-amber-400">dernierRapportReference.rapport</code> pour alimenter le radar spéculatif et le calcul d'évolution.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5">
                    <span className="font-bold text-white block">3. Détection Quinté+</span>
                    <p className="text-slate-400 text-[11px]">
                      Inspection du tableau <code className="text-amber-400">paris[]</code> de la course : si un code de pari contient <code className="text-amber-400">QUINTE</code>, l'épreuve est immédiatement labellisée Quinté+ prioritaire.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5">
                    <span className="font-bold text-white block">4. Archivage & Arrivées</span>
                    <p className="text-slate-400 text-[11px]">
                      Dès l'officialisation de la course, consultation des rapports définitifs et de l'Open PMU API pour sceller les cotes et vérifier la rentabilité des paris.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page modal */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Flux officiel PMU TurfInfo connecté : online.turfinfo.api.pmu.fr</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
