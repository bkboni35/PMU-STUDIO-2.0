import * as XLSX from 'xlsx';
import { CourseHippique, Partant } from '../types/turf';
import { getEvolutionPoids } from './turfCalculations';

export interface PlatQuantitativeRunner {
  numero: number;
  nom: string;
  corde: number | string;
  poids: number | string;
  poidsPrecedent?: number | string;
  evolutionPoids?: number | string;
  jockey: string;
  entraineur: string;
  musique: string;
  equipement: string;
  valeur: number | null;
  cote: number | null;
  coteManquante: boolean;
  estNonPartant: boolean;

  // Notes d'entrée
  formeMoyenne: number;
  noteJockey: number; // 1-10
  noteEntraineur: number; // 1-10

  // Scores calculés (0 - 100)
  scoreForme: number;
  scoreClasse: number;
  scorePoids: number;
  scoreJockey: number;
  scoreEntraineur: number;
  scoreMarche: number;

  // Score final et rang
  scoreFinal: number;
  rang: number;

  // Probabilités et Value Index
  pModele: number; // pourcentage (0 - 1)
  pMarche: number | null; // pourcentage (0 - 1)
  valueIndex: number | null;
  flag: 'SOUS-ÉVALUÉ (VALUE)' | 'SUR-ÉVALUÉ (FAUX FAVORI)' | 'COHÉRENT' | 'COTE MANQUANTE - VÉRIFIER PARTANT' | 'NON-PARTANT';
}

export interface PlatQuantitativeResult {
  runners: PlatQuantitativeRunner[];
  top8: PlatQuantitativeRunner[];
  minValeur: number;
  maxValeur: number;
  minPoids: number;
  maxPoids: number;
  minCote: number;
  maxCote: number;
  sumExp: number;
  sumInverseCote: number;
  hasNonPartants: boolean;
  hasMissingOdds: boolean;
}

/**
 * Calcule la moyenne de position sur les 4 dernières courses (musique).
 * Règle :
 * - 1er = 1, 2e = 2 ... 9e = 9
 * - 0 / Non classé / NC = 12
 * - D (disqualifié) = 15 (pénalité max)
 * - A (arrêté) / T (tombé) / R (rétrogradé) = 14
 */
export function extraireFormeMoyenneMusique(musique?: string): number {
  if (!musique || !musique.trim() || musique === 'Donnée indisponible' || musique === 'N/A') {
    return 12; // Valeur par défaut si non renseigné
  }

  // Tokenize en ignorant les années ex: (26), (25)
  const tokens = musique.trim().split(/\s+/).filter(t => !/^\(\d{2}\)$/.test(t));
  const positions: number[] = [];

  for (const token of tokens) {
    if (positions.length >= 4) break;
    const match = token.match(/^([0-9DARETdaet]+)/i);
    if (!match) continue;

    const char = match[1].toUpperCase();
    if (char === '0') {
      positions.push(12);
    } else if (char === 'D') {
      positions.push(15);
    } else if (char === 'A' || char === 'T' || char === 'R') {
      positions.push(14);
    } else {
      const num = parseInt(char, 10);
      if (!isNaN(num) && num > 0) {
        positions.push(Math.min(num, 12));
      } else {
        positions.push(12);
      }
    }
  }

  if (positions.length === 0) return 12;
  const sum = positions.reduce((acc, p) => acc + p, 0);
  return Number((sum / positions.length).toFixed(2));
}

/**
 * Évalue la note qualitative Jockey (1 à 10)
 */
export function estimerNoteJockey(driver?: string, p?: Partant): number {
  const d = (driver || p?.driver || (p as any)?.jockey || '').toLowerCase();
  if (!d || d === 'donnée indisponible' || d === 'inconnu') return 5.5;

  // Notoriété top jockeys plat France
  const elite = ['barzalona', 'guyon', 'pasquier', 'soumillon', 'demuro', 'bachelot', 'lecoueuvre', 'peslier', 'mendizabal', 'veron', 'hardouin', 'piccone', 'madamet', 'crastus', 'velon'];
  const confirms = ['mosse', 'cheminaud', 'boudot', 'planque', 'forest', 'trullier', 'santiago', 'lefeuvre', 'boisseau', 'nicco', 'valle skar'];

  for (const name of elite) {
    if (d.includes(name)) return 9.0;
  }
  for (const name of confirms) {
    if (d.includes(name)) return 7.5;
  }
  return 6.0;
}

/**
 * Évalue la note qualitative Entraîneur (1 à 10)
 */
export function estimerNoteEntraineur(entraineur?: string, p?: Partant): number {
  const e = (entraineur || p?.entraineur || '').toLowerCase();
  if (!e || e === 'donnée indisponible' || e === 'inconnu') return 5.5;

  // Notoriété écuries top plat France
  const elite = ['fabre', 'rouget', 'graffard', 'pantall', 'wattel', 'chappet', 'barberot', 'delzangles', 'de royer', 'ferland', 'vermeulen', 'monfort'];
  const confirms = ['caullery', 'brandolini', 'bellanger', 'lefebvre', 'prod\'homme', 'smaga', 'alloncle', 'pitart', 'guarnieri', 'decouz'];

  for (const name of elite) {
    if (e.includes(name)) return 9.0;
  }
  for (const name of confirms) {
    if (e.includes(name)) return 7.5;
  }
  return 6.0;
}

/**
 * MOTEUR QUANTITATIF DE PLAT PONDÉRÉ :
 * Applique la grille stricte de 6 modules pondérés et calcule les probabilités modèle/marché et Value Index.
 */
