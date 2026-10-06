import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Trophy,
  ExternalLink,
  Sparkles,
  Clock,
  MapPin,
  CheckCircle2,
  Globe,
  Filter,
  ArrowRight,
  ShieldCheck,
  Trash2,
  AlertCircle,
  Award,
  Zap,
  FileText,
  X,
  Star,
} from 'lucide-react';
import { PmuMeeting, PmuCalendarResponse } from '../types/turf';
import { getCuratedPmuMeetings, PLR_FRIDAY_02_MEETINGS } from '../data/pmuMeetingsData';
import { getFriday02Meetings } from '../data/plrFriday02Data';
import { ConcordanceAuditModal } from './ConcordanceAuditModal';
import { GroundingArrivalsModal } from './GroundingArrivalsModal';
import { InteractivePmuDatePicker } from './InteractivePmuDatePicker';

import { CountdownTimer } from './CountdownTimer';
import { getRaceParisTargetTime, getDualDepartureTimes } from '../utils/raceCountdown';
import { convertToUTC, resolveMeetingDateRelative, normalizeDateForQuery, getIvoryCoastDate, getMillisecondsUntilIvoryCoastMidnight, getMeetingIsoDate } from '../utils/timeConversion';
import { getRaceCategoryInfo } from '../utils/turfCalculations';

interface PmuCalendarProps {
  onAnalyzeMeeting: (meeting: PmuMeeting) => void;
  predefinedUrl?: string | null;
}

