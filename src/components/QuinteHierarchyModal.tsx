import React, { useState, useMemo } from 'react';
import { X, Crown, Sparkles, Table as TableIcon, LayoutGrid, Check } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { HierarchieQuinteV38Banner } from './HierarchieQuinteV38Banner';
import { computeV38Hierarchy, computeCarreMagique, getHorseGenyOdds, formatCote } from '../utils/v38Helper';
import { classerChevauxFormeEtPoints } from '../utils/turfCalculations';
import { CarreMagiqueView } from './CarreMagiqueView';

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
  const [activeTab, setActiveTab] = useState<'HIERARCHIE_V38' | 'CARRE_MAGIQUE'>('HIERARCHIE_V38');
  const [carreDisplayMode, setCarreDisplayMode] = useState<'GRID' | 'TABLE'>('GRID');

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

  // Calcul officiel du CARRÉ MAGIQUE selon la répartition par badge de couleur
  const carreMagiqueData = useMemo(() => {
    return computeCarreMagique(course);
  }, [course]);

  const carreTableRows = useMemo(() => {
    const col1Map = new Map(carreMagiqueData.col1Vert.map((h, idx) => [h.num, { h, idx }]));
    const col2Map = new Map(carreMagiqueData.col2Orange.map((h, idx) => [h.num, { h, idx }]));
    const col3Map = new Map(carreMagiqueData.col3Rouge.map((h, idx) => [h.num, { h, idx }]));

    return carreMagiqueData.allRankedSysteme74.map((item) => {
      let colonneLabel = 'Hors Carré';
      let colonneBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
      let numBadgeClass = 'bg-slate-800 border border-slate-600 text-slate-300 font-bold';
      let ligneLabel = '—';

      if (col1Map.has(item.num)) {
        const info = col1Map.get(item.num)!;
        colonneLabel = '🟢 En Forme';
        colonneBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
        numBadgeClass = 'bg-emerald-600 border-2 border-emerald-300 text-white font-black shadow-md shadow-emerald-950/60';
        ligneLabel = `Ligne ${info.idx + 1}`;
      } else if (col2Map.has(item.num)) {
        const info = col2Map.get(item.num)!;
        colonneLabel = '🟡 Forme Moyenne';
        colonneBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
        numBadgeClass = 'bg-amber-500 border-2 border-amber-200 text-slate-950 font-black shadow-md shadow-amber-950/60';
        ligneLabel = `Ligne ${info.idx + 1}`;
      } else if (col3Map.has(item.num)) {
        const info = col3Map.get(item.num)!;
        colonneLabel = '🔴 Méforme';
        colonneBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
        numBadgeClass = 'bg-rose-600 border-2 border-rose-300 text-white font-black shadow-md shadow-rose-950/60';
        ligneLabel = `Ligne ${info.idx + 1}`;
      }

      return {
        ...item,
        p: item.partant,
        rang: item.rangSysteme74,
        colonneLabel,
        colonneBadgeClass,
        numBadgeClass,
        ligneLabel,
      };
    });
  }, [carreMagiqueData]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-1 sm:px-2 sm:pb-1 bg-slate-950/90 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-none sm:rounded-2xl border-2 border-amber-500/40 shadow-2xl w-full max-w-5xl h-screen sm:h-[calc(100vh-8px)] flex flex-col overflow-hidden mt-0">
        {/* En-tête de la Modale avec Titre et Onglets Principaux */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 bg-slate-950">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>HIÉRARCHIE DU QUINTÉ+ &amp; SYSTÈME 74</span>
            </h2>
            {course.partants?.some((p) => p.estNonPartant || p.statut === 'Non-partant') && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black tracking-wider uppercase shadow-sm border border-rose-300">
                NP: {course.partants.filter((p) => p.estNonPartant || p.statut === 'Non-partant').map((p) => p.numero).join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Barre de navigation entre les 2 onglets */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setActiveTab('HIERARCHIE_V38')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'HIERARCHIE_V38'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>HIÉRARCHIE V38</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CARRE_MAGIQUE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'CARRE_MAGIQUE'
                    ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 text-slate-950 shadow-md'
                    : 'text-amber-300 hover:text-white hover:bg-amber-500/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>CARRÉ MAGIQUE</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Corps de la Modale */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'HIERARCHIE_V38' ? (
            /* ================= ONGLET 1 : HIÉRARCHIE V38 ================= */
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <span>👑</span> Modèle V38 Renforcé
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm">
                  Classement d'élite officiel ordonné des 8 chevaux retenus après confrontation des 5 étapes du moteur d'analyse.
                </p>
              </div>
              
              <HierarchieQuinteV38Banner course={course} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {v38Horses.map((h, idx) => (
                  <div key={`modal-v38-${h.numero}-${idx}`} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3 shadow-lg hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                      <span className={`px-2 py-0.5 rounded border text-[11px] ${h.roleBadgeClass}`}>{h.positionLabel} · {h.statutV38}</span>
                      <span className="text-amber-400 font-mono font-black">{formatCote(h.coteProbable)}</span>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <span className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-lg shrink-0 shadow-inner ${h.numBadgeClass}`}>
                        {h.numero}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{h.nom}</div>
                        <div className="text-[11px] text-slate-400 truncate">{h.driver || (h as any).jockey || 'N/A'}</div>
                      </div>
                    </div>

                    <button 
                      onClick={() => onSelectHorseForTicket(h.numero)}
                      className={`w-full py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                        selectedHorseNumbers.includes(h.numero) 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {selectedHorseNumbers.includes(h.numero) ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Sélectionné au ticket</span>
                        </>
                      ) : (
                        <span>Ajouter au ticket</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ================= ONGLET 2 : CARRÉ MAGIQUE (SYSTÈME 74) ================= */
            <div className="space-y-6 animate-fadeIn">
              {/* Barre de commutation Visuelle : Grille vs Tableau */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30">
                <div className="space-y-0.5">
                  <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                    <span>✨</span> CARRÉ MAGIQUE DU SYSTÈME 74
                  </h3>
                  <p className="text-xs text-slate-300">
                    Grille de 6 Lignes × 3 Colonnes ordonnée selon le Rang officiel dans le Système 74 (Score X = 73 + N° - Cote).
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCarreDisplayMode('GRID')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      carreDisplayMode === 'GRID'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Vue Grille (6x3)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarreDisplayMode('TABLE')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      carreDisplayMode === 'TABLE'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Vue Tableau Détaillé</span>
                  </button>
                </div>
              </div>

              {carreDisplayMode === 'GRID' ? (
                /* Vue 1 : Grille du Carré Magique 6x3 */
                <CarreMagiqueView
                  course={course}
                  onSelectHorse={onSelectHorseForTicket}
                  selectedHorseNumbers={selectedHorseNumbers}
                />
              ) : (
                /* Vue 2 : Tableau Tabulaire Détaillé du Système 74 */
                <div className="rounded-2xl border-2 border-slate-700 overflow-hidden bg-slate-950 shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 font-black uppercase text-[11px] tracking-wider border-b border-slate-800">
                          <th className="py-2.5 px-3 text-center w-14">Rang 74</th>
                          <th className="py-2.5 px-3">Colonne Carré Magique</th>
                          <th className="py-2.5 px-3 text-center">Ligne</th>
                          <th className="py-2.5 px-3 text-center w-12">N°</th>
                          <th className="py-2.5 px-3">Cheval</th>
                          <th className="py-2.5 px-3">Driver / Jockey</th>
                          <th className="py-2.5 px-3 text-center">Cote</th>
                          <th className="py-2.5 px-3 text-center">Score X</th>
                          <th className="py-2.5 px-3 text-center">Action Ticket</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {carreTableRows.map((item) => {
                          const isSelected = selectedHorseNumbers.includes(item.num);
                          return (
                            <tr
                              key={`carre-tab-${item.num}`}
                              className={`hover:bg-slate-900/60 transition-colors ${
                                isSelected ? 'bg-emerald-950/20' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-black text-sky-400">
                                {item.rang}e
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${item.colonneBadgeClass}`}>
                                  {item.colonneLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-300">
                                {item.ligneLabel}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-flex min-w-8 h-8 px-1 rounded-xl items-center justify-center font-black text-xs ${item.numBadgeClass}`}>
                                  {item.num}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                {item.p.nom}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {item.p.driver || (item.p as any).jockey || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">
                                {formatCote(item.cote)}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-black text-cyan-300">
                                {item.scoreX.toFixed(1).replace('.', ',')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => onSelectHorseForTicket(item.num)}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                  }`}
                                >
                                  {isSelected ? '✓ Au ticket' : '+ Ticket'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
