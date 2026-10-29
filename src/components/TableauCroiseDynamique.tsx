import React, { useState, useMemo } from 'react';
import { CourseHippique, Partant } from '../types/turf';
import { computeV38Hierarchy, getHorseGenyOdds } from '../utils/v38Helper';
import { classerChevauxFormeEtPoints, calculerPerformance3Musiques } from '../utils/turfCalculations';
import { TableScrollWrapper } from './TableScrollWrapper';
import { useSysteme74 } from '../utils/systeme74Store';
import { Systeme74ThresholdControlBar } from './Systeme74ThresholdControlBar';
import {
  Grid,
  Filter,
  Sliders,
  Layers,
  Sparkles,
  Award,
  Zap,
  CheckCircle2,
  ChevronDown,
  BarChart3,
  Calculator,
  Search,
} from 'lucide-react';

interface TableauCroiseDynamiqueProps {
  course: CourseHippique;
  onSelectHorse?: (numero: number) => void;
}

export type RowDimension = 'SELECTION_74' | 'FORME' | 'OBJECTIFS' | 'FERRURE';
export type ColDimension = 'GROUPS_ABC' | 'VECTEURS' | 'COTES' | 'SCORE_X_TIERS';
export type MetricType = 'TILES' | 'COUNT' | 'AVG_SCORE_X' | 'AVG_COTE';

