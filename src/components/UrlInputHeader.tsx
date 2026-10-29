import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Globe, AlertTriangle, CheckCircle2, Sparkles, Star, Calendar, ClipboardPaste, History, Lock, X, ShieldAlert, Smartphone, Clock, Zap, ChevronLeft, ChevronRight, RotateCcw, Tv, Monitor, Laptop, Cpu, Sliders, Bell, Volume2, Trophy, Crown, Terminal, CheckSquare, Square, MinusSquare, ChevronDown, ChevronUp, Database, Layers, Filter, Maximize2, Minimize2, Phone } from 'lucide-react';
import { validateTurfUrl } from '../utils/turfUrlValidator';
import { CourseHippique, PmuMeeting, TurfSource } from '../types/turf';
import { UserProfile } from '../types/userAuth';
import { ThemeToggleWidget } from './ThemeToggleWidget';
import { CountdownTimer } from './CountdownTimer';
import { getRaceParisTargetTime } from '../utils/raceCountdown';
import { normalizeDateForQuery, getIvoryCoastDate } from '../utils/timeConversion';
import { PMU_SUNDAY_11_MEETINGS, getCuratedPmuMeetings, PMU_TOULOUSE_R5_MEETINGS } from '../data/pmuMeetingsData';
import { PLR_FRIDAY_02_MEETINGS } from '../data/plrFriday02Data';
import { HeaderDatePicker } from './HeaderDatePicker';
import { BandePassanteArrivees } from './BandePassanteArrivees';
import { GroundingArrivalsModal } from './GroundingArrivalsModal';
import { PWAInstallButton } from './PWAInstallButton';
import { RaceDelayModal } from './RaceDelayModal';
import { buildRealV38Synthese } from '../utils/v38Helper';

interface UrlInputHeaderProps {
  currentUrl: string;
  currentCourse?: CourseHippique | null;
  onAnalyze: (url: string, exactPartantsCount?: number, rawPartantsText?: string) => void;
  onSelectCourse?: (course: CourseHippique) => void;
  onResetSession?: () => void;
  onRefreshOdds?: () => void;
  onUpdateArrival?: (arrivalStr: string) => void;
  isRefreshingOdds?: boolean;
  isLoading: boolean;
  activeSource?: TurfSource;
  favoritesCount?: number;
  historyCount?: number;
  currentUser?: UserProfile | null;
  isExpertMode?: boolean;
  onToggleExpertMode?: () => void;
  onOpenFavorites?: () => void;
  onOpenCalendar?: () => void;
  onOpenHistory?: () => void;
  onOpenQuinteHierarchy?: () => void;
  onOpenUserSpace?: (customPrompt?: string) => void;
  onOpenRacesCatalogue?: () => void;
  onOpenAdmin?: () => void;
  onOpenLinksModal?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenInstallModal?: () => void;
  onOpenAiQuotas?: () => void;
  onOpenSubscription?: () => void;
  onOpenPmuApiHub?: () => void;
  hasScraperLogs?: boolean;
  onOpenScraperLogs?: () => void;
  isRestrictedMode?: boolean;
}

interface UpcomingRaceRef {
  id: string;
  reunionCourse: string;
  nomCourse: string;
  hippodrome: string;
  heure: string;
  date: string;
  discipline: string;
  distance?: number | string;
  estQuinte?: boolean;
  sourceUrl: string;
  fullCourseObject?: CourseHippique;
  nombrePartants: number;
}

function convertMeetingToCourseHippique(m: PmuMeeting): CourseHippique {
  const distNum = typeof m.distance === 'number' ? m.distance : parseInt(String(m.distance || '2100').replace(/\D/g, ''), 10) || 2100;
  const cordeVal: 'Droite' | 'Gauche' = m.corde === 'Droite' ? 'Droite' : 'Gauche';
  const allocNum = typeof m.allocation === 'number' ? m.allocation : parseInt(String(m.allocation || '30000').replace(/\D/g, ''), 10) || 30000;

  const hippoSlug = (m.hippodrome || 'Hippodrome').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
  const courseSlug = (m.nomCoursePhare || m.description || 'Course').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
  const numericId = String(m.id || '').replace(/\D/g, '') || '1482910';
  const defaultDateStr = m.date || 'Dimanche 11 Octobre 2026';
  const dateSlug = normalizeDateForQuery(defaultDateStr) || '2026-10-11';
  const constructedGenyUrl = `https://www.geny.com/partants-pmu/${dateSlug}-${hippoSlug}-pmu-${courseSlug}_c${numericId}`;

  const basePartants = (m.partants && m.partants.length >= 10)
    ? m.partants
    : Array.from({ length: m.nombrePartants || 14 }, (_, idx) => {
        const num = idx + 1;
        const trotDrivers = ['E. RAFFIN', 'F. NIVARD', 'M. ABRIVARD', 'Y. LEBOURGEOIS', 'D. THOMAIN', 'A. BARRIER', 'B. ROCHARD', 'CH. MOTTIER'];
        const galopJockeys = ['M. GUYON', 'C. SOUMILLON', 'M. BARZALONA', 'S. PASQUIER', 'A. POUCHIN', 'T. BACHELOT', 'C. DEMURO', 'A. LEMAITRE'];
        const isGalop = (m.discipline || '').toLowerCase().includes('plat') || (m.discipline || '').toLowerCase().includes('haie') || (m.discipline || '').toLowerCase().includes('steeple');
        const driverList = isGalop ? galopJockeys : trotDrivers;
        return {
          numero: num,
          nom: `PARTANT OFFICIEL N°${num}`,
          driver: driverList[(num - 1) % driverList.length],
          entraineur: 'J.M. BAZIRE',
          musique: isGalop ? '2p 1p 4p' : '1a 2a 3a Da',
          coteProbable: +(3.8 + num * 2.1).toFixed(1),
          ferrure: isGalop ? undefined : (num % 2 === 0 ? 'D4' : 'DP'),
          distance: distNum,
          gains: 45000 + num * 12000,
          age: 5,
          sexe: (num % 3 === 0 ? 'F' : 'M') as 'M' | 'F' | 'H',
          hippoScore: Math.max(50, Math.min(94, 94 - idx * 2.5)),
          statut: idx < 3 ? 'Favori' : idx < 7 ? 'Seconde chance' : 'Outsider',
        };
      });

  const hasRealPartants = Boolean(
    m.partants &&
    m.partants.length >= 2 &&
    m.partants.some((p: any) => p.nom && !p.nom.toUpperCase().includes('PARTANT OFFICIEL'))
  );

  const baseCourse = {
    id: m.id,
    sourceUrl: m.lienGeny || constructedGenyUrl,
    sourceType: 'pmu.lonacionline.ci' as const,
    isPlaceholder: !hasRealPartants,
    titre: `${m.nomCoursePhare} (${m.reunion} ${m.courseNumero}) - ${m.hippodrome}`,
    prixNom: m.nomCoursePhare,
    hippodrome: m.hippodrome,
    reunion: m.reunion || 'R1',
    course: m.courseNumero || 'C1',
    estQuinte: Boolean(m.estQuinte),
    estPick5: Boolean(m.estPick5),
    discipline: m.discipline as any,
    date: m.date || defaultDateStr,
    heure: m.heure || '12h00',
    distance: distNum,
    corde: cordeVal,
    terrain: 'Bon',
    allocation: allocNum,
    conditions: m.description,
    statutCourse: (m.statut?.toLowerCase().includes('termin') || Boolean(m.arriveeOfficielle)) ? ('Arrivée officielle' as const) : ('À venir' as const),
    arriveeOfficielle: m.arriveeOfficielle,
    partants: basePartants.map((p) => {
      const pDist = typeof p.distance === 'number' ? p.distance : parseInt(String(p.distance || distNum).replace(/\D/g, ''), 10) || distNum;
      return {
        numero: p.numero,
        nom: p.nom,
        driver: p.driver,
        entraineur: p.entraineur,
        musique: p.musique,
        coteProbable: p.coteProbable,
        ferrure: p.ferrure as any,
        distance: pDist,
        gains: p.gains,
        age: p.age,
        sexe: p.sexe,
        hippoScore: p.hippoScore,
        statut: p.statut as any,
      };
    }),
  };

  return {
    ...baseCourse,
    synthese: buildRealV38Synthese(baseCourse as unknown as CourseHippique),
  };
}

