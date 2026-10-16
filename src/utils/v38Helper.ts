import { CourseHippique, Partant, PronosticSynthese } from '../types/turf';
import { calculerPerformance3Musiques, calculerPerformanceTandem, getPartantDriverMusique, classerChevauxFormeEtPoints } from './turfCalculations';

export type SurprisesMode = 'all_3' | 'top2_odds' | 'top2_numbers' | 'custom';
export type DelaissesSortMode = 'desc_number' | 'asc_number' | 'asc_odds';

export const V38_SURPRISES_MODE_STORAGE_KEY = 'hippo_v38_surprises_mode';
export const V38_DELAISSES_SORT_STORAGE_KEY = 'hippo_v38_delaisses_sort_mode';
export const V38_CUSTOM_SURPRISES_STORAGE_KEY = 'hippo_v38_custom_surprises_nums';

/**
 * Tri les chevaux selon la Classification Officielle par Points de Performance (Score 3 Musiques ascendant)
 */
export const sortAscByPerformancePoints = (a: any, b: any) => {
  const perfA = calculerPerformance3Musiques(a.musique || '').totalPoints;
  const perfB = calculerPerformance3Musiques(b.musique || '').totalPoints;
  if (perfA !== perfB) return perfA - perfB;
  const oA = getHorseGenyOdds(a);
  const oB = getHorseGenyOdds(b);
  if (oA !== oB) return oA - oB;
  return Number(a.numero) - Number(b.numero);
};

export interface V38Options {
  surprisesMode?: SurprisesMode;
  customSurprisesNums?: number[];
  sortDelaisses?: DelaissesSortMode;
}

export interface V38Result {
  isPlat: boolean;
  groupType: 'CORDE' | 'NUMERO';
  labelGroup1: string;
  labelGroup2: string;
  labelGroup3: string;
  g1: Partant[];
  g2: Partant[];
  g3: Partant[];
  poolG1: Partant[];
  poolG2: Partant[];
  poolG3: Partant[];
  selection11: Partant[];
  selection12: Partant[];
  favoris: Partant[];
  outsiders: Partant[];
  basesSolides: Partant[];
  chancesSerieuses: Partant[];
  tocardsSpeculatifs: Partant[];
  surprises: Partant[];
  delaisses: Partant[];
  selectionV38: Partant[];
  remainingV38: Partant[];
  assignedCordes?: Map<number, number>;
  surprisesMode?: SurprisesMode;
  delaissesSortMode?: DelaissesSortMode;
  systeme74Ranked: any[];
}

/**
 * Extrait la cote Geny / PMU d'un partant pour le tri obligatoire par cote croissante
 */
export function getHorseGenyOdds(p: Partant): number {
  if (p.coteProbable !== undefined && p.coteProbable !== null && !isNaN(Number(p.coteProbable))) {
    const val = Number(p.coteProbable);
    if (val > 0) return val;
  }
  if (p.cotePrecedente !== undefined && p.cotePrecedente !== null && !isNaN(Number(p.cotePrecedente))) {
    const val = Number(p.cotePrecedente);
    if (val > 0) return val;
  }
  if (p.hippoScore && Number(p.hippoScore) > 0) {
    return Math.max(1.5, Math.round((100 - Number(p.hippoScore)) * 0.5 * 10) / 10);
  }
  return 99;
}

/**
 * Attribue des cordes uniques (sans aucun doublon 1..N) pour une course de plat
 */
export function assignUniqueCordesForPlat(partants: Partant[]): Map<number, number> {
  const result = new Map<number, number>();
  const total = partants.length;
  if (total === 0) return result;

  const usedCordes = new Set<number>();
  const unassigned: Partant[] = [];

  // 1. Première passe : conserver les cordes existantes valides (1 à 30) et uniques
  for (const p of partants) {
    const rawC: any = p.corde;
    let val: number | null = null;
    if (typeof rawC === 'number' && !isNaN(rawC) && rawC >= 1 && rawC <= 30) {
      val = rawC;
    } else if (typeof rawC === 'string') {
      const parsed = parseInt(rawC.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
        val = parsed;
      }
    }

    if (val !== null && !usedCordes.has(val)) {
      usedCordes.add(val);
      result.set(Number(p.numero), val);
    } else {
      unassigned.push(p);
    }
  }

  // 2. Deuxième passe : attribuer les cordes libres
  const availableCordes: number[] = [];
  const maxNeeded = Math.max(total, 30);
  for (let c = 1; c <= maxNeeded; c++) {
    if (!usedCordes.has(c)) {
      availableCordes.push(c);
    }
  }

  unassigned.forEach((p) => {
    const num = Number(p.numero);
    const numIdx = availableCordes.indexOf(num);
    let chosenCorde: number;
    if (numIdx !== -1) {
      chosenCorde = availableCordes.splice(numIdx, 1)[0];
    } else {
      chosenCorde = availableCordes.shift() || (usedCordes.size + 1);
    }
    usedCordes.add(chosenCorde);
    result.set(num, chosenCorde);
  });

  return result;
}

