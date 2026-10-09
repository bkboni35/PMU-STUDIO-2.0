import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  CalendarDays,
  Clock,
  CheckCircle2,
  Filter,
  RotateCcw
} from 'lucide-react';
import { getIvoryCoastDate, normalizeDateForQuery } from '../utils/timeConversion';

interface InteractivePmuDatePickerProps {
  selectedDate: string; // ISO 'YYYY-MM-DD' or 'all'
  onSelectDate: (dateIso: string) => void;
  availableDates?: Record<string, { count: number; hasQuinte?: boolean; label?: string }>;
  isLoading?: boolean;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAYS_SHORT_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const InteractivePmuDatePicker: React.FC<InteractivePmuDatePickerProps> = ({
  selectedDate,
  onSelectDate,
  availableDates = {},
  isLoading = false,
}) => {
  const todayIso = useMemo(() => getIvoryCoastDate(0) || '2026-10-01', []);
  const yesterdayIso = useMemo(() => getIvoryCoastDate(-1) || '2026-09-30', []);
  const tomorrowIso = useMemo(() => getIvoryCoastDate(1) || '2026-10-02', []);

  // Déterminer le mois affiché dans le calendrier interactif
  const activeNormalized = selectedDate === 'all' ? todayIso : normalizeDateForQuery(selectedDate) || todayIso;
  
  const initialYearMonth = useMemo(() => {
    try {
      const parts = activeNormalized.split('-');
      if (parts.length >= 2) {
        return {
          year: parseInt(parts[0], 10),
          monthIndex: parseInt(parts[1], 10) - 1,
        };
      }
    } catch {}
    return { year: 2026, monthIndex: 9 }; // Octobre 2026 par défaut
  }, [activeNormalized]);

  const [currentView, setCurrentView] = useState<{ year: number; monthIndex: number }>(initialYearMonth);
  const [isCalendarGridExpanded, setIsCalendarGridExpanded] = useState<boolean>(true);

  // Navigation mois par mois
  const handlePrevMonth = () => {
    setCurrentView((prev) => {
      if (prev.monthIndex === 0) {
        return { year: prev.year - 1, monthIndex: 11 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentView((prev) => {
      if (prev.monthIndex === 11) {
        return { year: prev.year + 1, monthIndex: 0 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex + 1 };
    });
  };

  const handleJumpToToday = () => {
    const parts = todayIso.split('-');
    if (parts.length >= 2) {
      setCurrentView({
        year: parseInt(parts[0], 10),
        monthIndex: parseInt(parts[1], 10) - 1,
      });
    }
    onSelectDate(todayIso);
  };

  // Calcul des jours du mois affiché
  const calendarDays = useMemo(() => {
    const { year, monthIndex } = currentView;
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const numDays = lastDay.getDate();

    // Jour de la semaine du 1er du mois (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)
    // Nous voulons que Lundi soit 0, donc : (day + 6) % 7
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: Array<{
      dayNumber: number;
      dateIso: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      courseInfo?: { count: number; hasQuinte?: boolean; label?: string };
    }> = [];

    // Jours du mois courant
    for (let day = 1; day <= numDays; day++) {
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const iso = `${year}-${monthStr}-${dayStr}`;

      const isToday = iso === todayIso;
      const isSelected = selectedDate !== 'all' && normalizeDateForQuery(selectedDate) === iso;
      const courseInfo = availableDates[iso];

      days.push({
        dayNumber: day,
        dateIso: iso,
        isCurrentMonth: true,
        isToday,
        isSelected,
        courseInfo,
      });
    }

    return { days, startingDayOfWeek };
  }, [currentView, selectedDate, todayIso, availableDates]);

  // Formatter la date sélectionnée pour affichage lisible
  const selectedDateFormatted = useMemo(() => {
    if (selectedDate === 'all') {
      return 'Toutes les réunions & archives';
    }
    if (selectedDate === 'last7') {
      return '7 Derniers Jours (Récentes & Archives)';
    }
    if (selectedDate === 'upcoming7') {
      return '7 Prochains Jours (Programme À Venir)';
    }
    if (selectedDate === 'today') {
      return 'Aujourd\'hui (Réunions Du Jour)';
    }
    try {
      const norm = normalizeDateForQuery(selectedDate);
      const parts = norm.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const formatted = d.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
    } catch {}
    return selectedDate;
  }, [selectedDate]);

  return (
    <div className="bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden backdrop-blur-md">
      {/* Halo lumineux de fond */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Barre Principale : Titre & Statut du Filtrage Journalier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <CalendarDays className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                Filtre Temporel Actif
              </span>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {selectedDateFormatted}
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {selectedDate === 'all'
                ? 'Affichage de l\'intégralité des réunions mémorisées sans filtre.'
                : selectedDate === 'last7'
                ? 'Affichage des réunions ayant eu lieu au cours des 7 derniers jours (réduit le temps de chargement).'
                : selectedDate === 'upcoming7'
                ? 'Affichage des réunions prévues pour les 7 prochains jours (pertinence optimale).'
                : 'Seules les réunions officielles de cette sélection sont affichées ci-dessous.'}
            </p>
          </div>
        </div>

        {/* Boutons de raccourcis rapides : Plages de dates (7 Derniers Jours, 7 Prochains Jours, Aujourd'hui...) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Plage : 7 Derniers Jours */}
          <button
            type="button"
            onClick={() => onSelectDate('last7')}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 ${
              selectedDate === 'last7'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-400 shadow-md ring-2 ring-sky-300'
                : 'bg-slate-950 hover:bg-slate-800 text-sky-300 hover:text-white border-slate-800'
            }`}
            title="Filtrer les réunions des 7 derniers jours (réduire le temps de chargement)"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>7 derniers jours</span>
          </button>

          {/* Plage : 7 Prochains Jours */}
          <button
            type="button"
            onClick={() => onSelectDate('upcoming7')}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 ${
              selectedDate === 'upcoming7'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-300'
                : 'bg-slate-950 hover:bg-slate-800 text-amber-300 hover:text-white border-slate-800'
            }`}
            title="Filtrer les réunions des 7 prochains jours (pertinence maximale)"
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>7 prochains jours</span>
          </button>

          {/* Raccourci : Aujourd'hui */}
          <button
            type="button"
            onClick={handleJumpToToday}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 ${
              (selectedDate !== 'all' && selectedDate !== 'last7' && selectedDate !== 'upcoming7' && normalizeDateForQuery(selectedDate) === todayIso) || selectedDate === 'today'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-300'
                : 'bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-white border-slate-800'
            }`}
            title={`Filtrer les réunions d'aujourd'hui (${todayIso})`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Aujourd'hui</span>
          </button>

          {/* Raccourci : Hier */}
          <button
            type="button"
            onClick={() => onSelectDate(yesterdayIso)}
            disabled={isLoading}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
              selectedDate !== 'all' && selectedDate !== 'last7' && selectedDate !== 'upcoming7' && normalizeDateForQuery(selectedDate) === yesterdayIso
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-1 ring-amber-300'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
            title={`Filtrer les réunions d'hier (${yesterdayIso})`}
          >
            Hier
          </button>

          {/* Raccourci : Demain */}
          <button
            type="button"
            onClick={() => onSelectDate(tomorrowIso)}
            disabled={isLoading}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
              selectedDate !== 'all' && selectedDate !== 'last7' && selectedDate !== 'upcoming7' && normalizeDateForQuery(selectedDate) === tomorrowIso
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-1 ring-amber-300'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
            title={`Filtrer les réunions de demain (${tomorrowIso})`}
          >
            Demain
          </button>

          {/* Date Picker Input Natif pour sélection arbitraire */}
          <div className="relative flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-700 hover:border-amber-400 focus-within:border-amber-400 shadow-inner">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="date"
              aria-label="Sélectionner une date spécifique"
              value={(selectedDate === 'all' || selectedDate === 'last7' || selectedDate === 'upcoming7') ? '' : normalizeDateForQuery(selectedDate)}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate(e.target.value);
                }
              }}
              disabled={isLoading}
              className="bg-transparent text-amber-300 font-mono font-black text-xs focus:outline-hidden cursor-pointer w-[120px]"
              title="Sélecteur de date : Choisir une date spécifique dans le calendrier"
            />
          </div>

          {/* Bouton afficher toutes les réunions */}
          <button
            type="button"
            onClick={() => onSelectDate('all')}
            disabled={isLoading}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
              selectedDate === 'all'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-1 ring-purple-300'
                : 'bg-slate-950 hover:bg-slate-800 text-purple-400 hover:text-white border-slate-800'
            }`}
            title="Désactiver le filtre journalier et afficher toutes les réunions"
          >
            Toutes
          </button>

          {/* Bouton plier/déplier la grille mensuelle */}
          <button
            type="button"
            onClick={() => setIsCalendarGridExpanded(!isCalendarGridExpanded)}
            className="p-1.5 rounded-xl bg-slate-950 text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-slate-700 text-xs font-bold transition-all ml-1"
            title={isCalendarGridExpanded ? "Masquer la grille mensuelle" : "Afficher la grille mensuelle complète"}
          >
            {isCalendarGridExpanded ? '▲ Réduire' : '▼ Calendrier'}
          </button>
        </div>
      </div>

      {/* CALENDRIER INTERACTIF : Grille Mensuelle Déroulable */}
      {isCalendarGridExpanded && (
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-inner space-y-3 animate-fadeIn">
          {/* Barre du Mois & Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-black transition-all active:scale-95 disabled:opacity-50"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                {MONTH_NAMES_FR[currentView.monthIndex]} {currentView.year}
              </span>
              {currentView.monthIndex === initialYearMonth.monthIndex && currentView.year === initialYearMonth.year && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                  Mois Actuel
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-black transition-all active:scale-95 disabled:opacity-50"
              title="Mois suivant"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* En-tête des jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS_SHORT_FR.map((weekday, idx) => (
              <div
                key={weekday}
                className={`py-1 text-[11px] font-black uppercase tracking-wider ${
                  idx >= 5 ? 'text-amber-400/80' : 'text-slate-500'
                }`}
              >
                {weekday}
              </div>
            ))}
          </div>

          {/* Grille des Jours du Mois */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Espaces vides avant le 1er jour du mois */}
            {Array.from({ length: calendarDays.startingDayOfWeek }).map((_, emptyIdx) => (
              <div key={`empty-${emptyIdx}`} className="h-12 sm:h-14 rounded-xl bg-slate-900/20 opacity-30 border border-transparent" />
            ))}

            {/* Jours du mois */}
            {calendarDays.days.map((dayItem) => {
              const { dayNumber, dateIso, isToday, isSelected, courseInfo } = dayItem;
              const hasCourses = Boolean(courseInfo && courseInfo.count > 0);

              return (
                <button
                  key={dateIso}
                  type="button"
                  onClick={() => onSelectDate(dateIso)}
                  disabled={isLoading}
                  className={`h-12 sm:h-14 rounded-xl p-1 flex flex-col justify-between items-center transition-all relative group active:scale-95 border ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black border-amber-300 shadow-lg shadow-amber-500/40 ring-2 ring-amber-300 scale-[1.02] z-10'
                      : isToday
                      ? 'bg-slate-900 text-emerald-300 border-emerald-500/60 shadow-md hover:bg-slate-850'
                      : hasCourses
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-white border-amber-500/30 hover:border-amber-400/60'
                      : 'bg-slate-950/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-850 hover:border-slate-700'
                  }`}
                  title={`${dayNumber} ${MONTH_NAMES_FR[currentView.monthIndex]} ${currentView.year}${
                    hasCourses ? ` · ${courseInfo?.count} courses au programme` : ''
                  }`}
                >
                  {/* Numéro du jour */}
                  <div className="flex items-center justify-between w-full px-1">
                    <span className={`text-xs sm:text-sm font-mono font-black ${
                      isSelected ? 'text-slate-950' : isToday ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {String(dayNumber).padStart(2, '0')}
                    </span>
                    {isToday && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400 animate-ping'}`} />
                    )}
                  </div>

                  {/* Badges / Indicateurs de Réunions ou Quinté+ */}
                  <div className="w-full flex items-center justify-center gap-1">
                    {hasCourses ? (
                      <div className={`px-1 py-0.2 rounded text-[9px] font-mono font-black flex items-center gap-0.5 ${
                        isSelected
                          ? 'bg-slate-950 text-amber-300'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}>
                        {courseInfo?.hasQuinte && <Trophy className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                        <span>{courseInfo?.count}c</span>
                      </div>
                    ) : isToday ? (
                      <span className={`text-[8px] font-black uppercase ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>
                        Auj.
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Légende du Calendrier */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 px-1">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-400 to-amber-600 border border-amber-300 shadow-sm" />
                <span className="font-bold text-amber-300">Jour Sélectionné (Filtre actif)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-900 border border-emerald-500" />
                <span className="font-bold text-emerald-400">Aujourd'hui</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
                <span className="font-medium text-slate-300">Courses au programme</span>
              </div>
            </div>

            <div className="text-[11px] font-bold text-slate-400">
              💡 Cliquez sur un jour pour isoler et afficher uniquement ses réunions officielles.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