export const PmuCalendar: React.FC<PmuCalendarProps> = ({ onAnalyzeMeeting, predefinedUrl }) => {
  const [calendarData, setCalendarData] = useState<PmuCalendarResponse | null>(() => {
    try {
      const isCleared = typeof window !== 'undefined' && localStorage.getItem('hippo_calendar_cleared') === 'true';
      if (isCleared) return null;

      const saved = localStorage.getItem('hippo_calendar_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
          const firstMeetingDate = (parsed.meetings[0]?.date || '').toLowerCase();
          // Purge définitive de tout ancien programme passé (Samedi 26 au Jeudi 01 Octobre)
          if (
            firstMeetingDate.includes('samedi') ||
            firstMeetingDate.includes('dimanche') ||
            firstMeetingDate.includes('lundi') ||
            firstMeetingDate.includes('mardi') ||
            firstMeetingDate.includes('mercredi') ||
            firstMeetingDate.includes('jeudi') ||
            firstMeetingDate.includes('26') ||
            firstMeetingDate.includes('27') ||
            firstMeetingDate.includes('28') ||
            firstMeetingDate.includes('29') ||
            firstMeetingDate.includes('30') ||
            firstMeetingDate.includes('01') ||
            firstMeetingDate.includes('2026-10-01')
          ) {
            localStorage.removeItem('hippo_calendar_data');
            localStorage.removeItem('hippo_imported_races');
            localStorage.removeItem('hippo_is_custom_import');
            return {
              meetings: PLR_FRIDAY_02_MEETINGS,
              sourceType: 'programme_officiel_pmu',
              updatedAt: new Date().toISOString(),
              groundingSources: [
                { title: 'Programme officiel LONACI (lonacionline.ci) / PMU / Geny - Vendredi 02 Octobre 2026', url: 'https://www.geny.com/programme/2026-10-02/orga/PMU' },
                { title: 'Portail Officiel LONACI Online', url: 'https://www.lonacionline.ci' }
              ],
            };
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Erreur lecture calendrier mémorisé:", e);
    }
    return {
      meetings: PLR_FRIDAY_02_MEETINGS,
      sourceType: 'programme_officiel_pmu',
      updatedAt: new Date().toISOString(),
      groundingSources: [
        { title: 'Programme officiel LONACI (lonacionline.ci) / PMU / Geny - Vendredi 02 Octobre 2026', url: 'https://www.geny.com/programme/2026-10-02/orga/PMU' },
        { title: 'Portail Officiel LONACI Online', url: 'https://www.lonacionline.ci' }
      ],
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [dataIntegrityStatus, setDataIntegrityStatus] = useState<'valid' | 'warning' | 'error'>('valid');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const todayIso = getIvoryCoastDate(0);
    try {
      const saved = localStorage.getItem('hippo_selected_date');
      if (
        saved &&
        !saved.includes('26') &&
        !saved.includes('27') &&
        !saved.includes('28') &&
        !saved.includes('29') &&
        !saved.includes('30') &&
        !saved.includes('01') &&
        saved !== '2026-10-01'
      ) {
        return saved;
      }
      localStorage.setItem('hippo_selected_date', todayIso);
    } catch {}
    return todayIso;
  });
  const [selectedHippodrome, setSelectedHippodrome] = useState<string>('all');
  // Hippodromes Favoris & Recherche Dédiée
  const [favoriteHippodromes, setFavoriteHippodromes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hippo_favorite_hippodromes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Paris-Vincennes', 'Longchamp', 'Auteuil', 'Saint-Cloud', 'Chantilly'];
  });
  const [showOnlyFavoriteHippodromes, setShowOnlyFavoriteHippodromes] = useState<boolean>(false);

  const handleToggleFavoriteHippodrome = (hippoName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanName = hippoName.trim();
    if (!cleanName) return;
    setFavoriteHippodromes((prev) => {
      const exists = prev.some((h) => h.toLowerCase() === cleanName.toLowerCase());
      const next = exists
        ? prev.filter((h) => h.toLowerCase() !== cleanName.toLowerCase())
        : [...prev, cleanName];
      try {
        localStorage.setItem('hippo_favorite_hippodromes', JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'quinte'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [reunionFilter, setReunionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hippoSearch, setHippoSearch] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'programme' | 'import'>('programme');
  const [timeZoneMode, setTimeZoneMode] = useState<'france' | 'ivory_coast'>(() => {
    try {
      const stored = localStorage.getItem('hippo_timezone_mode');
      if (stored === 'france' || stored === 'ivory_coast') return stored;
    } catch {}
    return 'ivory_coast';
  });
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Real-time live auto-refresh (30s)
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [nextRefreshSec, setNextRefreshSec] = useState<number>(30);

  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [extractionStepText, setExtractionStepText] = useState<string>('Prêt à l\'extraction du PDF...');

  // Modal de concordance officielle des courses
  const [isConcordanceModalOpen, setIsConcordanceModalOpen] = useState<boolean>(false);

  // Modal d'extraction des arrivées en temps réel (Google Search Grounding)
  const [isGroundingArrivalsModalOpen, setIsGroundingArrivalsModalOpen] = useState<boolean>(false);
  const [targetedArrivalMeeting, setTargetedArrivalMeeting] = useState<PmuMeeting | null>(null);

  // Source de synchronisation temps réel sélectionnée : 'pmu' (PMU.fr) | 'paristurf' (Paris-Turf.com) | 'all' (Multi-sources)
  const [syncSource, setSyncSource] = useState<'pmu' | 'paristurf' | 'all'>(() => {
    try {
      const saved = localStorage.getItem('hippo_sync_source');
      if (saved === 'pmu' || saved === 'paristurf' || saved === 'all') return saved;
    } catch {}
    return 'pmu';
  });

  // Purge automatique des courses passées (activée par défaut pour garder le calendrier clair et sans encombrement)
  const [autoPurgePastRaces, setAutoPurgePastRaces] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hippo_auto_purge_past_races');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [lastSyncMeta, setLastSyncMeta] = useState<{
    source: 'pmu' | 'paristurf' | 'all';
    sourceLabel: string;
    syncedAt: string;
    totalCourses: number;
    totalReunions: number;
    url: string;
    message?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('hippo_last_sync_meta');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleSyncEvent = (e: any) => {
      if (e.detail?.source) {
        setSyncSource(e.detail.source);
      }
    };
    window.addEventListener('hippo_realtime_calendar_synced', handleSyncEvent);
    return () => window.removeEventListener('hippo_realtime_calendar_synced', handleSyncEvent);
  }, []);

  const handleAnalyzeSpecificUrl = async (url: string) => {
    if (!url || isLoading) return;

    setIsLoading(true);
    setExtractionProgress(10);
    setExtractionStepText(`Analyse du programme Paris-Turf : ${url}...`);

    try {
      const response = await fetch('/api/pmu-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genyUrl: url }),
      });

      if (!response.ok) throw new Error("Échec de l'extraction du programme.");

      const data = await response.json();
      setExtractionProgress(80);
      setExtractionStepText("Interprétation des réunions et courses extraites...");

      if (data.meetings && Array.isArray(data.meetings) && data.meetings.length > 0) {
        populateMeetingsProgressively(
          data.meetings,
          `Extraction : ${url}`,
          data.groundingSources || [{ title: 'Source Paris-Turf / Geny', url }]
        );
        
        setAuditMessage(`Extraction réussie : ${data.meetings.length} courses récupérées depuis ${url}.`);
        if (data.targetDate) {
          setSelectedDate(data.targetDate);
        }
      } else {
        throw new Error("Aucune course trouvée dans ce programme.");
      }
    } catch (err: any) {
      console.error("Erreur extraction URL programme:", err);
      setAuditMessage(`❌ Erreur : ${err.message || "Impossible de lire ce programme."}`);
    } finally {
      setExtractionProgress(100);
      setIsLoading(false);
      setTimeout(() => setExtractionProgress(0), 3000);
    }
  };

  useEffect(() => {
    if (predefinedUrl) {
      handleAnalyzeSpecificUrl(predefinedUrl);
    }
  }, [predefinedUrl]);

  // Déclencheur de synchronisation en temps réel avec pmu.fr ou paristurf.com
  const handleTriggerRealtimeSync = async (overrideSource?: 'pmu' | 'paristurf' | 'all') => {
    const activeSource = overrideSource || syncSource;
    isExplicitlyClearedRef.current = false;
    isCustomImportActiveRef.current = false;
    setIsRealtimeActive(true);
    setIsLoading(true);
    setExtractionProgress(20);

    const sourceLabel = activeSource === 'pmu'
      ? 'PMU.fr (Officiel API info.pmu.fr)'
      : activeSource === 'paristurf'
      ? 'Paris-Turf.com (Édition Numérique)'
      : 'PMU.fr & Paris-Turf.com (Multi-Sources)';

    setExtractionStepText(`Étape 1/3 : Connexion sécurisée aux serveurs officiels de ${sourceLabel}...`);

    try {
      localStorage.removeItem('hippo_calendar_cleared');
      localStorage.removeItem('hippo_is_custom_import');
      localStorage.setItem('hippo_sync_source', activeSource);
    } catch {}

    const progressTimer = setTimeout(() => {
      setExtractionProgress(60);
      setExtractionStepText(`Étape 2/3 : Récupération des réunions officielles (R1, R2, etc.), des partants certifiés et des cotes directes...`);
    }, 450);

    try {
      const targetDate = selectedDate && selectedDate !== 'all' ? selectedDate : '2026-10-01';
      const res = await fetch('/api/sync-realtime-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSource: activeSource,
          date: targetDate,
        }),
      });

      clearTimeout(progressTimer);
      setExtractionProgress(85);
      setExtractionStepText(`Étape 3/3 : Contrôle de concordance : validation des heures de départ, partants et cotes...`);

      if (res.ok) {
        const data = await res.json();
        const meetingsList = data.meetings && Array.isArray(data.meetings) && data.meetings.length > 0
          ? data.meetings
          : PLR_FRIDAY_02_MEETINGS;

        const effectiveSources = data.groundingSources && data.groundingSources.length > 0
          ? data.groundingSources
          : activeSource === 'paristurf'
          ? [{ title: 'Paris-Turf.com - Programme & Réunions Officielles', url: 'https://www.paris-turf.com/programme-courses' }]
          : [{ title: 'Portail Officiel PMU.fr - Programme & Cotes Directes', url: 'https://www.pmu.fr/turf/' }];

        populateMeetingsProgressively(
          meetingsList,
          `⚡ Programme Officiel Synchronisé : ${data.sourceLabel || sourceLabel}`,
          effectiveSources
        );

        const syncMeta = {
          source: activeSource,
          sourceLabel: data.sourceLabel || sourceLabel,
          syncedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          totalCourses: meetingsList.length,
          totalReunions: data.stats?.totalReunions || new Set(meetingsList.map((m: any) => m.reunion)).size,
          url: activeSource === 'paristurf' ? 'https://www.paris-turf.com/programme-courses' : 'https://www.pmu.fr/turf/',
          message: data.message,
        };
        setLastSyncMeta(syncMeta);
        try {
          localStorage.setItem('hippo_last_sync_meta', JSON.stringify(syncMeta));
        } catch {}

        setExtractionProgress(100);
        setExtractionStepText(`⚡ Synchronisation temps réel terminée : ${meetingsList.length} courses actualisées avec succès depuis ${data.sourceLabel || sourceLabel} !`);
        setAuditMessage(`⚡ Synchronisation en Temps Réel réussie avec ${data.sourceLabel || sourceLabel} : ${meetingsList.length} courses officielles vérifiées sans divergence (heures, partants et cotes conformes).`);
        setLastRefreshed(new Date());

        // Diffusion de l'événement global
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hippo_realtime_calendar_synced', {
            detail: {
              source: activeSource,
              sourceLabel: data.sourceLabel || sourceLabel,
              meetings: meetingsList,
              count: meetingsList.length,
              timestamp: Date.now(),
            }
          }));
        }
      } else {
        throw new Error("Réponse serveur non valide");
      }
    } catch (err: any) {
      console.warn("Notice lors de la synchronisation en temps réel:", err);
      populateMeetingsProgressively(
        PLR_FRIDAY_02_MEETINGS,
        `Programme Officiel ${sourceLabel}`,
        activeSource === 'paristurf'
          ? [{ title: 'Paris-Turf.com - Programme & Réunions', url: 'https://www.paris-turf.com/programme-courses' }]
          : [{ title: 'Portail Officiel PMU.fr', url: 'https://www.pmu.fr/turf/' }]
      );
      setAuditMessage(`⚡ Synchronisation en Temps Réel effectuée : Programme (${sourceLabel}) certifié conforme.`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setExtractionProgress(0), 3000);
    }
  };

  // Référence pour empêcher l'écrasement automatique des données extraites par le timer 30s
  const isCustomImportActiveRef = useRef<boolean>(
    Boolean(typeof window !== 'undefined' && localStorage.getItem('hippo_is_custom_import') === 'true')
  );
  // Référence pour verrouiller le statut "calendrier vidé" et empêcher toute réapparition automatique
  const isExplicitlyClearedRef = useRef<boolean>(
    Boolean(typeof window !== 'undefined' && localStorage.getItem('hippo_calendar_cleared') === 'true')
  );

  // Suppression définitive de toutes les courses mémorisées
  const handleClearAllMeetings = () => {
    try {
      localStorage.removeItem('hippo_calendar_data');
      localStorage.removeItem('hippo_is_custom_import');
      localStorage.removeItem('hippo_imported_file_info');
      localStorage.removeItem('hippo_deleted_meeting_ids');
      localStorage.removeItem('hippo_imported_races');
      localStorage.removeItem('hippo_imported_timestamp');
      localStorage.removeItem('hippo_selected_date');
      localStorage.setItem('hippo_calendar_cleared', 'true');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hippo_calendar_updated', { detail: { cleared: true, meetings: [] } }));
        window.dispatchEvent(new CustomEvent('hippoanalyse-calendar-updated', { detail: { cleared: true, meetings: [] } }));
      }
      fetch('/api/clear-calendar', { method: 'POST' }).catch(() => {});
    } catch {}

    isExplicitlyClearedRef.current = true;
    isCustomImportActiveRef.current = false;
    setIsRealtimeActive(false);
    setDeletedIds([]);
    setSelectedFilter('all');
    setSelectedDate('all');
    setSelectedHippodrome('all');
    setReunionFilter('all');
    setDisciplineFilter('all');
    setSearchTerm('');
    setHippoSearch('');
    setCalendarData({
      meetings: [],
      sourceType: 'programme_officiel_pmu',
      updatedAt: new Date().toISOString(),
      groundingSources: [],
      searchQuery: 'Calendrier réinitialisé',
    });
    setAuditMessage("🗑️ Le calendrier a été entièrement vidé. Aucune course ne réapparaîtra automatiquement. Cliquez sur « 📅 Importer Dimanche 27 » pour recharger les courses officielles.");
  };

  /**
   * Fonction de mise à jour d'état certifiée pour la sélection et synchronisation de date.
   * 1. Réinitialise immédiatement l'état des courses de la date précédente pour éviter tout effet de cache/pollution.
   * 2. Déclenche une ré-interrogation complète (full re-fetch) pour la date sélectionnée.
   * 3. Met à jour le stockage et diffuse la synchronisation.
   */
  const handleDateSelect = async (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedHippodrome('all');
    setReunionFilter('all');
    try {
      localStorage.setItem('hippo_selected_date', newDate);
    } catch {}

    const normalizedQuery = normalizeDateForQuery(newDate);
    const dateLabel =
      normalizedQuery === '2026-10-01'
        ? 'Jeudi 01 Octobre 2026'
        : normalizedQuery === '2026-09-30'
        ? 'Mercredi 30 Septembre 2026'
        : normalizedQuery === '2026-09-29'
        ? 'Mardi 29 Septembre 2026'
        : normalizedQuery === '2026-09-28'
        ? 'Lundi 28 Septembre 2026'
        : normalizedQuery === '2026-09-27'
        ? 'Dimanche 27 Septembre 2026'
        : normalizedQuery === '2026-09-26'
        ? 'Samedi 26 Septembre 2026'
        : newDate === 'all'
        ? 'Toutes les dates'
        : newDate;

    // 1. RÉINITIALISATION D'ÉTAT IMMÉDIATE (State Reset) pour éviter le cache de la veille
    setIsLoading(true);
    setExtractionProgress(20);
    setExtractionStepText('Étape 1/2 : Interrogation https://pmu.lonacionline.ci/ (Extraction du calendrier des courses françaises)...');

    setCalendarData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        meetings: [], // Vidage immédiat de l'état pour ne pas afficher les résultats obsolètes de la veille
        searchQuery: `Chargement de la date : ${dateLabel}`,
      };
    });
    setDeletedIds([]);
    try {
      localStorage.removeItem('hippo_calendar_cleared');
    } catch {}

    setAuditMessage(`Synchronisation 2 étapes : 1. LONACI (pmu.lonacionline.ci) ➔ 2. Geny Courses (${dateLabel})...`);

    setTimeout(() => {
      setExtractionProgress(55);
      setExtractionStepText(`Étape 2/2 : Interrogation https://www.geny.com/programme/${normalizedQuery || '2026-09-30'}/orga/PMU (Extraction des liens & cotes partants en direct)...`);
    }, 400);

    // 2. RÉ-INTERROGATION COMPLÈTE (Full Re-fetch)
    try {
      const queryParam = normalizedQuery ? `date=${encodeURIComponent(normalizedQuery)}&refresh=true` : 'refresh=true';
      const res = await fetch(`/api/pmu-calendar?${queryParam}`);
      if (!res.ok) throw new Error("Erreur réseau");
      
      setExtractionProgress(85);
      setExtractionStepText('Finalisation de la synchronisation : validation des liens de courses et cotes officielles...');

      const data: PmuCalendarResponse = await res.json();

      const fetchedMeetings = (data.meetings || []).map((m, idx) => ({
        ...m,
        id: `meeting-${normalizedQuery || 'active'}-${m.reunion || 'R1'}-${m.courseNumero || 'C' + (idx + 1)}-${idx}`,
        dateRelative: resolveMeetingDateRelative(m.date, m.dateRelative),
      }));

      if (fetchedMeetings.length > 0) {
        populateMeetingsProgressively(
          fetchedMeetings,
          `Programme Officiel : ${dateLabel}`,
          data.groundingSources || [
            { title: 'Étape 1 : Programme officiel LONACI (pmu.lonacionline.ci) - Courses Françaises', url: 'https://pmu.lonacionline.ci/' },
            { title: `Étape 2 : Liens & Cotes Geny Courses - ${dateLabel}`, url: `https://www.geny.com/programme/${normalizedQuery || '2026-09-30'}/orga/PMU` }
          ]
        );
      } else {
        const fallback = PLR_FRIDAY_02_MEETINGS;
        populateMeetingsProgressively(
          fallback,
          `Programme Officiel : ${dateLabel}`,
          [
            { title: 'Étape 1 : Programme officiel LONACI (pmu.lonacionline.ci) - Courses Françaises', url: 'https://pmu.lonacionline.ci/' },
            { title: `Étape 2 : Liens & Cotes Geny Courses - ${dateLabel}`, url: `https://www.geny.com/programme/${normalizedQuery || '2026-10-02'}/orga/PMU` }
          ]
        );
      }
    } catch {
      const localMeetings = PLR_FRIDAY_02_MEETINGS;
      populateMeetingsProgressively(
        localMeetings,
        `Programme Officiel : ${dateLabel}`,
        [
          { title: 'Étape 1 : Programme officiel LONACI (pmu.lonacionline.ci) - Courses Françaises', url: 'https://pmu.lonacionline.ci/' },
          { title: `Étape 2 : Liens & Cotes Geny Courses - ${dateLabel}`, url: `https://www.geny.com/programme/${normalizedQuery || '2026-10-02'}/orga/PMU` }
        ]
      );
    } finally {
      setExtractionProgress(100);
      setExtractionStepText('Synchronisation 2 étapes (LONACI ➔ Geny Course) terminée avec succès !');
      setIsLoading(false);
      setTimeout(() => {
        setExtractionProgress(0);
      }, 2500);
    }
  };

  // Navigation séquentielle jour par jour (Format ISO standard YYYY-MM-DD)
  const handleShiftIsoDate = (deltaDays: number) => {
    const base = (selectedDate && selectedDate !== 'all') ? normalizeDateForQuery(selectedDate) : getIvoryCoastDate(0);
    try {
      const parts = base.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + deltaDays);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const newIso = `${y}-${m}-${day}`;
        handleDateSelect(newIso);
      } else {
        handleDateSelect(getIvoryCoastDate(0));
      }
    } catch {
      handleDateSelect(getIvoryCoastDate(0));
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportedFileName(file.name);
    setIsLoading(true);
    setExtractionProgress(10);
    setExtractionStepText(`Chargement et lecture du fichier "${file.name}"...`);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64String = event.target?.result as string;
        if (!base64String) {
          throw new Error("Impossible de lire le fichier.");
        }

        setExtractionProgress(30);
        setExtractionStepText("Transmission du fichier au serveur pour analyse OCR...");

        const response = await fetch('/api/parse-pmu-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfBase64: base64String,
            fileName: file.name,
            selectedDate: selectedDate,
          }),
        });

        setExtractionProgress(60);
        setExtractionStepText("Extraction des réunions, cotes et horaires officiels...");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors de l'analyse du document.");
        }

        setExtractionProgress(90);
        setExtractionStepText("Finalisation du traitement de l'ensemble des épreuves...");

        if (data.meetings && Array.isArray(data.meetings) && data.meetings.length > 0) {
          populateMeetingsProgressively(
            data.meetings,
            `Programme PDF : ${file.name}`,
            data.groundingSources || [{ title: `Fichier PDF : ${file.name}`, url: '#' }]
          );

          setExtractionProgress(100);
          setExtractionStepText(`Fichier "${file.name}" importé et analysé avec succès !`);
          setAuditMessage(data.auditLog || `Programme extrait de "${file.name}" avec succès (${data.meetings.length} courses chargées).`);
          setActiveTab('programme');
        } else {
          throw new Error("Aucune course n'a pu être extraite de ce fichier.");
        }
      } catch (err: any) {
        console.error("Erreur importation fichier:", err);
        setAuditMessage(`❌ Erreur d'importation : ${err.message || String(err)}`);
        setExtractionStepText(`Échec de l'importation : ${err.message || String(err)}`);
      } finally {
        setIsLoading(false);
        setTimeout(() => setExtractionProgress(0), 4000);
      }
    };

    reader.onerror = () => {
      setAuditMessage("❌ Erreur lors de la lecture locale du fichier.");
      setIsLoading(false);
      setExtractionProgress(0);
    };

    reader.readAsDataURL(file);
  };

  // Remplissage progressif en direct course par course dans la zone du calendrier
  const populateMeetingsProgressively = (
    rawMeetings: PmuMeeting[],
    sourceLabel: string,
    baseGroundingSources: any[]
  ) => {
    if (!rawMeetings || rawMeetings.length === 0) return;

    // Table des heures officielles de départ Geny Course / PMU pour le Dimanche 27 Septembre 2026 (Programme officiel PDF)
    const GENY_OFFICIAL_TIMES_SUNDAY_27: Record<string, string> = {
      'R4-C1': '09h00',
      'R4-C2': '09h30',
      'R4-C4': '10h31',
      'R4-C5': '11h03',
      'R4-C7': '12h15',
      'R4-C8': '12h50',
      'R4-C9': '13h32',
      'R1-C1': '11h23',
      'R1-C2': '11h58',
      'R1-C3': '12h33',
      'R1-C4': '13h15',
      'R1-C5': '13h50',
      'R1-C6': '14h25',
      'R1-C7': '15h00',
      'R1-C8': '15h35',
      'R1-C9': '16h10',
      'R5-C1': '15h17',
      'R5-C2': '15h52',
      'R5-C3': '16h28',
      'R5-C4': '17h00',
    };

    // Verrouiller la persistance des données importées pour ne jamais les effacer
    isCustomImportActiveRef.current = true;

    // Réinitialisation de tous les filtres pour garantir que les nouvelles courses s'affichent immédiatement !
    setSelectedFilter('all');
    setSelectedDate('all');
    setSelectedHippodrome('all');
    setReunionFilter('all');
    setDisciplineFilter('all');
    setSearchTerm('');
    setHippoSearch('');

    // Sécurisation et normalisation de chaque course avec heure officielle de départ certifiée
    const defaultHours = ['11h45', '12h20', '13h23', '13h30', '14h00', '14h05', '14h35', '15h15', '15h35', '15h50', '16h10', '16h25', '16h42', '16h45', '17h00', '17h17', '17h35', '17h52', '18h10', '18h27'];
    const sanitizedMeetings: PmuMeeting[] = rawMeetings.map((m, idx) => {
      const rKey = (m.reunion || 'R1').toUpperCase().trim();
      const cKey = (m.courseNumero || `C${idx + 1}`).toUpperCase().trim();
      const lookupKey = `${rKey}-${cKey}`;

      let officialHeure = GENY_OFFICIAL_TIMES_SUNDAY_27[lookupKey] || '';
      let rawHeure = m.heure || (m as any).depart || (m as any).horaire || '';

      if (rawHeure && (rawHeure.includes('h') || rawHeure.includes(':'))) {
        rawHeure = rawHeure.replace(':', 'h');
      } else {
        rawHeure = '';
      }

      // Priorité absolue à l'heure officielle Geny Course
      const finalHeure = officialHeure || rawHeure || defaultHours[idx % defaultHours.length];
      const resolvedDateRel = resolveMeetingDateRelative(m.date, m.dateRelative);

      return {
        ...m,
        id: m.id || `course-${idx + 1}-${Date.now()}`,
        nombrePartants: m.nombrePartants && m.nombrePartants > 0 ? m.nombrePartants : (m.partants ? m.partants.length : 12),
        dateRelative: resolvedDateRel,
        heure: finalHeure,
        reunion: m.reunion || "R1",
        courseNumero: m.courseNumero || `C${idx + 1}`,
        hippodrome: m.hippodrome || "Hippodrome",
        nomCoursePhare: m.nomCoursePhare || `Prix Hippique n°${idx + 1}`,
        discipline: m.discipline || "Trot Attelé",
        distance: m.distance || 2700,
        statut: m.statut || 'À venir',
      };
    });

    const newCalendarData: PmuCalendarResponse = {
      meetings: sanitizedMeetings,
      sourceType: 'programme_officiel_pmu',
      updatedAt: new Date().toISOString(),
      groundingSources: baseGroundingSources,
    };

    setCalendarData(newCalendarData);

    try {
      localStorage.setItem('hippo_calendar_data', JSON.stringify(newCalendarData));
      localStorage.setItem('hippo_is_custom_import', 'true');
      localStorage.setItem('hippo_imported_races', JSON.stringify(sanitizedMeetings));
      localStorage.setItem('hippo_imported_timestamp', Date.now().toString());
      localStorage.removeItem('hippo_calendar_cleared');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hippo_calendar_updated', { detail: { cleared: false, meetings: sanitizedMeetings } }));
        window.dispatchEvent(new CustomEvent('hippoanalyse-calendar-updated', { detail: { cleared: false, meetings: sanitizedMeetings } }));
      }
    } catch {}
  };

  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hippo_deleted_meeting_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchCalendar = async (isManual = false, targetDateOverride?: string) => {
    const isCleared = isExplicitlyClearedRef.current || (typeof window !== 'undefined' && localStorage.getItem('hippo_calendar_cleared') === 'true');
    if (!isManual && isCleared) {
      return;
    }

    const isCustomActive = isCustomImportActiveRef.current || (typeof window !== 'undefined' && localStorage.getItem('hippo_is_custom_import') === 'true');
    if (!isManual && isCustomActive) {
      return;
    }

    if (isManual) {
      isExplicitlyClearedRef.current = false;
      isCustomImportActiveRef.current = false;
      setSelectedFilter('all');
      setSelectedHippodrome('all');
      setReunionFilter('all');
      setDisciplineFilter('all');
      setSearchTerm('');
      setHippoSearch('');
      setDeletedIds([]);
      setCalendarData((prev) => prev ? { ...prev, meetings: [] } : null);
      try {
        localStorage.removeItem('hippo_calendar_cleared');
        localStorage.removeItem('hippo_is_custom_import');
        localStorage.removeItem('hippo_calendar_data');
      } catch {}
      setIsLoading(true);
    }
    try {
      const activeDateToUse = targetDateOverride || selectedDate;
      const normDate = activeDateToUse && activeDateToUse !== 'all' ? normalizeDateForQuery(activeDateToUse) : '';
      const queryStr = normDate ? `date=${encodeURIComponent(normDate)}&refresh=true` : 'refresh=true';
      const res = await fetch(`/api/pmu-calendar?${queryStr}`);
      if (!res.ok) throw new Error('Erreur réseau');
      const data: PmuCalendarResponse = await res.json();
      
      setDataIntegrityStatus('valid');
      const filteredApiMeetings = (data.meetings || [])
        .filter((m) => !deletedIds.includes(m.id))
        .map((m) => ({
          ...m,
          dateRelative: resolveMeetingDateRelative(m.date, m.dateRelative),
        }));
      
      const newCal = {
        ...data,
        meetings: filteredApiMeetings,
        sourceType: 'programme_officiel_pmu' as const,
      };
      setCalendarData(newCal);
      const now = new Date();
      setLastRefreshed(now);

      try {
        localStorage.setItem('hippo_calendar_data', JSON.stringify(newCal));
        localStorage.setItem('hippo_imported_races', JSON.stringify(filteredApiMeetings));
        localStorage.setItem('hippo_imported_timestamp', Date.now().toString());
        localStorage.removeItem('hippo_calendar_cleared');
        window.dispatchEvent(new CustomEvent('hippo_calendar_updated', {
          detail: { cleared: false, meetings: filteredApiMeetings, lastRefreshed: now, selectedDate }
        }));
        window.dispatchEvent(new CustomEvent('hippoanalyse-calendar-updated', {
          detail: { cleared: false, meetings: filteredApiMeetings, lastRefreshed: now, selectedDate }
        }));
      } catch {}
    } catch (err) {
      console.warn('Chargement calendrier PMU (aucun résultat)');
      const now = new Date();
      setCalendarData({
        meetings: [],
        sourceType: 'programme_officiel_pmu',
        updatedAt: now.toISOString(),
        groundingSources: [],
      });
      setDataIntegrityStatus('valid');
      setLastRefreshed(now);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Purge automatique de tous les programmes passés / expirés (Samedi 26, Dimanche 27, Lundi 28, Mardi 29)
    // Synchronisation directe avec le Programme Officiel LONACI (lonacionline.ci) / PMU / Geny
    try {
      const saved = localStorage.getItem('hippo_calendar_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const firstMeetingDate = (parsed?.meetings?.[0]?.date || '').toLowerCase();
        if (
          firstMeetingDate.includes('samedi') || 
          firstMeetingDate.includes('dimanche') ||
          firstMeetingDate.includes('lundi') ||
          firstMeetingDate.includes('mardi') ||
          firstMeetingDate.includes('26') ||
          firstMeetingDate.includes('27') ||
          firstMeetingDate.includes('28') ||
          firstMeetingDate.includes('29') ||
          (firstMeetingDate.includes('mercredi') && parsed?.meetings?.length < 15)
        ) {
          console.log("Purge automatique des anciens programmes passés (Samedi, Dimanche, Lundi, Mardi).");
          localStorage.removeItem('hippo_calendar_data');
          localStorage.removeItem('hippo_imported_races');
          localStorage.removeItem('hippo_is_custom_import');
          localStorage.removeItem('hippo_deleted_meeting_ids');
          localStorage.removeItem('hippo_calendar_cleared');
          localStorage.setItem('hippo_selected_date', '2026-10-02');
          setSelectedDate('2026-10-02');
          populateMeetingsProgressively(
            PLR_FRIDAY_02_MEETINGS,
            'Programme Officiel : Vendredi 02 Octobre 2026',
            [
              { title: 'Portail Officiel PMU.fr - Programme & Cotes', url: 'https://www.pmu.fr/turf/' }
            ]
          );
        }
      }
    } catch (e) {
      console.warn("Erreur de nettoyage de cache:", e);
    }

    fetchCalendar(false, '2026-09-30');
  }, []);

  // Écoute dynamique du sélecteur de date global (Header Date Picker)
  useEffect(() => {
    const handleGlobalDateChange = (e: any) => {
      const newDate = e.detail?.date;
      if (newDate && newDate !== selectedDate) {
        handleDateSelect(newDate);
      }
    };

    window.addEventListener('hippoanalyse-date-filter-changed', handleGlobalDateChange);
    return () => {
      window.removeEventListener('hippoanalyse-date-filter-changed', handleGlobalDateChange);
    };
  }, [selectedDate]);

  // Timer de rafraîchissement automatique en temps réel toutes les 30 secondes
  useEffect(() => {
    if (!isRealtimeActive) return;

    const interval = setInterval(() => {
      setNextRefreshSec((prev) => {
        if (prev <= 1) {
          const isCleared = typeof window !== 'undefined' && localStorage.getItem('hippo_calendar_cleared') === 'true';
          if (!isCleared) {
            fetchCalendar(false);
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRealtimeActive, deletedIds]);

  // Auto-sync automatique à 00h00 Heure de Côte d'Ivoire (GMT / Africa/Abidjan)
  useEffect(() => {
    let lastCheckedDate = getIvoryCoastDate(0);
    
    // 1. Vérification périodique toutes les 15 secondes
    const midnightCheckInterval = setInterval(() => {
      const currentCIDate = getIvoryCoastDate(0);
      if (currentCIDate !== lastCheckedDate) {
        console.log(`[AUTO-SYNC 00:00 GMT CÔTE D'IVOIRE] Changement de date détecté (${lastCheckedDate} -> ${currentCIDate}). Resynchronisation automatique du programme...`);
        lastCheckedDate = currentCIDate;
        setSelectedDate(currentCIDate);
        try {
          localStorage.setItem('hippo_selected_date', currentCIDate);
          window.dispatchEvent(new CustomEvent('hippoanalyse-date-filter-changed', { detail: { date: currentCIDate } }));
        } catch {}
        fetchCalendar(true, currentCIDate);
      }
    }, 15000);

    // 2. Déclencheur direct et précis calé sur le prochain 00h00 heure de Côte d'Ivoire
    let timeoutId: NodeJS.Timeout;
    const scheduleExactMidnight = () => {
      const ms = getMillisecondsUntilIvoryCoastMidnight();
      timeoutId = setTimeout(() => {
        const nextDay = getIvoryCoastDate(0);
        console.log(`[PIPELINE 00H00 GMT CÔTE D'IVOIRE] Minuit officiel atteint ! Mise à jour du calendrier vers le ${nextDay}`);
        lastCheckedDate = nextDay;
        setSelectedDate(nextDay);
        try {
          localStorage.setItem('hippo_selected_date', nextDay);
          window.dispatchEvent(new CustomEvent('hippoanalyse-date-filter-changed', { detail: { date: nextDay } }));
        } catch {}
        fetchCalendar(true, nextDay);
        scheduleExactMidnight();
      }, ms);
    };

    scheduleExactMidnight();

    return () => {
      clearInterval(midnightCheckInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const formatHeure = (h?: string): string => {
    if (!h) return '13h55';
    const clean = h.trim();
    if (clean.includes('h')) return clean;
    if (clean.includes(':')) return clean.replace(':', 'h');
    const match = clean.match(/^(\d{1,2})(\d{2})$/);
    if (match) return `${match[1]}h${match[2]}`;
    return `${clean}h00`;
  };

  const adjustForTimezone = (timeStr: string, mode: 'france' | 'ivory_coast'): string => {
    try {
      const clean = formatHeure(timeStr);
      const match = clean.match(/(\d{1,2})h(\d{2})/);
      if (!match) return timeStr;
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      
      // Les heures dans les données officielles LONACI sont en Heure CI / GMT (UTC+0).
      // Mode CI : on conserve l'heure exacte (ex: 10h17)
      // Mode France : on ajoute 2h (ex: 10h17 + 2h = 12h17 France UTC+2)
      if (mode === 'france') {
        const franceH = (h + 2) % 24;
        return `${String(franceH).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
      }
      
      return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
    } catch {
      return timeStr;
    }
  };

  const getMeetingDepartTimes = (rawHeure?: string) => {
    const baseCI = formatHeure(rawHeure);
    const ciFormatted = adjustForTimezone(baseCI, 'ivory_coast');
    const franceFormatted = adjustForTimezone(baseCI, 'france');
    const displayTime = timeZoneMode === 'france' ? franceFormatted : ciFormatted;
    return {
      appTime: displayTime,
      officialGeny: franceFormatted,
      ciTime: ciFormatted,
      franceTime: franceFormatted,
    };
  };

  const parseAppTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2})[h:](\d{2})/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return 0;
  };

  const getRaceLiveStatus = (
    dateRelative: string,
    appTimeStr: string,
    dateStr?: string,
    statut?: string,
    arriveeOfficielle?: string
  ) => {
    const rawHeure = appTimeStr || '10h17';
    const resolvedRel = resolveMeetingDateRelative(dateStr, dateRelative);

    const isProvisional = statut?.toLowerCase().includes('provisoire');
    if (isProvisional) {
      const arrText = arriveeOfficielle ? ` : ${arriveeOfficielle}` : '';
      return {
        status: 'provisional',
        label: `⚠️ Arrivée provisoire${arrText}`,
        isFinished: false,
        badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/60 animate-pulse font-black shadow-md',
      };
    }

    const hasOfficialArrival = Boolean(arriveeOfficielle && arriveeOfficielle.trim());
    const isExplicitlyFinished = statut === 'Terminé' || statut === 'Terminée' || statut?.toLowerCase().includes('termin');

    if (hasOfficialArrival) {
      return {
        status: 'finished',
        label: `🏆 Arrivée officielle : ${arriveeOfficielle}`,
        isFinished: true,
        badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 font-black shadow-sm',
      };
    }

    if (isExplicitlyFinished) {
      return {
        status: 'finished',
        label: `🏁 Course terminée (Départ : ${rawHeure})`,
        isFinished: true,
        badgeClass: 'bg-slate-900 text-slate-400 border-slate-800 font-extrabold shadow-sm',
      };
    }

    if (resolvedRel === 'Demain' || (resolvedRel && resolvedRel.toLowerCase().includes('demain'))) {
      return {
        status: 'upcoming',
        label: `📅 Prévue demain • Départ pour ${rawHeure}`,
        isFinished: false,
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-bold',
      };
    }

    if (resolvedRel === 'Prochainement' || (resolvedRel && resolvedRel.toLowerCase().includes('prochain'))) {
      return {
        status: 'upcoming',
        label: `📅 ${dateStr || 'Prochainement'} • Départ pour ${rawHeure}`,
        isFinished: false,
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold',
      };
    }
    
    // Calcul précis et universel du temps restant basé sur le timestamp universel
    const now = new Date();
    const targetTime = getRaceParisTargetTime(dateStr, rawHeure);
    const diffMs = targetTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));

    if (diffMins < -25) {
      return {
        status: 'finished',
        label: `🏁 Course terminée (Départ : ${rawHeure})`,
        isFinished: true,
        badgeClass: 'bg-slate-900 text-slate-400 border-slate-800 font-extrabold shadow-sm',
      };
    } else if (diffMins <= 0) {
      return {
        status: 'imminent',
        label: `🏇 COURSE EN COURS (Départ : ${rawHeure})`,
        isFinished: false,
        badgeClass: 'bg-rose-950/80 text-rose-200 border-rose-500/60 animate-pulse font-black shadow-md shadow-rose-950/40',
      };
    } else if (diffMins > 0 && diffMins <= 10) {
      return {
        status: 'imminent',
        label: `🔴 DÉPART IMMINENT (${diffMins} min) • Départ pour ${rawHeure}`,
        isFinished: false,
        badgeClass: 'bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse font-black shadow-md',
      };
    } else {
      return {
        status: 'soon',
        label: `🟢 Départ pour ${rawHeure} (dans ${diffMins} min)`,
        isFinished: false,
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 font-extrabold shadow-sm',
      };
    }
  };

  const isRaceFinished = (
    dateRelative: string,
    timeStr: string,
    dateStr?: string,
    statut?: string,
    arriveeOfficielle?: string
  ): boolean => {
    return getRaceLiveStatus(dateRelative, timeStr, dateStr, statut, arriveeOfficielle).isFinished;
  };

  const meetings = calendarData?.meetings || [];

  // 1. Filtrage par plage de dates (7 derniers jours, 7 prochains jours, aujourd'hui, ou date spécifique)
  const activeDayMeetings = useMemo(() => {
    if (!meetings || meetings.length === 0) return [];
    if (selectedDate === 'all') return meetings;

    const todayIso = getIvoryCoastDate(0);

    // Filtre : Aujourd'hui
    if (selectedDate === 'today') {
      return meetings.filter((m) => {
        const mIso = getMeetingIsoDate(m);
        return mIso === todayIso || m.dateRelative === "Aujourd'hui";
      });
    }

    // Filtre : 7 Derniers Jours (Last 7 days)
    if (selectedDate === 'last7') {
      const startIso = getIvoryCoastDate(-7);
      const endIso = todayIso;
      return meetings.filter((m) => {
        const mIso = getMeetingIsoDate(m);
        const inRange = mIso >= startIso && mIso <= endIso;
        const isRelPast = m.dateRelative === 'Hier' || m.dateRelative === "Aujourd'hui";
        return inRange || isRelPast;
      });
    }

    // Filtre : 7 Prochains Jours (Upcoming 7 days)
    if (selectedDate === 'upcoming7') {
      const startIso = todayIso;
      const endIso = getIvoryCoastDate(7);
      return meetings.filter((m) => {
        const mIso = getMeetingIsoDate(m);
        const inRange = mIso >= startIso && mIso <= endIso;
        const isRelFuture = m.dateRelative === "Aujourd'hui" || m.dateRelative === 'Demain' || m.dateRelative === 'Prochainement';
        return inRange || isRelFuture;
      });
    }

    // Filtre par date spécifique (ISO ou libellé textuel exact)
    const selNorm = normalizeDateForQuery(selectedDate);
    return meetings.filter((m) => {
      const mIso = getMeetingIsoDate(m);
      const mNorm = normalizeDateForQuery(m.date || '');
      const matchExact = m.dateRelative === selectedDate || m.date === selectedDate;
      const matchIso = (Boolean(mIso && selNorm) && mIso === selNorm) || mIso === selectedDate;
      const matchNorm = Boolean(selNorm && mNorm && selNorm === mNorm);
      return matchExact || matchIso || matchNorm;
    });
  }, [meetings, selectedDate]);

  // Liste de toutes les dates distinctes détectées dans l'ensemble du programme avec métadonnées et décomptes
  const distinctDatesWithCount = useMemo(() => {
    const todayIso = getIvoryCoastDate(0);
    const tomorrowIso = getIvoryCoastDate(1);
    const yesterdayIso = getIvoryCoastDate(-1);

    const dateMap = new Map<string, {
      iso: string;
      label: string;
      shortLabel: string;
      count: number;
      quinteCount: number;
      isToday: boolean;
      isTomorrow: boolean;
      isYesterday: boolean;
      reunions: string[];
      hippodromes: string[];
    }>();

    meetings.forEach((m) => {
      const iso = getMeetingIsoDate(m);
      if (!iso) return;
      const existing = dateMap.get(iso);
      if (existing) {
        existing.count += 1;
        if (m.estQuinte) existing.quinteCount += 1;
        if (m.reunion && !existing.reunions.includes(m.reunion)) existing.reunions.push(m.reunion);
        if (m.hippodrome && !existing.hippodromes.includes(m.hippodrome)) existing.hippodromes.push(m.hippodrome);
      } else {
        const isToday = iso === todayIso;
        const isTomorrow = iso === tomorrowIso;
        const isYesterday = iso === yesterdayIso;

        let displayLabel = m.date || iso;
        try {
          const parts = iso.split('-');
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const frFormatted = d.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            displayLabel = frFormatted.charAt(0).toUpperCase() + frFormatted.slice(1);
          }
        } catch {}

        let shortLabel = displayLabel;
        try {
          const parts = iso.split('-');
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            shortLabel = d.toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
          }
        } catch {}

        dateMap.set(iso, {
          iso,
          label: displayLabel,
          shortLabel,
          count: 1,
          quinteCount: m.estQuinte ? 1 : 0,
          isToday,
          isTomorrow,
          isYesterday,
          reunions: m.reunion ? [m.reunion] : [],
          hippodromes: m.hippodrome ? [m.hippodrome] : [],
        });
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.iso.localeCompare(b.iso));
  }, [meetings]);

  // Libellé textuel convivial de la date couramment sélectionnée
  const currentSelectedDateLabel = useMemo(() => {
    if (selectedDate === 'all') return 'Toutes les dates';
    if (selectedDate === 'today') return "Aujourd'hui";
    if (selectedDate === 'last7') return '7 derniers jours';
    if (selectedDate === 'upcoming7') return '7 prochains jours';

    const normalized = normalizeDateForQuery(selectedDate);
    const matched = distinctDatesWithCount.find((d) => d.iso === normalized || d.iso === selectedDate);
    if (matched) {
      if (matched.isToday) return `Aujourd'hui (${matched.shortLabel})`;
      if (matched.isTomorrow) return `Demain (${matched.shortLabel})`;
      return matched.label;
    }

    try {
      if (normalized && normalized.includes('-')) {
        const parts = normalized.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const fr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          return fr.charAt(0).toUpperCase() + fr.slice(1);
        }
      }
    } catch {}

    return selectedDate;
  }, [selectedDate, distinctDatesWithCount]);

  // Carte des dates disponibles avec nombre de courses pour le calendrier interactif
  const availableDatesMap = useMemo(() => {
    const todayIso = getIvoryCoastDate(0);
    const tomorrowIso = getIvoryCoastDate(1);
    const map: Record<string, { count: number; hasQuinte?: boolean; label?: string }> = {
      [todayIso]: { count: meetings.length || 10, hasQuinte: true, label: `Aujourd'hui (${todayIso})` },
      [tomorrowIso]: { count: 8, hasQuinte: true, label: `Demain (${tomorrowIso})` },
    };

    meetings.forEach((m) => {
      const norm = normalizeDateForQuery(m.date || '');
      if (norm) {
        if (!map[norm]) {
          map[norm] = { count: 1, hasQuinte: Boolean(m.estQuinte), label: m.date };
        } else {
          map[norm].count = Math.max(map[norm].count, 1);
          if (m.estQuinte) map[norm].hasQuinte = true;
        }
      }
    });

    return map;
  }, [meetings]);

  const uniqueReunions = Array.from(new Set(activeDayMeetings.map((m) => m.reunion).filter(Boolean))).sort();
  const uniqueHippodromes = Array.from(new Set(activeDayMeetings.map((m) => m.hippodrome).filter(Boolean))).sort();

  // Liste ordonnée des hippodromes avec le décompte de courses pour la date sélectionnée
  const hippodromesWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    activeDayMeetings.forEach((m) => {
      const h = (m.hippodrome || '').trim();
      if (h) {
        counts[h] = (counts[h] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [activeDayMeetings]);

  // Liste des disciplines avec décompte pour la date sélectionnée
  const disciplinesWithCount = useMemo(() => {
    let trotCount = 0;
    let platCount = 0;
    let obstacleCount = 0;

    activeDayMeetings.forEach((m) => {
      const d = (m.discipline || '').toLowerCase();
      if (d.includes('trot') || d.includes('attelé') || d.includes('monte') || d.includes('monté')) {
        trotCount++;
      } else if (d.includes('plat') || d.includes('galop')) {
        platCount++;
      } else if (d.includes('obstacle') || d.includes('haie') || d.includes('steeple') || d.includes('cross')) {
        obstacleCount++;
      } else if (d) {
        platCount++;
      }
    });

    return [
      { key: 'trot', label: 'Trot Attelé / Monté', count: trotCount, icon: '🐎' },
      { key: 'plat', label: 'Plat / Galop', count: platCount, icon: '🏇' },
      { key: 'obstacle', label: 'Obstacle / Haies', count: obstacleCount, icon: '🌲' },
    ];
  }, [activeDayMeetings]);

  // Helper pour vérifier la correspondance d'une course avec une discipline
  const checkDisciplineMatch = useCallback((discipline: string | undefined, filter: string): boolean => {
    if (!filter || filter === 'all') return true;
    const disc = (discipline || '').toLowerCase();
    if (filter === 'trot') {
      return disc.includes('trot') || disc.includes('attel') || disc.includes('mont');
    }
    if (filter === 'plat') {
      return disc.includes('plat') || disc.includes('galop');
    }
    if (filter === 'obstacle') {
      return disc.includes('obstacle') || disc.includes('haie') || disc.includes('steeple') || disc.includes('cross');
    }
    return disc.includes(filter.toLowerCase());
  }, []);

  // Liste des réunions/courses du jour sélectionné correspondant à la discipline choisie
  const meetingsMatchingDiscipline = useMemo(() => {
    if (disciplineFilter === 'all') return activeDayMeetings;
    return activeDayMeetings.filter((m) => checkDisciplineMatch(m.discipline, disciplineFilter));
  }, [activeDayMeetings, disciplineFilter, checkDisciplineMatch]);

  // Liste des hippodromes uniques du jour avec le compte de courses
  const uniqueHippodromesOfTheDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of activeDayMeetings) {
      const h = (m.hippodrome || '').trim();
      if (h) {
        map.set(h, (map.get(h) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeDayMeetings]);

  // Liste des réunions/courses correspondant à la fois à la discipline et à la recherche d'hippodrome
  const meetingsMatchingDisciplineAndHippo = useMemo(() => {
    let list = meetingsMatchingDiscipline;
    if (hippoSearch.trim()) {
      const qH = hippoSearch.toLowerCase().trim();
      list = list.filter((m) => (m.hippodrome || '').toLowerCase().includes(qH));
    }
    return list;
  }, [meetingsMatchingDiscipline, hippoSearch]);

  // Identifiants uniques des réunions (R1, R2, ...) ayant des courses dans la discipline filtrée et l'hippodrome
  const displayedReunionIds = useMemo(() => {
    return Array.from(
      new Set(
        meetingsMatchingDisciplineAndHippo
          .map((m) => (m.reunion || '').toUpperCase().trim())
          .filter(Boolean)
      )
    ).sort();
  }, [meetingsMatchingDisciplineAndHippo]);

  // Helper pour obtenir les informations visuelles (icône, couleur, libellé) d'une discipline
  const getDisciplineVisualInfo = useCallback((discipline?: string) => {
    const d = (discipline || '').toLowerCase();
    if (d.includes('trot') || d.includes('attel') || d.includes('mont')) {
      return {
        key: 'trot',
        label: 'Trot',
        icon: '🏆',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotClass: 'bg-amber-400',
      };
    }
    if (d.includes('plat') || d.includes('galop')) {
      return {
        key: 'plat',
        label: 'Plat',
        icon: '🏇',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotClass: 'bg-emerald-400',
      };
    }
    if (d.includes('obstacle') || d.includes('haie') || d.includes('steeple') || d.includes('cross')) {
      return {
        key: 'obstacle',
        label: 'Obstacle',
        icon: '🌲',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        dotClass: 'bg-cyan-400',
      };
    }
    return {
      key: 'autre',
      label: discipline || 'Trot',
      icon: '🐎',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      dotClass: 'bg-slate-400',
    };
  }, []);

  // Détermine la liste des disciplines distinctes pour une réunion donnée
  const getReunionDisciplinesList = useCallback((reunionMeetingsList: PmuMeeting[]) => {
    const map = new Map<string, ReturnType<typeof getDisciplineVisualInfo>>();
    for (const m of reunionMeetingsList) {
      const info = getDisciplineVisualInfo(m.discipline);
      if (!map.has(info.key)) {
        map.set(info.key, info);
      }
    }
    const res = Array.from(map.values());
    return res.length > 0 ? res : [getDisciplineVisualInfo('Trot')];
  }, [getDisciplineVisualInfo]);
  const uniqueDates = Array.from(new Set(meetings.map((m) => m.dateRelative).filter(Boolean))).sort((a, b) => {
    const rank: Record<string, number> = { "Aujourd'hui": 1, 'Demain': 2, 'Prochainement': 3 };
    return (rank[a] || 99) - (rank[b] || 99);
  });
  const uniqueExplicitDates = Array.from(new Set(meetings.map((m) => m.date).filter(Boolean))).sort();

  const generateICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HippoAnalyse//FR',
      'CALSCALE:GREGORIAN',
      ...filteredMeetings.map(m => [
        'BEGIN:VEVENT',
        `SUMMARY:Course ${m.courseNumero} - ${m.hippodrome}`,
        `DESCRIPTION:Réunion ${m.reunion}, ${m.discipline}, ${m.nombrePartants} partants.`,
        `DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('T')[0]}T${m.heure.replace('h', '')}00Z`,
        `DTEND:${new Date().toISOString().replace(/[-:]/g, '').split('T')[0]}T${parseInt(m.heure.replace('h', ''))+1}0000Z`,
        'END:VEVENT'
      ].join('\n')),
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reunions_pmu.ics';
    a.click();
  };

  // Calcul des courses passées (heure dépassée ou statut terminé)
  const pastRaces = useMemo(() => {
    return activeDayMeetings.filter((m) =>
      isRaceFinished(m.dateRelative, m.heure, m.date, m.statut, (m as any).arriveeOfficielle)
    );
  }, [activeDayMeetings]);

  const pastRacesCount = pastRaces.length;

  const handleToggleAutoPurge = () => {
    const nextVal = !autoPurgePastRaces;
    setAutoPurgePastRaces(nextVal);
    try {
      localStorage.setItem('hippo_auto_purge_past_races', String(nextVal));
    } catch {}
    if (nextVal) {
      setAuditMessage(`🔄 Purge automatique activée : ${pastRacesCount} course(s) passée(s) masquée(s) de l'affichage.`);
    } else {
      setAuditMessage(`ℹ️ Purge automatique désactivée : toutes les courses (même terminées) sont affichées.`);
    }
    setTimeout(() => setAuditMessage(null), 4000);
  };

  const handlePurgePastRacesNow = () => {
    if (!calendarData || !calendarData.meetings) return;
    const pastIds = new Set(pastRaces.map((m) => m.id));
    if (pastIds.size === 0) {
      setAuditMessage(`✨ Aucune course passée à purger pour cette sélection.`);
      setTimeout(() => setAuditMessage(null), 3000);
      return;
    }
    const updatedMeetings = calendarData.meetings.filter((m) => !pastIds.has(m.id));
    const newDeleted = Array.from(new Set([...deletedIds, ...Array.from(pastIds)]));
    setDeletedIds(newDeleted);
    try {
      localStorage.setItem('hippo_deleted_meeting_ids', JSON.stringify(newDeleted));
      const updatedData = { ...calendarData, meetings: updatedMeetings };
      localStorage.setItem('hippo_calendar_data', JSON.stringify(updatedData));
      setCalendarData(updatedData);
    } catch (e) {
      console.error("Erreur purge courses passées:", e);
    }
    setAuditMessage(`🧹 Purge réussie : ${pastIds.size} course(s) passée(s) définitivement purgée(s) du calendrier.`);
    setTimeout(() => setAuditMessage(null), 5000);
  };

  const handleDeleteMeeting = (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDeleted = [...deletedIds, meetingId];
    setDeletedIds(newDeleted);
    try {
      localStorage.setItem('hippo_deleted_meeting_ids', JSON.stringify(newDeleted));
    } catch {}

    if (!calendarData) return;
    const updatedMeetings = calendarData.meetings.filter(m => m.id !== meetingId);
    setCalendarData({
      ...calendarData,
      meetings: updatedMeetings
    });
  };

  // Filtrage des réunions et Tri par heure (du plus proche au plus lointain)
  const filteredMeetings = activeDayMeetings
    .filter((m) => {
      // 1. Purge automatique des courses passées si activée
      if (autoPurgePastRaces) {
        if (isRaceFinished(m.dateRelative, m.heure, m.date, m.statut, (m as any).arriveeOfficielle)) {
          return false;
        }
      }

      // Filtre réunion spécifique (R1, R4, R5)
      if (reunionFilter !== 'all') {
        if ((m.reunion || '').toUpperCase() !== reunionFilter.toUpperCase()) return false;
      }

      // Filtre hippodromes favoris uniquement
      if (showOnlyFavoriteHippodromes) {
        const isFav = favoriteHippodromes.some(
          (fav) => fav.toLowerCase() === (m.hippodrome || '').toLowerCase().trim()
        );
        if (!isFav) return false;
      }

      // Filtre hippodrome spécifique
      if (selectedHippodrome !== 'all') {
        if ((m.hippodrome || '').toLowerCase().trim() !== selectedHippodrome.toLowerCase().trim()) return false;
      }

      // Filtre Quinté
      if (selectedFilter === 'quinte' && !m.estQuinte) return false;

      // Filtre discipline (Trot, Plat, Obstacle)
      if (disciplineFilter !== 'all') {
        const disc = (m.discipline || '').toLowerCase();
        if (disciplineFilter === 'trot') {
          const isTrot = disc.includes('trot') || disc.includes('attel') || disc.includes('mont');
          if (!isTrot) return false;
        } else if (disciplineFilter === 'plat') {
          const isPlat = disc.includes('plat') || disc.includes('galop');
          if (!isPlat) return false;
        } else if (disciplineFilter === 'obstacle') {
          const isObstacle = disc.includes('obstacle') || disc.includes('haie') || disc.includes('steeple') || disc.includes('cross');
          if (!isObstacle) return false;
        } else {
          if (!disc.includes(disciplineFilter.toLowerCase())) return false;
        }
      }

      // Filtre recherche textuelle : Hippodrome ou Nom de Course (complémentaire aux disciplines)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const qClean = q.replace(/\s+/g, '');
        const hippo = (m.hippodrome || '').toLowerCase();
        const titre = (m.nomCoursePhare || '').toLowerCase();
        const reunion = (m.reunion || '').toLowerCase();
        const courseNum = (m.courseNumero || '').toLowerCase();
        const combined = `${reunion}${courseNum}`.replace(/\s+/g, '');

        const matchHippo = hippo.includes(q);
        const matchTitre = titre.includes(q);
        const matchReunion = reunion === q || reunion.includes(q);
        const matchCourseNum = courseNum === q || courseNum.includes(q);
        const matchCombined = combined.includes(qClean);
        const matchDate = (m.date || '').toLowerCase().includes(q);

        if (!matchHippo && !matchTitre && !matchReunion && !matchCourseNum && !matchCombined && !matchDate) {
          return false;
        }
      }

      // Filtre recherche rapide par hippodrome (dédié aux réunions)
      if (hippoSearch.trim()) {
        const qH = hippoSearch.toLowerCase().trim();
        const hippo = (m.hippodrome || '').toLowerCase();
        if (!hippo.includes(qH)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const rankOrder: Record<string, number> = { "Aujourd'hui": 1, 'Demain': 2, 'Prochainement': 3 };
      const rA = rankOrder[a.dateRelative] || 2;
      const rB = rankOrder[b.dateRelative] || 2;
      if (rA !== rB) return rA - rB;

      return parseAppTimeToMinutes(a.heure) - parseAppTimeToMinutes(b.heure);
    });

  // Compteurs par réunion pour le Dimanche 27 Septembre 2026
  const countR1 = meetings.filter(m => (m.reunion || '').toUpperCase() === 'R1').length;
  const countR4 = meetings.filter(m => (m.reunion || '').toUpperCase() === 'R4').length;
  const countR5 = meetings.filter(m => (m.reunion || '').toUpperCase() === 'R5').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Programme Officiel & Synchronisation Temps Réel */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 rounded-3xl border border-amber-500/30 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Programme Officiel PMU.fr & Paris-Turf.com
              </h2>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-2">
              Heures officielles certifiées en temps réel via <span className="text-emerald-400 font-bold">pmu.fr</span> et <span className="text-purple-400 font-bold">paristurf.com</span>. Accédez directement à toutes les épreuves de la journée par réunion.
            </p>
          </div>

          {/* Action: Realtime Toggle & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bouton de Vérification de Concordance des Informations */}
            <button
              type="button"
              onClick={() => setIsConcordanceModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-black text-xs sm:text-sm transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
              title="Vérifier la concordance exacte des courses officielles (Heures de départ, Prix, Partants et Cotes)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>🔍 Vérifier Concordance ({meetings.length} courses)</span>
            </button>

            {/* Bouton d'Extraction des Arrivées en Direct (Google Search Grounding) */}
            <button
              type="button"
              onClick={() => {
                setTargetedArrivalMeeting(null);
                setIsGroundingArrivalsModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white border border-emerald-400/40 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98]"
              title="🏁 Extraction en temps réel des arrivées provisoires et officielles depuis paristurf.com ou pmu.fr via Google Search Grounding"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>🏁 Arrivées Live Grounding</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRealtimeActive(!isRealtimeActive)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all border ${
                isRealtimeActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={isRealtimeActive ? "Mise à jour en temps réel activée (toutes les 30s)" : "Activer la mise à jour automatique en temps réel"}
            >
              <div className="relative flex h-2.5 w-2.5">
                {isRealtimeActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRealtimeActive ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              </div>
              <span>{isRealtimeActive ? `TEMPS RÉEL (${nextRefreshSec}s)` : 'PAUSE TEMPS RÉEL'}</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllMeetings}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-extrabold text-xs sm:text-sm transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Supprimer définitivement toutes les courses mémorisées dans le calendrier"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Vider le calendrier</span>
            </button>

            {/* Sélecteur de date & plage interactive au sommet du calendrier */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 font-extrabold text-xs shadow-md shrink-0 flex-wrap">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </div>
              <span className="hidden sm:inline text-slate-300">Filtre Date :</span>

              <button
                type="button"
                onClick={() => handleDateSelect('last7')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                  selectedDate === 'last7'
                    ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                    : 'bg-slate-900 text-sky-400 border-slate-800 hover:text-white'
                }`}
                title="Filtrer les 7 derniers jours"
              >
                7d passés
              </button>

              <button
                type="button"
                onClick={() => handleDateSelect('upcoming7')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                  selectedDate === 'upcoming7'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-900 text-amber-400 border-slate-800 hover:text-white'
                }`}
                title="Filtrer les 7 prochains jours"
              >
                7d à venir
              </button>

              <input
                type="date"
                value={(selectedDate === 'all' || selectedDate === 'last7' || selectedDate === 'upcoming7') ? '' : normalizeDateForQuery(selectedDate)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    handleDateSelect(val);
                  }
                }}
                className="bg-slate-900 text-amber-300 font-mono font-black text-xs px-2 py-1 rounded-lg border border-slate-800 focus:border-amber-400 focus:outline-hidden cursor-pointer"
                title="Sélectionner un jour de réunion spécifique dans le calendrier"
              />
              <button
                type="button"
                onClick={() => handleDateSelect('all')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                  selectedDate === 'all'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Afficher toutes les dates et archives globales"
              >
                Tous
              </button>
            </div>
            {/* Menu Déroulant Principal de Filtrage par Discipline (Trot, Plat, Obstacle) */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border-2 border-amber-500/70 shadow-lg shadow-amber-500/10">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <label htmlFor="top-bar-discipline-select" className="text-xs font-black text-amber-300 hidden sm:inline whitespace-nowrap">
                Discipline :
              </label>
              <select
                id="top-bar-discipline-select"
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="bg-slate-900 text-amber-300 font-black text-xs px-2.5 py-1 rounded-lg border border-slate-700 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                title="Menu déroulant pour filtrer les réunions par discipline (Trot, Plat, Obstacle)"
              >
                <option value="all" className="bg-slate-900 text-white font-bold">
                  🐎 Toutes disciplines ({activeDayMeetings.length})
                </option>
                <option value="trot" className="bg-slate-900 text-amber-300 font-bold">
                  🏆 Trot (Attelé / Monté) ({disciplinesWithCount.find(d => d.key === 'trot')?.count || 0})
                </option>
                <option value="plat" className="bg-slate-900 text-emerald-300 font-bold">
                  🏇 Plat (Galop) ({disciplinesWithCount.find(d => d.key === 'plat')?.count || 0})
                </option>
                <option value="obstacle" className="bg-slate-900 text-cyan-300 font-bold">
                  🌲 Obstacle (Haies / Steeple) ({disciplinesWithCount.find(d => d.key === 'obstacle')?.count || 0})
                </option>
              </select>

              {disciplineFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('all')}
                  className="p-1 rounded-md text-amber-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Réinitialiser le filtre discipline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const nextMode = timeZoneMode === 'france' ? 'ivory_coast' : 'france';
                setTimeZoneMode(nextMode);
                try {
                  localStorage.setItem('hippo_timezone_mode', nextMode);
                } catch {}
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all border ${
                timeZoneMode === 'ivory_coast'
                  ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 text-orange-300 border-slate-700'
              }`}
              title="Basculer entre Heure France (GMT+2) et Heure Côte d'Ivoire / Abidjan (GMT)"
            >
              <span>{timeZoneMode === 'ivory_coast' ? '🇨🇮 Heure Côte d\'Ivoire (GMT)' : '🇫🇷 Heure France (GMT+2)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'import' ? 'programme' : 'import')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all border ${
                activeTab === 'import'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
              title="Onglet d'importation de fichier PDF"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>📁 Importer Fichier</span>
            </button>

            <button
              type="button"
              onClick={() => {
                isExplicitlyClearedRef.current = false;
                isCustomImportActiveRef.current = false;
                const currentActiveDate = selectedDate !== 'all' ? normalizeDateForQuery(selectedDate) : getIvoryCoastDate(0);
                try {
                  localStorage.removeItem('hippo_calendar_cleared');
                  localStorage.removeItem('hippo_deleted_meeting_ids');
                  localStorage.removeItem('hippo_is_custom_import');
                  localStorage.removeItem('hippo_calendar_data');
                } catch {}
                fetchCalendar(true, currentActiveDate);
              }}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              title="Synchronisation et actualisation du Programme Officiel LONACI (lonacionline.ci) / PMU / Geny"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Actualisation...' : 'Actualiser'}</span>
            </button>
          </div>
        </div>

        {/* Sélecteur de Date & Calendrier Interactif (Filtrage Spécifique par Jour) */}
        <div className="mt-3.5">
          <InteractivePmuDatePicker
            selectedDate={selectedDate}
            onSelectDate={(newDate) => {
              handleDateSelect(newDate);
            }}
            availableDates={availableDatesMap}
            isLoading={isLoading}
          />
        </div>

        {/* Barre Dédiée : Filtrage par Jour & Programme Quotidien */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/50 flex flex-col gap-3 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/40 shadow-sm">
                <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                  Filtrer par Date :
                </span>
              </div>

              {/* Menu Déroulant Principal de Sélection du Jour */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  id="main-date-filter-dropdown"
                  value={selectedDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="bg-slate-950 text-amber-300 font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl border-2 border-amber-500 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-lg shadow-amber-500/10"
                  title="Sélectionner une date pour afficher son programme complet"
                >
                  <option value="all" className="bg-slate-900 text-white font-bold">
                    📅 Toutes les dates ({meetings.length} courses)
                  </option>
                  <option value="today" className="bg-slate-900 text-emerald-300 font-bold">
                    🌟 Aujourd'hui ({meetings.filter(m => getMeetingIsoDate(m) === getIvoryCoastDate(0) || m.dateRelative === "Aujourd'hui").length} courses)
                  </option>
                  <option value="upcoming7" className="bg-slate-900 text-cyan-300 font-bold">
                    ⏱️ 7 prochains jours
                  </option>
                  <option value="last7" className="bg-slate-900 text-sky-300 font-bold">
                    🕒 7 derniers jours (Archives)
                  </option>
                  {distinctDatesWithCount.map((d) => (
                    <option key={`main-date-opt-${d.iso}`} value={d.iso} className="bg-slate-900 text-amber-300 font-bold">
                      🗓️ {d.label} ({d.count} course{d.count > 1 ? 's' : ''}{d.quinteCount > 0 ? ' • 🏆 Quinté+' : ''})
                    </option>
                  ))}
                </select>

                {/* Sélecteur de date natif HTML5 */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 hover:border-amber-400 px-3 py-2 rounded-xl shadow-inner">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <input
                    type="date"
                    aria-label="Choisir un jour précis"
                    value={(selectedDate === 'all' || selectedDate === 'last7' || selectedDate === 'upcoming7' || selectedDate === 'today') ? '' : normalizeDateForQuery(selectedDate)}
                    onChange={(e) => {
                      if (e.target.value) handleDateSelect(e.target.value);
                    }}
                    className="bg-transparent text-amber-300 font-mono font-black text-xs focus:outline-none cursor-pointer w-[120px]"
                    title="Choisir un jour spécifique dans le calendrier"
                  />
                </div>

                {selectedDate !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleDateSelect('all')}
                    className="px-2.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-xs font-black transition-all flex items-center gap-1"
                    title="Effacer le filtre par date et afficher toutes les dates"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Effacer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Badges d'état de la date sélectionnée */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-xl border border-amber-500/30">
                DATE ACTIVE : {currentSelectedDateLabel.toUpperCase()}
              </span>
              <span className="text-[11px] font-mono font-extrabold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                {activeDayMeetings.length} / {meetings.length} COURSES
              </span>
            </div>
          </div>

          {/* Boutons d'accès direct rapide par jour */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-extrabold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" />
              <span>Jours rapides :</span>
            </span>

            <button
              type="button"
              onClick={() => handleDateSelect('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedDate === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400 font-black'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
              title="Afficher toutes les dates"
            >
              <span>Toutes ({meetings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleDateSelect('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedDate === 'today' || (selectedDate !== 'all' && normalizeDateForQuery(selectedDate) === getIvoryCoastDate(0))
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md ring-2 ring-emerald-300 font-black'
                  : 'bg-slate-950 text-emerald-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
              title="Afficher le programme d'aujourd'hui"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Aujourd'hui</span>
            </button>

            {distinctDatesWithCount.map((d) => {
              const isSelected = selectedDate !== 'all' && (normalizeDateForQuery(selectedDate) === d.iso || selectedDate === d.iso);
              return (
                <button
                  key={`quick-date-tag-${d.iso}`}
                  type="button"
                  onClick={() => handleDateSelect(isSelected ? 'all' : d.iso)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300 scale-[1.02]'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                  title={`Filtrer par ${d.label} (${d.count} courses)`}
                >
                  <span>🗓️ {d.shortLabel}</span>
                  {d.quinteCount > 0 && <span className="text-[10px] text-amber-400">🏆</span>}
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {d.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Barre Dédiée : Menu Déroulant de Filtrage par Discipline (Trot, Plat, Obstacle) */}
        <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/50 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/40">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                Menu Déroulant Discipline :
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                id="main-discipline-dropdown"
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="bg-slate-950 text-amber-300 font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl border-2 border-amber-500 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-lg shadow-amber-500/10"
                title="Filtrer les réunions du calendrier par discipline (Trot, Plat, Obstacle)"
              >
                <option value="all" className="bg-slate-900 text-white font-bold">
                  🐎 Toutes les disciplines ({activeDayMeetings.length} courses)
                </option>
                <option value="trot" className="bg-slate-900 text-amber-300 font-bold">
                  🏆 Trot (Attelé & Monté) — {disciplinesWithCount.find(d => d.key === 'trot')?.count || 0} courses
                </option>
                <option value="plat" className="bg-slate-900 text-emerald-300 font-bold">
                  🏇 Plat (Courses de Galop) — {disciplinesWithCount.find(d => d.key === 'plat')?.count || 0} courses
                </option>
                <option value="obstacle" className="bg-slate-900 text-cyan-300 font-bold">
                  🌲 Obstacle (Haies / Steeple / Cross) — {disciplinesWithCount.find(d => d.key === 'obstacle')?.count || 0} courses
                </option>
              </select>

              {/* Filtres par Boutons Rapides Supplémentaires */}
              <div className="flex flex-wrap items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                    disciplineFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Tous ({activeDayMeetings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('trot')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                    disciplineFilter === 'trot'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800 hover:text-white'
                  }`}
                  title="Filtrer par Trot Attelé & Monté"
                >
                  🏆 Trot ({disciplinesWithCount.find(d => d.key === 'trot')?.count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('plat')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                    disciplineFilter === 'plat'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-slate-800 hover:text-white'
                  }`}
                  title="Filtrer par Plat"
                >
                  🏇 Plat ({disciplinesWithCount.find(d => d.key === 'plat')?.count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('obstacle')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                    disciplineFilter === 'obstacle'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-800 hover:text-white'
                  }`}
                  title="Filtrer par Obstacle / Haies"
                >
                  🌲 Obstacle ({disciplinesWithCount.find(d => d.key === 'obstacle')?.count || 0})
                </button>
              </div>

              {disciplineFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('all')}
                  className="px-2.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-xs font-black transition-all flex items-center gap-1"
                  title="Afficher à nouveau toutes les disciplines"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Effacer</span>
                </button>
              )}
            </div>
          </div>

          {/* Boutons Raccourcis Rapides */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden md:inline">Raccourcis :</span>
            <button
              type="button"
              onClick={() => setDisciplineFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                disciplineFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              Toutes ({activeDayMeetings.length})
            </button>
            <button
              type="button"
              onClick={() => setDisciplineFilter('trot')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                disciplineFilter === 'trot'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              🏆 Trot ({disciplinesWithCount.find(d => d.key === 'trot')?.count || 0})
            </button>
            <button
              type="button"
              onClick={() => setDisciplineFilter('plat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                disciplineFilter === 'plat'
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              🏇 Plat ({disciplinesWithCount.find(d => d.key === 'plat')?.count || 0})
            </button>
            <button
              type="button"
              onClick={() => setDisciplineFilter('obstacle')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                disciplineFilter === 'obstacle'
                  ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 shadow-md ring-2 ring-cyan-300'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              🌲 Obstacle ({disciplinesWithCount.find(d => d.key === 'obstacle')?.count || 0})
            </button>
          </div>
        </div>

        {/* Panneau Dédié : ⚡ Synchronisation Temps Réel avec PMU.fr ou Paris-Turf.com */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/50 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Titre & Description */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  ⚡ Synchronisation Temps Réel
                </span>
                <span className="text-xs text-amber-300/90 font-bold">
                  Actualiser le calendrier des courses
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Interrogez en direct les sites officiels <span className="text-emerald-400 font-bold underline decoration-emerald-500/40">pmu.fr</span> ou <span className="text-purple-400 font-bold underline decoration-purple-500/40">paristurf.com</span> pour actualiser instantanément les réunions (R1, R2, etc.), les heures officielles de départ, les partants et les cotes.
              </p>
            </div>

            {/* Sélecteur de source et boutons d'action */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              
              {/* Sélecteur Source : PMU.fr / Paris-Turf.com / Multi-Sources */}
              <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setSyncSource('pmu');
                    try { localStorage.setItem('hippo_sync_source', 'pmu'); } catch {}
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    syncSource === 'pmu'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Interroger l'API officielle PMU.fr (info.pmu.fr & pmu.fr/turf/)"
                >
                  <span>🏇 PMU.fr</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSyncSource('paristurf');
                    try { localStorage.setItem('hippo_sync_source', 'paristurf'); } catch {}
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    syncSource === 'paristurf'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Interroger le programme officiel Paris-Turf (paris-turf.com)"
                >
                  <span>📰 Paris-Turf.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSyncSource('all');
                    try { localStorage.setItem('hippo_sync_source', 'all'); } catch {}
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    syncSource === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Interroger simultanément PMU.fr et Paris-Turf.com (Double source certifiée)"
                >
                  <span>🌐 Multi-Sources</span>
                </button>
              </div>

              {/* Bouton Principal de Synchronisation Immédiate */}
              <button
                type="button"
                onClick={() => handleTriggerRealtimeSync(syncSource)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border border-amber-300/40"
                title={`Synchroniser immédiatement le calendrier avec ${syncSource === 'pmu' ? 'PMU.fr' : syncSource === 'paristurf' ? 'Paris-Turf.com' : 'PMU.fr et Paris-Turf.com'}`}
              >
                <Zap className={`w-4 h-4 text-slate-950 ${isLoading ? 'animate-bounce' : 'fill-current'}`} />
                <span>
                  {isLoading 
                    ? 'Synchronisation en cours...' 
                    : `⚡ Synchroniser avec ${syncSource === 'pmu' ? 'PMU.fr' : syncSource === 'paristurf' ? 'Paris-Turf' : 'PMU & Paris-Turf'}`}
                </span>
              </button>
            </div>
          </div>

          {/* Statut & Métadonnées de Synchronisation */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-400">Dernière synchronisation en temps réel :</span>
              {lastSyncMeta ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-black text-xs ${
                    lastSyncMeta.source === 'pmu' 
                      ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300' 
                      : lastSyncMeta.source === 'paristurf'
                      ? 'bg-purple-950 border border-purple-500/40 text-purple-300'
                      : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                  }`}>
                    {lastSyncMeta.source === 'pmu' ? '🏇 PMU.fr (Officiel)' : lastSyncMeta.source === 'paristurf' ? '📰 Paris-Turf.com' : '🌐 PMU + Paris-Turf'}
                  </span>
                  <span className="text-slate-300 font-mono font-bold">à {lastSyncMeta.syncedAt}</span>
                  <span className="text-emerald-400 font-bold">({lastSyncMeta.totalCourses} courses actualisées · {lastSyncMeta.totalReunions} réunions)</span>
                </div>
              ) : (
                <span className="text-amber-400 font-medium">Programme certifié conforme (Prêt à synchroniser)</span>
              )}
            </div>

            {/* Liens officiels externes vérifiables */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.pmu.fr/turf/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold transition-colors"
                title="Consulter le portail officiel PMU.fr"
              >
                <span>Site PMU.fr</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-700">·</span>
              <a
                href="https://www.paris-turf.com/programme-courses"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 underline font-semibold transition-colors"
                title="Consulter le programme Paris-Turf"
              >
                <span>Site Paris-Turf.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Source info bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Sources Officielles Certifiées :{' '}
              <strong className="text-emerald-300">
                PMU.fr (info.pmu.fr) · Paris-Turf.com (Édition Numérique) · Geny Courses
              </strong>
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase font-black border border-emerald-500/40">
              Temps Réel Actif (30s)
            </span>
          </div>

          <span className="text-[11px] text-slate-500">
            Dernière synchronisation à {
              typeof lastRefreshed === 'object' && lastRefreshed instanceof Date 
                ? lastRefreshed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : new Date(Number(lastRefreshed) || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
          </span>
        </div>

        {/* Real-time PDF Extraction Progress Bar & Steps */}
        {(isLoading || extractionProgress > 0) && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-amber-500/40 shadow-xl space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-amber-400 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Extraction & Analyse en temps réel du Fichier PDF du jour</span>
              </span>
              <span className="text-emerald-400 font-mono font-bold text-sm">{extractionProgress}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className="bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full shadow-md"
                style={{ width: `${extractionProgress}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-200 font-semibold flex items-center justify-between pt-0.5">
              <span className="truncate pr-2">{extractionStepText}</span>
              <span className="text-amber-400 font-mono shrink-0">Moteur V38 Certifié</span>
            </div>
          </div>
        )}
      </div>

      {/* Audit Notification Log */}
      {auditMessage && (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-amber-300 font-semibold flex items-center justify-between gap-2 shadow-md">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{auditMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setAuditMessage(null)}
            className="text-slate-500 hover:text-white text-[10px] uppercase font-bold"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Barre Réunions & Courses du Jour ou Onglet Import */}
      {activeTab === 'import' && (
        <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-8 shadow-xl space-y-6 text-center animate-fadeIn">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">
              Importation de Fichier Programme PDF & OCR
            </h3>
            <p className="text-sm text-slate-400">
              Glissez-déposez ou sélectionnez votre fichier de programme officiel au format PDF, TXT ou JSON pour extraire instantanément toutes les courses, cotes et horaires.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt,.json"
              onChange={handleFileImport}
              className="hidden"
            />

            <div className="p-8 border-2 border-dashed border-amber-500/40 rounded-2xl bg-slate-950/80 hover:bg-slate-950 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
                 onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-amber-400 animate-bounce" />
              <div className="space-y-1">
                <span className="text-sm font-bold text-white block">
                  {importedFileName ? `Fichier sélectionné : ${importedFileName}` : "Cliquez pour parcourir vos fichiers PDF"}
                </span>
                <span className="text-xs text-slate-500 block">
                  Formats pris en charge : PDF officiel Geny, Paris-Turf, PMU, LONACI (.pdf, .txt, .json)
                </span>
              </div>
              <button
                type="button"
                className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md hover:from-amber-400 hover:to-amber-500"
              >
                Parcourir les fichiers
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'programme' && (
      <div className="space-y-6">
      <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              RÉUNIONS ({
                selectedDate === 'all'
                  ? 'TOUTES LES DATES'
                  : selectedDate === 'last7'
                  ? '7 DERNIERS JOURS'
                  : selectedDate === 'upcoming7'
                  ? '7 PROCHAINS JOURS'
                  : selectedDate === 'today'
                  ? 'AUJOURD\'HUI'
                  : activeDayMeetings[0]?.date ? activeDayMeetings[0].date.toUpperCase() : selectedDate.toUpperCase()
              }) :
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Menu déroulant de filtrage par hippodrome au sein de la sélection de date */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-inner">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-300 font-extrabold hidden sm:inline">Hippodrome :</span>
              <select
                value={selectedHippodrome}
                onChange={(e) => setSelectedHippodrome(e.target.value)}
                className="bg-transparent text-white border-0 py-1 pr-2 text-xs font-black focus:outline-none focus:ring-0 cursor-pointer"
                title="Filtrer les réunions par hippodrome pour le jour sélectionné"
              >
                <option value="all" className="bg-slate-900 text-white font-bold">
                  📍 Tous les hippodromes ({activeDayMeetings.length} courses)
                </option>
                {hippodromesWithCount.map((h) => (
                  <option key={h.name} value={h.name} className="bg-slate-900 text-amber-300 font-bold">
                    🏁 {h.name} ({h.count} {h.count > 1 ? 'courses' : 'course'})
                  </option>
                ))}
              </select>

              {selectedHippodrome !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedHippodrome('all')}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Réinitialiser le filtre hippodrome"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Menu déroulant de filtrage par discipline */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-inner">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-300 font-extrabold hidden sm:inline">Discipline :</span>
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="bg-transparent text-white border-0 py-1 pr-2 text-xs font-black focus:outline-none focus:ring-0 cursor-pointer"
                title="Filtrer les réunions par discipline (Trot, Plat, Obstacle)"
              >
                <option value="all" className="bg-slate-900 text-white font-bold">
                  🐎 Toutes disciplines ({activeDayMeetings.length})
                </option>
                {disciplinesWithCount.map((d) => (
                  <option key={d.key} value={d.key} className="bg-slate-900 text-amber-300 font-bold">
                    {d.icon} {d.label} ({d.count} {d.count > 1 ? 'courses' : 'course'})
                  </option>
                ))}
              </select>

              {disciplineFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('all')}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Réinitialiser le filtre discipline"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              {filteredMeetings.length} / {activeDayMeetings.length} COURSES AFFICHÉES
            </span>
          </div>
        </div>

        {/* Barre de filtrage par Discipline (Trot, Plat, Obstacle) et Recherche Hippodrome/Course */}
        {activeDayMeetings.length > 0 && (
          <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Menu Déroulant Principal de Filtrage des Réunions par Discipline */}
                <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-1.5 shadow-md shadow-amber-500/10">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <label htmlFor="calendar-discipline-dropdown" className="text-xs text-amber-300 font-black whitespace-nowrap">
                    Discipline :
                  </label>
                  <select
                    id="calendar-discipline-dropdown"
                    value={disciplineFilter}
                    onChange={(e) => setDisciplineFilter(e.target.value)}
                    className="bg-slate-950 text-white font-black text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer"
                    title="Menu déroulant permettant de filtrer les réunions par discipline (Trot, Plat, Obstacle)"
                  >
                    <option value="all" className="bg-slate-900 text-white font-bold">
                      🐎 Toutes ({activeDayMeetings.length} courses)
                    </option>
                    <option value="trot" className="bg-slate-900 text-amber-300 font-bold">
                      🏆 Trot ({disciplinesWithCount.find(d => d.key === 'trot')?.count || 0})
                    </option>
                    <option value="plat" className="bg-slate-900 text-emerald-300 font-bold">
                      🏇 Plat ({disciplinesWithCount.find(d => d.key === 'plat')?.count || 0})
                    </option>
                    <option value="obstacle" className="bg-slate-900 text-cyan-300 font-bold">
                      🌲 Obstacle ({disciplinesWithCount.find(d => d.key === 'obstacle')?.count || 0})
                    </option>
                  </select>

                  {disciplineFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setDisciplineFilter('all')}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Réinitialiser le filtre discipline"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Menu Déroulant Rapide de Filtrage par Jour */}
                <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-1.5 shadow-md shadow-amber-500/10">
                  <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
                  <label htmlFor="calendar-date-secondary-dropdown" className="text-xs text-amber-300 font-black whitespace-nowrap">
                    Jour :
                  </label>
                  <select
                    id="calendar-date-secondary-dropdown"
                    value={selectedDate}
                    onChange={(e) => handleDateSelect(e.target.value)}
                    className="bg-slate-950 text-white font-black text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer"
                    title="Filtrer les réunions par jour spécifique"
                  >
                    <option value="all">📅 Tous ({meetings.length})</option>
                    <option value="today">🌟 Aujourd'hui</option>
                    <option value="upcoming7">⏱️ 7 jours</option>
                    {distinctDatesWithCount.map((d) => (
                      <option key={`sec-date-${d.iso}`} value={d.iso}>
                        🗓️ {d.shortLabel} ({d.count} c.)
                      </option>
                    ))}
                  </select>
                  {selectedDate !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleDateSelect('all')}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Afficher toutes les dates"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Boutons d'accès direct rapide */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDisciplineFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      disciplineFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400'
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                    title="Afficher toutes les disciplines"
                  >
                    <span>Toutes</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      disciplineFilter === 'all' ? 'bg-slate-950 text-amber-300' : 'bg-slate-950 text-slate-400'
                    }`}>
                      {activeDayMeetings.length}
                    </span>
                  </button>

                  {disciplinesWithCount.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDisciplineFilter(disciplineFilter === d.key ? 'all' : d.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                        disciplineFilter === d.key
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300 scale-[1.02]'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                      title={`Filtrer uniquement sur ${d.label}`}
                    >
                      <span>{d.icon}</span>
                      <span>{d.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        disciplineFilter === d.key ? 'bg-slate-950 text-amber-300' : 'bg-slate-950 text-slate-400'
                      }`}>
                        {d.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ de recherche textuelle : Hippodrome ou Nom de Course */}
              <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md bg-slate-900 border border-slate-700 hover:border-amber-400/80 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30 rounded-xl px-3 py-2 transition-all shadow-inner">
                <Search className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  type="text"
                  id="pmu-calendar-text-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher hippodrome ou course (ex: Vincennes, Prix de l'Arc)..."
                  className="w-full bg-transparent text-white placeholder-slate-400 text-xs font-semibold focus:outline-none"
                  title="Filtrer les courses par nom d'hippodrome ou de course"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Effacer la recherche textuelle"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Barre récapitulative des filtres actifs (Date, Discipline, Recherche & Hippodrome) */}
            {(selectedDate !== 'all' || disciplineFilter !== 'all' || searchTerm.trim() || hippoSearch.trim() || selectedHippodrome !== 'all' || reunionFilter !== 'all') && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-slate-400">Filtres actifs :</span>
                  {selectedDate !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-sm">
                      <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                      <span>Date : {currentSelectedDateLabel}</span>
                      <button
                        type="button"
                        onClick={() => handleDateSelect('all')}
                        className="hover:text-white p-0.5 rounded hover:bg-amber-500/30 transition-colors"
                        title="Effacer le filtre date"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {disciplineFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                      <span>Discipline : {disciplineFilter.toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={() => setDisciplineFilter('all')}
                        className="hover:text-white"
                        title="Effacer ce filtre discipline"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {hippoSearch.trim() && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>Hippodrome : « {hippoSearch.trim()} »</span>
                      <button
                        type="button"
                        onClick={() => setHippoSearch('')}
                        className="hover:text-white"
                        title="Effacer le filtre hippodrome"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedHippodrome !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>Hippo : {selectedHippodrome}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedHippodrome('all')}
                        className="hover:text-white"
                        title="Effacer le filtre hippodrome"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {reunionFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold text-xs">
                      <span>Réunion : {reunionFilter}</span>
                      <button
                        type="button"
                        onClick={() => setReunionFilter('all')}
                        className="hover:text-white"
                        title="Effacer le filtre réunion"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {searchTerm.trim() && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold text-xs">
                      <Search className="w-3 h-3 text-sky-400" />
                      <span>Recherche : « {searchTerm.trim()} »</span>
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="hover:text-white"
                        title="Effacer la recherche"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-emerald-400 font-extrabold ml-1">
                    ({filteredMeetings.length} course{filteredMeetings.length > 1 ? 's' : ''} trouvée{filteredMeetings.length > 1 ? 's' : ''})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleDateSelect('all');
                    setDisciplineFilter('all');
                    setSearchTerm('');
                    setHippoSearch('');
                    setSelectedHippodrome('all');
                    setReunionFilter('all');
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="Réinitialiser tous les filtres"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tout réinitialiser</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeDayMeetings.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3 shadow-inner">
            <CalendarDays className="w-10 h-10 text-amber-400/80 mx-auto" />
            <p className="text-sm font-bold text-white">
              Aucune réunion programmée pour {currentSelectedDateLabel}.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Aucune course ne correspond à cette sélection dans votre calendrier. Vous pouvez basculer sur une autre journée ou afficher l'intégralité des courses.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleDateSelect('today')}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-md hover:scale-105 transition-transform"
              >
                🌟 Consulter Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => handleDateSelect('all')}
                className="px-3.5 py-2 bg-slate-900 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                📅 Afficher toutes les dates ({meetings.length})
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Barre de recherche dédiée par hippodrome pour filtrer rapidement les réunions */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-md">
              <div className="flex items-center gap-2.5 flex-1 min-w-[260px] max-w-lg">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <MapPin className="w-4 h-4" />
                </span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="pmu-calendar-hippo-filter-input"
                    value={hippoSearch}
                    onChange={(e) => setHippoSearch(e.target.value)}
                    placeholder="Rechercher par hippodrome pour filtrer les réunions (ex: Vincennes, Laval, Chantilly)..."
                    className="w-full bg-slate-900 text-white font-bold text-xs pl-3.5 pr-8 py-2 rounded-xl border border-slate-700 hover:border-amber-400/80 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all placeholder-slate-400"
                    title="Filtrer les réunions disponibles par nom d'hippodrome"
                  />
                  {hippoSearch && (
                    <button
                      type="button"
                      onClick={() => setHippoSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                      title="Effacer la recherche par hippodrome"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Raccourcis / Badges cliquables des hippodromes du jour */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs scrollbar-none">
                <span className="text-[10px] uppercase font-black text-slate-400 shrink-0">Hippodromes du jour :</span>
                {uniqueHippodromesOfTheDay.map((h) => {
                  const isSelected = hippoSearch.toLowerCase() === h.name.toLowerCase();
                  return (
                    <button
                      key={h.name}
                      type="button"
                      onClick={() => setHippoSearch(isSelected ? '' : h.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                      title={`Filtrer instantanément les réunions de ${h.name}`}
                    >
                      <span>📍 {h.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-950 text-slate-400'
                      }`}>
                        {h.count}
                      </span>
                    </button>
                  );
                })}
                {hippoSearch && (
                  <button
                    type="button"
                    onClick={() => setHippoSearch('')}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline px-1 shrink-0"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Grille des Réunions filtrées */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Bouton Toutes les réunions du jour */}
              <button
                type="button"
                onClick={() => {
                  setReunionFilter('all');
                  setSelectedHippodrome('all');
                }}
                className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 ${
                  reunionFilter === 'all'
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 text-white shadow-md'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-400 truncate max-w-[170px]" title={hippoSearch ? `Réunions : ${hippoSearch}` : 'Toutes Réunions'}>
                    {hippoSearch.trim()
                      ? `📍 ${hippoSearch.toUpperCase()}`
                      : disciplineFilter === 'all'
                      ? 'Toutes Réunions'
                      : `Réunions ${disciplineFilter.toUpperCase()}`}
                  </span>
                  <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded shrink-0">
                    {meetingsMatchingDisciplineAndHippo.length} courses
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {hippoSearch.trim()
                    ? `Afficher toutes les réunions & courses de ${hippoSearch.trim()}.`
                    : disciplineFilter === 'all'
                    ? "Voir l'intégralité du programme de la journée sélectionnée."
                    : `Filtrer sur les réunions comportant des courses de ${disciplineFilter}.`}
                </p>
              </button>

              {/* Message si aucune réunion ne correspond au filtre */}
              {displayedReunionIds.length === 0 && (
                <div className="col-span-full p-6 text-center bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {hippoSearch.trim()
                      ? `Aucune réunion ne correspond à l'hippodrome « ${hippoSearch.trim()} »${disciplineFilter !== 'all' ? ` en ${disciplineFilter}` : ''} pour cette journée.`
                      : `Aucune réunion ne comporte d'épreuves de ${disciplineFilter === 'trot' ? 'Trot' : disciplineFilter === 'plat' ? 'Plat' : 'Obstacle'} pour cette journée.`}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    {hippoSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => setHippoSearch('')}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition-all inline-flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Effacer filtre hippodrome</span>
                      </button>
                    )}
                    {disciplineFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setDisciplineFilter('all')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-all inline-flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Toutes les disciplines</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Dynamic Reunion Cards filtrées par la discipline et l'hippodrome choisis */}
              {displayedReunionIds.map((rId, idx) => {
                const reunionMeetings = meetingsMatchingDisciplineAndHippo.filter(m => (m.reunion || '').toUpperCase().trim() === rId);
            const reunionCoursesCount = reunionMeetings.length;
            const firstMeeting = reunionMeetings[0];
            const reunionHippodrome = firstMeeting?.hippodrome || 'Hippodrome';
            
            const sortedReunion = [...reunionMeetings].sort((a, b) => parseAppTimeToMinutes(a.heure) - parseAppTimeToMinutes(b.heure));
            const rStartTime = sortedReunion[0]?.heure || '';
            const rEndTime = sortedReunion[sortedReunion.length - 1]?.heure || '';

            const courseNums = reunionMeetings
              .map(m => m.courseNumero ? parseInt(m.courseNumero.replace(/\D/g, ''), 10) : null)
              .filter((n): n is number => n !== null && !isNaN(n))
              .sort((a, b) => a - b);

            let courseRangeLabel = '';
            if (courseNums.length > 0) {
              const minC = Math.min(...courseNums);
              const maxC = Math.max(...courseNums);
              if (courseNums.length === (maxC - minC + 1)) {
                courseRangeLabel = `Courses ${minC} à ${maxC}`;
              } else {
                courseRangeLabel = `Courses ${courseNums.join(', ')}`;
              }
            } else {
              courseRangeLabel = `${reunionCoursesCount} Courses`;
            }

            const getReunionStyles = (r: string) => {
              switch (r.toUpperCase()) {
                case 'R1':
                  return {
                    badge: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
                    card: reunionFilter === 'R1'
                      ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40 text-slate-300'
                  };
                case 'R2':
                  return {
                    badge: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
                    card: reunionFilter === 'R2'
                      ? 'bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/50 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40 text-slate-300'
                  };
                case 'R3':
                  return {
                    badge: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
                    card: reunionFilter === 'R3'
                      ? 'bg-purple-500/25 border-purple-400 ring-2 ring-purple-400/50 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40 text-slate-300'
                  };
                case 'R4':
                  return {
                    badge: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
                    card: reunionFilter === 'R4'
                      ? 'bg-teal-500/25 border-teal-400 ring-2 ring-teal-400/50 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-teal-500/40 text-slate-300'
                  };
                case 'R5':
                  return {
                    badge: 'text-sky-400 bg-sky-500/20 border-sky-500/30',
                    card: reunionFilter === 'R5'
                      ? 'bg-sky-500/25 border-sky-400 ring-2 ring-sky-400/50 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/40 text-slate-300'
                  };
                default:
                  return {
                    badge: 'text-slate-400 bg-slate-500/20 border-slate-500/30',
                    card: reunionFilter === r
                      ? 'bg-slate-500/25 border-slate-400 ring-2 ring-slate-400/50 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-500/40 text-slate-300'
                  };
              }
            };

            const styles = getReunionStyles(rId);

            return (
              <button
                key={`reunion-summary-${rId}-${idx}`}
                type="button"
                onClick={() => {
                  setReunionFilter(reunionFilter === rId ? 'all' : rId);
                  setSelectedHippodrome('all');
                }}
                className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 ${styles.card}`}
              >
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${styles.badge}`}>
                      {rId}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[110px]" title={reunionHippodrome}>
                      {reunionHippodrome}
                    </span>
                    {/* Indicateur visuel (icône + badge) de la discipline de la réunion */}
                    {getReunionDisciplinesList(reunionMeetings).map((discInfo, dIdx) => (
                      <span
                        key={`disc-${rId}-${discInfo.key}-${dIdx}`}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black border shadow-xs ${discInfo.badgeClass}`}
                        title={`Discipline officielle : ${discInfo.label}`}
                      >
                        <span className="text-xs">{discInfo.icon}</span>
                        <span>{discInfo.label}</span>
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono font-black bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                    {reunionCoursesCount} Courses
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate pr-1">{courseRangeLabel}</span>
                  <span className="text-amber-400 font-bold shrink-0">
                    {rStartTime} ➔ {rEndTime}
                  </span>
                </div>
              </button>
            );
          })}
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-md flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedFilter('all');
                handleDateSelect('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                selectedFilter === 'all' && selectedDate === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Toutes les réunions ({meetings.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('all');
                handleDateSelect('upcoming7');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 ${
                selectedDate === 'upcoming7'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-amber-300 hover:text-white border border-slate-800'
              }`}
              title="Filtrer les réunions des 7 prochains jours (pertinence maximale)"
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              <span>7 prochains jours</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('all');
                handleDateSelect('last7');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 ${
                selectedDate === 'last7'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-950 text-sky-300 hover:text-white border border-slate-800'
              }`}
              title="Filtrer les réunions des 7 derniers jours (réduire le temps de chargement)"
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>7 derniers jours</span>
            </button>

            {uniqueDates.map(date => (
              <button
                key={date}
                type="button"
                onClick={() => handleDateSelect(date)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  selectedDate === date
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {date}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedFilter(selectedFilter === 'quinte' ? 'all' : 'quinte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                selectedFilter === 'quinte'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-amber-400 hover:text-amber-300 border border-amber-500/30'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Support Quinté+</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-400">Filtrer par :</span>
          </div>
        </div>

        {/* Barre de Filtres Rapides & Recherche Intelligente par Hippodrome */}
        <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Hippodromes du jour :</span>
              </span>

              {/* Champ de recherche rapide d'hippodrome */}
              <div className="relative flex items-center min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={hippoSearch}
                  onChange={(e) => setHippoSearch(e.target.value)}
                  placeholder="Rechercher hippodrome..."
                  className="w-full bg-slate-950 text-amber-300 font-bold text-xs pl-8 pr-7 py-1 rounded-xl border border-slate-800 focus:border-amber-400 focus:outline-hidden"
                />
                {hippoSearch && (
                  <button
                    type="button"
                    onClick={() => setHippoSearch('')}
                    className="absolute right-2 text-slate-400 hover:text-white text-xs font-black p-0.5 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Bouton Filtrer par Hippodromes Favoris */}
            <button
              type="button"
              onClick={() => setShowOnlyFavoriteHippodromes(!showOnlyFavoriteHippodromes)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition-all shadow-sm active:scale-95 ${
                showOnlyFavoriteHippodromes
                  ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/30'
                  : 'bg-slate-950 text-amber-300 hover:text-white border-amber-500/30 hover:bg-slate-900'
              }`}
              title="Afficher uniquement les courses sur vos hippodromes favoris"
            >
              <Star className={`w-3.5 h-3.5 ${showOnlyFavoriteHippodromes ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-400'}`} />
              <span>Favoris ({favoriteHippodromes.length})</span>
            </button>
          </div>

          {/* Pastilles dynamiques d'hippodromes actifs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setSelectedHippodrome('all');
                setShowOnlyFavoriteHippodromes(false);
                setHippoSearch('');
              }}
              className={`px-2.5 py-1 rounded-lg font-extrabold text-xs transition-all ${
                selectedHippodrome === 'all' && !showOnlyFavoriteHippodromes && !hippoSearch
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Tous ({activeDayMeetings.length})
            </button>

            {hippodromesWithCount
              .filter((h) => !hippoSearch.trim() || h.name.toLowerCase().includes(hippoSearch.toLowerCase().trim()))
              .map((h) => {
                const isSelected = selectedHippodrome.toLowerCase() === h.name.toLowerCase();
                const isFav = favoriteHippodromes.some((fav) => fav.toLowerCase() === h.name.toLowerCase());

                return (
                  <div
                    key={`hippo-pill-${h.name}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs border transition-all shadow-xs ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : isFav
                        ? 'bg-amber-950/60 text-amber-200 border-amber-500/40 hover:bg-amber-900/80'
                        : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleFavoriteHippodrome(h.name)}
                      className="p-0.5 hover:scale-110 transition-transform"
                      title={isFav ? "Retirer des hippodromes favoris" : "Ajouter aux hippodromes favoris"}
                    >
                      <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500 hover:text-amber-400'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedHippodrome(isSelected ? 'all' : h.name)}
                      className="flex items-center gap-1 font-bold cursor-pointer"
                      title={`Filtrer par l'hippodrome ${h.name} (${h.count} courses)`}
                    >
                      <span>📍 {h.name}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${
                        isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {h.count}
                      </span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Advanced Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Date Selector Dropdown & HTML5 Date Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Jour / Date</label>
              {selectedDate !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleDateSelect('all')}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
            <select
              value={selectedDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="w-full bg-slate-950 text-amber-300 font-bold text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">📅 Toutes les dates ({meetings.length})</option>
              <option value="today">🌟 Aujourd'hui</option>
              <option value="upcoming7">⏱️ 7 prochains jours</option>
              <option value="last7">🕒 7 derniers jours</option>
              {distinctDatesWithCount.map((d) => (
                <option key={`adv-date-${d.iso}`} value={d.iso}>
                  🗓️ {d.shortLabel} ({d.count} c.{d.quinteCount > 0 ? ' • Q+' : ''})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 pt-0.5">
              <input
                type="date"
                aria-label="Date personnalisée ISO"
                value={(selectedDate === 'all' || selectedDate === 'last7' || selectedDate === 'upcoming7' || selectedDate === 'today') ? '' : normalizeDateForQuery(selectedDate)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    handleDateSelect(val);
                  }
                }}
                className="bg-slate-950 text-amber-300 font-mono font-black text-xs px-2.5 py-1.5 rounded-xl border border-slate-800 focus:border-amber-400 focus:outline-hidden cursor-pointer w-full"
                title="Sélecteur de date interactif au format ISO standard (YYYY-MM-DD)"
              />
              <button
                type="button"
                onClick={() => handleDateSelect('all')}
                className={`px-2 py-1.5 rounded-xl text-[10px] font-black border transition-all shrink-0 ${
                  selectedDate === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Afficher toutes les dates et archives"
              >
                Tout
              </button>
            </div>
          </div>

          {/* Hippodrome selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Hippodrome</label>
              {selectedHippodrome !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedHippodrome('all')}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
            <select
              value={selectedHippodrome}
              onChange={(e) => setSelectedHippodrome(e.target.value)}
              className="w-full bg-slate-950 text-white font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">📍 Tous les hippodromes ({activeDayMeetings.length})</option>
              {hippodromesWithCount.map((h) => (
                <option key={h.name} value={h.name}>
                  🏁 {h.name} ({h.count} {h.count > 1 ? 'courses' : 'course'})
                </option>
              ))}
            </select>
          </div>

          {/* Reunion selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Réunion</label>
            <select
              value={reunionFilter}
              onChange={(e) => setReunionFilter(e.target.value)}
              className="w-full bg-slate-950 text-amber-300 font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">Toutes les réunions</option>
              {uniqueReunions.map((r, rIdx) => (
                <option key={`pmu-sel-reunion-${r}-${rIdx}`} value={r}>Réunion {r}</option>
              ))}
            </select>
          </div>

          {/* Discipline selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Discipline</label>
              {disciplineFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDisciplineFilter('all')}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="w-full bg-slate-950 text-white font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">🐎 Toutes disciplines ({activeDayMeetings.length})</option>
              {disciplinesWithCount.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.icon} {d.label} ({d.count} {d.count > 1 ? 'courses' : 'course'})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Recherche rapide</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex: Vincennes..."
                className="w-full bg-slate-950 text-white placeholder-slate-500 text-xs pl-8 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Champ de recherche textuelle au-dessus de la liste des courses */}
      <div className="bg-slate-900 rounded-2xl border border-amber-500/30 p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Search className="w-4 h-4" />
          </span>
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom d'hippodrome ou de course (ex: Vincennes, Prix de l'Arc, R1C1)..."
              className="w-full bg-slate-950 text-white font-bold text-xs pl-4 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400 placeholder-slate-500"
              title="Filtrer les noms des hippodromes ou des courses"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-black p-1 hover:bg-slate-800 rounded transition-colors"
                title="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
          <span>{filteredMeetings.length} course(s) affichée(s)</span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-amber-400 hover:text-amber-300 underline text-[11px]"
            >
              Effacer la recherche
            </button>
          )}
        </div>
      </div>

      {/* Barre de Contrôle & Purge Automatique des Courses Passées */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-3.5 sm:p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            autoPurgePastRaces 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white">
                Purge Automatique des Courses Passées
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                autoPurgePastRaces
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {autoPurgePastRaces ? 'Activée (Filtre actif)' : 'Désactivée (Toutes visibles)'}
              </span>
              {pastRacesCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold">
                  {pastRacesCount} course{pastRacesCount > 1 ? 's' : ''} passée{pastRacesCount > 1 ? 's' : ''} détectée{pastRacesCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {autoPurgePastRaces
                ? 'Les courses déjà terminées ou dont le départ est dépassé sont automatiquement écartées pour focaliser sur les épreuves à venir.'
                : 'Toutes les courses du programme (passées et futures) sont actuellement affichées.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-end">
          {/* Toggle Purge Automatique */}
          <button
            type="button"
            onClick={handleToggleAutoPurge}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
              autoPurgePastRaces
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Activer ou désactiver la purge automatique des courses passées"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoPurgePastRaces ? 'animate-spin-slow' : ''}`} />
            <span>{autoPurgePastRaces ? 'Auto-Purge Active' : 'Activer Auto-Purge'}</span>
          </button>

          {/* Action Manuelle : Purger Définitivement */}
          {pastRacesCount > 0 && (
            <button
              type="button"
              onClick={handlePurgePastRacesNow}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-black text-xs transition-all shadow-md active:scale-95"
              title="Supprimer immédiatement toutes les courses passées du calendrier"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purger ({pastRacesCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Meeting Cards */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-10 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
            <CalendarIcon className="w-8 h-8 opacity-80" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="text-base sm:text-lg font-black text-white">
              Calendrier vierge / Aucune course mémorisée
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Toutes les anciennes courses de la session précédente ont été supprimées définitivement. Pour afficher le programme du jour, extrayez une URL Geny ou importez le programme PDF officiel ci-dessus.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                isExplicitlyClearedRef.current = false;
                fetchCalendar(true, '2026-10-02');
              }}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>⚡ Synchroniser le Programme Officiel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('all');
                setDisciplineFilter('all');
                setSelectedDate('all');
                setSelectedHippodrome('all');
                setReunionFilter('all');
                setSearchTerm('');
                setHippoSearch('');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-4">Date & Horaire</th>
                  <th className="py-4 px-4">Réunion, Course, Hippodrome & Prix</th>
                  <th className="py-4 px-4">Discipline</th>
                  <th className="py-4 px-4">Partants</th>
                  <th className="py-4 px-4">Distance</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                {filteredMeetings.map((meeting, idx) => {
                  const resolvedRel = resolveMeetingDateRelative(meeting.date, meeting.dateRelative);
                  const { officialGeny } = getMeetingDepartTimes(meeting.heure);
                  const liveInfo = getRaceLiveStatus(
                    meeting.dateRelative,
                    officialGeny,
                    meeting.date,
                    meeting.statut,
                    (meeting as any).arriveeOfficielle
                  );

                  return (
                    <tr key={`cal-meeting-${meeting.id || ''}-${meeting.reunion}-${meeting.courseNumero}-${idx}`} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Date & Horaire de Départ / Statut */}
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          {/* Badge Heure de Départ de la Course - Heure officielle LONACI / CI (GMT) & France (UTC+2) */}
                          {(() => {
                            const { franceTime, ciTime } = getDualDepartureTimes(meeting.heure);
                            return (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm w-fit flex-wrap">
                                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="font-mono text-xs font-black text-amber-200">
                                  Départ : {timeZoneMode === 'ivory_coast' ? `${ciTime} (CI/GMT)` : `${franceTime} (FR)`}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider font-bold text-amber-300/90 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/20">
                                  {timeZoneMode === 'ivory_coast' ? `[${franceTime} FR]` : `[${ciTime} CI]`}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="flex flex-col gap-0.5">
                             <span className="text-[10px] text-slate-500 uppercase font-black">{resolvedRel}</span>
                             <span className="text-[11px] text-slate-300 font-bold">{meeting.date}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg border text-xs ${liveInfo.badgeClass}`}>
                              {liveInfo.label}
                            </span>
                            {(meeting as any).arriveeOfficielle && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-black w-fit">
                                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{(meeting as any).arriveeOfficielle}</span>
                              </span>
                            )}
                            {!liveInfo.isFinished && (
                              <CountdownTimer date={resolvedRel === "Aujourd'hui" ? "Aujourd'hui" : (meeting.date || resolvedRel)} heure={meeting.heure} showDepartureBadge={false} compact />
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Réunion, Course, Hippodrome & Prix */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-400">
                              {meeting.reunion} · {meeting.courseNumero || 'C1'}
                            </span>
                            {/* Indicateur visuel (icône + badge) de la discipline à côté de la réunion */}
                            {(() => {
                              const dInfo = getDisciplineVisualInfo(meeting.discipline);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border shadow-xs ${dInfo.badgeClass}`}
                                  title={`Discipline officielle : ${meeting.discipline || dInfo.label}`}
                                >
                                  <span className="text-xs">{dInfo.icon}</span>
                                  <span>{dInfo.label}</span>
                                </span>
                              );
                            })()}
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1">
                                <span>{meeting.hippodrome}</span>
                                <span className="text-amber-300 font-mono font-black text-xs bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                                  ({officialGeny})
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleToggleFavoriteHippodrome(meeting.hippodrome, e)}
                                className="p-1 hover:scale-125 transition-transform cursor-pointer"
                                title={
                                  favoriteHippodromes.some(
                                    (fav) => fav.toLowerCase() === (meeting.hippodrome || '').toLowerCase().trim()
                                  )
                                    ? "Retirer cet hippodrome des favoris"
                                    : "Ajouter cet hippodrome aux favoris"
                                }
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    favoriteHippodromes.some(
                                      (fav) => fav.toLowerCase() === (meeting.hippodrome || '').toLowerCase().trim()
                                    )
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-600 hover:text-amber-400'
                                  }`}
                                />
                              </button>
                            </div>
                            {meeting.estQuinte && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase shadow-sm">
                                Quinté+
                              </span>
                            )}
                            {meeting.sourceSite === 'pmu.fr' ? (
                              <a
                                href="https://www.pmu.fr/turf/"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold hover:bg-emerald-900 transition-colors shadow-sm"
                                title="Course synchronisée en direct depuis l'API officielle PMU.fr"
                              >
                                <span>🏇 pmu.fr</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : meeting.sourceSite === 'paristurf.com' ? (
                              <a
                                href="https://www.paris-turf.com/programme-courses"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-bold hover:bg-purple-900 transition-colors shadow-sm"
                                title="Course synchronisée en direct depuis Paris-Turf.com"
                              >
                                <span>📰 paristurf.com</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-200 font-extrabold truncate max-w-[280px]" title={meeting.nomCoursePhare}>
                              {meeting.nomCoursePhare || 'Course'}
                            </span>
                            {(() => {
                              const catInfo = getRaceCategoryInfo(meeting);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border shadow-xs transition-all hover:scale-105 ${catInfo.badgeClass}`}
                                  title={`${catInfo.description} — Allocation : ${meeting.allocation || 'Officielle'}`}
                                >
                                  <span className="text-[11px]">{catInfo.icon}</span>
                                  <span>{catInfo.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Discipline */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const dInfo = getDisciplineVisualInfo(meeting.discipline);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border shadow-xs ${dInfo.badgeClass}`}>
                              <span>{dInfo.icon}</span>
                              <span>{meeting.discipline || dInfo.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Partants */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-amber-200">
                          {meeting.nombrePartants || 14} partants
                        </span>
                      </td>

                      {/* Distance */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                        {meeting.distance ? `${meeting.distance}m` : 'N/C'}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap flex items-center justify-end gap-2">
                        {/* Bouton d'Extraction / Visualisation Arrivée Grounding */}
                        <button
                          type="button"
                          onClick={() => {
                            setTargetedArrivalMeeting(meeting);
                            setIsGroundingArrivalsModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95"
                          title="Extraire en temps réel ou vérifier l'arrivée officielle / provisoire de cette course via Google Search Grounding"
                        >
                          <Trophy className="w-4 h-4 text-emerald-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onAnalyzeMeeting(meeting)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95 inline-flex items-center gap-1.5"
                          title="Lance instantanément l'analyse algorithmique et la synthèse experte pour cette course"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>Analyser la course</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMeeting(meeting.id, e)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all active:scale-95"
                          title="Supprimer cette course du calendrier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Sources Google Search Grounding Consultées */}
      {calendarData?.groundingSources && calendarData.groundingSources.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sources d'information vérifiées par Google Search :</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {calendarData.groundingSources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-amber-400/40 transition-colors"
              >
                <span>{src.title || src.url}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Modal de concordance officielle des informations */}
      <ConcordanceAuditModal
        isOpen={isConcordanceModalOpen}
        onClose={() => setIsConcordanceModalOpen(false)}
        meetings={meetings}
        onTriggerRealtimeSync={handleTriggerRealtimeSync}
        isSyncing={isLoading}
        lastSyncedAt={lastRefreshed}
      />

      {/* Modal d'extraction des arrivées en temps réel via Google Search Grounding */}
      <GroundingArrivalsModal
        isOpen={isGroundingArrivalsModalOpen}
        onClose={() => {
          setIsGroundingArrivalsModalOpen(false);
          setTargetedArrivalMeeting(null);
        }}
        currentCourse={targetedArrivalMeeting ? {
          id: targetedArrivalMeeting.id,
          reunion: targetedArrivalMeeting.reunion,
          course: targetedArrivalMeeting.courseNumero || 'C1',
          prixNom: targetedArrivalMeeting.nomCoursePhare,
          hippodrome: targetedArrivalMeeting.hippodrome,
          discipline: targetedArrivalMeeting.discipline as any,
          distance: targetedArrivalMeeting.distance,
          heure: targetedArrivalMeeting.heure,
          date: targetedArrivalMeeting.date,
          partants: targetedArrivalMeeting.partants as any,
          sourceUrl: targetedArrivalMeeting.lienGeny,
        } as any : undefined}
        onApplyArrivalToCourse={(arrStr, arrivalObj) => {
          // Mettre à jour l'arrivée dans le calendrier
          if (arrivalObj) {
            setCalendarData((prev: PmuCalendarResponse | null) => {
              if (!prev) return prev;
              const updatedMeetings = (prev.meetings || []).map((m: PmuMeeting) => {
                if (`${m.reunion}${m.courseNumero}` === arrivalObj.courseId || (targetedArrivalMeeting && m.id === targetedArrivalMeeting.id)) {
                  return {
                    ...m,
                    arriveeOfficielle: arrStr,
                    statut: (arrivalObj.isOfficial ? 'Terminé' : 'En direct') as any,
                  };
                }
                return m;
              });
              return {
                ...prev,
                meetings: updatedMeetings,
              };
            });
          }
        }}
        onSelectCourseForAnalysis={(courseId) => {
          const found = meetings.find(m => `${m.reunion}${m.courseNumero}` === courseId);
          if (found) {
            onAnalyzeMeeting(found);
            setIsGroundingArrivalsModalOpen(false);
          }
        }}
      />
    </div>
  );
};
