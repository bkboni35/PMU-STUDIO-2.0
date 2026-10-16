import { CourseHippique } from '../types/turf';
import { HistoryCourseItem, getRaceHistory, safeSetItemWithQuotaHandling } from './favoritesStorage';

export interface RaceEvaluationItem {
  num: number;
  rankArrival: number;
  nom: string;
  driver?: string;
  cote?: number;
  inSelection: boolean;
  selRank: number | null;
  isBase: boolean;
  isSecondeBase: boolean;
  isOutsider: boolean;
  isTocard: boolean;
}

export interface RaceEvaluationResult {
  arrivee: string;
  arriveeNums: number[];
  top5: number[];
  top7: number[];
  selection8: number[];
  presentInSelection: number;
  totalChecked: number;
  tauxReussitePct: number;
  isQuinteOrdre: boolean;
  isQuinteDesordre: boolean;
  isQuarte: boolean;
  isTierce: boolean;
  isMulti4: boolean;
  isMulti5: boolean;
  isMulti6: boolean;
  isMulti7: boolean;
  isCoupleGagnant: boolean;
  isCouplePlace: boolean;
  isBase1Podium: boolean;
  isBase2Podium: boolean;
  badgeType: string;
  badgeColor: string;
  gainEstimePoints: number;
  summaryText: string;
  evaluatedAt: string;
  details: RaceEvaluationItem[];
}

export interface BacktestGlobalStats {
  totalCoursesEvaluees: number;
  quinteOrdreCount: number;
  quinteDesordreCount: number;
  quarteCount: number;
  tierceCount: number;
  basesPodiumCount: number;
  tauxReussiteMoyenPct: number;
  totalPointsGagnes: number;
  dernierCalcul: string;
}

export const BACKTEST_STATS_STORAGE_KEY = 'hippo_backtest_global_stats';

/**
 * Calcule l'évaluation algorithmique et comparative d'un pronostic face à l'arrivée officielle définitive.
 * Évalue : Quinté+ (Ordre & Désordre), Quarté+, Tiercé, Multi, Couplé, Bases dans les 3 premiers et Taux de Réussite.
 */
