import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock,
  Sparkles,
  Trophy,
  Check,
  X,
  Filter,
  ArrowRight,
  Layers,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { getIvoryCoastDate, normalizeDateForQuery } from '../utils/timeConversion';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isActive: boolean;
  presetKey?: string;
  label?: string;
}

interface PmuDateRangePickerProps {
  dateRange: DateRange;
  onChangeRange: (newRange: DateRange) => void;
  onClearRange: () => void;
  totalMeetingsCount?: number;
  filteredMeetingsCount?: number;
  availableDatesCountMap?: Record<string, number>;
  className?: string;
}

interface PresetOption {
  key: string;
  label: string;
  badge?: string;
  icon?: string;
  getRange: () => { start: string; end: string };
}

export const PmuDateRangePicker: React.FC<PmuDateRangePickerProps> = ({
  dateRange,
  onChangeRange,
  onClearRange,
  totalMeetingsCount = 0,
  filteredMeetingsCount = 0,
  availableDatesCountMap = {},
  className = '',
}) => {
  const todayIso = useMemo(() => getIvoryCoastDate(0) || '2026-10-11', []);

  // États locaux pour la saisie manuelle de date
  const [localStart, setLocalStart] = useState<string>(() => dateRange.startDate || todayIso);
  const [localEnd, setLocalEnd] = useState<string>(() => dateRange.endDate || todayIso);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (dateRange.startDate) setLocalStart(dateRange.startDate);
    if (dateRange.endDate) setLocalEnd(dateRange.endDate);
  }, [dateRange.startDate, dateRange.endDate]);

  // Raccourcis prédéfinis de plages de dates
  const presets: PresetOption[] = useMemo(() => {
    return [
      {
        key: 'today',
        label: "Aujourd'hui",
        badge: '1j',
        icon: '🌟',
        getRange: () => ({ start: todayIso, end: todayIso }),
      },
      {
        key: 'yesterday_today',
        label: "Hier & Aujourd'hui",
        badge: '2j',
        icon: '🗓️',
        getRange: () => ({ start: getIvoryCoastDate(-1), end: todayIso }),
      },
      {
        key: 'weekend',
        label: 'Ce Week-End',
        badge: 'Sam+Dim',
        icon: '🏆',
        getRange: () => {
          const d = new Date(todayIso);
          const day = d.getDay(); // 0: Dim, 6: Sam
          let satOffset = 6 - day;
          if (day === 0) satOffset = -1; // Si on est dimanche, samedi était hier
          const sat = getIvoryCoastDate(satOffset);
          const sun = getIvoryCoastDate(satOffset + 1);
          return { start: sat, end: sun };
        },
      },
      {
        key: 'upcoming7',
        label: '7 prochains jours',
        badge: '7j',
        icon: '⏱️',
        getRange: () => ({ start: todayIso, end: getIvoryCoastDate(6) }),
      },
      {
        key: 'upcoming15',
        label: '15 prochains jours',
        badge: '15j',
        icon: '📅',
        getRange: () => ({ start: todayIso, end: getIvoryCoastDate(14) }),
      },
      {
        key: 'this_month',
        label: 'Ce mois',
        badge: 'Mois',
        icon: '📆',
        getRange: () => {
          const parts = todayIso.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const lastDayNum = new Date(year, month, 0).getDate();
          const start = `${year}-${String(month).padStart(2, '0')}-01`;
          const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
          return { start, end };
        },
      },
      {
        key: 'past7',
        label: '7 derniers jours',
        badge: 'Archives',
        icon: '🕒',
        getRange: () => ({ start: getIvoryCoastDate(-6), end: todayIso }),
      },
    ];
  }, [todayIso]);

  // Calcul du nombre de jours de la plage
  const daysDifference = useMemo(() => {
    if (!localStart || !localEnd) return 1;
    try {
      const d1 = new Date(localStart);
      const d2 = new Date(localEnd);
      const diffMs = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  }, [localStart, localEnd]);

  // Formattage lisible en français
  const formatDateFr = (iso: string): string => {
    if (!iso) return '';
    try {
      const parts = iso.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
      }
    } catch {}
    return iso;
  };

  const handleApplyCustomRange = (start: string = localStart, end: string = localEnd, presetKey: string = 'custom', labelOverride?: string) => {
    let finalStart = start;
    let finalEnd = end;

    // Inversion automatique si la date de fin est antérieure à la date de début
    if (finalStart > finalEnd) {
      const temp = finalStart;
      finalStart = finalEnd;
      finalEnd = temp;
      setLocalStart(finalStart);
      setLocalEnd(finalEnd);
    }

    const label = labelOverride || (
      finalStart === finalEnd
        ? formatDateFr(finalStart)
        : `Du ${formatDateFr(finalStart)} au ${formatDateFr(finalEnd)}`
    );

    onChangeRange({
      startDate: finalStart,
      endDate: finalEnd,
      isActive: true,
      presetKey,
      label,
    });
  };

  const handleSelectPreset = (preset: PresetOption) => {
    const range = preset.getRange();
    setLocalStart(range.start);
    setLocalEnd(range.end);
    handleApplyCustomRange(range.start, range.end, preset.key, preset.label);
  };

  return (
    <div className={`bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 ${
      dateRange.isActive ? 'border-amber-400 shadow-xl shadow-amber-500/10' : 'border-slate-800'
    } rounded-2xl p-3 sm:p-4 transition-all ${className}`}>
      {/* Ligne 1 : En-tête et Statut Actuel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs shrink-0">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Sélecteur de Plages de Dates
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                dateRange.isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                {dateRange.isActive ? 'Période Active' : 'Mode Standard'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Filtrez instantanément les réunions et courses hippiques sur une période définie.
            </p>
          </div>
        </div>

        {/* Bouton de repli/dépli et actions rapides */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {dateRange.isActive && (
            <button
              type="button"
              onClick={onClearRange}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
              title="Réinitialiser le filtre de période"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Réinitialiser</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-amber-300 font-bold flex items-center gap-1.5 transition-all active:scale-95"
            title={isExpanded ? 'Réduire le sélecteur' : 'Déplier le sélecteur'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExpanded ? '▲ Options' : '▼ Définir une Période'}</span>
          </button>
        </div>
      </div>

      {/* Ligne 2 : Bandeau Résumé si une plage est active */}
      {dateRange.isActive && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
              <span>🗓️</span>
              <span>Période sélectionnée :</span>
            </span>
            <span className="font-black text-white px-2 py-0.5 rounded-lg bg-slate-950 border border-amber-500/40">
              {dateRange.label || `Du ${formatDateFr(dateRange.startDate)} au ${formatDateFr(dateRange.endDate)}`}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-800">
              {daysDifference} jour{daysDifference > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-emerald-400 font-black">
              {filteredMeetingsCount} course{filteredMeetingsCount > 1 ? 's' : ''} trouvée{filteredMeetingsCount > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={onClearRange}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              title="Supprimer le filtre de période"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Ligne 3 : Raccourcis Rapides (Presets de Périodes) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-black uppercase text-slate-400 mr-1 hidden sm:inline">
          Périodes Rapides :
        </span>
        {presets.map((preset) => {
          const isSelected = dateRange.isActive && dateRange.presetKey === preset.key;
          return (
            <button
              key={`preset-${preset.key}`}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-300'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
              title={`Filtrer du programme sur : ${preset.label}`}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
              {preset.badge && (
                <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-black ${
                  isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'
                }`}>
                  {preset.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ligne 4 : Sélecteur Personnalisé (Du ... Au ...) */}
      {(isExpanded || dateRange.presetKey === 'custom' || (!dateRange.presetKey && dateRange.isActive)) && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            {/* Input Date de Début */}
            <div className="flex-1 space-y-1">
              <label htmlFor="pmu-range-start" className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
                1. Date de Début (Du) :
              </label>
              <div className="relative flex items-center">
                <input
                  id="pmu-range-start"
                  type="date"
                  value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  className="w-full bg-slate-900 text-white font-mono font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                {formatDateFr(localStart)}
              </span>
            </div>

            {/* Séparateur / Flèche */}
            <div className="self-center hidden sm:flex flex-col items-center justify-center text-amber-400 px-2 pt-2">
              <ArrowRight className="w-5 h-5" />
              <span className="text-[9px] font-mono text-slate-500 font-bold">
                {daysDifference}j
              </span>
            </div>

            {/* Input Date de Fin */}
            <div className="flex-1 space-y-1">
              <label htmlFor="pmu-range-end" className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
                2. Date de Fin (Au) :
              </label>
              <div className="relative flex items-center">
                <input
                  id="pmu-range-end"
                  type="date"
                  value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  className="w-full bg-slate-900 text-white font-mono font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                {formatDateFr(localEnd)}
              </span>
            </div>

            {/* Bouton Appliquer la Période */}
            <div className="flex sm:flex-col justify-end gap-2 pt-1 sm:pt-4">
              <button
                type="button"
                onClick={() => handleApplyCustomRange(localStart, localEnd, 'custom')}
                className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Appliquer la Période</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PmuDateRangePicker;