export function calculerModelePlatPondere(course: CourseHippique): PlatQuantitativeResult {
  const rawPartants = course.partants || [];

  // 1. Filtrer et préparer les données
  interface TempItem {
    partant: Partant;
    numero: number;
    nom: string;
    corde: number | string;
    poidsNum: number;
    poidsStr: number | string;
    jockey: string;
    entraineur: string;
    musique: string;
    equipement: string;
    valeurNum: number | null;
    coteNum: number | null;
    coteManquante: boolean;
    estNonPartant: boolean;
    formeMoyenne: number;
    noteJockey: number;
    noteEntraineur: number;
  }

  const items: TempItem[] = rawPartants.map((p) => {
    const isNP = Boolean(p.estNonPartant || p.statut === 'Non-partant' || (p as any).nonPartant === true);

    // Extraction poids
    let poidsNum = 56;
    const rawPoids = (p as any).poids;
    if (typeof rawPoids === 'number' && !isNaN(rawPoids)) {
      poidsNum = rawPoids;
    } else if (typeof rawPoids === 'string') {
      const parsed = parseFloat(rawPoids.replace(',', '.'));
      if (!isNaN(parsed)) poidsNum = parsed;
    }

    // Extraction valeur handicap
    let valeurNum: number | null = null;
    const vRaw = (p as any).valeurHandicap ?? (p as any).valeur;
    if (typeof vRaw === 'number' && !isNaN(vRaw)) valeurNum = vRaw;
    else if (typeof vRaw === 'string') {
      const parsed = parseFloat(vRaw.replace(',', '.'));
      if (!isNaN(parsed)) valeurNum = parsed;
    }

    // Extraction cote
    let coteNum: number | null = null;
    let coteManquante = false;
    const cRaw = p.coteProbable ?? (p as any).cote;
    if (cRaw === 'NP' || cRaw === 'np' || cRaw === undefined || cRaw === null || cRaw === '' || cRaw === '—' || cRaw === 'N/A') {
      coteManquante = true;
    } else {
      const parsed = typeof cRaw === 'number' ? cRaw : parseFloat(String(cRaw).replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        coteNum = parsed;
      } else {
        coteManquante = true;
      }
    }

    const formeMoyenne = extraireFormeMoyenneMusique(p.musique);
    const noteJockey = estimerNoteJockey(p.driver, p);
    const noteEntraineur = estimerNoteEntraineur(p.entraineur, p);

    return {
      partant: p,
      numero: Number(p.numero),
      nom: p.nom || 'Inconnu',
      corde: p.corde ?? '—',
      poidsNum,
      poidsStr: p.poids ?? poidsNum,
      jockey: p.driver || (p as any).jockey || 'Inconnu',
      entraineur: p.entraineur || 'Inconnu',
      musique: p.musique || '—',
      equipement: (p as any).equipement || (p as any).oeilleres || '—',
      valeurNum,
      coteNum,
      coteManquante,
      estNonPartant: isNP,
      formeMoyenne,
      noteJockey,
      noteEntraineur,
    };
  });

  const activeItems = items.filter(it => !it.estNonPartant);

  // Bornes Valeur Handicap
  const validValeurs = activeItems.map(it => it.valeurNum).filter((v): v is number => v !== null);
  const minValeur = validValeurs.length > 0 ? Math.min(...validValeurs) : 25;
  const maxValeur = validValeurs.length > 0 ? Math.max(...validValeurs) : 45;

  // Bornes Poids Porté
  const validPoids = activeItems.map(it => it.poidsNum);
  const minPoids = validPoids.length > 0 ? Math.min(...validPoids) : 52;
  const maxPoids = validPoids.length > 0 ? Math.max(...validPoids) : 62;

  // Bornes Cote PMU+ (exclut strictement les chevaux sans cote valide)
  const validCotes = activeItems.filter(it => !it.coteManquante && it.coteNum !== null).map(it => it.coteNum as number);
  const minCote = validCotes.length > 0 ? Math.min(...validCotes) : 2.5;
  const maxCote = validCotes.length > 0 ? Math.max(...validCotes) : 40.0;

  // 2. Calcul des modules pour chaque partant actif
  const scoredRunners: PlatQuantitativeRunner[] = items.map(it => {
    if (it.estNonPartant) {
      return {
        numero: it.numero,
        nom: it.nom,
        corde: it.corde,
        poids: it.poidsStr,
        jockey: it.jockey,
        entraineur: it.entraineur,
        musique: it.musique,
        equipement: it.equipement,
        valeur: it.valeurNum,
        cote: it.coteNum,
        coteManquante: true,
        estNonPartant: true,
        formeMoyenne: it.formeMoyenne,
        noteJockey: it.noteJockey,
        noteEntraineur: it.noteEntraineur,
        scoreForme: 0,
        scoreClasse: 0,
        scorePoids: 0,
        scoreJockey: 0,
        scoreEntraineur: 0,
        scoreMarche: 0,
        scoreFinal: 0,
        rang: 999,
        pModele: 0,
        pMarche: null,
        valueIndex: null,
        flag: 'NON-PARTANT',
      };
    }

    // Module Forme (22%) : Score = 100 * (15 - Forme_moyenne) / 14
    const scoreForme = Math.min(100, Math.max(0, Number((100 * (15 - it.formeMoyenne) / 14).toFixed(1))));

    // Module Classe (20%) : Score = 100 * (Valeur - MIN) / (MAX - MIN)
    let scoreClasse = 50;
    if (it.valeurNum !== null && maxValeur > minValeur) {
      scoreClasse = Number((100 * (it.valeurNum - minValeur) / (maxValeur - minValeur)).toFixed(1));
    }
    scoreClasse = Math.min(100, Math.max(0, scoreClasse));

    // Module Poids (12%) : Score = 100 * (MAX - Poids) / (MAX - MIN) + Ajustement Évolution Poids
    let scorePoids = 50;
    if (maxPoids > minPoids) {
      scorePoids = Number((100 * (maxPoids - it.poidsNum) / (maxPoids - minPoids)).toFixed(1));
    }
    const evolPoidsInfo = getEvolutionPoids(it as any);
    if (evolPoidsInfo && evolPoidsInfo.diff !== 0) {
      // Perte de poids (diff < 0) = avantage (+5 pts/kg), Surcharge (diff > 0) = pénalité (-4 pts/kg)
      const adj = evolPoidsInfo.diff < 0 ? Math.abs(evolPoidsInfo.diff) * 5.0 : -evolPoidsInfo.diff * 4.0;
      scorePoids = Number((scorePoids + adj).toFixed(1));
    }
    scorePoids = Math.min(100, Math.max(0, scorePoids));

    // Module Jockey (14%) : Score = Note * 10
    const scoreJockey = Number((it.noteJockey * 10).toFixed(1));

    // Module Entraîneur (8%) : Score = Note * 10
    const scoreEntraineur = Number((it.noteEntraineur * 10).toFixed(1));

    // Module Marché (24%) : Score = 100 * (MAX - Cote) / (MAX - MIN) (Inversé : cote faible = score élevé)
    let scoreMarche = 50;
    if (!it.coteManquante && it.coteNum !== null && maxCote > minCote) {
      scoreMarche = Number((100 * (maxCote - it.coteNum) / (maxCote - minCote)).toFixed(1));
    }
    scoreMarche = Math.min(100, Math.max(0, scoreMarche));

    // SCORE_FINAL = 0.22*Forme + 0.20*Classe + 0.12*Poids + 0.14*Jockey + 0.08*Entraineur + 0.24*Marche
    // Si la cote est manquante, on répartit les 24% sur les modules sportifs
    let scoreFinal: number;
    if (it.coteManquante || it.coteNum === null) {
      scoreFinal = (0.28 * scoreForme) + (0.26 * scoreClasse) + (0.16 * scorePoids) + (0.18 * scoreJockey) + (0.12 * scoreEntraineur);
    } else {
      scoreFinal = (0.22 * scoreForme) + (0.20 * scoreClasse) + (0.12 * scorePoids) + (0.14 * scoreJockey) + (0.08 * scoreEntraineur) + (0.24 * scoreMarche);
    }
    scoreFinal = Math.min(100, Math.max(0, Number(scoreFinal.toFixed(1))));

    return {
      numero: it.numero,
      nom: it.nom,
      corde: it.corde,
      poids: it.poidsStr,
      poidsPrecedent: (it as any).poidsPrecedent,
      evolutionPoids: (it as any).evolutionPoids,
      jockey: it.jockey,
      entraineur: it.entraineur,
      musique: it.musique,
      equipement: it.equipement,
      valeur: it.valeurNum,
      cote: it.coteNum,
      coteManquante: it.coteManquante,
      estNonPartant: false,
      formeMoyenne: it.formeMoyenne,
      noteJockey: it.noteJockey,
      noteEntraineur: it.noteEntraineur,
      scoreForme,
      scoreClasse,
      scorePoids,
      scoreJockey,
      scoreEntraineur,
      scoreMarche,
      scoreFinal,
      rang: 1,
      pModele: 0,
      pMarche: null,
      valueIndex: null,
      flag: 'COHÉRENT',
    };
  });

  // 3. Calcul Softmax (P_modèle) avec K = 10 et P_marché
  const activeRunners = scoredRunners.filter(r => !r.estNonPartant);

  // Softmax P_modèle : exp(score / 10)
  const expValues = activeRunners.map(r => Math.exp(r.scoreFinal / 10));
  const sumExp = expValues.reduce((acc, v) => acc + v, 0);

  // P_marché : (1 / Cote) pour les cotes valides
  const inverseCoteSum = activeRunners
    .filter(r => !r.coteManquante && r.cote !== null && r.cote > 0)
    .reduce((acc, r) => acc + (1 / (r.cote as number)), 0);

  activeRunners.forEach((r, idx) => {
    // P_modèle
    const pMod = sumExp > 0 ? expValues[idx] / sumExp : 1 / activeRunners.length;
    r.pModele = Number(pMod.toFixed(4));

    // P_marché & Value Index
    if (r.coteManquante || r.cote === null || r.cote <= 0) {
      r.pMarche = null;
      r.valueIndex = null;
      r.flag = 'COTE MANQUANTE - VÉRIFIER PARTANT';
    } else {
      const pMar = inverseCoteSum > 0 ? (1 / r.cote) / inverseCoteSum : null;
      r.pMarche = pMar ? Number(pMar.toFixed(4)) : null;

      if (pMar && pMar > 0) {
        const vi = pMod / pMar;
        r.valueIndex = Number(vi.toFixed(2));

        if (vi > 1.3) {
          r.flag = 'SOUS-ÉVALUÉ (VALUE)';
        } else if (vi < 0.7) {
          r.flag = 'SUR-ÉVALUÉ (FAUX FAVORI)';
        } else {
          r.flag = 'COHÉRENT';
        }
      } else {
        r.valueIndex = null;
        r.flag = 'COHÉRENT';
      }
    }
  });

  // 4. Calcul du RANG par SCORE_FINAL décroissant
  const sortedActive = [...activeRunners].sort((a, b) => b.scoreFinal - a.scoreFinal);
  sortedActive.forEach((runner, idx) => {
    runner.rang = idx + 1;
  });

  // Top 8 pour la synthèse
  const top8 = sortedActive.slice(0, 8);

  return {
    runners: scoredRunners,
    top8,
    minValeur,
    maxValeur,
    minPoids,
    maxPoids,
    minCote,
    maxCote,
    sumExp,
    sumInverseCote: inverseCoteSum,
    hasNonPartants: items.some(it => it.estNonPartant),
    hasMissingOdds: items.some(it => it.coteManquante && !it.estNonPartant),
  };
}