export const TableauCroiseDynamique: React.FC<TableauCroiseDynamiqueProps> = ({
  course,
  onSelectHorse,
}) => {
  // Dimensions dynamiques des Axes Ligne & Colonne
  const [rowDimension, setRowDimension] = useState<RowDimension>('SELECTION_74');
  const [colDimension, setColDimension] = useState<ColDimension>('GROUPS_ABC');
  const [metricType, setMetricType] = useState<MetricType>('TILES');

  // Filtres
  const { threshold: diffXThreshold, mode: diffXMode, isActive: diffXFilterActive } = useSysteme74();
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculs v38 & Forme
  const v38 = useMemo(() => computeV38Hierarchy(course), [course]);

  const formClassification = useMemo(() => {
    return classerChevauxFormeEtPoints(course.partants || []);
  }, [course.partants]);

  const formMap = useMemo(() => {
    const map = new Map<number, { icon: string; label: string; key: string }>();
    formClassification.allClassified.forEach((item) => {
      let icon = '🟢';
      let label = 'EN FORME';
      let key = 'EN_FORME';
      if (item.categorie === 'FORME_MOYENNE') {
        icon = '🟡';
        label = 'MOYENNE';
        key = 'FORME_MOYENNE';
      } else if (item.categorie === 'CAPABLE_EXPLOIT') {
        icon = '⚡';
        label = 'EXPLOIT';
        key = 'CAPABLE_EXPLOIT';
      } else if (item.categorie === 'MEFORME') {
        icon = '🔴';
        label = 'MÉFORME';
        key = 'MEFORME';
      }
      map.set(Number(item.partant.numero), { icon, label, key });
    });
    return map;
  }, [formClassification]);

  // Enrichissement de tous les partants
  const enrichedPartants = useMemo(() => {
    return (course.partants || [])
      .filter((p) => !p.estNonPartant && p.statut !== 'Non-partant')
      .map((p) => {
        const num = Number(p.numero);
        const cote = getHorseGenyOdds(p);
        const scoreX = (73 + num) - cote;

        // Détection de la catégorie Système 74
        let selectionCat = 'SURPRISES';
        if (v38.favoris.some((f) => Number(f.numero) === num)) selectionCat = 'FAVORIS';
        else if (v38.outsiders.some((o) => Number(o.numero) === num)) selectionCat = 'OUTSIDERS';
        else if (v38.tocardsSpeculatifs.some((t) => Number(t.numero) === num)) selectionCat = 'TOCARDS';

        // Ferrure
        const ferrure = (p.ferrure || 'F').toUpperCase();
        let ferrureGroup = 'F';
        if (ferrure === 'D4') ferrureGroup = 'D4';
        else if (ferrure === 'DP' || ferrure === 'DA') ferrureGroup = 'DP_DA';

        // Forme
        const formInfo = formMap.get(num) || { icon: '⚪', label: 'Indéterminé', key: 'UNKNOWN' };

        // Objectif Heuristique
        let objectifKey = 'POURSUITE';
        let objectifLabel = '🔵 Poursuite de gains';
        if (ferrure === 'D4' && (cote <= 8 || scoreX >= 65)) {
          objectifKey = 'CIBLE_GROUPE';
          objectifLabel = '🎯 Cible Groupe / Quinté+';
        } else if (ferrure === 'D4' || (cote <= 8 && (ferrure === 'DP' || ferrure === 'DA'))) {
          objectifKey = 'PLAFOND_GAINS';
          objectifLabel = '🏆 Plafond des gains';
        } else if (cote >= 15 && (ferrure === 'D4' || ferrure === 'DP' || ferrure === 'DA')) {
          objectifKey = 'COUP_POKER';
          objectifLabel = '⚡ Coup de poker';
        } else if (ferrure === 'F' && cote > 15) {
          objectifKey = 'PREPARATION';
          objectifLabel = '⏳ Préparation meeting';
        }

        return {
          partant: p,
          num,
          nom: p.nom,
          cote,
          scoreX,
          selectionCat,
          ferrureGroup,
          formInfo,
          objectifKey,
          objectifLabel,
        };
      });
  }, [course.partants, v38, formMap]);

  // Filtrage des partants selon recherche & Filtre Diff X
  const filteredPartants = useMemo(() => {
    return enrichedPartants.filter((item) => {
      if (diffXMode === 'EXCLUDE' && item.scoreX < diffXThreshold) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = item.num.toString() === q;
        const matchNom = item.nom.toLowerCase().includes(q);
        return matchNum || matchNom;
      }
      return true;
    });
  }, [enrichedPartants, diffXFilterActive, diffXThreshold, searchQuery]);

  // Définition des LIGNES du Tableau Croisé
  const rowCategories = useMemo(() => {
    if (rowDimension === 'SELECTION_74') {
      return [
        { id: 'FAVORIS', label: '👑 FAVORIS (3 N°)', short: '1er à 3e' },
        { id: 'OUTSIDERS', label: '⭐️ OUTSIDERS (3 N°)', short: '4e à 6e' },
        { id: 'TOCARDS', label: '⚡️ TOCARDS (4 N°)', short: '7e à 10e' },
        { id: 'SURPRISES', label: '🎁 SURPRISES (4 N°)', short: '11e à 14e' },
      ];
    }
    if (rowDimension === 'FORME') {
      return [
        { id: 'EN_FORME', label: '🟢 EN FORME (Top Musique)', short: 'Rangs 1 à 6' },
        { id: 'FORME_MOYENNE', label: '🟡 FORME MOYENNE', short: 'Rangs 7 à 10' },
        { id: 'CAPABLE_EXPLOIT', label: '⚡ CAPABLE D\'EXPLOIT', short: 'Méforme + Cote < 8' },
        { id: 'MEFORME', label: '🔴 MÉFORME', short: 'Rangs 11+' },
      ];
    }
    if (rowDimension === 'OBJECTIFS') {
      return [
        { id: 'CIBLE_GROUPE', label: '🎯 Cible Groupe / Quinté+', short: 'Ambition Maximale' },
        { id: 'PLAFOND_GAINS', label: '🏆 Plafond des gains', short: 'Engagement Sur Mesure' },
        { id: 'POURSUITE', label: '🔵 Poursuite de gains', short: 'Régulier' },
        { id: 'COUP_POKER', label: '⚡ Coup de Poker', short: 'Outsider Spéculatif' },
        { id: 'PREPARATION', label: '⏳ Préparation Meeting', short: 'Rentrée Ferré' },
      ];
    }
    // FERRURE
    return [
      { id: 'D4', label: '👟 D4 (Déferré des 4 pieds)', short: 'Configuration Maximale' },
      { id: 'DP_DA', label: '🦶 DP / DA (Déferré antérieur/postérieur)', short: 'Configuration Partielle' },
      { id: 'F', label: '🛡️ F (Ferré / Normal)', short: 'Configuration Classique' },
    ];
  }, [rowDimension]);

  // Définition des COLONNES du Tableau Croisé
  const colCategories = useMemo(() => {
    if (colDimension === 'GROUPS_ABC') {
      return [
        { id: 'GROUPE_A', label: 'GROUPE A (1-6)', match: (num: number) => num >= 1 && num <= 6 },
        { id: 'GROUPE_B', label: 'GROUPE B (7-10)', match: (num: number) => num >= 7 && num <= 10 },
        { id: 'GROUPE_C', label: 'GROUPE C (11+)', match: (num: number) => num >= 11 },
      ];
    }
    if (colDimension === 'VECTEURS') {
      return [
        { id: 'VECTEUR_1', label: 'VECTEUR 1 (N° 1-9)', match: (num: number) => num >= 1 && num <= 9 },
        { id: 'VECTEUR_2', label: 'VECTEUR 2 (N° 10+)', match: (num: number) => num >= 10 },
      ];
    }
    if (colDimension === 'COTES') {
      return [
        { id: 'FAV_COTE', label: 'FAVORIS (Cote < 5.0)', match: (_: number, cote: number) => cote < 5 },
        { id: 'OUT_COTE', label: 'OUTSIDERS (5.0 - 15.0)', match: (_: number, cote: number) => cote >= 5 && cote <= 15 },
        { id: 'TOC_COTE', label: 'TOCARDS (15.0 - 30.0)', match: (_: number, cote: number) => cote > 15 && cote <= 30 },
        { id: 'DEL_COTE', label: 'DÉLAISSÉS (> 30.0)', match: (_: number, cote: number) => cote > 30 },
      ];
    }
    // SCORE_X_TIERS
    return [
      { id: 'SX_ELITE', label: 'ÉLITE (Score X ≥ 70)', match: (_: number, __: number, scoreX: number) => scoreX >= 70 },
      { id: 'SX_BON', label: 'BON (Score X 55 - 69)', match: (_: number, __: number, scoreX: number) => scoreX >= 55 && scoreX < 70 },
      { id: 'SX_MOYEN', label: 'MOYEN (Score X 40 - 54)', match: (_: number, __: number, scoreX: number) => scoreX >= 40 && scoreX < 55 },
      { id: 'SX_FAIBLE', label: 'FAIBLE (Score X < 40)', match: (_: number, __: number, scoreX: number) => scoreX < 40 },
    ];
  }, [colDimension]);

  // Fonction de hachage / appartenance à la Ligne
  const matchesRow = (item: typeof enrichedPartants[0], rowId: string): boolean => {
    if (rowDimension === 'SELECTION_74') return item.selectionCat === rowId;
    if (rowDimension === 'FORME') return item.formInfo.key === rowId;
    if (rowDimension === 'OBJECTIFS') return item.objectifKey === rowId;
    if (rowDimension === 'FERRURE') return item.ferrureGroup === rowId;
    return false;
  };

  // Matrice de données (Ligne x Colonne)
  const pivotMatrix = useMemo(() => {
    const matrix = new Map<string, typeof enrichedPartants>();

    rowCategories.forEach((row) => {
      colCategories.forEach((col) => {
        const cellKey = `${row.id}__${col.id}`;
        const items = filteredPartants.filter(
          (item) => matchesRow(item, row.id) && col.match(item.num, item.cote, item.scoreX)
        );
        matrix.set(cellKey, items);
      });
    });

    return matrix;
  }, [rowCategories, colCategories, filteredPartants, rowDimension]);

  // Calculs des Totaux de Lignes, Colonnes et Total Général
  const totalsByRow = useMemo(() => {
    const map = new Map<string, typeof enrichedPartants>();
    rowCategories.forEach((row) => {
      const items = filteredPartants.filter((item) => matchesRow(item, row.id));
      map.set(row.id, items);
    });
    return map;
  }, [rowCategories, filteredPartants, rowDimension]);

  const totalsByCol = useMemo(() => {
    const map = new Map<string, typeof enrichedPartants>();
    colCategories.forEach((col) => {
      const items = filteredPartants.filter((item) => col.match(item.num, item.cote, item.scoreX));
      map.set(col.id, items);
    });
    return map;
  }, [colCategories, filteredPartants]);

  // Style de rendu d'une Tuile
  const renderTileCell = (item: typeof enrichedPartants[0]) => {
    let tileStyle = 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-2 border-emerald-300';
    if (item.formInfo.icon === '🔴' || item.scoreX < 45) {
      tileStyle = 'bg-gradient-to-b from-rose-600 to-rose-700 border-2 border-rose-400';
    } else if (item.formInfo.icon === '🟡' || (item.scoreX >= 45 && item.scoreX < 65)) {
      tileStyle = 'bg-gradient-to-b from-amber-500 to-amber-600 border-2 border-amber-300';
    }

    return (
      <button
        key={`pivot-tile-${item.num}`}
        type="button"
        onClick={() => onSelectHorse && onSelectHorse(item.num)}
        className={`flex flex-col items-center justify-between p-1.5 rounded-xl ${tileStyle} shadow-md hover:scale-105 transition-transform cursor-pointer min-w-[54px] min-h-[48px]`}
        title={`${item.nom} (N°${item.num}) - Cote: ${item.cote}/1 - Score(X): ${item.scoreX.toFixed(1)}`}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm font-extrabold text-white leading-none">{item.num}</span>
          <span className="text-[9px]">{item.formInfo.icon}</span>
        </div>
        <span className="text-[9px] font-mono font-black text-white/95 bg-black/25 px-1 rounded">
          {item.scoreX.toFixed(1).replace('.', ',')}
        </span>
      </button>
    );
  };

  // Helper de rendu selon la métrique choisie
  const renderMetricContent = (items: typeof enrichedPartants) => {
    if (items.length === 0) {
      return <span className="text-slate-600 font-mono text-sm">—</span>;
    }

    if (metricType === 'TILES') {
      return (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {items.map((item) => renderTileCell(item))}
        </div>
      );
    }

    if (metricType === 'COUNT') {
      return (
        <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black text-sm">
          {items.length} partant{items.length > 1 ? 's' : ''}
        </span>
      );
    }

    if (metricType === 'AVG_SCORE_X') {
      const avg = items.reduce((sum, i) => sum + i.scoreX, 0) / items.length;
      return (
        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-black text-xs">
          Moy. {avg.toFixed(1).replace('.', ',')}
        </span>
      );
    }

    // AVG_COTE
    const avgCote = items.reduce((sum, i) => sum + i.cote, 0) / items.length;
    return (
      <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-xs">
        Cote {avgCote.toFixed(1).replace('.', ',')}
      </span>
    );
  };

  return (
    <div className="w-full mt-6 p-4 sm:p-6 rounded-3xl bg-slate-950 border-2 border-indigo-500/50 shadow-2xl space-y-6">
      {/* En-tête Principal */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-indigo-500/30">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-slate-950 shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                TABLEAU CROISÉ DYNAMIQUE
              </h3>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black uppercase tracking-wide">
                Analyse Multidimensionnelle
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Croisez dynamiquement les Sélections, Forme, Objectifs & Ferrures par Groupes, Vecteurs, Cotes ou Score X.
            </p>
          </div>
        </div>

        {/* Barre de recherche rapide */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="N° ou Nom du cheval..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Control Panel des Axes & Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
        {/* Axe Ligne */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold uppercase text-indigo-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Axe 1 : LIGNES</span>
          </label>
          <select
            value={rowDimension}
            onChange={(e) => setRowDimension(e.target.value as RowDimension)}
            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="SELECTION_74">Sélection Système 74 (Favoris, Outsiders, Tocards, Surprises)</option>
            <option value="FORME">Forme & Points de Musique (🟢, 🟡, ⚡, 🔴)</option>
            <option value="OBJECTIFS">Objectif Visé & Stratégie Propriétaire</option>
            <option value="FERRURE">Configuration Ferrure (D4, DP/DA, Ferré)</option>
          </select>
        </div>

        {/* Axe Colonne */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold uppercase text-indigo-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>Axe 2 : COLONNES</span>
          </label>
          <select
            value={colDimension}
            onChange={(e) => setColDimension(e.target.value as ColDimension)}
            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="GROUPS_ABC">Groupes N° (A 1-6, B 7-10, C 11+)</option>
            <option value="VECTEURS">Vecteurs (Vecteur 1 N°1-9, Vecteur 2 N°10+)</option>
            <option value="COTES">Tranches de Cotes (Favoris, Outsiders, Tocards, Grosses Cotes)</option>
            <option value="SCORE_X_TIERS">Niveaux de Score X (Élite, Bon, Moyen, Faible)</option>
          </select>
        </div>

        {/* Métrique / Valeur */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold uppercase text-indigo-300 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            <span>Métrique / Affichage</span>
          </label>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as MetricType)}
            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="TILES">Tuiles Visuelles des Chevaux (N°, Forme, Score X)</option>
            <option value="COUNT">Nombre de Partants (Effectif)</option>
            <option value="AVG_SCORE_X">Score(X) Moyen</option>
            <option value="AVG_COTE">Cote Moyenne</option>
          </select>
        </div>
      </div>

      {/* BANDEAU INTERACTIF DYNAMIQUE DU SEUIL DIFF(X) SYSTÈME 74 (La 2e manière, unifiée) */}
      <Systeme74ThresholdControlBar course={course} />

      {/* Le Tableau Croisé Dynamique */}
      <TableScrollWrapper>
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="border-b-2 border-slate-800 bg-slate-900/90 text-xs uppercase text-slate-300 font-black">
              <th className="py-3 px-4 bg-slate-950/80 border-r border-slate-800 min-w-[200px]">
                {rowDimension === 'SELECTION_74' && 'Sélection Système 74'}
                {rowDimension === 'FORME' && 'Forme des Chevaux'}
                {rowDimension === 'OBJECTIFS' && 'Objectifs Visés'}
                {rowDimension === 'FERRURE' && 'Configuration Ferrure'}
              </th>
              {colCategories.map((col) => (
                <th key={`col-${col.id}`} className="py-3 px-3 text-center border-r border-slate-800">
                  {col.label}
                </th>
              ))}
              <th className="py-3 px-4 text-center bg-indigo-950/40 text-indigo-300 font-black min-w-[110px]">
                TOTAL LIGNE
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-xs">
            {rowCategories.map((row) => {
              const rowItems = totalsByRow.get(row.id) || [];

              return (
                <tr key={`row-${row.id}`} className="hover:bg-slate-900/40 transition-colors">
                  {/* Libellé de Ligne */}
                  <td className="py-3.5 px-4 font-black text-white bg-slate-950/60 border-r border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm">{row.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{row.short}</span>
                    </div>
                  </td>

                  {/* Cellules Croisées */}
                  {colCategories.map((col) => {
                    const cellKey = `${row.id}__${col.id}`;
                    const cellItems = pivotMatrix.get(cellKey) || [];

                    return (
                      <td key={cellKey} className="py-3 px-3 text-center align-middle border-r border-slate-800/80">
                        <div className="flex items-center justify-center">
                          {renderMetricContent(cellItems)}
                        </div>
                      </td>
                    );
                  })}

                  {/* Total de Ligne */}
                  <td className="py-3.5 px-4 text-center align-middle bg-indigo-950/20 font-black">
                    <div className="flex items-center justify-center">
                      {renderMetricContent(rowItems)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Pied de Tableau : Totaux par Colonne */}
          <tfoot>
            <tr className="border-t-2 border-indigo-500/50 bg-indigo-950/40 text-xs font-black">
              <td className="py-3.5 px-4 uppercase text-indigo-300 border-r border-slate-800">
                TOTAL COLONNE
              </td>
              {colCategories.map((col) => {
                const colItems = totalsByCol.get(col.id) || [];
                return (
                  <td key={`total-col-${col.id}`} className="py-3.5 px-3 text-center border-r border-slate-800">
                    <div className="flex items-center justify-center">
                      {renderMetricContent(colItems)}
                    </div>
                  </td>
                );
              })}
              <td className="py-3.5 px-4 text-center bg-indigo-900/60 text-emerald-300 font-black text-sm">
                <div className="flex items-center justify-center">
                  {renderMetricContent(filteredPartants)}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </TableScrollWrapper>
    </div>
  );
};
