import { CourseHippique, Partant } from '../types/turf';

export type TrioProfileType =
  | 'REGULIER'
  | 'PROGRESSION'
  | 'BIEN_ENGAGE'
  | 'ADAPTE_RYTHME'
  | 'DEFENDU'
  | 'OUTSIDER_UTILE'
  | 'STANDARD';

export type TrioRoleType = 'BASE' | 'CHALLENGER' | 'OUTSIDER_UTILE' | 'COMPLEMENT' | 'DELAISSE';

export interface TrioChevalScore {
  partant: Partant;
  scoreTrio: number; // Note globale 0 - 100 orientée Place Top 3
  composantes: {
    F: number; // Forme récente et régularité (30%)
    A: number; // Aptitude distance / terrain / piste (20%)
    N: number; // Niveau de course et opposition (15%)
    P: number; // Profil de course / pace (15%)
    C: number; // Couple jockey-driver et entraîneur (10%)
    R: number; // Risque : fraîcheur, ferrure, corde, poids (10%)
  };
  disciplineDetails: {
    rkAjusteeScore?: number;
    fiabiliteAllureScore?: number;
    deferrageScore?: number;
    modeDepartScore?: number;
    reculScore?: number;
    poidsMonteScore?: number;
    sautFiabiliteScore?: number;
  };
  profilDetecte: {
    type: TrioProfileType;
    label: string;
    description: string;
    badgeColor: string;
  };
  roleTrio: TrioRoleType;
  rangTrio: number;
  probabiliteTop3: number; // % de chance de figurer dans les 3 premiers
  filtresEliminatoires: {
    estElimine: boolean;
    motifs: string[];
  };
}

export interface TrioSelectionResult {
  discipline: string;
  tailleLot: number;
  nombreRetenus: number; // 5 à 8 selon la taille du lot
  base: TrioChevalScore | null;
  challenger: TrioChevalScore | null;
  outsiderUtile: TrioChevalScore | null;
  complement: TrioChevalScore | null;
  selectionTrio: TrioChevalScore[]; // Les 5 à 8 retenus
  tousLesPartants: TrioChevalScore[];
  tickets: {
    trioDirect: number[]; // 3 chevaux prioritaires
    trioElargi: number[]; // 4 à 5 chevaux
    champReduit: {
      bases: number[];
      associes: number[];
      combinaisonsCount: number;
      coutBase: number;
    };
    combine: {
      chevaux: number[];
      combinaisonsCount: number;
      coutBase: number;
    };
  };
  statistiquesModele: {
    scoreMoyenTop3: number;
    indiceConfianceTrio: number;
    rythmeCourseEstime: string;
  };
}

/**
 * Extrait les places chiffrées depuis la musique officielle (ex: "1a 3a 2a Da 4a")
 */
function parseMusiquePlaces(musique?: string): number[] {
  if (!musique) return [];
  const matches = musique.match(/\d{1,2}/g);
  if (!matches) return [];
  return matches.map((m) => parseInt(m, 10)).filter((n) => !isNaN(n));
}

/**
 * Calcule F (Forme récente et régularité - 30%)
 * Orienté régularité et constance dans les 5 premiers plutôt que victoire isolée.
 */
function computeFormeRegularite(p: Partant): number {
  const places = parseMusiquePlaces(p.musique);
  if (places.length === 0) return 50;

  const recent = places.slice(0, 5);
  let points = 0;
  let weightsTotal = 0;

  recent.forEach((place, idx) => {
    const weight = 1 / (idx + 1);
    weightsTotal += weight;

    if (place === 1) points += 100 * weight;
    else if (place === 2) points += 92 * weight;
    else if (place === 3) points += 85 * weight; // Haute prime aux podiums
    else if (place <= 5) points += 70 * weight; // Excellente note pour cheval placé
    else if (place <= 7) points += 45 * weight;
    else points += 15 * weight;
  });

  const baseScore = weightsTotal > 0 ? points / weightsTotal : 50;

  // Bonus régularité : si 3 sorties ou plus dans le Top 5 sur les 5 dernières courses
  const top5Count = recent.filter((r) => r <= 5).length;
  const regulariteBonus = top5Count >= 3 ? 10 : top5Count >= 2 ? 5 : 0;

  return Math.min(100, Math.round(baseScore + regulariteBonus));
}