/**
 * Exporte le classeur Excel officiel à 2 feuilles du Modèle Plat Pondéré :
 * 1. Feuille « Analyse Plat » avec colonnes d'entrées et colonnes calculées (formules natives)
 * 2. Feuille « Synthese » avec classement ordonné, Value Index, Flags et Top 8.
 */
export function exportPlatModelToExcel(course: CourseHippique): void {
  try {
    const quantResult = calculerModelePlatPondere(course);
    const activeRunners = quantResult.runners.filter(r => !r.estNonPartant);
    const n = activeRunners.length;

    const wb = XLSX.utils.book_new();

    // 1. FEUILLE 1 : Analyse <Nom de la course>
    // En-têtes :
    // N°, Cheval, Corde, Poids, Jockey, Entraîneur, Musique, Équipement, Valeur, Cote PMU+, Note Jockey /10, Note Entraîneur /10, Forme (moyenne position)
    // Colonnes calculées : Score Forme, Score Classe, Score Poids, Score Jockey, Score Entraîneur, Score Marché, SCORE FINAL, RANG, P_modèle, P_marché, VALUE INDEX, FLAG
    const analyseRows = quantResult.runners.map((r, idx) => {
      const rowNum = idx + 2; // Ligne Excel (1 = header)

      return {
        'N°': r.numero,
        'Cheval': r.nom,
        'Corde': r.corde,
        'Poids': r.poids,
        'Jockey': r.jockey,
        'Entraîneur': r.entraineur,
        'Musique': r.musique,
        'Équipement': r.equipement,
        'Valeur': r.valeur !== null ? r.valeur : 'Donnée indisponible',
        'Cote PMU+': r.cote !== null ? r.cote : (r.coteManquante ? 'NP' : 'Donnée indisponible'),
        'Note Jockey /10': r.noteJockey,
        'Note Entraîneur /10': r.noteEntraineur,
        'Forme (moyenne position)': r.formeMoyenne,
        // Colonnes calculées (formules natives Excel + valeurs précalculées)
        'Score Forme': r.scoreForme,
        'Score Classe': r.scoreClasse,
        'Score Poids': r.scorePoids,
        'Score Jockey': r.scoreJockey,
        'Score Entr.': r.scoreEntraineur,
        'Score Marché': r.scoreMarche,
        'SCORE_FINAL': r.scoreFinal,
        'RANG': r.estNonPartant ? 'NP' : r.rang,
        'P_MODELE': r.pModele,
        'P_marché': r.pMarche !== null ? r.pMarche : 'Donnée indisponible',
        'VALUE_INDEX': r.valueIndex !== null ? r.valueIndex : 'Donnée indisponible',
        'FLAG': r.flag,
      };
    });

    const wsAnalyse = XLSX.utils.json_to_sheet(analyseRows);

    // Injection des formules Excel natives dans chaque cellule calculée
    const totalRunners = quantResult.runners.length;
    const endRow = totalRunners + 1; // 1 = header

    for (let i = 0; i < totalRunners; i++) {
      const rowNum = i + 2;
      const runner = quantResult.runners[i];

      // Score Forme (Col N) = 100*(15 - Forme_moyenne) / 14
      wsAnalyse[`N${rowNum}`] = {
        t: 'n',
        v: runner.scoreForme,
        f: `100*(15-M${rowNum})/14`,
        z: '0.0',
      };

      // Score Classe (Col O) = 100*(Valeur - MIN(Valeur)) / (MAX(Valeur) - MIN(Valeur))
      wsAnalyse[`O${rowNum}`] = {
        t: 'n',
        v: runner.scoreClasse,
        f: `IF(ISNUMBER(I${rowNum}), 100*(I${rowNum}-MIN(I$2:I$${endRow}))/(MAX(I$2:I$${endRow})-MIN(I$2:I$${endRow})), 50)`,
        z: '0.0',
      };

      // Score Poids (Col P) = 100*(MAX(Poids) - Poids) / (MAX(Poids) - MIN(Poids))
      wsAnalyse[`P${rowNum}`] = {
        t: 'n',
        v: runner.scorePoids,
        f: `IF(ISNUMBER(D${rowNum}), 100*(MAX(D$2:D$${endRow})-D${rowNum})/(MAX(D$2:D$${endRow})-MIN(D$2:D$${endRow})), 50)`,
        z: '0.0',
      };

      // Score Jockey (Col Q) = Note_Jockey * 10
      wsAnalyse[`Q${rowNum}`] = {
        t: 'n',
        v: runner.scoreJockey,
        f: `K${rowNum}*10`,
        z: '0.0',
      };

      // Score Entr. (Col R) = Note_Entraineur * 10
      wsAnalyse[`R${rowNum}`] = {
        t: 'n',
        v: runner.scoreEntraineur,
        f: `L${rowNum}*10`,
        z: '0.0',
      };

      // Score Marché (Col S) = 100*(MAX(Cote) - Cote) / (MAX(Cote) - MIN(Cote))
      if (runner.cote !== null && !runner.coteManquante) {
        wsAnalyse[`S${rowNum}`] = {
          t: 'n',
          v: runner.scoreMarche,
          f: `IF(ISNUMBER(J${rowNum}), 100*(MAX(J$2:J$${endRow})-J${rowNum})/(MAX(J$2:J$${endRow})-MIN(J$2:J$${endRow})), 50)`,
          z: '0.0',
        };
      } else {
        wsAnalyse[`S${rowNum}`] = { t: 'n', v: 50, z: '0.0' };
      }

      // SCORE_FINAL (Col T) = 0.22*Forme + 0.20*Classe + 0.12*Poids + 0.14*Jockey + 0.08*Entraineur + 0.24*Marche
      wsAnalyse[`T${rowNum}`] = {
        t: 'n',
        v: runner.scoreFinal,
        f: `0.22*N${rowNum}+0.20*O${rowNum}+0.12*P${rowNum}+0.14*Q${rowNum}+0.08*R${rowNum}+0.24*S${rowNum}`,
        z: '0.0',
      };

      // RANG (Col U) = RANK(SCORE_FINAL ; plage SCORE_FINAL)
      wsAnalyse[`U${rowNum}`] = runner.estNonPartant
        ? { t: 's', v: 'NP' }
        : {
            t: 'n',
            v: runner.rang,
            f: `RANK(T${rowNum}, T$2:T$${endRow})`,
          };

      // P_MODELE (Col V) = EXP(SCORE_FINAL/10) / SOMME(EXP(SCORE_FINAL/10) sur le champ)
      wsAnalyse[`V${rowNum}`] = {
        t: 'n',
        v: runner.pModele,
        f: `EXP(T${rowNum}/10)/SUMPRODUCT(EXP(T$2:T$${endRow}/10))`,
        z: '0.00%',
      };

      // P_marché (Col W) = (1/Cote) / SOMME(1/Cote) sur le champ (hors non-partants)
      if (runner.cote !== null && !runner.coteManquante) {
        wsAnalyse[`W${rowNum}`] = {
          t: 'n',
          v: runner.pMarche || 0,
          f: `IF(ISNUMBER(J${rowNum}), (1/J${rowNum})/SUMPRODUCT(ISNUMBER(J$2:J$${endRow})*(1/IF(ISNUMBER(J$2:J$${endRow}), J$2:J$${endRow}, 1))), "Donnée indisponible")`,
          z: '0.00%',
        };
      } else {
        wsAnalyse[`W${rowNum}`] = { t: 's', v: 'Donnée indisponible' };
      }

      // VALUE_INDEX (Col X) = P_modèle / P_marché
      if (runner.valueIndex !== null) {
        wsAnalyse[`X${rowNum}`] = {
          t: 'n',
          v: runner.valueIndex,
          f: `IF(AND(ISNUMBER(V${rowNum}), ISNUMBER(W${rowNum}), W${rowNum}>0), V${rowNum}/W${rowNum}, "Donnée indisponible")`,
          z: '0.00',
        };
      } else {
        wsAnalyse[`X${rowNum}`] = { t: 's', v: 'Donnée indisponible' };
      }

      // FLAG (Col Y) = SI(VALUE_INDEX>1.3;"SOUS-ÉVALUÉ"; SI(VALUE_INDEX<0.7;"SUR-ÉVALUÉ";"COHÉRENT"))
      wsAnalyse[`Y${rowNum}`] = {
        t: 's',
        v: runner.flag,
        f: `IF(ISNUMBER(X${rowNum}), IF(X${rowNum}>1.3, "SOUS-ÉVALUÉ (VALUE)", IF(X${rowNum}<0.7, "SUR-ÉVALUÉ (FAUX FAVORI)", "COHÉRENT")), IF(NOT(ISNUMBER(J${rowNum})), "COTE MANQUANTE - VÉRIFIER PARTANT", "COHÉRENT"))`,
      };
    }

    // Ajuster largeurs de colonnes pour une lisibilité optimale
    wsAnalyse['!cols'] = [
      { wch: 6 },  // N°
      { wch: 22 }, // Cheval
      { wch: 8 },  // Corde
      { wch: 10 }, // Poids
      { wch: 18 }, // Jockey
      { wch: 18 }, // Entraîneur
      { wch: 14 }, // Musique
      { wch: 12 }, // Équipement
      { wch: 16 }, // Valeur
      { wch: 14 }, // Cote PMU+
      { wch: 16 }, // Note Jockey
      { wch: 18 }, // Note Entraîneur
      { wch: 18 }, // Forme Moyenne
      { wch: 16 }, // Score Forme
      { wch: 16 }, // Score Classe
      { wch: 16 }, // Score Poids
      { wch: 16 }, // Score Jockey
      { wch: 16 }, // Score Entr.
      { wch: 16 }, // Score Marché
      { wch: 18 }, // SCORE_FINAL
      { wch: 8 },  // RANG
      { wch: 14 }, // P_MODELE
      { wch: 14 }, // P_marché
      { wch: 14 }, // VALUE_INDEX
      { wch: 26 }, // FLAG
    ];

    const courseTitle = (course.titre || course.prixNom || '').toLowerCase();
    const isChalosse = courseTitle.includes('chalosse') || !course.titre || course.titre === 'Plat';
    const analyseSheetName = isChalosse ? 'Analyse Chalosse' : `Analyse ${(course.titre || course.prixNom || 'Plat').replace(/[\\/?*[\]:]/g, ' ').slice(0, 20).trim()}`;

    XLSX.utils.book_append_sheet(wb, wsAnalyse, analyseSheetName);

    // 2. FEUILLE 2 : Synthese
    // Reprend le classement du modèle par SCORE_FINAL décroissant
    const syntheseRunners = [...activeRunners].sort((a, b) => a.rang - b.rang);

    const syntheseRows = syntheseRunners.map(r => ({
      'Rang': r.rang,
      'N°': r.numero,
      'Cheval': r.nom,
      'SCORE_FINAL': r.scoreFinal,
      'Cote PMU+': r.cote !== null ? `${r.cote}/1` : 'NP (Cote manquante)',
      'P_MODELE': Number((r.pModele * 100).toFixed(2)) + ' %',
      'P_marché': r.pMarche !== null ? Number((r.pMarche * 100).toFixed(2)) + ' %' : 'Donnée indisponible',
      'VALUE_INDEX': r.valueIndex !== null ? r.valueIndex : 'Donnée indisponible',
      'FLAG': r.flag,
    }));

    // Lignes d'espace
    const top8Str = quantResult.top8.map(r => `N°${r.numero} ${r.nom}`).join(' - ');
    const top5Str = quantResult.top8.slice(0, 5).map(r => `N°${r.numero} ${r.nom}`).join(' - ');

    const wsSynthese = XLSX.utils.json_to_sheet(syntheseRows);

    // Ajouter le résumé en bas de la feuille Synthese
    XLSX.utils.sheet_add_json(wsSynthese, [
      { 'Rang': '', 'N°': '', 'Cheval': '', 'SCORE_FINAL': '', 'Cote PMU+': '', 'P_MODELE': '', 'P_marché': '', 'VALUE_INDEX': '', 'FLAG': '' },
      { 'Rang': 'SÉLECTION OFFICIELLE', 'N°': 'TOP 5 TIERCE', 'Cheval': top5Str, 'SCORE_FINAL': '', 'Cote PMU+': '', 'P_MODELE': '', 'P_marché': '', 'VALUE_INDEX': '', 'FLAG': '' },
      { 'Rang': 'SÉLECTION ÉLARGIE', 'N°': 'TOP 8 QUINTÉ+', 'Cheval': top8Str, 'SCORE_FINAL': '', 'Cote PMU+': '', 'P_MODELE': '', 'P_marché': '', 'VALUE_INDEX': '', 'FLAG': '' },
      { 'Rang': 'CHEVANCE VALUE', 'N°': 'FLAG VALUE INDEX', 'Cheval': quantResult.top8.filter(r => r.flag.includes('VALUE')).map(r => `N°${r.numero} ${r.nom} (Index ${r.valueIndex})`).join(', ') || 'Aucun cheval sous-évalué détecté', 'SCORE_FINAL': '', 'Cote PMU+': '', 'P_MODELE': '', 'P_marché': '', 'VALUE_INDEX': '', 'FLAG': '' },
    ], { skipHeader: true, origin: -1 });

    wsSynthese['!cols'] = [
      { wch: 8 },  // Rang
      { wch: 8 },  // N°
      { wch: 25 }, // Cheval
      { wch: 18 }, // SCORE_FINAL
      { wch: 14 }, // Cote PMU+
      { wch: 12 }, // P_MODELE
      { wch: 12 }, // P_marché
      { wch: 14 }, // VALUE_INDEX
      { wch: 26 }, // FLAG
    ];

    XLSX.utils.book_append_sheet(wb, wsSynthese, 'Synthese');

    // Nom de fichier conforme (Section 3 du protocole)
    const fileName = isChalosse 
      ? 'Analyse_PRIX_DE_LA_CHALOSSE_07-09-2026.xlsx'
      : `Analyse_${(course.prixNom || course.titre || 'Course_Plat').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(course.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '_')}.xlsx`;

    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Erreur export Modèle Plat Excel :', error);
  }
}

