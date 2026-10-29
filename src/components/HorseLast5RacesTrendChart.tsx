import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Trophy, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import { Partant } from '../types/turf';

export interface RaceFinishPoint {
  token: string;
  orderIndex: number; // 1 to 5 (1 = C-5 oldest, 5 = C-1 most recent)
  labelCourse: string; // e.g. "C-1 (Dernière)", "C-2", etc.
  rank: number; // 1 = 1er, 2 = 2e, etc. 10 = non placé, 11 = disqualifié/incident
  score: number; // 0 to 100 (Higher is better)
  badgeText: string;
  isWin: boolean;
  isPodium: boolean;
  isDisqualified: boolean;
  isIncident: boolean;
  discipline: string;
}

export type TrendDirection = 'ascendante' | 'descendante' | 'top_stable' | 'stable' | 'insuffisant';

export interface Horse5RacesAnalysis {
  points: RaceFinishPoint[]; // Chronological: [C-5 -> C-4 -> C-3 -> C-2 -> C-1]
  trend: TrendDirection;
  trendSlope: number; // Positive = improving, negative = declining
  trendLabel: string;
  trendDescription: string;
  trendColorClass: string;
  trendBadgeStyle: string;
  arrowIcon: 'up' | 'down' | 'flat';
  avgScore: number;
  recentScore: number; // Score of C-1
  oldestScore: number; // Score of C-5 or oldest available
  winCount: number;
  podiumCount: number;
  rawMusique: string;
}

/**
 * Analyse chronologique des 5 dernières courses à partir de la musique officielle
 * Dans la notation PMU, le token le plus à gauche est la course la plus récente (C-1).
 * Pour tracer la courbe temporelle (passé -> présent), on inverse la liste pour avoir C-5 à gauche et C-1 à droite.
 */
