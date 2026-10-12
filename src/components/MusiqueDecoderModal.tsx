import React from 'react';
import { X, HelpCircle, CheckCircle, Info, Calculator, Award } from 'lucide-react';
import { decrypterMusique, calculerPerformance3Musiques } from '../utils/turfCalculations';

interface MusiqueDecoderModalProps {
  isOpen: boolean;
  onClose: () => void;
  horseName: string;
  musique: string;
}

export const MusiqueDecoderModal: React.FC<MusiqueDecoderModalProps> = ({
  isOpen,
  onClose,
  horseName,
  musique,
}) => {
  if (!isOpen) return null;

  const details = decrypterMusique(musique);
  const perf3 = calculerPerformance3Musiques(musique);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-0 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-b-2 border-x-2 border-amber-500/50 rounded-none sm:rounded-b-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 mt-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Décryptage & Performance Musique
              </h3>
              <p className="text-xs text-slate-400">
                Cheval : <strong className="text-amber-400">{horseName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Musique raw display */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Musique officielle :</span>
          <span className="font-mono text-sm font-bold text-amber-300">
            {musique}
          </span>
        </div>

        {/* Evaluation 3 Dernières Musiques (Règle des 3 courses) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Score Performance (Sum 3 Musiques)
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-mono border ${perf3.badgeColorClass}`}>
              {perf3.totalPoints} Points ({perf3.appreciation})
            </span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span>Formule de calcul :</span>
              <strong className="text-amber-300">{perf3.formulaCalculation}</strong>
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-1 italic">
              ⭐ Règle : Les chevaux ayant le <strong>plus petit total</strong> sont les meilleurs ! (Ex: 1a 1a 1a = 3 pts).
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono">
            {perf3.details.map((d, i) => (
              <div key={i} className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Course {i + 1}</span>
                <span className="text-amber-400 font-bold text-sm block">{d.token}</span>
                <span className="text-emerald-400 font-black text-xs block">{d.points} pt{d.points > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-step breakdown */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Détail des dernières sorties (de la plus récente à la plus ancienne) :
          </span>
          <div className="space-y-1.5">
            {details.map((exp, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-md bg-slate-800 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span>{exp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend of Turf codes */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 space-y-1 leading-relaxed">
          <p className="font-bold text-slate-300">Rappel de la cotation des points de performance :</p>
          <p>• Positions 1er à 9e = Valeur numérique (1 pt pour 1er, 5 pts pour 5e, 8 pts pour 8e, etc.)</p>
          <p>• Disqualifiés (<strong className="text-rose-400">D</strong>, Da, Dm, Dp...), non placés (<strong className="text-amber-300">0</strong>, 0a, 0m, 0p, 0h, 0s), incidents (<strong className="text-purple-400">Th, Ah, Ts, As</strong>) et rangs &gt; 9e = <strong className="text-amber-300">10 points</strong> par course.</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