function getReunionColorClasses(rNum: string) {
  switch ((rNum || '').toUpperCase()) {
    case 'R1':
      return {
        bg: 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-xs',
        badge: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
        ring: 'ring-amber-400/50',
      };
    case 'R2':
      return {
        bg: 'bg-emerald-400 text-slate-950 font-black border-emerald-300 shadow-xs',
        badge: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
        ring: 'ring-emerald-400/50',
      };
    case 'R3':
      return {
        bg: 'bg-purple-400 text-slate-950 font-black border-purple-300 shadow-xs',
        badge: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
        ring: 'ring-purple-400/50',
      };
    case 'R4':
      return {
        bg: 'bg-teal-400 text-slate-950 font-black border-teal-300 shadow-xs',
        badge: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
        ring: 'ring-teal-400/50',
      };
    case 'R5':
      return {
        bg: 'bg-sky-400 text-slate-950 font-black border-sky-300 shadow-xs',
        badge: 'text-sky-400 bg-sky-500/20 border-sky-500/30',
        ring: 'ring-sky-400/50',
      };
    default:
      return {
        bg: 'bg-slate-300 text-slate-950 font-black border-slate-200 shadow-xs',
        badge: 'text-slate-300 bg-slate-500/20 border-slate-500/30',
        ring: 'ring-slate-400/50',
      };
  }
}