/**
 * Calcule A (Aptitude distance / terrain / piste - 20%)
 */
function computeAptitudeConditions(p: Partant, course: CourseHippique): number {
  let score = 65; // Base neutre

  // Aptitude distance
  if (course.distance && p.distance) {
    const ecart = Math.abs(course.distance - p.distance);
    if (ecart === 0) score += 15;
    else if (ecart <= 200) score += 10;
    else if (ecart <= 400) score += 5;
    else score -= 10;
  }

  // Aptitude terrain / piste
  const musiqueStr = (p.musique || '').toLowerCase();
  const disc = (course.discipline || '').toLowerCase();

  if (disc.includes('plat') || disc.includes('obstacle')) {
    // Si piste PSF ou herbe lourde
    const terrain = (course.terrain || '').toLowerCase();
    if (terrain.includes('lourd') || terrain.includes('souple')) {
      if (musiqueStr.includes('1') || musiqueStr.includes('2') || musiqueStr.includes('3')) {
        score += 8;
      }
    }
  }

  // Bonus record personnel si disponible
  if (p.record && p.record.includes('1\'')) {
    score += 5;
  }

  return Math.min(100, Math.max(20, Math.round(score)));
}

/**
 * Calcule N (Niveau de course et opposition - 15%)
 */
function computeNiveauOpposition(p: Partant, allPartants: Partant[]): number {
  const cote = p.coteProbable ?? 20;

  // Calcul basé sur les gains relatifs et la cote marchande
  const allGains = allPartants.map((pt) => pt.gains || 0).filter((g) => g > 0);
  const maxGain = allGains.length > 0 ? Math.max(...allGains) : 100000;
  const pGain = p.gains || 0;

  const ratioGain = Math.min(1, pGain / (maxGain || 1));
  const coteScore = cote <= 4.0 ? 90 : cote <= 8.0 ? 80 : cote <= 15.0 ? 70 : cote <= 25.0 ? 55 : 40;

  const finalScore = Math.round(ratioGain * 45 + coteScore * 0.55);
  return Math.min(100, Math.max(20, finalScore));
}

/**
 * Calcule P (Profil de course / pace - 15%)
 */
function computeProfilPace(p: Partant, course: CourseHippique): number {
  let score = 70;
  const num = p.numero;
  const corde = p.corde;
  const disc = (course.discipline || '').toLowerCase();

  // Autostart Trot : Numéros 3 à 6 idéaux
  if (disc.includes('attelé') || disc.includes('trot')) {
    if (num >= 3 && num <= 6) score += 15;
    else if (num >= 1 && num <= 2) score += 8;
    else if (num >= 7 && num <= 9) score += 5;
    else if (num >= 10) score -= 10; // Seconde ligne
  }

  // Plat : Corde favorable
  if (disc.includes('plat') && corde !== undefined) {
    if (corde <= 5) score += 12;
    else if (corde <= 9) score += 6;
    else score -= 8;
  }

  return Math.min(100, Math.max(25, score));
}

/**
 * Calcule C (Couple jockey-driver et entraîneur - 10%)
 */
function computeCoupleDriverEntraineur(p: Partant): number {
  let score = 55;

  const topDrivers = [
    'J.M. Bazire', 'N. Bazire', 'E. Raffin', 'M. Abrivard', 'A. Abrivard',
    'F. Nivard', 'D. Thomain', 'C. Soumillon', 'M. Barzalona', 'S. Pasquier',
    'G. Mossé', 'T. Piccone', 'M. Guyon', 'A. Lemaitre', 'A. Pouchin',
    'J. Reveley', 'K. Nabet', 'B. Le Clerc', 'L. Zuliani'
  ];

  const topTrainers = [
    'J.M. Bazire', 'Th. Duvaldestin', 'Ph. Allaire', 'S. Guarato', 'L.Cl. Abrivard',
    'F. Graffard', 'A. Fabre', 'J.C. Rouget', 'C. Ferland', 'H.A. Pantall',
    'F. Nicolle', 'G. Macaire', 'E. Clayeux', 'A. Chaillé-Chaillé'
  ];

  const driverName = p.driver || '';
  const trainerName = p.entraineur || '';

  const isTopDriver = topDrivers.some((d) => driverName.toLowerCase().includes(d.toLowerCase()));
  const isTopTrainer = topTrainers.some((t) => trainerName.toLowerCase().includes(t.toLowerCase()));

  if (isTopDriver) score += 25;
  if (isTopTrainer) score += 15;
  if (driverName && driverName === trainerName) score += 5; // Driver-entraîneur direct

  return Math.min(100, score);
}

