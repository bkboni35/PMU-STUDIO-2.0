import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bookmark, 
  Star, 
  Clock, 
  Trash2, 
  ArrowUpRight, 
  Search, 
  Trophy, 
  Calendar, 
  MapPin, 
  Sparkles, 
  AlertCircle, 
  Bell, 
  Brain, 
  Flame, 
  SlidersHorizontal, 
  Check, 
  Plus, 
  TrendingUp,
  Zap,
  Info
} from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { 
  FavoriteCourseItem, 
  HistoryCourseItem,
  RecurringReunionStat,
  getRaceHistory,
  detectRecurringReunions,
  normalizeReunionCode,
  getSmartFavoritesPreference,
  setSmartFavoritesPreference,
  toggleFavoriteRace
} from '../utils/favoritesStorage';
import { CountdownTimer } from './CountdownTimer';

interface FavoritesManagerProps {
  favorites: FavoriteCourseItem[];
  currentCourseId?: string;
  onSelectCourse: (course: CourseHippique) => void;
  onRemoveFavorite: (id: string) => void;
  onAddFavorite?: (course: CourseHippique) => void;
  compact?: boolean;
}

export const FavoritesManager: React.FC<FavoritesManagerProps> = ({
  favorites,
  currentCourseId,
  onSelectCourse,
  onRemoveFavorite,
  onAddFavorite,
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');
  const [selectedReunionFilter, setSelectedReunionFilter] = useState<string>('all');

  // Option "Favoris Intelligents" avec persistance
  const [isSmartModeEnabled, setIsSmartModeEnabled] = useState<boolean>(() => {
    return getSmartFavoritesPreference();
  });

  // Historique des analyses pour alimenter la détection
  const [historyItems, setHistoryItems] = useState<HistoryCourseItem[]>([]);

  useEffect(() => {
    try {
      const hist = getRaceHistory();
      setHistoryItems(hist);
    } catch {
      setHistoryItems([]);
    }
  }, []);

  const handleToggleSmartMode = () => {
    const nextState = !isSmartModeEnabled;
    setIsSmartModeEnabled(nextState);
    setSmartFavoritesPreference(nextState);
    if (!nextState) {
      setSelectedReunionFilter('all');
    }
  };

  // Détection algorithmique des réunions récurrentes
  const smartAnalysis = useMemo(() => {
    return detectRecurringReunions(favorites, historyItems);
  }, [favorites, historyItems]);

  const dominantReunionCode = smartAnalysis.dominantReunion?.code || 'R1';
  const dominantReunionStat = smartAnalysis.dominantReunion;

  // Calcul des réunions récurrentes détectées pour le filtrage
  const recurringReunionCodes = useMemo(() => {
    return smartAnalysis.reunions.map((r) => r.code);
  }, [smartAnalysis]);

  // Courses favorites triées avec mise en avant des réunions récurrentes si le mode intelligent est actif
  const processedFavorites = useMemo(() => {
    // 1. Filtrer selon la recherche texte
    let list = favorites.filter((fav) => {
      const c = fav.course;
      if (!c) return false;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        (c.titre || '').toLowerCase().includes(term) ||
        (c.hippodrome || '').toLowerCase().includes(term) ||
        (c.prixNom || '').toLowerCase().includes(term) ||
        `${c.reunion || ''} ${c.course || ''}`.toLowerCase().includes(term);

      const matchesDiscipline =
        filterDiscipline === 'all' || c.discipline === filterDiscipline;

      const courseReunionCode = normalizeReunionCode(c.reunion);
      const matchesReunion =
        selectedReunionFilter === 'all' || courseReunionCode === selectedReunionFilter;

      return matchesSearch && matchesDiscipline && matchesReunion;
    });

    // 2. Si le mode Favoris Intelligents est actif, mettre en avant prioritairement
    // les courses des réunions les plus récurrentes (R1, puis R2, etc.)
    if (isSmartModeEnabled) {
      list = [...list].sort((a, b) => {
        const codeA = normalizeReunionCode(a.course.reunion);
        const codeB = normalizeReunionCode(b.course.reunion);

        const rankA = recurringReunionCodes.indexOf(codeA);
        const rankB = recurringReunionCodes.indexOf(codeB);

        const effectiveRankA = rankA === -1 ? 999 : rankA;
        const effectiveRankB = rankB === -1 ? 999 : rankB;

        if (effectiveRankA !== effectiveRankB) {
          return effectiveRankA - effectiveRankB; // Réunion récurrente N°1 d'abord
        }

        // Sinon tri par date de sauvegarde descendante
        return b.savedAt - a.savedAt;
      });
    }

    return list;
  }, [favorites, searchTerm, filterDiscipline, selectedReunionFilter, isSmartModeEnabled, recurringReunionCodes]);

  // Suggestions intelligentes : courses de l'historique appartenant à la réunion dominante mais pas encore en favoris
  const suggestedRecurringCourses = useMemo(() => {
    if (!isSmartModeEnabled || !dominantReunionCode) return [];

    const favoriteIds = new Set(favorites.map((f) => f.course.id || f.course.sourceUrl));
    const suggestions: CourseHippique[] = [];

    historyItems.forEach((hist) => {
      const course = hist.course;
      const cId = course.id || course.sourceUrl;
      const rCode = normalizeReunionCode(course.reunion);

      if (rCode === dominantReunionCode && !favoriteIds.has(cId)) {
        if (!suggestions.some((s) => (s.id || s.sourceUrl) === cId)) {
          suggestions.push(course);
        }
      }
    });

    return suggestions.slice(0, 3); // Max 3 suggestions percutantes
  }, [isSmartModeEnabled, dominantReunionCode, favorites, historyItems]);

  const disciplines = Array.from(new Set(favorites.map((f) => f.course.discipline)));

  const handleAddSuggested = (c: CourseHippique) => {
    if (onAddFavorite) {
      onAddFavorite(c);
    } else {
      toggleFavoriteRace(c);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${compact ? '' : 'bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl'} space-y-4`}>
        {/* Header Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Mes Courses Favorites
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                  {favorites.length}
                </span>

                {isSmartModeEnabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    <Brain className="w-3 h-3 text-amber-400" />
                    <span>Favoris Intelligents Actifs</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Détection automatique et mise en avant de vos réunions favorites ({dominantReunionCode}, etc.)
              </p>
            </div>
          </div>

          {/* Bouton Toggle Favoris Intelligents */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleToggleSmartMode}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs font-black transition-all shadow-md active:scale-95 ${
                isSmartModeEnabled
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 border-amber-300 shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
              }`}
              title="Activer ou désactiver la détection automatique des réunions récurrentes"
            >
              <Brain className={`w-4 h-4 ${isSmartModeEnabled ? 'text-slate-950 animate-pulse' : 'text-amber-400'}`} />
              <div className="text-left">
                <div className="leading-tight flex items-center gap-1.5">
                  <span>Favoris Intelligents</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase ${
                    isSmartModeEnabled ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isSmartModeEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* BANDEAU INTELLIGENT DE DÉTECTION DES RÉUNIONS RÉCURRENTES */}
        {isSmartModeEnabled && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-900 border-2 border-amber-500/50 shadow-lg space-y-3 relative overflow-hidden">
            {/* Halo lumineux */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Intelligence Algorithmique
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      Réunions Récurrentes Détectées
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Votre réunion de prédilection :</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-sm shadow-sm">
                      ⭐ {dominantReunionCode}
                    </span>
                    {dominantReunionStat && (
                      <span className="text-xs text-amber-300 font-semibold">
                        ({dominantReunionStat.percentage}% de vos consultations et favoris)
                      </span>
                    )}
                  </h4>

                  {dominantReunionStat && dominantReunionStat.hippodromes.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Hippodromes réguliers associés : <strong className="text-slate-200">{dominantReunionStat.hippodromes.slice(0, 3).join(', ')}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Stat résumé */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-amber-500/30">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-300">
                  Priorisation automatique appliquée
                </span>
              </div>
            </div>

            {/* Puces de filtrage rapide par réunion récurrente détectée */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>Filtrer par réunion :</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedReunionFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedReunionFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                Toutes ({favorites.length})
              </button>

              {smartAnalysis.reunions.map((reunion) => {
                const isSelected = selectedReunionFilter === reunion.code;
                const countInFavs = favorites.filter((f) => normalizeReunionCode(f.course.reunion) === reunion.code).length;

                return (
                  <button
                    key={reunion.code}
                    type="button"
                    onClick={() => setSelectedReunionFilter(reunion.code)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                        : reunion.isDominant
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {reunion.isDominant && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                    <span>{reunion.code}</span>
                    <span className="text-[10px] opacity-80">({countInFavs} favs · {reunion.percentage}%)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Barre de recherche et filtre de discipline */}
        {favorites.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par hippodrome, prix, R1..."
                className="w-full pl-8 pr-3 py-2 bg-slate-950 text-white placeholder-slate-500 rounded-xl text-xs border border-slate-800 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {disciplines.length > 1 && (
                <select
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                  className="px-3 py-2 bg-slate-950 text-slate-300 rounded-xl text-xs border border-slate-800 focus:outline-none focus:border-amber-400"
                >
                  <option value="all">Toutes disciplines</option>
                  {disciplines.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {favorites.length === 0 ? (
          <div className={`p-8 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-3 ${compact ? 'py-10' : ''}`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Aucune course en favori pour le moment
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Cliquez sur l'étoile ⭐ sur n'importe quelle course pour l'enregistrer ici. Le mode <strong>Favoris Intelligents</strong> identifiera automatiquement vos réunions habituelles (R1, R2, etc.).
              </p>
            </div>
          </div>
        ) : processedFavorites.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">
              Aucune course favorite ne correspond aux critères de recherche ou au filtre de réunion sélectionné.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedReunionFilter('all');
                setFilterDiscipline('all');
              }}
              className="text-xs text-amber-400 font-bold hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          /* Grille des Favoris avec Mise en avant intelligente */
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {processedFavorites.map((item) => {
              const c = item.course;
              const isCurrentlyActive = currentCourseId === c.id || currentCourseId === c.sourceUrl;
              const savedDateStr = new Date(item.savedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              });

              const courseReunionCode = normalizeReunionCode(c.reunion);
              const isFromDominantReunion = isSmartModeEnabled && courseReunionCode === dominantReunionCode;
              const isFromRecurringReunion = isSmartModeEnabled && recurringReunionCodes.includes(courseReunionCode);

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                    isFromDominantReunion
                      ? 'bg-slate-950 border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.18)] ring-1 ring-amber-500/40'
                      : isCurrentlyActive
                      ? 'bg-amber-950/30 border-amber-500/60 ring-2 ring-amber-500/20 shadow-lg'
                      : 'bg-slate-950 hover:bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Badge Flottant Réunion Favorite Détectée (Mise en avant intelligente) */}
                  {isFromDominantReunion && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl shadow-md flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 fill-slate-950" />
                        <span>Réunion Favorite ({dominantReunionCode})</span>
                      </div>
                    </div>
                  )}

                  <div>
                    {/* Top Badges & Remove Button */}
                    <div className="flex items-center justify-between gap-2 mb-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] ${
                          isFromDominantReunion
                            ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300'
                            : 'bg-slate-800 text-amber-300 border border-slate-700'
                        }`}>
                          {c.reunion} {c.course}
                        </span>

                        {c.estQuinte && (
                          <span className="px-2 py-0.5 rounded-lg bg-red-600/90 text-white font-extrabold text-[9px] flex items-center gap-1 shadow-xs">
                            <Trophy className="w-2.5 h-2.5" />
                            <span>Quinté+</span>
                          </span>
                        )}

                        {isFromRecurringReunion && !isFromDominantReunion && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[9px]">
                            ⭐ Récurrente
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavorite(item.id);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Retirer des favoris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Course Title */}
                    <h4 className="text-xs sm:text-sm font-black text-white line-clamp-1 leading-snug">
                      {c.titre}
                    </h4>

                    {/* Metadata */}
                    <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{c.hippodrome}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>{c.discipline} · {c.distance}m</span>
                        {c.statutCourse && (
                          <span className="text-emerald-400 font-semibold">{c.statutCourse}</span>
                        )}
                      </div>

                      {!c.arriveeOfficielle && (
                        <div className="pt-0.5">
                          <CountdownTimer date={c.date} heure={c.heure} compact />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{savedDateStr}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectCourse(c)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                        isCurrentlyActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                          : isFromDominantReunion
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                      }`}
                    >
                      <span>{isCurrentlyActive ? 'En cours' : 'Charger l\'analyse'}</span>
                      {!isCurrentlyActive && <ArrowUpRight className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION DES SUGGESTIONS INTELLIGENTES BASÉES SUR LA RÉUNION RÉCURRENTE */}
        {isSmartModeEnabled && suggestedRecurringCourses.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                  💡 Suggéré d'après vos réunions récurrentes ({dominantReunionCode})
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Détecté dans votre historique récent
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {suggestedRecurringCourses.map((c) => (
                <div
                  key={c.id || c.sourceUrl}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-amber-500/30 flex flex-col justify-between gap-2.5 hover:border-amber-500/50 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black">
                        {c.reunion} {c.course}
                      </span>
                      <span className="text-slate-400 font-medium truncate max-w-[100px]">{c.hippodrome}</span>
                    </div>
                    <p className="text-xs font-bold text-white truncate">{c.titre}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => handleAddSuggested(c)}
                      className="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                      title="Ajouter cette course aux favoris"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter aux favoris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectCourse(c)}
                      className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-all"
                      title="Charger l'analyse"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
