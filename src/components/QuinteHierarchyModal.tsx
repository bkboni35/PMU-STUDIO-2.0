import React from 'react';
import { X, Trophy, ShieldCheck, Flame, AlertOctagon, Star, Crown, Copy, Check, CheckCircle2 } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { HierarchieQuinteV38Banner } from './HierarchieQuinteV38Banner';
import { computeV38Hierarchy } from '../utils/v38Helper';

interface QuinteHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: CourseHippique | null;
  onSelectHorseForTicket: (numero: number) => void;
  selectedHorseNumbers: number[];
}

export const QuinteHierarchyModal: React.FC<QuinteHierarchyModalProps> = ({
  isOpen,
  onClose,
  course,
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
}) => {
  if (!isOpen || !course) return null;

  // Calcul du classement officiel de la HIÉRARCHIE QUINTÉ+ V38
  const { selectionV38 } = computeV38Hierarchy(course);
  
  const v38Horses = selectionV38.map((p, idx) => {
    const position = idx + 1;
    let statutV38 = 'Chance Régulière';
    let roleBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    let numBadgeClass = 'bg-slate-800 text-slate-200';

    if (position <= 2) { statutV38 = 'Base Solide'; roleBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'; numBadgeClass = 'bg-emerald-500 text-slate-950 font-black'; }
    else if (position <= 6) { statutV38 = 'Chance Sérieuse'; roleBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40'; numBadgeClass = 'bg-amber-500 text-slate-950 font-black'; }
    else if (position <= 9) { statutV38 = 'Tocard Spéculatif'; roleBadgeClass = 'bg-orange-500/20 text-orange-300 border-orange-500/40'; numBadgeClass = 'bg-orange-500 text-slate-950 font-black'; }
    else { statutV38 = 'Surprise'; roleBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40'; numBadgeClass = 'bg-purple-600 text-white font-bold'; }

    return {
      ...p,
      statutV38,
      roleBadgeClass,
      numBadgeClass,
      position,
      positionLabel: position === 1 ? '1er' : `${position}e`,
      hippoScore: p.hippoScore
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-1 sm:px-2 sm:pb-1 bg-slate-950/90 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-none sm:rounded-2xl border-2 border-amber-500/40 shadow-2xl w-full max-w-5xl h-screen sm:h-[calc(100vh-8px)] flex flex-col overflow-hidden mt-0">
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
             <Crown className="w-6 h-6 text-amber-400" />
             <span>HIÉRARCHIE QUINTÉ+ V38</span>
             {course.partants?.some(p => p.estNonPartant || p.statut === 'Non-partant') && (
               <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black tracking-wider uppercase shadow-sm animate-pulse border border-rose-300">
                 NP: {course.partants.filter(p => p.estNonPartant || p.statut === 'Non-partant').map(p => p.numero).join(', ')}
               </span>
             )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-amber-400">Modèle V38 Renforcé</h3>
            <p className="text-slate-300 text-sm">Classement d'élite officiel ordonné des 8 chevaux retenus après confrontation des 5 étapes du moteur d'analyse.</p>
          </div>
          
          <HierarchieQuinteV38Banner course={course} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {v38Horses.map((h, idx) => (
              <div key={`modal-v38-${h.numero}-${idx}`} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                 <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                   <span className={`px-2 py-1 rounded ${h.roleBadgeClass}`}>{h.positionLabel} · {h.statutV38}</span>
                   <span className="text-amber-400">{h.coteProbable}/1</span>
                 </div>
                 <div className="flex items-center gap-3 py-2">
                    <span className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-lg ${h.numBadgeClass}`}>{h.numero}</span>
                    <div>
                      <div className="font-bold text-white">{h.nom}</div>
                      <div className="text-[11px] text-slate-400">{h.driver}</div>
                    </div>
                 </div>
                 <button 
                  onClick={() => onSelectHorseForTicket(h.numero)}
                  className={`w-full py-2 rounded-lg text-xs font-black ${selectedHorseNumbers.includes(h.numero) ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                    {selectedHorseNumbers.includes(h.numero) ? 'Sélectionné' : 'Ajouter au ticket'}
                 </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
