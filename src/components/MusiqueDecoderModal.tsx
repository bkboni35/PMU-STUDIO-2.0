import React from 'react';
import { X, HelpCircle, CheckCircle, Info } from 'lucide-react';
import { decrypterMusique } from '../utils/turfCalculations';

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-2 sm:px-2 sm:pb-2 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-none sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 mt-0 sm:mt-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Décryptage de la Musique
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
          <p className="font-bold text-slate-300">Rappel du lexique PMU / Geny / Paris-Turf :</p>
          <p><strong className="text-amber-300">a</strong> = attelé, <strong className="text-amber-300">m</strong> = monté, <strong className="text-amber-300">p</strong> = plat, <strong className="text-amber-300">h</strong> = haies, <strong className="text-amber-300">s</strong> = steeple</p>
          <p><strong className="text-rose-400">D</strong> = Disqualifié pour allure irrégulière (au galop), <strong className="text-amber-300">0</strong> = Non placé (au-delà de la 9e place)</p>
          <p><strong className="text-amber-300">D4</strong> = Déferré des 4 pieds, <strong className="text-amber-300">DP</strong> = Déferré des postérieurs, <strong className="text-amber-300">DA</strong> = Déferré des antérieurs</p>
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
