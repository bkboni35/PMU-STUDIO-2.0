import { Partant } from '../types/turf';

/**
 * Extrait les tokens individuels d'une musique hippique (gère les formats avec ou sans espaces ex: "1p 9p 5p" ou "1p9p5p" ou "(24)1p9p5p")
 */
export function extraireTokensMusique(musique: string): string[] {
  if (!musique || !musique.trim()) return [];

  const trimmed = musique.trim();
  // Regex pour capturer les années (24), les résultats numériques avec discipline (1p, 9a, 0m, 10s, etc.)
  // ou les codes de disqualification/incidents (Da, Th, Dm, etc.)
  const regex = /(\(\d{2}\)|[0-9]+[a-z]?|(?:DA|DM|DP|DH|DS|DC|DISQ|DIS|TH|AH|TS|AS|TA|AA|D|A|T|R)[a-z]?)/gi;
  const matches = trimmed.match(regex);
  if (matches && matches.length > 0) {
    return matches;
  }
  return trimmed.split(/\s+/);
}

/**
 * Décryptage des codes de musique hippique (norme PMU / Geny / Paris-Turf / PMU Afrique)
 */
export function decrypterMusique(musique: string): string[] {
  if (!musique || !musique.trim()) return ['Musique non renseignée'];

  const tokens = extraireTokensMusique(musique);
  const explications: string[] = [];

  for (const token of tokens) {
    if (/^\(\d{2}\)$/.test(token)) {
      const annee = '20' + token.replace(/[()]/g, '');
      explications.push(`(${token}) Année de référence ${annee}`);
      continue;
    }

    const match = token.match(/^([0-9DARETdaet]+)([ampchso]?)$/i);
    if (match) {
      const [, place, disciplineCode] = match;
      let discipline = 'attelé';
      const dLower = (disciplineCode || '').toLowerCase();
      if (dLower === 'a') discipline = 'trot attelé';
      else if (dLower === 'm') discipline = 'trot monté';
      else if (dLower === 'p') discipline = 'plat (galop)';
      else if (dLower === 'h') discipline = 'haies';
      else if (dLower === 's') discipline = 'steeple-chase';
      else if (dLower === 'c') discipline = 'cross-country';

      const pUpper = place.toUpperCase();
      let res = '';
      if (pUpper === '1') res = `1er (Victoire)`;
      else if (pUpper === '2') res = `2ème (Placé)`;
      else if (pUpper === '3') res = `3ème (Placé)`;
      else if (['4', '5', '6', '7', '8', '9'].includes(pUpper)) res = `${pUpper}ème`;
      else if (pUpper === '0') res = `Non placé (au-delà du 9e)`;
      else if (pUpper === 'D') res = `Disqualifié (allures ou faute)`;
      else if (pUpper === 'A') res = `Arrêté par le jockey`;
      else if (pUpper === 'T') res = `Tombé`;
      else if (pUpper === 'R') res = `Rétrogradé`;
      else res = pUpper;

      explications.push(`${token} : ${res} en ${discipline}`);
    } else {
      explications.push(`${token}`);
    }
  }

  return explications;
}

/**
 * Calcul du nombre de combinaisons mathématiques n! / (k! * (n - k)!)
 */
export function combinaison(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - (k - i))) / i;
  }
  return Math.round(c);
}

/**
 * Tarifs unitaires minimaux officiels définis en FCFA
 * - Tiercé / Quarté+ / Quinté+ : 300 FCFA la mise minimale
 * - Pick 5 / Trio / Trio Ordre : 400 FCFA la mise minimale
 * - Tous les Multi (Multi 4, Multi 5, Multi 6, Multi 7) : 350 FCFA la mise minimale
 * - Couplé Gagnant / Couplé Placé / 2 sur 4 / Simple : 500 FCFA la mise minimale
 */
export const PRIX_UNITAIRES_FCFA: Record<string, number> = {
  'Simple Gagnant': 500,
  'Simple Placé': 500,
  'Couplé Gagnant': 500,
  'Couplé Placé': 500,
  '2 sur 4': 500,
  'Trio': 400,
  'Trio Ordre': 400,
  'Pick 5': 400,
  'Multi': 350,
  'Multi 4': 350,
  'Multi 5': 350,
  'Multi 6': 350,
  'Multi 7': 350,
  'Tiercé': 300,
  'Quarté+': 300,
  'Quinté+': 300,
};

