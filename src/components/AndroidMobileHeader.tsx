import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Download,
  Flame,
  ShieldCheck,
  RefreshCw,
  Share2,
  History,
  RotateCcw,
  Sliders,
  Search,
  Calendar,
  Database,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCheck,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  ClipboardPaste,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { CourseHippique, PmuMeeting } from '../types/turf';
import { PMU_SUNDAY_11_MEETINGS } from '../data/pmuSunday11Data';
import { convertMeetingToCourseHippique, getReunionColorClasses } from '../utils/pmuRaceConverter';
import { normalizeDateForQuery, getIvoryCoastDate } from '../utils/timeConversion';

interface AndroidMobileHeaderProps {
  course?: CourseHippique | null;
  onOpenInstallModal: () => void;
  onOpenHistory?: () => void;
  onResetSession?: () => void;
  historyCount?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  isExpertMode?: boolean;
  onToggleExpertMode?: () => void;
  hasScraperLogs?: boolean;
  onOpenScraperLogs?: () => void;
  onOpenSearch?: () => void;
  onOpenCalendar?: () => void;
  onOpenPmuApiHub?: () => void;
  onAnalyzeUrl?: (url: string) => void;
  onSelectCourse?: (course: CourseHippique) => void;
  currentUrl?: string;
}

export const AndroidMobileHeader: React.FC<AndroidMobileHeaderProps> = ({
  course,
  onOpenInstallModal,
  onOpenHistory,
  onResetSession,
  historyCount = 0,
  onRefresh,
  isLoading,
  isExpertMode,
  onToggleExpertMode,
  hasScraperLogs,
  onOpenScraperLogs,
  onOpenSearch,
  onOpenCalendar,
  onOpenPmuApiHub,
  onAnalyzeUrl,
  onSelectCourse,
  currentUrl,
}) => {
  const [isUrlInputExpanded, setIsUrlInputExpanded] = useState(false);
  const [mobileUrl, setMobileUrl] = useState('');
  const [isReunionDrawerOpen, setIsReunionDrawerOpen] = useState(false);
  const [selectedMeetingFilter, setSelectedMeetingFilter] = useState<string>('all');
  const [selectedRaceIds, setSelectedRaceIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('hippo_selected_next_race_ids');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Écoute de la synchronisation des courses sélectionnées
  useEffect(() => {
    const handleSync = (e?: any) => {
      try {
        let newIds: string[] | null = null;
        if (e?.detail?.selectedRaceIds && Array.isArray(e.detail.selectedRaceIds)) {
          newIds = e.detail.selectedRaceIds;
        } else if (e?.detail?.ids && Array.isArray(e.detail.ids)) {
          newIds = e.detail.ids;
        } else {
          const stored = localStorage.getItem('hippo_selected_next_race_ids');
          if (stored) {
            const parsed = JSON.parse(stored);
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
    window.addEventListener('hippo_selected_races_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('hippo_selected_races_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Liste des réunions et courses disponibles
  const meetingsList = useMemo<PmuMeeting[]>(() => {
    let list: PmuMeeting[] = [];
    try {
      const stored = localStorage.getItem('hippo_calendar_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
          list = parsed.meetings;
        }
      }
    } catch {}
    if (list.length === 0) list = PMU_SUNDAY_11_MEETINGS;
    return list;
  }, []);

  // Réunions uniques disponibles
  const availableReunions = useMemo(() => {
    const map = new Map<string, { rNum: string; label: string; count: number; courses: PmuMeeting[] }>();
    meetingsList.forEach((m) => {
      const rNum = (m.reunion || 'R1').trim();
      const existing = map.get(rNum);
      if (existing) {
        existing.count++;
        existing.courses.push(m);
      } else {
        map.set(rNum, {
          rNum,
          label: `${rNum} - ${m.hippodrome || 'Hippodrome'}`,
          count: 1,
          courses: [m],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.rNum.localeCompare(b.rNum));
  }, [meetingsList]);

  // Courses filtrées par réunion sélectionnée
  const filteredCourses = useMemo(() => {
    if (selectedMeetingFilter === 'all') return meetingsList;
    return meetingsList.filter((m) => m.reunion === selectedMeetingFilter);
  }, [meetingsList, selectedMeetingFilter]);

  // Statistiques de sélection des réunions
  const reunionStats = useMemo(() => {
    const map = new Map<string, { total: number; selected: number; allSelected: boolean; someSelected: boolean }>();
    availableReunions.forEach(({ rNum, courses }) => {
      const total = courses.length;
      const selected = courses.filter((c) => selectedRaceIds.includes(c.id)).length;
      map.set(rNum, {
        total,
        selected,
        allSelected: total > 0 && selected === total,
        someSelected: selected > 0 && selected < total,
      });
    });
    return map;
  }, [availableReunions, selectedRaceIds]);

  const checkedReunionsCount = useMemo(() => {
    let count = 0;
    reunionStats.forEach((stat) => {
      if (stat.allSelected || stat.someSelected) count++;
    });
    return count;
  }, [reunionStats]);

  // Basculer la sélection de toutes les courses d'une réunion
  const handleToggleMeetingSelection = (rNum: string) => {
    const meeting = availableReunions.find((r) => r.rNum === rNum);
    if (!meeting) return;

    const meetingRaceIds = meeting.courses.map((c) => c.id);
    const stat = reunionStats.get(rNum);
    const shouldSelectAll = !stat?.allSelected;

    let nextIds: string[];
    if (shouldSelectAll) {
      nextIds = Array.from(new Set([...selectedRaceIds, ...meetingRaceIds]));
    } else {
      nextIds = selectedRaceIds.filter((id) => !meetingRaceIds.includes(id));
    }

    setSelectedRaceIds(nextIds);
    try {
      localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify(nextIds));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hippo_selected_races_changed', { detail: { ids: nextIds, selectedRaceIds: nextIds } }));
      }, 0);
    } catch {}
  };

  // Cocher ou décocher toutes les réunions
  const handleSelectAllReunions = (select: boolean) => {
    const nextIds = select ? meetingsList.map((m) => m.id) : [];
    setSelectedRaceIds(nextIds);
    try {
      localStorage.setItem('hippo_selected_next_race_ids', JSON.stringify(nextIds));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hippo_selected_races_changed', { detail: { ids: nextIds, selectedRaceIds: nextIds } }));
      }, 0);
    } catch {}
  };

  // Analyser directement la première course cochée
  const handleAnalyzeFirstChecked = () => {
    const target = meetingsList.find((m) => selectedRaceIds.includes(m.id)) || meetingsList[0];
    if (target && onSelectCourse) {
      const full = convertMeetingToCourseHippique(target);
      onSelectCourse(full);
      setIsReunionDrawerOpen(false);
    }
  };

  // Analyser directement une course spécifique
  const handleSelectRaceDirectly = (m: PmuMeeting) => {
    if (onSelectCourse) {
      const full = convertMeetingToCourseHippique(m);
      onSelectCourse(full);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch {}
      }
    }
  };

  // Coller depuis le presse-papier
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setMobileUrl(text.trim());
    } catch {}
  };

  const handleLaunchAnalysis = () => {
    if (mobileUrl && onAnalyzeUrl) {
      onAnalyzeUrl(mobileUrl.trim());
      setIsUrlInputExpanded(false);
    }
  };

  return (
    <div className="sm:hidden mb-3 flex flex-col gap-2 relative">
      {/* 1. Barre Supérieure Mobile Sticky & Compacte */}
      <div className="bg-slate-950/95 backdrop-blur-xl rounded-2xl border border-slate-800/80 p-2.5 shadow-lg flex items-center justify-between gap-2">
        {/* Identité PMU-STUDIO */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <img
              src="/hippoanalyse_pro_logo_1790414725595.jpg"
              alt="Logo PMU Studio"
              className="w-9 h-9 rounded-xl object-cover border border-amber-500/50 shadow-md shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/horse-logo.jpg')) {
                  target.src = '/horse-logo.jpg';
                }
              }}
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-white tracking-tight">PMU-STUDIO</span>
              <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                PRO 2.0
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium truncate flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              <span>Expertise & Modèles V38</span>
            </p>
          </div>
        </div>

        {/* Boutons d'Action Rapides */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Bouton Saisie URL / Recherche */}
          <button
            type="button"
            onClick={() => setIsUrlInputExpanded(!isUrlInputExpanded)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isUrlInputExpanded
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-white'
            }`}
            title="Saisir ou coller une URL"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Bouton Hub PMU / Calendrier */}
          {onOpenPmuApiHub && (
            <button
              type="button"
              onClick={onOpenPmuApiHub}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 hover:text-white"
              title="Programme Live PMU API"
            >
              <Database className="w-4 h-4" />
            </button>
          )}

          {/* Bouton Historique */}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="h-9 px-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1 text-slate-200"
              title="Historique des courses"
            >
              <History className="w-4 h-4 text-amber-400" />
              {historyCount > 0 && (
                <span className="text-[10px] font-black text-amber-400">{historyCount}</span>
              )}
            </button>
          )}

          {/* Bouton Installer PWA */}
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 active:scale-95"
            title="Installer l'application sur smartphone"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Bande Déroulante de Saisie Rapide d'URL (Accordéon fluide) */}
      {isUrlInputExpanded && (
        <div className="p-3 bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-xl flex flex-col gap-2 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-bold text-amber-300">Coller un lien officiel à analyser :</span>
            <button
              type="button"
              onClick={() => setIsUrlInputExpanded(false)}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={mobileUrl}
              onChange={(e) => setMobileUrl(e.target.value)}
              placeholder="https://www.geny.com/... ou paristurf.com"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
            />
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
              title="Coller depuis le presse-papier"
            >
              <ClipboardPaste className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={handleLaunchAnalysis}
              disabled={!mobileUrl || isLoading}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Analyser</span>
            </button>
          </div>

          {/* Exemples rapides 1-clic */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[10px] text-slate-400 shrink-0">Exemples :</span>
            <button
              type="button"
              onClick={() => {
                const sample = 'https://www.geny.com/partants-pmu/2026-10-11-auteuil-pmu-prix-montgomery_c1482910';
                setMobileUrl(sample);
                onAnalyzeUrl?.(sample);
                setIsUrlInputExpanded(false);
              }}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 whitespace-nowrap"
            >
              Geny.com Quinté+ R1C4
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = 'https://www.paris-turf.com/course/2026-10-11/R1C4-prix-montgomery';
                setMobileUrl(sample);
                onAnalyzeUrl?.(sample);
                setIsUrlInputExpanded(false);
              }}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 whitespace-nowrap"
            >
              Paris-Turf R1
            </button>
          </div>
        </div>
      )}

      {/* 3. Carrousel Tactile des Réunions & Courses du Jour */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-sm space-y-1.5">
        {/* Ligne A : Sélecteur de Réunions & Bouton "Cocher Réunions" */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedMeetingFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                selectedMeetingFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              Toutes ({meetingsList.length})
            </button>

            {availableReunions.map(({ rNum, count }) => {
              const isActive = selectedMeetingFilter === rNum;
              const stat = reunionStats.get(rNum);
              const color = getReunionColorClasses(rNum);
              return (
                <button
                  key={rNum}
                  type="button"
                  onClick={() => setSelectedMeetingFilter(rNum)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-300'
                      : 'bg-slate-950 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{rNum}</span>
                  <span className={`text-[9px] px-1 rounded ${isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                    {count}
                  </span>
                  {stat?.allSelected && (
                    <span className="text-[9px] text-emerald-400 font-black">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bouton pour Cocher les Réunions à Analyser (ouvre le tiroir) */}
          <button
            type="button"
            onClick={() => setIsReunionDrawerOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-sm shrink-0 active:scale-95"
            title="Cocher les réunions du jour à analyser"
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-950" />
            <span>Cocher Réunions</span>
            {checkedReunionsCount > 0 && (
              <span className="bg-slate-950 text-amber-300 px-1 py-0.2 rounded-full text-[9px] font-black">
                {checkedReunionsCount}R
              </span>
            )}
          </button>
        </div>

        {/* Ligne B : Défilement Horizontal des Courses de la réunion sélectionnée */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {filteredCourses.map((m) => {
            const isCurrent =
              course &&
              (course.reunion === m.reunion && course.course === m.courseNumero);
            const isChecked = selectedRaceIds.includes(m.id);
            const isQuinte = Boolean(m.estQuinte);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectRaceDirectly(m)}
                className={`px-2.5 py-1.5 rounded-xl text-left shrink-0 transition-all flex items-center gap-2 border ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black ring-2 ring-amber-400/40'
                    : isChecked
                    ? 'bg-slate-950 text-amber-300 border-amber-500/50'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black">
                      {m.reunion}{m.courseNumero}
                    </span>
                    {isQuinte && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  </div>
                  <span className={`text-[9px] ${isCurrent ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    {m.heure || '13h50'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Carte Statut de la Course Active Mobile (si chargée) */}
      {course && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-xs font-black text-amber-400 shrink-0">
                {course.reunion || ''}{course.course || ''}
              </span>
              <span className="text-xs font-bold text-white truncate uppercase">
                {course.hippodrome || 'Course PMU'}
              </span>
              {course.estQuinte && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase shrink-0">
                  Quinté+
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
              <span className="font-bold">{course.partants?.length || 0} partants</span>
              <span>•</span>
              <span>{course.distance || '2100'}m</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">{course.heure || ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleExpertMode && (
              <button
                type="button"
                onClick={onToggleExpertMode}
                className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                  isExpertMode
                    ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-purple-400'
                }`}
                title="Basculer le Mode Expert"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Tiroir Modal Mobile pour Cocher les Réunions à Analyser */}
      {isReunionDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsReunionDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative bg-slate-950 border-t-2 border-amber-500 rounded-t-3xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto space-y-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Cocher les Réunions à Analyser
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Sélectionnez les réunions pour alimenter le modèle et la Prochaine Course
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReunionDrawerOpen(false)}
                className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions Rapides Tout Cocher / Tout Décocher */}
            <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-300">
                {checkedReunionsCount} réunion(s) cochée(s)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectAllReunions(true)}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllReunions(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold"
                >
                  Tout décocher
                </button>
              </div>
            </div>

            {/* Liste des Réunions avec Cases à Cocher */}
            <div className="space-y-2">
              {availableReunions.map(({ rNum, label, count, courses }) => {
                const stat = reunionStats.get(rNum);
                const color = getReunionColorClasses(rNum);
                const isAll = stat?.allSelected;
                const isSome = stat?.someSelected;

                return (
                  <div
                    key={rNum}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isAll
                        ? 'bg-amber-950/20 border-amber-500/60'
                        : isSome
                        ? 'bg-slate-900/90 border-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    {/* Checkbox + Label Réunion */}
                    <button
                      type="button"
                      onClick={() => handleToggleMeetingSelection(rNum)}
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                    >
                      <div className="shrink-0">
                        {isAll ? (
                          <CheckSquare className="w-5 h-5 text-amber-400" />
                        ) : isSome ? (
                          <MinusSquare className="w-5 h-5 text-amber-400/80" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${color.badge}`}>
                            {rNum}
                          </span>
                          <span className="text-xs font-black text-white truncate">
                            {courses[0]?.hippodrome || label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {courses.length} courses disponibles
                          {stat?.selected ? ` (${stat.selected} cochée${stat.selected > 1 ? 's' : ''})` : ''}
                        </p>
                      </div>
                    </button>

                    {/* Bouton Analyser la 1ère course de la réunion */}
                    <button
                      type="button"
                      onClick={() => {
                        const first = courses[0];
                        if (first && onSelectCourse) {
                          onSelectCourse(convertMeetingToCourseHippique(first));
                          setIsReunionDrawerOpen(false);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-sm shrink-0 active:scale-95"
                    >
                      <Zap className="w-3 h-3 text-slate-950" />
                      <span>Analyser</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bouton d'Action Principale Inférieure */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAnalyzeFirstChecked}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-98 transition-transform"
              >
                <Zap className="w-4 h-4 text-slate-950" />
                <span>⚡ Lancer l'analyse des réunions cochées</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