export const UrlInputHeader: React.FC<UrlInputHeaderProps> = ({
  currentUrl,
  currentCourse,
  onAnalyze,
  onSelectCourse,
  onResetSession,
  onRefreshOdds,
  onUpdateArrival,
  isRefreshingOdds = false,
  isLoading,
  activeSource,
  favoritesCount = 0,
  historyCount = 0,
  currentUser,
  onOpenFavorites,
  onOpenCalendar,
  onOpenHistory,
  onOpenQuinteHierarchy,
  onOpenUserSpace,
  onOpenAdmin,
  onOpenLinksModal,
  onNavigateTab,
  onOpenInstallModal,
  onOpenAiQuotas,
  onOpenSubscription,
  onOpenPmuApiHub,
  isExpertMode,
  onToggleExpertMode,
  hasScraperLogs,
  onOpenScraperLogs,
  isRestrictedMode,
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [upcomingIndex, setUpcomingIndex] = useState<number>(0);
  const [calendarVersion, setCalendarVersion] = useState<number>(0);
  const [selectedFilterDate, setSelectedFilterDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hippo_selected_date');
      if (saved) return saved;
    } catch {}
    return getIvoryCoastDate(0);
  });

  // Filtre des courses par numéro de réunion (ex: 'all', 'R1', 'R2', 'R3'...)
  const [selectedReunion, setSelectedReunion] = useState<string>('all');

  // Réinitialiser le filtre de réunion lors d'un changement de date
  useEffect(() => {
    setSelectedReunion('all');
  }, [selectedFilterDate]);

  // Écouter les changements automatiques de date à minuit GMT
  useEffect(() => {
    const handleDateChange = (e: any) => {
      if (e.detail?.date) {
        setSelectedFilterDate(e.detail.date);
      }
    };
    window.addEventListener('hippoanalyse-date-filter-changed', handleDateChange);
    return () => window.removeEventListener('hippoanalyse-date-filter-changed', handleDateChange);
  }, []);

  // Horloge en temps réel pour la bannière
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    const handleOpenModal = () => setIsDelayModalOpen(true);
    window.addEventListener('hippo_open_delay_modal', handleOpenModal);
  }, []);

  // Gestion du Mode Plein Écran via l'API Fullscreen natif
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Erreur lors du passage en plein écran:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Erreur lors de la sortie du plein écran:', err);
        });
      }
    }
  };

  // Afficher / masquer la grille détaillée de sélection des courses (Masquée par défaut)
  const [showRaceSelectionGrid, setShowRaceSelectionGrid] = useState<boolean>(false);

  // Extraction en Temps Réel des Arrivées via Grounding Google Search (paristurf.com & pmu.fr)
  const [showParisTurfModal, setShowParisTurfModal] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isFetchingParisTurf, setIsFetchingParisTurf] = useState(false);
  const [parisTurfArrivals, setParisTurfArrivals] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hippo_live_arrivals_cache');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleFetchParisTurfDirect = async (isBackground = false) => {
    if (!isBackground) {
      setIsFetchingParisTurf(true);
      setShowParisTurfModal(true);
    }
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const resp = await fetch('/api/extract-arrivals-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'all', date: selectedFilterDate && selectedFilterDate !== 'all' ? selectedFilterDate : todayIso })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.arrivals && Array.isArray(data.arrivals)) {
          setParisTurfArrivals(data.arrivals);
          try {
            localStorage.setItem('hippo_live_arrivals_cache', JSON.stringify(data.arrivals));
          } catch {}
        }
      } else {
        // Fallback vers /api/paris-turf-arrivals/refresh
        const fbResp = await fetch('/api/paris-turf-arrivals/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: selectedFilterDate })
        });
        if (fbResp.ok) {
          const fbData = await fbResp.json();
          setParisTurfArrivals(fbData.arrivals || []);
        }
      }
    } catch (_err) {
    } finally {
      if (!isBackground) setIsFetchingParisTurf(false);
    }
  };

  // Écouter les extractions manuelles effectuées depuis la modale
  useEffect(() => {
    const handleExtracted = (e: any) => {
      if (e.detail?.arrivals && Array.isArray(e.detail.arrivals)) {
        setParisTurfArrivals(e.detail.arrivals);
      }
    };
    window.addEventListener('hippo_live_arrivals_extracted', handleExtracted);
    return () => window.removeEventListener('hippo_live_arrivals_extracted', handleExtracted);
  }, []);

  // Fetch initial arrivals and setup background polling
  useEffect(() => {
    Promise.resolve().then(() => handleFetchParisTurfDirect(true));
    const tickerInterval = setInterval(() => {
      handleFetchParisTurfDirect(true);
    }, 60000); // Rafraîchir toutes les minutes en arrière-plan
    return () => clearInterval(tickerInterval);
  }, [selectedFilterDate]);

  // Formatage en temps réel en français (ex: "29 septembre 2026 à 20:20:20")
  const formattedUpdateTimestamp = useMemo(() => {
    const d = currentDateTime;
    const day = d.getDate();
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${day} ${month} ${year} à ${hours}:${minutes}:${seconds}`;
  }, [currentDateTime]);

  // Formatage de la date du jour en direct (ex: "Mardi 29 Septembre 2026")
  const formattedCurrentDay = useMemo(() => {
    const d = currentDateTime;
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const dayName = days[d.getDay()];
    const day = d.getDate();
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName} ${day} ${monthName} ${year}`;
  }, [currentDateTime]);

  // Synchronisation avec currentUrl si vidée ou changée de l'extérieur
  useEffect(() => {
    setInputUrl(currentUrl || '');
  }, [currentUrl]);

  // Écoute dynamique des mises à jour et vidages du calendrier et changement de date
  React.useEffect(() => {
    const handleUpdate = () => setCalendarVersion((v) => v + 1);
    const handleDateEvent = (e: any) => {
      if (e.detail?.date) {
        setSelectedFilterDate(e.detail.date);
        setCalendarVersion((v) => v + 1);
      }
    };
    window.addEventListener('hippo_calendar_updated', handleUpdate);
    window.addEventListener('hippoanalyse-calendar-updated', handleUpdate);
    window.addEventListener('hippoanalyse-date-filter-changed', handleDateEvent);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('hippo_calendar_updated', handleUpdate);
      window.removeEventListener('hippoanalyse-calendar-updated', handleUpdate);
      window.removeEventListener('hippoanalyse-date-filter-changed', handleDateEvent);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Choix des courses à positionner sous l'espace de collage de lien ("PROCHAINE COURSE")
  const [selectedRaceIds, setSelectedRaceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hippo_selected_next_race_ids');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['__UNINITIALIZED__'];
  });

  // Synchronisation avec les modifications provenant du Centre d'Actualisation Quotidienne & Connecteur PMU API
  useEffect(() => {
    const handleSelectedRacesSync = (e?: any) => {
      try {
        let newIds: string[] | null = null;
        if (e?.detail?.selectedRaceIds && Array.isArray(e.detail.selectedRaceIds)) {
          newIds = e.detail.selectedRaceIds;
        } else if (e?.detail?.ids && Array.isArray(e.detail.ids)) {
          newIds = e.detail.ids;
        } else {
          const saved = localStorage.getItem('hippo_selected_next_race_ids');
          if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) newIds = parsed;
          }
        }
        if (newIds) {
          setTimeout(() => {
            setSelectedRaceIds(newIds!);
          }, 0);
        }
      } catch {}
    };

    window.addEventListener('hippo_selected_races_changed', handleSelectedRacesSync);
    window.addEventListener('storage', handleSelectedRacesSync);
    return () => {
      window.removeEventListener('hippo_selected_races_changed', handleSelectedRacesSync);
      window.removeEventListener('storage', handleSelectedRacesSync);
    };
  }, []);

  // Construction dynamique et persistante du calendrier des courses filtré par date
  const upcomingRacesList = useMemo<UpcomingRaceRef[]>(() => {
    const list: UpcomingRaceRef[] = [];
    const isCleared = typeof window !== 'undefined' && localStorage.getItem('hippo_calendar_cleared') === 'true';
    const isCustom = typeof window !== 'undefined' && localStorage.getItem('hippo_is_custom_import') === 'true';

    // Si l'utilisateur a explicitement vidé le calendrier et n'a pas encore importé de nouvelles courses
    if (isCleared && !isCustom) {
      return [];
    }

    let meetingsToLoad: PmuMeeting[] = [];
    try {
      const stored = localStorage.getItem('hippo_calendar_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
          meetingsToLoad = parsed.meetings;
        }
      }
    } catch {}

    if (meetingsToLoad.length === 0) {
      meetingsToLoad = PMU_SUNDAY_11_MEETINGS;
    } else {
      const toulouseCoursesCount = meetingsToLoad.filter(
        (m) => m.reunion === 'R5' && (m.hippodrome || '').toLowerCase().includes('toulouse')
      ).length;
      if (toulouseCoursesCount < 6) {
        meetingsToLoad = [
          ...meetingsToLoad.filter(
            (m) => !(m.reunion === 'R5' && (m.hippodrome || '').toLowerCase().includes('toulouse'))
          ),
          ...PMU_TOULOUSE_R5_MEETINGS,
        ];
      }
    }

    if (selectedFilterDate && selectedFilterDate !== 'all') {
      const norm = normalizeDateForQuery(selectedFilterDate);
      meetingsToLoad = meetingsToLoad.filter((m) => {
        const mNorm = normalizeDateForQuery(m.date || '');
        const matchesDate = m.date === selectedFilterDate || (norm && mNorm && norm === mNorm);
        return matchesDate || selectedRaceIds.includes(m.id);
      });
    }

    // Charger l'intégralité des courses officielles du programme (EXCLUSIVEMENT 9 PARTANTS ET PLUS OU COCHÉES)
    meetingsToLoad.forEach((m: any) => {
      const fullCourse = convertMeetingToCourseHippique(m);
      const partantsCount = m.partants && m.partants.length > 0
        ? m.partants.length
        : (m.exactPartantsCount || m.nombrePartants || (fullCourse.partants && fullCourse.partants.length > 0 ? fullCourse.partants.length : 0));

      // Filtre impératif : Affiche les courses de 9 partants et plus, OU celles expressément cochées pour la Prochaine Course
      if (partantsCount >= 9 || selectedRaceIds.includes(m.id)) {
        list.push({
          id: m.id,
          reunionCourse: `${m.reunion} ${m.courseNumero}`,
          nomCourse: m.nomCoursePhare,
          hippodrome: m.hippodrome,
          heure: m.heure,
          date: m.date || 'Mardi 29 Septembre 2026',
          discipline: m.discipline,
          distance: m.distance,
          estQuinte: m.estQuinte,
          sourceUrl: fullCourse.sourceUrl,
          fullCourseObject: fullCourse,
          nombrePartants: partantsCount,
        });
      }
    });

    // Tri chronologique rigoureux des courses du programme par heure de départ
    list.sort((a, b) => {
      const targetA = getRaceParisTargetTime(a.date, a.heure).getTime();
      const targetB = getRaceParisTargetTime(b.date, b.heure).getTime();
      return targetA - targetB;
    });

    return list;
  }, [calendarVersion, selectedFilterDate, selectedRaceIds]);

  // Initialisation par défaut si aucune sélection n'a encore été sauvegardée
  useEffect(() => {
    if (upcomingRacesList.length > 0 && selectedRaceIds.length === 1 && selectedRaceIds[0] === '__UNINITIALIZED__') {
      const initial = [upcomingRacesList[0].id];
      setSelectedRaceIds(initial);
      try {
        localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify(initial));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hippo_selected_races_changed', { detail: { selectedRaceIds: initial } }));
        }, 0);
      } catch {}
    }
  }, [upcomingRacesList, selectedRaceIds]);

  const toggleRaceSelection = (id: string) => {
    const cleanPrev = selectedRaceIds.filter((x) => x !== '__UNINITIALIZED__');
    const next = cleanPrev.includes(id)
      ? cleanPrev.filter((rId) => rId !== id)
      : [...cleanPrev, id];
    setSelectedRaceIds(next);
    try {
      localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify(next));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hippo_selected_races_changed', { detail: { selectedRaceIds: next } }));
      }, 0);
    } catch {}
  };

  const handleSelectAllRaces = () => {
    const allIds = upcomingRacesList.map((r) => r.id);
    setSelectedRaceIds(allIds);
    try {
      localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify(allIds));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hippo_selected_races_changed', { detail: { selectedRaceIds: allIds } }));
      }, 0);
    } catch {}
  };

  const handleDeselectAllRaces = () => {
    setSelectedRaceIds([]);
    try {
      localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify([]));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hippo_selected_races_changed', { detail: { selectedRaceIds: [] } }));
      }, 0);
    } catch {}
  };

  // Liste des courses positionnées/sélectionnées sous l'espace de collage de lien (UNIQUEMENT celles cochées)
  // Triées rigoureusement selon l'ordre chronologique de leur heure de départ
  const pinnedUpcomingRaces = useMemo(() => {
    if (upcomingRacesList.length === 0) return [];
    let list: UpcomingRaceRef[];
    if (selectedRaceIds.length === 1 && selectedRaceIds[0] === '__UNINITIALIZED__') {
      list = upcomingRacesList.slice(0, 1);
    } else {
      list = upcomingRacesList.filter((r) => selectedRaceIds.includes(r.id));
    }
    return list.slice().sort((a, b) => {
      const targetA = getRaceParisTargetTime(a.date, a.heure).getTime();
      const targetB = getRaceParisTargetTime(b.date, b.heure).getTime();
      return targetA - targetB;
    });
  }, [upcomingRacesList, selectedRaceIds]);

  // Mode d'affichage de la rubrique PROCHAINE COURSE : 'single' = Une par une chronologique (demandé par l'utilisateur), 'all' = Liste complète
  const [pinnedViewMode, setPinnedViewMode] = useState<'single' | 'all'>('single');
  const [activePinnedIndex, setActivePinnedIndex] = useState<number>(0);

  // Maintien d'un index valide dans la liste des courses cochées
  useEffect(() => {
    if (pinnedUpcomingRaces.length === 0) {
      setActivePinnedIndex(0);
      return;
    }
    if (activePinnedIndex >= pinnedUpcomingRaces.length) {
      setActivePinnedIndex(0);
    }
  }, [pinnedUpcomingRaces.length, activePinnedIndex]);

  // Avancement automatique fluide : se positionne sur la première course cochée non démarrée (heure future)
  useEffect(() => {
    if (pinnedUpcomingRaces.length === 0) return;

    const selectNextPinnedRace = () => {
      const now = Date.now();
      const firstUpcomingIdx = pinnedUpcomingRaces.findIndex((r) => {
        const target = getRaceParisTargetTime(r.date, r.heure).getTime();
        return target > now;
      });

      if (firstUpcomingIdx !== -1) {
        const currentActive = pinnedUpcomingRaces[activePinnedIndex];
        if (!currentActive) {
          setActivePinnedIndex(firstUpcomingIdx);
        } else {
          const currentTarget = getRaceParisTargetTime(currentActive.date, currentActive.heure).getTime();
          if (currentTarget <= now) {
            setActivePinnedIndex(firstUpcomingIdx);
          }
        }
      }
    };

    selectNextPinnedRace();
    const interval = setInterval(selectNextPinnedRace, 5000);
    return () => clearInterval(interval);
  }, [pinnedUpcomingRaces, activePinnedIndex]);

  const handleNextPinned = () => {
    if (pinnedUpcomingRaces.length === 0) return;
    setActivePinnedIndex((prev) => (prev + 1) % pinnedUpcomingRaces.length);
  };

  const handlePrevPinned = () => {
    if (pinnedUpcomingRaces.length === 0) return;
    setActivePinnedIndex((prev) => (prev - 1 + pinnedUpcomingRaces.length) % pinnedUpcomingRaces.length);
  };

  // Liste dynamique des réunions du jour disponibles pour le filtre du menu déroulant (R1, R2, R3...)
  const availableReunions = useMemo(() => {
    const map = new Map<string, string>();
    upcomingRacesList.forEach((r) => {
      const parts = (r.reunionCourse || '').trim().split(/\s+/);
      const rNum = parts[0]?.toUpperCase();
      if (rNum && rNum.startsWith('R') && !map.has(rNum)) {
        map.set(rNum, r.hippodrome || 'Hippodrome');
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [upcomingRacesList]);

  // Courses filtrées selon la réunion sélectionnée dans l'en-tête
  const displayedUpcomingRaces = useMemo(() => {
    if (!selectedReunion || selectedReunion === 'all') return upcomingRacesList;
    return upcomingRacesList.filter((r) => {
      const parts = (r.reunionCourse || '').trim().split(/\s+/);
      return parts[0]?.toUpperCase() === selectedReunion.toUpperCase();
    });
  }, [upcomingRacesList, selectedReunion]);

  // État d'ouverture du menu déroulant Réunion avec cases à cocher
  const [isReunionDropdownOpen, setIsReunionDropdownOpen] = useState<boolean>(false);
  const reunionDropdownRef = useRef<HTMLDivElement | null>(null);

  // Fermer le menu déroulant lors d'un clic extérieur ou appui sur Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reunionDropdownRef.current && !reunionDropdownRef.current.contains(event.target as Node)) {
        setIsReunionDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReunionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Calcul dynamique détaillé de chaque réunion : courses, sélection, partants, première course
  const reunionStats = useMemo(() => {
    return availableReunions.map(([rNum, hippo]) => {
      const meetingRaces = upcomingRacesList.filter((r) => {
        const parts = (r.reunionCourse || '').trim().split(/\s+/);
        return (parts[0] || '').toUpperCase() === rNum.toUpperCase();
      });
      const totalCount = meetingRaces.length;
      const checkedRaces = meetingRaces.filter((r) => selectedRaceIds.includes(r.id));
      const checkedCount = checkedRaces.length;
      const isFullyChecked = totalCount > 0 && checkedCount === totalCount;
      const isPartiallyChecked = checkedCount > 0 && checkedCount < totalCount;
      const firstRace = meetingRaces.find((r) => r.estQuinte) || meetingRaces[0];

      return {
        rNum,
        hippo,
        totalCount,
        checkedCount,
        isFullyChecked,
        isPartiallyChecked,
        meetingRaces,
        firstRace,
      };
    });
  }, [availableReunions, upcomingRacesList, selectedRaceIds]);

  const totalCheckedRacesCount = useMemo(() => {
    return upcomingRacesList.filter((r) => selectedRaceIds.includes(r.id)).length;
  }, [upcomingRacesList, selectedRaceIds]);

  const checkedReunionsCount = useMemo(() => {
    return reunionStats.filter((s) => s.isFullyChecked || s.isPartiallyChecked).length;
  }, [reunionStats]);

  const allReunionsFullyChecked = useMemo(() => {
    return reunionStats.length > 0 && reunionStats.every((s) => s.isFullyChecked);
  }, [reunionStats]);

  // Cocher ou décocher toutes les courses d'une réunion spécifique
  const handleToggleMeetingSelection = (rNum: string, forceSelect?: boolean) => {
    const meetingRaces = upcomingRacesList.filter((r) => {
      const parts = (r.reunionCourse || '').trim().split(/\s+/);
      return (parts[0] || '').toUpperCase() === rNum.toUpperCase();
    });
    const meetingRaceIds = meetingRaces.map((r) => r.id);
    if (meetingRaceIds.length === 0) return;

    const cleanPrev = selectedRaceIds.filter((x) => x !== '__UNINITIALIZED__');
    const allSelected = meetingRaceIds.every((id) => cleanPrev.includes(id));
    const shouldSelect = forceSelect !== undefined ? forceSelect : !allSelected;
    let next: string[];
    if (!shouldSelect) {
      next = cleanPrev.filter((id) => !meetingRaceIds.includes(id));
    } else {
      next = Array.from(new Set([...cleanPrev, ...meetingRaceIds]));
    }
    setSelectedRaceIds(next);
    try {
      localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify(next));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hippo_selected_races_changed', { detail: { selectedRaceIds: next } }));
      }, 0);
    } catch {}
  };

  const handleSelectAllMeetingRaces = (rNum: string) => {
    handleToggleMeetingSelection(rNum);
  };

  // Cocher une réunion et lancer directement l'analyse de sa course phare / 1ère course
  const handleAnalyzeMeetingDirectly = (rNum: string) => {
    handleToggleMeetingSelection(rNum, true);
    const meetingRaces = upcomingRacesList.filter((r) => {
      const parts = (r.reunionCourse || '').trim().split(/\s+/);
      return (parts[0] || '').toUpperCase() === rNum.toUpperCase();
    });
    if (meetingRaces.length > 0) {
      const targetRace = meetingRaces.find((r) => r.estQuinte) || meetingRaces[0];
      handleAnalyzeUpcomingRace(targetRace);
      setIsReunionDropdownOpen(false);
    }
  };

  // Sélectionner et actualiser automatiquement la prochaine course non démarrée du programme
  useEffect(() => {
    if (upcomingRacesList.length === 0) return;

    const selectNextRace = () => {
      const now = Date.now();
      
      // Trouver la première course à venir (dont l'heure de départ est strictement dans le futur)
      const firstUpcomingIdx = upcomingRacesList.findIndex((r) => {
        const target = getRaceParisTargetTime(r.date, r.heure).getTime();
        return target > now;
      });

      if (firstUpcomingIdx !== -1) {
        // Si l'index actuel n'est pas initialisé ou s'il pointe sur une course déjà passée,
        // on se repositionne automatiquement sur la première course à venir.
        const currentSelected = upcomingRacesList[upcomingIndex];
        if (!currentSelected) {
          setUpcomingIndex(firstUpcomingIdx);
        } else {
          const currentTarget = getRaceParisTargetTime(currentSelected.date, currentSelected.heure).getTime();
          if (currentTarget <= now) {
            setUpcomingIndex(firstUpcomingIdx);
          }
        }
      } else {
        // Si toutes les courses sont passées, on se positionne sur la dernière course par défaut
        if (upcomingIndex >= upcomingRacesList.length) {
          setUpcomingIndex(upcomingRacesList.length - 1);
        }
      }
    };

    // Exécuter immédiatement
    selectNextRace();

    // Vérifier périodiquement toutes les 5 secondes pour un passage automatique fluide
    const interval = setInterval(selectNextRace, 5000);
    return () => clearInterval(interval);
  }, [upcomingRacesList, upcomingIndex]);

  const currentUpcomingRace = upcomingRacesList[upcomingIndex] || upcomingRacesList[0];

  const handleNextUpcoming = () => {
    setUpcomingIndex((prev) => (prev + 1) % upcomingRacesList.length);
  };

  const handlePrevUpcoming = () => {
    setUpcomingIndex((prev) => (prev - 1 + upcomingRacesList.length) % upcomingRacesList.length);
  };

  const handleAnalyzeUpcomingRace = (ref: UpcomingRaceRef) => {
    setInputUrl(ref.sourceUrl);
    setErrorMessage(null);

    const fullObj = ref.fullCourseObject;
    const isPlaceholder =
      !fullObj ||
      Boolean((fullObj as any).isPlaceholder) ||
      Boolean(fullObj.partants && fullObj.partants.some((p: any) => p.nom && p.nom.toUpperCase().includes('PARTANT OFFICIEL')));

    if (fullObj && !isPlaceholder && onSelectCourse) {
      onSelectCourse(fullObj);
      return;
    }

    if (ref.sourceUrl) {
      onAnalyze(ref.sourceUrl);
    } else if (fullObj && onSelectCourse) {
      onSelectCourse(fullObj);
    }
  };

  // Date et heure de dernière mise à jour dynamique en temps réel
  const [liveUpdateTime, setLiveUpdateTime] = useState<string>(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${dateStr} à ${timeStr}`;
  });

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLiveUpdateTime(`${dateStr} à ${timeStr}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [currentUrl, isLoading]);

  const handleInputChange = (val: string) => {
    setInputUrl(val);
    if (errorMessage) setErrorMessage(null);
  };

  const handleClearInput = () => {
    setInputUrl('');
    setErrorMessage(null);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          if (errorMessage) setErrorMessage(null);
          const validation = validateTurfUrl(text);
          if (validation.isValid) {
            onAnalyze(validation.cleanedUrl || text);
          }
        }
      }
    } catch {
      // Ignorer si refus
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const query = inputUrl.trim();
    if (!query) return;

    const validation = validateTurfUrl(query);
    if (!validation.isValid) {
      setErrorMessage(
        validation.error ||
          "Veuillez saisir un lien hippique valide (ex: geny.com, paristurf.com, pmu.fr) ou le nom d'une course (ex: R1C1, Vincennes)."
      );
      return;
    }

    setErrorMessage(null);

    // Si c'est une recherche textuelle, tenter de trouver la course dans le programme local
    if (validation.isSearchQuery) {
      const qNorm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const qClean = qNorm.replace(/[^a-z0-9]/g, '');

      const match = upcomingRacesList.find((ref) => {
        const rcNorm = `${ref.reunionCourse}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nomNorm = `${ref.nomCourse}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const hippoNorm = `${ref.hippodrome}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const discNorm = `${ref.discipline}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return (
          (qClean.length >= 2 && rcNorm === qClean) ||
          (qClean.length >= 2 && rcNorm.includes(qClean)) ||
          nomNorm.includes(qNorm) ||
          hippoNorm.includes(qNorm) ||
          discNorm.includes(qNorm)
        );
      });

      if (match) {
        handleAnalyzeUpcomingRace(match);
        return;
      }
    }

    onAnalyze(validation.cleanedUrl || query);
  };

  const validationPreview = inputUrl.trim() ? validateTurfUrl(inputUrl) : null;

  const searchSuggestions = useMemo(() => {
    const rawQuery = inputUrl.trim();
    if (!rawQuery || rawQuery.startsWith('http://') || rawQuery.startsWith('https://') || rawQuery.length < 2) return [];

    const qNorm = rawQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const qClean = qNorm.replace(/[^a-z0-9]/g, '');

    return upcomingRacesList.filter((ref) => {
      const rcNorm = `${ref.reunionCourse}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nomNorm = `${ref.nomCourse}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const hippoNorm = `${ref.hippodrome}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const discNorm = `${ref.discipline}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return (
        (qClean.length >= 2 && rcNorm.includes(qClean)) ||
        nomNorm.includes(qNorm) ||
        hippoNorm.includes(qNorm) ||
        discNorm.includes(qNorm)
      );
    }).slice(0, 6);
  }, [inputUrl, upcomingRacesList]);

  const [isResyncing, setIsResyncing] = useState(false);
  const handleForceResync = async () => {
    setIsResyncing(true);
    try {
      const activeSrc = (typeof window !== 'undefined' && localStorage.getItem('hippo_sync_source')) || 'pmu';
      const todayIso = new Date().toISOString().split('T')[0];
      const targetDate = selectedFilterDate && selectedFilterDate !== 'all' ? selectedFilterDate : todayIso;
      const res = await fetch('/api/sync-realtime-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSource: activeSrc, date: targetDate }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.meetings && Array.isArray(data.meetings) && data.meetings.length > 0) {
          const calData = {
            meetings: data.meetings,
            sourceType: activeSrc === 'paristurf' ? 'paristurf.com' : 'pmu.fr',
            updatedAt: new Date().toISOString(),
            groundingSources: data.groundingSources,
          };
          localStorage.setItem('hippo_calendar_data', JSON.stringify(calData));
          localStorage.setItem('hippo_imported_races', JSON.stringify(data.meetings));
          localStorage.setItem('hippo_is_custom_import', 'true');
          localStorage.removeItem('hippo_calendar_cleared');
          window.dispatchEvent(new CustomEvent('hippo_calendar_updated', { detail: { cleared: false, meetings: data.meetings } }));
          window.dispatchEvent(new CustomEvent('hippoanalyse-calendar-updated', { detail: { cleared: false, meetings: data.meetings } }));
          window.dispatchEvent(new CustomEvent('hippo_realtime_calendar_synced', {
            detail: { source: activeSrc, sourceLabel: data.sourceLabel, meetings: data.meetings, count: data.meetings.length, timestamp: Date.now() }
          }));
        }
      }
      setTimeout(() => {
        setIsResyncing(false);
        if (onOpenCalendar) onOpenCalendar();
      }, 500);
    } catch {
      setIsResyncing(false);
      if (onOpenCalendar) onOpenCalendar();
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 shadow-xl relative z-30 flex flex-col">
      {/* 🏁 HEADER CONTENT */}
      {/* Brand Identity Bar (Fait remonter en haut) */}
      <div className="bg-slate-950/70 border-b border-slate-900/50 py-2 px-2 sm:px-4">
        <div className="w-full max-w-full flex flex-col md:flex-row items-center gap-2.5 sm:gap-4">
          {/* Zone Logo (Removed Banner area to keep header clean) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left shrink-0 p-2 rounded-2xl bg-slate-900/90 border-2 border-amber-500 shadow-lg shadow-amber-500/10">
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500 rounded-3xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <img
                src="/hippoanalyse_pro_logo_1790414725595.jpg"
                alt="Logo Officiel HippoAnalyse Pro"
                className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-3xl object-cover border-2 border-amber-400 shadow-xl shadow-amber-500/30"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/horse-logo.jpg')) {
                    target.src = '/horse-logo.jpg';
                  }
                }}
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 shadow-sm" />
            </div>
            <div>
              {onResetSession && (
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl('');
                    setErrorMessage(null);
                    onResetSession();
                  }}
                  className="mb-0.5 flex items-center gap-1.5 px-3 py-0.5 rounded-xl bg-slate-900 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/50 text-[9px] font-black transition-all shadow-sm active:scale-95 group w-fit mx-auto sm:mx-0"
                  title="Réinitialiser la session : vider la course active et l'historique pour repartir sur une base vierge sans recharger la page"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-rose-400 group-hover:-rotate-90 transition-transform duration-200" />
                  <span>Réinitialiser la session</span>
                </button>
              )}
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
                  PMU-<span className="text-amber-400">STUDIO 2.0</span>
                </h1>
                <PWAInstallButton />
              </div>
            </div>
          </div>

          {/* 🏆 GRANDE BANDE PASSANTE DES ARRIVÉES (MÊME LIGNE QUE LE LOGO) */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <BandePassanteArrivees
              currentCourse={currentCourse || {} as any}
              onRefreshArrival={onRefreshOdds}
              onUpdateArrival={onUpdateArrival}
              isRefreshing={isRefreshingOdds}
              isHeaderMode={true}
            />
          </div>
        </div>
      </div>

      {/* Bannière d'En-tête Système : Horloge Live, Concepteur Centré & Contrôles */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-amber-950 font-bold px-4 py-1.5 text-xs flex flex-col md:flex-row items-center justify-between gap-2 shadow-xl border-b border-amber-500/30">
        {/* Horloge & Date Temps Réel */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1 rounded-xl border border-amber-300/40 text-amber-100 shadow-inner shrink-0">
          <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
          <span className="font-mono font-black text-white text-xs">
            {currentDateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-amber-300/60 font-bold">•</span>
          <span className="font-bold text-white capitalize text-xs">
            {currentDateTime.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Crédits Concepteur Centrés */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-3.5 py-1 rounded-xl border border-amber-300/40 text-amber-100 shadow-inner shrink-0 text-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
          <span className="font-bold text-amber-200 text-xs">Concepteur :</span>
          <span className="font-extrabold text-white text-xs tracking-wide">Ghislain BONI</span>
          <span className="text-amber-300/60 font-bold">/</span>
          <a
            href="tel:+2250101246106"
            className="font-bold text-amber-200 hover:text-white underline underline-offset-2 transition-colors flex items-center gap-1 text-xs"
          >
            <Phone className="w-3 h-3 text-amber-300" />
            <span>+(225) 01 01 24 61 06</span>
          </a>
        </div>

        {/* Controls Système : Mode Expert & Afficher Logs Scraper */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
          {onToggleExpertMode && (
            <button
              type="button"
              onClick={onToggleExpertMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${
                isExpertMode
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-300 font-extrabold shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                  : 'bg-slate-950/80 hover:bg-slate-900 text-amber-200 border border-amber-400/40'
              }`}
              title={isExpertMode ? "Mode Expert Actif : Cliquez pour désactiver" : "Activer le Mode Expert"}
            >
              <Zap className={`w-3.5 h-3.5 ${isExpertMode ? 'text-slate-950 fill-slate-950' : 'text-amber-300'}`} />
              <span>Mode Expert : <strong className={isExpertMode ? 'text-slate-950 font-black' : 'text-amber-300 font-bold'}>{isExpertMode ? 'ON' : 'OFF'}</strong></span>
            </button>
          )}

          {onOpenScraperLogs && (
            <button
              type="button"
              onClick={onOpenScraperLogs}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${
                hasScraperLogs
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-indigo-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-900 text-indigo-300 border border-indigo-400/40'
              }`}
              title="Afficher les logs bruts du scraper (DebugRaceGate)"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-300" />
              <span>Afficher Logs Scraper</span>
              {hasScraperLogs && (
                <span className="w-2 h-2 rounded-full bg-indigo-300 animate-ping" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-5 py-3">
        {/* En-tête Réorganisé & Épuré : Navigation & Accès Console Admin */}
        <div className="flex flex-col items-center justify-center gap-3.5 mb-3 w-full">
          {/* LIGNE 1 : Programme des Courses, Date & Espace Session / Réglages */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full pb-3 border-b border-slate-800/80">
            {/* Côté Gauche : Profil, Sélecteur de Date & Hub PMU API */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">

              {/* User Space Connection / Profile Button */}
              {onOpenUserSpace && (
                <button
                  type="button"
                  onClick={() => onOpenUserSpace()}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md active:scale-95 ${
                    currentUser && currentUser.estConnecte
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold border-amber-400 shadow-amber-500/20'
                  }`}
                  title={
                    currentUser && currentUser.estConnecte
                      ? `Mon Espace Connecté (${currentUser.email})`
                      : 'Se connecter par email pour analyser les courses'
                  }
                >
                  {currentUser && currentUser.estConnecte ? (
                    <>
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-[10px]">
                        {currentUser.nom ? currentUser.nom[0].toUpperCase() : '✓'}
                      </div>
                      <div className="text-left">
                        <span className="block text-[11px] font-black text-white leading-tight truncate max-w-[120px]">
                          {currentUser.nom || currentUser.email.split('@')[0]}
                        </span>
                        <span className="text-[9px] text-emerald-300 font-semibold block leading-none">
                          Membre Connecté
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Espace Utilisateur</span>
                    </>
                  )}
                </button>
              )}

              {/* Sélecteur de Date (Date Picker), Archives & Hub PMU API */}
              <HeaderDatePicker
                selectedDate={selectedFilterDate}
                onDateChange={(newDate) => {
                  setSelectedFilterDate(newDate);
                }}
                onOpenCalendar={onOpenCalendar}
                onOpenPmuApiHub={!isRestrictedMode ? onOpenPmuApiHub : undefined}
              />

              {/* Menu Déroulant avec cases à cocher : Filtrage & Sélection des Réunions à Analyser */}
              <div ref={reunionDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsReunionDropdownOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 bg-slate-900 border rounded-xl px-2.5 py-1.5 shadow-sm transition-all cursor-pointer ${
                    isReunionDropdownOpen
                      ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-850'
                      : 'border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-850'
                  }`}
                  title="Menu déroulant des réunions : cochez pour analyser et filtrez par réunion"
                >
                  <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Réunion :</span>
                  </span>

                  <span className="text-white text-xs font-black truncate max-w-[120px] sm:max-w-[160px]">
                    {selectedReunion === 'all'
                      ? `Toutes (${availableReunions.length})`
                      : availableReunions.find(([r]) => r === selectedReunion)
                      ? `${selectedReunion} - ${availableReunions.find(([r]) => r === selectedReunion)?.[1]}`
                      : selectedReunion}
                  </span>

                  {/* Badge d'indication des réunions cochées pour analyse */}
                  {totalCheckedRacesCount > 0 ? (
                    <span
                      className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 flex items-center gap-1 shadow-xs"
                      title={`${checkedReunionsCount} réunion(s) cochée(s) pour analyse (${totalCheckedRacesCount} courses prêtes)`}
                    >
                      <CheckSquare className="w-3 h-3 text-emerald-400" />
                      <span>{checkedReunionsCount} R</span>
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                      0 cochée
                    </span>
                  )}

                  {isReunionDropdownOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 shrink-0" />
                  )}
                </button>

                {/* Volet Déroulant avec cases à cocher pour chaque réunion */}
                {isReunionDropdownOpen && (
                  <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-32px)] max-w-[420px] bg-slate-900/98 backdrop-blur-xl border-2 border-amber-500/70 rounded-2xl shadow-2xl shadow-amber-500/20 p-3.5 z-50 animate-fadeIn space-y-3">
                    {/* En-tête du volet déroulant */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                            RÉUNIONS & COURSES À ANALYSER
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Cochez les réunions pour les positionner et les analyser
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsReunionDropdownOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Fermer le menu déroulant"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Barre d'action rapide globale */}
                    <div className="flex items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          if (allReunionsFullyChecked) {
                            handleDeselectAllRaces();
                          } else {
                            handleSelectAllRaces();
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-amber-300 transition-colors cursor-pointer select-none"
                        title={allReunionsFullyChecked ? 'Tout décocher' : 'Cocher toutes les réunions'}
                      >
                        {allReunionsFullyChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : totalCheckedRacesCount > 0 ? (
                          <MinusSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                        <span>{allReunionsFullyChecked ? 'Tout décocher' : 'Tout cocher pour analyser'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReunion('all');
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                            selectedReunion === 'all'
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                          title="Afficher toutes les réunions dans la vue"
                        >
                          Voir Toutes ({availableReunions.length})
                        </button>
                      </div>
                    </div>

                    {/* Liste des réunions disponibles avec case à cocher pour chacune */}
                    <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
                      {reunionStats.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                          <p>Aucune réunion disponible pour cette date.</p>
                          {onOpenPmuApiHub && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsReunionDropdownOpen(false);
                                onOpenPmuApiHub();
                              }}
                              className="mt-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg font-bold border border-amber-500/40 text-[10px] hover:bg-amber-500/30 transition-colors cursor-pointer"
                            >
                              Ouvrir le Centre PMU API
                            </button>
                          )}
                        </div>
                      ) : (
                        reunionStats.map((item) => {
                          const colors = getReunionColorClasses(item.rNum);
                          const isFiltered = selectedReunion.toUpperCase() === item.rNum.toUpperCase();

                          return (
                            <div
                              key={item.rNum}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                                item.isFullyChecked
                                  ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30 shadow-xs'
                                  : item.isPartiallyChecked
                                  ? 'bg-slate-850 border-amber-500/40'
                                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
                              }`}
                            >
                              {/* Case à cocher Réunion & Infos */}
                              <div
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                                onClick={() => handleToggleMeetingSelection(item.rNum)}
                                title={`Cliquer pour ${item.isFullyChecked ? 'décocher' : 'cocher'} la réunion ${item.rNum} (${item.hippo}) pour analyse`}
                              >
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center cursor-pointer">
                                  {item.isFullyChecked ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                                  ) : item.isPartiallyChecked ? (
                                    <MinusSquare className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-500 hover:text-slate-400" />
                                  )}
                                </div>

                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 border ${colors.bg}`}>
                                  {item.rNum}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white text-xs truncate max-w-[130px] sm:max-w-[160px]" title={item.hippo}>
                                      {item.hippo}
                                    </span>
                                    {item.isFullyChecked && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                        ✓ Cochée
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span className="font-semibold text-amber-300/90 font-mono">
                                      {item.checkedCount}/{item.totalCount} course{item.totalCount > 1 ? 's' : ''}
                                    </span>
                                    {item.firstRace && (
                                      <>
                                        <span>•</span>
                                        <span className="truncate">Départ {item.firstRace.heure}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Boutons Filtrer & Analyser */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReunion(isFiltered ? 'all' : item.rNum);
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isFiltered
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  }`}
                                  title={`Filtrer la vue principale sur la réunion ${item.rNum}`}
                                >
                                  {isFiltered ? 'Filtré ✓' : 'Filtrer'}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnalyzeMeetingDirectly(item.rNum);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                  title={`Cocher et analyser immédiatement la réunion ${item.rNum} (${item.hippo})`}
                                >
                                  <Zap className="w-3 h-3 text-emerald-400" />
                                  <span>Analyser</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Pied du volet déroulant avec synthèse et bouton d'action */}
                    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                      <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>
                          <strong className="text-amber-300">{checkedReunionsCount}</strong> réunion(s) cochée(s) · <strong className="text-emerald-300">{totalCheckedRacesCount}</strong> courses prêtes
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                        {totalCheckedRacesCount > 0 && pinnedUpcomingRaces.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              handleAnalyzeUpcomingRace(pinnedUpcomingRaces[0]);
                              setIsReunionDropdownOpen(false);
                            }}
                            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            title="Lancer l'analyse de la première course cochée"
                          >
                            <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                            <span>Analyser ({pinnedUpcomingRaces[0].reunionCourse})</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setShowRaceSelectionGrid(!showRaceSelectionGrid);
                            setIsReunionDropdownOpen(false);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer shrink-0"
                          title="Afficher/masquer les cases à cocher détaillées de toutes les courses"
                        >
                          Détail courses
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Côté Droite : Navigation Session, Historique, Favoris & Préférences Système */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
              {/* 1. Bouton Historique */}
              {onOpenHistory && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 text-xs font-black transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
                  title="Consulter l'historique des courses analysées"
                >
                  <History className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                  <span className="text-slate-950 font-black tracking-tight">Historique</span>
                  {historyCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-950 text-amber-400 border border-amber-400 ml-0.5 shadow-sm">
                      {historyCount}
                    </span>
                  )}
                </button>
              )}

              {!isRestrictedMode && onOpenFavorites && (
                <button
                  type="button"
                  onClick={onOpenFavorites}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 text-xs font-black transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
                  title="Consulter mes courses favorites enregistrées"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950 stroke-[2.5]" />
                  <span className="text-slate-950 font-black tracking-tight">Favoris</span>
                  {favoritesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-950 text-amber-400 border border-amber-400 ml-0.5 shadow-sm">
                      {favoritesCount}
                    </span>
                  )}
                </button>
              )}



              {/* 2ter. Bouton Gestion des Retards de Course en temps réel */}
              <button
                type="button"
                onClick={() => setIsDelayModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/60 text-xs font-black transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                title="Actualiser les heures de départ en temps réel en cas de retard de course"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Retards de Course</span>
              </button>

              {/* 4. Sélecteur Thème */}
              <ThemeToggleWidget />

              {/* 4bis. Bouton Mode Plein Écran (API Fullscreen Natif) */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all shadow-md active:scale-95 shrink-0 cursor-pointer ${
                  isFullscreen
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30 ring-2 ring-amber-400 font-extrabold'
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                }`}
                title={
                  isFullscreen
                    ? 'Quitter le Mode Plein Écran'
                    : 'Maximiser l\'affichage des tableaux de partants et pronostics en Mode Plein Écran'
                }
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-slate-950" />
                    <span>Plein Écran : ON</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Plein Écran</span>
                  </>
                )}
              </button>

              {/* 4ter. Liens Courts & Raccourcis pour mémoriser facilement */}
              {onOpenLinksModal && (
                <button
                  type="button"
                  onClick={onOpenLinksModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/60 text-xs font-black transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                  title="Raccourcir l'adresse, liens d'accès direct, favoris et QR Code mobile"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Liens & Raccourcis</span>
                </button>
              )}

              {/* 5. Console Admin */}
              {!isRestrictedMode && onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-red-700 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border border-red-400/80 text-xs font-black transition-all shadow-md shadow-red-500/20 active:scale-95 shrink-0 cursor-pointer"
                  title="Ouvrir la Console Admin V39 (En-tête Système, Crédits Concepteur, Mode Expert, Logs Scraper, Utilisateurs)"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-200 animate-pulse" />
                  <span>Console Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-slate-950/80 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-inner space-y-3">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Recherchez une course (ex: Compiègne, R1C1, Prix de France) ou collez un lien..."
                disabled={isLoading}
                className={`w-full pl-10 pr-28 py-3 bg-slate-900 text-white placeholder-slate-500 rounded-xl text-xs sm:text-sm font-mono border focus:outline-none transition-all ${
                  errorMessage
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : validationPreview && validationPreview.isValid
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/30'
                    : 'border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                }`}
              />

              {/* Status indicator & quick clear / paste on the right of input */}
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                {inputUrl ? (
                  <button
                    type="button"
                    onClick={handleClearInput}
                    className="flex items-center gap-1 text-[11px] font-extrabold text-rose-300 hover:text-white bg-rose-950/90 hover:bg-rose-900 px-2.5 py-1 rounded-md border border-rose-500/50 shadow-sm transition-all active:scale-95"
                    title="Effacer le lien en un clic pour insérer une nouvelle course"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>Effacer</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md border border-slate-700 transition-colors"
                    title="Coller le lien depuis le presse-papiers"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Coller</span>
                  </button>
                )}

                {validationPreview && validationPreview.isValid ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {validationPreview.isSearchQuery ? 'Recherche Textuelle' : validationPreview.sourceType === 'geny.com' ? 'geny.com' : validationPreview.sourceType === 'paristurf.com' ? 'paristurf.com' : 'Lien Turf'}
                    </span>
                  </span>
                ) : inputUrl.trim() ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prêt</span>
                  </span>
                ) : null}
              </div>

              {/* Suggestions de recherche en direct (Autocomplete Dropdown) */}
              {searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-fadeIn">
                  <div className="px-3 py-1.5 bg-slate-950/80 text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-amber-400" />
                      <span>{searchSuggestions.length} course(s) correspondante(s)</span>
                    </span>
                    <span className="text-slate-500">Cliquez pour ouvrir</span>
                  </div>
                  {searchSuggestions.map((ref) => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => {
                        handleAnalyzeUpcomingRace(ref);
                        setInputUrl(ref.sourceUrl);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shrink-0 group-hover:bg-amber-400">
                          {ref.reunionCourse}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-white group-hover:text-amber-300 block truncate">
                            {ref.nomCourse}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>📍 {ref.hippodrome}</span>
                            <span>·</span>
                            <span>{ref.discipline}</span>
                            <span>·</span>
                            <span>{ref.heure}</span>
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                        Lancer l'analyse →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="submit"
                disabled={isLoading || !inputUrl.trim()}
                className={`flex-1 px-6 py-3 font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                  currentUser && currentUser.estConnecte
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                    : 'bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400/50'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Analyse experte...</span>
                  </>
                ) : currentUser && currentUser.estConnecte ? (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analyser la Course</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Connexion & Analyser</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Not Logged In Warning Banner */}
          {(!currentUser || !currentUser.estConnecte) && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong>Espace Utilisateur :</strong> Veuillez vous connecter avec votre e-mail pour lancer les analyses et débloquer les pronostics certifiés.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenUserSpace && onOpenUserSpace()}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition-colors shrink-0"
              >
                Se connecter
              </button>
            </div>
          )}

          {/* Error Message if needed */}
          {errorMessage && (
            <div className="mt-2.5 p-3 rounded-xl bg-rose-950/60 border border-rose-600/60 text-xs text-rose-200 flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300">Information de saisie :</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Section : Choix des courses (≥ 9 partants) - Masquée par défaut pour n'afficher que la bande épurée PROCHAINE COURSE */}
          {upcomingRacesList.length > 0 && showRaceSelectionGrid && (
            <div className="mt-3.5 p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                      SÉLECTION DES COURSES (≥ 9 PARTANTS)
                      {selectedReunion !== 'all' && (
                        <span className="text-emerald-400 font-mono text-xs">({selectedReunion})</span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cochez ou décochez les cases pour positionner les courses dans la rubrique « PROCHAINE COURSE »
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {onOpenPmuApiHub && (
                    <button
                      type="button"
                      onClick={onOpenPmuApiHub}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      title="Ouvrir le Centre d'Actualisation Quotidienne & Connecteur PMU API pour choisir les courses"
                    >
                      <Database className="w-3 h-3 text-amber-400" />
                      <span>Centre PMU API</span>
                    </button>
                  )}
                  {selectedReunion !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleSelectAllMeetingRaces(selectedReunion)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-black border border-emerald-500/40 transition-colors cursor-pointer shadow-xs"
                      title={`Cocher ou décocher toutes les courses de la réunion ${selectedReunion}`}
                    >
                      Cocher tout {selectedReunion}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectAllRaces}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllRaces}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    Tout décocher
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRaceSelectionGrid(false)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/40 transition-colors cursor-pointer"
                  >
                    ✕ Masquer les cases
                  </button>
                </div>
              </div>

              {/* Grille de sélection des courses (filtrée par réunion le cas échéant) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {displayedUpcomingRaces.map((race) => {
                  const isChecked = selectedRaceIds.includes(race.id);
                  return (
                    <div
                      key={race.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                        isChecked
                          ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none"
                        onClick={() => toggleRaceSelection(race.id)}
                      >
                        {/* Case à cocher pour choisir les courses à positionner */}
                        <div
                          className="w-4 h-4 shrink-0 flex items-center justify-center cursor-pointer"
                          title="Cocher pour positionner cette course sous l'espace de collage"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </div>

                        {/* Compte à rebours placé devant chaque course */}
                        <div className="shrink-0 font-mono">
                          <CountdownTimer date={race.date} heure={race.heure} compact />
                        </div>

                        {/* Infos de la course */}
                        <div className="min-w-0 flex-1 truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded font-black bg-amber-400 text-slate-950 text-[10px] shrink-0">
                              {race.reunionCourse}
                            </span>
                            <span className="font-bold text-white text-xs truncate" title={race.nomCourse}>
                              {race.nomCourse}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                            <span className="truncate">📍 {race.hippodrome}</span>
                            <span>•</span>
                            <span className="font-semibold text-amber-300/90">{race.nombrePartants} partants</span>
                          </div>
                        </div>
                      </div>

                      {/* Bouton Analyser rapide */}
                      <button
                        type="button"
                        onClick={() => handleAnalyzeUpcomingRace(race)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Placer le lien et analyser immédiatement"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">Analyser</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rubrique PROCHAINE COURSE : Affichage EXCLUSIF de la Bande Épurée de la Prochaine Course */}
          {pinnedUpcomingRaces.length > 0 && (() => {
            const race = pinnedUpcomingRaces[activePinnedIndex] || pinnedUpcomingRaces[0];
            if (!race) return null;

            return (
              <div key={race.id || activePinnedIndex} className="mt-3.5 animate-fadeIn">
                <div className="pt-3 border-t border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0a1120] to-slate-950 p-3 sm:p-3.5 rounded-2xl border border-amber-500/50 shadow-xl">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Informations de la Prochaine Course en 1 seule ligne épurée */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Label PROCHAINE COURSE */}
                      <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span className="font-black text-amber-400 uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          PROCHAINE COURSE :
                        </span>
                      </div>

                      {/* Compte à rebours placé devant la course */}
                      <div className="shrink-0 font-mono">
                        <CountdownTimer date={race.date} heure={race.heure} compact />
                      </div>

                      {/* Badge Réunion & Course (ex: R2 C3) */}
                      <span className="px-2.5 py-1 rounded-lg font-black bg-amber-400 text-slate-950 text-xs shadow-md border border-amber-300 shrink-0">
                        {race.reunionCourse}
                      </span>

                      {/* Nom de la course */}
                      <span className="font-black text-white text-xs sm:text-sm truncate max-w-[280px]" title={race.nomCourse}>
                        {race.nomCourse}
                      </span>

                      <span className="text-slate-600 font-bold hidden sm:inline">•</span>

                      {/* Hippodrome */}
                      <span className="text-slate-300 font-bold text-xs truncate max-w-[180px]">
                        📍 {race.hippodrome}
                      </span>

                      <span className="text-slate-600 font-bold hidden sm:inline">•</span>

                      {/* Nombre de partants */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-800 text-amber-300 border border-slate-700 shrink-0">
                        {race.nombrePartants} partants
                      </span>

                      {/* Discipline & Distance */}
                      {race.discipline && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800/80 text-slate-300 border border-slate-700/80 shrink-0">
                          {race.discipline} {race.distance ? `• ${race.distance}m` : ''}
                        </span>
                      )}

                      {/* Quinté+ Badge */}
                      {race.estQuinte && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wide shrink-0">
                          Quinté+ PMU
                        </span>
                      )}
                    </div>

                    {/* Navigation discrète entre les courses cochées & Boutons d'action */}
                    <div className="flex items-center gap-2 justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                      {/* Contrôle discret pour naviguer entre les courses cochées */}
                      {pinnedUpcomingRaces.length > 1 && (
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 shrink-0">
                          <button
                            type="button"
                            onClick={handlePrevPinned}
                            className="p-1 hover:bg-slate-800 text-amber-400 rounded transition-colors cursor-pointer"
                            title="Course précédente selon l'heure de départ"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono font-bold text-amber-300 px-1">
                            {activePinnedIndex + 1}/{pinnedUpcomingRaces.length}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextPinned}
                            className="p-1 hover:bg-slate-800 text-amber-400 rounded transition-colors cursor-pointer"
                            title="Course suivante selon l'heure de départ"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowRaceSelectionGrid(!showRaceSelectionGrid)}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                          showRaceSelectionGrid
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-amber-300'
                        }`}
                        title="Ouvrir ou fermer la grille des cases à cocher"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cases ({pinnedUpcomingRaces.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleRaceSelection(race.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 font-bold text-xs border border-slate-700 transition-colors cursor-pointer shrink-0"
                        title="Décocher cette course"
                      >
                        Retirer
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAnalyzeUpcomingRace(race)}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95 shrink-0 border border-emerald-400/50 cursor-pointer"
                        title="Analyser directement cette prochaine course au programme PMU"
                      >
                        <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        <span>Analyser la course</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Si aucune course n'est cochée et que la grille est masquée, afficher un petit rappel discret */}
          {pinnedUpcomingRaces.length === 0 && upcomingRacesList.length > 0 && !showRaceSelectionGrid && (
            <div className="mt-3.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Rubrique <strong>PROCHAINE COURSE</strong> : Aucune course cochée.</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRaceSelectionGrid(true)}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Sélectionner des courses</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Arrivées en Temps Réel via Google Search Grounding */}
      <GroundingArrivalsModal
        isOpen={showParisTurfModal}
        onClose={() => setShowParisTurfModal(false)}
        currentCourse={currentCourse || undefined}
        onApplyArrivalToCourse={(arrStr) => {
          if (onUpdateArrival) onUpdateArrival(arrStr);
        }}
        onSelectCourseForAnalysis={(courseId) => {
          const matched = PLR_FRIDAY_02_MEETINGS.find(m => `${m.reunion}${m.courseNumero}` === courseId);
          if (matched && onSelectCourse) {
            onSelectCourse(convertMeetingToCourseHippique(matched));
          }
        }}
      />

      {/* Modale de Gestion des Retards de Course en Temps Réel */}
      <RaceDelayModal
        isOpen={isDelayModalOpen}
        onClose={() => setIsDelayModalOpen(false)}
        races={upcomingRacesList}
      />
    </header>
  );
};