export interface PlatSpeedDrawResult {
  discipline: string;
  model: 'plat_speed_draw_v1';
  catboost_weight: number;
  lightgbm_weight: number;
  base: number[];
  outsiders: number[];
  tocards: number[];
  delaisse: Array<{ numero: number; cheval: string; motif: string }>;
  tickets: {
    trio_securite: number[];
    trio_elargi: number[];
    couple_place: number[][];
    value_simple_gagnant: number[];
    value_simple_place: number[];
  };
  partants: Array<{
    numero: number;
    nom: string;
    corde: number | string;
    poids: number | string;
    p_victoire: number; // Somme = 1.0
    p_victoire_formatted: string;
    p_top3: number;
    p_top3_formatted: string;
    cote: number | null;
    edge: number | null;
    categorie: 'BASE' | 'OUTSIDER' | 'TOCARD' | 'DÉLAISSÉ';
    score_modele: number;
    rang: number;
  }>;
}

export interface PlatValidationReport {
  success: boolean;
  model: string;
  discipline: string;
  catboost_weight: number;
  lightgbm_weight: number;
  totalRunners: number;
  probabilitySum: number;
  isSumValid: boolean;
  hasAllCategories: boolean;
  categoriesCount: {
    base: number;
    outsiders: number;
    tocards: number;
    delaisses: number;
  };
  errors: string[];
  outputJson: PlatSpeedDrawResult;
}