export function analyzeHorseLast5Races(musiqueStr?: string): Horse5RacesAnalysis {
  const rawMusique = (musiqueStr || '').trim();

  if (!rawMusique || rawMusique === '?' || rawMusique === 'Inconnu' || rawMusique.toLowerCase() === 'inédit') {
    return {
      points: [],
      trend: 'insuffisant',
      trendSlope: 0,
      trendLabel: 'Inédit / N/A',
      trendDescription: 'Aucune performance officielle antérieure enregistrée',
      trendColorClass: 'text-slate-400 border-slate-700 bg-slate-900',
      trendBadgeStyle: 'bg-slate-800 text-slate-400 border-slate-700',
      arrowIcon: 'flat',
      avgScore: 0,
      recentScore: 0,
      oldestScore: 0,
      winCount: 0,
      podiumCount: 0,
      rawMusique,
    };
  }

  // Nettoyage des années entre parenthèses courantes dans les musiques hippiques, ex: (24) ou (23)
  const cleanMusique = rawMusique.replace(/\(\d{2,4}\)/g, ' ');
  // Extraction robuste des tokens de musique (1a, 2p, Da, 0m, etc.)
  const regex = /(\b\d+[ampchso]?\b|\b[DATRdatr][ampchso]?\b|[0-9]+[a-z]?|(?:DA|DM|DP|DH|DS|DC|DISQ|DIS|TH|AH|TS|AS|TA|AA|D|A|T|R)[a-z]?)/gi;
  const matches = cleanMusique.match(regex) || [];

  if (matches.length === 0) {
    return {
      points: [],
      trend: 'insuffisant',
      trendSlope: 0,
      trendLabel: 'Non disponible',
      trendDescription: 'Musique sans résultats exploitables',
      trendColorClass: 'text-slate-400 border-slate-700 bg-slate-900',
      trendBadgeStyle: 'bg-slate-800 text-slate-400 border-slate-700',
      arrowIcon: 'flat',
      avgScore: 0,
      recentScore: 0,
      oldestScore: 0,
      winCount: 0,
      podiumCount: 0,
      rawMusique,
    };
  }

  // On prend au maximum les 5 courses les plus récentes (index 0 = la plus récente)
  const recentTokens = matches.slice(0, 5);

  // Conversion en points individuels
  const parsedDesc = recentTokens.map((token, idx) => {
    const tUpper = token.toUpperCase();
    const isDisq = tUpper.startsWith('D') || ['DIS', 'DISQ', 'DA', 'DM', 'DP', 'DH', 'DS', 'DC'].some((c) => tUpper.includes(c));
    const isInc = (tUpper.startsWith('T') && !/^T\d/.test(tUpper)) ||
                  (tUpper.startsWith('A') && !/^A\d/.test(tUpper)) ||
                  (tUpper.startsWith('R') && !/^R\d/.test(tUpper)) ||
                  ['TH', 'AH', 'TS', 'AS', 'TA', 'AA'].some((c) => tUpper.includes(c));

    let rank = 10;
    let score = 5; // Défaut non placé
    let badgeText = token;
    let discipline = 'attelé';

    const discChar = token.slice(-1).toLowerCase();
    if (discChar === 'a') discipline = 'Trot Attelé';
    else if (discChar === 'm') discipline = 'Trot Monté';
    else if (discChar === 'p') discipline = 'Plat';
    else if (discChar === 'h') discipline = 'Haies';
    else if (discChar === 's') discipline = 'Steeple';
    else if (discChar === 'c') discipline = 'Cross';

    if (isDisq) {
      rank = 11;
      score = 0;
      badgeText = 'Dai';
    } else if (isInc) {
      rank = 11;
      score = 0;
      badgeText = tUpper.startsWith('T') ? 'Tb' : tUpper.startsWith('A') ? 'Arr' : 'Rét';
    } else {
      const numMatch = token.match(/^(\d+)/);
      if (numMatch) {
        rank = parseInt(numMatch[1], 10);
        if (rank === 0) {
          rank = 10;
          score = 5;
          badgeText = '0';
        } else if (rank === 1) {
          score = 100;
          badgeText = '1er';
        } else if (rank === 2) {
          score = 85;
          badgeText = '2e';
        } else if (rank === 3) {
          score = 70;
          badgeText = '3e';
        } else if (rank === 4) {
          score = 55;
          badgeText = '4e';
        } else if (rank === 5) {
          score = 42;
          badgeText = '5e';
        } else if (rank === 6) {
          score = 30;
          badgeText = '6e';
        } else if (rank === 7) {
          score = 20;
          badgeText = '7e';
        } else if (rank === 8) {
          score = 14;
          badgeText = '8e';
        } else if (rank === 9) {
          score = 8;
          badgeText = '9e';
        } else {
          score = 5;
          badgeText = `${rank}e`;
        }
      }
    }

    const labelCourse = idx === 0 ? 'C-1 (Dernière)' : `C-${idx + 1}`;

    return {
      token,
      orderIndex: idx, // temporaire
      labelCourse,
      rank,
      score,
      badgeText,
      isWin: rank === 1,
      isPodium: rank >= 1 && rank <= 3,
      isDisqualified: isDisq,
      isIncident: isInc,
      discipline,
    };
  });

  // Pour afficher sur un graphique chronologique (gauche = plus ancien, droite = plus récent),
  // on inverse le tableau : [C-5, C-4, C-3, C-2, C-1]
  const chronologicalPoints: RaceFinishPoint[] = [...parsedDesc].reverse().map((p, idx) => ({
    ...p,
    orderIndex: idx + 1,
  }));

  const n = chronologicalPoints.length;
  const recentPoint = chronologicalPoints[n - 1]; // C-1 (plus récent)
  const oldestPoint = chronologicalPoints[0];     // Plus ancien du lot de 5

  const winCount = chronologicalPoints.filter((p) => p.isWin).length;
  const podiumCount = chronologicalPoints.filter((p) => p.isPodium).length;
  const avgScore = Math.round(chronologicalPoints.reduce((acc, p) => acc + p.score, 0) / n);

  // Calcul de la tendance de forme (Pente de régression linéaire simplifiée sur les scores)
  let trendSlope = 0;
  if (n >= 2) {
    // Calcul de la pente : somme((x - x_mean)*(y - y_mean)) / somme((x - x_mean)^2)
    const xMean = (n - 1) / 2;
    const yMean = avgScore;
    let numerator = 0;
    let denominator = 0;

    chronologicalPoints.forEach((p, i) => {
      const xDiff = i - xMean;
      const yDiff = p.score - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    });

    trendSlope = denominator !== 0 ? Math.round((numerator / denominator) * 10) / 10 : 0;
  }

  // Différence entre les 2 courses les plus récentes et les plus anciennes
  const recentTwoAvg = n >= 2 ? (chronologicalPoints[n - 1].score + chronologicalPoints[n - 2].score) / 2 : recentPoint.score;
  const olderAvg = n >= 4 
    ? (chronologicalPoints[0].score + chronologicalPoints[1].score) / 2 
    : oldestPoint.score;
  const recentDiff = recentTwoAvg - olderAvg;

  let trend: TrendDirection = 'stable';
  let trendLabel = 'Stable / Régulière';
  let trendDescription = 'Performances d’un niveau homogène sur les dernières sorties';
  let trendColorClass = 'text-sky-300 border-sky-500/40 bg-sky-950/40';
  let trendBadgeStyle = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  let arrowIcon: 'up' | 'down' | 'flat' = 'flat';

  // Si le cheval est constamment sur le podium (Top régularité d'élite)
  if (podiumCount >= 3 && avgScore >= 65 && recentPoint.isPodium) {
    trend = 'top_stable';
    trendLabel = '★ Au Top';
    trendDescription = `Excellente régularité au plus haut niveau (${podiumCount} podiums sur les 5 dernières courses)`;
    trendColorClass = 'text-amber-300 border-amber-400 bg-amber-950/60';
    trendBadgeStyle = 'bg-amber-500/25 text-amber-300 border-amber-400/60 ring-1 ring-amber-400/30';
    arrowIcon = 'up';
  } else if (trendSlope >= 4.5 || (recentDiff >= 20 && recentPoint.isPodium)) {
    trend = 'ascendante';
    trendLabel = '↗ Ascendante';
    trendDescription = 'Nette montée en puissance : les résultats récents sont en forte progression';
    trendColorClass = 'text-emerald-300 border-emerald-400 bg-emerald-950/60';
    trendBadgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-xs shadow-emerald-500/20';
    arrowIcon = 'up';
  } else if (trendSlope <= -4.5 || (recentDiff <= -20 && (recentPoint.rank >= 6 || recentPoint.isDisqualified))) {
    trend = 'descendante';
    trendLabel = '↘ Descendante';
    trendDescription = 'Forme en régression : baisse de rendement sur les sorties récentes';
    trendColorClass = 'text-rose-300 border-rose-500/50 bg-rose-950/60';
    trendBadgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs shadow-rose-500/20';
    arrowIcon = 'down';
  } else if (avgScore >= 50) {
    trend = 'stable';
    trendLabel = '→ Régulière';
    trendDescription = 'Niveau de performance satisfaisant et régulier';
    trendColorClass = 'text-teal-300 border-teal-500/40 bg-teal-950/40';
    trendBadgeStyle = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
    arrowIcon = 'flat';
  } else {
    trend = 'stable';
    trendLabel = '→ Neutre';
    trendDescription = 'Performances moyennes ou en dents de scie';
    trendColorClass = 'text-slate-300 border-slate-700 bg-slate-900';
    trendBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
    arrowIcon = 'flat';
  }

  return {
    points: chronologicalPoints,
    trend,
    trendSlope,
    trendLabel,
    trendDescription,
    trendColorClass,
    trendBadgeStyle,
    arrowIcon,
    avgScore,
    recentScore: recentPoint.score,
    oldestScore: oldestPoint.score,
    winCount,
    podiumCount,
    rawMusique,
  };
}

