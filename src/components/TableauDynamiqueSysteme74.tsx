import React, { useState, useMemo } from 'react';
import { CourseHippique, Partant } from '../types/turf';
import { computeV38Hierarchy, getHorseGenyOdds } from '../utils/v38Helper';
import { classerChevauxFormeEtPoints } from '../utils/turfCalculations';
import { TableauCroiseDynamique } from './TableauCroiseDynamique';
import { TableScrollWrapper } from './TableScrollWrapper';
import { ShieldCheck, Sliders, Zap, Award, Star, Sparkles, Filter, BarChart3 } from 'lucide-react';
import { useSysteme74 } from '../utils/systeme74Store';
import { Systeme74ThresholdControlBar } from './Systeme74ThresholdControlBar';

interface TableauDynamiqueSysteme74Props {
  course: CourseHippique;
  onSelectHorse?: (numero: number) => void;
}

type ViewMode = 'CARDS' | 'MATRIX' | 'PIVOT';

export const TableauDynamiqueSysteme74: React.FC<TableauDynamiqueSysteme74Props> = ({
  course,
  onSelectHorse,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('CARDS');
  const { threshold: diffXThreshold, mode: diffXMode, isActive: diffXFilterActive } = useSysteme74();

  // Helper pour extraire les cotes
  const getOdds = (p: Partant): number => {
    return getHorseGenyOdds(p);
  };

  // Calcul du Score X
  const computeScoreX = (p: Partant): number => {
    const num = Number(p.numero);
    const cote = getOdds(p);
    return (73 + num) - cote;
  };

  // Calcul de la hiérarchie v38
  const v38 = useMemo(() => {
    return computeV38Hierarchy(course);
  }, [course]);

  // Forme des chevaux (🟢, 🟡, ⚡, 🔴)
  const formMap = useMemo(() => {
    const classification = classerChevauxFormeEtPoints(course.partants || []);
    const map = new Map<number, { icon: string; label: string; badgeClass: string }>();
    classification.allClassified.forEach((item) => {
      let icon = '🟢';
      let label = 'EN FORME';
      let badgeClass = 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50';
      if (item.categorie === 'FORME_MOYENNE') {
        icon = '🟡';
        label = 'MOYENNE';
        badgeClass = 'bg-amber-950/90 text-amber-300 border-amber-500/50';
      } else if (item.categorie === 'CAPABLE_EXPLOIT') {
        icon = '⚡';
        label = 'EXPLOIT';
        badgeClass = 'bg-cyan-950/90 text-cyan-300 border-cyan-400/50';
      } else if (item.categorie === 'MEFORME') {
        icon = '🔴';
        label = 'MÉFORME';
        badgeClass = 'bg-rose-950/90 text-rose-300 border-rose-500/50';
      }
      map.set(Number(item.partant.numero), { icon, label, badgeClass });
    });
    return map;
  }, [course.partants]);

  // Catégories Système 74
  const categories = useMemo(() => {
    return [
      {
        id: 'FAVORIS',
        title: 'FAVORIS (3 N°)',
        short: '1er à 3e',
        icon: Award,
        color: 'emerald',
        borderColor: 'border-emerald-500/40',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-950/80',
        partants: v38.favoris,
      },
      {
        id: 'OUTSIDERS',
        title: 'OUTSIDERS (3 N°)',
        short: '4e à 6e',
        icon: Star,
        color: 'amber',
        borderColor: 'border-amber-500/40',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-950/80',
        partants: v38.outsiders,
      },
      {
        id: 'TOCARDS',
        title: 'TOCARDS (4 N°)',
        short: '7e à 10e',
        icon: Zap,
        color: 'orange',
        borderColor: 'border-orange-500/40',
        textColor: 'text-orange-400',
        bgColor: 'bg-orange-950/80',
        partants: v38.tocardsSpeculatifs,
      },
      {
        id: 'SURPRISES',
        title: 'SURPRISES (4 N°)',
        short: '11e à 14e',
        icon: Sparkles,
        color: 'rose',
        borderColor: 'border-rose-500/40',
        textColor: 'text-rose-400',
        bgColor: 'bg-rose-950/80',
        partants: v38.surprises,
      },
    ];
  }, [v38]);

  // Groupes de numéros (Groupes de Colonnes)
  const columnGroups = useMemo(() => {
    return [
      {
        id: 'GROUPE_A',
        title: 'GROUPE A (1-6)',
        filter: (num: number) => num >= 1 && num <= 6,
        badgeClass: 'border-emerald-500/50 bg-slate-900/90 text-emerald-300',
      },
      {
        id: 'GROUPE_B',
        title: 'GROUPE B (7-10)',
        filter: (num: number) => num >= 7 && num <= 10,
        badgeClass: 'border-amber-500/50 bg-slate-900/90 text-amber-300',
      },
      {
        id: 'GROUPE_C',
        title: 'GROUPE C (11+)',
        filter: (num: number) => num >= 11,
        badgeClass: 'border-purple-500/50 bg-slate-900/90 text-purple-300',
      },
    ];
  }, []);

  // Dispatch de tous les chevaux de la sélection Système 74 dans leurs groupes respectifs
  const selectionMapByGroup = useMemo(() => {
    const allSelection = [
      ...v38.favoris.map((p) => ({ p, catId: 'FAVORIS' })),
      ...v38.outsiders.map((p) => ({ p, catId: 'OUTSIDERS' })),
      ...v38.tocardsSpeculatifs.map((p) => ({ p, catId: 'TOCARDS' })),
      ...v38.surprises.map((p) => ({ p, catId: 'SURPRISES' })),
    ];

    const groupA = allSelection.filter(({ p }) => Number(p.numero) >= 1 && Number(p.numero) <= 6);
    const groupB = allSelection.filter(({ p }) => Number(p.numero) >= 7 && Number(p.numero) <= 10);
    const groupC = allSelection.filter(({ p }) => Number(p.numero) >= 11);

    return {
      GROUPE_A: groupA,
      GROUPE_B: groupB,
      GROUPE_C: groupC,
    };
  }, [v38]);

  // Style de la Tuile (exactement comme sur l'image image_60e5ce4d.png)
  const renderHorseTile = (p: Partant, catId: string) => {
    const num = Number(p.numero);
    const scoreX = computeScoreX(p);
    const formInfo = formMap.get(num);

    const passThreshold = diffXMode === 'OFF' || scoreX >= diffXThreshold;

    // Si le mode est EXCLUDE et que le scoreX est inférieur au seuil, la case est masquée/vide
    if (diffXMode === 'EXCLUDE' && scoreX < diffXThreshold) {
      return renderEmptyTile('empty-' + catId + '-' + num);
    }

    // Calcul dynamique de la couleur de fond du bouton/tuile selon le mode et le scoreX
    let tileStyle = 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-2 border-amber-400 shadow-emerald-900/50';
    if (diffXMode === 'GREY' && scoreX < diffXThreshold) {
      tileStyle = 'bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 opacity-40 grayscale';
    } else if (formInfo?.icon === '🔴' || scoreX < 45) {
      tileStyle = 'bg-gradient-to-b from-rose-600 to-rose-700 border-2 border-rose-400 shadow-rose-950/60';
    } else if (formInfo?.icon === '🟡' || (scoreX >= 45 && scoreX < 65)) {
      tileStyle = 'bg-gradient-to-b from-amber-500 to-amber-600 border-2 border-amber-300 shadow-amber-950/60';
    } else if (formInfo?.icon === '🟢' || formInfo?.icon === '⚡' || scoreX >= 65) {
      tileStyle = 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-2 border-emerald-300 shadow-emerald-950/60';
    }

    return (
      <button
        key={`tile-${p.numero}`}
        type="button"
        onClick={() => onSelectHorse && onSelectHorse(num)}
        className={`relative flex flex-col items-center justify-between p-2.5 rounded-2xl ${tileStyle} shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer min-w-[76px] min-h-[72px]`}
      >
        {/* Badge supérieur : Numéro & Badge de Forme */}
        <div className="flex items-center gap-1">
          <span className="text-lg font-black text-white drop-shadow-md leading-none">
            {p.numero}
          </span>
          {formInfo && formInfo.icon !== '🟢' && (
            <span className="text-xs leading-none shrink-0" title={`Forme: ${formInfo.label}`}>
              {formInfo.icon}
            </span>
          )}
        </div>

        {/* Badge inférieur : Score(X) */}
        <span className="text-[11px] font-mono font-black text-white/95 tracking-tight mt-1 bg-black/20 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
          {scoreX.toFixed(1).replace('.', ',')}
        </span>

        {!passThreshold && (
          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-red-600 text-[8px] font-black text-white border border-white">
            &lt;{diffXThreshold}
          </span>
        )}
      </button>
    );
  };

  // Render d'un slot vide
  const renderEmptyTile = (key: string) => (
    <div
      key={key}
      className="flex items-center justify-center p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 text-slate-500 font-bold min-w-[76px] min-h-[72px] shadow-inner"
    >
      <span className="text-lg font-mono text-slate-600">—</span>
    </div>
  );

  return (
    <div className="w-full mt-6 p-4 sm:p-6 rounded-3xl bg-slate-950 border-2 border-cyan-500/50 shadow-2xl space-y-6">
      {/* En-tête Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                TABLEAU DYNAMIQUE SYSTÈME 74
              </h3>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black uppercase tracking-wide">
                Diff X ≥ {diffXThreshold}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Répartition dynamique des Favoris, Outsiders, Tocards et Surprises par Groupes A (1-6), B (7-10) et C (11+).
            </p>
          </div>
        </div>

        {/* Switch Vues (Cartes Visuelles / Tableau Matrice / Tableau Croisé Dynamique) */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 flex-wrap">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vue Cartes (Image)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MATRIX')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'MATRIX'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Matrice Standard
            </button>
            <button
              type="button"
              onClick={() => setViewMode('PIVOT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'PIVOT'
                  ? 'bg-indigo-500 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tableau Croisé Dynamique</span>
            </button>
          </div>
        </div>

      {/* BANDEAU INTERACTIF DYNAMIQUE DU SEUIL DIFF(X) SYSTÈME 74 (La 2e manière, unifiée) */}
      <Systeme74ThresholdControlBar course={course} />

      {/* VUE 1 : CARTES PAR GROUPE (Visuel Exact de l'Image image_60e5ce4d.png) */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columnGroups.map((grp) => {
            const groupSelection = selectionMapByGroup[grp.id as keyof typeof selectionMapByGroup];

            return (
              <div
                key={grp.id}
                className="p-5 rounded-3xl bg-slate-900/90 border-2 border-slate-800/90 flex flex-col items-center shadow-xl space-y-4"
              >
                {/* Pilule de Titre du Groupe */}
                <div className="px-4 py-1.5 rounded-full border bg-slate-950 text-white font-black text-xs sm:text-sm tracking-widest uppercase shadow-md flex items-center justify-center">
                  <span>{grp.title}</span>
                </div>

                {/* Grille de 3 colonnes de tuiles */}
                <div className="grid grid-cols-3 gap-3 w-full justify-items-center pt-2">
                  {groupSelection.length > 0 ? (
                    groupSelection.map(({ p, catId }) => renderHorseTile(p, catId))
                  ) : (
                    <>
                      {renderEmptyTile(`${grp.id}-e1`)}
                      {renderEmptyTile(`${grp.id}-e2`)}
                      {renderEmptyTile(`${grp.id}-e3`)}
                    </>
                  )}

                  {/* Compléter avec des tuiles vides si moins de 6 tuiles */}
                  {groupSelection.length > 0 && groupSelection.length < 6 && (
                    Array.from({ length: 6 - groupSelection.length }).map((_, idx) =>
                      renderEmptyTile(`${grp.id}-pad-${idx}`)
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VUE 2 : TABLEAU MATRICE (Lignes: Sélection Système 74 × Colonnes: Groupes A, B, C) */}
      {viewMode === 'MATRIX' && (
        <TableScrollWrapper>
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-400 font-extrabold">
                <th className="py-3 px-4 w-1/4">Sélection Système 74</th>
                <th className="py-3 px-4 text-center w-1/4 text-emerald-400">GROUPE A (1-6)</th>
                <th className="py-3 px-4 text-center w-1/4 text-amber-400">GROUPE B (7-10)</th>
                <th className="py-3 px-4 text-center w-1/4 text-purple-400">GROUPE C (11+)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categories.map((cat) => {
                const CategoryIcon = cat.icon;

                return (
                  <tr key={cat.id} className="hover:bg-slate-900/50 transition-colors">
                    {/* Colonne Ligne: Catégorie de Sélection */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${cat.bgColor} ${cat.textColor} border ${cat.borderColor}`}>
                          <CategoryIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className={`font-black text-xs sm:text-sm uppercase block ${cat.textColor}`}>
                            {cat.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {cat.short} ({cat.partants.length} chevaux)
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Colonnes Groupes A, B, C */}
                    {columnGroups.map((grp) => {
                      const matchingPartants = cat.partants.filter((p) =>
                        grp.filter(Number(p.numero))
                      );

                      return (
                        <td key={`${cat.id}-${grp.id}`} className="py-3 px-3 align-middle">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {matchingPartants.length > 0
                              ? matchingPartants.map((p) => renderHorseTile(p, cat.id))
                              : renderEmptyTile(`${cat.id}-${grp.id}-empty`)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScrollWrapper>
      )}

      {/* VUE 3 : TABLEAU CROISÉ DYNAMIQUE (INTERACTIF MULTIDIMENSIONNEL) */}
      {viewMode === 'PIVOT' && (
        <TableauCroiseDynamique course={course} onSelectHorse={onSelectHorse} />
      )}

      {/* Légende du Système 74 */}
      <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-200">Légende Forme :</span>
          <span className="flex items-center gap-1"><span className="text-base">🟢</span> En Forme</span>
          <span className="flex items-center gap-1"><span className="text-base">🟡</span> Forme Moyenne</span>
          <span className="flex items-center gap-1"><span className="text-base">⚡</span> Exploit</span>
          <span className="flex items-center gap-1"><span className="text-base">🔴</span> Méforme</span>
        </div>
        <div className="text-[11px] text-cyan-400 font-mono">
          Formula: Score(X) = (73 + N°) - Côte
        </div>
      </div>
    </div>
  );
};
