import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, RotateCcw, Trophy, Clock, MapPin, Zap, Database } from 'lucide-react';
import { PmuMeeting } from '../types/turf';
import { PMU_SUNDAY_11_MEETINGS } from '../data/pmuSunday11Data';
import { getIvoryCoastDate } from '../utils/timeConversion';
import { PmuApiHubModal } from './PmuApiHubModal';
import { CountdownTimer } from './CountdownTimer';

interface ProgrammeDuJourProps {
  onSelectMeeting?: (meeting: PmuMeeting) => void;
}

export const ProgrammeDuJour: React.FC<ProgrammeDuJourProps> = ({ onSelectMeeting }) => {
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<PmuMeeting[]>(PMU_SUNDAY_11_MEETINGS);
  const [filter, setFilter] = useState('');
  const [isApiHubOpen, setIsApiHubOpen] = useState(false);
  const todayIso = getIvoryCoastDate(0) || '2026-10-12';

  const fetchProgram = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pmu/programme-complet/${todayIso}`);
      if (response.ok) {
        const data = await response.json();
        if (data.meetings && Array.isArray(data.meetings) && data.meetings.length > 0) {
          setMeetings(data.meetings);
          return;
        }
      }
      // Fallback
      const fallbackResp = await fetch(`/api/pmu-calendar?date=${todayIso}&refresh=true`);
      if (fallbackResp.ok) {
        const data = await fallbackResp.json();
        if (data.meetings && Array.isArray(data.meetings) && data.meetings.length > 0) {
          setMeetings(data.meetings);
        }
      }
    } catch (error) {
      console.warn('Notice actualisation programme du jour:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, []);

  const filteredMeetings = meetings.filter(m => {
    const partantsCount = m.partants && m.partants.length > 0
      ? m.partants.length
      : (m.exactPartantsCount || m.nombrePartants || 0);
    if (partantsCount < 9) return false;

    if (!filter.trim()) return true;
    const q = filter.toLowerCase().trim();
    return (
      (m.hippodrome || '').toLowerCase().includes(q) ||
      (m.nomCoursePhare || '').toLowerCase().includes(q) ||
      (m.reunion || '').toLowerCase().includes(q) ||
      (m.discipline || '').toLowerCase().includes(q)
    );
  });

  const quinteMeeting = meetings.find(m => m.estQuinte);

  return (
    <>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg mt-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Programme du Jour
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {todayIso}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {filteredMeetings.length} courses (≥ 9 partants)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {quinteMeeting
                  ? `Réunions officielles PMU TurfInfo · Quinté+ ${quinteMeeting.nomCoursePhare} à ${quinteMeeting.hippodrome}`
                  : 'Réunions officielles PMU TurfInfo en direct'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Filtrer par hippodrome..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <button 
              onClick={fetchProgram}
              disabled={loading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
            <button
              onClick={() => setIsApiHubOpen(true)}
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Hub PMU API</span>
            </button>
            <a 
              href={`https://online.turfinfo.api.pmu.fr/rest/client/1/programme/${todayIso.replace(/-/g, '').slice(4) + todayIso.replace(/-/g, '').slice(2, 4) + todayIso.replace(/-/g, '').slice(0, 2)}?specialisation=INTERNET`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
            >
              <span>Flux Officiel</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectMeeting && onSelectMeeting(m)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                m.estQuinte 
                  ? 'bg-gradient-to-br from-slate-950 to-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 hover:scale-[1.01]' 
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono font-black text-amber-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                  {m.reunion} {m.courseNumero}
                </span>
                <div className="shrink-0 font-mono">
                  <CountdownTimer date={m.date || todayIso} heure={m.heure} compact />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <h4 className="text-white font-bold text-xs truncate flex items-center gap-1.5">
                  {m.estQuinte && <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                  <span className="truncate">{m.nomCoursePhare}</span>
                </h4>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-900">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate text-slate-300 font-medium">{m.hippodrome}</span>
                </span>
                <span className="text-slate-400 font-mono shrink-0">
                  {m.nombrePartants} part. · {m.distance}m
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PmuApiHubModal
        isOpen={isApiHubOpen}
        onClose={() => setIsApiHubOpen(false)}
        onSelectMeeting={onSelectMeeting}
      />
    </>
  );
};
