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
      <div className="rounded-xl border-2 border-white overflow-hidden shadow-lg flex justify-center">
        <div className="overflow-x-auto scrollbar-none w-full flex justify-center py-1">
          <table
            className="table-fixed border-collapse mx-auto border-2 border-white"
            style={{ width: 'auto' }}
          >
            <colgroup>
              <col style={{ width: '3.2cm', minWidth: '3.2cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
              <col style={{ width: '4cm', minWidth: '4cm' }} />
            </colgroup>
            <thead>
              <tr className="text-xs sm:text-sm font-black uppercase tracking-wider">
                {/* Catégorie Header */}
                <th
                  style={{ width: '3.2cm', minWidth: '3.2cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white text-[11px] sm:text-xs tracking-tight"
                >
                  CATEGORIE
                </th>
                {/* Favoris Header (4 cm) */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white text-[11px] sm:text-xs tracking-tight"
                >
                  FAVORIS
                </th>
                {/* Outsiders Header (4 cm) */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white text-[11px] sm:text-xs tracking-tight"
                >
                  OUTSIDERS
                </th>
                {/* Tocards Header (4 cm) */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white text-[11px] sm:text-xs tracking-tight"
                >
                  TOCARDS
                </th>
                {/* Surprises Header (4 cm) - Classés selon la Classification Officielle par Points de Performance */}
                <th
                  style={{ width: '4cm', minWidth: '4cm' }}
                  className="py-2.5 px-2 bg-[#1e293b] text-purple-300 font-black text-center text-[11px] sm:text-xs tracking-tight border-2 border-white"
                  title="Numéros classés selon la Classification Officielle par Points de Performance (Score 3 Musiques ascendant)"
                >
                  SURPRISES
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#0f172a] text-slate-200">
              {grid.rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-900/60 transition-colors">
                  {/* Colonne 1 : Catégorie (Affichage dynamique : CA, CB, CC en plat ou A, B, C) */}
                  <td
                    style={{ width: '3.2cm', minWidth: '3.2cm' }}
                    className="py-3 px-2 border-2 border-white text-center"
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
                    className="py-3 px-2 border-2 border-white text-center"
                  >
                    {row.bases.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.bases.map((num, bIdx) => (
                          <div
                            key={`base-${row.key}-${num}-${bIdx}`}
                            className="w-9 sm:w-10 h-7 rounded-md bg-[#059669] text-white font-mono font-black flex items-center justify-center text-center shadow-md border border-emerald-300/80 shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
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
                    className="py-3 px-2 border-2 border-white text-center"
                  >
                    {row.chances.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.chances.map((num, cIdx) => (
                          <div
                            key={`chance-${row.key}-${num}-${cIdx}`}
                            className="w-9 sm:w-10 h-7 rounded-md bg-[#f59e0b] text-slate-950 font-mono font-black flex items-center justify-center text-center shadow-md border border-amber-200 shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
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
                    className="py-3 px-2 border-2 border-white text-center"
                  >
                    {row.tocards.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.tocards.map((num, tIdx) => (
                          <div
                            key={`tocard-${row.key}-${num}-${tIdx}`}
                            className="w-9 sm:w-10 h-7 rounded-md bg-[#f97316] text-white font-mono font-black flex items-center justify-center text-center shadow-md border border-orange-300/80 shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-sm">—</span>
                    )}
                  </td>

                  {/* Colonne 5 : Surprises (4 cm) - Uniquement les 4 numéros de surprises triés par points de performance */}
                  <td
                    style={{ width: '4cm', minWidth: '4cm' }}
                    className="py-3 px-2 border-2 border-white text-center"
                  >
                    {(row.surprises && row.surprises.length > 0) ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.surprises.map((num, sIdx) => (
                          <div
                            key={`surprise-${row.key}-${num}-${sIdx}`}
                            className="w-9 sm:w-10 h-7 rounded-md bg-[#9333ea] text-white border border-purple-300/80 font-mono font-black flex items-center justify-center text-center shadow-md shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
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

              {/* Bande orange de séparation entre les deux tableaux (épaisseur 0,70 cm) */}
              {grid.formRows && grid.formRows.length > 0 && (
                <tr key="orange-separator-band" style={{ height: '0.70cm' }} className="border-2 border-white">
                  <td
                    colSpan={5}
                    style={{ height: '0.70cm' }}
                    className="py-0 px-4 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-widest text-center shadow-lg border-2 border-white"
                  >
                    <div className="flex items-center justify-center gap-3 h-full">
                      <span className="h-0.5 w-10 sm:w-20 bg-slate-950/40 rounded-full inline-block"></span>
                      <span className="drop-shadow-sm">CLASSIFICATION PAR FORME DE FORMULE</span>
                      <span className="h-0.5 w-10 sm:w-20 bg-slate-950/40 rounded-full inline-block"></span>
                    </div>
                  </td>
                </tr>
              )}

              {/* 4 Lignes supplémentaires de Classification par Forme */}
              {grid.formRows && grid.formRows.length > 0 && grid.formRows.map((row) => {
                let categoryBadge = (
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[11px] sm:text-xs font-black uppercase text-amber-400 text-center leading-tight">
                      {row.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-tighter">
                      {row.description}
                    </span>
                  </div>
                );

                const rowKeyStr = String(row.key);
                if (rowKeyStr === 'EN_FORME') {
                  categoryBadge = (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[10px] sm:text-[11px] text-center leading-tight shadow-sm">
                        🟢 CHEVAUX EN FORME
                      </span>
                      <span className="text-[9px] text-emerald-400/80 font-bold tracking-tight">
                        (1e au 6e)
                      </span>
                    </div>
                  );
                } else if (rowKeyStr === 'FORME_MOYENNE') {
                  categoryBadge = (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[10px] sm:text-[11px] text-center leading-tight shadow-sm">
                        🟡 FORME MOYENNE
                      </span>
                      <span className="text-[9px] text-amber-400/80 font-bold tracking-tight">
                        (7e au 10e)
                      </span>
                    </div>
                  );
                } else if (rowKeyStr === 'CAPABLE_EXPLOIT') {
                  categoryBadge = (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="px-2 py-1 rounded-lg bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 font-black text-[10px] sm:text-[11px] text-center leading-tight shadow-sm">
                        ⚡ CAPABLE D'EXPLOIT
                      </span>
                      <span className="text-[9px] text-cyan-300/80 font-bold tracking-tight">
                        (Cote &lt; 8.0)
                      </span>
                    </div>
                  );
                } else if (rowKeyStr === 'MEFORME') {
                  categoryBadge = (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black text-[10px] sm:text-[11px] text-center leading-tight shadow-sm">
                        🔴 MÉFORME
                      </span>
                      <span className="text-[9px] text-rose-400/80 font-bold tracking-tight">
                        (11e et +)
                      </span>
                    </div>
                  );
                }

                return (
                  <tr key={`form-${row.key}`} className="hover:bg-slate-900/60 transition-colors">
                    {/* Colonne 1 : Catégorie Forme */}
                    <td
                      style={{ width: '3.2cm', minWidth: '3.2cm' }}
                      className="py-3 px-1.5 border-2 border-white text-center bg-slate-950/40"
                    >
                      {categoryBadge}
                    </td>

                    {/* Colonne 2 : Favoris */}
                    <td
                      style={{ width: '4cm', minWidth: '4cm' }}
                      className="py-3 px-2 border-2 border-white text-center"
                    >
                      {row.bases.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {row.bases.map((num, bIdx) => (
                            <div
                              key={`form-base-${row.key}-${num}-${bIdx}`}
                              className="w-9 sm:w-10 h-7 rounded-md bg-[#059669] text-white font-mono font-black flex items-center justify-center text-center shadow-md border border-emerald-300/80 shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-bold text-sm">—</span>
                      )}
                    </td>

                    {/* Colonne 3 : Outsiders */}
                    <td
                      style={{ width: '4cm', minWidth: '4cm' }}
                      className="py-3 px-2 border-2 border-white text-center"
                    >
                      {row.chances.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {row.chances.map((num, cIdx) => (
                            <div
                              key={`form-chance-${row.key}-${num}-${cIdx}`}
                              className="w-9 sm:w-10 h-7 rounded-md bg-[#d97706] text-white font-mono font-black flex items-center justify-center text-center shadow-md border border-amber-300/80 shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-bold text-sm">—</span>
                      )}
                    </td>

                    {/* Colonne 4 : Tocards */}
                    <td
                      style={{ width: '4cm', minWidth: '4cm' }}
                      className="py-3 px-2 border-2 border-white text-center"
                    >
                      {row.tocards.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {row.tocards.map((num, tIdx) => (
                            <div
                              key={`form-tocard-${row.key}-${num}-${tIdx}`}
                              className="w-9 sm:w-10 h-7 rounded-md bg-[#f97316] text-white font-mono font-black flex items-center justify-center text-center shadow-md border border-orange-300/80 shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-bold text-sm">—</span>
                      )}
                    </td>

                    {/* Colonne 5 : Surprises */}
                    <td
                      style={{ width: '4cm', minWidth: '4cm' }}
                      className="py-3 px-2 border-2 border-white text-center"
                    >
                      {(row.surprises && row.surprises.length > 0) ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {row.surprises.map((num, sIdx) => (
                            <div
                              key={`form-surprise-${row.key}-${num}-${sIdx}`}
                              className="w-9 sm:w-10 h-7 rounded-md bg-[#9333ea] text-white border border-purple-300/80 font-mono font-black flex items-center justify-center text-center shadow-md shrink-0 text-xs sm:text-sm transition-transform hover:scale-105"
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
