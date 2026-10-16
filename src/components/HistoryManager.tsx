import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  RotateCcw,
  Search,
  Trophy,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BarChart2,
  BarChart3,
  RefreshCw,
  Radio,
  Zap,
  Sparkles,
  Loader2,
  AlertTriangle,
  Printer,
  FileText,
  Calendar,
  CalendarDays,
  Filter,
  X,
  ArrowRight,
} from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { CountdownTimer } from './CountdownTimer';
import { scrollToTopInstant } from '../utils/scrollHelper';
import { convertToUTC } from '../utils/timeConversion';
import { exportCourseToPdf, exportQuinteOnlyToPdf } from '../utils/pdfExport';
import {
  HistoryCourseItem,
  updateCourseInHistory,
  getRaceHistory,
  purgePastRacesFromHistory,
} from '../utils/favoritesStorage';
import { GroundingArrivalsModal } from './GroundingArrivalsModal';
import { TrackWeatherAnalysisCard } from './TrackWeatherAnalysisCard';
import { PronosticsDeJeuView } from './PronosticsDeJeuView';
import { BacktestStrategieModal } from './BacktestStrategieModal';

interface HistoryManagerProps {
  history: HistoryCourseItem[];
  currentCourseId?: string;
  onSelectCourse: (course: CourseHippique) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onUpdateHistory?: (updatedHistory: HistoryCourseItem[]) => void;
  onNavigateTab?: (tab: 'synthese' | 'propositions-ia' | 'partants' | 'ticket' | 'college-gemini' | 'stats' | 'advisor' | 'favoris' | 'calendrier' | 'fiche-pdf-v38' | 'trace-facteurs' | 'pronostics-jeu') => void;
}