/**
 * Retourne le sens officiel de la corde selon l'hippodrome
 */
export function getOfficialHippodromeCorde(hippodrome?: string, fallbackCorde?: any): 'Gauche' | 'Droite' {
  if (fallbackCorde === 'Gauche' || fallbackCorde === 'G' || fallbackCorde === 'gauche') return 'Gauche';
  if (fallbackCorde === 'Droite' || fallbackCorde === 'D' || fallbackCorde === 'droite') return 'Droite';

  const name = (hippodrome || '').toLowerCase().trim();

  // Hippodromes corde à droite
  if (
    name.includes('toulouse') ||
    name.includes('deauville') ||
    name.includes('chantilly') ||
    name.includes('argentan') ||
    name.includes('craon') ||
    name.includes('bordeaux') ||
    name.includes('vichy') ||
    name.includes('strasbourg') ||
    name.includes('la teste') ||
    name.includes('fontainebleau') ||
    name.includes('compiègne') ||
    name.includes('compiegne') ||
    name.includes('clairefontaine') ||
    name.includes('auteuil') ||
    name.includes('la soie') ||
    name.includes('borély') ||
    name.includes('borely') ||
    name.includes('agen') ||
    name.includes('beaumont') ||
    name.includes('croisé') ||
    name.includes('croise') ||
    name.includes('cholet')
  ) {
    return 'Droite';
  }

  // Corde à gauche par défaut (Vincennes, Saint-Cloud, Longchamp, Cabourg, Caen, etc.)
  return 'Gauche';
}

/**
 * HIÉRARCHIE OFFICIELLE V38 DÉDIÉE PAR DISCIPLINE :
 * 
 * 1. SPÉCIAL COURSE DE PLAT UNIQUEMENT :
 *    - Répartition selon la Corde (Pas de doublon dans les cordes) :
 *      * CA : Chevaux ayant les cordes 1, 2, 3, 4 et 5
 *      * CB : Chevaux ayant les cordes 6, 7 et 8
 *      * CC : Chevaux ayant les cordes 9, 10 et plus
 *    - Dans chaque groupe, classement par cote croissante :
 * 1. FORMULE UNIVERSELLE (TOUTES DISCIPLINES : PLAT, TROT ATTELÉ, TROT MONTÉ, OBSTACLES) :
 *    - Répartition selon le Numéro de dossard :
 *      * G1 : Chevaux portant les numéros 1, 2, 3, 4, 5 et 6 (6 chevaux)
 *      * G2 : Chevaux portant les numéros 7, 8, 9 et 10 (4 chevaux)
 *      * G3 : Chevaux portant les numéros 11 et plus en fonction du nombre de partants (si > 10)
 *    - Dans chaque groupe, classement des chevaux par leur cote de manière CROISSANTE.
 *    - CHOIX DANS CHAQUE GROUPE :
 *      * G1 : 5 N° uniquement sur les 6 (les 5 plus petites cotes du groupe G1)
 *      * G2 : 3 N° uniquement sur les 4 (les 3 plus petites cotes du groupe G2)
 *      * G3 : 4 N° uniquement (les 4 plus petites cotes du groupe G3)
 *    => On obtient 12 chevaux (5 + 3 + 4 = 12)
 * 
 * 2. CLASSEMENT UNIQUE ET OBLIGATOIRE DES 12 NUMÉROS TROUVÉS :
 *    - Classés en fonction de leur cote (croissante) indépendamment de leur groupe initial :
 *      * BASE : les 2 premiers N° (1er et 2e)
 *      * CHANCES SÉRIEUSES : les 3e, 4e, 5e et 6e numéros (4 chevaux)
 *      * TOCARDS : les 7e, 8e et 9e numéros (3 chevaux)
 *      * SURPRISES : issus des 10e, 11e et 12e numéros (les plus petits numéros conservés par ordre croissant, le plus gros numéro basculé aux Délaissés)
 *      * DÉLAISSÉS : tous autres numéros non retenus + le plus gros numéro du trio surprise (classés par cote croissante).
 *    NB : Pas de doublon.
 */
