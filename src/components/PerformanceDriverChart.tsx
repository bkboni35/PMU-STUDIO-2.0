import React from 'react';
import { Partant } from '../types/turf';
import { calculerPerformance3Musiques } from '../utils/turfCalculations';
import { Trophy, Award, BarChart3, TrendingUp, Zap } from 'lucide-react';

import { getPartantDriverMusique } from '../utils/turfCalculations';

export interface PerformanceDriverChartProps {
  partant: Partant;
  compact?: boolean;
}

export interface DriverLast10Analysis {
  last10Finishes: Array<{ token: string; rank: number | null; isWin: boolean; isPodium: boolean }>;
  sumLast3Finishes: number;
  totalPoints3: number;
  label3: string;
}

export function analyzeDriverLast10And3(partant: Partant): DriverLast10Analysis {
  const driverMusique = getPartantDriverMusique(partant) || partant.driverMusique || '';
  const sourceMusique = driverMusique.trim();

  if (!sourceMusique) {
    return {
      last10Finishes: [],
      sumLast3Finishes: 0,
      totalPoints3: 0,
      label3: 'N/A',
    };
  }

  const clean = sourceMusique.replace(/\(\d{2,4}\)/g, ' ');
  const tokens = clean.match(/\b\d+[a-z]?|[0-9]+[a-z]?|[DATRdatr][a-z]?/g) || [];

  // Last 10 finishes
  const last10Tokens = tokens.slice(0, 10);
  const last10Finishes = last10Tokens.map((t) => {
    const numMatch = t.match(/^(\d+)/);
    const rank = numMatch ? parseInt(numMatch[1], 10) : null;
    return {
      token: t,
      rank,
      isWin: rank === 1,
      isPodium: rank !== null && rank >= 1 && rank <= 3,
    };
  });

  // Ensure we have at least 3 items for last 3 performances calculation
  const perf3Res = calculerPerformance3Musiques(sourceMusique);
  
  // Calculate sum of last 3 numerical finishes
  const last3Tokens = tokens.slice(0, 3);
  let sumLast3 = 0;
  if (last3Tokens.length === 0) {
    sumLast3 = 0;
  } else {
    last3Tokens.forEach((t) => {
      const m = t.match(/^(\d+)/);
      if (m) {
        const r = parseInt(m[1], 10);
        sumLast3 += r > 9 ? 9 : r;
      } else {
        sumLast3 += 9;
      }
    });
  }

  return {
    last10Finishes,
    sumLast3Finishes: sumLast3,
    totalPoints3: perf3Res.totalPoints,
    label3: perf3Res.badgeShort,
  };
}

export const PerformanceDriverChart: React.FC<PerformanceDriverChartProps> = ({ partant, compact = false }) => {
  const analysis = analyzeDriverLast10And3(partant);

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-md">
      {/* Header / Somme 3 dernières */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 font-bold text-amber-400">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Somme 3 dern. :</span>
          <strong className="text-white font-mono bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
            {analysis.sumLast3Finishes} pts
          </strong>
        </span>
        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30" title={`Points calculés (Manus 2.0): ${analysis.totalPoints3}`}>
          {analysis.label3}
        </span>
      </div>

      {/* Visuel Historique 10 Dernières Courses (Agent Manus 2.0) */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-0.5">
          <BarChart3 className="w-3 h-3 text-indigo-400" />
          10c:
        </span>
        {analysis.last10Finishes.length === 0 ? (
          <span className="text-[10px] text-slate-500 italic">Aucun historique récent</span>
        ) : (
          analysis.last10Finishes.map((item, idx) => {
            let bgClass = 'bg-slate-800 text-slate-400 border-slate-700';
            let titleText = `Course ${idx + 1}: ${item.token}`;

            if (item.isWin) {
              bgClass = 'bg-amber-500 text-black font-black border-amber-300 shadow-xs shadow-amber-500/50';
              titleText = `Victoire (1er) - ${item.token}`;
            } else if (item.isPodium) {
              bgClass = 'bg-purple-600 text-white font-bold border-purple-400 shadow-xs';
              titleText = `Podium (${item.rank}e) - ${item.token}`;
            } else if (item.token.toUpperCase().startsWith('D')) {
              bgClass = 'bg-rose-950 text-rose-300 border-rose-800';
              titleText = `Disqualifié (Dai) - ${item.token}`;
            } else {
              bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
              titleText = `Non placé (${item.token})`;
            }

            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono border shrink-0 transition-transform hover:scale-110 ${bgClass}`}
                title={titleText}
              >
                {item.token.replace(/[a-z]/gi, '') || item.token.charAt(0)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
