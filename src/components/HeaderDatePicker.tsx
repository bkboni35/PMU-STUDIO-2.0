import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronRight, Archive, Sparkles } from 'lucide-react';
import { getIvoryCoastDate, getMillisecondsUntilIvoryCoastMidnight } from '../utils/timeConversion';

interface HeaderDatePickerProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  onOpenCalendar?: () => void;
}

export const HeaderDatePicker: React.FC<HeaderDatePickerProps> = ({
  selectedDate,
  onDateChange,
  onOpenCalendar,
}) => {
  // Calcul dynamique des dates calées sur la Côte d'Ivoire (GMT / Africa/Abidjan)
  const [todayCI, setTodayCI] = useState<string>(() => getIvoryCoastDate(0));
  const [currentSelected, setCurrentSelected] = useState<string>(selectedDate || getIvoryCoastDate(0));

  // Synchronisation avec la prop parent
  useEffect(() => {
    if (selectedDate) {
      setCurrentSelected(selectedDate);
    }
  }, [selectedDate]);

  // Actualisation automatique à 00h00 heure de Côte d'Ivoire (GMT)
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const scheduleMidnightUpdate = () => {
      const msUntilMidnight = getMillisecondsUntilIvoryCoastMidnight();
      console.log(`[AUTO-ACTUALISATION 00h00 CÔTE D'IVOIRE] Prochain déclenchement dans ${Math.round(msUntilMidnight / 1000)}s`);

      timerId = setTimeout(() => {
        const newToday = getIvoryCoastDate(0);
        console.log(`[00h00 GMT CÔTE D'IVOIRE ATTEINT] Nouveau jour : ${newToday}. Actualisation automatique des courses...`);
        setTodayCI(newToday);
        setCurrentSelected(newToday);
        onDateChange(newToday);

        try {
          localStorage.setItem('hippo_selected_date', newToday);
          window.dispatchEvent(new CustomEvent('hippoanalyse-date-filter-changed', { detail: { date: newToday } }));
        } catch {}

        // Programmer le minuit suivant
        scheduleMidnightUpdate();
      }, msUntilMidnight);
    };

    scheduleMidnightUpdate();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [onDateChange]);

  // Calcul dynamique de Hier, Aujourd'hui et Demain
  const yesterdayCI = getIvoryCoastDate(-1);
  const tomorrowCI = getIvoryCoastDate(1);

  // Formatter la date en français
  const formatDateFrench = (dateStr: string) => {
    try {
      if (!dateStr || dateStr === 'all') return 'Toutes les archives';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const formatted = d.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleSelectDate = (date: string) => {
    setCurrentSelected(date);
    onDateChange(date);
    try {
      localStorage.setItem('hippo_selected_date', date);
      window.dispatchEvent(new CustomEvent('hippoanalyse-date-filter-changed', { detail: { date } }));
    } catch {}
  };

  const isToday = currentSelected === todayCI;
  const isYesterday = currentSelected === yesterdayCI;
  const isTomorrow = currentSelected === tomorrowCI;

  return (
    <div className="relative flex items-center gap-1.5 flex-wrap">
      {/* Badge Principal Date des Courses & Sélecteur */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/90 border border-amber-500/40 rounded-2xl shadow-lg backdrop-blur-md">
        {/* Icône & Date du Jour cliquable */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 text-xs">
          <CalendarIcon className="w-4 h-4 text-amber-400 stroke-[2.5] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400/90 leading-none">
              Date des Courses :
            </span>
            <span className="text-xs font-black text-white leading-tight">
              {formatDateFrench(currentSelected)}
            </span>
          </div>
        </div>

        {/* Date Picker Input HTML5 Natif & Stylisé */}
        <div className="relative flex items-center">
          <input
            type="date"
            value={currentSelected === 'all' ? '' : currentSelected}
            onChange={(e) => {
              if (e.target.value) {
                handleSelectDate(e.target.value);
              }
            }}
            className="bg-slate-900 hover:bg-slate-850 text-white font-black text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-hidden transition-all cursor-pointer shadow-inner w-[130px]"
            title="Choisir une date spécifique pour filtrer le programme et les archives"
          />
        </div>

        {/* Boutons de raccourcis rapides : Hier, Aujourd'hui, Demain */}
        <div className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-1.5">
          <button
            type="button"
            onClick={() => handleSelectDate(yesterdayCI)}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
              isYesterday
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 ring-1 ring-amber-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
            title={`Filtrer sur les courses d'hier (${formatDateFrench(yesterdayCI)})`}
          >
            Hier
          </button>

          <button
            type="button"
            onClick={() => handleSelectDate(todayCI)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
              isToday
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
            title={`Courses d'aujourd'hui (${formatDateFrench(todayCI)}) - Actualisé auto à 00h00 GMT`}
          >
            🎯 Aujourd'hui
          </button>

          <button
            type="button"
            onClick={() => handleSelectDate(tomorrowCI)}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
              isTomorrow
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 ring-1 ring-amber-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
            title={`Filtrer sur les courses de demain (${formatDateFrench(tomorrowCI)})`}
          >
            Demain
          </button>

          {/* Bouton Archives / Toutes les dates */}
          <button
            type="button"
            onClick={() => handleSelectDate('all')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
              currentSelected === 'all'
                ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800'
            }`}
            title="Afficher toutes les courses et archives confondues"
          >
            <Archive className="w-3 h-3" />
            <span>Archives</span>
          </button>
        </div>

        {/* Bouton Voir Programme : ouvre le calendrier officiel actualisé */}
        {onOpenCalendar && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
            title="Consulter le calendrier PMU officiel actualisé pour cette date (Auto-refresh 00h00 GMT)"
          >
            <span>Voir Programme</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};
