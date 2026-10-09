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

      {/* Règles d'attribution */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
        <div className="text-slate-300 font-semibold">
          <strong className="text-amber-400">{grid.rows[0]?.label || 'A'} :</strong> {grid.rows[0]?.description}
        </div>
        <div className="text-slate-300 font-semibold">
          <strong className="text-amber-400">{grid.rows[1]?.label || 'B'} :</strong> {grid.rows[1]?.description}
        </div>
        <div className="text-slate-300 font-semibold">
          <strong className="text-amber-400">{grid.rows[2]?.label || 'C'} :</strong> {grid.rows[2]?.description}
        </div>
      </div>

      {/* 2. Tableau de Répartition avec largeur des colonnes FAVORIS, OUTSIDERS, TOCARDS, SURPRISES à 4 cm */}
      <div className="rounded-xl border border-slate-800 overflow-hidden shadow-lg flex justify-center">
        <div className="overflow-x-auto w-full flex justify-center py-1">
          <table
            className="table-fixed border-collapse mx-auto"
            style={{ width: 'auto' }}
          >
            <colgroup>
              <col style={{ width: '2.5cm', minWidth: '2.5cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
            </colgroup>
            <thead>
              <tr className="text-xs sm:text-sm font-black uppercase tracking-wider">
                {/* Catégorie Header */}
                <th
                  style={{ width: '2.5cm', minWidth: '2.5cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-r border-slate-700/50 text-[11px] sm:text-xs tracking-tight"
                >
                  CATEGORIE
                </th>
                {/* Favoris Header (4 cm) */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-r border-slate-700/50 text-[11px] sm:text-xs tracking-tight"
                >
                  FAVORIS
                </th>
                {/* Outsiders Header (4 cm) */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-r border-slate-700/50 text-[11px] sm:text-xs tracking-tight"
                >
                  OUTSIDERS
                </th>
                {/* Tocards Header (4 cm) */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-r border-slate-700/50 text-[11px] sm:text-xs tracking-tight"
                >
                  TOCARDS
                </th>
                {/* Surprises Header (4 cm) */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#1e293b] text-white font-black text-center text-[11px] sm:text-xs tracking-tight border-l border-slate-700/50"
                >
                  SURPRISES
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#0f172a] text-slate-200">
              {grid.rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-900/60 transition-colors">
                  {/* Colonne 1 : Catégorie (Affichage dynamique : CA, CB, CC en plat ou A, B, C) */}
                  <td
                    style={{ width: '2.5cm', minWidth: '2.5cm' }}
                    className="py-3 px-2 border-r border-slate-800 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 font-black text-amber-400 text-sm sm:text-base flex items-center justify-center shadow-md">
                        {row.label || row.key}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold tracking-tighter">
                        {row.description}
                      </span>
                    </div>
                  </td>

                  {/* Colonne 2 : Favoris (4 cm) */}
                  <td
                    style={{ width: '4cm', minWidth: '4cm' }}
                    className="py-3 px-2 border-r border-slate-800 text-center"
                  >
                    {row.bases.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.bases.map((num, bIdx) => (
                          <div
                            key={`base-${row.key}-${num}-${bIdx}`}
                            className="w-8 h-8 rounded-lg bg-[#059669] text-white font-black flex items-center justify-center text-center shadow-md border border-emerald-400/40 shrink-0 text-xs sm:text-sm"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-sm">—</span>
                    )}
                  </td>

                  {/* Colonne 3 : Outsiders (4 cm) */}
                  <td
                    style={{ width: '4cm', minWidth: '4cm' }}
                    className="py-3 px-2 border-r border-slate-800 text-center"
                  >
                    {row.chances.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.chances.map((num, cIdx) => (
                          <div
                            key={`chance-${row.key}-${num}-${cIdx}`}
                            className="w-8 h-8 rounded-lg bg-[#f59e0b] text-slate-950 font-black flex items-center justify-center text-center shadow-md border border-amber-300/60 shrink-0 text-xs sm:text-sm"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-sm">—</span>
                    )}
                  </td>

                  {/* Colonne 4 : Tocards (4 cm) */}
                  <td
                    style={{ width: '4cm', minWidth: '4cm' }}
                    className="py-3 px-2 border-r border-slate-800 text-center"
                  >
                    {row.tocards.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.tocards.map((num, tIdx) => (
                          <div
                            key={`tocard-${row.key}-${num}-${tIdx}`}
                            className="w-8 h-8 rounded-lg bg-[#f97316] text-white font-black flex items-center justify-center text-center shadow-md border border-orange-400/50 shrink-0 text-xs sm:text-sm"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-sm">—</span>
                    )}
                  </td>

                  {/* Colonne 5 : Surprises (4 cm) - Uniquement les 4 numéros de surprises triés par cote croissante */}
                  <td
                    style={{ width: '4cm', minWidth: '4cm' }}
                    className="py-3 px-2 text-center"
                  >
                    {(row.surprises && row.surprises.length > 0) ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.surprises.map((num, sIdx) => (
                          <div
                            key={`surprise-${row.key}-${num}-${sIdx}`}
                            className="w-8 h-8 rounded-lg bg-[#9333ea] text-white border border-purple-400/60 font-black flex items-center justify-center text-center shadow-md shrink-0 text-xs sm:text-sm"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-sm">—</span>
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
