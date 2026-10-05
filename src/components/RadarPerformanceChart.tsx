import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Sparkles,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Crown,
  TrendingUp,
  Activity,
  Award,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { computePartantHippoScore } from '../utils/geminiMultiModelEngine';
import { computeV38Hierarchy, getHorseGenyOdds } from '../utils/v38Helper';
import { calculerEcartEtForme } from '../utils/turfCalculations';

interface RadarPerformanceChartProps {
  course: CourseHippique;
  selectedHorseNumbers?: number[];
  onSelectHorseForTicket?: (numero: number) => void;
  className?: string;
}

export interface RadarCriterionScore {
  criterion: string;
  shortLabel: string;
  [horseKey: string]: any;
}

const HORSE_COLORS = [
  { stroke: '#10b981', fill: '#10b981', fillOpacity: 0.25, bg: 'bg-emerald-500 text-slate-950', border: 'border-emerald-400', badgeText: 'text-emerald-300' },
  { stroke: '#f59e0b', fill: '#f59e0b', fillOpacity: 0.25, bg: 'bg-amber-400 text-slate-950', border: 'border-amber-300', badgeText: 'text-amber-300' },
  { stroke: '#06b6d4', fill: '#06b6d4', fillOpacity: 0.25, bg: 'bg-cyan-500 text-slate-950', border: 'border-cyan-400', badgeText: 'text-cyan-300' },
  { stroke: '#a855f7', fill: '#a855f7', fillOpacity: 0.25, bg: 'bg-purple-500 text-white', border: 'border-purple-400', badgeText: 'text-purple-300' },
  { stroke: '#f43f5e', fill: '#f43f5e', fillOpacity: 0.25, bg: 'bg-rose-500 text-white', border: 'border-rose-400', badgeText: 'text-rose-300' },
  { stroke: '#3b82f6', fill: '#3b82f6', fillOpacity: 0.25, bg: 'bg-blue-500 text-white', border: 'border-blue-400', badgeText: 'text-blue-300' },
];

/**
 * Calcule le score sur 100 de la musique (forme récente et victoires)
 */
function computeMusiqueScore(p: Partant): number {
  const musique = (p.musique || '').trim();
  if (!musique || musique === '?' || musique === 'Inconnu') return 50;

  const ecart = calculerEcartEtForme(musique);
  const places = musique.replace(/[^0-9]/g, '').split('').map(Number);
  
  if (places.length === 0) {
    if (musique.includes('D') || musique.includes('T')) return 30;
    return 50;
  }

  // Bonus première place récente
  let score = 50;
  const first = places[0];
  if (first === 1) score = 95;
  else if (first === 2) score = 85;
  else if (first === 3) score = 75;
  else if (first === 4) score = 65;
  else if (first === 5) score = 55;
  else score = Math.max(20, 50 - (first - 5) * 6);

  // Prise en compte du taux de victoire globale
  if (ecart.totalRacesRecorded > 0) {
    const winRate = Math.round((ecart.victoiresCount / ecart.totalRacesRecorded) * 100);
    score = Math.round((score * 0.6) + (winRate * 0.4));
  }

  // Bonus si cote basse confirmant la musique
  if (p.coteProbable && Number(p.coteProbable) <= 4.0) {
    score = Math.min(100, score + 5);
  }

  return Math.min(100, Math.max(15, Math.round(score)));
}

/**
 * Calcule le score de Gains (normalisé de 0 à 100)
 */
function computeGainsScore(p: Partant, maxGainsInField: number): number {
  const rawGains = Number(p.gains) || 0;
  if (maxGainsInField <= 0) return 50;
  const ratio = rawGains / maxGainsInField;
  // Utilisation d'une courbe logarithmique / progressive pour valoriser les gains
  const scaled = Math.round(Math.pow(ratio, 0.7) * 100);
  return Math.min(100, Math.max(15, scaled));
}

/**
 * Calcule le score de Record / Vitesse (0 à 100)
 */