export const HistoryManager: React.FC<HistoryManagerProps> = ({
  history,
  currentCourseId,
  onSelectCourse,
  onRemoveItem,
  onClearAll,
  onUpdateHistory,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pronostics' | 'arrivals'>('all');

  // Filtrage par calendrier / plage de dates
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom'>('all');
  const [dateTargetMode, setDateTargetMode] = useState<'analyzedAt' | 'raceDate' | 'both'>('analyzedAt');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);

  useLayoutEffect(() => {
    scrollToTopInstant();
  }, [historyFilter, datePreset, startDate, endDate, dateTargetMode]);

  useEffect(() => {
    scrollToTopInstant();
  }, [historyFilter, datePreset, startDate, endDate, dateTargetMode]);

  // Gestionnaires pour le filtre par calendrier
  const handleSelectDatePreset = (preset: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = formatYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatYMD(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      setStartDate(formatYMD(d7));
      setEndDate(formatYMD(now));
    } else if (preset === '30days') {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 29);
      setStartDate(formatYMD(d30));
      setEndDate(formatYMD(now));
    } else if (preset === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatYMD(firstOfMonth));
      setEndDate(formatYMD(now));
    } else if (preset === 'custom') {
      // conserver les valeurs saisies manuellement
    }
  };

  const handleClearDateFilter = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const formatDateFR = (ymdStr: string) => {
    if (!ymdStr) return '';
    const parts = ymdStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return ymdStr;
  };

  // Cartes comparatives dépliées (Analyse Après Course & Tracé & Pronostics de Jeu)
  const [expandedPronosticsId, setExpandedPronosticsId] = useState<string | null>(null);
  const [expandedComparisonId, setExpandedComparisonId] = useState<string | null>(null);
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);
  const [expandedValueId, setExpandedValueId] = useState<string | null>(null);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Temps réel & Synchronisation en direct
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [refreshingRaceId, setRefreshingRaceId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isArrivalsModalOpen, setIsArrivalsModalOpen] = useState(false);
  const [tick, setTick] = useState(0); // Pour forcer le re-calcul du temps relatif

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Synchronisation en temps réel via localStorage et intervalle automatique
  const syncWithLocalStorage = useCallback(() => {
    const latestHistory = getRaceHistory();
    if (onUpdateHistory && JSON.stringify(latestHistory) !== JSON.stringify(history)) {
      onUpdateHistory(latestHistory);
    }
    setLastSyncedAt(
      new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, [history, onUpdateHistory]);

  useEffect(() => {
    // Polling régulier toutes les 3 secondes pour rafraîchir l'horodatage et vérifier la synchro
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      syncWithLocalStorage();
    }, 3000);

    // Écouteur d'événements storage pour synchroniser le multi-onglets en temps réel
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hippoanalyse_race_history') {
        syncWithLocalStorage();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncWithLocalStorage]);

  // Polling automatique en temps réel des arrivées pour toutes les courses de l'historique en attente ou provisoires
  useEffect(() => {
    const autoCheckPendingArrivals = async () => {
      const currentHist = getRaceHistory();
      const pendingItems = currentHist.filter(
        (item) =>
          !item.course.arriveeOfficielle ||
          !item.course.arriveeOfficielle.trim() ||
          item.course.statutCourse?.toLowerCase().includes('provisoire')
      );

      if (pendingItems.length === 0) return;

      let foundNewArrivals = false;
      for (const item of pendingItems) {
        try {
          const resp = await fetch('/api/verify-race-facts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ course: item.course, url: item.course.sourceUrl }),
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.arriveeOfficielle && typeof data.arriveeOfficielle === 'string' && /^\d+[-,\s]+\d+/.test(data.arriveeOfficielle.trim())) {
              const cleanArrival = data.arriveeOfficielle.trim();
              const isOfficial = data.statutArrivee === 'officielle' || data.isOfficial;
              const newStatus = isOfficial ? 'Arrivée officielle' : 'Arrivée provisoire';

              if (cleanArrival !== item.course.arriveeOfficielle || newStatus !== item.course.statutCourse) {
                updateCourseInHistory(item.id, {
                  arriveeOfficielle: cleanArrival,
                  statutCourse: newStatus,
                });
                foundNewArrivals = true;

                if (isOfficial) {
                  showToast(`🏆 ARRIVÉE OFFICIELLE CONFIRMÉE pour ${item.course.titre} : ${cleanArrival}`);
                } else {
                  showToast(`⚠️ Arrivée provisoire détectée pour ${item.course.titre} : ${cleanArrival} (Confirmation officielle en cours...)`);
                }
              }
            }
          }
        } catch (_e) {}
      }

      if (foundNewArrivals) {
        const updated = getRaceHistory();
        if (onUpdateHistory) {
          onUpdateHistory(updated);
        }
      }
    };

    // Première vérification après 2 secondes, puis toutes les 5 secondes (Temps Réel Ultra-Rapide)
    const firstTimeout = setTimeout(autoCheckPendingArrivals, 2000);
    const interval = setInterval(autoCheckPendingArrivals, 5000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, []);

  // Actualisation individuelle d'une course : Recherche exclusive de l'Arrivée Officielle sur Geny
  const handleRefreshRaceLive = async (item: HistoryCourseItem) => {
    setRefreshingRaceId(item.id);
    try {
      // Recherche directe de l'arrivée officielle sur le site de Geny / PMU
      let updatedArrival: string | undefined = undefined;
      try {
        const response = await fetch('/api/verify-race-facts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course: item.course,
            url: item.course.sourceUrl,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const cert = data.certificatVerification;

          if (data.arriveeOfficielle && typeof data.arriveeOfficielle === 'string' && /^\d+[-,\s]+\d+/.test(data.arriveeOfficielle.trim())) {
            updatedArrival = data.arriveeOfficielle.trim();
          } else if (cert && cert.pointsControles) {
            const arrPt = cert.pointsControles.find((p: any) =>
              p.point.toLowerCase().includes('arrivée')
            );
            if (arrPt && arrPt.detail) {
              const match = arrPt.detail.match(/(\d+[-,\s]+\d+[-,\s]+\d+[-,\s]+\d+[-,\s]+\d+)/);
              if (match && match[1]) {
                updatedArrival = match[1].replace(/,/g, ' - ');
              }
            }
          }
        }
      } catch (_err) {}

      if (!updatedArrival && item.course.arriveeOfficielle) {
        updatedArrival = item.course.arriveeOfficielle;
      }

      // Mettre à jour l'arrivée officielle et le statut dans l'historique sans altérer l'analyse originale
      const updated = updateCourseInHistory(item.id, {
        arriveeOfficielle: updatedArrival || item.course.arriveeOfficielle,
        statutCourse: (updatedArrival || item.course.arriveeOfficielle) ? 'Arrivée officielle' : 'En attente de l\'arrivée officielle',
      });

      if (onUpdateHistory) {
        onUpdateHistory(updated);
      }

      // Mettre à jour l'affichage actif immédiatement
      const updatedItem = updated.find((i) => i.id === item.id || i.course.id === item.course.id);
      if (updatedItem && onSelectCourse) {
        onSelectCourse(updatedItem.course);
      }

      if (updatedArrival) {
        setExpandedComparisonId(item.id);
        showToast(`🏆 Arrivée officielle Geny récupérée et affichée : ${updatedArrival}`);
      } else {
        showToast(`ℹ️ Recherche Geny effectuée : L'arrivée officielle n'est pas encore publiée.`);
      }
    } catch {
      showToast(`⚡ Recherche terminée.`);
    } finally {
      setRefreshingRaceId(null);
      setLastSyncedAt(
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }
  };

  // Actualisation globale : Recherche des Arrivées via Google Search Grounding & Geny pour toutes les courses
  const handleRefreshAllLive = async () => {
    setIsRefreshingAll(true);
    try {
      const current = getRaceHistory();
      let firstUpdatedId: string | null = null;
      let arrivalCount = 0;

      // Interroger en premier lieu les arrivées en direct via Google Search Grounding (PMU & Paris-Turf)
      let liveGroundingArrivals: any[] = [];
      try {
        const todayIso = new Date().toISOString().split('T')[0];
        const gResp = await fetch('/api/extract-arrivals-grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'all', date: todayIso })
        });
        if (gResp.ok) {
          const gData = await gResp.json();
          liveGroundingArrivals = gData.arrivals || [];
        }
      } catch (_gErr) {}

      for (const item of current) {
        try {
          let updatedArrival: string | undefined = undefined;
          let newStatut = item.course.statutCourse;

          // Vérifier d'abord si une arrivée en temps réel existe dans le flux Grounding
          const cleanCourseId = `${(item.course.reunion || '').toUpperCase()}${(item.course.course || '').toUpperCase()}`;
          const matchedG = liveGroundingArrivals.find(a => 
            a.courseId === cleanCourseId || 
            (a.prixNom && item.course.prixNom && a.prixNom.toLowerCase().includes(item.course.prixNom.toLowerCase()))
          );

          if (matchedG && matchedG.arriveeOfficielle) {
            updatedArrival = matchedG.arriveeOfficielle;
            newStatut = matchedG.statut || (matchedG.isOfficial ? 'Arrivée officielle' : 'Arrivée provisoire');
          }

          if (!updatedArrival) {
            try {
              const resp = await fetch('/api/verify-race-facts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course: item.course, url: item.course.sourceUrl }),
              });

              if (resp.ok) {
                const resData = await resp.json();
                if (resData.arriveeOfficielle && typeof resData.arriveeOfficielle === 'string' && /^\d+[-,\s]+\d+/.test(resData.arriveeOfficielle.trim())) {
                  updatedArrival = resData.arriveeOfficielle.trim();
                  newStatut = resData.statutArrivee === 'officielle' || resData.isOfficial ? 'Arrivée officielle' : 'Arrivée provisoire';
                }
              }
            } catch (_err) {}
          }

          if (!updatedArrival && item.course.arriveeOfficielle) {
            updatedArrival = item.course.arriveeOfficielle;
          }

          if (updatedArrival) {
            arrivalCount++;
            if (!firstUpdatedId) {
              firstUpdatedId = item.id;
            }
          }

          updateCourseInHistory(item.id, {
            arriveeOfficielle: updatedArrival || item.course.arriveeOfficielle,
            statutCourse: (updatedArrival || item.course.arriveeOfficielle) ? (newStatut || 'Arrivée officielle') : 'En attente de l\'arrivée officielle',
          });
        } catch {}
      }

      const updated = getRaceHistory();
      if (onUpdateHistory) {
        onUpdateHistory(updated);
      }

      if (firstUpdatedId) {
        setExpandedComparisonId(firstUpdatedId);
      }

      if (arrivalCount > 0) {
        showToast(`🏆 ${arrivalCount} arrivée(s) en direct (Grounding & Web) synchronisée(s) avec succès !`);
      } else {
        showToast(`⚡ Synchronisation en direct terminée.`);
      }
    } catch {
      showToast(`⚡ Synchronisation terminée.`);
    } finally {
      setIsRefreshingAll(false);
      setLastSyncedAt(
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }
  };

  const handlePurgePastRaces = () => {
    const { updated, purgedCount } = purgePastRacesFromHistory();
    if (onUpdateHistory) {
      onUpdateHistory(updated);
    }
    if (purgedCount > 0) {
      showToast(`🧹 Purge automatique : ${purgedCount} course(s) passée(s) supprimée(s) de l'historique.`);
    } else {
      showToast(`✨ Aucune course passée obsolète à purger dans l'historique.`);
    }
  };

  const filteredHistory = history.filter((item) => {
    // 1. Filtrage par recherche textuelle
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const course = item.course;
      const matchSearch =
        course.titre.toLowerCase().includes(q) ||
        course.hippodrome.toLowerCase().includes(q) ||
        (course.reunion && course.reunion.toLowerCase().includes(q)) ||
        (course.discipline && course.discipline.toLowerCase().includes(q)) ||
        (course.arriveeOfficielle && course.arriveeOfficielle.includes(q)) ||
        course.partants?.some((p) => p.nom.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // 2. Filtre par type d'historique (historyFilter)
    if (historyFilter === 'pronostics') {
      if (!item.course.synthese?.selection8 || item.course.synthese.selection8.length === 0) return false;
    } else if (historyFilter === 'arrivals') {
      if (!item.course.arriveeOfficielle) return false;
    }

    // 3. Filtrage par Calendrier / Plage de dates
    if (startDate || endDate) {
      // Date d'analyse (formatted YYYY-MM-DD)
      const d = new Date(item.analyzedAt);
      const analyzedYMD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Date de la course (si disponible et analysable)
      let raceYMD: string | null = null;
      if (item.course.date) {
        const rawDate = item.course.date.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          raceYMD = rawDate;
        } else {
          const matchFR = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (matchFR) {
            raceYMD = `${matchFR[3]}-${matchFR[2]}-${matchFR[1]}`;
          }
        }
      }

      const checkRange = (ymd: string) => {
        if (startDate && ymd < startDate) return false;
        if (endDate && ymd > endDate) return false;
        return true;
      };

      if (dateTargetMode === 'analyzedAt') {
        if (!checkRange(analyzedYMD)) return false;
      } else if (dateTargetMode === 'raceDate') {
        const target = raceYMD || analyzedYMD;
        if (!checkRange(target)) return false;
      } else if (dateTargetMode === 'both') {
        const matchAnalyzed = checkRange(analyzedYMD);
        const matchRace = raceYMD ? checkRange(raceYMD) : false;
        if (!matchAnalyzed && !matchRace) return false;
      }
    }

    return true;
  });

  const handleDelete = (id: string, titre: string) => {
    onRemoveItem(id);
    showToast(`Course "${titre}" supprimée de l'historique.`);
  };

  const handleClearAllConfirm = () => {
    onClearAll();
    setShowClearConfirm(false);
    showToast('Historique intégralement effacé.');
  };

  // Formate la date et l'heure exactes de l'analyse
  const formatFullDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${dateStr} à ${timeStr}`;
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 15) return "À l'instant (en direct)";
    if (diffSec < 60) return `Il y a ${diffSec} sec`;
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffMin < 1440) return `Il y a ${Math.floor(diffMin / 60)}h`;
    return `Il y a ${Math.floor(diffMin / 1440)} j`;
  };

  // Analyse comparative Post-Course (Pronostic vs Arrivée Officielle)
  const computePostRaceAnalysis = (course?: CourseHippique) => {
    if (!course || !course.arriveeOfficielle) return null;

    const arrivalNums = course.arriveeOfficielle
      .split(/[-,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (arrivalNums.length === 0) return null;

    const selection = course.synthese?.selection8 || [];
    const base = course.synthese?.baseIncontournable;
    const secondeBase = course.synthese?.secondeBase;
    const outsiders = course.synthese?.outsiders || [];
    const tocards = course.synthese?.tocards || [];

    const top7 = arrivalNums.slice(0, 7);
    const details = top7.map((num, index) => {
      const rankArrival = index + 1;
      const inSelection = selection.includes(num);
      const selRank = inSelection ? selection.indexOf(num) + 1 : null;
      const isBase = num === base;
      const isSecondeBase = num === secondeBase;
      const isOutsider = outsiders.includes(num);
      const isTocard = tocards.includes(num);

      const horseInfo = course.partants?.find((p) => p.numero === num);

      return {
        rankArrival,
        num,
        nom: horseInfo?.nom || `N°${num}`,
        driver: horseInfo?.driver || '',
        cote: horseInfo?.coteProbable,
        inSelection,
        selRank,
        isBase,
        isSecondeBase,
        isOutsider,
        isTocard,
      };
    });

    const presentInSelection = details.filter((d) => d.inSelection).length;
    const totalTop7 = Math.min(7, top7.length);
    const successRatioPct = Math.round((presentInSelection / totalTop7) * 100);

    const baseAtArrival = details.some((d) => d.isBase && d.rankArrival <= 3);
    const secondeBaseAtArrival = details.some((d) => d.isSecondeBase && d.rankArrival <= 3);

    let badgeType = 'Analyse Post-Course (7 Chevaux)';
    let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

    if (presentInSelection >= 5 && details.slice(0, 5).every((d) => d.inSelection)) {
      const isExactOrder = top7.slice(0, 5).every((n, i) => selection[i] === n);
      if (isExactOrder) {
        badgeType = '🏆 QUINTÉ+ ORDRE DANS LA SÉLECTION !';
        badgeColor = 'bg-amber-500 text-slate-950 font-black border-amber-300 animate-pulse';
      } else {
        badgeType = '🥇 QUINTÉ+ DÉSORDRE EN 8 CHEVAUX !';
        badgeColor = 'bg-emerald-500 text-slate-950 font-black border-emerald-300';
      }
    } else if (presentInSelection >= 4) {
      badgeType = '🎯 QUARTÉ+ / MULTI DANS LA SÉLECTION !';
      badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    } else if (presentInSelection >= 3) {
      badgeType = '🥉 TIERCÉ / COUPLE TROUVÉ !';
      badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold';
    } else {
      badgeType = '📊 BILAN POST-COURSE DISPONIBLE (7 CHEVAUX)';
      badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
    }

    return {
      arrivalNums,
      top7,
      details,
      presentInSelection,
      totalTop7,
      successRatioPct,
      baseAtArrival,
      secondeBaseAtArrival,
      badgeType,
      badgeColor,
    };
  };

  // --- NOUVEAU : Calcul classement par côte ---
  const getSortedPartantsByCote = (course: CourseHippique) => {
    return [...(course.partants || [])].sort((a, b) => {
      const cA = a.coteProbable ?? 999;
      const cB = b.coteProbable ?? 999;
      if (cA !== cB) return cA - cB;
      return (b.hippoScore || 0) - (a.hippoScore || 0);
    });
  };

  // --- NOUVEAU : Calcul classement par valeur ---
  const getSortedPartantsByValeur = (course: CourseHippique) => {
    return [...(course.partants || [])]
      .map(p => ({ ...p, indexValeur: p.coteProbable !== undefined ? (p.hippoScore || 0) - p.coteProbable : -999 }))
      .sort((a, b) => b.indexValeur - a.indexValeur);
  };

  return (
    <div className="space-y-6">
      {/* Header with stats, Live Status Indicator and Actions */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">
                  Historique des Courses Analysées
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                  {history.length} {history.length > 1 ? 'courses' : 'course'}
                </span>

                {/* Badge Temps Réel Actif */}
                <span className="px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>En Direct — Synchro Temps Réel Active</span>
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Horodatage précis des analyses + Mise à jour continue des arrivées et cotes en direct.</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300 font-mono">Dernier contrôle live : <strong>{lastSyncedAt}</strong></span>
              </p>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleRefreshAllLive}
              disabled={isRefreshingAll || history.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black transition-all shadow-md disabled:opacity-50"
              title="Interroger le Web PMU et synchroniser toutes les courses de l'historique en temps réel"
            >
              {isRefreshingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronisation en cours...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>⚡ Actualiser tout en temps réel</span>
                </>
              )}
            </button>

            {/* Bouton d'Extraction des Arrivées en Direct (Google Search Grounding) */}
            <button
              type="button"
              onClick={() => setIsArrivalsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black transition-all shadow-md active:scale-95 shrink-0"
              title="🏁 Extraction en temps réel des arrivées provisoires et officielles depuis paristurf.com ou pmu.fr via Google Search Grounding"
            >
              <Trophy className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>🏁 Arrivées Live Grounding</span>
            </button>

            {/* Bouton Backtest Stratégique & Simulateur */}
            <button
              type="button"
              onClick={() => setIsBacktestModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 shrink-0"
              title="🎯 Lancer le Backtest Stratégique et simuler vos règles mécaniques de jeu (Trio, Simple, Couplé)"
            >
              <BarChart3 className="w-4 h-4 text-slate-950" />
              <span>🎯 Backtest & Simulateur IA</span>
            </button>

            {/* Bouton de Purge Automatique des courses passées */}
            {history.length > 0 && (
              <button
                type="button"
                onClick={handlePurgePastRaces}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 text-slate-300 border border-slate-700/60 hover:border-amber-500/40 text-xs font-bold transition-all shadow-sm shrink-0"
                title="Purger automatiquement les anciennes courses ou courses passées de l'historique"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>🧹 Purger les courses passées</span>
              </button>
            )}

            {history.length > 0 && (
              <>
                {showClearConfirm ? (
                  <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-rose-950/80 border border-rose-500/50">
                    <span className="text-xs text-rose-200 font-bold pl-1">Confirmer ?</span>
                    <button
                      type="button"
                      onClick={handleClearAllConfirm}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow"
                    >
                      Oui, tout effacer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700/60 hover:border-rose-500/40 text-xs font-bold transition-all"
                    title="Vider l'historique"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Vider</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* FILTRAGE PAR CALENDRIER & PLAGE DE DATES */}
      {history.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-white">
                    Filtrage par Calendrier & Plage de Dates
                  </h3>
                  {(startDate || endDate) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black animate-pulse flex items-center gap-1">
                      <Filter className="w-3 h-3 text-amber-400" />
                      Filtre actif : {startDate ? formatDateFR(startDate) : 'Début'} {endDate ? `➔ ${formatDateFR(endDate)}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Retrouvez vos analyses passées par date d'analyse ou date de la course ({filteredHistory.length} sur {history.length} affichée{filteredHistory.length > 1 ? 's' : ''}).
                </p>
              </div>
            </div>

            {/* Mode Cible : Date d'Analyse vs Date de la Course */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDateTargetMode('analyzedAt')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  dateTargetMode === 'analyzedAt'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Filtrer selon la date à laquelle la course a été analysée"
              >
                Date d'Analyse
              </button>
              <button
                type="button"
                onClick={() => setDateTargetMode('raceDate')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  dateTargetMode === 'raceDate'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Filtrer selon la date programmée de la course"
              >
                Date de Course
              </button>
              <button
                type="button"
                onClick={() => setDateTargetMode('both')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  dateTargetMode === 'both'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Filtrer si la date d'analyse OU la date de course correspond"
              >
                Les Deux
              </button>
            </div>
          </div>

          {/* Presets rapides (Aujourd'hui, Hier, 7j, 30j, Ce mois-ci, Tout) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              Accès rapide :
            </span>

            {[
              { id: 'all', label: 'Toutes les dates' },
              { id: 'today', label: 'Aujourd\'hui' },
              { id: 'yesterday', label: 'Hier' },
              { id: '7days', label: '7 derniers jours' },
              { id: '30days', label: '30 derniers jours' },
              { id: 'month', label: 'Ce mois-ci' },
              { id: 'custom', label: 'Plage sur mesure' },
            ].map((p) => {
              const isActive = datePreset === p.id && (p.id !== 'custom' || (startDate || endDate));
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectDatePreset(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-amber-500/30'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs font-black transition-all flex items-center gap-1 ml-auto"
                title="Effacer le filtre calendrier"
              >
                <X className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>

          {/* Formulaire Sélection de Dates Personnalisée */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <span>Date de début (du) :</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 transition-all font-mono"
                />
                {startDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      if (!endDate) setDatePreset('all');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <span>Date de fin (au) :</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 transition-all font-mono"
                />
                {endDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEndDate('');
                      if (!startDate) setDatePreset('all');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Information résumé du filtre de dates */}
            <div className="space-y-1 flex flex-col justify-end">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Analyses dans la plage :</span>
                <span className="font-mono font-extrabold text-amber-400 text-sm">
                  {filteredHistory.length} / {history.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      {history.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par hippodrome, nom d'épreuve, cheval, arrivée officielle ou R1C1..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Effacer
            </button>
          )}
        </div>
      )}

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/60 rounded-3xl border border-slate-800/80 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800 flex items-center justify-center text-slate-500">
            {startDate || endDate ? (
              <Calendar className="w-8 h-8 text-amber-400" />
            ) : (
              <History className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">
              {startDate || endDate
                ? 'Aucune analyse trouvée pour cette plage de dates'
                : searchQuery
                ? 'Aucun résultat pour cette recherche'
                : 'Aucune course dans l\'historique'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {startDate || endDate
                ? `Aucune analyse enregistrée entre ${startDate ? formatDateFR(startDate) : 'le début'} et ${endDate ? formatDateFR(endDate) : 'aujourd\'hui'}. Essayez de modifier ou réinitialiser le filtre calendrier.`
                : searchQuery
                ? 'Essayez de modifier votre recherche avec un autre nom de cheval ou hippodrome.'
                : 'Chaque analyse de lien officiel (Geny.com, Paris-Turf) s\'enregistre automatiquement ici avec mise à jour temps réel.'}
            </p>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser le filtre calendrier</span>
              </button>
            )}
          </div>
        </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 justify-items-center">
            {filteredHistory.map((item) => {
              const course = item.course;
              const isCurrent = course.id === currentCourseId;
              const hasArrival = Boolean(course.arriveeOfficielle);
              
              // Extraction des 5 premiers de la course pour affichage direct
              const arrivalNums = (course.arriveeOfficielle || '')
                .split(/[-,\s]+/)
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n) && n > 0);
              const top5Nums = arrivalNums.slice(0, 5);

              const postRace = computePostRaceAnalysis(course);
              const isComparisonExpanded = expandedComparisonId === item.id;

              return (
                <React.Fragment key={item.id}>
                  <div
                    onClick={() => onSelectCourse(course)}
                    className={`w-[5cm] h-[3.2cm] border-2 border-orange-500 bg-slate-950 rounded-lg p-3 flex flex-col items-center justify-center text-center shadow-lg cursor-pointer transition-all hover:scale-105 hover:bg-slate-900 group relative overflow-hidden ${
                      isCurrent ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950' : ''
                    }`}
                    title={`${course.titre} - Cliquez pour charger`}
                  >
                    {/* Références de la course (Date + R1C1 + Hippodrome) */}
                    <div className="flex flex-col items-center space-y-0.5">
                      <div className="text-[13px] font-black text-amber-500/90 mb-0.5">
                        {course.date || '--/--/----'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-orange-400 truncate">
                          {course.reunion || 'R?'}{course.course || 'C?'}
                        </span>
                        <span className="text-[14px] font-mono text-slate-400 group-hover:text-amber-300">
                          {course.heure || '--h--'}
                        </span>
                      </div>
                      <div className="text-[14px] font-bold text-white truncate uppercase tracking-tight">
                        {course.hippodrome}
                      </div>
                    </div>

                    {/* Arrivée */}
                    <div className="mt-2 w-full flex flex-col items-center border-t border-slate-800/50 pt-2">
                      <div className="text-[14px] text-slate-500 uppercase font-black mb-1 flex items-center gap-1.5">
                        <span>Arrivée</span>
                        {hasArrival && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {hasArrival ? (
                          <div className="flex gap-1 flex-wrap justify-center">
                            {top5Nums.map((num, idx) => (
                              <span key={idx} className="w-5 h-5 rounded-sm bg-slate-800 flex items-center justify-center text-[14px] font-black text-amber-400 border border-slate-700 shadow-sm">
                                {num}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[14px] text-slate-600 italic">En attente...</span>
                        )}
                      </div>
                    </div>

                  {/* Effet décoratif au survol */}
                  <div className="absolute bottom-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-3 h-3 text-orange-500" />
                  </div>


                {/* Panneau dépliant : PRONOSTICS DE JEU (Base de Jeu, TOP 8, Gros Rapport) */}
                {expandedPronosticsId === item.id && (
                  <div className="mt-4 pt-4 border-t border-amber-500/40 space-y-4 animate-fadeIn bg-slate-950/95 p-4 sm:p-6 rounded-3xl border-2 border-amber-500/50 shadow-2xl">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                          <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                            <span>PRONOSTICS DE JEU</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {course.reunion} {course.course} · {course.hippodrome}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Base de Jeu (Côte ≤ 4,9) · TOP 8 Sélection · Gros Rapport (Max 4 numéros)
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectCourse(course);
                          if (onNavigateTab) onNavigateTab('pronostics-jeu');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                        title="Ouvrir dans l'onglet Pronostics de Jeu des résultats"
                      >
                        <span>Ouvrir dans l'espace résultat</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <PronosticsDeJeuView
                      course={course}
                      onSelectHorseForTicket={() => onSelectCourse(course)}
                    />
                  </div>
                )}

                {/* Panneau dépliant : Tracé & Facteurs (Piste, Météo, Corde & Facteurs avec Classement des Cotes) */}
                {expandedTrackId === item.id && (
                  <div className="mt-4 pt-4 border-t border-amber-500/40 space-y-4 animate-fadeIn bg-slate-950/90 p-4 sm:p-5 rounded-2xl border-2 border-amber-500/50 shadow-xl">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl leading-none">🏛️</span>
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                            <span>Tracé & Facteurs Déterminants</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {course.hippodrome} · {course.distance}m · Corde à {course.corde || 'Gauche'}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Pénétrométrie, météo, vent, orientation, biais stalles/cordes et classement des numéros par cote
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectCourse(course);
                          if (onNavigateTab) onNavigateTab('trace-facteurs');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                        title="Ouvrir cette course dans l'espace d'affichage du résultat d'analyse"
                      >
                        <span>Ouvrir dans l'espace résultat</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Carte Complète d'Analyse Piste & Météo avec Classement des Cotes */}
                    <TrackWeatherAnalysisCard
                      course={course}
                      onNavigateTab={onNavigateTab}
                    />

                    {/* Synthèse Parcours & Pièges / Facteurs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {course.synthese?.analyseParcours && (
                        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-2">
                          <h5 className="font-black text-white text-xs flex items-center gap-1.5">
                            <span>🏟️</span>
                            <span>Analyse Approfondie du Parcours</span>
                          </h5>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {course.synthese.analyseParcours}
                          </p>
                        </div>
                      )}

                      {course.synthese?.piegesCourse && course.synthese.piegesCourse.length > 0 && (
                        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-2">
                          <h5 className="font-black text-rose-300 text-xs flex items-center gap-1.5">
                            <span>⚠️</span>
                            <span>Pièges & Facteurs Déterminants</span>
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {course.synthese.piegesCourse.map((piege, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2">
                                <span className="text-rose-400 font-black mt-0.5">•</span>
                                <span>{piege}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Panneau dépliant : Classement par Côte */}
                {expandedScoreId === item.id && (
                  <div className="mt-4 pt-4 border-t border-amber-500/30 space-y-3 animate-fadeIn bg-slate-950/80 p-4 rounded-2xl border border-amber-900/40">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      Classement des Chevaux par Côte
                    </h4>
                    <div className="space-y-1.5">
                      {getSortedPartantsByCote(course).map((p, idx) => {
                        const rank = idx + 1;
                        const score = p.hippoScore || 0;
                        let bgColor = 'bg-slate-800';
                        if (rank <= 3) bgColor = 'bg-emerald-500/10 border-emerald-500/30';
                        else if (rank <= 5) bgColor = 'bg-sky-500/10 border-sky-500/30';
                        else if (rank <= 8) bgColor = 'bg-orange-500/10 border-orange-500/30';
                        else bgColor = 'bg-red-500/10 border-red-500/30';

                        return (
                          <div key={`hist-cote-${item.id}-${p.numero}-${idx}`} className={`flex items-center justify-between p-2.5 rounded-xl border ${bgColor}`}>
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center text-slate-950 ${
                                rank <= 3 ? 'bg-emerald-500' :
                                rank <= 5 ? 'bg-sky-500' :
                                rank <= 8 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}>
                                {p.numero}
                              </span>
                              <span className="text-xs text-white">{p.nom}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-amber-400">{p.coteProbable ? `${p.coteProbable}/1` : '—'}</span>
                              <span className="text-[10px] text-slate-400">{score} pts</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Panneau dépliant : Index de Valeur */}
                {expandedValueId === item.id && (
                  <div className="mt-4 pt-4 border-t border-sky-500/30 space-y-3 animate-fadeIn bg-slate-950/80 p-4 rounded-2xl border border-sky-900/40">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      Classement par Index de Valeur (Score - Côte)
                    </h4>
                    <div className="space-y-1.5">
                      {getSortedPartantsByValeur(course).map((p, idx) => {
                        const rank = idx + 1;
                        let bgColor = 'bg-slate-800';
                        if (rank <= 3) bgColor = 'bg-emerald-500/10 border-emerald-500/30';
                        else if (rank <= 5) bgColor = 'bg-sky-500/10 border-sky-500/30';
                        else if (rank <= 8) bgColor = 'bg-orange-500/10 border-orange-500/30';
                        else bgColor = 'bg-red-500/10 border-red-500/30';

                        return (
                          <div key={`hist-val-${item.id}-${p.numero}-${idx}`} className={`flex items-center justify-between p-2.5 rounded-xl border ${bgColor}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-500 w-6 text-center">
                                {rank < 10 ? `#${rank}` : ''}
                              </span>
                              <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center text-slate-950 ${
                                rank <= 3 ? 'bg-emerald-500' :
                                rank <= 5 ? 'bg-sky-500' :
                                rank <= 8 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}>
                                {p.numero}
                              </span>
                              <span className="text-xs text-white">{p.nom}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400">{p.hippoScore} - {p.coteProbable !== undefined ? p.coteProbable : '—'} =</span>
                              <span className="font-black text-xs text-sky-400">{p.indexValeur > -500 ? p.indexValeur.toFixed(1) : '—'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {isComparisonExpanded && postRace && (
                  <div className="mt-4 pt-4 border-t border-purple-500/30 space-y-4 animate-fadeIn bg-slate-950/80 p-4 rounded-2xl border border-purple-900/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <h4 className="text-sm font-black text-white">
                          Rapport Comparatif Post-Course (HIÉRARCHIE QUINTÉ+ V38 vs Arrivée Officielle)
                        </h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${postRace.badgeColor}`}>
                        {postRace.badgeType}
                      </span>
                    </div>

                    {/* Stats d'efficacité */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Présence Hiérarchie V38</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          {postRace.presentInSelection} / {postRace.totalTop7}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Taux de Réussite</span>
                        <span className="text-lg font-black text-amber-400 font-mono">
                          {postRace.successRatioPct}%
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Base Incontournable</span>
                        <span className={`text-xs font-black block mt-1 ${postRace.baseAtArrival ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {postRace.baseAtArrival ? '✅ Dans les 3 premiers' : '❌ Hors podium'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">HIÉRARCHIE QUINTÉ+ V38</span>
                        <span className="text-xs font-mono font-bold text-amber-300 block mt-1">
                          {course.synthese?.selection8?.join(' - ') || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Tableau comparatif cheval par cheval à l'arrivée */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase bg-slate-900">
                            <th className="py-2 px-3">Arrivée Officielle</th>
                            <th className="py-2 px-3">N° / Cheval</th>
                            <th className="py-2 px-3">Jockey / Driver</th>
                            <th className="py-2 px-3 text-right">Cote</th>
                            <th className="py-2 px-3 text-center">Rang HIÉRARCHIE QUINTÉ+ V38</th>
                            <th className="py-2 px-3 text-center">Statut Pronostic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {postRace.details.map((det, idx) => (
                            <tr key={`hist-arrival-${item.id}-${det.rankArrival}-${idx}`} className="hover:bg-slate-900/60">
                              <td className="py-2 px-3 font-black">
                                <span className={`inline-flex items-center justify-center min-w-[32px] px-1.5 h-6 rounded-lg text-xs font-black ${
                                  det.rankArrival === 1
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : det.rankArrival === 2
                                    ? 'bg-slate-300 text-slate-950 font-bold'
                                    : det.rankArrival === 3
                                    ? 'bg-amber-800 text-amber-200'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {det.rankArrival}{det.rankArrival === 1 ? 'er' : 'e'}
                                </span>
                              </td>

                              <td className="py-2 px-3 font-bold text-white">
                                <span className="text-amber-400 font-mono mr-1.5">N°{det.num}</span>
                                <span>{det.nom}</span>
                              </td>

                              <td className="py-2 px-3 text-slate-400">
                                {det.driver || '—'}
                              </td>

                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-300">
                                {det.cote ? `${det.cote}/1` : '—'}
                              </td>

                              <td className="py-2 px-3 text-center">
                                {det.inSelection ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                                    Pos. #{det.selRank} dans Hiérarchie V38
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px]">
                                    Non retenu
                                  </span>
                                )}
                              </td>

                              <td className="py-2 px-3 text-center">
                                {det.isBase ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px]">
                                    BASE INCONTOURNABLE
                                  </span>
                                ) : det.isSecondeBase ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px]">
                                    SECONDE BASE
                                  </span>
                                ) : det.isOutsider ? (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-[10px]">
                                    OUTSIDER
                                  </span>
                                ) : det.isTocard ? (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px]">
                                    TOCARD
                                  </span>
                                ) : det.inSelection ? (
                                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold text-[10px]">
                                    CHANCE V38
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
                </React.Fragment>
              );
            })}
        </div>
      )}

      {/* Modale d'Extraction des Arrivées en Direct via Google Search Grounding */}
      <GroundingArrivalsModal
        isOpen={isArrivalsModalOpen}
        onClose={() => setIsArrivalsModalOpen(false)}
        onApplyArrivalToCourse={(arrStr, arrivalObj) => {
          if (arrivalObj) {
            const currentHist = getRaceHistory();
            const matched = currentHist.find(item => {
              const cId = `${(item.course.reunion || '').toUpperCase()}${(item.course.course || '').toUpperCase()}`;
              return cId === arrivalObj.courseId;
            });
            if (matched) {
              updateCourseInHistory(matched.id, {
                arriveeOfficielle: arrStr,
                statutCourse: (arrivalObj.isOfficial ? 'Arrivée officielle' : 'Arrivée provisoire') as any,
              });
              const updated = getRaceHistory();
              if (onUpdateHistory) onUpdateHistory(updated);
              showToast(`🏆 Arrivée appliquée à ${matched.course.titre} : ${arrStr}`);
            }
          }
        }}
        onSelectCourseForAnalysis={(courseId) => {
          const currentHist = getRaceHistory();
          const matched = currentHist.find(item => {
            const cId = `${(item.course.reunion || '').toUpperCase()}${(item.course.course || '').toUpperCase()}`;
            return cId === courseId;
          });
          if (matched) {
            onSelectCourse(matched.course);
            setIsArrivalsModalOpen(false);
          }
        }}
      />

      {/* Modale de Backtesting Stratégique & Simulation Walk-Forward */}
      <BacktestStrategieModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        history={history}
      />
    </div>
  );
};
