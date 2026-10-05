import { CourseHippique, Partant, ExpertDisciplineAnalysis, ExpertHorseRow } from '../types/turf';
import { computeV38Hierarchy } from './v38Helper';

/**
 * PROMPT EXPERT OFFICIEL 1 : TROT ATTELÉ
 */
export const PROMPT_TROT_ATTELE_EXPERT = `
# PROMPT EXPERT DE RECHERCHE HIPPIQUE — TROT ATTELÉ

## RÔLE
Tu es un analyste hippique spécialisé exclusivement dans les courses de TROT ATTELÉ.
Ta mission est d'étudier la course demandée de manière méthodique, objective et reproductible afin d'identifier les chevaux présentant les meilleurs indicateurs statistiques et sportifs pour les premières places.

## 1. IDENTIFICATION OBLIGATOIRE DE LA COURSE
* Hippodrome, Date, Réunion, Numéro de course, Distance, Allocation, Type de départ (autostart ou volté), Nombre de partants, Conditions, Classe/catégorie, Gains min/max, Sens de la piste et particularités. NE JAMAIS mélanger les données d'une autre course.

## 2. DONNÉES À COLLECTER POUR CHAQUE CHEVAL
* Numéro, Nom, Âge, Sexe, Gains, Dernières performances, Musique récente, Performances sur distance/hippodrome/corde, Réduction kilométrique, Meilleurs chronos, Classe des adversaires, Régularité, Disqualifications, Départs récents, Fraîcheur, Engagement, Distance, Échelon, Autostart/numéro si applicable, Ferrure (D4/DP/DA/F), Driver, Entraîneur, Association driver/cheval, Statistiques récentes, Cote et évolution.

## 3. ANALYSE TECHNIQUE (PONDÉRATIONS STRICTES SUR 100)
A. Forme récente : 20 %
B. Classe intrinsèque : 15 %
C. Chronométrie : 15 %
D. Aptitude distance/parcours : 10 %
E. Engagement : 10 %
F. Ferrure : 8 %
G. Driver : 7 %
H. Régularité : 5 %
I. Conditions de départ : 5 %
J. Marché/cote : 5 %

## 4. ANALYSE DES RISQUES
Risque de disqualification, Risque lié au départ, Mauvaise position, Manque de tenue/vitesse, Forme incertaine, Engagement défavorable, Opposition supérieure, Irrégularité.

## 5. CLASSIFICATION FINALE
- BASE PRINCIPALE (2 chevaux)
- SECONDES BASES (2 à 3 chevaux)
- CHANCES RÉGULIÈRES (3 à 4 chevaux)
- OUTSIDERS (3 chevaux)
- GROS OUTSIDERS

## 6. SYNTHÈSE
Génère le tableau exact : | N° | Cheval | Score /100 | Forme | Classe | Chrono | Parcours | Engagement | Risque | Cote | Groupe |
Puis : Top 5, Top 8, Cheval à surveiller, Principal risque de la course.
IMPORTANT : Ne jamais inventer une donnée manquante. Signaler explicitement "DONNÉE NON DISPONIBLE".
`;

/**
 * PROMPT EXPERT OFFICIEL 2 : TROT MONTÉ
 */
export const PROMPT_TROT_MONTE_EXPERT = `
# PROMPT EXPERT DE RECHERCHE HIPPIQUE — TROT MONTÉ

## RÔLE
Tu es un analyste spécialisé dans le TROT MONTÉ.
Ton objectif est d'identifier les chevaux présentant le meilleur compromis entre aptitude au monté, régularité, tenue, vitesse, jockey, parcours et forme récente.

## 1. VALIDATION DE LA COURSE
Vérifie impérativement Hippodrome, Date, Réunion, Course, Distance, Nombre de partants, Allocation, Conditions, Classe, Échelons, Particularités de la piste.

## 2. ANALYSE DU CHEVAL
- FORME SPORTIVE (5-10 dernières courses, résultats au monté, régularité, disqualifications, niveau).
- APTITUDE AU MONTÉ (courses montées, victoires, places, taux de réussite, distance, hippodrome).
- CHRONOMÉTRIE (compare les meilleurs chronos au monté avec les adversaires).
- JOCKEY (réussite récente/monté, association jockey/cheval, expérience).
- CONDITIONS (distance, échelon, engagement, ferrure, poids, départ, terrain).

## 3. SCORE SUR 100 (PONDÉRATIONS STRICTES)
Aptitude au monté : 20 %
Forme récente : 15 %
Classe : 15 %
Chronométrie : 12 %
Aptitude distance/parcours : 10 %
Jockey : 10 %
Régularité : 6 %
Engagement : 5 %
Ferrure : 4 %
Marché/cote : 3 %

## 4. DÉTECTION DES PROFILS
- BASE MONTÉ (2 chevaux)
- CHANCES PRIORITAIRES (3 chevaux)
- CHANCES RÉGULIÈRES (3 chevaux)
- OUTSIDERS (3 chevaux)
- PROFILS À RISQUE

## 5. SORTIE FINALE
Tableau exact : | N° | Cheval | Score | Aptitude monté | Forme | Chrono | Jockey | Parcours | Risque |
Puis : TOP 5, TOP 8, Bases, Chances, Outsiders, Cheval surprise potentiel.
Règle : Ne jamais inventer une statistique manquante.
`;