/**
 * HIÉRARCHIE OFFICIELLE QUINTÉ+ V38 (UNIVERSELLE POUR TOUTES DISCIPLINES : PLAT, TROT, OBSTACLES)
 *
 * 1. Regroupement strict par NUMÉRO DE DOSSARD (G1, G2, G3) :
 *    - G1 : Chevaux portant les numéros 1, 2, 3, 4, 5 et 6 (6 chevaux)
 *    - G2 : Chevaux portant les numéros 7, 8, 9 et 10 (4 chevaux)
 *    - G3 : Chevaux portant les numéros 11 et plus (si partants > 10)
 *
 * 2. Dans chaque groupe, classement des chevaux par leur cote de manière CROISSANTE.
 *    Sélection stricte dans chaque groupe :
 *    - G1 : 5 N° (les 5 plus petites cotes du groupe sur les 6)
 *    - G2 : 3 N° (les 3 plus petites cotes du groupe sur les 4)
 *    - G3 : 4 N° (les 4 plus petites cotes du groupe sur 11+)
 *
 * 3. Classement unique des 12 numéros trouvés en fonction de leur cote CROISSANTE (indépendamment du groupe) :
 *    - BASE : les 2 premiers N° (1er et 2e)
 *    - CHANCES SÉRIEUSES : les 3e, 4e, 5e et 6e numéros (4 chevaux)
 *    - TOCARDS : les 7e, 8e et 9e numéros (3 chevaux)
 *    - SURPRISES : issus des 10e, 11e et 12e numéros (conservant les plus petits numéros par ordre croissant, le plus grand numéro étant reclassé délaissé)
 *    - DÉLAISSÉS : tous autres numéros non retenus + le plus grand numéro des 3 candidats surprises (classés par cote croissante).
 *    NB : Pas de doublon.
 */
