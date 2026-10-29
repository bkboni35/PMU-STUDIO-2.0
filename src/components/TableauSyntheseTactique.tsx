import React from 'react';
import { CourseHippique } from '../types/turf';
import { computeTableauSyntheseTactique, TacticalGroupItem, formatCote } from '../utils/v38Helper';
import { useSysteme74 } from '../utils/systeme74Store';

interface TableauSyntheseTactiqueProps {
  course: CourseHippique;
  filterMinScoreX?: boolean;
  minScoreXThreshold?: number;
}

export const TableauSyntheseTactique: React.FC<TableauSyntheseTactiqueProps> = ({
  course,
  filterMinScoreX: filterMinScoreXProp,
  minScoreXThreshold: minScoreXThresholdProp,
}) => {
  const { threshold: sharedThreshold, mode: sharedMode } = useSysteme74();
  const filterMinScoreX = filterMinScoreXProp !== undefined ? filterMinScoreXProp : (sharedMode === 'EXCLUDE');
  const minScoreXThreshold = minScoreXThresholdProp !== undefined ? minScoreXThresholdProp : sharedThreshold;

  const synthese = computeTableauSyntheseTactique(course.partants || [], {
    filterMinScoreX,
    minScoreXThreshold,
  });

  const renderHorseCard = (
    item: TacticalGroupItem,
    badgeTheme: string,
    categoryLabel: string
  ) => {
    const p = item.p;
    const cat = item.classified?.categorie;
    let perfEmoji = '';
    let perfLabel = '';
    let perfClass = '';
    if (cat === 'EN_FORME') { perfEmoji = '🟢'; perfLabel = 'EN FORME'; perfClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'; }
    else if (cat === 'FORME_MOYENNE') { perfEmoji = '🟡'; perfLabel = 'MOYENNE'; perfClass = 'bg-amber-950/80 text-amber-300 border-amber-500/40'; }
    else if (cat === 'CAPABLE_EXPLOIT') { perfEmoji = '⚡'; perfLabel = 'EXPLOIT'; perfClass = 'bg-cyan-950/80 text-cyan-300 border-cyan-400/50'; }
    else if (cat === 'MEFORME') { perfEmoji = '🔴'; perfLabel = 'MÉFORME'; perfClass = 'bg-rose-950/80 text-rose-300 border-rose-500/40'; }

    const formattedCote = formatCote(item.cote);
    const formattedScore = item.scoreX.toFixed(1).replace('.', ',');

    return (
      <div 
        key={`synt-tact-${item.num}`}
        className="flex items-center p-2 rounded-xl transition-all shadow-md group bg-slate-900/90 border border-slate-700/80 hover:border-slate-500"
      >
        {/* Badge N° */}
        <div className={`min-w-8 h-8 sm:min-w-9 sm:h-9 px-1 rounded-lg flex items-center justify-center font-black border-2 shadow-inner shrink-0 ${badgeTheme}`}>
          <span className="text-xs sm:text-sm leading-none text-white drop-shadow">
            {item.num}
          </span>
        </div>

        {/* Bloc vertical à droite du Badge N° (Distance ~7px) */}
        <div className="flex flex-col justify-center min-w-0 ml-[7px] flex-1">
          {/* Ligne 1 : Score X & Côte (Score placé AVANT la Côte, Distance = 0,5 cm ~19px) */}
          <div className="flex items-center shrink-0">
            {/* Valeur du Score X (placé en premier) */}
            <span className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-cyan-500/40 font-mono font-black text-cyan-300 text-[11px] sm:text-xs shadow-inner shrink-0">
              {formattedScore}
            </span>

            {/* Distance Score -> Côte : 1 cm (`ml-[1cm]`) */}
            <span className="ml-[1cm] px-1.5 py-0.5 rounded bg-slate-800/90 border border-amber-500/40 font-mono font-black text-amber-300 text-[11px] sm:text-xs shadow-inner shrink-0">
              {formattedCote}
            </span>
          </div>

          {/* Ligne 2 : Nom du Cheval / Driver sous la côte et le score + Badge Forme devant le nom + Badge Somme des Rangs */}
          <div className="flex items-center justify-between gap-1.5 min-w-0 mt-1 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {perfEmoji && (
                <span className="text-xs shrink-0 leading-none" title={`Forme: ${perfLabel}`}>
                  {perfEmoji}
                </span>
              )}
              <span className="font-bold text-white text-[11px] truncate group-hover:text-cyan-300 transition-colors">
                {p.nom ? p.nom : (p.driver || (p as any).jockey || 'N/A')}
              </span>
            </div>
            {item.sommeRangs !== undefined && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0" title={`Rang Score(X): ${item.rangScoreX}e + Rang Perf: ${item.rangPerf}e = ${item.sommeRangs}`}>
                R:{item.sommeRangs} <span className="text-[8px] text-slate-400">({item.rangScoreX}+{item.rangPerf})</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mt-4 p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border-2 border-cyan-500/40 shadow-2xl space-y-3">
      <div className="relative border-b border-slate-800 pb-2.5 text-center flex flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg sm:text-xl">📊</span>
          <h4 className="text-white font-black uppercase text-xs sm:text-sm tracking-wider">
            TABLEAU DE SYNTHÈSE TACTIQUE
          </h4>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wide">
          Système 74 Diff X ≥ {minScoreXThreshold}
        </span>
      </div>

      {/* Alignement 4 colonnes en paysage / écran large */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. BASE */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5 px-1">
            <span className="font-black text-emerald-400 uppercase text-[11px] sm:text-xs tracking-wider flex items-center justify-center gap-1 truncate w-full text-center">
              <span>🏆</span> BASE <span className="text-[10px] text-emerald-300/80 font-normal">(2 1ers Sél. 1)</span>
            </span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold shrink-0 ml-1">
              {synthese.base.length} {synthese.base.length > 1 ? 'chevaux' : 'cheval'}
            </span>
          </div>
          <div className="space-y-1.5">
            {synthese.base.length > 0 ? (
              synthese.base.map((item) => renderHorseCard(item, 'bg-emerald-600 border-emerald-400', 'BASE'))
            ) : (
              <div className="text-slate-500 text-[11px] italic text-center py-2">Aucun cheval</div>
            )}
          </div>
        </div>

        {/* 2. CHANCE RÉGULIÈRE (VECTEUR 1 : N° 1 à 9 / VECTEUR 2 : N° 10+) */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-cyan-500/40 space-y-2.5">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1.5 px-1">
            <span className="font-black text-cyan-400 uppercase text-[11px] sm:text-xs tracking-wider flex items-center justify-center gap-1 truncate w-full text-center">
              <span>🟢</span> CHANCE RÉGULIÈRE
            </span>
            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold shrink-0 ml-1">
              {synthese.chanceReguliere.length} {synthese.chanceReguliere.length > 1 ? 'chevaux' : 'cheval'}
            </span>
          </div>

          {synthese.chanceReguliere.length > 0 ? (
            <div className="space-y-2.5">
              {/* VECTEUR 1 : les numéros de la tranche 1 à 9 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 shadow-sm">
                  <span className="text-[10px] sm:text-[11px] font-black text-cyan-300 uppercase tracking-wide flex items-center gap-1">
                    <span>🔹</span> VECTEUR 1 <span className="text-[9px] text-cyan-400/80 font-normal lowercase">(N° 1 à 9 • Tri Σ Rangs)</span>
                  </span>
                  <span className="text-[9px] bg-cyan-500/30 text-cyan-200 px-1.5 py-0.2 rounded font-extrabold">
                    {synthese.chanceReguliereVecteur1.length}
                  </span>
                </div>
                {synthese.chanceReguliereVecteur1.length > 0 ? (
                  <div className="space-y-1.5">
                    {synthese.chanceReguliereVecteur1.map((item) =>
                      renderHorseCard(
                        item,
                        'bg-cyan-600 border-cyan-400',
                        'CHANCE RÉGULIÈRE - VECTEUR 1'
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-[10px] italic text-center py-1 bg-slate-950/40 rounded border border-slate-800/60">
                    Aucun N° (1 à 9)
                  </div>
                )}
              </div>

              {/* VECTEUR 2 : les numéros de la tranche 10 et + */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2 py-1 rounded-md bg-indigo-950/80 border border-indigo-500/40 shadow-sm">
                  <span className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-wide flex items-center gap-1">
                    <span>🔷</span> VECTEUR 2 <span className="text-[9px] text-indigo-400/80 font-normal lowercase">(N° 10+ • Tri Σ Rangs)</span>
                  </span>
                  <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded font-extrabold">
                    {synthese.chanceReguliereVecteur2.length}
                  </span>
                </div>
                {synthese.chanceReguliereVecteur2.length > 0 ? (
                  <div className="space-y-1.5">
                    {synthese.chanceReguliereVecteur2.map((item) =>
                      renderHorseCard(
                        item,
                        'bg-indigo-600 border-indigo-400',
                        'CHANCE RÉGULIÈRE - VECTEUR 2'
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-[10px] italic text-center py-1 bg-slate-950/40 rounded border border-slate-800/60">
                    Aucun N° (10 et +)
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-[11px] italic text-center py-2">Aucun cheval</div>
          )}
        </div>

        {/* 3. OUTSIDERS */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/40 space-y-2">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5 px-1">
            <span className="font-black text-amber-400 uppercase text-[11px] sm:text-xs tracking-wider flex items-center justify-center gap-1 truncate w-full text-center">
              <span>⚡</span> OUTSIDERS <span className="text-[10px] text-amber-300/80 font-normal lowercase">(Tri Σ Rangs)</span>
            </span>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold shrink-0 ml-1">
              {synthese.outsidersSeduisants.length} {synthese.outsidersSeduisants.length > 1 ? 'chevaux' : 'cheval'}
            </span>
          </div>
          <div className="space-y-1.5">
            {synthese.outsidersSeduisants.length > 0 ? (
              synthese.outsidersSeduisants.map((item) => renderHorseCard(item, 'bg-amber-600 border-amber-400', 'OUTSIDER'))
            ) : (
              <div className="text-slate-500 text-[11px] italic text-center py-2">Aucun outsider</div>
            )}
          </div>
        </div>

        {/* 4. À SUIVRE */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-purple-500/40 space-y-2">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5 px-1">
            <span className="font-black text-purple-400 uppercase text-[11px] sm:text-xs tracking-wider flex items-center justify-center gap-1 truncate w-full text-center">
              <span>🔍</span> À SUIVRE <span className="text-[10px] text-purple-300/80 font-normal lowercase">(Tri Perf ↗)</span>
            </span>
            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold shrink-0 ml-1">
              {synthese.aSuivre.length} {synthese.aSuivre.length > 1 ? 'chevaux' : 'cheval'}
            </span>
          </div>
          <div className="space-y-1.5">
            {synthese.aSuivre.length > 0 ? (
              synthese.aSuivre.map((item) => renderHorseCard(item, 'bg-slate-700 border-slate-500', 'À SUIVRE'))
            ) : (
              <div className="text-slate-500 text-[11px] italic text-center py-2">Aucun cheval</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
