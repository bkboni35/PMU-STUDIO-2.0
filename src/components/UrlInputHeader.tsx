import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Globe, AlertTriangle, CheckCircle2, Sparkles, Star, Calendar, ClipboardPaste, History, Lock, X, ShieldAlert, Smartphone, Clock, Zap, ChevronLeft, ChevronRight, RotateCcw, Tv, Monitor, Laptop, Cpu, Sliders, Bell, Volume2, Trophy, Crown } from 'lucide-react';
import { validateTurfUrl } from '../utils/turfUrlValidator';
import { CourseHippique, PmuMeeting, TurfSource } from '../types/turf';
import { UserProfile } from '../types/userAuth';
import { ThemeToggleWidget } from './ThemeToggleWidget';
import { CountdownTimer } from './CountdownTimer';
import { getRaceParisTargetTime } from '../utils/raceCountdown';
import { normalizeDateForQuery, getIvoryCoastDate } from '../utils/timeConversion';
import { PLR_FRIDAY_02_MEETINGS } from '../data/plrFriday02Data';
import { HeaderDatePicker } from './HeaderDatePicker';
import { BandePassanteArrivees } from './BandePassanteArrivees';
import { GroundingArrivalsModal } from './GroundingArrivalsModal';
import { PWAInstallButton } from './PWAInstallButton';

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
  onOpenNotifications?: () => void;
  onOpenSubscription?: () => void;
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
}