export function computeV38Hierarchy(course: CourseHippique, options?: V38Options): V38Result {
  const rawPartants = course.partants || [];
  // Déduplication stricte des partants par numéro
  const seenRawNums = new Set<number>();
  const dedupedRawPartants = rawPartants.filter((p, idx) => {
    const n = Number(p.numero) || idx + 1;
    if (seenRawNums.has(n)) return false;
    seenRawNums.add(n);
    return true;
  });

  const disc = (course.discipline || '').toLowerCase().trim();
  const isPlat = disc.includes('plat');

  // En cas de course de Plat : attribution de cordes uniques garanties sans doublon pour l'affichage
  const assignedCordes = isPlat ? assignUniqueCordesForPlat(dedupedRawPartants) : new Map<number, number>();

  // Enrichissement de chaque partant avec son groupe officiel par numéro et sa cote Geny
  const enriched = dedupedRawPartants.map((p) => {
    const num = Number(p.numero);
    let group: 'G1' | 'G2' | 'G3' = 'G1';

    // En plat, le regroupement et le positionnement sont faits en fonction du numéro de corde du cheval (CA, CB, CC)
    if (isPlat) {
      const cordeVal = assignedCordes.get(num) || (typeof p.corde === 'number' ? p.corde : parseInt(String(p.corde).replace(/\D/g, ''), 10)) || num;
      if (cordeVal >= 1 && cordeVal <= 5) {
        group = 'G1'; // Correspond à CA (Corde 1 à 5)
      } else if (cordeVal >= 6 && cordeVal <= 8) {
        group = 'G2'; // Correspond à CB (Corde 6 à 8)
      } else {
        group = 'G3'; // Correspond à CC (Corde 9+)
      }
    } else {
      // Regroupement universel par Numéro de dossard pour TOUTES les autres disciplines (Trot, Obstacles)
      if (num >= 1 && num <= 6) {
        group = 'G1';
      } else if (num >= 7 && num <= 10) {
        group = 'G2';
      } else {
        group = 'G3';
      }
    }

    const genyOdds = getHorseGenyOdds(p);
    const hippoScore = Number(p.hippoScore || 0);
    const indexValeur = p.indexValeur !== undefined 
      ? Number(p.indexValeur) 
      : Math.round((hippoScore - genyOdds) * 10) / 10;
    const scoreX = (73 + num) - genyOdds;

    return {
      ...p,
      corde: isPlat ? (assignedCordes.get(num) || p.corde || num) : p.corde,
      group,
      indexValeur,
      hippoScore,
      genyOdds,
      coteSort: genyOdds,
      scoreX,
    };
  });

  // Séparation en 3 groupes (G1: 1-6, G2: 7-10, G3: 11+)
  const allG1 = enriched.filter(p => p.group === 'G1');
  const allG2 = enriched.filter(p => p.group === 'G2');
  const allG3 = enriched.filter(p => p.group === 'G3');

  // Filtrage des partants actifs (exclusion des non-partants)
  // et tri strict par cote croissante (plus petites cotes en premier)
  const sortAscByOdds = (a: any, b: any) => {
    const oA = a.genyOdds !== undefined && a.genyOdds !== null ? Number(a.genyOdds) : getHorseGenyOdds(a);
    const oB = b.genyOdds !== undefined && b.genyOdds !== null ? Number(b.genyOdds) : getHorseGenyOdds(b);
    if (oA !== oB) return oA - oB;
    return Number(a.numero) - Number(b.numero);
  };

  const activeG1Sorted = allG1.filter(p => !p.estNonPartant && p.statut !== 'Non-partant').sort(sortAscByOdds);
  const activeG2Sorted = allG2.filter(p => !p.estNonPartant && p.statut !== 'Non-partant').sort(sortAscByOdds);
  const activeG3Sorted = allG3.filter(p => !p.estNonPartant && p.statut !== 'Non-partant').sort(sortAscByOdds);

  // Choix dans chaque groupe (5 N° G1, 3 N° G2, 4 N° G3 par cotes croissantes)
  const poolG1 = activeG1Sorted.slice(0, 5);
  const poolG2 = activeG2Sorted.slice(0, 3);
  const poolG3 = activeG3Sorted.slice(0, 4);

  // Vivier des 12 chevaux (sans répétition car G1, G2, G3 sont disjoints : 5 + 3 + 4 = 12)
  const selectedPool = [...poolG1, ...poolG2, ...poolG3];
  const selectedNumsSet = new Set(selectedPool.map(p => Number(p.numero)));

  // Compléter le vivier si un groupe comporte moins de partants (ex: course à effectif réduit < 12)
  const allActiveSorted = enriched
    .filter(p => !p.estNonPartant && p.statut !== 'Non-partant')
    .sort(sortAscByOdds);

  for (const p of allActiveSorted) {
    if (selectedPool.length >= 12) break;
    const n = Number(p.numero);
    if (!selectedNumsSet.has(n)) {
      selectedPool.push(p);
      selectedNumsSet.add(n);
    }
  }

  // --- SYSTÈME 74 RANKING ---
  const activePartants = enriched.filter(p => !p.estNonPartant && p.statut !== 'Non-partant');
  const systeme74Ranked = [...activePartants].map(p => {
    const num = Number(p.numero);
    const cote = getHorseGenyOdds(p);
    const scoreX = Math.round(((73 + num) - cote) * 10) / 10;
    return { ...p, scoreX, cote };
  }).sort((a, b) => b.scoreX - a.scoreX);

  const favoris = systeme74Ranked.slice(0, 3);             // 1er au 3e N°
  const outsiders = systeme74Ranked.slice(3, 6);           // 4e au 6e N°
  const tocardsSpeculatifs = systeme74Ranked.slice(6, 10); // 7e au 10e N° (4 N°)
  const remaining74 = systeme74Ranked.slice(10);
  const surprises = remaining74.slice(0, 4);

  const assignedNums = new Set([
    ...favoris.map(p => Number(p.numero)),
    ...outsiders.map(p => Number(p.numero)),
    ...tocardsSpeculatifs.map(p => Number(p.numero)),
    ...surprises.map(p => Number(p.numero)),
  ]);
  const delaisses = activePartants.filter(p => !assignedNums.has(Number(p.numero)));

  const selection12 = systeme74Ranked.slice(0, Math.min(12, systeme74Ranked.length));
  const selection11 = selection12; // Rétrocompatibilité

  const finalDelaisses = [...delaisses].map(p => {
    const num = Number(p.numero);
    const cote = getHorseGenyOdds(p);
    const scoreX = Math.round(((73 + num) - cote) * 10) / 10;
    return { ...p, scoreX, cote };
  }).sort((a, b) => b.scoreX - a.scoreX);
  const effectiveSurprisesMode: SurprisesMode = options?.surprisesMode || 'all_3';
  const effectiveDelaissesSort: DelaissesSortMode = options?.sortDelaisses || 'asc_odds';

  return {
    isPlat,
    groupType: isPlat ? 'CORDE' : 'NUMERO',
    labelGroup1: isPlat ? 'CA (Corde 1 à 5)' : 'G1 (N° 1 à 6)',
    labelGroup2: isPlat ? 'CB (Corde 6 à 8)' : 'G2 (N° 7 à 10)',
    labelGroup3: isPlat ? 'CC (Corde 9 et +)' : 'G3 (N° 11 et +)',
    g1: allG1,
    g2: allG2,
    g3: allG3,
    poolG1,
    poolG2,
    poolG3,
    selection11,
    selection12,
    favoris: [...favoris].sort((a, b) => b.scoreX - a.scoreX),
    outsiders: [...outsiders].sort((a, b) => b.scoreX - a.scoreX),
    // Rétrocompatibilité complète :
    basesSolides: [...favoris].slice(0, 2).sort((a, b) => b.scoreX - a.scoreX),
    chancesSerieuses: [...outsiders].sort((a, b) => b.scoreX - a.scoreX),
    tocardsSpeculatifs: [...tocardsSpeculatifs].sort((a, b) => b.scoreX - a.scoreX),
    // Les surprises (classées par Score X décroissant)
    surprises: [...surprises].sort((a, b) => b.scoreX - a.scoreX),
    delaisses: finalDelaisses,
    selectionV38: selection12,
    remainingV38: finalDelaisses,
    assignedCordes,
    surprisesMode: effectiveSurprisesMode,
    delaissesSortMode: effectiveDelaissesSort,
    systeme74Ranked,
  };
}