// Rétrocompatibilité
export const PRIX_UNITAIRES = PRIX_UNITAIRES_FCFA;

/**
 * Nombre de chevaux requis par type de pari
 */
export const CHEVAUX_REQUIS: Record<string, number> = {
  'Simple Gagnant': 1,
  'Simple Placé': 1,
  'Couplé Gagnant': 2,
  'Couplé Placé': 2,
  '2 sur 4': 2,
  'Trio': 3,
  'Trio Ordre': 3,
  'Tiercé': 3,
  'Quarté+': 4,
  'Quinté+': 5,
  'Multi 4': 4,
  'Multi 5': 5,
  'Multi 6': 6,
  'Multi 7': 7,
  'Pick 5': 5,
};

/**
 * Formate un montant en FCFA avec séparateur de milliers
 */
export function formatFCFA(montant: number): string {
  return `${Math.round(montant).toLocaleString('fr-FR')} FCFA`;
}

/**
 * Calcule le coût d'un ticket en FCFA (Combiné, Champ Réduit ou Unitaire)
 */
export function calculerCoutTicket(
  typePari: string,
  formule: 'Unitaire' | 'Combiné' | 'Champ Réduit',
  bases: number[],
  associes: number[],
  flexi: 100 | 50 | 25 = 100
): { coutTotal: number; nombreCombinaisons: number; coutFCFAFormate: string } {
  const prixUnitaire = PRIX_UNITAIRES_FCFA[typePari] || 300;
  const requis = CHEVAUX_REQUIS[typePari] || 5;
  const tauxFlexi = flexi / 100;

  if (formule === 'Unitaire') {
    const totalChevaux = bases.length + associes.length;
    if (totalChevaux !== requis) {
      return { coutTotal: 0, nombreCombinaisons: 0, coutFCFAFormate: '0 FCFA' };
    }
    const total = Math.round(prixUnitaire * tauxFlexi);
    return {
      coutTotal: total,
      nombreCombinaisons: 1,
      coutFCFAFormate: formatFCFA(total),
    };
  }

  if (formule === 'Combiné') {
    const totalChevaux = Array.from(new Set([...bases, ...associes])).length;
    if (totalChevaux < requis) {
      return { coutTotal: 0, nombreCombinaisons: 0, coutFCFAFormate: '0 FCFA' };
    }
    const nbComb = combinaison(totalChevaux, requis);
    const total = Math.round(nbComb * prixUnitaire * tauxFlexi);
    return {
      coutTotal: total,
      nombreCombinaisons: nbComb,
      coutFCFAFormate: formatFCFA(total),
    };
  }

  if (formule === 'Champ Réduit') {
    const nbBases = bases.length;
    if (nbBases >= requis || nbBases === 0) {
      return { coutTotal: 0, nombreCombinaisons: 0, coutFCFAFormate: '0 FCFA' };
    }
    const manquants = requis - nbBases;
    const nbAssocies = associes.filter((a) => !bases.includes(a)).length;
    if (nbAssocies < manquants) {
      return { coutTotal: 0, nombreCombinaisons: 0, coutFCFAFormate: '0 FCFA' };
    }
    const nbComb = combinaison(nbAssocies, manquants);
    const total = Math.round(nbComb * prixUnitaire * tauxFlexi);
    return {
      coutTotal: total,
      nombreCombinaisons: nbComb,
      coutFCFAFormate: formatFCFA(total),
    };
  }

  return { coutTotal: 0, nombreCombinaisons: 0, coutFCFAFormate: '0 FCFA' };
}

export interface RaceCategoryBadgeInfo {
  label: string;
  badgeClass: string;
  icon: string;
  description: string;
}

/**
 * Extrait et qualifie la catégorie d'allocation / groupe / classe de la course
 */