interface HorseLast5RacesTrendChartProps {
  partant: Partant;
  compact?: boolean;
  onOpenDecoder?: (musique: string, nom: string) => void;
}

export const HorseLast5RacesTrendChart: React.FC<HorseLast5RacesTrendChartProps> = ({
  partant,
  compact = false,
  onOpenDecoder,
}) => {
  const analysis = useMemo(() => {
    return analyzeHorseLast5Races(partant.musique);
  }, [partant.musique]);

  const { points, trend, trendLabel, trendDescription, trendBadgeStyle, arrowIcon } = analysis;

  if (points.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
        <Minus className="w-3 h-3 text-slate-500" />
        <span>Inédit / N/A</span>
      </div>
    );
  }

  // Dimensions SVG Sparkline
  const width = compact ? 110 : 135;
  const height = compact ? 26 : 32;
  const paddingX = 8;
  const paddingY = 5;

  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  // Calcul des coordonnées SVG pour chaque point
  const coords = points.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, points.length - 1)) * innerW;
    // Y inversé : score 100 = haut (paddingY), score 0 = bas (height - paddingY)
    const y = paddingY + innerH - (p.score / 100) * innerH;
    return { ...p, x, y };
  });

  // Construction de la ligne SVG
  const linePath = coords.reduce((acc, c, idx) => {
    return idx === 0 ? `M ${c.x.toFixed(1)} ${c.y.toFixed(1)}` : `${acc} L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }, '');

  // Construction de l'aire sous la courbe
  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - paddingY} L ${coords[0].x.toFixed(1)} ${height - paddingY} Z`
    : '';

  // Couleurs de courbe selon la tendance
  const strokeColor =
    trend === 'ascendante'
      ? '#10b981' // Vert émeraude
      : trend === 'descendante'
      ? '#f43f5e' // Rose / Rouge
      : trend === 'top_stable'
      ? '#f59e0b' // Ambre or
      : '#38bdf8'; // Ciel

  const gradientId = `trendGrad-${partant.numero}-${Math.floor(Math.random() * 1000)}`;

  return (
    <div
      className="group relative inline-flex flex-col items-center gap-1 p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all select-none cursor-pointer"
      onClick={() => onOpenDecoder && onOpenDecoder(partant.musique || '', partant.nom)}
      title={`${partant.nom} : Forme ${trendLabel} — Cliquez pour ouvrir le décodeur complet`}
    >
      {/* Ligne Supérieure : Badge Tendance & Flèche */}
      <div className="flex items-center justify-between w-full gap-1 px-0.5">
        <span
          className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 border ${trendBadgeStyle}`}
        >
          {arrowIcon === 'up' && <TrendingUp className="w-2.5 h-2.5 stroke-[3]" />}
          {arrowIcon === 'down' && <TrendingDown className="w-2.5 h-2.5 stroke-[3]" />}
          {arrowIcon === 'flat' && <Minus className="w-2.5 h-2.5 stroke-[3]" />}
          <span>{trendLabel}</span>
        </span>

        <span className="text-[9px] font-mono font-bold text-slate-400">
          5c
        </span>
      </div>

      {/* SVG Sparkline de Performance */}
      <div className="relative flex items-center justify-center">
        <svg
          width={width}
          height={height}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Ligne médiane subtile (50% de performance) */}
          <line
            x1={paddingX}
            y1={paddingY + innerH / 2}
            x2={width - paddingX}
            y2={paddingY + innerH / 2}
            stroke="#334155"
            strokeDasharray="2 2"
            strokeWidth="0.8"
            opacity="0.6"
          />

          {/* Remplissage dégradé sous la courbe */}
          {areaPath && (
            <path d={areaPath} fill={`url(#${gradientId})`} />
          )}

          {/* Tracé de la ligne */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points sur chaque course */}
          {coords.map((c, i) => {
            const isLast = i === coords.length - 1;
            const dotColor = c.isWin
              ? '#fbbf24' // Or
              : c.isPodium
              ? '#34d399' // Vert clair
              : c.isDisqualified || c.isIncident
              ? '#fb7185' // Rose
              : '#94a3b8'; // Ardoise

            return (
              <g key={`dot-${i}`}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isLast ? 3.5 : 2.5}
                  fill={dotColor}
                  stroke="#020617"
                  strokeWidth={1.5}
                />
                {isLast && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={5.5}
                    fill="none"
                    stroke={dotColor}
                    strokeWidth={1}
                    opacity={0.6}
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Rangée des 5 pastilles ordonnées (Passé à gauche ➔ Course récente C-1 à droite) */}
      <div className="flex items-center justify-between w-full gap-0.5 px-0.5">
        {coords.map((c, i) => {
          const isLast = i === coords.length - 1;
          const bg = c.isWin
            ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-300'
            : c.isPodium
            ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40'
            : c.isDisqualified || c.isIncident
            ? 'bg-rose-950/90 text-rose-300 font-bold border border-rose-500/40'
            : 'bg-slate-900 text-slate-400 border border-slate-800';

          return (
            <span
              key={`token-${i}`}
              className={`px-1 py-0.2 rounded text-[8px] font-mono transition-transform ${bg} ${
                isLast ? 'scale-105 font-black ring-1 ring-emerald-400/50' : ''
              }`}
              title={`${c.labelCourse} : ${c.token} (${c.discipline})`}
            >
              {c.badgeText}
            </span>
          );
        })}
      </div>

      {/* Infobulle Tooltip détaillée au survol */}
      <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900/98 backdrop-blur-xl border-2 border-amber-500/60 rounded-2xl shadow-2xl z-50 text-left text-xs space-y-2">
        {/* Header infobulle */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
              {partant.numero}
            </span>
            <span className="font-black text-white text-xs truncate max-w-[140px]">
              {partant.nom}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${trendBadgeStyle}`}>
            {trendLabel}
          </span>
        </div>

        {/* Explication forme */}
        <p className="text-[11px] text-slate-300 leading-snug">
          {trendDescription}
        </p>

        {/* Détail des 5 courses (Ordre chronologique) */}
        <div className="space-y-1 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Course</span>
            <span>Résultat & Discipline</span>
          </div>
          {points.map((p, idx) => (
            <div
              key={`tip-${idx}`}
              className={`flex items-center justify-between p-1 rounded-lg text-[10px] font-mono ${
                idx === points.length - 1
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-slate-950/70 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-slate-400">{p.labelCourse} :</span>
                <span className="font-bold">{p.token}</span>
              </div>
              <span className={p.isWin ? 'text-amber-400 font-black' : p.isPodium ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {p.isWin ? '🏆 1er (Victoire)' : p.isPodium ? `🥇 Podium (${p.rank}e)` : p.isDisqualified ? '❌ Disqualifié' : p.badgeText} ({p.discipline})
              </span>
            </div>
          ))}
        </div>

        {/* Footer infobulle */}
        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>Score moyen : <strong className="text-amber-300">{analysis.avgScore}/100</strong></span>
          <span className="text-emerald-400 font-bold">Cliquez pour décodeur</span>
        </div>

        {/* Pointe de l'infobulle */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-4 border-transparent border-t-amber-500/80" />
      </div>
    </div>
  );
};