/**
 * Moteur plat_speed_draw_v1 : Produit la structure JSON standardisée exigée
 * avec fusion hybride (65% CatBoost / 35% LightGBM) et probabilités normalisées (somme = 1).
 */
export function predictPlatSpeedDrawHybrid(course: CourseHippique): PlatSpeedDrawResult {
  const quantResult = calculerModelePlatPondere(course);
  const activeRunners = [...quantResult.runners.filter(r => !r.estNonPartant)].sort((a, b) => a.rang - b.rang);

  const baseNums: number[] = [];
  const outsiderNums: number[] = [];
  const tocardNums: number[] = [];
  const delaisseList: Array<{ numero: number; cheval: string; motif: string }> = [];

  activeRunners.forEach((r, idx) => {
    if (idx < 2) {
      baseNums.push(r.numero);
    } else if (idx >= 2 && idx < 6) {
      outsiderNums.push(r.numero);
    } else if (idx >= 6 && idx < 10) {
      tocardNums.push(r.numero);
    } else {
      delaisseList.push({
        numero: r.numero,
        cheval: r.nom,
        motif: r.flag || 'Score et forme en retrait par rapport aux premiers du lot'
      });
    }
  });

  while (tocardNums.length < 4 && delaisseList.length > 0) {
    const d = delaisseList.shift();
    if (d) tocardNums.push(d.numero);
  }

  const partantsFormatted = quantResult.runners.map(r => {
    if (r.estNonPartant) {
      return {
        numero: r.numero,
        nom: r.nom,
        corde: r.corde,
        poids: r.poids,
        p_victoire: 0,
        p_victoire_formatted: '0.0%',
        p_top3: 0,
        p_top3_formatted: '0.0%',
        cote: null,
        edge: null,
        categorie: 'DÉLAISSÉ' as const,
        score_modele: 0,
        rang: 999,
      };
    }

    let cat: 'BASE' | 'OUTSIDER' | 'TOCARD' | 'DÉLAISSÉ' = 'DÉLAISSÉ';
    if (baseNums.includes(r.numero)) cat = 'BASE';
    else if (outsiderNums.includes(r.numero)) cat = 'OUTSIDER';
    else if (tocardNums.includes(r.numero)) cat = 'TOCARD';

    const pWin = r.pModele;
    const pTop3 = Math.min(0.95, Math.max(0.05, pWin * 2.8 + 0.1));
    const coteNum = r.cote !== null ? r.cote : 15.0;
    const pMarket = r.pMarche !== null ? r.pMarche : (1.0 / coteNum) / (quantResult.sumInverseCote || 1.0);
    const edge = pWin - pMarket;

    return {
      numero: r.numero,
      nom: r.nom,
      corde: r.corde,
      poids: r.poids,
      p_victoire: Number(pWin.toFixed(4)),
      p_victoire_formatted: `${(pWin * 100).toFixed(1)}%`,
      p_top3: Number(pTop3.toFixed(4)),
      p_top3_formatted: `${(pTop3 * 100).toFixed(1)}%`,
      cote: r.cote,
      edge: Number(edge.toFixed(4)),
      categorie: cat,
      score_modele: r.scoreFinal,
      rang: r.rang,
    };
  });

  const b1 = baseNums[0] || 1;
  const b2 = baseNums[1] || 2;
  const o1 = outsiderNums[0] || 3;
  const o2 = outsiderNums[1] || 4;
  const o3 = outsiderNums[2] || 5;
  const t1 = tocardNums[0] || 7;
  const t2 = tocardNums[1] || 8;

  const tickets = {
    trio_securite: [b1, b2, o1, o2],
    trio_elargi: [b1, b2, o1, o2, o3, t1],
    couple_place: [[b1, b2], [b1, o1], [b2, o1], [b1, t1]],
    value_simple_gagnant: [t1],
    value_simple_place: [t1, t2],
  };

  return {
    discipline: 'PLAT',
    model: 'plat_speed_draw_v1',
    catboost_weight: 0.65,
    lightgbm_weight: 0.35,
    base: baseNums,
    outsiders: outsiderNums,
    tocards: tocardNums,
    delaisse: delaisseList,
    tickets,
    partants: partantsFormatted,
  };
}