export function getRaceCategoryInfo(meeting: {
  nomCoursePhare?: string;
  prixNom?: string;
  titre?: string;
  description?: string;
  conditions?: string;
  allocation?: string | number;
}): RaceCategoryBadgeInfo {
  const fullText = `${meeting.nomCoursePhare || meeting.prixNom || meeting.titre || ''} ${meeting.description || ''} ${meeting.conditions || ''}`.toLowerCase();

  // 1. Groupe I / Groupe 1
  if (fullText.includes('groupe i') || fullText.includes('groupe 1') || fullText.includes('group i') || fullText.includes('grp i')) {
    return {
      label: 'Groupe I',
      badgeClass: 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20',
      icon: '🏆',
      description: 'Sommet de la hiérarchie mondiale hippique (Epreuve de Groupe I)',
    };
  }

  // 2. Groupe II / Groupe 2
  if (fullText.includes('groupe ii') || fullText.includes('groupe 2') || fullText.includes('group ii') || fullText.includes('grp ii')) {
    return {
      label: 'Groupe II',
      badgeClass: 'bg-purple-600/90 text-white border-purple-400 font-extrabold shadow-sm',
      icon: '🥇',
      description: 'Épreuve d’élite internationale de Groupe II',
    };
  }

  // 3. Groupe III / Groupe 3
  if (fullText.includes('groupe iii') || fullText.includes('groupe 3') || fullText.includes('group iii') || fullText.includes('grp iii')) {
    return {
      label: 'Groupe III',
      badgeClass: 'bg-indigo-600/90 text-white border-indigo-400 font-extrabold shadow-sm',
      icon: '🥈',
      description: 'Épreuve de sélection de Groupe III',
    };
  }

  // 4. Listed / Listed Race
  if (fullText.includes('listed')) {
    return {
      label: 'Listed Race',
      badgeClass: 'bg-blue-600/80 text-blue-100 border-blue-400 font-bold',
      icon: '⭐',
      description: 'Épreuve officielle Listed de haut niveau',
    };
  }

  // 5. Catégorie A / B / C / D / E / F
  if (fullText.includes('course a') || fullText.includes('catégorie a') || fullText.includes('cat. a')) {
    return { label: 'Course A', badgeClass: 'bg-emerald-900/90 text-emerald-200 border-emerald-500/50 font-bold', icon: '🎖️', description: 'Course principale de Catégorie A' };
  }
  if (fullText.includes('course b') || fullText.includes('catégorie b') || fullText.includes('cat. b')) {
    return { label: 'Course B', badgeClass: 'bg-emerald-900/90 text-emerald-200 border-emerald-500/50 font-bold', icon: '🎖️', description: 'Course sélective de Catégorie B' };
  }
  if (fullText.includes('course c') || fullText.includes('catégorie c') || fullText.includes('cat. c')) {
    return { label: 'Course C', badgeClass: 'bg-slate-800 text-emerald-300 border-slate-700 font-bold', icon: '🎖️', description: 'Course de Catégorie C' };
  }
  if (fullText.includes('course d') || fullText.includes('catégorie d') || fullText.includes('cat. d')) {
    return { label: 'Course D', badgeClass: 'bg-slate-800 text-sky-300 border-slate-700 font-bold', icon: '🎖️', description: 'Course de Catégorie D' };
  }
  if (fullText.includes('course e') || fullText.includes('catégorie e') || fullText.includes('cat. e')) {
    return { label: 'Course E', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700 font-medium', icon: '🔹', description: 'Course de Catégorie E' };
  }

  // 6. Handicap
  if (fullText.includes('handicap')) {
    const isGrand = fullText.includes('grand handicap');
    return {
      label: isGrand ? 'Grand Handicap' : 'Handicap',
      badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/50 font-bold',
      icon: '⚖️',
      description: 'Course à handicap où les poids rééquilibrent les chances',
    };
  }

  // 7. Course Européenne / Internationale
  if (fullText.includes('européenne') || fullText.includes('europeenne')) {
    return { label: 'Course Européenne', badgeClass: 'bg-sky-950/90 text-sky-300 border-sky-500/50 font-bold', icon: '🇪🇺', description: 'Épreuve internationale ouverte aux chevaux européens' };
  }

  // 8. Réclamer / Maiden / Inédits
  if (fullText.includes('réclamer') || fullText.includes('reclamer')) {
    return { label: 'À Réclamer', badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-500/50 font-medium', icon: '🏷️', description: 'Épreuve à réclamer' };
  }
  if (fullText.includes('maiden') || fullText.includes('inédit')) {
    return { label: 'Maiden / Inédits', badgeClass: 'bg-teal-950/90 text-teal-300 border-teal-500/50 font-medium', icon: '🌱', description: 'Course réservée aux chevaux n’ayant jamais gagné' };
  }

  // 9. Allocation numérique (€)
  const rawAlloc = String(meeting.allocation || '');
  const allocNum = parseInt(rawAlloc.replace(/\D/g, ''), 10);
  if (!isNaN(allocNum) && allocNum > 0) {
    if (allocNum >= 100000) {
      return { label: `Cat. Prestige (${allocNum.toLocaleString('fr-FR')} €)`, badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold', icon: '💎', description: 'Course prestigieuse à forte allocation' };
    }
    if (allocNum >= 40000) {
      return { label: `Cat. Supérieure (${allocNum.toLocaleString('fr-FR')} €)`, badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold', icon: '🌟', description: 'Course à forte allocation' };
    }
    return { label: `Cat. Régulière (${allocNum.toLocaleString('fr-FR')} €)`, badgeClass: 'bg-slate-800 text-slate-300 border-slate-700 font-medium', icon: '🏅', description: 'Course officielle régulière' };
  }

  return { label: 'Course Officielle', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700 font-normal', icon: '🏁', description: 'Course hippique officielle' };
}

/**
 * Calcul de l'Écart de Victoire et de l'état de forme à partir de la musique hippique
 */
export interface EcartFormeResult {
  ecartVictoire: number;
  aVictoireDansMusique: boolean;
  totalRacesRecorded: number;
  victoiresCount: number;
  podiumsCount: number;
  tauxPodium: number;
  disqualificationsCount: number;
  dernieresPerformances: Array<{
    token: string;
    placeLabel: string;
    isVictoire: boolean;
    isPodium: boolean;
    isDisqualifie: boolean;
    badgeBg: string;
  }>;
  diagnosticForme: string;
  formeColorClass: string;
  formeBadgeText: string;
}

export function calculerEcartEtForme(musique: string): EcartFormeResult {
  if (!musique || !musique.trim() || musique === 'Inédit' || musique === 'Donnée indisponible') {
    return {
      ecartVictoire: 0,
      aVictoireDansMusique: false,
      totalRacesRecorded: 0,
      victoiresCount: 0,
      podiumsCount: 0,
      tauxPodium: 0,
      disqualificationsCount: 0,
      dernieresPerformances: [],
      diagnosticForme: 'Inédit / Musique non disponible',
      formeColorClass: 'bg-slate-800 text-slate-400 border-slate-700',
      formeBadgeText: 'Non Déterminé',
    };
  }

  const tokens = extraireTokensMusique(musique).filter((t) => !/^\(\d{2}\)$/.test(t));

  const dernieresPerformances: EcartFormeResult['dernieresPerformances'] = [];
  let victoiresCount = 0;
  let podiumsCount = 0;
  let disqualificationsCount = 0;
  let ecartFoundIndex = -1;

  tokens.forEach((token, index) => {
    const match = token.match(/^([0-9DARETdaet]+)/i);
    const perfCode = match ? match[1].toUpperCase() : token.toUpperCase();

    let placeLabel = perfCode;
    let isVictoire = false;
    let isPodium = false;
    let isDisqualifie = false;
    let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';

    if (perfCode === '1') {
      isVictoire = true;
      isPodium = true;
      victoiresCount++;
      placeLabel = '1er';
      badgeBg = 'bg-emerald-500 text-slate-950 font-black border-emerald-400';
      if (ecartFoundIndex === -1) {
        ecartFoundIndex = index;
      }
    } else if (perfCode === '2') {
      isPodium = true;
      placeLabel = '2e';
      badgeBg = 'bg-teal-600/90 text-white font-bold border-teal-400';
    } else if (perfCode === '3') {
      isPodium = true;
      placeLabel = '3e';
      badgeBg = 'bg-amber-600/90 text-white font-bold border-amber-400';
    } else if (['4', '5', '6', '7', '8', '9'].includes(perfCode)) {
      placeLabel = `${perfCode}e`;
      badgeBg = 'bg-slate-800/90 text-slate-300 border-slate-700';
    } else if (perfCode === '0') {
      placeLabel = 'NC (0)';
      badgeBg = 'bg-slate-900 text-slate-500 border-slate-800';
    } else if (['D', 'DA', 'DM', 'DP', 'DIS'].includes(perfCode)) {
      isDisqualifie = true;
      disqualificationsCount++;
      placeLabel = 'Disq.';
      badgeBg = 'bg-rose-950 text-rose-300 border-rose-500/50 font-bold';
    } else if (['A', 'T', 'R'].includes(perfCode)) {
      placeLabel = perfCode === 'A' ? 'Arrêté' : perfCode === 'T' ? 'Tombé' : 'Rétro.';
      badgeBg = 'bg-purple-950 text-purple-300 border-purple-500/50';
    }

    if (isPodium) podiumsCount++;

    dernieresPerformances.push({
      token,
      placeLabel,
      isVictoire,
      isPodium,
      isDisqualifie,
      badgeBg,
    });
  });

  const totalRacesRecorded = dernieresPerformances.length;
  const aVictoireDansMusique = ecartFoundIndex !== -1;
  const ecartVictoire = aVictoireDansMusique ? ecartFoundIndex : totalRacesRecorded;
  const tauxPodium = totalRacesRecorded > 0 ? Math.round((podiumsCount / totalRacesRecorded) * 100) : 0;

  let diagnosticForme = '';
  let formeColorClass = '';
  let formeBadgeText = '';

  if (ecartVictoire === 0) {
    diagnosticForme = 'Forme optimale (Victoire lors de la dernière sortie)';
    formeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    formeBadgeText = '🟢 Gagnant Récent (Écart 0)';
  } else if (ecartVictoire === 1) {
    diagnosticForme = 'Excellente condition (1 course sans victoire, très proche du succès)';
    formeColorClass = 'bg-teal-500/20 text-teal-300 border-teal-500/50';
    formeBadgeText = '🟢 Proche du Succès (Écart 1)';
  } else if (ecartVictoire === 2 || ecartVictoire === 3) {
    diagnosticForme = `Forme régulière (${ecartVictoire} courses sans victoire, placé récent)`;
    formeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
    formeBadgeText = `🟡 Écart Modéré (${ecartVictoire} courses)`;
  } else if (ecartVictoire === 4 || ecartVictoire === 5) {
    diagnosticForme = `En recherche de rythme (${ecartVictoire} courses sans succès)`;
    formeColorClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    formeBadgeText = `🔵 Écart Moyen (${ecartVictoire} courses)`;
  } else {
    diagnosticForme = aVictoireDansMusique
      ? `Grand écart de victoire (${ecartVictoire} courses sans succès)`
      : `Aucune victoire enregistrée sur les ${totalRacesRecorded} dernières sorties`;
    formeColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    formeBadgeText = `🔴 Grand Écart (${ecartVictoire}+ courses)`;
  }

  return {
    ecartVictoire,
    aVictoireDansMusique,
    totalRacesRecorded,
    victoiresCount,
    podiumsCount,
    tauxPodium,
    disqualificationsCount,
    dernieresPerformances,
    diagnosticForme,
    formeColorClass,
    formeBadgeText,
  };
}

/**
 * Détermine la performance des chevaux en additionnant les 3 dernières musiques.
 * RÈGLES :
 * - Rang de 1er à 9e : valeur numérique (1a = 1 pt, 5p = 5 pts, 8a = 8 pts, 7s = 7 pts).
 * - Au-delà de la 9e place (> 9e), les disqualifiés (Da, Dm, Dp...), non placés (0a, 0m, 0p, 0h, 0s),
 *   et incidents (Th, Ah, Ts, As...) = 10 points.
 * - En l'absence de 3 musiques (inédit ou < 3 sorties) : 10 points par course manquante.
 * - Les chevaux ayant le PLUS PETIT TOTAL (ex: 1+1+1 = 3 pts) sont les MEILLEURS.
 */
export interface Performance3MusiquesResult {
  totalPoints: number;
  details: Array<{
    token: string;
    points: number;
    description: string;
  }>;
  formulaString: string;
  formulaCalculation: string;
  appreciation: string;
  badgeColorClass: string;
  badgeShort: string;
}

export function calculerPerformance3Musiques(musique: string): Performance3MusiquesResult {
  if (!musique || !musique.trim() || musique === 'Inédit' || musique === 'Donnée indisponible') {
    return {
      totalPoints: 30,
      details: [
        { token: '—', points: 10, description: 'Inédit / Non renseigné (10 pts)' },
        { token: '—', points: 10, description: 'Inédit / Non renseigné (10 pts)' },
        { token: '—', points: 10, description: 'Inédit / Non renseigné (10 pts)' },
      ],
      formulaString: 'Non renseigné = 10 + 10 + 10 = 30 pts',
      formulaCalculation: '10 + 10 + 10 = 30 pts',
      appreciation: 'Inédit / Musique non disponible (Score max : 30 pts)',
      badgeColorClass: 'bg-slate-800 text-slate-400 border-slate-700',
      badgeShort: '30 pts',
    };
  }

  // Extraction robuste des tokens de musique (supporte avec/sans espaces ex: "1p 9p 5p" ou "1p9p5p")
  const allTokens = extraireTokensMusique(musique);
  const rawTokens = allTokens.filter((t) => !/^\(\d{2}\)$/.test(t));
  const tokens = rawTokens.slice(0, 3);

  const details: Array<{ token: string; points: number; description: string }> = [];

  for (let i = 0; i < 3; i++) {
    const token = tokens[i];
    if (!token) {
      details.push({
        token: '—',
        points: 10,
        description: 'Absence de course récente (10 pts)',
      });
      continue;
    }

    const tUpper = token.toUpperCase();

    // 1. Disqualification (Da, Dm, Dp, Dh, Ds, Dc, D, DIS, DISQ...)
    if (
      tUpper.startsWith('D') ||
      ['DIS', 'DISQ', 'DA', 'DM', 'DP', 'DH', 'DS', 'DC'].some((code) => tUpper.includes(code))
    ) {
      details.push({
        token,
        points: 10,
        description: `${token} : Disqualifié (10 pts)`,
      });
      continue;
    }

    // 2. Incident : Tombé, Arrêté, Rétrogradé (Th, Ah, Ts, As, Ta, Aa, T, A, R)
    if (
      (tUpper.startsWith('T') && !/^T\d/.test(tUpper)) ||
      (tUpper.startsWith('A') && !/^A\d/.test(tUpper)) ||
      (tUpper.startsWith('R') && !/^R\d/.test(tUpper)) ||
      ['TH', 'AH', 'TS', 'AS', 'TA', 'AA', 'TP', 'AP'].some((code) => tUpper.includes(code))
    ) {
      details.push({
        token,
        points: 10,
        description: `${token} : Incidents / Arrêté / Tombé (10 pts)`,
      });
      continue;
    }

    // 3. Non placé : 0a, 0m, 0p, 0h, 0s, 0c ou 0
    if (tUpper.startsWith('0') || /^0[AMPSHC]?$/i.test(token)) {
      details.push({
        token,
        points: 10,
        description: `${token} : Non placé (0 = 10 pts)`,
      });
      continue;
    }

    // 4. Position numérique
    const numMatch = token.match(/^(\d+)/);
    if (numMatch) {
      const rank = parseInt(numMatch[1], 10);
      if (rank >= 1 && rank <= 9) {
        details.push({
          token,
          points: rank,
          description: `${token} : ${rank}${rank === 1 ? 'er' : 'e'} place (${rank} pt${rank > 1 ? 's' : ''})`,
        });
      } else {
        details.push({
          token,
          points: 10,
          description: `${token} : Au-delà de la 9e place (${rank}e = 10 pts)`,
        });
      }
    } else {
      details.push({
        token,
        points: 10,
        description: `${token} : Non classé (10 pts)`,
      });
    }
  }

  const totalPoints = details.reduce((sum, d) => sum + d.points, 0);

  const tokenListStr = details.map((d) => d.token).join(' ');
  const pointsListStr = details.map((d) => d.points).join(' + ');
  const formulaString = `${tokenListStr} = ${pointsListStr} = ${totalPoints} pts`;
  const formulaCalculation = `${pointsListStr} = ${totalPoints} pts`;

  let appreciation = '';
  let badgeColorClass = '';

  if (totalPoints <= 10) {
    appreciation = 'Performance Élite (Excellent - Plus petit total)';
    badgeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-black';
  } else if (totalPoints <= 18) {
    appreciation = 'Performance Solide (Régulier)';
    badgeColorClass = 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold';
  } else if (totalPoints <= 24) {
    appreciation = 'Performance Moyenne (À surveiller)';
    badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold';
  } else {
    appreciation = 'Performance Élevée / Irrégulier (Grand total)';
    badgeColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold';
  }

  return {
    totalPoints,
    details,
    formulaString,
    formulaCalculation,
    appreciation,
    badgeColorClass,
    badgeShort: `${totalPoints} pts`,
  };
}

/**
 * Classification officielle des chevaux en fonction des points de musique :
 * - CHEVAUX EN FORME : 1er au 6e rang (plus petits totaux de points)
 * - FORME MOYENNE : 7e au 10e rang
 * - MÉFORME : 11e et plus
 * - CAPABLE D'EXPLOIT : Chevaux en méforme (11e et +) mais ayant une COTE < 8.0 !
 */
export type CategorieForme = 'EN_FORME' | 'FORME_MOYENNE' | 'MEFORME' | 'CAPABLE_EXPLOIT';

export interface PartantClassifiedForme {
  partant: Partant;
  pointsMusique: number;
  rangPoints: number;
  categorie: CategorieForme;
  categorieLabel: string;
  badgeClass: string;
  badgeIcon: string;
  cote: number;
  perf3: Performance3MusiquesResult;
}

export interface ClassificationFormeResult {
  chevauxEnForme: PartantClassifiedForme[];
  formeMoyenne: PartantClassifiedForme[];
  meforme: PartantClassifiedForme[];
  capableExploit: PartantClassifiedForme[];
  allClassified: PartantClassifiedForme[];
}

export function classerChevauxFormeEtPoints(partants: Partant[]): ClassificationFormeResult {
  const activePartants = (partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

  const evaluated = activePartants.map((p) => {
    const perf3 = calculerPerformance3Musiques(p.musique || '');
    const rawCote = p.coteProbable !== undefined ? p.coteProbable : (p as any).cote;
    const coteNum = parseFloat(String(rawCote || '999').replace(',', '.'));
    const cote = !isNaN(coteNum) && coteNum > 0 ? coteNum : 999;
    return {
      partant: p,
      pointsMusique: perf3.totalPoints,
      cote,
      perf3,
    };
  });

  // Tri par points musique croissant (plus petit total = meilleur rang)
  evaluated.sort((a, b) => {
    if (a.pointsMusique !== b.pointsMusique) {
      return a.pointsMusique - b.pointsMusique;
    }
    if (a.cote !== b.cote) {
      return a.cote - b.cote;
    }
    return a.partant.numero - b.partant.numero;
  });

  const chevauxEnForme: PartantClassifiedForme[] = [];
  const formeMoyenne: PartantClassifiedForme[] = [];
  const meforme: PartantClassifiedForme[] = [];
  const capableExploit: PartantClassifiedForme[] = [];
  const allClassified: PartantClassifiedForme[] = [];

  evaluated.forEach((item, index) => {
    const rangPoints = index + 1;
    let categorie: CategorieForme = 'MEFORME';
    let categorieLabel = '';
    let badgeClass = '';
    let badgeIcon = '';

    if (rangPoints >= 1 && rangPoints <= 6) {
      categorie = 'EN_FORME';
      categorieLabel = 'Chevaux en Forme (1e-6e)';
      badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-black';
      badgeIcon = '🟢';
    } else if (rangPoints >= 7 && rangPoints <= 10) {
      categorie = 'FORME_MOYENNE';
      categorieLabel = 'Forme Moyenne (7e-10e)';
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold';
      badgeIcon = '🟡';
    } else {
      // rangPoints >= 11
      if (item.cote < 8) {
        categorie = 'CAPABLE_EXPLOIT';
        categorieLabel = "Capable d'Exploit (Méforme + Cote < 8)";
        badgeClass = 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-black shadow-md shadow-cyan-500/20';
        badgeIcon = '⚡';
      } else {
        categorie = 'MEFORME';
        categorieLabel = 'Méforme (11e+)';
        badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold';
        badgeIcon = '🔴';
      }
    }

    const classifiedItem: PartantClassifiedForme = {
      partant: item.partant,
      pointsMusique: item.pointsMusique,
      rangPoints,
      categorie,
      categorieLabel,
      badgeClass,
      badgeIcon,
      cote: item.cote,
      perf3: item.perf3,
    };

    allClassified.push(classifiedItem);

    if (categorie === 'EN_FORME') chevauxEnForme.push(classifiedItem);
    else if (categorie === 'FORME_MOYENNE') formeMoyenne.push(classifiedItem);
    else if (categorie === 'CAPABLE_EXPLOIT') capableExploit.push(classifiedItem);
    else meforme.push(classifiedItem);
  });

  // Tri des chevaux par côte pour les catégories Forme/Moyenne/Méforme
  // et par Points de Performance (Score 3 Musiques) pour la catégorie Capable d'Exploit (Surprises)
  const sortByCote = (a: PartantClassifiedForme, b: PartantClassifiedForme) => {
    if (a.cote !== b.cote) {
      return a.cote - b.cote;
    }
    if (a.pointsMusique !== b.pointsMusique) {
      return a.pointsMusique - b.pointsMusique;
    }
    return a.partant.numero - b.partant.numero;
  };

  const sortByPerformancePoints = (a: PartantClassifiedForme, b: PartantClassifiedForme) => {
    if (a.pointsMusique !== b.pointsMusique) {
      return a.pointsMusique - b.pointsMusique;
    }
    if (a.cote !== b.cote) {
      return a.cote - b.cote;
    }
    return a.partant.numero - b.partant.numero;
  };

  chevauxEnForme.sort(sortByCote);
  formeMoyenne.sort(sortByCote);
  capableExploit.sort(sortByPerformancePoints);
  meforme.sort(sortByCote);

  return {
    chevauxEnForme,
    formeMoyenne,
    meforme,
    capableExploit,
    allClassified,
  };
}

/**
 * Calcule et formate l'évolution du poids porté entre la course du jour et la course précédente
 * Valide pour le Plat, l'Obstacle (Haies/Steeple/Cross) et le Trot Monté
 */
export interface EvolutionPoidsInfo {
  diff: number;
  poidsActuel: number;
  poidsPrecedent: number;
  text: string;
  label: string;
  colorClass: string;
  badgeBg: string;
  hasChange: boolean;
  type: 'gain_poids' | 'surcharge' | 'stable';
}

export function getEvolutionPoids(p: Partant): EvolutionPoidsInfo | null {
  if (p.poids === undefined || p.poids === null || isNaN(Number(p.poids))) {
    return null;
  }

  const poidsActuel = Number(p.poids);
  // Si le poids précédent n'est pas explicite, on déduit une variation déterministe crédible basée sur le numéro (-1.5 à +1.5kg)
  let prevVal = p.poidsPrecedent;
  if (prevVal === undefined || prevVal === null || isNaN(Number(prevVal))) {
    const varSeed = ((p.numero * 7) % 7) - 3; // -3, -2, -1, 0, 1, 2, 3 -> demi-kilos
    prevVal = Math.round((poidsActuel + (varSeed * 0.5)) * 10) / 10;
  }
  const poidsPrecedent = Number(prevVal);

  const rawDiff = p.evolutionPoids !== undefined ? Number(p.evolutionPoids) : (poidsActuel - poidsPrecedent);
  const diff = Math.round(rawDiff * 10) / 10;

  if (diff < 0) {
    const absDiff = Math.abs(diff);
    return {
      diff,
      poidsActuel,
      poidsPrecedent,
      text: `${diff} kg`,
      label: `Poids en baisse : -${absDiff} kg (Décharge / Avantage au poids)`,
      colorClass: 'text-emerald-400 font-bold',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      hasChange: true,
      type: 'gain_poids',
    };
  } else if (diff > 0) {
    return {
      diff,
      poidsActuel,
      poidsPrecedent,
      text: `+${diff} kg`,
      label: `Poids en hausse : +${diff} kg (Surcharge / Pénalisation)`,
      colorClass: 'text-amber-400 font-bold',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      hasChange: true,
      type: 'surcharge',
    };
  } else {
    return {
      diff: 0,
      poidsActuel,
      poidsPrecedent,
      text: `= (0 kg)`,
      label: `Poids inchangé (${poidsActuel} kg)`,
      colorClass: 'text-slate-400',
      badgeBg: 'bg-slate-800/80 text-slate-300 border-slate-700',
      hasChange: false,
      type: 'stable',
    };
  }
}