export function computeRaceEvaluation(
  course: CourseHippique,
  arrivalStr?: string
): RaceEvaluationResult | null {
  const rawArrival = (arrivalStr || course.arriveeOfficielle || '').trim();
  if (!rawArrival) return null;

  const arrivalNums = rawArrival
    .split(/[-,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  if (arrivalNums.length === 0) return null;

  const top5 = arrivalNums.slice(0, 5);
  const top7 = arrivalNums.slice(0, 7);

  const selection8 = Array.isArray(course.synthese?.selection8)
    ? course.synthese.selection8
    : [];

  const base1 = course.synthese?.baseIncontournable;
  const base2 = course.synthese?.secondeBase;
  const outsiders = course.synthese?.outsiders || [];
  const tocards = course.synthese?.tocards || [];

  const details: RaceEvaluationItem[] = top7.map((num, idx) => {
    const rankArrival = idx + 1;
    const inSelection = selection8.includes(num);
    const selRank = inSelection ? selection8.indexOf(num) + 1 : null;
    const isBase = Boolean(base1 && num === base1);
    const isSecondeBase = Boolean(base2 && num === base2);
    const isOutsider = outsiders.includes(num);
    const isTocard = tocards.includes(num);

    const horseInfo = course.partants?.find((p) => p.numero === num);

    return {
      num,
      rankArrival,
      nom: horseInfo?.nom || `N°${num}`,
      driver: horseInfo?.driver || '',
      cote: horseInfo?.coteProbable,
      inSelection,
      selRank,
      isBase,
      isSecondeBase,
      isOutsider,
      isTocard,
    };
  });

  const presentInTop5 = details.slice(0, 5).filter((d) => d.inSelection).length;
  const presentInSelection = details.filter((d) => d.inSelection).length;
  const totalChecked = Math.min(7, top7.length);
  const tauxReussitePct = Math.round((presentInSelection / (totalChecked || 1)) * 100);

  // Vérification Quinté+ Ordre & Désordre
  const isQuinteDesordre = top5.length === 5 && top5.every((n) => selection8.includes(n));
  const isQuinteOrdre =
    isQuinteDesordre &&
    top5.every((n, i) => selection8[i] === n);

  // Vérification Quarté & Tiercé
  const top4 = arrivalNums.slice(0, 4);
  const isQuarte = top4.length === 4 && top4.every((n) => selection8.includes(n));

  const top3 = arrivalNums.slice(0, 3);
  const isTierce = top3.length === 3 && top3.every((n) => selection8.includes(n));

  // Multi 4, 5, 6, 7
  const isMulti4 = isQuarte && selection8.slice(0, 4).every((n) => top4.includes(n));
  const isMulti5 = isQuarte && selection8.slice(0, 5).filter((n) => top4.includes(n)).length === 4;
  const isMulti6 = isQuarte && selection8.slice(0, 6).filter((n) => top4.includes(n)).length === 4;
  const isMulti7 = isQuarte && selection8.slice(0, 7).filter((n) => top4.includes(n)).length === 4;

  // Couplé Gagnant (les 2 premiers) & Placé (2 parmi les 3 premiers)
  const isCoupleGagnant =
    arrivalNums.length >= 2 &&
    selection8.includes(arrivalNums[0]) &&
    selection8.includes(arrivalNums[1]);

  const couplePlaceHitCount = top3.filter((n) => selection8.includes(n)).length;
  const isCouplePlace = couplePlaceHitCount >= 2;

  // Bases dans le podium
  const isBase1Podium = Boolean(base1 && top3.includes(base1));
  const isBase2Podium = Boolean(base2 && top3.includes(base2));

  // Attribution du badge & couleur
  let badgeType = 'Évaluation Post-Course Réalisée';
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let gainEstimePoints = 0;
  let summaryText = '';

  if (isQuinteOrdre) {
    badgeType = '🏆 QUINTÉ+ ORDRE DANS LA SÉLECTION !';
    badgeColor = 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-lg animate-pulse';
    gainEstimePoints = 1000;
    summaryText = `Performance Légendaire : Quinté+ dans l'Ordre exact (${top5.join('-')}) validé dans la sélection de 8 !`;
  } else if (isQuinteDesordre) {
    badgeType = '🥇 QUINTÉ+ DÉSORDRE EN 8 CHEVAUX !';
    badgeColor = 'bg-emerald-500 text-slate-950 font-black border-emerald-300 shadow-md';
    gainEstimePoints = 500;
    summaryText = `Succès Quinté+ : Les 5 premiers à l'arrivée (${top5.join('-')}) figurent tous dans la sélection !`;
  } else if (isQuarte) {
    badgeType = '🎯 QUARTÉ+ / MULTI VALIDÉ !';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    gainEstimePoints = 250;
    summaryText = `Quarté+ validé (${top4.join('-')}) dans la sélection de 8 chevaux.`;
  } else if (isTierce) {
    badgeType = '🥉 TIERCÉ / COUPLE CONFIRMÉ !';
    badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold';
    gainEstimePoints = 120;
    summaryText = `Tiercé gagnant (${top3.join('-')}) présent dans la sélection officielle.`;
  } else if (isCoupleGagnant || isBase1Podium) {
    badgeType = '⭐ BASE AU PODIUM / COUPLE GAGNANT';
    badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold';
    gainEstimePoints = 50;
    summaryText = `Base incontournable validée à l'arrivée ou Couplé gagnant confirmé.`;
  } else {
    badgeType = `📊 BILAN POST-COURSE (${presentInSelection}/7)`;
    badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
    gainEstimePoints = presentInSelection * 10;
    summaryText = `${presentInSelection} chevaux sur les 7 premiers détectés dans la synthèse (${tauxReussitePct}%).`;
  }

  return {
    arrivee: rawArrival,
    arriveeNums: arrivalNums,
    top5,
    top7,
    selection8,
    presentInSelection,
    totalChecked,
    tauxReussitePct,
    isQuinteOrdre,
    isQuinteDesordre,
    isQuarte,
    isTierce,
    isMulti4,
    isMulti5,
    isMulti6,
    isMulti7,
    isCoupleGagnant,
    isCouplePlace,
    isBase1Podium,
    isBase2Podium,
    badgeType,
    badgeColor,
    gainEstimePoints,
    summaryText,
    evaluatedAt: new Date().toISOString(),
    details,
  };
}

/**
 * Met à jour le backtest historique local avec l'arrivée officielle et l'évaluation calculée,
 * recalcule les statistiques globales du modèle et déclenche l'événement window hippo_backtest_updated.
 */
export function updateBacktestWithArrival(
  course: CourseHippique,
  arrivalStr: string,
  providedEvaluation?: RaceEvaluationResult | null
): {
  updatedHistory: HistoryCourseItem[];
  evaluation: RaceEvaluationResult | null;
  stats: BacktestGlobalStats;
} {
  const evalResult = providedEvaluation || computeRaceEvaluation(course, arrivalStr);

  let history = getRaceHistory();
  const idOrUrl = course.id || course.sourceUrl || '';

  const enrichedCourse: CourseHippique = {
    ...course,
    arriveeOfficielle: arrivalStr,
    statutCourse: 'Arrivée officielle',
    cotesScellees: true,
    evaluationPostCourse: evalResult || undefined,
  };
  (enrichedCourse as any).statutArrivee = 'officielle';
  (enrichedCourse as any).donneesFigees = true;

  // 1. Mettre à jour l'entrée existante dans l'historique de backtest ou l'ajouter
  let itemFound = false;
  history = history.map((item) => {
    if (
      (idOrUrl && (item.id === idOrUrl || item.course.id === idOrUrl || item.course.sourceUrl === idOrUrl)) ||
      (course.reunion === item.course.reunion && course.course === item.course.course)
    ) {
      itemFound = true;
      return {
        ...item,
        analyzedAt: item.analyzedAt || Date.now(),
        course: enrichedCourse,
      };
    }
    return item;
  });

  if (!itemFound) {
    history = [
      {
        id: idOrUrl || `hist_${Date.now()}`,
        analyzedAt: Date.now(),
        course: enrichedCourse,
      },
      ...history,
    ].slice(0, 50);
  }

  // Sauvegarder dans localStorage
  safeSetItemWithQuotaHandling('hippo_analysis_history', history, 30);

  // 2. Recalculer les statistiques consolidées du backtest
  const stats = recalculateBacktestGlobalStats(history);

  // 3. Diffuser l'événement système de mise à jour du backtest
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('hippo_backtest_updated', {
          detail: {
            courseId: idOrUrl,
            evaluation: evalResult,
            stats,
            timestamp: Date.now(),
          },
        })
      );
    } catch {}
  }

  return {
    updatedHistory: history,
    evaluation: evalResult,
    stats,
  };
}