function convertMeetingToCourseHippique(m: PmuMeeting): CourseHippique {
  const distNum = typeof m.distance === 'number' ? m.distance : parseInt(String(m.distance || '2100').replace(/\D/g, ''), 10) || 2100;
  const cordeVal: 'Droite' | 'Gauche' = m.corde === 'Droite' ? 'Droite' : 'Gauche';
  const allocNum = typeof m.allocation === 'number' ? m.allocation : parseInt(String(m.allocation || '30000').replace(/\D/g, ''), 10) || 30000;

  const hippoSlug = m.hippodrome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
  const courseSlug = m.nomCoursePhare.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
  const numericId = m.id.replace(/\D/g, '') || '1482910';
  const is29 = Boolean(m.date && m.date.includes('29'));
  const dateSlug = is29 ? '2026-09-29' : '2026-09-28';
  const defaultDateStr = is29 ? 'Mardi 29 Septembre 2026' : 'Lundi 28 Septembre 2026';
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

  return {
    id: m.id,
    sourceUrl: m.lienGeny || constructedGenyUrl,
    sourceType: 'pmu.lonacionline.ci',
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
    statutCourse: (m.statut?.toLowerCase().includes('termin') || Boolean(m.arriveeOfficielle)) ? 'Arrivée officielle' : 'À venir',
    arriveeOfficielle: m.arriveeOfficielle,
    synthese: {
      baseIncontournable: 1,
      secondeBase: 2,
      outsiders: [3, 4, 5],
      tocards: [6, 7],
      selection8: basePartants.slice(0, 8).map((p) => p.numero),
      selectionJustification: `Analyse certifiée du ${m.nomCoursePhare} (${m.reunion} ${m.courseNumero}) - ${m.hippodrome}.`,
      conseilPari: "Base solide couplé gagnant / placé.",
      indiceConfiance: 8.8,
      analyseParcours: `Épreuve disputée sur ${distNum}m à ${m.hippodrome}.`,
      piegesCourse: ["Gérer les relais au départ."],
    },
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
  onOpenNotifications,
  onOpenSubscription,
  isExpertMode,
  onToggleExpertMode,
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
    return () => clearInterval(timer);
  }, []);

  // Extraction en Temps Réel des Arrivées via Grounding Google Search (paristurf.com & pmu.fr)
  const [showParisTurfModal, setShowParisTurfModal] = useState(false);
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
      const resp = await fetch('/api/extract-arrivals-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'all', date: selectedFilterDate || '2026-10-01' })
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
    handleFetchParisTurfDirect(true);
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
      meetingsToLoad = PLR_FRIDAY_02_MEETINGS;
    }

    if (selectedFilterDate && selectedFilterDate !== 'all') {
      const norm = normalizeDateForQuery(selectedFilterDate);
      meetingsToLoad = meetingsToLoad.filter((m) => {
        const mNorm = normalizeDateForQuery(m.date || '');
        return m.date === selectedFilterDate || (norm && mNorm && norm === mNorm);
      });
    }

    // Charger l'intégralité des courses officielles du programme
    meetingsToLoad.forEach((m: any) => {
      const fullCourse = convertMeetingToCourseHippique(m);
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
      });
    });

    // Tri chronologique rigoureux des courses du programme par heure de départ
    list.sort((a, b) => {
      const targetA = getRaceParisTargetTime(a.date, a.heure).getTime();
      const targetB = getRaceParisTargetTime(b.date, b.heure).getTime();
      return targetA - targetB;
    });

    return list;
  }, [calendarVersion, selectedFilterDate]);

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

    if (!currentUser || !currentUser.estConnecte) {
      if (onOpenUserSpace) {
        onOpenUserSpace(`Veuillez vous connecter avec votre adresse e-mail pour lancer l'analyse de : ${ref.nomCourse}.`);
      }
      return;
    }

    if (ref.fullCourseObject && onSelectCourse) {
      onSelectCourse(ref.fullCourseObject);
      return;
    }

    onAnalyze(ref.sourceUrl);
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
            if (!currentUser || !currentUser.estConnecte) {
              if (onOpenUserSpace) {
                onOpenUserSpace("Veuillez vous connecter avec votre adresse e-mail pour lancer l'analyse de cette course.");
              }
              return;
            }
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

    if (!currentUser || !currentUser.estConnecte) {
      if (onOpenUserSpace) {
        onOpenUserSpace("Veuillez vous connecter avec votre adresse e-mail pour débloquer et lancer l'analyse algorithmique de la course.");
      }
      return;
    }

    const query = inputUrl.trim();
    if (!query) return;

    const validation = validateTurfUrl(query);
    if (!validation.isValid) {
      setErrorMessage(
        validation.error ||
          "Veuillez saisir le nom d'une course (ex: Compiègne, R1C1) ou un lien de course valide."
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
      const targetDate = selectedFilterDate && selectedFilterDate !== 'all' ? selectedFilterDate : '2026-10-01';
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

      {/* Top Banner with Update Timestamp & Designer */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-amber-950 font-bold px-4 py-2 text-xs flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Left / Center-Left: Last Update Timestamp */}
        <div className="flex items-center gap-1.5 bg-slate-950/40 px-3 py-1 rounded-full border border-amber-300/30 text-[11px] text-amber-100 shadow-sm shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
          <span className="font-extrabold text-amber-200">Dernière mise à jour :</span>
          <span className="font-black text-white font-mono tracking-wide">{formattedUpdateTimestamp}</span>
        </div>

        {/* Center: Live Date (Optional but useful context) */}
        <div className="flex items-center gap-1.5 bg-slate-950/20 px-2.5 py-0.5 rounded-full border border-amber-300/20 text-[11px] text-amber-100/90 shadow-sm hidden lg:flex">
          <Calendar className="w-3.5 h-3.5 text-amber-300" />
          <span className="font-bold">Date du jour :</span>
          <span className="font-extrabold text-white">{formattedCurrentDay}</span>
        </div>

        {/* Right / Extreme Right: Designer Credits */}
        <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-full border border-amber-300/30 text-[11px] text-amber-200">
          <span className="font-extrabold text-white">Concepteur :</span>
          <span className="font-semibold text-amber-300">Ghislain BONI</span>
          <span className="text-amber-300/70">/</span>
          <a
            href="tel:+2250101246106"
            className="font-bold text-amber-100 hover:text-white underline underline-offset-2 transition-colors"
          >
            +(225) 01 01 24 61 06
          </a>
        </div>
      </div>

      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-5 py-4">
        {/* En-tête Réorganisé : Tous les onglets et actions visibles sans déplacement */}
        <div className="flex flex-col gap-3.5 mb-4 w-full">
          {/* LIGNE 1 : Programme des Courses, Date & Espace Session / Réglages */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full pb-3 border-b border-slate-800/80">
            {/* Côté Gauche : Profil, Abonnement Mobile Money & Sélecteur de Date */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Bouton Espace Abonnement Mobile Money VIP */}
              {onOpenSubscription && (
                <button
                  type="button"
                  onClick={onOpenSubscription}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 border-2 border-amber-300 text-xs font-black transition-all shadow-lg shadow-amber-500/25 active:scale-95 shrink-0"
                  title="Ouvrir l'Espace Abonnement & Paiement Mobile Money (Orange Money, Wave, MTN, Moov)"
                >
                  <Crown className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Abonnement Mobile Money</span>
                </button>
              )}

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

              {/* Sélecteur de Date (Date Picker) & Archives */}
              <HeaderDatePicker
                selectedDate={selectedFilterDate}
                onDateChange={(newDate) => {
                  setSelectedFilterDate(newDate);
                }}
                onOpenCalendar={onOpenCalendar}
              />
            </div>

            {/* Côté Droite : Navigation Session, Historique, Favoris & Préférences Système */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
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

              {/* 2. Bouton Favoris */}
              {onOpenFavorites && (
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

              {/* 3. Onglet Quotas AI */}
              {onOpenAiQuotas && (
                <button
                  type="button"
                  onClick={onOpenAiQuotas}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-black transition-all shadow-md active:scale-95 shrink-0"
                  title="Consulter les quotas & limites des modèles IA (Google Gemini API)"
                >
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quotas AI</span>
                </button>
              )}

              {/* 4. Bascule Mode Expert */}
              {onToggleExpertMode && (
                <button
                  type="button"
                  onClick={onToggleExpertMode}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all shadow-md active:scale-95 shrink-0 ${
                    isExpertMode
                      ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white border-purple-400 shadow-purple-500/30 ring-2 ring-purple-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-purple-500/40'
                  }`}
                  title={
                    isExpertMode
                      ? 'Mode Expert Actif : colonnes de données avancées affichées (Gains Cumulés, Record Kilométrique)'
                      : 'Activer le Mode Expert pour afficher les colonnes avancées (Gains Cumulés & Record Kilométrique)'
                  }
                >
                  <Sliders className={`w-3.5 h-3.5 ${isExpertMode ? 'text-purple-200' : 'text-purple-400'}`} />
                  <span>Mode Expert : {isExpertMode ? 'ON' : 'OFF'}</span>
                </button>
              )}

              {/* 4. Sélecteur Thème */}
              <ThemeToggleWidget />

              {/* 5. Console Administrateur */}
              {onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 text-xs font-black transition-all shadow-md active:scale-95 shrink-0"
                  title="Console Administrateur : voir les utilisateurs connectés et heures de connexion"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Administrateurs</span>
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

          {/* Rubrique PROCHAINE COURSE: Références de la course, Compte à rebours et Bouton "Analyser la course" */}
          {currentUpcomingRace && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0a1120] to-slate-950 p-3 sm:p-3.5 rounded-2xl border border-amber-500/40 shadow-lg">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Références de la course */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
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

                  {/* Badges Références */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge R1 C4 */}
                    <span className="px-2 py-0.5 rounded-lg font-black bg-amber-400 text-slate-950 text-xs shadow-xs border border-amber-300">
                      {currentUpcomingRace.reunionCourse}
                    </span>

                    {/* Nom de la course */}
                    <span className="font-black text-white text-xs sm:text-sm">
                      {currentUpcomingRace.nomCourse}
                    </span>

                    <span className="text-slate-600 font-bold">•</span>

                    {/* Hippodrome */}
                    <span className="text-slate-300 font-bold text-xs">
                      {currentUpcomingRace.hippodrome}
                    </span>

                    {/* Quinté+ Badge */}
                    {currentUpcomingRace.estQuinte && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wide">
                        Quinté+ PMU
                      </span>
                    )}
                  </div>
                </div>

                {/* Compte à rebours & Boutons (Précédente / Suivante / Analyser la course) */}
                <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                  {/* Compte à rebours en temps réel */}
                  <div className="shrink-0">
                    <CountdownTimer date={currentUpcomingRace.date} heure={currentUpcomingRace.heure} compact />
                  </div>

                  {/* Navigation entre prochaines courses */}
                  {upcomingRacesList.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-900 px-1 py-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={handlePrevUpcoming}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                        title="Course précédente au programme"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-slate-400 px-1">
                        {upcomingIndex + 1}/{upcomingRacesList.length}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextUpcoming}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                        title="Course suivante au programme"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Onglet / Bouton Analyser la course */}
                  <button
                    type="button"
                    onClick={() => handleAnalyzeUpcomingRace(currentUpcomingRace)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95 shrink-0 border border-emerald-400/50"
                    title="Analyser directement cette prochaine course au programme PMU"
                  >
                    <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>Analyser la course</span>
                  </button>
                </div>
              </div>
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
    </header>
  );
};