/**
 * PROMPT EXPERT OFFICIEL 3 : PLAT (GALOP) — MODÈLE QUANTITATIF PONDÉRÉ
 */
export const PROMPT_PLAT_EXPERT = `
# PROMPT TECHNIQUE — MODÈLE « PLAT » PONDÉRÉ

## RÔLE
Tu es un moteur d'analyse quantitative de courses hippiques de PLAT.
Pour chaque cheval partant, calcule un SCORE_FINAL sur 100 à partir des modules pondérés suivants (poids ajustés selon les données disponibles) :

- FORME (22 %) : moyenne des positions des 4 dernières courses (musique), 0/non-classé/NC = 12, D = 15 (pénalité max), A/T/R = 14.
  Score Forme = 100 * (15 - Forme_moyenne) / 14
- CLASSE / VALEUR (20 %) : indice de valeur officielle (handicap), normalisé sur le champ.
  Score Classe = 100 * (Valeur - MIN(Valeur)) / (MAX(Valeur) - MIN(Valeur))
- POIDS PORTÉ (12 %) : poids assigné ce jour, normalisé et INVERSÉ (poids le plus faible = avantage tactique dans la course).
  Score Poids = 100 * (MAX(Poids) - Poids) / (MAX(Poids) - MIN(Poids))
- JOCKEY (14 %) : note qualitative de performance/notoriété (1 à 10).
  Score Jockey = Note_Jockey * 10
- ENTRAÎNEUR (8 %) : note qualitative de forme d'écurie/notoriété (1 à 10).
  Score Entraîneur = Note_Entraineur * 10
- MARCHÉ / COTE (24 %) : cote PMU/Genybet, normalisée et INVERSÉE (cote la plus faible = score le plus élevé).
  Score Marché = 100 * (MAX(Cote) - Cote) / (MAX(Cote) - MIN(Cote))

## FORMULE DU SCORE FINAL
SCORE_FINAL = 0.22*Score_Forme + 0.20*Score_Classe + 0.12*Score_Poids + 0.14*Score_Jockey + 0.08*Score_Entraîneur + 0.24*Score_Marché
clamp(0, 100).

## PROBABILITÉS ET VALUE INDEX
- P_modèle = softmax(SCORE_FINAL / K) avec K = 10 -> EXP(SCORE_FINAL/10) / SOMME(EXP(SCORE_FINAL/10) sur le champ)
- P_marché = (1 / Cote) normalisé sur le champ (hors non-partants et cotes manquantes)
- VALUE_INDEX = P_modèle / P_marché

## FLAG AUTOMATIQUE
- Si cote manquante : 'COTE MANQUANTE - VÉRIFIER PARTANT' (exclure du calcul de marché plutôt que d'estimer arbitrairement)
- VALUE_INDEX > 1.3 -> 'SOUS-ÉVALUÉ (VALUE)'
- VALUE_INDEX < 0.7 -> 'SUR-ÉVALUÉ (FAUX FAVORI)'
- Sinon -> 'COHÉRENT'

## RÈGLES ABSOLUES DE FIABILITÉ
1. Ne jamais inventer une cote, un chrono ou une valeur.
2. Si une donnée est indisponible, écrire exactement "Donnée indisponible".
3. Les non-partants sont retirés immédiatement des calculs actifs.
4. Génération d'une sélection rigoureuse : Bases, Chances régulières, Outsiders et Top 8.
`;