export type DisciplineType = 'TROT' | 'PLAT' | 'OBSTACLES';

export interface DisciplineGridRow {
  key: 'A' | 'B' | 'C' | 'EN_FORME' | 'FORME_MOYENNE' | 'CAPABLE_EXPLOIT' | 'MEFORME' | string;
  label: string;
  description: string;
  bases: number[];
  chances: number[];
  tocards: number[];
  surprises: number[];
  delaisses: number[];
}

export interface DisciplineGridResult {
  disciplineType: DisciplineType;
  title: string;
  ruleA: string;
  ruleB: string;
  ruleC: string;
  instruction: string;
  rows: DisciplineGridRow[];
  formRows: DisciplineGridRow[];
}

/**
 * Calcule le tableau de répartition officiel selon la discipline de la course (Page 2 PDF) :
 * - Trot (Attelé / Monté) : Déferrage (A: D4, B: DP/DA, C: Ferrés/Plaqués)
 * - Plat : Numéro de corde (CA: 1-5, CB: 6-8, CC: 9+)
 * - Obstacles (Haies / Steeple) : Numéro de dossard (A: 1-6, B: 7-10, C: 11+)
 */
export function computeDisciplineGrid(course: CourseHippique): DisciplineGridResult {
  const disc = (course.discipline || '').toLowerCase().trim();
  let disciplineType: DisciplineType = 'TROT';

  if (disc.includes('plat')) {
    disciplineType = 'PLAT';
  } else if (
    disc.includes('haie') ||
    disc.includes('steeple') ||
    disc.includes('obstacle') ||
    disc.includes('cross')
  ) {
    disciplineType = 'OBSTACLES';
  }

  const v38 = computeV38Hierarchy(course);
  const { favoris, outsiders, tocardsSpeculatifs, surprises, assignedCordes } = v38;

  const favorisNums = new Set(favoris.map(p => Number(p.numero)));
  const outsiderNums = new Set(outsiders.map(p => Number(p.numero)));
  const tocardNums = new Set(tocardsSpeculatifs.map(p => Number(p.numero)));
  // Hiérarchie d'analyse V38 : La sélection des surprises est déjà calculée dans v38
  const surpriseNums = new Set(v38.surprises.map(p => Number(p.numero)));

  const allPartants = (course.partants || []).filter(p => !p.estNonPartant && p.statut !== 'Non-partant');

  let title = '';
  let ruleA = '';
  let ruleB = '';
  let ruleC = '';
  const instruction = 'Range les numéros dans le tableau en fonction des indications.';

  let getRowKey: (p: Partant) => 'A' | 'B' | 'C';
  let labelA = '';
  let labelB = '';
  let labelC = '';
  let descA = '';
  let descB = '';
  let descC = '';

  if (disciplineType === 'TROT') {
    title = 'TROT ATTELÉ et TROT MONTÉ';
    ruleA = 'A : Les chevaux déferrés des 4 pattes';
    ruleB = 'B : Les déférés des postérieurs ou des antérieurs';
    ruleC = 'C : Les chevaux ferrés ou les chevaux plaqués des 4 pattes.';
    labelA = 'A';
    labelB = 'B';
    labelC = 'C';
    descA = 'D4';
    descB = 'DP ou DA';
    descC = 'Ferrés / Plaqués';

    getRowKey = (p) => {
      const f = (p.ferrure || '').toUpperCase().trim();
      if (f === 'D4' || f.includes('D4') || f.includes('DÉFERRÉ DES 4') || f.includes('DEFERRE DES 4')) {
        return 'A';
      }
      if (
        f === 'DP' ||
        f === 'DA' ||
        f.includes('POSTÉRIEUR') ||
        f.includes('POSTERIEUR') ||
        f.includes('ANTÉRIEUR') ||
        f.includes('ANTERIEUR')
      ) {
        return 'B';
      }
      return 'C';
    };
  } else if (disciplineType === 'PLAT') {
    title = 'PLAT';
    ruleA = 'CA : Les chevaux ayant pour corde : 1-2-3-4-5';
    ruleB = 'CB : Les chevaux ayant pour corde : 6-7-8';
    ruleC = 'CC : Les chevaux ayant pour corde : 9 et plus';
    labelA = 'CA';
    labelB = 'CB';
    labelC = 'CC';
    descA = 'Corde 1 à 5';
    descB = 'Corde 6 à 8';
    descC = 'Corde 9 et plus';

    getRowKey = (p) => {
      const num = Number(p.numero);
      const c = assignedCordes?.get(num) ?? (typeof p.corde === 'number' ? p.corde : parseInt(String(p.corde).replace(/\D/g, ''), 10)) ?? num;
      if (c >= 1 && c <= 5) return 'A';
      if (c >= 6 && c <= 8) return 'B';
      return 'C'; // Corde 9 et plus
    };
  } else {
    title = 'OBSTACLES – HAIES – STEEPLE-CHASE';
    ruleA = 'A : Les chevaux ayant pour N° : 1-2-3-4-5-6';
    ruleB = 'B : Les chevaux ayant pour N° : 7-8-9-10';
    ruleC = 'C : Les chevaux ayant pour N° : 11 et plus';
    labelA = 'A';
    labelB = 'B';
    labelC = 'C';
    descA = 'N° 1 à 6';
    descB = 'N° 7 à 10';
    descC = 'N° 11+';

    getRowKey = (p) => {
      const n = Number(p.numero);
      if (n >= 1 && n <= 6) return 'A';
      if (n >= 7 && n <= 10) return 'B';
      return 'C';
    };
  }

  const rows: DisciplineGridRow[] = [
    { key: 'A', label: labelA, description: descA, bases: [], chances: [], tocards: [], surprises: [], delaisses: [] },
    { key: 'B', label: labelB, description: descB, bases: [], chances: [], tocards: [], surprises: [], delaisses: [] },
    { key: 'C', label: labelC, description: descC, bases: [], chances: [], tocards: [], surprises: [], delaisses: [] },
  ];

  const rowMap = {
    A: rows[0],
    B: rows[1],
    C: rows[2],
  };

  // Système 74 difference X map pour le tri des cases
  const horseOddsMap = new Map<number, number>();
  const horsePerfPointsMap = new Map<number, number>();
  for (const p of allPartants) {
    horseOddsMap.set(Number(p.numero), getHorseGenyOdds(p));
    horsePerfPointsMap.set(Number(p.numero), calculerPerformance3Musiques(p.musique || '').totalPoints);
  }
  const sortBySysteme74Desc = (a: number, b: number) => {
    const oA = horseOddsMap.get(a) ?? 99;
    const oB = horseOddsMap.get(b) ?? 99;
    const scoreXA = (73 + a) - oA;
    const scoreXB = (73 + b) - oB;
    if (scoreXA !== scoreXB) return scoreXB - scoreXA;
    return a - b;
  };

  // Dispatcher chaque partant actif :
  // FAVORIS (3), OUTSIDERS (3), TOCARDS (3) et strictement les 4 numéros de SURPRISES
  for (const p of allPartants) {
    const rKey = getRowKey(p);
    const targetRow = rowMap[rKey];
    const n = Number(p.numero);

    if (favorisNums.has(n)) {
      targetRow.bases.push(n);
    } else if (outsiderNums.has(n)) {
      targetRow.chances.push(n);
    } else if (tocardNums.has(n)) {
      targetRow.tocards.push(n);
    } else if (surpriseNums.has(n)) {
      // Uniquement les 4 numéros de surprises dans la colonne SURPRISES
      targetRow.surprises.push(n);
      targetRow.delaisses.push(n); // Rétrocompatibilité
    }
  }

  // Trier les numéros par Système 74 Différence (X) décroissante dans toutes les catégories
  for (const r of rows) {
    r.bases.sort(sortBySysteme74Desc);
    r.chances.sort(sortBySysteme74Desc);
    r.tocards.sort(sortBySysteme74Desc);
    r.surprises.sort(sortBySysteme74Desc);
    r.delaisses.sort(sortBySysteme74Desc);
  }

  // --- 4 Lignes supplémentaires de Classification par Forme ---
  const formClassification = classerChevauxFormeEtPoints(course.partants || []);
  
  const formRowSpecs = [
    {
      key: 'EN_FORME',
      label: 'CHEVAUX EN FORME',
      description: '1e au 6e',
      items: formClassification.chevauxEnForme,
    },
    {
      key: 'FORME_MOYENNE',
      label: 'FORME MOYENNE',
      description: '7e au 10e',
      items: formClassification.formeMoyenne,
    },
    {
      key: 'CAPABLE_EXPLOIT',
      label: "CAPABLE D'EXPLOIT",
      description: 'Cote < 8.0',
      items: formClassification.capableExploit,
    },
    {
      key: 'MEFORME',
      label: 'MÉFORME',
      description: '11e et +',
      items: formClassification.meforme,
    },
  ];

  const formRows: DisciplineGridRow[] = formRowSpecs.map(spec => {
    const row: DisciplineGridRow = {
      key: spec.key,
      label: spec.label,
      description: spec.description,
      bases: [],
      chances: [],
      tocards: [],
      surprises: [],
      delaisses: [],
    };

    for (const item of spec.items) {
      const n = Number(item.partant.numero);
      if (favorisNums.has(n)) {
        row.bases.push(n);
      } else if (outsiderNums.has(n)) {
        row.chances.push(n);
      } else if (tocardNums.has(n)) {
        row.tocards.push(n);
      } else if (surpriseNums.has(n)) {
        row.surprises.push(n);
        row.delaisses.push(n);
      }
    }

    row.bases.sort(sortBySysteme74Desc);
    row.chances.sort(sortBySysteme74Desc);
    row.tocards.sort(sortBySysteme74Desc);
    row.surprises.sort(sortBySysteme74Desc);
    row.delaisses.sort(sortBySysteme74Desc);

    return row;
  });

  return {
    disciplineType,
    title,
    ruleA,
    ruleB,
    ruleC,
    instruction,
    rows,
    formRows,
  };
}

