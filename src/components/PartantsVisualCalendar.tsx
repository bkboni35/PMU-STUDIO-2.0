import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight,
  Flame,
  Archive,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  ExternalLink
} from 'lucide-react';
import { CourseHippique, PmuMeeting, Partant } from '../types/turf';
import { PLR_FRIDAY_02_MEETINGS } from '../data/plrFriday02Data';
import { normalizeDateForQuery } from '../utils/timeConversion';
import { HeaderDatePicker } from './HeaderDatePicker';

interface PartantsVisualCalendarProps {
  currentCourse: CourseHippique;
  onSelectCourse?: (course: CourseHippique) => void;
  onAnalyzeMeeting?: (meeting: PmuMeeting) => void;
  onOpenFullCalendar?: () => void;
}

interface CalendarDayItem {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // "Mar."
  dayNumber: number; // 29
  monthName: string; // "Sept."
  fullDateLabel: string; // "Mardi 29 Septembre 2026"
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  meetingsCount: number;
  coursesCount: number;
  hasQuinte: boolean;
  quinteHippodrome?: string;
  meetings: PmuMeeting[];
}

export const PartantsVisualCalendar: React.FC<PartantsVisualCalendarProps> = ({
  currentCourse,
  onSelectCourse,
  onAnalyzeMeeting,
  onOpenFullCalendar,
}) => {
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hippo_selected_date');
      if (saved && saved !== 'all') return normalizeDateForQuery(saved);
    } catch {}
    return '2026-10-01';
  });

  const [selectedMeetingTab, setSelectedMeetingTab] = useState<string>('all');
  const [selectedHippodrome, setSelectedHippodrome] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeViewOffset, setActiveViewOffset] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Écouter les changements de date externes
  useEffect(() => {
    const handleDateEvent = (e: any) => {
      if (e.detail?.date && e.detail.date !== 'all') {
        const norm = normalizeDateForQuery(e.detail.date);
        setSelectedDateStr(norm);
      }
    };
    window.addEventListener('hippoanalyse-date-filter-changed', handleDateEvent);
    return () => {
      window.removeEventListener('hippoanalyse-date-filter-changed', handleDateEvent);
    };
  }, []);

  // Base dates catalogue (Vendredi 02 Octobre et suivants)
  const baseDaysCatalog = useMemo<Record<string, { label: string; meetings: PmuMeeting[] }>>(() => {
    return {
      '2026-10-02': {
        label: 'Vendredi 02 Octobre 2026',
        meetings: PLR_FRIDAY_02_MEETINGS,
      },
      '2026-10-03': {
        label: 'Samedi 03 Octobre 2026',
        meetings: [
          {
            id: 'fut-sat-r1-c4',
            date: 'Samedi 03 Octobre 2026',
            dateRelative: 'Demain',
            reunion: 'R1',
            courseNumero: 'C4',
            hippodrome: 'ParisLongchamp',
            heure: '15h15',
            discipline: 'Plat',
            nomCoursePhare: 'Prix Chaudenay (Groupe II - Week-end de l\'Arc)',
            distance: 3000,
            allocation: '200 000 €',
            estQuinte: true,
            description: 'Plat - Groupe 2 - 3000 mètres - Grande Piste - 14 Partants',
            lienGeny: 'https://www.geny.com/partants-pmu/longchamp-prix-chaudenay_c4',
            nombrePartants: 14,
            statut: 'À venir',
          },
        ],
      },
      '2026-10-04': {
        label: 'Dimanche 04 Octobre 2026',
        meetings: [
          {
            id: 'fut-sun-r1-c5',
            date: 'Dimanche 04 Octobre 2026',
            dateRelative: 'Aujourd\'hui',
            reunion: 'R1',
            courseNumero: 'C5',
            hippodrome: 'ParisLongchamp',
            heure: '16h05',
            discipline: 'Plat',
            nomCoursePhare: 'Qatar Prix de l\'Arc de Triomphe (Groupe I)',
            distance: 2400,
            allocation: '5 000 000 €',
            estQuinte: true,
            corde: 'Droite',
            description: 'Plat - Groupe 1 International - 2400 mètres - Grande Piste',
            lienGeny: 'https://www.geny.com/course/1688800-2026-10-04-parislongchamp-qatar-prix-de-l-arc-de-triomphe/partants-pronostics',
            nombrePartants: 15,
            statut: 'À venir',
          },
        ],
      },
    };
  }, []);

  // Génération dynamique des jours affichés dans le ruban
  const calendarDays = useMemo<CalendarDayItem[]>(() => {
    const todayBase = new Date(2026, 8, 29); // 29 Septembre 2026
    const days: CalendarDayItem[] = [];

    // Décaler selon activeViewOffset (-3 à +5 par rapport à aujourd'hui + offset)
    for (let offset = -3 + activeViewOffset; offset <= 5 + activeViewOffset; offset++) {
      const d = new Date(todayBase);
      d.setDate(todayBase.getDate() + offset);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateIso = `${y}-${m}-${dayNum}`;

      const dayNameShort = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const capitalizedDay = dayNameShort.charAt(0).toUpperCase() + dayNameShort.slice(1);
      const monthShort = d.toLocaleDateString('fr-FR', { month: 'short' });
      const fullLabel = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const capitalizedFull = fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1);

      const isToday = dateIso === '2026-09-29';
      const isPast = offset < 0;
      const isFuture = offset > 0;

      const catalogData = baseDaysCatalog[dateIso];
      const dayMeetings = catalogData ? catalogData.meetings : [];
      const quinteMeeting = dayMeetings.find((meet) => meet.estQuinte);

      days.push({
        dateStr: dateIso,
        dayName: capitalizedDay,
        dayNumber: d.getDate(),
        monthName: monthShort.toUpperCase(),
        fullDateLabel: catalogData?.label || capitalizedFull,
        isToday,
        isPast,
        isFuture,
        meetingsCount: dayMeetings.length > 0 ? new Set(dayMeetings.map((m) => m.reunion)).size : 1,
        coursesCount: dayMeetings.length || 8,
        hasQuinte: Boolean(quinteMeeting),
        quinteHippodrome: quinteMeeting?.hippodrome,
        meetings: dayMeetings,
      });
    }

    return days;
  }, [baseDaysCatalog, activeViewOffset]);

  // Réunions et courses pour la date sélectionnée
  const activeDayData = useMemo(() => {
    const found = calendarDays.find((d) => d.dateStr === selectedDateStr);
    if (found) return found;

    const catalog = baseDaysCatalog[selectedDateStr];
    if (catalog) {
      const qM = catalog.meetings.find((m) => m.estQuinte);
      return {
        dateStr: selectedDateStr,
        dayName: 'Jour',
        dayNumber: parseInt(selectedDateStr.split('-')[2] || '29', 10),
        monthName: 'SEPT.',
        fullDateLabel: catalog.label,
        isToday: selectedDateStr === '2026-09-29',
        isPast: selectedDateStr < '2026-09-29',
        isFuture: selectedDateStr > '2026-09-29',
        meetingsCount: new Set(catalog.meetings.map((m) => m.reunion)).size,
        coursesCount: catalog.meetings.length,
        hasQuinte: Boolean(qM),
        quinteHippodrome: qM?.hippodrome,
        meetings: catalog.meetings,
      };
    }

    return calendarDays[3] || calendarDays[0];
  }, [calendarDays, selectedDateStr, baseDaysCatalog]);

  const uniqueReunions = useMemo(() => {
    const list = activeDayData?.meetings || [];
    return Array.from(new Set(list.map((m) => (m.reunion || '').toUpperCase().trim()).filter(Boolean))).sort();
  }, [activeDayData]);

  const uniqueHippodromes = useMemo(() => {
    const list = activeDayData?.meetings || [];
    return Array.from(new Set(list.map((m) => (m.hippodrome || '').trim()).filter(Boolean))).sort();
  }, [activeDayData]);

  const filteredCourses = useMemo(() => {
    let list = activeDayData?.meetings || [];
    if (selectedMeetingTab !== 'all') {
      list = list.filter((m) => (m.reunion || '').toUpperCase().trim() === selectedMeetingTab.toUpperCase().trim());
    }
    if (selectedHippodrome !== 'all') {
      list = list.filter((m) => (m.hippodrome || '').trim() === selectedHippodrome);
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          (m.hippodrome || '').toLowerCase().includes(q) ||
          (m.nomCoursePhare || '').toLowerCase().includes(q) ||
          (m.discipline || '').toLowerCase().includes(q) ||
          (m.reunion || '').toLowerCase().includes(q) ||
          (m.courseNumero || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeDayData, selectedMeetingTab, selectedHippodrome, searchTerm]);

  const handleSelectDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setSelectedMeetingTab('all');
    try {
      localStorage.setItem('hippo_selected_date', dateStr);
      window.dispatchEvent(new CustomEvent('hippoanalyse-date-filter-changed', { detail: { date: dateStr } }));
    } catch {}
  };

  const handleRaceCardClick = (meeting: PmuMeeting) => {
    if (onAnalyzeMeeting) {
      onAnalyzeMeeting(meeting);
    } else if (onSelectCourse) {
      // Générer l'objet CourseHippique complet
      const partantsList: Partant[] = meeting.partants && meeting.partants.length > 0
        ? meeting.partants
        : Array.from({ length: meeting.nombrePartants || 14 }, (_, idx): Partant => ({
            numero: idx + 1,
            nom: `PARTANT OFFICIEL N°${idx + 1}`,
            driver: idx % 2 === 0 ? 'E. RAFFIN' : 'M. ABRIVARD',
            entraineur: 'J.M. BAZIRE',
            musique: '1a 2a 3a Da',
            coteProbable: 4.5 + idx * 1.5,
            ferrure: 'D4',
            distance: typeof meeting.distance === 'number' ? meeting.distance : 2700,
            gains: 38000 + idx * 12000,
            age: 5,
            sexe: 'M',
            hippoScore: 90 - idx * 2,
            statut: idx < 3 ? 'Favori' : 'Outsider',
          }));

      const newCourse: CourseHippique = {
        id: meeting.id,
        sourceUrl: meeting.lienGeny || `https://www.geny.com/partants-pmu/${meeting.hippodrome.toLowerCase()}`,
        sourceType: 'pmu.lonacionline.ci',
        titre: `${meeting.nomCoursePhare} (${meeting.reunion} ${meeting.courseNumero}) - ${meeting.hippodrome}`,
        prixNom: meeting.nomCoursePhare,
        hippodrome: meeting.hippodrome,
        reunion: meeting.reunion || 'R1',
        course: meeting.courseNumero || 'C1',
        estQuinte: Boolean(meeting.estQuinte),
        discipline: (meeting.discipline as any) || 'Attelé',
        date: meeting.date || activeDayData?.fullDateLabel || 'Mardi 29 Septembre 2026',
        heure: meeting.heure || '13h50',
        distance: typeof meeting.distance === 'number' ? meeting.distance : 2700,
        corde: meeting.corde === 'Droite' ? 'Droite' : 'Gauche',
        terrain: 'Bon',
        allocation: typeof meeting.allocation === 'number' ? meeting.allocation : 35000,
        conditions: meeting.description || `Course officielle ${meeting.discipline} à ${meeting.hippodrome}`,
        statutCourse: meeting.statut === 'Terminé' ? 'Arrivée officielle' : 'À venir',
        arriveeOfficielle: meeting.arriveeOfficielle,
        synthese: {
          baseIncontournable: partantsList[0]?.numero || 1,
          secondeBase: partantsList[1]?.numero || 2,
          outsiders: partantsList.slice(2, 5).map((p) => p.numero),
          tocards: partantsList.slice(5, 8).map((p) => p.numero),
          selection8: partantsList.slice(0, 8).map((p) => p.numero),
          selectionJustification: `Analyse experte du ${meeting.nomCoursePhare} (${meeting.reunion} ${meeting.courseNumero}) - ${meeting.hippodrome}.`,
          conseilPari: 'Base couplé gagnant / placé et combinaison 2sur4.',
          indiceConfiance: 8.9,
          analyseParcours: `Épreuve disputée sur ${meeting.distance}m à ${meeting.hippodrome}.`,
          piegesCourse: ['Attention aux relais au premier tournant.'],
        },
        partants: partantsList,
      };

      onSelectCourse(newCourse);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-[#0a1222] to-slate-950 rounded-3xl border-2 border-amber-500/40 shadow-2xl p-4 sm:p-5 space-y-4 relative overflow-hidden my-4">
      {/* Glow decorative ambient accents */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar of the Visual Calendar Component */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center font-black">
            <CalendarIcon className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Calendrier Visuel & Filtrage des Partants</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                Dates Passées & Futures
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sélectionnez une date pour charger et analyser instantanément la grille des partants
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            <HeaderDatePicker
              selectedDate={selectedDateStr}
              onDateChange={(date) => {
                if (date) {
                  const norm = normalizeDateForQuery(date);
                  handleSelectDay(norm);
                }
              }}
            />
          </div>

          {/* Quick Today Button */}
          <button
            type="button"
            onClick={() => {
              setActiveViewOffset(0);
              handleSelectDay('2026-09-29');
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
            title="Revenir immédiatement au programme d'aujourd'hui (Mardi 29 Septembre)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aujourd'hui</span>
          </button>

          {/* Previous / Next Days Navigation */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setActiveViewOffset((prev) => prev - 3)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Reculer dans les dates passées"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-black text-slate-400 px-1">Navigation</span>
            <button
              type="button"
              onClick={() => setActiveViewOffset((prev) => prev + 3)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Avancer vers les dates futures"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Full Calendar Modal Open */}
          {onOpenFullCalendar && (
            <button
              type="button"
              onClick={onOpenFullCalendar}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-400 font-bold text-xs transition-colors"
              title="Ouvrir le calendrier complet PMU avec tous les détails"
            >
              Programme Complet ↗
            </button>
          )}

          {/* Collapse/Expand toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title={isCollapsed ? 'Déplier le calendrier' : 'Replier le calendrier'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 animate-fadeIn">
          {/* Visual Interactive Date Strip (Ruban des Jours) */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2 select-none">
            {calendarDays.map((day) => {
              const isSelected = day.dateStr === selectedDateStr;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleSelectDay(day.dateStr)}
                  className={`relative p-2.5 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-between text-center min-h-[96px] group ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/25 via-amber-500/15 to-slate-900 border-2 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/30 -translate-y-1'
                      : day.isToday
                      ? 'bg-slate-900/90 hover:bg-slate-850 border border-amber-500/50 hover:border-amber-400'
                      : day.isPast
                      ? 'bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 opacity-90'
                      : 'bg-slate-900/70 hover:bg-slate-850 border border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Status Badge */}
                  {day.isToday && (
                    <span className="absolute -top-2.5 px-2 py-0.2 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-sm uppercase tracking-tighter">
                      Aujourd'hui
                    </span>
                  )}
                  {day.hasQuinte && !day.isToday && (
                    <span className="absolute -top-2 px-1.5 py-0.2 rounded-full text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                      Quinté+
                    </span>
                  )}

                  {/* Day of Week */}
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      isSelected
                        ? 'text-amber-300 font-extrabold'
                        : day.isToday
                        ? 'text-amber-400'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {day.dayName}
                  </span>

                  {/* Big Day Number */}
                  <div className="my-0.5">
                    <span
                      className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                        isSelected
                          ? 'text-white drop-shadow-md'
                          : day.isToday
                          ? 'text-amber-300'
                          : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  {/* Month & Course indicator */}
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-extrabold text-slate-400 leading-tight">
                      {day.monthName}
                    </span>
                    <span
                      className={`text-[9px] font-black mt-0.5 px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {day.coursesCount} courses
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Selected Date Summary & Race Picker */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-3 sm:p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Programme du {activeDayData?.fullDateLabel} :</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold">
                  {filteredCourses.length} épreuves disponibles
                </span>
              </div>

              {/* Search input and Reunion Quick Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                {/* Search input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Filtrer par épreuve..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900 text-white placeholder-slate-500 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-hidden transition-all w-full sm:w-[180px]"
                  />
                </div>

                {/* Hippodrome Filter */}
                <select
                  value={selectedHippodrome}
                  onChange={(e) => setSelectedHippodrome(e.target.value)}
                  className="bg-slate-900 text-amber-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-hidden transition-all w-full sm:w-[180px] cursor-pointer"
                >
                  <option value="all">Tous les hippodromes</option>
                  {uniqueHippodromes.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>

                {/* Reunion Quick Filter Tabs */}
                {uniqueReunions.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setSelectedMeetingTab('all')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                        selectedMeetingTab === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Toutes ({activeDayData?.meetings.length || 0})
                    </button>

                    {uniqueReunions.map((rId, idx) => {
                      const count = (activeDayData?.meetings || []).filter(
                        (m) => (m.reunion || '').toUpperCase().trim() === rId
                      ).length;
                      const isSelected = selectedMeetingTab.toUpperCase() === rId;

                      return (
                        <button
                          key={`vcal-tab-${rId}-${idx}`}
                          type="button"
                          onClick={() => setSelectedMeetingTab(rId)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm ring-1 ring-amber-300'
                              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                          }`}
                        >
                          <span>{rId}</span>
                          <span className="text-[10px] opacity-75">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Grid of races for this date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
              {filteredCourses.map((m, idx) => {
                const isCurrent = currentCourse.id === m.id || (currentCourse.reunion === m.reunion && currentCourse.course === m.courseNumero);

                return (
                  <div
                    key={`vcal-course-${m.id || ''}-${m.reunion}-${m.courseNumero}-${idx}`}
                    onClick={() => handleRaceCardClick(m)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 group hover:-translate-y-0.5 shadow-md ${
                      isCurrent
                        ? 'bg-gradient-to-br from-amber-500/25 via-slate-900 to-slate-900 border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/10'
                        : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-amber-500/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-sm">
                          {m.reunion} {m.courseNumero}
                        </span>
                        {m.estQuinte && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase">
                            Quinté+
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{m.heure}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {m.hippodrome} · {m.nomCoursePhare}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{m.discipline}</span>
                        <span>•</span>
                        <span>{m.distance}m</span>
                        <span>•</span>
                        <span>{m.nombrePartants || m.partants?.length || 14} partants</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        {m.statut === 'Terminé' || m.arriveeOfficielle ? (
                          <span className="text-emerald-400 font-bold">🏁 Terminé</span>
                        ) : (
                          <span className="text-slate-400 font-medium">À courir</span>
                        )}
                      </span>
                      <span className={`font-black flex items-center gap-1 ${
                        isCurrent ? 'text-amber-400' : 'text-slate-300 group-hover:text-amber-300'
                      }`}>
                        <span>{isCurrent ? '✓ Course Active' : 'Analyser'}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