function computeRecordScore(p: Partant, discipline: string): number {
  const rawRec = (p.record || (p as any).reductionKilometrique || '').toString().trim();
  
  // Si record chrono présent (ex: 1'12"4 ou 1.12.4)
  if (rawRec && rawRec !== '-' && rawRec !== 'Inconnu') {
    const match = rawRec.match(/(\d+)['\.](\d+)["\.]?(\d*)/);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const tenth = match[3] ? parseInt(match[3], 10) : 0;
      const totalSec = min * 60 + sec + tenth / 10;
      
      // Référence standard Trot : 1'10" = 100pts, 1'16" = 30pts
      if (min === 1) {
        const score = Math.round(100 - (totalSec - 70) * 11.5);
        return Math.min(100, Math.max(20, score));
      }
    }
  }

  // Fallback déterministe via la cote et le score global
  const cote = p.coteProbable ? Number(p.coteProbable) : 15;
  const baseFromOdds = Math.round(100 - Math.min(80, cote * 1.8));
  return Math.min(100, Math.max(20, baseFromOdds));
}

/**
 * Calcule le score de Régularité (0 à 100)
 */
function computeRegulariteScore(p: Partant): number {
  if (p.regularitePourcent !== undefined && p.regularitePourcent !== null && !isNaN(Number(p.regularitePourcent))) {
    return Math.min(100, Math.max(15, Math.round(Number(p.regularitePourcent))));
  }

  const ecart = calculerEcartEtForme(p.musique || '');
  if (ecart.totalRacesRecorded > 0) {
    return Math.min(100, Math.max(15, Math.round(ecart.tauxPodium)));
  }

  const places = (p.musique || '').replace(/[^0-9]/g, '').split('').map(Number);
  if (places.length > 0) {
    const top3 = places.filter(n => n >= 1 && n <= 3).length;
    return Math.min(100, Math.max(15, Math.round((top3 / places.length) * 100)));
  }

  return 50;
}

/**
 * Calcule le score de Valeur V38 (0 à 100)
 */
function computeValeurV38Score(p: Partant, v38Result: ReturnType<typeof computeV38Hierarchy>): number {
  const num = Number(p.numero);
  
  // Rangs dans la hiérarchie V38
  const baseIdx = v38Result.basesSolides.findIndex(h => Number(h.numero) === num);
  if (baseIdx !== -1) {
    return baseIdx === 0 ? 98 : 93;
  }

  const chanceIdx = v38Result.chancesSerieuses.findIndex(h => Number(h.numero) === num);
  if (chanceIdx !== -1) {
    return 88 - chanceIdx * 4; // 88, 84, 80, 76
  }

  const tocardIdx = v38Result.tocardsSpeculatifs.findIndex(h => Number(h.numero) === num);
  if (tocardIdx !== -1) {
    return 70 - tocardIdx * 4; // 70, 66, 62
  }

  const surpriseIdx = v38Result.surprises.findIndex(h => Number(h.numero) === num);
  if (surpriseIdx !== -1) {
    return 56 - surpriseIdx * 5; // 56, 51
  }

  // Délaissés
  const delaisseIdx = v38Result.delaisses.findIndex(h => Number(h.numero) === num);
  if (delaisseIdx !== -1) {
    return Math.max(15, 42 - delaisseIdx * 3);
  }

  const odds = getHorseGenyOdds(p);
  return Math.min(100, Math.max(15, Math.round(100 - odds * 1.5)));
}

export const RadarPerformanceChart: React.FC<RadarPerformanceChartProps> = ({
  course,
  selectedHorseNumbers = [],
  onSelectHorseForTicket,
  className = '',
}) => {
  const activePartants = useMemo(() => {
    return (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');
  }, [course.partants]);

  const maxGainsInField = useMemo(() => {
    return Math.max(...activePartants.map((p) => Number(p.gains) || 0), 10000);
  }, [activePartants]);

  const v38Hierarchy = useMemo(() => {
    return computeV38Hierarchy(course);
  }, [course]);

  // Calcul des métriques pour chaque partant
  const horsesMap = useMemo(() => {
    const map = new Map<number, {
      partant: Partant;
      musiqueScore: number;
      gainsScore: number;
      recordScore: number;
      regulariteScore: number;
      valeurV38Score: number;
      averageScore: number;
      hippoScore: number;
    }>();

    for (const p of activePartants) {
      const num = Number(p.numero);
      const mScore = computeMusiqueScore(p);
      const gScore = computeGainsScore(p, maxGainsInField);
      const rScore = computeRecordScore(p, course.discipline || 'Trot');
      const regScore = computeRegulariteScore(p);
      const vScore = computeValeurV38Score(p, v38Hierarchy);
      const avg = Math.round((mScore + gScore + rScore + regScore + vScore) / 5);
      const hScore = computePartantHippoScore(p, course);

      map.set(num, {
        partant: p,
        musiqueScore: mScore,
        gainsScore: gScore,
        recordScore: rScore,
        regulariteScore: regScore,
        valeurV38Score: vScore,
        averageScore: avg,
        hippoScore: hScore,
      });
    }

    return map;
  }, [activePartants, maxGainsInField, course, v38Hierarchy]);

  // Initialisation des chevaux comparés : priorité aux sélectionnés utilisateur, sinon top 3 de la Hiérarchie V38
  const defaultComparedNums = useMemo(() => {
    if (selectedHorseNumbers && selectedHorseNumbers.length >= 2) {
      return selectedHorseNumbers.slice(0, 4);
    }
    if (v38Hierarchy.selection11 && v38Hierarchy.selection11.length >= 3) {
      return v38Hierarchy.selection11.slice(0, 3).map(p => Number(p.numero));
    }
    return activePartants.slice(0, 3).map(p => Number(p.numero));
  }, [selectedHorseNumbers, v38Hierarchy, activePartants]);

  const [comparedNums, setComparedNums] = useState<number[]>(defaultComparedNums);

  // Synchroniser quand la sélection externe change significativement
  React.useEffect(() => {
    if (selectedHorseNumbers && selectedHorseNumbers.length >= 2) {
      setComparedNums(selectedHorseNumbers.slice(0, 5));
    }
  }, [selectedHorseNumbers]);

  const toggleComparedHorse = (num: number) => {
    if (comparedNums.includes(num)) {
      if (comparedNums.length <= 1) return; // Garder au moins 1 cheval
      setComparedNums(comparedNums.filter(n => n !== num));
    } else {
      if (comparedNums.length >= 5) {
        // Remplacer le dernier pour garder max 5
        setComparedNums([...comparedNums.slice(1), num]);
      } else {
        setComparedNums([...comparedNums, num]);
      }
    }
  };

  const applyPreset = (preset: 'BASES' | 'TOP5' | 'OUTSIDERS' | 'SELECTED') => {
    if (preset === 'BASES') {
      const nums = v38Hierarchy.basesSolides.map(p => Number(p.numero));
      if (nums.length > 0) setComparedNums(nums);
    } else if (preset === 'TOP5') {
      const nums = v38Hierarchy.selection11.slice(0, 5).map(p => Number(p.numero));
      if (nums.length > 0) setComparedNums(nums);
    } else if (preset === 'OUTSIDERS') {
      const nums = v38Hierarchy.tocardsSpeculatifs.map(p => Number(p.numero));
      if (nums.length > 0) setComparedNums(nums);
    } else if (preset === 'SELECTED') {
      if (selectedHorseNumbers.length > 0) {
        setComparedNums(selectedHorseNumbers.slice(0, 5));
      }
    }
  };

  // Construction des données pour le radarRecharts sur les 5 dimensions
  const radarData: RadarCriterionScore[] = useMemo(() => {
    const dimensions = [
      { key: 'musiqueScore', label: 'Musique', shortLabel: 'Musique' },
      { key: 'gainsScore', label: 'Gains', shortLabel: 'Gains' },
      { key: 'recordScore', label: 'Record', shortLabel: 'Record' },
      { key: 'regulariteScore', label: 'Régularité', shortLabel: 'Régularité' },
      { key: 'valeurV38Score', label: 'Valeur V38', shortLabel: 'Valeur V38' },
    ];

    return dimensions.map(dim => {
      const item: RadarCriterionScore = {
        criterion: dim.label,
        shortLabel: dim.shortLabel,
      };

      comparedNums.forEach(num => {
        const metrics = horsesMap.get(num);
        if (metrics) {
          item[`horse_${num}`] = (metrics as any)[dim.key] || 0;
        }
      });

      return item;
    });
  }, [comparedNums, horsesMap]);

  return (
    <div className={`p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-5 ${className}`}>
      {/* En-tête du composant */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Radar de Performance Multi-Critères V38</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-black uppercase tracking-wider">
                5 Critères Clés
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Confrontation géométrique des partants sur : <strong className="text-slate-200">Musique</strong>, <strong className="text-slate-200">Gains</strong>, <strong className="text-slate-200">Record</strong>, <strong className="text-slate-200">Régularité</strong> et <strong className="text-amber-300">Valeur V38</strong>.
          </p>
        </div>

        {/* Boutons de pré-sélection rapide */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 px-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Presets :
          </span>
          <button
            type="button"
            onClick={() => applyPreset('BASES')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            title="Comparer les Bases V38"
          >
            Bases ({v38Hierarchy.basesSolides.length})
          </button>
          <button
            type="button"
            onClick={() => applyPreset('TOP5')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
            title="Comparer le Top 5 Quinté+ V38"
          >
            Top 5 V38
          </button>
          <button
            type="button"
            onClick={() => applyPreset('OUTSIDERS')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
            title="Comparer les Tocards Spéculatifs"
          >
            Tocards ({v38Hierarchy.tocardsSpeculatifs.length})
          </button>
          {selectedHorseNumbers.length >= 2 && (
            <button
              type="button"
              onClick={() => applyPreset('SELECTED')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 transition-all cursor-pointer"
              title="Comparer ma sélection personnalisée"
            >
              Ma Sélection ({Math.min(5, selectedHorseNumbers.length)})
            </button>
          )}
        </div>
      </div>

      {/* Sélecteur interactif des partants à comparer (Chips cliquables) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
          <span>Cliquez pour activer/désactiver un cheval (jusqu'à 5 chevaux simultanément) :</span>
          <span className="text-amber-400 font-mono">{comparedNums.length} / 5 sélectionnés</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
          {activePartants.map((p) => {
            const num = Number(p.numero);
            const isSelected = comparedNums.includes(num);
            const colorIdx = comparedNums.indexOf(num);
            const colorConfig = isSelected && colorIdx >= 0 ? HORSE_COLORS[colorIdx % HORSE_COLORS.length] : null;

            return (
              <button
                key={`radar-chip-${num}`}
                type="button"
                onClick={() => toggleComparedHorse(num)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95 ${
                  isSelected && colorConfig
                    ? `${colorConfig.bg} ${colorConfig.border} ring-2 ring-white/20 shadow-md`
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
                title={`N°${p.numero} ${p.nom} (Cote: ${p.coteProbable || '?'}/1)`}
              >
                <span className="font-mono">N°{num}</span>
                <span className="truncate max-w-[80px] sm:max-w-[100px] text-[11px]">{p.nom}</span>
                {isSelected && (
                  <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone du Graphique Radar Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 h-[340px] sm:h-[380px] w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#334155" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="criterion"
                tick={{ fill: '#f1f5f9', fontSize: 12, fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-3 bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl space-y-1.5 min-w-[200px]">
                        <div className="text-xs font-black text-amber-400 border-b border-slate-800 pb-1">
                          Critère : {label} (sur 100)
                        </div>
                        {payload.map((entry: any, index: number) => {
                          const num = comparedNums[index];
                          const horse = horsesMap.get(num)?.partant;
                          const val = entry.value;
                          const colorObj = HORSE_COLORS[index % HORSE_COLORS.length];
                          return (
                            <div key={`tooltip-${index}`} className="flex items-center justify-between text-xs gap-2">
                              <span className="flex items-center gap-1.5 font-bold" style={{ color: colorObj.stroke }}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorObj.stroke }}></span>
                                <span>N°{num} {horse?.nom}</span>
                              </span>
                              <span className="font-mono font-black text-white bg-slate-800 px-1.5 py-0.5 rounded">
                                {val}/100
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {comparedNums.map((num, idx) => {
                const colorConfig = HORSE_COLORS[idx % HORSE_COLORS.length];
                const horse = horsesMap.get(num)?.partant;
                return (
                  <Radar
                    key={`radar-series-${num}`}
                    name={`N°${num} ${horse?.nom || ''}`}
                    dataKey={`horse_${num}`}
                    stroke={colorConfig.stroke}
                    fill={colorConfig.fill}
                    fillOpacity={colorConfig.fillOpacity}
                    strokeWidth={2.5}
                  />
                );
              })}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Panneau latéral : Fiches comparatives des chevaux affichés */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          <div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
            <span>Détail des 5 Critères</span>
            <span className="text-[10px] text-slate-500 font-normal">Score global /100</span>
          </div>

          {comparedNums.map((num, idx) => {
            const metrics = horsesMap.get(num);
            if (!metrics) return null;
            const p = metrics.partant;
            const colorConfig = HORSE_COLORS[idx % HORSE_COLORS.length];

            return (
              <div
                key={`compared-card-${num}`}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2 relative overflow-hidden"
              >
                {/* Barre indicatrice couleur */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: colorConfig.stroke }}
                />

                <div className="flex items-center justify-between pl-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-md font-mono font-black text-xs flex items-center justify-center ${colorConfig.bg}`}
                    >
                      {num}
                    </span>
                    <div>
                      <div className="font-extrabold text-white text-xs leading-tight">{p.nom}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.driver} · Cote {p.coteProbable ? `${p.coteProbable}/1` : 'NC'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-black text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      {metrics.averageScore}<span className="text-[10px] text-slate-400">/100</span>
                    </div>
                  </div>
                </div>

                {/* 5 Critères détaillés en mini barres */}
                <div className="grid grid-cols-5 gap-1 pt-1 border-t border-slate-900 pl-1.5 text-[9px]">
                  <div className="bg-slate-900/90 p-1 rounded border border-slate-800/80 text-center">
                    <div className="text-slate-400 font-bold">Musique</div>
                    <div className="font-mono font-black text-slate-100">{metrics.musiqueScore}</div>
                  </div>
                  <div className="bg-slate-900/90 p-1 rounded border border-slate-800/80 text-center">
                    <div className="text-slate-400 font-bold">Gains</div>
                    <div className="font-mono font-black text-slate-100">{metrics.gainsScore}</div>
                  </div>
                  <div className="bg-slate-900/90 p-1 rounded border border-slate-800/80 text-center">
                    <div className="text-slate-400 font-bold">Record</div>
                    <div className="font-mono font-black text-slate-100">{metrics.recordScore}</div>
                  </div>
                  <div className="bg-slate-900/90 p-1 rounded border border-slate-800/80 text-center">
                    <div className="text-slate-400 font-bold">Régul.</div>
                    <div className="font-mono font-black text-slate-100">{metrics.regulariteScore}</div>
                  </div>
                  <div className="bg-amber-950/30 p-1 rounded border border-amber-500/30 text-center">
                    <div className="text-amber-400 font-bold">V38</div>
                    <div className="font-mono font-black text-amber-300">{metrics.valeurV38Score}</div>
                  </div>
                </div>

                {onSelectHorseForTicket && (
                  <button
                    type="button"
                    onClick={() => onSelectHorseForTicket(num)}
                    className="w-full mt-1 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Ajouter N°{num} au ticket</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
