import React, { useMemo } from 'react';
import { Filter } from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { getHorseGenyOdds } from '../utils/v38Helper';
import { useSysteme74 } from '../utils/systeme74Store';

interface Systeme74ThresholdControlBarProps {
  course?: CourseHippique;
  partants?: Partant[];
  title?: string;
  className?: string;
}

export const Systeme74ThresholdControlBar: React.FC<Systeme74ThresholdControlBarProps> = ({
  course,
  partants: partantsProp,
  title,
  className = '',
}) => {
  const { threshold, mode, setThreshold, setMode } = useSysteme74();

  // Liste des partants à analyser
  const partantsList = useMemo(() => {
    if (partantsProp && Array.isArray(partantsProp)) return partantsProp;
    if (course && Array.isArray(course.partants)) return course.partants;
    return [];
  }, [partantsProp, course]);

  // Statistiques en direct sur les chevaux retenus / exclus par le seuil Diff(X)
  const partantsStats = useMemo(() => {
    let passCount = 0;
    let failCount = 0;

    partantsList.forEach((p) => {
      if (p.estNonPartant) return;
      const num = Number(p.numero);
      const cote = getHorseGenyOdds(p);
      const scoreX = (73 + num) - cote;
      if (scoreX >= threshold) {
        passCount++;
      } else {
        failCount++;
      }
    });

    return { passCount, failCount, total: passCount + failCount };
  }, [partantsList, threshold]);

  return (
    <div
      className={`w-full p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-xl space-y-3 ${className}`}
    >
      {/* Ligne 1 : Titre / Filtre + Modes (Masquer / Griser / OFF) + Badges d'effectif */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
        {/* Titre & Mode du Filtre */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black text-xs flex items-center gap-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5" />
            <span>{title || `Filtre Diff X ≥ ${threshold} pts`}</span>
          </span>

          {/* Sélecteur de Mode (Masquer / Griser / OFF) */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('EXCLUDE')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${
                mode === 'EXCLUDE'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`Exclure totalement les chevaux dont Score(X) < ${threshold}`}
            >
              ✓ ACTIF (Masquer &lt; {threshold})
            </button>
            <button
              type="button"
              onClick={() => setMode('GREY')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${
                mode === 'GREY'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Afficher les chevaux < seuil en grisé"
            >
              👁️ GRISER
            </button>
            <button
              type="button"
              onClick={() => setMode('OFF')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${
                mode === 'OFF'
                  ? 'bg-rose-500 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Désactiver le filtre de seuil pour tous les tableaux"
            >
              OFF
            </button>
          </div>
        </div>

        {/* Badges d'Effectif Réactif */}
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-xs">
            ✓ Retenus : <strong className="font-mono font-black text-white">{partantsStats.passCount}</strong> N°
          </span>
          {partantsStats.failCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-xs">
              ⚠️ Exclus (&lt; {threshold}) : <strong className="font-mono font-black text-white">{partantsStats.failCount}</strong> N°
            </span>
          )}
        </div>
      </div>

      {/* Ligne 2 : Contrôles de Réglage de la Valeur du Seuil (Presets + Slider + Boutons +/-) */}
      <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-slate-800/80">
        <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
          CHANGER LA VALEUR DU SEUIL DIFF(X) :
        </span>

        {/* Presets rapides cliquables */}
        <div className="flex items-center gap-1 flex-wrap">
          {[-10, 0, 10, 15, 20, 25, 30, 40, 50].map((val) => (
            <button
              key={`preset-${val}`}
              type="button"
              onClick={() => {
                setThreshold(val);
                if (mode === 'OFF') setMode('EXCLUDE');
              }}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-black cursor-pointer transition-all border ${
                threshold === val
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md scale-105'
                  : val < 0
                  ? 'bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 border-purple-700/60'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              ≥ {val}
            </button>
          ))}
        </div>

        {/* Slider & Incrément/Décrément pas à pas */}
        <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 ml-auto">
          <button
            type="button"
            onClick={() => setThreshold(Math.max(-50, threshold - 1))}
            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center border border-slate-700 cursor-pointer"
            title="Diminuer le seuil de 1 pt"
          >
            -
          </button>
          <input
            type="range"
            min="-30"
            max="70"
            step="1"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-24 sm:w-32 accent-emerald-500 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setThreshold(Math.min(80, threshold + 1))}
            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center border border-slate-700 cursor-pointer"
            title="Augmenter le seuil de 1 pt"
          >
            +
          </button>
          <span className="text-xs font-mono font-black text-emerald-300 min-w-[38px] text-right">
            {threshold} pts
          </span>
        </div>
      </div>
    </div>
  );
};
