import React from 'react';
import { CourseHippique } from '../types/turf';
import { computeDisciplineGrid } from '../utils/v38Helper';

interface DisciplineGridTableProps {
  course: CourseHippique;
  variant?: 'dark' | 'light';
}

export const DisciplineGridTable: React.FC<DisciplineGridTableProps> = ({
  course,
  variant = 'dark',
}) => {
  const grid = computeDisciplineGrid(course);

  const isDark = variant === 'dark';

  return (
    <div
      className={`rounded-2xl border ${
        isDark
          ? 'bg-[#0b1329] border-slate-800 text-white shadow-2xl p-4 sm:p-6'
          : 'bg-white border-slate-200 text-slate-900 shadow-lg p-4 sm:p-6'
      } space-y-5 font-sans w-full`}
    >
      {/* Header: Critères d'attribution des lignes */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
          Critères d'attribution des lignes ({grid.title}) :
        </div>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700">
          Grille V38 Discipline
        </span>
      </div>

      {/* 2. Tableau de Répartition */}
      <div className="rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs sm:text-sm font-black uppercase tracking-wider">
                {/* Catégorie Header */}
                <th className="py-3 px-4 bg-[#38bdf8] text-slate-950 font-black w-1/5 border-r border-slate-700/50">
                  Catégorie
                </th>
                {/* Bases Solides Header */}
                <th className="py-3 px-4 bg-[#38bdf8] text-slate-950 font-black text-center w-1/5 border-r border-slate-700/50">
                  Bases Solides
                </th>
                {/* Chances Sérieuses Header */}
                <th className="py-3 px-4 bg-[#38bdf8] text-slate-950 font-black text-center w-1/5 border-r border-slate-700/50">
                  Chances Sérieuses
                </th>
                {/* Tocards Spéculatifs Header - ALIGNÉ À GAUCHE */}
                <th className="py-3 px-4 bg-[#38bdf8] text-slate-950 font-black text-left w-1/5 border-r border-slate-700/50">
                  Tocards Spéculatifs
                </th>
                {/* Délaissés Header - ALIGNÉ À GAUCHE */}
                <th className="py-3 px-4 bg-[#1e293b] text-white font-black text-left w-1/5">
                  Délaissés
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#0f172a] text-slate-200">
              {grid.rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-900/60 transition-colors">
                  {/* Colonne 1 : Catégorie (Affichage simple A, B et C) */}
                  <td className="py-3 px-4 border-r border-slate-800 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 font-black text-amber-400 text-base sm:text-lg flex items-center justify-center shadow-md">
                        {row.key}
                      </div>
                    </div>
                  </td>

                  {/* Colonne 2 : Bases Solides */}
                  <td className="py-3 px-4 border-r border-slate-800 text-center">
                    {row.bases.length > 0 ? (
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {row.bases.map((num, bIdx) => (
                          <div
                            key={`base-${row.key}-${num}-${bIdx}`}
                            className="w-10 h-10 rounded-full sm:rounded-xl bg-[#059669] text-white font-black flex items-center justify-center text-center shadow-md border border-emerald-400/40 shrink-0"
                            style={{ fontSize: '16px', lineHeight: '1' }}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-base">—</span>
                    )}
                  </td>

                  {/* Colonne 3 : Chances Sérieuses */}
                  <td className="py-3 px-4 border-r border-slate-800 text-center">
                    {row.chances.length > 0 ? (
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {row.chances.map((num, cIdx) => (
                          <div
                            key={`chance-${row.key}-${num}-${cIdx}`}
                            className="w-10 h-10 rounded-full sm:rounded-xl bg-[#f59e0b] text-slate-950 font-black flex items-center justify-center text-center shadow-md border border-amber-300/60 shrink-0"
                            style={{ fontSize: '16px', lineHeight: '1' }}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-base">—</span>
                    )}
                  </td>

                  {/* Colonne 4 : Tocards Spéculatifs - ALIGNÉ STRICTEMENT À GAUCHE */}
                  <td className="py-3 px-4 border-r border-slate-800 text-left">
                    {row.tocards.length > 0 ? (
                      <div className="flex items-center justify-start gap-2 flex-wrap w-full">
                        {row.tocards.map((num, tIdx) => (
                          <div
                            key={`tocard-${row.key}-${num}-${tIdx}`}
                            className="w-10 h-10 rounded-full sm:rounded-xl bg-[#f97316] text-white font-black flex items-center justify-center text-center shadow-md border border-orange-400/50 shrink-0"
                            style={{ fontSize: '16px', lineHeight: '1' }}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-base">—</span>
                    )}
                  </td>

                  {/* Colonne 5 : Délaissés - ALIGNÉ STRICTEMENT À GAUCHE */}
                  <td className="py-3 px-4 text-left">
                    {row.delaisses.length > 0 ? (
                      <div className="flex items-center justify-start gap-2 flex-wrap w-full">
                        {row.delaisses.map((num, dIdx) => (
                          <div
                            key={`delaisse-${row.key}-${num}-${dIdx}`}
                            className="w-10 h-10 rounded-full sm:rounded-xl bg-[#1e293b] text-slate-200 border border-slate-700 font-black flex items-center justify-center text-center shadow-sm shrink-0"
                            style={{ fontSize: '16px', lineHeight: '1' }}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-base">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