export interface HorseSuccessProbability {
  percent: number;
  label: 'Très Forte' | 'Forte' | 'Moyenne' | 'Modérée' | 'Spéculatif';
  color: string;
  badgeBg: string;
  barColor: string;
  advice: string;
}

/**
 * Calcule dynamiquement la probabilité de succès (%) de chaque partant à partir de son score HippoScore
 * Permet d'aider à la prise de décision sur les mises et l'allocation du capital.
 * La somme des probabilités des partants actifs de la course est normalisée à 100%.
 */
export function computeHorseSuccessProbabilities(
  partants: Partant[],
  course?: CourseHippique
): Map<number, HorseSuccessProbability> {
  const result = new Map<number, HorseSuccessProbability>();
  if (!partants || partants.length === 0) return result;

  const activePartants = partants.filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');
  if (activePartants.length === 0) return result;

  // Calcul du score de base pour chaque cheval
  const horseScores = activePartants.map((p) => {
    let rawScore = typeof p.hippoScore === 'number' && p.hippoScore > 0 ? p.hippoScore : 50;
    return {
      numero: Number(p.numero),
      score: Math.max(10, Math.min(100, rawScore)),
    };
  });

  // Modèle puissance 2.2 pour refléter la distribution réelle de succès turf
  const weights = horseScores.map((h) => ({
    numero: h.numero,
    weight: Math.pow(h.score / 10, 2.2),
  }));

  const totalWeight = weights.reduce((acc, w) => acc + w.weight, 0);

  weights.forEach((w) => {
    const rawPercent = totalWeight > 0 ? (w.weight / totalWeight) * 100 : 100 / activePartants.length;
    const percent = Math.round(rawPercent * 10) / 10;

    let label: HorseSuccessProbability['label'] = 'Spéculatif';
    let color = 'text-slate-300';
    let badgeBg = 'bg-slate-900 border-slate-700 text-slate-300';
    let barColor = 'bg-slate-500';
    let advice = 'Mise modérée / couverture';

    if (percent >= 20) {
      label = 'Très Forte';
      color = 'text-emerald-300';
      badgeBg = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
      barColor = 'bg-emerald-400';
      advice = 'Base solide recommandée (jeu simple / couplé)';
    } else if (percent >= 12) {
      label = 'Forte';
      color = 'text-amber-300';
      badgeBg = 'bg-amber-950/80 border-amber-500/50 text-amber-300';
      barColor = 'bg-amber-400';
      advice = 'Appui incontournable pour les combinaisons';
    } else if (percent >= 7) {
      label = 'Moyenne';
      color = 'text-sky-300';
      badgeBg = 'bg-sky-950/80 border-sky-500/40 text-sky-300';
      barColor = 'bg-sky-400';
      advice = 'Associé régulier (champ réduit)';
    } else if (percent >= 4) {
      label = 'Modérée';
      color = 'text-purple-300';
      badgeBg = 'bg-purple-950/80 border-purple-500/40 text-purple-300';
      barColor = 'bg-purple-400';
      advice = 'Tocard spéculatif à glisser en fin de combinaison';
    }

    result.set(w.numero, { percent, label, color, badgeBg, barColor, advice });
  });

  return result;
}

