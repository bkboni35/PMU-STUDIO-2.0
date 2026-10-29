/**
 * MODULE D'EXTRACTION ET DE CALCUL DES PERFORMANCES JOCKEYS / DRIVERS
 * Basé sur l'agrégation des résultats officiels de courses (PMU, LeTrot, France Galop, Turf APIs).
 * Permet un filtrage ultra-précis par Discipline, Hippodrome, Distance et Période.
 */

export interface RaceResultRecord {
  raceId: string;
  date: string; // YYYY-MM-DD
  hippodrome: string;
  discipline: 'TROT_ATTELE' | 'TROT_MONTE' | 'PLAT' | 'OBSTACLE';
  distance: number;
  jockeyName: string;
  horseName: string;
  position: number; // 1 = Vainqueur, 2 = 2e, 3 = 3e, etc. 0 ou -1 = Disqualifié/Tombé/Arrêté
  isDisqualified?: boolean;
  totalRunners: number;
  earningsEuro?: number;
}

export interface JockeyFilterOptions {
  discipline?: 'TROT_ATTELE' | 'TROT_MONTE' | 'PLAT' | 'OBSTACLE';
  hippodrome?: string;
  distanceRange?: { min: number; max: number };
  periodDays?: number; // ex: 365 derniers jours ou 90 jours
  minStartsCount?: number; // Seuil minimum pour applicabilité
}

export interface CalculatedJockeyStats {
  jockeyName: string;
  jockeySlug: string;
  totalStarts: number;
  wins: number;
  top3: number;
  disqualifications: number;
  winRate: number; // 0.00 à 1.00
  top3Rate: number; // 0.00 à 1.00
  disqualificationRate: number;
  bayesianWinRate: number; // Taux lissé avec prior
  bayesianTop3Rate: number; // Taux lissé avec prior
  last5Musique: string[]; // ex: ['1a', '3a', 'Da', '2a', '4a']
  formScore: number; // Score de forme récent sur 100
  hippodromeWinRate?: number; // Sur cet hippodrome spécifique
  hippodromeTop3Rate?: number;
  disciplineStartsCount: number;
}

/**
 * Normalise le nom du jockey/driver pour l'indexation
 */
export function slugifyJockeyName(name: string): string {
  if (!name) return 'UNKNOWN';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Extrait et calcule les métriques de performance d'un jockey / driver à partir de l'historique brut des résultats
 */
export function calculateJockeyPerformanceFromResults(
  jockeyName: string,
  allRaceResults: RaceResultRecord[],
  options: JockeyFilterOptions = {}
): CalculatedJockeyStats {
  const targetSlug = slugifyJockeyName(jockeyName);
  const now = new Date();

  // 1. Filtrage strict sur les courses du jockey
  let jockeyRaces = allRaceResults.filter((r) => slugifyJockeyName(r.jockeyName) === targetSlug);

  // 2. Filtre par Période (ex: 365 derniers jours)
  if (options.periodDays) {
    const cutoffDate = new Date(now.getTime() - options.periodDays * 24 * 60 * 60 * 1000);
    jockeyRaces = jockeyRaces.filter((r) => new Date(r.date) >= cutoffDate);
  }

  // Trier par date décroissante pour isoler les résultats récents (Musique)
  jockeyRaces.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 3. Extraire la Musique des 5 à 10 dernières prestations
  const last5Musique = jockeyRaces.slice(0, 5).map((r) => {
    const discLetter =
      r.discipline === 'TROT_ATTELE'
        ? 'a'
        : r.discipline === 'TROT_MONTE'
        ? 'm'
        : r.discipline === 'PLAT'
        ? 'p'
        : 'h';

    if (r.isDisqualified || r.position <= 0 || r.position > 99) {
      return `D${discLetter}`;
    }
    return `${r.position}${discLetter}`;
  });

  // 4. Application des filtres spécifiques (Discipline, Hippodrome, Distance)
  let filteredRaces = [...jockeyRaces];

  if (options.discipline) {
    filteredRaces = filteredRaces.filter((r) => r.discipline === options.discipline);
  }

  if (options.distanceRange) {
    filteredRaces = filteredRaces.filter(
      (r) => r.distance >= options.distanceRange!.min && r.distance <= options.distanceRange!.max
    );
  }

  // Sous-ensemble spécifique à l'hippodrome du jour
  let hippoRaces = filteredRaces;
  if (options.hippodrome) {
    const hippoSlugTarget = slugifyJockeyName(options.hippodrome);
    hippoRaces = filteredRaces.filter((r) => slugifyJockeyName(r.hippodrome) === hippoSlugTarget);
  }

  // 5. Calcul des métriques globales filtrées
  const totalStarts = filteredRaces.length;
  let wins = 0;
  let top3 = 0;
  let disqualifications = 0;

  filteredRaces.forEach((r) => {
    if (r.position === 1) wins++;
    if (r.position >= 1 && r.position <= 3) top3++;
    if (r.isDisqualified || r.position <= 0) disqualifications++;
  });

  const winRate = totalStarts > 0 ? wins / totalStarts : 0;
  const top3Rate = totalStarts > 0 ? top3 / totalStarts : 0;
  const disqualificationRate = totalStarts > 0 ? disqualifications / totalStarts : 0;

  // Lissage bayésien (Prior global : 10% victoires, 30% top3, force=10)
  const PRIOR_WIN = 0.10;
  const PRIOR_TOP3 = 0.30;
  const K_SMOOTH = 10;

  const bayesianWinRate = (wins + K_SMOOTH * PRIOR_WIN) / (totalStarts + K_SMOOTH);
  const bayesianTop3Rate = (top3 + K_SMOOTH * PRIOR_TOP3) / (totalStarts + K_SMOOTH);

  // 6. Métriques sur l'hippodrome spécifique du jour
  const hippoStarts = hippoRaces.length;
  const hippoWins = hippoRaces.filter((r) => r.position === 1).length;
  const hippoTop3 = hippoRaces.filter((r) => r.position >= 1 && r.position <= 3).length;

  const hippodromeWinRate = hippoStarts > 0 ? hippoWins / hippoStarts : undefined;
  const hippodromeTop3Rate = hippoStarts > 0 ? hippoTop3 / hippoStarts : undefined;

  // Score de forme récent (pondération dégressive sur les 5 dernières courses)
  let formPoints = 0;
  let formMax = 0;
  jockeyRaces.slice(0, 5).forEach((r, idx) => {
    const weight = 5 - idx; // 5, 4, 3, 2, 1
    formMax += weight * 10;
    if (r.position === 1) formPoints += weight * 10;
    else if (r.position === 2) formPoints += weight * 7;
    else if (r.position === 3) formPoints += weight * 5;
    else if (r.position > 3 && r.position <= 5) formPoints += weight * 2;
  });
  const formScore = formMax > 0 ? Math.round((formPoints / formMax) * 100) : 50;

  return {
    jockeyName,
    jockeySlug: targetSlug,
    totalStarts,
    wins,
    top3,
    disqualifications,
    winRate,
    top3Rate,
    disqualificationRate,
    bayesianWinRate,
    bayesianTop3Rate,
    last5Musique,
    formScore,
    hippodromeWinRate,
    hippodromeTop3Rate,
    disciplineStartsCount: totalStarts,
  };
}