/**
 * Calcule les métriques globales de performance (Backtest) sur toutes les courses historisées
 */
export function recalculateBacktestGlobalStats(historyItems?: HistoryCourseItem[]): BacktestGlobalStats {
  const items = historyItems || getRaceHistory();
  let totalEvaluated = 0;
  let quinteOrdreCount = 0;
  let quinteDesordreCount = 0;
  let quarteCount = 0;
  let tierceCount = 0;
  let basesPodiumCount = 0;
  let sumRates = 0;
  let totalPoints = 0;

  for (const item of items) {
    const c = item.course;
    if (!c || !c.arriveeOfficielle) continue;

    const evaluation = c.evaluationPostCourse || computeRaceEvaluation(c, c.arriveeOfficielle);
    if (!evaluation) continue;

    totalEvaluated += 1;
    if (evaluation.isQuinteOrdre) quinteOrdreCount += 1;
    if (evaluation.isQuinteDesordre) quinteDesordreCount += 1;
    if (evaluation.isQuarte) quarteCount += 1;
    if (evaluation.isTierce) tierceCount += 1;
    if (evaluation.isBase1Podium || evaluation.isBase2Podium) basesPodiumCount += 1;
    sumRates += evaluation.tauxReussitePct;
    totalPoints += evaluation.gainEstimePoints || 0;
  }

  const avgRate = totalEvaluated > 0 ? Math.round(sumRates / totalEvaluated) : 0;

  const stats: BacktestGlobalStats = {
    totalCoursesEvaluees: totalEvaluated,
    quinteOrdreCount,
    quinteDesordreCount,
    quarteCount,
    tierceCount,
    basesPodiumCount,
    tauxReussiteMoyenPct: avgRate,
    totalPointsGagnes: totalPoints,
    dernierCalcul: new Date().toISOString(),
  };

  try {
    localStorage.setItem(BACKTEST_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {}

  return stats;
}

/**
 * Récupère les métriques de backtest stockées en cache local
 */
export function getBacktestGlobalStats(): BacktestGlobalStats {
  try {
    const raw = localStorage.getItem(BACKTEST_STATS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return recalculateBacktestGlobalStats();
}
