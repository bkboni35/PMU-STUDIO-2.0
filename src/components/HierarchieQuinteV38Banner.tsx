import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { computeV38Hierarchy } from '../utils/v38Helper';

interface HierarchieQuinteV38BannerProps {
  course: CourseHippique;
  className?: string;
}

export const HierarchieQuinteV38Banner: React.FC<HierarchieQuinteV38BannerProps> = ({
  course,
  className = '',
}) => {
  const { partants = [] } = course;

  // Détection des non-partants
  const nonPartantsNums = partants
    .filter(p => p.estNonPartant || p.statut === 'Non-partant')
    .map(p => p.numero);

  // Calcul du classement officiel des chevaux selon la nouvelle dénomination :
  const { favoris = [], outsiders: outsidersList = [], tocardsSpeculatifs = [], surprises: surprisesList = [], delaisses = [] } = computeV38Hierarchy(course);

  // 1. FAVORIS : 3 N° (1er - 2e - 3e N°)
  const favorisNums = favoris.map(p => p.numero);

  // 2. OUTSIDERS : 3 N° (4e - 5e - 6e N°)
  const outsidersNums = outsidersList.map(p => p.numero);

  // 3. TOCARDS : 3 N° (7e - 8e - 9e N°)
  const tocardsNums = tocardsSpeculatifs.map(p => p.numero);

  // 4. SURPRISES : 4 N° (10e - 11e N° + 2 plus grands numéros des délaissés)
  const surprisesNums = surprisesList.map(p => p.numero);

  // 5. DÉLAISSÉS : tous autres numéros classés du plus grand numéro au plus petit
  const delaissesNums = delaisses.map(p => p.numero);

  // Rendu d'un cheval avec son numéro, sa cote et une flèche de variation (verte vers le bas si baisse, rouge vers le haut si hausse)
  const renderHorseItem = (num: number, theme: 'emerald' | 'sky' | 'yellow' | 'orange' | 'purple' | 'rose', uniqueKey: string) => {
    const partant = partants.find((p) => Number(p.numero) === Number(num));
    const cote = partant?.coteProbable;
    const evolution = partant?.evolutionCote;
    const prevCote = partant?.cotePrecedente;

    let isBaisse = evolution === 'baisse';
    let isHausse = evolution === 'hausse';

    if (!evolution && cote !== undefined && prevCote !== undefined) {
      if (Number(cote) < Number(prevCote)) isBaisse = true;
      if (Number(cote) > Number(prevCote)) isHausse = true;
    }

    const themeStyles = {
      emerald: {
        numBg: 'bg-emerald-500 text-slate-950 border-emerald-400 font-black',
        text: 'text-emerald-300',
      },
      sky: {
        numBg: 'bg-sky-500 text-slate-950 border-sky-400 font-black',
        text: 'text-sky-300',
      },
      yellow: {
        numBg: 'bg-yellow-400 text-slate-950 border-yellow-300 font-black',
        text: 'text-yellow-300',
      },
      orange: {
        numBg: 'bg-orange-500 text-slate-950 border-orange-400 font-black',
        text: 'text-orange-300',
      },
      purple: {
        numBg: 'bg-purple-500 text-white border-purple-400 font-black',
        text: 'text-purple-300',
      },
      rose: {
        numBg: 'bg-rose-500 text-white border-rose-400 font-black',
        text: 'text-rose-300',
      },
    }[theme];

    return (
      <div key={uniqueKey} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-slate-950/90 border border-slate-800 shadow-xs shrink-0">
        {/* Numéro du cheval */}
        <span className={`px-2 py-0.2 rounded-md font-mono text-xs sm:text-sm font-black border shadow-xs ${themeStyles.numBg}`}>
          {num}
        </span>

        {/* Cote & Flèche d'indication */}
        {cote !== undefined && cote > 0 ? (
          <div className="flex items-center gap-1 font-mono text-xs font-bold">
            <span className={`text-[11px] font-black ${themeStyles.text}`}>
              {cote}/1
            </span>

            {/* Flèche verte dirigée vers le bas pour les cotes qui baissent */}
            {isBaisse && (
              <span className="inline-flex items-center text-emerald-400 font-black bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/40" title="Cote en baisse (argent frais)">
                <ArrowDown className="w-3 h-3 stroke-[3]" />
              </span>
            )}

            {/* Flèche rouge dirigée vers le haut pour les cotes qui montent */}
            {isHausse && (
              <span className="inline-flex items-center text-rose-400 font-black bg-rose-950/80 px-1 py-0.5 rounded border border-rose-500/40" title="Cote en hausse (délaissé)">
                <ArrowUp className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 font-mono">—</span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`rounded-xl bg-gradient-to-r from-slate-950 via-[#0a101d] to-slate-950 border-2 border-amber-500/80 p-2 sm:p-2.5 shadow-2xl transition-all overflow-x-auto w-full ${className}`}
    >
      <div className="flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2.5 text-xs font-black whitespace-nowrap w-full print:flex-nowrap print:whitespace-nowrap print:text-[10px]">
        {/* Titre QUINTE + V38 : avec mention NP si non partant */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-amber-400 font-black tracking-wider uppercase text-[11px] sm:text-xs">
            QUINTE + V38 :
          </span>
          {nonPartantsNums.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-md font-mono text-[14px] font-bold bg-rose-500 text-white border border-rose-300 shadow-sm animate-pulse tracking-wide"
              title="Cheval déclaré non partant"
            >
              NP : {nonPartantsNums.join(', ')}
            </span>
          )}
        </div>

        {/* FAVORIS : 3 N° */}
        <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40">
          <span className="text-emerald-400 font-extrabold uppercase text-[10px] sm:text-[11px]">FAVORIS :</span>
          <div className="flex items-center gap-1.5">
            {favorisNums.map((num, idx) => (
              <React.Fragment key={`favori-frag-${num}-${idx}`}>
                {idx > 0 && <span className="text-emerald-500/60 font-bold text-[10px]">·</span>}
                {renderHorseItem(num, 'emerald', `favori-item-${num}-${idx}`)}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* OUTSIDERS : 3 N° */}
        {outsidersNums && outsidersNums.length > 0 && (
          <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg bg-yellow-950/60 border border-yellow-500/40">
            <span className="text-yellow-400 font-extrabold uppercase text-[10px] sm:text-[11px]">OUTSIDERS :</span>
            <div className="flex items-center gap-1 font-mono font-black text-xs">
              {outsidersNums.map((num, idx) => (
                <React.Fragment key={`outsider-frag-${num}-${idx}`}>
                  {idx > 0 && <span className="text-yellow-500/60 font-bold text-[10px]">·</span>}
                  {renderHorseItem(num, 'yellow', `outsider-item-${num}-${idx}`)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* TOCARDS : 3 N° */}
        {tocardsNums && tocardsNums.length > 0 && (
          <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-lg bg-orange-950/60 border border-orange-500/40">
            <span className="text-orange-400 font-extrabold uppercase text-[10px]">TOCARDS :</span>
            <div className="flex items-center gap-1 font-mono font-black text-xs">
              {tocardsNums.map((num, idx) => (
                <React.Fragment key={`tocard-frag-${num}-${idx}`}>
                  {idx > 0 && <span className="text-orange-500/60 font-bold text-[10px]">·</span>}
                  {renderHorseItem(num, 'orange', `tocard-item-${num}-${idx}`)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* SURPRISES : 4 N° */}
        {surprisesNums && surprisesNums.length > 0 && (
          <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-lg bg-rose-950/60 border border-rose-500/40">
            <span className="text-rose-400 font-extrabold uppercase text-[10px]">SURPRISES :</span>
            <div className="flex items-center gap-1 font-mono font-black text-xs">
              {surprisesNums.map((num, idx) => (
                <React.Fragment key={`surprise-frag-${num}-${idx}`}>
                  {idx > 0 && <span className="text-rose-500/60 font-bold text-[10px]">·</span>}
                  {renderHorseItem(num, 'rose', `surprise-item-${num}-${idx}`)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* DÉLAISSÉS : classés du plus grand numéro au plus petit */}
        {delaissesNums && delaissesNums.length > 0 && (
          <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-lg bg-slate-900/80 border border-slate-700/60" title="Délaissés classés du plus grand numéro au plus petit">
            <span className="text-slate-400 font-bold uppercase text-[9px]">DÉLAISSÉS (↓ N°) :</span>
            <div className="flex items-center gap-1 font-mono font-bold text-[11px] text-slate-400">
              {delaissesNums.map((num, idx) => (
                <span key={`delaisse-item-${num}-${idx}`} className="px-1 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px]">
                  {num}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
