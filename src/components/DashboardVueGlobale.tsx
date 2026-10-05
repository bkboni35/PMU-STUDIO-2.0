import React, { useState, useMemo } from 'react';
import { Partant, CourseHippique } from '../types/turf';
import { HistoryCourseItem } from '../utils/favoritesStorage';
import {
  BarChart3,
  Target,
  TrendingUp,
  Sparkles,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  PlayCircle,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';

interface DashboardVueGlobaleProps {
  partants: Partant[];
  currentCourse?: CourseHippique;
  history?: HistoryCourseItem[];
  onSelectCourse?: (course: CourseHippique) => void;
  onOpenCalendar?: () => void;
}

export const DashboardVueGlobale: React.FC<DashboardVueGlobaleProps> = ({
  partants,
  currentCourse,
  history = [],
  onSelectCourse,
  onOpenCalendar,
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedReunionFilter, setSelectedReunionFilter] = useState<string>('all');
  // Bouton dédié "Filtrer par réunion" : état d'affichage/masquage de la vue filtrée
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Filtrer les partants actifs de la course en cours (hors non-partants)
  const partantsActifs = partants.filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

  const partantsAvecCote = partantsActifs.filter((p) => p.coteProbable !== undefined && !isNaN(p.coteProbable));
  const avgCote =
    partantsAvecCote.length > 0
      ? partantsAvecCote.reduce((acc, p) => acc + (p.coteProbable || 0), 0) / partantsAvecCote.length
      : 0;

  const totalScore = partantsActifs.reduce((acc, p) => acc + (p.hippoScore || 0), 0);
  const avgScore = partantsActifs.length > 0 ? totalScore / partantsActifs.length : 0;

  const partantsAvecValeur = partantsActifs.filter((p) => p.coteProbable !== undefined && !isNaN(p.coteProbable));
  const avgValeur =
    partantsAvecValeur.length > 0
      ? partantsAvecValeur.reduce((acc, p) => acc + ((p.hippoScore || 0) - (p.coteProbable || 0)), 0) /
        partantsAvecValeur.length
      : 0;

  // Écart-type des scores
  const variance =
    partantsActifs.length > 0
      ? partantsActifs.reduce((acc, p) => acc + Math.pow((p.hippoScore || 0) - avgScore, 2), 0) / partantsActifs.length
      : 0;
  const stdDev = Math.sqrt(variance);

  // Construction de la liste des jours et réunions disponibles
  const { availableDays, availableReunions } = useMemo(() => {
    const daysSet = new Set<string>();
    const reunionsSet = new Set<string>();

    history.forEach((item) => {
      if (item.course) {
        if (item.course.date) daysSet.add(item.course.date);
        if (item.course.reunion) reunionsSet.add(item.course.reunion);
      }
    });

    if (currentCourse?.date) daysSet.add(currentCourse.date);
    if (currentCourse?.reunion) reunionsSet.add(currentCourse.reunion);

    // Trier les réunions par ordre R1, R2, R3...
    const sortedReunions = Array.from(reunionsSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 99;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 99;
      return numA - numB;
    });

    return {
      availableDays: Array.from(daysSet).sort(),
      availableReunions: sortedReunions,
    };
  }, [history, currentCourse]);

  // Courses filtrées selon le jour ou le code réunion sélectionné
  const filteredCourses = useMemo(() => {
    return history.filter((item) => {
      const c = item.course;
      if (!c) return false;
      const matchDay = selectedDayFilter === 'all' || c.date === selectedDayFilter;
      const matchReunion = selectedReunionFilter === 'all' || c.reunion === selectedReunionFilter;
      return matchDay && matchReunion;
    });
  }, [history, selectedDayFilter, selectedReunionFilter]);

  // Analyse comparative de l'hippodrome actuel avec les archives historiques
  const compData = useMemo(() => {
    if (!currentCourse || !currentCourse.hippodrome) return null;
    const currentHippo = currentCourse.hippodrome.trim().toLowerCase();
    
    // Filtrer l'historique pour le même hippodrome (hors course active pour comparaison propre)
    const hippoHistory = history.filter(item => {
      const c = item.course;
      return c && c.hippodrome && c.hippodrome.trim().toLowerCase() === currentHippo && c.id !== currentCourse.id;
    });

    const totalHippoRaces = hippoHistory.length;
    if (totalHippoRaces === 0) return null;

    let winnerCotesSum = 0;
    let winnerCotesCount = 0;
    let favoriteWins = 0;
    let totalFinishedRaces = 0;
    let totalPartantsSum = 0;

    hippoHistory.forEach(item => {
      const c = item.course;
      if (c) {
        if (c.partants) totalPartantsSum += c.partants.length;
        if (c.arriveeOfficielle) {
          totalFinishedRaces++;
          const firstNum = parseInt(c.arriveeOfficielle.split(/[-,\s]+/)[0], 10);
          if (!isNaN(firstNum)) {
            const winner = c.partants?.find(p => p.numero === firstNum);
            if (winner && winner.coteProbable) {
              winnerCotesSum += winner.coteProbable;
              winnerCotesCount++;
              if (winner.coteProbable <= 4.0) {
                favoriteWins++;
              }
            }
          }
        }
      }
    });

    const avgWinnerCote = winnerCotesCount > 0 ? (winnerCotesSum / winnerCotesCount) : null;
    const favoriteWinPercent = totalFinishedRaces > 0 ? Math.round((favoriteWins / totalFinishedRaces) * 100) : null;
    const avgHistoricalPartants = totalHippoRaces > 0 ? Math.round(totalPartantsSum / totalHippoRaces) : null;

    // Calcul du HippoScore moyen historique
    let totalScoresSum = 0;
    let totalScoresCount = 0;
    hippoHistory.forEach(item => {
      item.course?.partants?.forEach(p => {
        if (p.hippoScore) {
          totalScoresSum += p.hippoScore;
          totalScoresCount++;
        }
      });
    });
    const avgHistoricalHippoScore = totalScoresCount > 0 ? (totalScoresSum / totalScoresCount) : null;

    return {
      totalHippoRaces,
      avgWinnerCote,
      favoriteWinPercent,
      avgHistoricalPartants,
      avgHistoricalHippoScore
    };
  }, [history, currentCourse]);

  const hasActiveFilter = selectedDayFilter !== 'all' || selectedReunionFilter !== 'all';

  // Activer ou désactiver rapidement un filtre par code réunion (R1, R2, R3...)
  const handleToggleReunion = (reunionCode: string) => {
    if (selectedReunionFilter === reunionCode) {
      setSelectedReunionFilter('all');
    } else {
      setSelectedReunionFilter(reunionCode);
      setIsFilterOpen(true);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* 1. Barre d'outils Sélecteur de date (Calendrier) & Bouton "Filtrer par réunion" */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Titre & Icône */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white">Sélecteur de Date & Filtres Hippiques</span>
                {selectedReunionFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                    Réunion {selectedReunionFilter}
                  </span>
                )}
                {selectedDayFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                    {selectedDayFilter}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Filtrez instantanément les courses par date, jour de programme ou code réunion (R1, R2, R3...)
              </p>
            </div>
          </div>

          {/* Contrôles du sélecteur & Bouton Filtrer par réunion */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sélecteur de date (Jour) */}
            <div className="relative flex items-center">
              <span className="text-[11px] font-bold text-slate-400 mr-1.5 hidden sm:inline">Jour :</span>
              <select
                value={selectedDayFilter}
                onChange={(e) => {
                  setSelectedDayFilter(e.target.value);
                  if (e.target.value !== 'all') setIsFilterOpen(true);
                }}
                className="bg-slate-950 border border-slate-700 hover:border-amber-500/50 text-slate-200 text-xs rounded-xl px-3 py-2 pr-7 font-bold outline-none focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
                title="Filtrer par jour de course"
              >
                <option value="all">📅 Tous les jours ({availableDays.length > 0 ? availableDays.length : 1})</option>
                {availableDays.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* BOUTON OFFICIEL "Filtrer par réunion" (Masquer / Afficher les courses selon code réunion R1, R2...) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all border ${
                isFilterOpen || selectedReunionFilter !== 'all'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 hover:border-amber-500/50'
              }`}
              title="Masquer ou afficher les courses selon le code réunion (ex: R1, R2)"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrer par réunion</span>
              {selectedReunionFilter !== 'all' && (
                <span className="ml-1 px-1.5 py-0.2 rounded-md bg-slate-950 text-amber-300 text-[10px]">
                  {selectedReunionFilter}
                </span>
              )}
              {isFilterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Bouton pour réinitialiser le filtre actif */}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDayFilter('all');
                  setSelectedReunionFilter('all');
                }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700"
                title="Réinitialiser tous les filtres"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Effacer</span>
              </button>
            )}

            {/* Bouton ouvrir grand Calendrier / Programme */}
            {onOpenCalendar && (
              <button
                type="button"
                onClick={onOpenCalendar}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/10 active:scale-95 ml-auto sm:ml-0"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Programme PMU</span>
              </button>
            )}
          </div>
        </div>

        {/* Panneau dépliable activé par le bouton "Filtrer par réunion" */}
        {isFilterOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800 animate-fadeIn space-y-3">
            {/* Badges de sélection rapide des codes réunions (R1, R2, R3, etc.) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Code Réunion :
              </span>

              <button
                type="button"
                onClick={() => setSelectedReunionFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedReunionFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                Toutes les réunions
              </button>

              {availableReunions.map((reunion) => {
                const isSelected = selectedReunionFilter === reunion;
                const countForReunion = history.filter(
                  (item) =>
                    item.course?.reunion === reunion &&
                    (selectedDayFilter === 'all' || item.course?.date === selectedDayFilter)
                ).length;

                return (
                  <button
                    key={reunion}
                    type="button"
                    onClick={() => handleToggleReunion(reunion)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>Réunion {reunion}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {countForReunion}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="ml-auto text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1"
                title="Masquer le volet de filtrage"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Masquer</span>
              </button>
            </div>

            {/* Liste des courses correspondant au code réunion et à la date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {filteredCourses.length} course(s) affichée(s)
                  {selectedReunionFilter !== 'all' ? ` · Code ${selectedReunionFilter}` : ' · Toutes réunions'}
                  {selectedDayFilter !== 'all' ? ` (${selectedDayFilter})` : ''}
                </span>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 italic">
                    Aucune course trouvée pour le code réunion "{selectedReunionFilter}".
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Chargez d'autres épreuves via le bouton "Programme PMU" pour cette réunion.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredCourses.map((item, cIdx) => {
                    const c = item.course;
                    const isCurrent = currentCourse?.id === c.id;
                    return (
                      <div
                        key={`dash-c-${item.id}-${cIdx}`}
                        onClick={() => onSelectCourse && onSelectCourse(c)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-black text-[11px] border border-amber-500/30">
                              {c.reunion} {c.course}
                            </span>
                            {c.estQuinte && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Quinté+
                              </span>
                            )}
                            <span className="text-xs font-black text-white truncate max-w-[170px] sm:max-w-[200px]">
                              {c.prixNom || c.titre}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-amber-400/80 shrink-0" />
                              {c.hippodrome}
                            </span>
                            <span className="flex items-center gap-1 shrink-0 font-medium">
                              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                              {c.heure || '13h55'}
                            </span>
                          </div>
                        </div>

                        {onSelectCourse && (
                          <button
                            type="button"
                            className={`p-2 rounded-xl text-xs font-bold shrink-0 transition-transform ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 hover:bg-amber-500 text-amber-400 hover:text-slate-950 hover:scale-105'
                            }`}
                            title="Charger cette course"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Métriques synthétiques de la course active */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Moy. Cotes</p>
            <p className="text-xl font-black text-white">{!isNaN(avgCote) && avgCote > 0 ? `${avgCote.toFixed(1)}/1` : '—'}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Score Cumulé</p>
            <p className="text-xl font-black text-white">{!isNaN(totalScore) ? Math.round(totalScore) : 0}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Écart-Type Score</p>
            <p className="text-xl font-black text-white">{!isNaN(stdDev) ? stdDev.toFixed(1) : '—'}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rentabilité Moy.</p>
            <p className="text-xl font-black text-white">{!isNaN(avgValeur) ? avgValeur.toFixed(1) : '—'}</p>
          </div>
        </div>
      </div>

      {/* 3. Analyse comparative de l'hippodrome actuel avec l'historique des performances */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden mt-4">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80 mb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>📊 Analyse Comparative de l'Hippodrome : {currentCourse?.hippodrome || 'En cours'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Confrontation des métriques de la course active avec les moyennes historiques sur cette même piste.
            </p>
          </div>
        </div>

        {compData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat Card 1: Historique & Volume */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Volume de Référence</span>
              <div className="my-2">
                <p className="text-2xl font-black text-amber-400">{compData.totalHippoRaces} course(s)</p>
                <p className="text-xs text-slate-400 mt-0.5">mémorisée(s) dans votre historique pour cette piste.</p>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-1 rounded-lg self-start border border-emerald-500/20">
                Données de comparaison actives
              </span>
            </div>

            {/* Stat Card 2: Profil de la Piste (Favoris vs Outsiders) */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Profil de Réussite de la Piste</span>
              <div className="my-2">
                <p className="text-2xl font-black text-white">
                  {compData.favoriteWinPercent !== null ? `${compData.favoriteWinPercent}%` : 'En attente'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {compData.favoriteWinPercent !== null && compData.favoriteWinPercent > 45 
                    ? "Piste très régulière : Favorable aux favoris et bases incontournables."
                    : compData.favoriteWinPercent !== null && compData.favoriteWinPercent < 30
                    ? "Piste sélective / spéculative : Idéale pour dégoter des outsiders."
                    : "Piste équilibrée : Resserrez vos sélections de tickets."}
                </p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Cote moy. vainqueurs : {compData.avgWinnerCote ? `${compData.avgWinnerCote.toFixed(1)}/1` : '—'}
              </span>
            </div>

            {/* Stat Card 3: Compétitivité & HippoScore */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Niveau de Compétitivité Moyen</span>
              <div className="my-2">
                <p className="text-2xl font-black text-sky-400">
                  {compData.avgHistoricalHippoScore ? `${compData.avgHistoricalHippoScore.toFixed(1)}/100` : 'En attente'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  HippoScore moyen de la piste. Actuel : <strong className="text-amber-400">{avgScore.toFixed(1)}/100</strong>.
                </p>
              </div>
              <span className="text-[10px] text-slate-400">
                Moy. partants historiques : {compData.avgHistoricalPartants || '—'} (actuel : {partants.length})
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-850 border-dashed text-center">
            <p className="text-xs text-slate-400 italic">
              Aucune donnée historique mémorisée pour l'hippodrome de <strong className="text-white">"{currentCourse?.hippodrome || '—'}"</strong> dans cette session.
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-lg mx-auto">
              L'analyse comparative s'enrichira automatiquement au fur et à mesure que vous analyserez d'autres épreuves sur cette même piste.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
