import React from 'react';
import {
  Smartphone,
  Download,
  Flame,
  ShieldCheck,
  RefreshCw,
  Share2,
  History,
  RotateCcw,
} from 'lucide-react';
import { CourseHippique } from '../types/turf';

interface AndroidMobileHeaderProps {
  course?: CourseHippique | null;
  onOpenInstallModal: () => void;
  onOpenHistory?: () => void;
  onResetSession?: () => void;
  historyCount?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const AndroidMobileHeader: React.FC<AndroidMobileHeaderProps> = ({
  course,
  onOpenInstallModal,
  onOpenHistory,
  onResetSession,
  historyCount = 0,
  onRefresh,
  isLoading,
}) => {
  return (
    <div className="sm:hidden mb-4 p-3 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 rounded-2xl border border-emerald-500/30 shadow-lg flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/hippoanalyse_pro_logo_1790414725595.jpg"
          alt="Logo HippoAnalyse Pro"
          className="w-10 h-10 rounded-xl object-cover border border-amber-400 shadow-md shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
              Android App
            </span>
            <span className="text-[11px] font-bold text-slate-300 truncate">
              {course ? `${course.hippodrome || ''} · ${course.reunion || ''}${course.course || ''}` : 'HippoAnalyse Pro'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {course ? `${course.partants?.length || 0} partants · ${course.distance && !isNaN(Number(course.distance)) ? course.distance : 2100}m` : 'Analyse PMU & hippique'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onResetSession && (
          <button
            type="button"
            onClick={onResetSession}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[11px] font-bold active:scale-95"
            title="Réinitialiser la session"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset</span>
          </button>
        )}

        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 border-2 border-amber-400 text-[11px] font-black shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
            title="Historique des courses analysées"
          >
            <History className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
            <span className="text-slate-950 font-black">Historique</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 font-black text-[9px] border border-amber-400">
                {historyCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenInstallModal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-[11px] font-black shadow-md shadow-emerald-500/20 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Installer</span>
        </button>
      </div>
    </div>
  );
};