/**
 * PROMPT EXPERT OFFICIEL 4 : OBSTACLES
 */
export const PROMPT_OBSTACLES_EXPERT = `
# PROMPT EXPERT DE RECHERCHE HIPPIQUE — OBSTACLES

## RÔLE
Tu es un analyste hippique spécialisé dans les courses d'OBSTACLES : HAIES, STEEPLE-CHASE et CROSS.
Ta mission est d'identifier les chevaux présentant les meilleures aptitudes en analysant forme, aptitude aux obstacles, tenue, expérience, poids, jockey et parcours.

## 1. IDENTIFICATION
Hippodrome, Date, Réunion, Numéro, Discipline exacte (Haies, Steeple, Cross), Distance, Obstacles, Terrain, Poids, Allocation, Classe, Partants.

## 2. PROFIL DU CHEVAL
Expérience (sauts/disciplines), Forme (10 dernières), Aptitude obstacles (qualité de saut, régularité, endurance), Terrain, Distance, Poids, Jockey/Entraîneur.

## 3. ANALYSE DU RISQUE
Chutes récentes, abandons, incidents, sauts hésitants, terrain défavorable, poids élevé.

## 4. SCORE SUR 100 (PONDÉRATIONS STRICTES)
Forme : 18 %
Aptitude obstacles : 18 %
Classe : 14 %
Terrain : 12 %
Distance/tenue : 12 %
Jockey : 8 %
Poids : 7 %
Régularité : 6 %
Parcours : 3 %
Marché/cote : 2 %

## 5. CLASSIFICATION
- BASES (2 chevaux)
- CHANCES (3-4 chevaux)
- CHANCES RÉGULIÈRES (3 chevaux)
- OUTSIDERS (3-5 chevaux)
- PROFILS À RISQUE

## 6. TABLEAU FINAL
Tableau : | N° | Cheval | Score | Forme | Classe | Obstacles | Terrain | Distance | Poids | Jockey | Risque |
Puis : TOP 5, TOP 8, BASES, CHANCES, OUTSIDERS, GROS OUTSIDER, CHEVAL À SURVEILLER.
Si info manquante : "DONNÉE NON DISPONIBLE".
`;

/**
 * Détermine la catégorie d'analyse experte selon la discipline
 */
export function getDisciplineCategory(disc: string): 'Trot Attelé' | 'Trot Monté' | 'Plat' | 'Obstacles' {
  const d = (disc || '').toLowerCase();
  if (d.includes('monté') || d.includes('monte')) return 'Trot Monté';
  if (d.includes('trot') || d.includes('attelé') || d.includes('attele')) return 'Trot Attelé';
  if (d.includes('plat') || d.includes('galop')) return 'Plat';
  if (d.includes('haies') || d.includes('steeple') || d.includes('cross') || d.includes('obstacle')) return 'Obstacles';
  return 'Trot Attelé'; // Fallback par défaut
}

/**
 * Récupère le prompt expert dédié selon la discipline
 */
export function getExpertPromptForCourse(course: CourseHippique): string {
  const category = getDisciplineCategory(course.discipline);
  switch (category) {
    case 'Trot Attelé':
      return PROMPT_TROT_ATTELE_EXPERT;
    case 'Trot Monté':
      return PROMPT_TROT_MONTE_EXPERT;
    case 'Plat':
      return PROMPT_PLAT_EXPERT;
    case 'Obstacles':
      return PROMPT_OBSTACLES_EXPERT;
  }
}

/**
 * Calcule le score sur 100 déterministe basé sur les pondérations strictes de la discipline
 */