/**
 * Détecte si une sélection Quinté est un fallback factice séquentiel (ex: [1, 2, 3, 4, 5, 6, 7, 8])
 */
export function isDummySequentialSelection(selection: number[] | undefined): boolean {
  if (!selection || selection.length < 5) return true;
  return selection.slice(0, 8).every((num, idx) => num === idx + 1);
}

/**
 * Construit une synthèse de pronostic officielle 100% basée sur la hiérarchie V38
 * et les cotes réelles des chevaux (élimine définitivement le fallback factice 1-2-3-4-5-6-7-8).
 */
export function buildRealV38Synthese(course: CourseHippique): PronosticSynthese {
  const v38 = computeV38Hierarchy(course);

  const favNums = (v38.favoris || []).map(p => Number(p.numero));
  const outNums = (v38.outsiders || []).map(p => Number(p.numero));
  const tocNums = (v38.tocardsSpeculatifs || []).map(p => Number(p.numero));
  const surNums = (v38.surprises || []).map(p => Number(p.numero));
  const delNums = (v38.delaisses || []).map(p => Number(p.numero));

  // Les bases proviennent directement des 2 favoris certifiés selon les cotes réelles
  const base1 = favNums[0] || (v38.selectionV38[0] ? Number(v38.selectionV38[0].numero) : 1);
  const base2 = favNums[1] || (v38.selectionV38[1] ? Number(v38.selectionV38[1].numero) : 2);

  // Construction rigoureuse du TOP 8 Quinté+ selon la méthodologie V38 :
  // 3 Favoris + 3 Outsiders + 2 Tocards Spéculatifs
  const sel8Set = new Set<number>();
  favNums.forEach(n => sel8Set.add(n));
  outNums.forEach(n => sel8Set.add(n));
  tocNums.slice(0, 2).forEach(n => sel8Set.add(n));

  // Si peloton réduit ou pas assez de chevaux, compléter avec le reste de la sélection V38 puis surprises
  if (sel8Set.size < 8) {
    (v38.selectionV38 || []).forEach(p => {
      if (sel8Set.size < 8) sel8Set.add(Number(p.numero));
    });
  }
  if (sel8Set.size < 8) {
    surNums.forEach(n => {
      if (sel8Set.size < 8) sel8Set.add(n);
    });
  }

  const selection8 = Array.from(sel8Set).slice(0, 8);

  const partants = course.partants || [];
  const p1 = partants.find(p => Number(p.numero) === base1);
  const p2 = partants.find(p => Number(p.numero) === base2);
  const name1 = p1?.nom ? ` (${p1.nom})` : '';
  const name2 = p2?.nom ? ` (${p2.nom})` : '';

  const selectionJustification = `Hiérarchie officielle V38 établie par ordre de cotes réelles : N°${base1}${name1} et N°${base2}${name2} en bases prioritaires, complétées par 3 outsiders solides (${outNums.join(', ')}) et les tocards spéculatifs (${tocNums.slice(0, 2).join(', ')}).`;

  const conseilPari = `Quinté+ combiné Flexi 50% avec bases N°${base1} et N°${base2} associées aux ${selection8.filter(n => n !== base1 && n !== base2).join(', ')}. Jeu simple Gagnant/Placé sur le N°${base1}.`;

  return {
    baseIncontournable: base1,
    secondeBase: base2,
    favoris: favNums,
    outsiders: outNums,
    tocards: tocNums,
    surprises: surNums,
    selection8,
    selectionJustification,
    conseilPari,
    indiceConfiance: 8.8,
    analyseParcours: course.synthese?.analyseParcours || `Épreuve sélective sur ${course.distance || 2700}m à ${course.hippodrome || 'l\'hippodrome'}.`,
    piegesCourse: course.synthese?.piegesCourse && course.synthese.piegesCourse.length > 0
      ? course.synthese.piegesCourse
      : ['Attention aux allures au départ', 'Méfiance envers les surprises du second échelon'],
    delaisses: delNums,
    ordreProbable: selection8.slice(0, 5),
    ordrePossible: [base1, outNums[0] || selection8[2], base2, outNums[1] || selection8[3], tocNums[0] || selection8[6]].filter(Boolean).slice(0, 5),
  };
}
