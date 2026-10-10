import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { PieChart as PieChartIcon, Info, Target, AlertCircle, Check, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Partant } from '../types/turf';

export interface PartantsPieChartProps {
  partants: Partant[];
  selectedHorses?: number[];
  onToggleHorse?: (numero: number) => void;
  courseTitle?: string;
}

type GroupingMode = 'pmu' | 'tranches';

interface OddsGroupSlice {
  id: string;
  label: string;
  sublabel: string;
  rangeDesc: string;
  color: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  horses: Array<{
    numero: number;
    nom: string;
    cote: number;
    isSelected: boolean;
  }>;
  count: number;
  percentage: number;
}

/**
 * Extrait rigoureusement la cote numérique réelle et valide d'un partant
 * sans interpolation ni valeur fictive.
 */
function extractValidOdds(p: Partant): number | null {
  if (p.estNonPartant || p.statut === 'Non-partant') {
    return null;
  }
  if (typeof p.coteProbable === 'number' && !isNaN(p.coteProbable) && p.coteProbable > 0) {
    return p.coteProbable;
  }
  if (typeof p.genyOdds === 'number' && !isNaN(p.genyOdds) && p.genyOdds > 0) {
    return p.genyOdds;
  }
  if (typeof p.pmuOdds === 'number' && !isNaN(p.pmuOdds) && p.pmuOdds > 0) {
    return p.pmuOdds;
  }
  if (typeof p.parisTurfOdds === 'number' && !isNaN(p.parisTurfOdds) && p.parisTurfOdds > 0) {
    return p.parisTurfOdds;
  }
  if (typeof p.cotesRaw === 'string') {
    const parsed = parseFloat(p.cotesRaw.replace(',', '.').replace('/1', '').trim());
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: OddsGroupSlice;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const slice = payload[0].payload;

  return (
    <div className="bg-slate-950/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl max-w-xs text-xs text-slate-200 z-50 pointer-events-none">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: slice.color }}
          />
          <span className="font-black text-white text-sm">{slice.label}</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 border border-slate-700 text-slate-300">
          {slice.rangeDesc}
        </span>
      </div>

      <div className="py-2 space-y-1">
        <div className="flex justify-between items-center text-slate-300">
          <span>Effectif :</span>
          <strong className="text-white font-mono font-bold">
            {slice.count} cheval{slice.count > 1 ? 'ux' : ''}
          </strong>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Part de la course :</span>
          <strong className="font-mono font-black" style={{ color: slice.color }}>
            {slice.percentage.toFixed(1)}%
          </strong>
        </div>
      </div>

      {slice.horses.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Chevaux du groupe :
          </span>
          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
            {slice.horses.map((h) => (
              <span
                key={h.numero}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                  h.isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                N°{h.numero} ({h.cote.toFixed(1)}/1)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const PartantsPieChart: React.FC<PartantsPieChartProps> = ({
  partants,
  selectedHorses = [],
  onToggleHorse,
  courseTitle,
}) => {
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('pmu');
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);

  // Analyse et extraction des cotes réelles
  const { analyzedPartants, unexploitableCount, totalCount, nonPartantsCount } = useMemo(() => {
    const list = partants || [];
    let unexploitable = 0;
    let nonPartants = 0;
    const valid: Array<{ partant: Partant; cote: number }> = [];

    list.forEach((p) => {
      if (p.estNonPartant || p.statut === 'Non-partant') {
        nonPartants++;
        return;
      }
      const odds = extractValidOdds(p);
      if (odds !== null && !isNaN(odds) && odds > 0) {
        valid.push({ partant: p, cote: odds });
      } else {
        unexploitable++;
      }
    });

    return {
      analyzedPartants: valid,
      unexploitableCount: unexploitable,
      nonPartantsCount: nonPartants,
      totalCount: list.length,
    };
  }, [partants]);

  // Construction des tranches en fonction du mode sélectionné
  const slices = useMemo<OddsGroupSlice[]>(() => {
    const totalValid = analyzedPartants.length;
    if (totalValid === 0) return [];

    const selectedSet = new Set(selectedHorses.map(Number));

    if (groupingMode === 'pmu') {
      // 4 Catégories Turf PMU officielles basées sur les cotes réelles
      const definitions = [
        {
          id: 'favoris',
          label: 'Favoris',
          sublabel: 'Cotes d\'appui',
          rangeDesc: '< 5,0/1',
          color: '#f59e0b', // Amber
          borderClass: 'border-amber-500/40',
          bgClass: 'bg-amber-500/10',
          textClass: 'text-amber-400',
          filter: (c: number) => c < 5.0,
        },
        {
          id: 'chances-regulieres',
          label: 'Chances Régulières',
          sublabel: 'Secondes chances',
          rangeDesc: '5,0 à 15,0/1',
          color: '#10b981', // Emerald
          borderClass: 'border-emerald-500/40',
          bgClass: 'bg-emerald-500/10',
          textClass: 'text-emerald-400',
          filter: (c: number) => c >= 5.0 && c <= 15.0,
        },
        {
          id: 'outsiders',
          label: 'Outsiders',
          sublabel: 'Spéculatifs',
          rangeDesc: '15,1 à 35,0/1',
          color: '#06b6d4', // Cyan
          borderClass: 'border-cyan-500/40',
          bgClass: 'bg-cyan-500/10',
          textClass: 'text-cyan-400',
          filter: (c: number) => c > 15.0 && c <= 35.0,
        },
        {
          id: 'gros-rapports',
          label: 'Gros Rapports',
          sublabel: 'Tocards & Délaissés',
          rangeDesc: '> 35,0/1',
          color: '#ec4899', // Pink
          borderClass: 'border-pink-500/40',
          bgClass: 'bg-pink-500/10',
          textClass: 'text-pink-400',
          filter: (c: number) => c > 35.0,
        },
      ];

      return definitions.map((def) => {
        const matching = analyzedPartants
          .filter((item) => def.filter(item.cote))
          .sort((a, b) => a.cote - b.cote);

        const count = matching.length;
        const percentage = totalValid > 0 ? (count / totalValid) * 100 : 0;

        return {
          id: def.id,
          label: def.label,
          sublabel: def.sublabel,
          rangeDesc: def.rangeDesc,
          color: def.color,
          borderClass: def.borderClass,
          bgClass: def.bgClass,
          textClass: def.textClass,
          horses: matching.map((item) => ({
            numero: Number(item.partant.numero),
            nom: item.partant.nom,
            cote: item.cote,
            isSelected: selectedSet.has(Number(item.partant.numero)),
          })),
          count,
          percentage,
        };
      });
    }

    // Mode 'tranches' : 5 intervalles quantitatifs précis de cotes
    const definitions = [
      {
        id: 't-inf-5',
        label: 'Cotes < 5/1',
        sublabel: 'Ultra-joués',
        rangeDesc: '< 5/1',
        color: '#f59e0b',
        borderClass: 'border-amber-500/40',
        bgClass: 'bg-amber-500/10',
        textClass: 'text-amber-400',
        filter: (c: number) => c < 5,
      },
      {
        id: 't-5-10',
        label: 'Cotes 5 à 10/1',
        sublabel: 'Bases solides',
        rangeDesc: '5 - 10/1',
        color: '#10b981',
        borderClass: 'border-emerald-500/40',
        bgClass: 'bg-emerald-500/10',
        textClass: 'text-emerald-400',
        filter: (c: number) => c >= 5 && c < 10,
      },
      {
        id: 't-10-20',
        label: 'Cotes 10 à 20/1',
        sublabel: 'Outsiders probables',
        rangeDesc: '10 - 20/1',
        color: '#38bdf8',
        borderClass: 'border-sky-500/40',
        bgClass: 'bg-sky-500/10',
        textClass: 'text-sky-400',
        filter: (c: number) => c >= 10 && c < 20,
      },
      {
        id: 't-20-40',
        label: 'Cotes 20 à 40/1',
        sublabel: 'Spéculatifs',
        rangeDesc: '20 - 40/1',
        color: '#a855f7',
        borderClass: 'border-purple-500/40',
        bgClass: 'bg-purple-500/10',
        textClass: 'text-purple-400',
        filter: (c: number) => c >= 20 && c < 40,
      },
      {
        id: 't-sup-40',
        label: 'Cotes > 40/1',
        sublabel: 'Gros tocards',
        rangeDesc: '> 40/1',
        color: '#f43f5e',
        borderClass: 'border-rose-500/40',
        bgClass: 'bg-rose-500/10',
        textClass: 'text-rose-400',
        filter: (c: number) => c >= 40,
      },
    ];

    return definitions.map((def) => {
      const matching = analyzedPartants
        .filter((item) => def.filter(item.cote))
        .sort((a, b) => a.cote - b.cote);

      const count = matching.length;
      const percentage = totalValid > 0 ? (count / totalValid) * 100 : 0;

      return {
        id: def.id,
        label: def.label,
        sublabel: def.sublabel,
        rangeDesc: def.rangeDesc,
        color: def.color,
        borderClass: def.borderClass,
        bgClass: def.bgClass,
        textClass: def.textClass,
        horses: matching.map((item) => ({
          numero: Number(item.partant.numero),
          nom: item.partant.nom,
          cote: item.cote,
          isSelected: selectedSet.has(Number(item.partant.numero)),
        })),
        count,
        percentage,
      };
    });
  }, [analyzedPartants, groupingMode, selectedHorses]);

  // Données prêtes pour le composant Recharts (uniquement les tranches avec effectif > 0 pour éviter des tranches nulles)
  const chartData = useMemo(() => {
    return slices.filter((s) => s.count > 0);
  }, [slices]);

  return (
    <div className="mt-6 bg-slate-950/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* En-tête du composant */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white">
                Répartition Circulaire des Partants par Cotes
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                V38 Live Distribution
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Distribution réelle des partants selon les rapports officiels et probables
              {courseTitle ? ` · ${courseTitle}` : ''}
            </p>
          </div>
        </div>

        {/* Sélecteur de mode de découpage */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 p-1 rounded-2xl self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={() => setGroupingMode('pmu')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              groupingMode === 'pmu'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Groupes PMU</span>
          </button>
          <button
            type="button"
            onClick={() => setGroupingMode('tranches')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              groupingMode === 'tranches'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tranches 5/1</span>
          </button>
        </div>
      </div>

      {/* Bandeau d'état des effectifs analysés */}
      <div className="my-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>
            <strong className="text-white font-mono">{analyzedPartants.length}</strong> partant
            {analyzedPartants.length > 1 ? 's' : ''} avec cote analysée
          </span>
        </span>

        <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
          Total inscrits : <strong className="text-slate-200 font-mono">{totalCount}</strong>
        </span>

        {unexploitableCount > 0 && (
          <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {unexploitableCount} partant{unexploitableCount > 1 ? 's' : ''} sans cote exploitable
              exclu{unexploitableCount > 1 ? 's' : ''} de la répartition
            </span>
          </span>
        )}

        {nonPartantsCount > 0 && (
          <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium">
            {nonPartantsCount} non-partant{nonPartantsCount > 1 ? 's' : ''} (NP)
          </span>
        )}
      </div>

      {/* Contenu principal : graphique circulaire + cartes de répartition */}
      {analyzedPartants.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h4 className="text-sm font-black text-white">Aucune cote exploitable pour cette course</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Les cotes probables ou officielles ne sont pas encore disponibles dans le programme ou
            tous les chevaux inscrits sont signalés non-partants.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Graphique Donut Recharts */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[260px]">
            <div className="w-full h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                    onMouseEnter={(entry: any) => setHoveredSliceId(entry?.id || null)}
                    onMouseLeave={() => setHoveredSliceId(null)}
                  >
                    {chartData.map((slice) => {
                      const isHovered = hoveredSliceId === slice.id;
                      return (
                        <Cell
                          key={slice.id}
                          fill={slice.color}
                          stroke={isHovered ? '#ffffff' : '#090d16'}
                          strokeWidth={isHovered ? 3 : 2}
                          className="transition-all duration-200 cursor-pointer outline-hidden"
                          style={{
                            filter: isHovered
                              ? `drop-shadow(0 0 10px ${slice.color})`
                              : undefined,
                            opacity: hoveredSliceId && !isHovered ? 0.6 : 1,
                          }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Texte central dans l'anneau */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Effectif
                </span>
                <span className="text-2xl font-black text-white font-mono leading-none">
                  {analyzedPartants.length}
                </span>
                <span className="text-[10px] text-amber-400 font-bold mt-0.5">
                  Chevaux cotés
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic text-center mt-1">
              Survolez ou touchez un secteur pour afficher les détails du groupe
            </p>
          </div>

          {/* Cartes détaillées des groupes avec effectif, % et numéros de chevaux */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slices.map((slice) => {
              const isHovered = hoveredSliceId === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => setHoveredSliceId(slice.id)}
                  onMouseLeave={() => setHoveredSliceId(null)}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                    slice.bgClass
                  } ${slice.borderClass} ${
                    isHovered
                      ? 'ring-2 ring-white/20 shadow-lg scale-[1.01]'
                      : 'hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-black text-white text-xs">{slice.label}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950/80 border border-slate-700/80 text-slate-300">
                      {slice.rangeDesc}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-xs text-slate-400">
                      <strong className="text-white font-mono text-sm font-bold">
                        {slice.count}
                      </strong>{' '}
                      partant{slice.count > 1 ? 's' : ''}
                    </div>
                    <div className="font-mono font-black text-sm" style={{ color: slice.color }}>
                      {slice.percentage.toFixed(1)}%
                    </div>
                  </div>

                  {/* Chevaux membres du groupe */}
                  {slice.horses.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-800/60">
                      {slice.horses.map((h) => (
                        <button
                          key={h.numero}
                          type="button"
                          onClick={() => onToggleHorse && onToggleHorse(h.numero)}
                          title={`N°${h.numero} ${h.nom} - Cote ${h.cote.toFixed(1)}/1 (cliquer pour cocher/décocher)`}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            h.isSelected
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                              : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          {h.isSelected && <Check className="w-2.5 h-2.5 shrink-0" />}
                          <span>N°{h.numero}</span>
                          <span className="opacity-70 text-[9px] font-mono">
                            {h.cote.toFixed(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/60">
                      Aucun partant dans cette tranche
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Note d'information méthodologique */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-400">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-200">Note de lecture des cotes réelles :</strong> La répartition
          est calculée exclusivement sur les cotes des chevaux déclarés partants. Les pourcentages reflètent
          le poids numérique de chaque catégorie de rapport dans l'épreuve et ne doivent pas être confondus avec
          les probabilités mathématiques de victoire.
        </p>
      </div>
    </div>
  );
};