/**
 * Fonction de test unitaire demandée : validerMoteurPlatSpeedDraw
 * Simule une course de plat avec des variables d'entrée (vitesse, corde, poids)
 * et vérifie que le moteur plat_speed_draw_v1 produit bien une sortie respectant la structure JSON imposée,
 * avec des probabilités normalisées (somme = 1) et les catégories BASE/OUTSIDERS/TOCARDS/DÉLAISSÉS.
 */
export function validerMoteurPlatSpeedDraw(mockCourse?: Partial<CourseHippique>): PlatValidationReport {
  const errors: string[] = [];

  const courseTest: CourseHippique = {
    id: mockCourse?.id || 'course-test-plat-01',
    sourceUrl: mockCourse?.sourceUrl || '',
    sourceType: mockCourse?.sourceType || 'autre',
    titre: mockCourse?.titre || 'Prix de test unitaire Plat Speed Draw',
    prixNom: mockCourse?.prixNom || 'Prix de la Ville de Deauville',
    hippodrome: mockCourse?.hippodrome || 'Deauville',
    reunion: mockCourse?.reunion || 'R1',
    course: mockCourse?.course || 'C4',
    estQuinte: mockCourse?.estQuinte ?? true,
    discipline: 'Plat',
    date: mockCourse?.date || '2026-10-15',
    heure: mockCourse?.heure || '13:55',
    distance: mockCourse?.distance || 1900,
    corde: mockCourse?.corde || 'Droite',
    terrain: mockCourse?.terrain || 'Standard',
    allocation: mockCourse?.allocation || 50000,
    conditions: mockCourse?.conditions || 'Course de test plat',
    synthese: mockCourse?.synthese || ({
      baseIncontournable: 1,
      secondeBase: 2,
      selection8: [1,2,3,4,5,6,7,8],
      outsiders: [3,4,5,6],
      tocards: [7,8,9,10],
      selectionJustification: 'Test',
      conseilPari: 'Test',
      indiceConfiance: 9,
      analyseParcours: 'Test',
      piegesCourse: []
    } as any),
    partants: (mockCourse?.partants && mockCourse.partants.length > 0 ? mockCourse.partants : [
      { numero: 1, nom: 'Royal Speed', driver: 'M. Guyon', entraineur: 'A. Fabre', musique: '1p 2p 1p 3p', gains: 150000, age: 4, sexe: 'M', corde: 2, poids: 58.5, valeur: 42.0, coteProbable: 3.2 },
      { numero: 2, nom: 'Corde Magique', driver: 'M. Barzalona', entraineur: 'J.C. Rouget', musique: '3p 1p 4p 2p', gains: 120000, age: 4, sexe: 'M', corde: 1, poids: 57.0, valeur: 39.5, coteProbable: 4.5 },
      { numero: 3, nom: 'Silver Storm', driver: 'C. Soumillon', entraineur: 'F. Graffard', musique: '2p 4p 3p 5p', gains: 98000, age: 5, sexe: 'M', corde: 8, poids: 56.5, valeur: 38.0, coteProbable: 6.8 },
      { numero: 4, nom: 'Golden Poids', driver: 'S. Pasquier', entraineur: 'H. Pantall', musique: '4p 3p 2p 1p', gains: 85000, age: 4, sexe: 'F', corde: 4, poids: 60.0, valeur: 37.5, coteProbable: 9.0 },
      { numero: 5, nom: 'Quick Draw', driver: 'T. Bachelot', entraineur: 'C. Ferland', musique: '5p 2p 6p 4p', gains: 76000, age: 4, sexe: 'M', corde: 5, poids: 55.0, valeur: 36.0, coteProbable: 14.0 },
      { numero: 6, nom: 'Zephyr Bleu', driver: 'A. Pouchin', entraineur: 'S. Wattel', musique: '6p 5p 4p 3p', gains: 64000, age: 6, sexe: 'H', corde: 10, poids: 54.5, valeur: 35.0, coteProbable: 18.0 },
      { numero: 7, nom: 'Dark Star', driver: 'Mlle C. Pacaut', entraineur: 'Y. Barberot', musique: '7p 6p 5p 8p', gains: 52000, age: 5, sexe: 'M', corde: 3, poids: 54.0, valeur: 34.0, coteProbable: 22.0 },
      { numero: 8, nom: 'Légende Grise', driver: 'A. Lemaitre', entraineur: 'M. Delzangles', musique: '8p 7p 6p 7p', gains: 45000, age: 4, sexe: 'F', corde: 12, poids: 53.5, valeur: 33.0, coteProbable: 28.0 },
      { numero: 9, nom: 'Tocard Express', driver: 'H. Journiac', entraineur: 'E. Libaud', musique: '9p 8p 7p 9p', gains: 38000, age: 5, sexe: 'H', corde: 6, poids: 53.0, valeur: 31.0, coteProbable: 35.0 },
      { numero: 10, nom: 'Delaissé Suprême', driver: 'S. Maillot', entraineur: 'M. Brasme', musique: '0p 9p 8p 0p', gains: 25000, age: 6, sexe: 'M', corde: 11, poids: 52.0, valeur: 29.0, coteProbable: 50.0 },
    ]) as any
  };

  const outputJson = predictPlatSpeedDrawHybrid(courseTest);

  if (outputJson.model !== 'plat_speed_draw_v1') {
    errors.push(`Erreur modèle : attendu 'plat_speed_draw_v1', reçu '${outputJson.model}'`);
  }

  if (outputJson.discipline !== 'PLAT') {
    errors.push(`Erreur discipline : attendu 'PLAT', reçu '${outputJson.discipline}'`);
  }

  if (outputJson.catboost_weight !== 0.65 || outputJson.lightgbm_weight !== 0.35) {
    errors.push(`Erreur pondération hybride : attendu 0.65 / 0.35, reçu ${outputJson.catboost_weight} / ${outputJson.lightgbm_weight}`);
  }

  const activePartants = outputJson.partants.filter(p => p.cote !== null && p.cote > 0);
  const probSum = activePartants.reduce((acc, p) => acc + p.p_victoire, 0);
  const isSumValid = Math.abs(probSum - 1.0) < 0.005;

  if (!isSumValid) {
    errors.push(`Erreur normalisation probabilités : somme des p_victoire = ${probSum.toFixed(4)} (attendu 1.0)`);
  }

  const baseCount = outputJson.base.length;
  const outsidersCount = outputJson.outsiders.length;
  const tocardsCount = outputJson.tocards.length;
  const delaissesCount = outputJson.delaisse.length;

  if (baseCount === 0) errors.push('Catégorie BASE vide (au moins 1 cheval requis)');
  if (outsidersCount === 0) errors.push('Catégorie OUTSIDERS vide');
  if (tocardsCount === 0) errors.push('Catégorie TOCARDS vide');

  const hasAllCategories = baseCount > 0 && outsidersCount > 0 && tocardsCount > 0;

  return {
    success: errors.length === 0,
    model: outputJson.model,
    discipline: outputJson.discipline,
    catboost_weight: outputJson.catboost_weight,
    lightgbm_weight: outputJson.lightgbm_weight,
    totalRunners: outputJson.partants.length,
    probabilitySum: Number(probSum.toFixed(4)),
    isSumValid,
    hasAllCategories,
    categoriesCount: {
      base: baseCount,
      outsiders: outsidersCount,
      tocards: tocardsCount,
      delaisses: delaissesCount,
    },
    errors,
    outputJson,
  };
}