/**
 * Calcule R (Risque : fraîcheur, ferrure, corde, poids - 10%)
 */
function computeRisqueFacteurs(p: Partant, course: CourseHippique): number {
  let score = 70;
  const ferrure = (p.ferrure || '').toUpperCase();
  const disc = (course.discipline || '').toLowerCase();

  // Déferrage Trot
  if (disc.includes('trot') || disc.includes('attelé')) {
    if (ferrure === 'D4') score += 18; // D4 est le signal d'intention majeur
    else if (ferrure === 'DP' || ferrure === 'DA') score += 10;
    else if (ferrure === 'FERRÉ' || ferrure === 'FERRE') score -= 5;
  }

  // Risque allures / fautes
  const musique = (p.musique || '').toLowerCase();
  const daiCount = (musique.match(/d/g) || []).length;
  if (daiCount >= 2) score -= 20; // Risque de disqualification

  // Poids en plat/obstacle
  if (p.poids && p.poids > 60) {
    score -= 8;
  }

  return Math.min(100, Math.max(15, score));
}

/**
 * Vérifie les filtres éliminatoires stricts avant calcul
 */
function evaluateFiltresEliminatoires(p: Partant, course: CourseHippique): { estElimine: boolean; motifs: string[] } {
  const motifs: string[] = [];
  const musique = (p.musique || '').toLowerCase();
  const disc = (course.discipline || '').toLowerCase();

  // 1. Non partant
  if (p.estNonPartant || p.statut === 'Non-partant') {
    motifs.push('Cheval déclaré non-partant');
    return { estElimine: true, motifs };
  }

  // 2. Fautes répétées au trot (3 Da/Dai consécutives récentes)
  if (disc.includes('trot') || disc.includes('attelé')) {
    if (musique.startsWith('da da') || musique.startsWith('d d') || musique.startsWith('dai dai dai')) {
      motifs.push('Fautes et disqualifications répétées aux allures');
    }
  }

  // 3. Obstacles : Chutes répétées récentes (A / Arrêté, T / Tombé)
  if (disc.includes('obstacle') || disc.includes('haies') || disc.includes('steeple')) {
    if (musique.includes('tb') || musique.includes('arr') || (musique.match(/[at]/g) || []).length >= 3) {
      motifs.push('Historique d\'arrêts ou de chutes répétées en obstacle');
    }
  }

  // 4. Hors de forme absolu (plus de 10 sorties sans aucun Top 7)
  const places = parseMusiquePlaces(p.musique);
  if (places.length >= 5 && places.slice(0, 5).every((pl) => pl >= 9)) {
    motifs.push('Nettement hors de forme (aucun résultat dans les 8 premiers)');
  }

  return {
    estElimine: motifs.length >= 2,
    motifs,
  };
}

/**
 * Détecte le profil typique candidat Trio
 */