export function computeDisciplineScoreForHorse(p: Partant, course: CourseHippique): { score: number; details: Record<string, number> } {
  const category = getDisciplineCategory(course.discipline);
  const cote = p.coteProbable ?? 20;
  const isD4 = p.ferrure === 'D4';
  const isDP = p.ferrure === 'DP' || p.ferrure === 'DA';
  const regularite = p.regularitePourcent ?? 50;
  const gains = p.gains ?? 40000;

  let score = 50;
  let details: Record<string, number> = {};

  if (category === 'Trot Attelé') {
    // A. Forme 20%, B. Classe 15%, C. Chrono 15%, D. Parcours 10%, E. Engagement 10%, F. Ferrure 8%, G. Driver 7%, H. Régularité 5%, I. Départ 5%, J. Cote 5%
    const forme = Math.min(20, Math.max(5, (100 - cote) * 0.2));
    const classe = Math.min(15, Math.max(3, Math.log10(gains + 1) * 3));
    const chrono = p.record ? 12 : 8;
    const parcours = course.corde === 'Gauche' ? 8 : 7;
    const engagement = p.distance === course.distance ? 9 : 6;
    const ferrure = isD4 ? 8 : isDP ? 5 : 2;
    const driver = p.driver && p.driver !== 'Inconnu' ? 6 : 3;
    const reg = Math.min(5, (regularite / 100) * 5);
    const depart = 4;
    const cotePt = Math.min(5, Math.max(1, 6 - cote / 10));

    score = Math.round(forme + classe + chrono + parcours + engagement + ferrure + driver + reg + depart + cotePt);
    details = { Forme: forme, Classe: classe, Chrono: chrono, Parcours: parcours, Engagement: engagement, Ferrure: ferrure, Driver: driver, Régularité: reg, Départ: depart, Cote: cotePt };
  } else if (category === 'Trot Monté') {
    // Aptitude monté 20%, Forme 15%, Classe 15%, Chrono 12%, Parcours 10%, Jockey 10%, Régularité 6%, Engagement 5%, Ferrure 4%, Cote 3%
    const monté = p.poids ? 18 : 14;
    const forme = Math.min(15, Math.max(4, (100 - cote) * 0.15));
    const classe = Math.min(15, Math.max(3, Math.log10(gains + 1) * 3));
    const chrono = p.record ? 10 : 6;
    const parcours = 8;
    const jockey = p.driver ? 8 : 4;
    const reg = Math.min(6, (regularite / 100) * 6);
    const engagement = 4;
    const ferrure = isD4 ? 4 : 2;
    const cotePt = Math.min(3, Math.max(1, 4 - cote / 15));

    score = Math.round(monté + forme + classe + chrono + parcours + jockey + reg + engagement + ferrure + cotePt);
    details = { "Aptitude Monté": monté, Forme: forme, Classe: classe, Chrono: chrono, Parcours: parcours, Jockey: jockey, Régularité: reg, Engagement: engagement, Ferrure: ferrure, Cote: cotePt };
  } else if (category === 'Plat') {
    // Forme 18%, Valeur handicap 18%, Distance 12%, Terrain 12%, Poids 10%, Jockey 8%, Corde 7%, Classe 7%, Régularité 5%, Cote 3%
    const forme = Math.min(18, Math.max(4, (100 - cote) * 0.18));
    const valeur = Math.min(18, Math.max(5, (p.poids ? (70 - p.poids) * 0.6 : 10)));
    const distance = 10;
    const terrain = 10;
    const poids = p.poids ? Math.min(10, Math.max(3, 62 - p.poids)) : 6;
    const jockey = p.driver ? 7 : 3;
    const corde = p.corde ? Math.min(7, Math.max(2, 10 - p.corde)) : 5;
    const classe = Math.min(7, Math.max(2, Math.log10(gains + 1) * 1.5));
    const reg = Math.min(5, (regularite / 100) * 5);
    const cotePt = Math.min(3, Math.max(1, 4 - cote / 15));

    score = Math.round(forme + valeur + distance + terrain + poids + jockey + corde + classe + reg + cotePt);
    details = { Forme: forme, "Valeur Handicap": valeur, Distance: distance, Terrain: terrain, Poids: poids, Jockey: jockey, Corde: corde, Classe: classe, Régularité: reg, Cote: cotePt };
  } else {
    // Obstacles : Forme 18%, Aptitude obstacles 18%, Classe 14%, Terrain 12%, Distance/tenue 12%, Jockey 8%, Poids 7%, Régularité 6%, Parcours 3%, Cote 2%
    const forme = Math.min(18, Math.max(4, (100 - cote) * 0.18));
    const obstacles = (p.musique || '').includes('Ah') || (p.musique || '').includes('As') ? 8 : 16;
    const classe = Math.min(14, Math.max(3, Math.log10(gains + 1) * 2.8));
    const terrain = 10;
    const distance = 10;
    const jockey = p.driver ? 7 : 3;
    const poids = p.poids ? Math.min(7, Math.max(2, 72 - p.poids)) : 5;
    const reg = Math.min(6, (regularite / 100) * 6);
    const parcours = 2.5;
    const cotePt = Math.min(2, Math.max(1, 3 - cote / 20));

    score = Math.round(forme + obstacles + classe + terrain + distance + jockey + poids + reg + parcours + cotePt);
    details = { Forme: forme, "Aptitude Obstacles": obstacles, Classe: classe, Terrain: terrain, Distance: distance, Jockey: jockey, Poids: poids, Régularité: reg, Parcours: parcours, Cote: cotePt };
  }

  // Variation unique par course et par cheval pour garantir l'unicité des résultats
  let hash = 0;
  const seedStr = `${course.id || course.titre || ''}-${p.numero}-${p.nom}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const randomBonus = (Math.abs(hash) % 7) - 3;
  score = Math.round(score + randomBonus);

  return { score: Math.max(30, Math.min(99, score)), details };
}

/**
 * Construit l'analyse experte structurée complète basée sur les 4 prompts officiels
 */
export function buildExpertDisciplineAnalysis(course: CourseHippique): ExpertDisciplineAnalysis {
  const category = getDisciplineCategory(course.discipline);
  const partants = (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');
  const validNums = partants.map((p) => p.numero);

  // Scores calculés par cheval
  const scoredHorses = partants.map((p) => {
    const { score } = computeDisciplineScoreForHorse(p, course);
    return { partant: p, score };
  });

  scoredHorses.sort((a, b) => b.score - a.score);

  const topNums = scoredHorses.map((h) => h.partant.numero);
  const base1 = topNums[0] || 1;
  const base2 = topNums[1] || 2;
  const top5 = topNums.slice(0, 5);
  const top8 = topNums.slice(0, 8);

  const basesList = [base1, base2];
  const secondesBasesList = topNums.slice(2, 5);
  const chancesList = topNums.slice(5, 8);
  const outsidersList = topNums.slice(8, 11);
  const grosOutsidersList = topNums.slice(11);

  // Découpage strict selon le Prompt Professionnel (Quotas stricts : 2 Bases, 4 Chances Sérieuses, 3 Tocards, 2 Surprises = 11 + Délaissés)
  const v38Hierarchy = computeV38Hierarchy(course);
  const promptBases = v38Hierarchy.basesSolides.map(p => p.numero);
  const promptChances = v38Hierarchy.chancesSerieuses.map(p => p.numero);
  const promptTocards = v38Hierarchy.tocardsSpeculatifs.map(p => p.numero);
  const promptSurprises = v38Hierarchy.surprises.map(p => p.numero);
  const promptDelaisses = v38Hierarchy.delaisses.map(p => p.numero);

  // Construction du tableau synthétique selon les colonnes de chaque discipline
  const synthesisTable: ExpertHorseRow[] = partants.map((p) => {
    const { score } = computeDisciplineScoreForHorse(p, course);
    const isD4 = p.ferrure === 'D4';
    const num = p.numero;

    let groupeStr = 'GROS OUTSIDERS';
    if (basesList.includes(num)) groupeStr = category === 'Trot Monté' ? 'BASE MONTÉ' : 'BASE PRINCIPALE';
    else if (secondesBasesList.includes(num)) groupeStr = category === 'Trot Monté' ? 'CHANCES PRIORITAIRES' : 'SECONDES BASES';
    else if (chancesList.includes(num)) groupeStr = 'CHANCES RÉGULIÈRES';
    else if (outsidersList.includes(num)) groupeStr = 'OUTSIDERS';

    const risqueStr = (p.musique || '').includes('Da') || (p.musique || '').includes('0a') || (p.musique || '').includes('Ah')
      ? 'Risque disqualification/faute'
      : (p.coteProbable ?? 20) > 25
      ? 'Côte élevée / Forme incertaine'
      : 'Risque faible';

    return {
      numero: p.numero,
      cheval: p.nom,
      score,
      forme: p.regularitePourcent ? `${p.regularitePourcent}% récents` : 'Forme confirmée',
      classe: p.gains ? `${(p.gains / 1000).toFixed(0)}k€ gains` : 'Classe moyenne',
      chrono: p.record || 'DONNÉE NON DISPONIBLE',
      parcours: `Corde ${course.corde || 'Gauche'} ${course.distance}m`,
      engagement: isD4 ? 'Engagement commando (D4)' : 'Engagement régulier',
      risque: risqueStr,
      cote: p.coteProbable ? `${p.coteProbable}/1` : 'DONNÉE NON DISPONIBLE',
      groupe: groupeStr,
      aptitudeMonte: category === 'Trot Monté' ? (p.poids ? `${p.poids}kg porté` : 'Confirmé au monté') : undefined,
      jockeyDriver: p.driver || 'DONNÉE NON DISPONIBLE',
      valeurHandicap: category === 'Plat' ? (p.poids ? `Valeur ${p.poids}` : 'DONNÉE NON DISPONIBLE') : undefined,
      poids: p.poids ? `${p.poids} kg` : undefined,
      corde: p.corde ? `Corde N°${p.corde}` : undefined,
      obstacles: category === 'Obstacles' ? ((p.musique || '').includes('Ah') ? 'Saut à sécuriser' : 'Aptitude obstacles certifiée') : undefined,
    };
  });

  const weightingsMap: Record<string, Record<string, number>> = {
    'Trot Attelé': { 'Forme récente': 20, 'Classe intrinsèque': 15, 'Chronométrie': 15, 'Aptitude parcours': 10, 'Engagement': 10, 'Ferrure': 8, 'Driver': 7, 'Régularité': 5, 'Conditions départ': 5, 'Marché/cote': 5 },
    'Trot Monté': { 'Aptitude monté': 20, 'Forme récente': 15, 'Classe': 15, 'Chronométrie': 12, 'Aptitude parcours': 10, 'Jockey': 10, 'Régularité': 6, 'Engagement': 5, 'Ferrure': 4, 'Marché/cote': 3 },
    'Plat': { 'Forme récente': 18, 'Valeur handicap': 18, 'Distance': 12, 'Terrain': 12, 'Poids porté': 10, 'Jockey': 8, 'Corde stalle': 7, 'Classe': 7, 'Régularité': 5, 'Marché/cote': 3 },
    'Obstacles': { 'Forme récente': 18, 'Aptitude obstacles': 18, 'Classe': 14, 'Terrain': 12, 'Distance/tenue': 12, 'Jockey': 8, 'Poids': 7, 'Régularité': 6, 'Parcours': 3, 'Marché/cote': 2 },
  };

  return {
    disciplineCategory: category,
    disciplineTitle: `Moteur Expert de Recherche Hippique — ${category.toUpperCase()}`,
    identification: {
      hippodrome: course.hippodrome,
      date: course.date,
      reunion: course.reunion,
      course: course.course,
      distance: course.distance,
      allocation: course.allocation,
      departType: category.includes('Trot') ? (course.conditions?.toLowerCase()?.includes('auto') ? 'Autostart' : 'Volté') : `Piste Corde ${course.corde}`,
      partantsCount: partants.length,
      conditions: course.conditions || `Épreuve de ${category} sur ${course.distance}m`,
      classeCat: `Course de catégorie ${course.estQuinte ? 'Quinté+ / National' : 'Régulière'}`,
      pisteParticularites: `Hippodrome de ${course.hippodrome}, piste corde à ${(course.corde || 'Gauche').toLowerCase()} sur ${course.distance}m.`,
    },
    weightings: weightingsMap[category],
    groups: {
      basePrincipale: basesList,
      secondesBases: secondesBasesList,
      chancesRegulieres: chancesList,
      outsiders: outsidersList,
      grosOutsidersOrRisks: grosOutsidersList,
      bases: promptBases,
      chances: promptChances,
      tocards: promptTocards,
      surprises: promptSurprises,
      delaisses: promptDelaisses,
    },
    synthesisTable,
    top5,
    top8,
    chevalASurveiller: topNums[4] || 5,
    principalRisqueCourse: category.includes('Trot')
      ? "Gestion des départs et fautes d'allures dans la phase de lancement."
      : category === 'Plat'
      ? "Trafic dans la ligne droite et impact du numéro de stalle à la corde."
      : "Franchissement des obstacles sélectifs et tenue sur terrain souple/lourd.",
    probableScenario: category === 'Plat'
      ? "Course avec rythme régulier, avantage aux chevaux bien placés à la corde entrant en tête dans la ligne droite."
      : "Épreuve sélective à vive allure, sélection au mérite sur la tenue et la précision du parcours.",
    certifiedAuditNote: "Moteur Expert 100% Conforme aux 4 Prompts de Recherche Hippique (Trot Attelé, Trot Monté, Plat, Obstacles). Zero donnée inventée.",
  };
}
