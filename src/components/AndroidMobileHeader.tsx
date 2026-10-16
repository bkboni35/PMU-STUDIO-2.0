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
  Sliders,
  Terminal,
  Search,
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
  isExpertMode?: boolean;
  onToggleExpertMode?: () => void;
  hasScraperLogs?: boolean;
  onOpenScraperLogs?: () => void;
  onOpenSearch?: () => void;
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
}) => {
  return (
    <div className="sm:hidden mb-4 p-3 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0a1120] rounded-[24px] border border-slate-800 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex flex-col gap-3 relative overflow-hidden">
      {/* Glossy overlay */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <img
              src="/hippoanalyse_pro_logo_1790414725595.jpg"
              alt="Logo HippoAnalyse Pro"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/50 shadow-lg shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/horse-logo.jpg')) {
                  target.src = '/horse-logo.jpg';
                }
              }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-sm">
              <Smartphone className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white tracking-tight truncate">
                PMU-STUDIO 2.0
              </h1>
              <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Logiciel d'Analyse Certifié</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 active:scale-90 transition-transform"
            >
              <Search className="w-5 h-5 text-slate-950 stroke-[3]" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform"
          >
            <Download className="w-5 h-5 text-slate-950 stroke-[3]" />
          </button>
        </div>
      </div>

      {course && (
        <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md p-2.5 rounded-[18px] border border-slate-800/50 shadow-inner relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-[10px] font-black text-amber-400 shrink-0">
                {course.reunion || ''}{course.course || ''}
              </span>
              <span className="text-xs font-bold text-slate-200 truncate uppercase">
                {course.hippodrome || 'Course PMU'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-bold text-slate-400">
                {course.partants?.length || 0} PARTANTS
              </span>
              <span className="w-1 h-1 bg-slate-700 rounded-full" />
              <span className="text-[9px] font-bold text-slate-400">
                {course.distance || '2100'}m
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {onToggleExpertMode && (
              <button
                type="button"
                onClick={onToggleExpertMode}
                className={`p-2 rounded-xl border transition-all ${
                  isExpertMode
                    ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-purple-400'
                }`}
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}
            
            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="p-2 rounded-xl bg-amber-500 text-slate-950 border border-amber-400 shadow-md flex items-center gap-1"
              >
                <History className="w-4 h-4 stroke-[3]" />
                {historyCount > 0 && (
                  <span className="text-[10px] font-black">{historyCount}</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