function detectTrioProfile(p: Partant, composantes: { F: number; A: number; N: number; P: number; C: number; R: number }): {
  type: TrioProfileType;
  label: string;
  description: string;
  badgeColor: string;
} {
  const cote = p.coteProbable ?? 20;
  const places = parseMusiquePlaces(p.musique);
  const top5Count = places.slice(0, 5).filter((pl) => pl <= 5).length;

  // 1. L'outsider utile : cote élevée (>= 15), mais composantes Aptitude et Profil solides
  if (cote >= 14 && composantes.A >= 70 && composantes.P >= 65) {
    return {
      type: 'OUTSIDER_UTILE',
      label: 'L\'outsider utile',
      description: 'Cote séduisante avec excellente aptitude distance et profil idéal pour accrocher la 3e place.',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    };
  }

  // 2. Le cheval régulier : finit souvent dans les 5 premiers
  if (top5Count >= 3 || composantes.F >= 80) {
    return {
      type: 'REGULIER',
      label: 'Le cheval régulier',
      description: 'Constance remarquable dans les 5 premiers, profil type du podium assuré.',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }

  // 3. Le cheval en progression : dernières figures / places en amélioration continue
  if (places.length >= 3 && places[0] < places[1] && places[1] <= places[2]) {
    return {
      type: 'PROGRESSION',
      label: 'Le cheval en progression',
      description: 'Courbe de forme ascendante, monte en puissance sur ses dernières tentatives.',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    };
  }

  // 4. Le cheval défendu : top driver/jockey ou ferrure D4 avec entourage en confiance
  if (composantes.C >= 80 || (composantes.R >= 85 && (p.ferrure || '').toUpperCase() === 'D4')) {
    return {
      type: 'DEFENDU',
      label: 'Le cheval défendu',
      description: 'Entourage offensif, monte de premier plan et configuration de course optimale.',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  // 5. Le cheval adapté au rythme : excellent pace / numéro autostart / corde
  if (composantes.P >= 80) {
    return {
      type: 'ADAPTE_RYTHME',
      label: 'Adapté au rythme',
      description: 'Parfaitement positionné pour suivre le train sans forcer et préserver sa place.',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    };
  }

  // 6. Le cheval bien engagé : niveau de course avantageux
  if (composantes.N >= 75) {
    return {
      type: 'BIEN_ENGAGE',
      label: 'Le cheval bien engagé',
      description: 'Engagement de choix au plafond des gains ou descente de catégorie opportune.',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    };
  }

  return {
    type: 'STANDARD',
    label: 'Profil standard',
    description: 'Profil moyen sans angle dominant particulier pour le podium.',
    badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
  };
}

/**
 * MOTEUR OFFICIEL DE CALCUL DU « SCORE POTENTIEL TRIO »
 * Formule : Score trio = 0,30*F + 0,20*A + 0,15*N + 0,15*P + 0,10*C + 0,10*R
 */
export function calculerPotentielTrio(course: CourseHippique): TrioSelectionResult {
  const partants = (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');
  const tailleLot = partants.length;

  // Calcul du nombre de retenus selon la taille du lot :
  // < 10 partants : 5 chevaux
  // 10 - 13 partants : 6 chevaux
  // 14 - 15 partants : 7 chevaux
  // 16+ partants : 8 chevaux
  const nombreRetenus = tailleLot <= 10 ? 5 : tailleLot <= 13 ? 6 : tailleLot <= 15 ? 7 : 8;

  const scoredPartants: TrioChevalScore[] = partants.map((p) => {
    const filtres = evaluateFiltresEliminatoires(p, course);

    // 1. Calcul des 6 composantes fondamentales
    const F = computeFormeRegularite(p);
    const A = computeAptitudeConditions(p, course);
    const N = computeNiveauOpposition(p, partants);
    const P = computeProfilPace(p, course);
    const C = computeCoupleDriverEntraineur(p);
    const R = computeRisqueFacteurs(p, course);

    // 2. Application stricte de la pondération officielle :
    // Score trio = 0,30*F + 0,20*A + 0,15*N + 0,15*P + 0,10*C + 0,10*R
    let rawScore = 0.30 * F + 0.20 * A + 0.15 * N + 0.15 * P + 0.10 * C + 0.10 * R;

    // Pénalité éliminatoire si critères négatifs majeurs
    if (filtres.estElimine) {
      rawScore *= 0.65;
    }

    const finalScore = Math.min(100, Math.max(5, Math.round(rawScore * 10) / 10));

    // Estimation de probabilité Top 3 (Softmax simplifiée)
    const probTop3 = Math.min(88, Math.max(5, Math.round(finalScore * 0.85)));

    const profilDetecte = detectTrioProfile(p, { F, A, N, P, C, R });

    return {
      partant: p,
      scoreTrio: finalScore,
      composantes: { F, A, N, P, C, R },
      disciplineDetails: {
        rkAjusteeScore: Math.round(A),
        fiabiliteAllureScore: Math.round(F),
        deferrageScore: Math.round(R),
        modeDepartScore: Math.round(P),
      },
      profilDetecte,
      roleTrio: 'DELAISSE',
      rangTrio: 0,
      probabiliteTop3: probTop3,
      filtresEliminatoires: filtres,
    };
  });

  // Tri par Score Trio décroissant
  scoredPartants.sort((a, b) => b.scoreTrio - a.scoreTrio);

  // Attribution des rangs et des rôles tactiques pour le Trio :
  // - 1er : Base solide (capable de gagner ou d'assurer le podium)
  // - 2e : Challenger (figure proche de la base)
  // - 3e ou premier outsider utile : Outsider utile
  // - 4e et suivants dans la sélection : Compléments
  scoredPartants.forEach((sp, idx) => {
    sp.rangTrio = idx + 1;
    if (idx === 0) sp.roleTrio = 'BASE';
    else if (idx === 1) sp.roleTrio = 'CHALLENGER';
    else if (idx === 2) sp.roleTrio = 'OUTSIDER_UTILE';
    else if (idx < nombreRetenus) sp.roleTrio = 'COMPLEMENT';
    else sp.roleTrio = 'DELAISSE';
  });

  const selectionTrio = scoredPartants.slice(0, nombreRetenus);

  const base = selectionTrio[0] || null;
  const challenger = selectionTrio[1] || null;
  const outsiderUtile =
    selectionTrio.find((s) => s.profilDetecte.type === 'OUTSIDER_UTILE') ||
    selectionTrio[2] ||
    null;
  const complement = selectionTrio.find((s) => s !== base && s !== challenger && s !== outsiderUtile) || selectionTrio[3] || null;

  // Construction des tickets Trio recommandés
  const trioDirect = [
    base ? base.partant.numero : 0,
    challenger ? challenger.partant.numero : 0,
    outsiderUtile ? outsiderUtile.partant.numero : (selectionTrio[2]?.partant.numero || 0),
  ].filter((n) => n > 0);

  const trioElargi = selectionTrio.slice(0, 5).map((s) => s.partant.numero);

  // Champ Réduit : 2 bases solides (Base + Challenger) associées au reste de la sélection
  const champBases = [base?.partant.numero, challenger?.partant.numero].filter(Boolean) as number[];
  const champAssocies = selectionTrio
    .filter((s) => !champBases.includes(s.partant.numero))
    .map((s) => s.partant.numero);

  const combinaisonsChamp = champAssocies.length;
  const combineNums = selectionTrio.map((s) => s.partant.numero);
  const n = combineNums.length;
  // C(n, 3) = n * (n-1) * (n-2) / 6
  const combinaisonsCombine = Math.round((n * (n - 1) * (n - 2)) / 6);

  // Statistiques du modèle Trio
  const top3Scores = selectionTrio.slice(0, 3).map((s) => s.scoreTrio);
  const scoreMoyenTop3 =
    top3Scores.length > 0 ? Math.round((top3Scores.reduce((a, b) => a + b, 0) / top3Scores.length) * 10) / 10 : 0;
  const indiceConfiance = Math.min(95, Math.max(50, Math.round(scoreMoyenTop3 * 0.95)));

  return {
    discipline: course.discipline || 'Trot Attelé',
    tailleLot,
    nombreRetenus,
    base,
    challenger,
    outsiderUtile,
    complement,
    selectionTrio,
    tousLesPartants: scoredPartants,
    tickets: {
      trioDirect,
      trioElargi,
      champReduit: {
        bases: champBases,
        associes: champAssocies,
        combinaisonsCount: combinaisonsChamp,
        coutBase: combinaisonsChamp * 1.5, // Base unitaire 1,5 € ou 1000 FCFA
      },
      combine: {
        chevaux: combineNums,
        combinaisonsCount: combinaisonsCombine,
        coutBase: combinaisonsCombine * 1.5,
      },
    },
    statistiquesModele: {
      scoreMoyenTop3,
      indiceConfianceTrio: indiceConfiance,
      rythmeCourseEstime:
        (course.discipline || '').toLowerCase().includes('attelé')
          ? 'Rythme sélectif avec leaders en tête, favorable aux trotteurs réguliers sans faute.'
          : 'Train régulier, opportunité forte pour les finisseurs et attendants bien placés.',
    },
  };
}
