import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Target,
  Sparkles,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Flame,
  ChevronRight,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Coins,
  Layers,
  Award,
  ArrowUpRight,
  TrendingUp,
  Info,
  AlertTriangle,
  Timer,
  Play,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { RaceAnalysisConfirmModal } from './RaceAnalysisConfirmModal';
import { RaceHeroCard } from './RaceHeroCard';
import { getSecondsUntilRace, formatCountdown } from '../utils/raceCountdown';
import { getFavoriteRaces, toggleFavoriteRace } from '../utils/favoritesStorage';

interface RacesExplorerViewProps {
  races: CourseHippique[];
  currentRaceId?: string;
  onSelectAndAnalyzeRace: (course: CourseHippique) => void;
  isLoggedIn?: boolean;
  onOpenUserSpace?: (customPrompt?: string) => void;
}

export const RacesExplorerView: React.FC<RacesExplorerViewProps> = ({
  races,
  currentRaceId,
  onSelectAndAnalyzeRace,
  isLoggedIn = false,
  onOpenUserSpace,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'quinte' | 'intermediaires'>('all');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [selectedReunionFilter, setSelectedReunionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');
  const [selectedRaceForConfirm, setSelectedRaceForConfirm] = useState<CourseHippique | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavoriteRaces().map(f => f.course.id));
  }, []);

  const handleToggleFavorite = (race: CourseHippique) => {
    toggleFavoriteRace(race);
    setFavorites(getFavoriteRaces().map(f => f.course.id));
  };
  
  // Timer tick for real-time countdown updates every second
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  // Demo simulation mode to showcase the 10-minute countdown live on any course
  const [simulatedMinutesLeft, setSimulatedMinutesLeft] = useState<{ [raceId: string]: number }>({
    'geny-chantilly-1685717-r3c8': 7 * 60 + 34, // 7m 34s
    'geny-vincennes-r1c2-intermediaire': 4 * 60 + 12, // 4m 12s
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
      setSimulatedMinutesLeft((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k] > 0) next[k] -= 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper pour calculer le décompte exact
  const getRaceCountdownInfo = (race: CourseHippique) => {
    // Si simulation personnalisée active
    if (simulatedMinutesLeft[race.id] !== undefined) {
      const sec = simulatedMinutesLeft[race.id];
      const isImminent = sec > 0 && sec <= 600; // <= 10 minutes (600s)
      return {
        secondsLeft: sec,
        isImminent,
        formatted: formatCountdown(sec),
        isStarted: sec <= 0,
      };
    }

    const sec = getSecondsUntilRace(race.heure);
    const isImminent = sec > 0 && sec <= 600; // <= 10 minutes
    return {
      secondsLeft: sec,
      isImminent,
      formatted: formatCountdown(sec),
      isStarted: sec < 0 && sec > -3600,
    };
  };

  // Groupement par Réunion
  const groupedByReunion = useMemo(() => {
    const groups: { [reunionKey: string]: { name: string; hippodrome: string; races: CourseHippique[] } } = {};

    races.forEach((race) => {
      const rKey = race.reunion || 'R1';
      if (!groups[rKey]) {
        groups[rKey] = {
          name: `Réunion ${rKey}`,
          hippodrome: race.hippodrome || 'Hippodrome National',
          races: [],
        };
      }
      groups[rKey].races.push(race);
    });

    // Trier les courses dans chaque réunion par numéro de course C1, C2, etc.
    Object.values(groups).forEach((g) => {
      g.races.sort((a, b) => {
        const cA = parseInt((a.course || '').replace(/\D/g, ''), 10) || 0;
        const cB = parseInt((b.course || '').replace(/\D/g, ''), 10) || 0;
        return cA - cB;
      });
    });

    return groups;
  }, [races]);

  // Filtrage combiné
  const filteredReunionGroups = useMemo(() => {
    const result: { [key: string]: { name: string; hippodrome: string; races: CourseHippique[] } } = {};

    Object.entries(groupedByReunion).forEach(([rKey, group]) => {
      if (selectedReunionFilter !== 'all' && rKey !== selectedReunionFilter) return;

      const matchedRaces = group.races.filter((race) => {
        // Catégorie
        if (activeCategory === 'quinte' && !race.estQuinte) return false;
        if (activeCategory === 'intermediaires' && race.estQuinte) return false;

        // Discipline
        if (selectedDiscipline !== 'all') {
          const disc = (race.discipline || '').toLowerCase();
          if (!disc.includes(selectedDiscipline.toLowerCase())) return false;
        }

        // Recherche
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (race.titre || '').toLowerCase().includes(q);
          const matchPrix = (race.prixNom || '').toLowerCase().includes(q);
          const matchHippo = (race.hippodrome || '').toLowerCase().includes(q);
          const matchRC = `${race.reunion || ''} ${race.course || ''}`.toLowerCase().includes(q);
          if (!matchTitle && !matchPrix && !matchHippo && !matchRC) return false;
        }

        return true;
      });

      if (matchedRaces.length > 0) {
        result[rKey] = {
          ...group,
          races: matchedRaces,
        };
      }
    });

    return result;
  }, [groupedByReunion, activeCategory, selectedDiscipline, selectedReunionFilter, searchQuery]);

  const totalFilteredRacesCount = useMemo(() => {
    return Object.values(filteredReunionGroups).reduce((acc, g) => acc + g.races.length, 0);
  }, [filteredReunionGroups]);

  const handleOpenConfirm = (race: CourseHippique) => {
    setSelectedRaceForConfirm(race);
  };

  const handleConfirmAnalysis = (course: CourseHippique) => {
    setSelectedRaceForConfirm(null);
    onSelectAndAnalyzeRace(course);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl border border-amber-500/30 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Programme Officiel Classé par Réunion
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
                <Timer className="w-3 h-3 text-emerald-400" />
                Compte à Rebours Départ 10 min Actif
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Liste des Courses par <span className="text-amber-400">Réunion</span> (R1, R2, R3, R4)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Consultez les <strong>références complètes</strong>, l'<strong>heure exacte du départ</strong>, les <strong>chevaux déclarés non-partants</strong>, et cliquez sur <strong>« Analyser cette course »</strong> pour lancer l'analyse en 1 clic.
            </p>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Par Réunion</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Grille Globale</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        {/* Category Filters */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Toutes les Courses ({races.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('quinte')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeCategory === 'quinte'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-amber-300 hover:text-amber-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Événements Quinté+</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('intermediaires')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeCategory === 'intermediaires'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-emerald-300 hover:text-emerald-200'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Courses Intermédiaires</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-bold">
            <span className="text-amber-400">{totalFilteredRacesCount}</span> course(s) affichée(s)
          </div>
        </div>

        {/* Search & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom de prix, hippodrome, R1, C1..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:border-amber-400 outline-none"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
            >
              <option value="all">Toutes disciplines</option>
              <option value="Trot">Trot Attelé / Monté</option>
              <option value="Plat">Plat / Galop</option>
              <option value="Haies">Haies & Obstacle</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedReunionFilter}
              onChange={(e) => setSelectedReunionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
            >
              <option value="all">Toutes les Réunions</option>
              {Object.keys(groupedByReunion).map((rKey) => (
                <option key={rKey} value={rKey}>
                  Réunion {rKey} ({groupedByReunion[rKey].hippodrome})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* LISTE PAR RÉUNION */}
      <div className="space-y-6">
        {Object.entries(filteredReunionGroups).map(([rKey, group]) => {
          return (
            <div
              key={rKey}
              className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl"
            >
              {/* Réunion Header Bar */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-base shadow-md shadow-amber-500/20">
                    {rKey}
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>{group.name} · {group.hippodrome}</span>
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Hippodrome de {group.hippodrome}</span>
                      <span>•</span>
                      <span>{group.races.length} course(s) au programme</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                    {group.races.some((r) => r.estQuinte) ? '🏆 Quinté+ inclus' : 'Courses Intermédiaires'}
                  </span>
                </div>
              </div>

              {/* Races Table / Rows under this Réunion */}
              <div className="divide-y divide-slate-800/80">
                {group.races.map((race, rIdx) => {
                  const countdown = getRaceCountdownInfo(race);
                  return (
                    <RaceHeroCard
                      key={`explorer-race-${race.id || ''}-${race.reunion}-${race.course}-${rIdx}`}
                      course={race}
                      isFavorite={(favorites || []).includes(race.id)}
                      onToggleFavorite={() => handleToggleFavorite(race)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {totalFilteredRacesCount === 0 && (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <Info className="w-10 h-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-300">Aucune course trouvée pour ces filtres</h4>
          <p className="text-xs text-slate-500">
            Veuillez réinitialiser vos filtres de recherche.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSelectedDiscipline('all');
              setSelectedReunionFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* Confirmation & Approval Modal */}
      <RaceAnalysisConfirmModal
        isOpen={!!selectedRaceForConfirm}
        onClose={() => setSelectedRaceForConfirm(null)}
        course={selectedRaceForConfirm}
        onConfirmAnalyze={handleConfirmAnalysis}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
};
