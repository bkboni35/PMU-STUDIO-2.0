import type { HorseJockeySynergyMetrics } from '../utils/horseJockeySynergyEngine';

export type TurfSource = 'geny.com' | 'paristurf.com' | 'pmu.lonacionline.ci' | 'autre';

export type Discipline = 
  | 'Trot Attelé'
  | 'Trot Monté'
  | 'Plat'
  | 'Haies'
  | 'Steeple-Chase'
  | 'Cross-Country';

export type Ferrure = 'D4' | 'DP' | 'DA' | 'F' | 'Inconnu';

export interface Partant {
  numero: number;
  nom: string;
  driver: string;
  entraineur: string;
  proprietaire?: string;
  musique: string;
  musiqueDecryptee?: string[];
  horseJockeySynergy?: HorseJockeySynergyMetrics;
  coteProbable?: number;
  cotePrecedente?: number;
  evolutionCote?: 'hausse' | 'baisse' | 'stable';
  ferrure?: Ferrure;
  gains: number; // en euros
  record?: string; // ex: 1'11"4
  distance?: number; // ex: 2850 ou 2875 (si recul)
  age: number;
  sexe: 'M' | 'F' | 'H';
  race?: string; // Race du cheval (ex: Trotteur Français, Pur-sang, AQPS)
  poids?: number; // pour le plat, obstacle ou monté (kg)
  poidsPrecedent?: number; // poids porté lors de la course précédente (kg)
  evolutionPoids?: number; // variation en kg (poids - poidsPrecedent), ex: -1.5 (gain/soulagement) ou +2.0 (surcharge)
  corde?: number; // numéro de stalle à la corde pour le plat
  hippoScore?: number; // Note sur 100 calculée
  indexValeur?: number; // Index de valeur (rapport performance / cote / value bet)
  avisExpert?: string;
  regularitePourcent?: number; // % dans les 3 premiers
  victoiresTotal?: number;
  placesTotal?: number;
  // Statistiques officielles Geny du Driver / Jockey
  driverCourses?: number;
  driverVictoires?: number;
  driverPlaces?: number;
  driverEcart?: number;
  driverReussite?: number; // % de réussite (ex: 16%)
  driverMusique?: string; // Musique propre du driver sur Geny
  statut?: 'Favori' | 'Seconde chance' | 'Outsider' | 'Tocard' | 'Non-partant' | 'Partant';
  estNonPartant?: boolean; // Signalé Non-Partant (NP)
  rangArrivee?: number; // Position à l'arrivée officielle (1er, 2e, etc.)
  genyOdds?: number; // Cote officielle du site Geny
  parisTurfOdds?: number; // Cote officielle extraite du site Paris-Turf
  pmuOdds?: number; // Cote officielle en temps réel PMU.fr
  cotesRaw?: string; // Libellé brut de la cote (ex: "4.8/1")
  group?: 'G1' | 'G2' | 'G3'; // Répartition en 3 groupes (G1: 1-6, G2: 7-10, G3: 11+)
  evaluationsGemini?: HorseGeminiMultiEvaluation;
}

export interface HorseGeminiMultiEvaluation {
  gemini31lite?: {
    note: number; // sur 100
    avis: string;
    coteEstimee?: number;
    statutQuinte: 'Base Incontournable' | 'Seconde Chance' | 'Outsider Dangereux' | 'Tocard Spéculatif' | 'À Écarter';
    vitesseInferenceMs?: number;
  };
  gemini38: {
    note: number; // sur 100
    avis: string;
    impactQuinte: 'Base Incontournable' | 'Seconde Chance Forte' | 'Outsider Dangereux' | 'À Écarter';
  };
  gemini37: {
    note: number; // sur 100
    avis: string;
    dynamiqueMusique: 'En nette progression' | 'Régularité exemplaire' | 'Irrégulier / Fautes' | 'Rentrée de repos';
  };
  gemini36: {
    note: number; // sur 100
    avis: string;
    aptitudePiste: 'Parfaite adéquation' | 'Aptitude confirmée' | 'Distance limite' | 'Inédit / Doute';
    reductionKilometrique?: string;
  };
  gemini35: {
    note: number; // sur 100
    avis: string;
    impactFerrure: 'Configuration optimale (D4)' | 'Configuration allégée' | 'Configuration sage (Ferré)' | 'Avantage engagement';
  };
  gemini38lite?: {
    note: number; // sur 100
    avis: string;
    briefVocal?: string;
  };
  gemini35lite?: {
    note: number; // sur 100
    avis: string;
    alerteCote?: string;
  };
  gemini31pro?: {
    note: number; // sur 100
    avis: string;
    valueBetStatus: 'Forte Valeur (Value Bet)' | 'Cote Équilibrée' | 'Légèrement Surcoté' | 'Sous-payé (Piège)';
    esperanceGain: string; // ex: "+38% EV"
    varianceRisque: 'Risque Faible' | 'Risque Modéré' | 'Spéculatif';
  };
  deepResearch?: {
    note: number;
    avis: string;
    profondeurHistorique: string;
  };
  antigravityAgent?: {
    note: number;
    avis: string;
    stabilitePredictive: string;
  };
  gemma?: {
    note: number;
    avis: string;
    vitesseTactique: string;
  };
  vertexAi?: {
    note: number;
    avis: string;
    puissanceSimulation: string;
  };
  gemini4Argon?: {
    note: number;
    avis: string;
    musiqueDriverCertifiee: string;
    sourceExtraction: string;
  };
  manus20Pro?: {
    note: number;
    avis: string;
    auditMultiSources: string;
  };
  manus20Lite?: {
    note: number;
    avis: string;
    vitesseScan: string;
  };
}

export type GeminiModelId = 
  | 'gemini-4-argon'
  | 'manus-2.0-pro'
  | 'manus-2.0-lite'
  | 'manus-flex-beta'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.8' 
  | 'gemini-3.8-lite' 
  | 'gemini-3.7' 
  | 'gemini-3.6' 
  | 'gemini-3.5' 
  | 'gemini-3.5-lite' 
  | 'gemini-3.1-pro'
  | 'gpt-4o'
  | 'gpt-4o-fact-checker'
  | 'deep-research'
  | 'antigravity-agent'
  | 'gemma'
  | 'vertex-ai'
  | 'perplexity-ai'
  | 'claude-4.6-sonnet'
  | 'chatgpt'
  | 'deepseek-v3'
  | 'deepseek-r1'
  | 'qwen-2.5'
  | 'kimi-k1.5'
  | 'glm-4';

export interface GeminiExpertTask {
  id: GeminiModelId;
  name: string;
  badge: string;
  role: string;
  specialite: string;
  colorTheme: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'cyan' | 'orange' | 'red' | 'indigo' | 'slate';
  tacheAttribuee: string;
  focalisation: string;
  methode: string;
  verdictGlobal: string;
  topChevauxRecommandes: number[];
  indiceSpecialiste: number; // ex: 9.4
}

export interface PropositionJeu {
  id: string;
  titre: string;
  sousTitre?: string;
  badge: string;
  typePari: 'Simple Gagnant' | 'Simple Placé' | 'Couplé Gagnant' | 'Couplé Placé' | '2 sur 4' | 'Tiercé' | 'Quarté+' | 'Quinté+' | 'Multi 4' | 'Multi 5' | 'Pick 5';
  formule: 'Unitaire' | 'Combiné' | 'Champ Réduit';
  chevaux: number[];
  bases?: number[];
  associes?: number[];
  cout: number; // en euros
  coutFlexi50?: number;
  coutFlexi25?: number;
  flexiRecommande?: 100 | 50 | 25;
  niveauRisque: 'Faible (Sécurisé)' | 'Modéré (Équilibré)' | 'Spéculatif (Gros Rapports)';
  indiceRentabilite: number; // ex: 9.4/10
  gainPotentiel: string;
  strategieIa: string;
  expertRecommandeur: GeminiModelId;
}

export interface PronosticSynthese {
  baseIncontournable: number; // BASE (ex: n°14)
  secondeBase: number; // SECONDE BASE (ex: n°7)
  favoris?: number[]; // FAVORIS (3 numéros classés par cote croissante)
  chances?: number[]; // CHANCES (premières chances de podium)
  outsiders: number[]; // OUTSIDERS (3 numéros classés par cote croissante)
  tocards: number[]; // TOCARDS (3 numéros classés par cote croissante)
  surprises?: number[]; // SURPRISES (4 numéros : 10e, 11e + 2 plus grands numéros des délaissés)
  selection8: number[]; // SÉLECTION 8 (les 8 chevaux du Quinté recommandés)
  selectionJustification: string;
  conseilPari: string;
  indiceConfiance: number; // sur 10 (ex: 8/10)
  analyseParcours: string;
  piegesCourse: string[];
  ordreProbable?: number[]; // Top 5 chevaux dans l'ordre le plus probable
  ordrePossible?: number[]; // Top 5 chevaux dans l'ordre alternatif spéculatif
  ordreProbableExplication?: string;
  ordrePossibleExplication?: string;
  delaisses?: number[]; // Délaissés triés du plus grand au plus petit numéro (ordre décroissant)
}

export interface PointControleAudit {
  point: string;
  statut: 'VALIDE' | 'COMPLÉTÉ' | 'CORRIGÉ' | 'ALERTE';
  detail: string;
}

export interface SourceWebConsultee {
  nom: string;
  url: string;
  type: 'Site Officiel PMU' | 'Société Mère (LeTROT / France Galop)' | 'Presse Spécialisée (Geny / Paris-Turf)' | 'Google Search Grounding';
}

export interface CertificatVerification {
  auditeur: string; // ex: "IA Contrôleur Officiel & Fact-Checker (Gemini Search Grounding)"
  statut: 'CERTIFIÉ CONFORME' | 'COMPLÉTÉ VIA WEB' | 'DONNÉES ENRICHIES';
  scoreFiabilite: number; // sur 100 (ex: 99)
  dateAudit: string;
  pointsControles: PointControleAudit[];
  sourcesConsultees: SourceWebConsultee[];
  syntheseAudit: string;
  donneesInchangees: boolean;
}

export interface PipelineStageContributor {
  model: string;
  modelAlias: string;
  role: string;
  actionSpecifique: string;
  statut: 'Actif ✓' | 'Validé ✓';
}

export interface Pipeline5Stages {
  etape1Extraction: {
    model: string;
    modelAlias: string;
    description: string;
    partantsCount: number;
    donneesStructurees: string[];
    vitesseExecutionMs: number;
    statut: 'Validé ✓' | 'En cours' | 'En attente';
    contributeursIa?: PipelineStageContributor[];
  };
  etape2AnalyseIndividuelle: {
    model: string;
    modelAlias: string;
    description: string;
    criteresEvalues: string[];
    hippoScoresGeneres: number;
    statut: 'Validé ✓' | 'En cours' | 'En attente';
    contributeursIa?: PipelineStageContributor[];
  };
  etape3AnalyseApprofondie: {
    model: string;
    modelAlias: string;
    description: string;
    interactionsTraitees: string[];
    volumeDonnees: string;
    rythmeCourse: string;
    statut: 'Validé ✓' | 'En cours' | 'En attente';
    contributeursIa?: PipelineStageContributor[];
  };
  etape4ContreAnalyse: {
    model: string;
    modelAlias: string;
    description: string;
    incoherencesRecherchees: string[];
    chevauxOubliesVerifies: boolean;
    surEvaluationFavorisAlerte: string;
    outsidersSousEstimesDetectes: number[];
    statutGardeFou: 'ZÉRO CONTAMINATION CERTIFIÉ' | 'CORRIGÉ AVEC SUCCÈS';
    statut: 'Validé ✓' | 'En cours' | 'En attente';
    contributeursIa?: PipelineStageContributor[];
  };
  etape5DecisionAlgorithmique: {
    model: string;
    modelAlias: string;
    description: string;
    baseIncontournable: number;
    secondeBase: number;
    selection8: number[];
    outsiders: number[];
    tocards: number[];
    indiceConfiance: number;
    statut: 'Décision Certifiée ✓' | 'En cours' | 'En attente';
    contributeursIa?: PipelineStageContributor[];
    ordreProbable?: number[];
    ordrePossible?: number[];
  };
}

export interface CourseHippique {
  id: string;
  sourceUrl: string;
  sourceType: TurfSource;
  titre: string;
  prixNom: string;
  hippodrome: string;
  reunion: string; // ex: "R1"
  course: string; // ex: "C1"
  courseNumero?: string; // ex: "C1", "C3", etc.
  estQuinte: boolean;
  estPick5?: boolean;
  discipline: Discipline;
  date: string;
  heure: string;
  distance: number;
  corde: 'Gauche' | 'Droite';
  terrain: string; // ex: "Bon", "Mâchefer", "PSF", "Lourd"
  allocation: number; // ex: 60000 €
  conditions: string;
  arriveeOfficielle?: string; // ex: "13 - 7 - 4 - 9 - 3"
  statutCourse?: 'À venir' | 'Partants définitifs' | 'Course en cours' | 'Arrivée officielle' | 'Arrivée provisoire' | 'En attente de l\'arrivée officielle' | 'Course terminée';
  statut?: 'ATTENTE' | 'ARRIVEE_PROVISOIRE' | 'ARRIVEE_OFFICIELLE';
  statutArrivee?: string; // ex: "PROVISOIRE" | "OFFICIELLE" | "en_attente"
  isOfficial?: boolean;
  donneesFigees?: boolean;
  evaluationPostCourse?: any;
  partants: Partant[];
  synthese: PronosticSynthese;
  synthesePresse?: {
    source: string;
    selection: number[];
  }[];
  collegeGemini?: GeminiExpertTask[];
  propositionsJeu?: PropositionJeu[];
  certificatVerification?: CertificatVerification;
  pipeline5Stages?: Pipeline5Stages;
  architectureMultiAi?: ArchitectureMultiAiEngine;
  derniereMiseAJour?: string;
  provisionalArrivalAt?: string;
  hasEnquete?: boolean;
  officialArrivalAt?: string;
  arrivalAuditCompleted?: boolean;
  arrivalAuditTimestamp?: string;
  arrivalAuditModificationDetected?: boolean;
  arrivalAuditPreviousArrival?: string;
  expertDisciplineAnalysis?: ExpertDisciplineAnalysis;
  cotesScellees?: boolean; // Verrouille définitivement les cotes des chevaux après analyse (aucune variation ultérieure)
  rectificationsApplied?: string[]; // Journal chronologique des rectifications appliquées par le middleware
  delaisses?: number[]; // Numéros des chevaux délaissés classés par ordre décroissant (du plus grand au plus petit)
  perplexityResearch?: PerplexityResearchResult;
  tabularEnsemble?: TabularEnsembleResult;
}

export interface ShapFeatureContribution {
  featureName: string;
  category: 'Performance' | 'Entourage' | 'Discipline & Piste' | 'Physique & Corde';
  impactValue: number; // Impact numérique (ex: +12.4 ou -6.2)
  impactFormatted: string; // Ex: "+12.4%"
  description: string;
}

export interface TabularEntourageMetrics {
  driverOrJockeyName: string;
  trainerName: string;
  jockeyWinRate365jBayes: number; // Taux de victoire bayésien lissé 365j (%)
  jockeyPlaceRate365jBayes: number; // Taux de podium bayésien lissé 365j (%)
  jockeyForme14j: number; // Forme récente 14j (%)
  contextualDriverScore: number; // Score S_driver ou S_jockey sur 100
  trainerWinRate30jBayes: number; // Victoires entraîneur 30j lissées (%)
  pairHorseDriverRate: number; // Réussite du couple cheval-driver (%)
  pairJockeyTrainerRate: number; // Réussite du duo jockey-entraîneur (%)
  bayesianSmoothingFactorM: number; // Paramètre m de lissage bayésien
}

export interface TabularRunnerPrediction {
  numero: number;
  nom: string;
  driver: string;
  entraineur: string;
  coteProbable?: number;
  estNonPartant?: boolean;
  
  // Modèle 1: LightGBM LambdaRank
  lambdaRankRank: number; // Rang prédictif de 1 à N
  lambdaRankScore: number; // Score de pertinence LambdaRank (0-100)
  targetRelevance: number; // Relevance cible (4 si 1er, 3 si 2e, 2 si 3e, 1 si 4e/5e, 0 sinon)

  // Modèle 2: CatBoost Classifier Victoire
  pCatBoost: number; // Probabilité CatBoost %
  pCatBoostFormatted: string; // Ex: "29.4%"

  // Modèle 3: LightGBM Softmax
  pLightGBM: number; // Probabilité LightGBM Softmax %
  pLightGBMFormatted: string; // Ex: "26.8%"

  // Metrics de Variance Inter-Modèles (CatBoost vs LightGBM)
  modelVariance: number; // Variance / Écart de probabilité |CatBoost - LightGBM|
  modelVarianceFormatted: string; // Ex: "2.6%"
  confidenceLevel: 'HAUTE' | 'MODEREE' | 'DIVERGENTE'; // Niveau de confiance du blending

  // Probabilité de victoire combinée P_blend
  pVictoire: number; // Probabilité de victoire calibrée % (0 - 100)
  pVictoireFormatted: string; // Ex: "28.5%"

  // Modèle 4: CatBoost Classifier Top 3 (Podium)
  pTop3: number; // Probabilité de podium calibrée % (0 - 100)
  pTop3Formatted: string; // Ex: "64.2%"

  // Variables Entourage & Lissage Bayésien
  entourageMetrics: TabularEntourageMetrics;
  horseJockeySynergy?: HorseJockeySynergyMetrics;

  // Modèle d'explicabilité SHAP
  shapPositiveFactors: ShapFeatureContribution[];
  shapNegativeFactors: ShapFeatureContribution[];
  shapGlobalScore: number; // Score SHAP net aggregé

  // Couche de Décision Algorithmique Final
  category: 'BASE INCONTOURNABLE' | 'OUTSIDER SÉDUISANT' | "CAPABLES D'EXPLOITS" | 'TOCARD SPÉCULATIF' | 'DÉLAISSÉ' | 'NON-PARTANT';
  decisionJustification: string;
}

export interface TabularEnsembleResult {
  generatedAt: string;
  discipline: Discipline;
  disciplineModelPipeline: 'Trot Attelé Model' | 'Trot Monté Model' | 'Plat Speed & Draw Model' | 'Obstacle Jumping & Weight Model';
  modelVersions: {
    lightgbmLambdaRank: string;
    catboostWinClassifier: string;
    catboostTop3Classifier: string;
    shapExplainer: string;
  };
  totalRunnersAnalyzed: number;
  runnersPredictions: TabularRunnerPrediction[];
  
  // Synthèse par catégories découlant des probabilités calibrées
  baseIncontournable: TabularRunnerPrediction | null;
  secondeBase: TabularRunnerPrediction | null;
  topOutsiders: TabularRunnerPrediction[];
  topTocards: TabularRunnerPrediction[];
  delaisses: TabularRunnerPrediction[];

  // Métriques globales du modèle pour la course
  calibrationReliabilityIndex: number; // Indice de fiabilité globale (ex: 94.8/100)
  featureImportanceDistribution: { feature: string; importance: number }[];
  calibrationEngineReport?: CalibrationEngineReport;
}

export type CalibrationMethod = 'softmax_temperature' | 'isotonic_regression' | 'platt_scaling';

export interface CalibrationReliabilityBin {
  binMin: number; // ex: 0.0 (0%)
  binMax: number; // ex: 0.1 (10%)
  binLabel: string; // "0-10%"
  sampleCount: number;
  predictedProbabilityAvg: number; // Probabilité moyenne prédite (%)
  actualObservedFrequency: number; // Fréquence réelle observée de victoire/podium (%)
  calibrationGap: number; // Écart absolu |Prédit - Observé| (%)
}

export interface ChronologicalSplitValidationMetrics {
  periodLabel: string; // ex: "2022-2024", "Jan-Juin 2025", "Juil-Déc 2025", "2026"
  usage: 'Entraînement' | 'Calibration' | 'Validation Test' | 'Conditions Réelles (Live)';
  dateRange: string;
  totalRacesAnalyzed: number;
  totalRunners: number;
  brierScore: number; // Brier Score (0.00 à 0.25, le plus bas est le meilleur)
  expectedCalibrationErrorECE: number; // ECE en % (ex: 1.8%)
  logLoss: number; // Log Loss / Cross-Entropy
  top1WinAccuracy: number; // Taux de réussite simple gagnant sur la base (%)
  top3PodiumAccuracy: number; // Taux de réussite dans le Tiercé / Top 3 (%)
  reliabilityCurveBins: CalibrationReliabilityBin[];
}

export interface CalibrationEngineReport {
  currentMethod: CalibrationMethod;
  temperature: number; // T ∈ [0.2, 3.0]
  overallBrierScore: number;
  overallECE: number; // % e.g. 1.8%
  overallLogLoss: number;
  reliabilityCurveBinsWin: CalibrationReliabilityBin[];
  reliabilityCurveBinsTop3: CalibrationReliabilityBin[];
  chronologicalSplits: ChronologicalSplitValidationMetrics[];
  pythonTrainingCodeSnippet: string;
}

export type GenyImportSourceMode = 'copier_coller' | 'image_ocr' | 'api_licenciee' | 'saisie_manuelle';

export interface GenyParsedRunner {
  numero: number;
  cheval: string;
  corde?: number | null;
  sexe?: string | null;
  age?: number | null;
  poids?: number | null;
  decharge?: number | null;
  jockey: string;
  entraineur: string;
  musique?: string | null;
  valeur?: number | null;
  cote?: number | null;
  // Statistiques du driver Geny.com
  driverCourses?: number | null;
  driverVictoires?: number | null;
  driverPlaces?: number | null;
  driverEcart?: number | null;
  driverReussite?: number | null;
  driverMusique?: string | null;
  statut: 'PARTANT' | 'NON_PARTANT';
  equipement?: {
    oeilleres?: boolean;
    type_oeilleres?: string;
  };
}

export interface GenyStandardizedRaceJSON {
  source: {
    nom: string;
    url?: string;
    mode_import: GenyImportSourceMode;
    date_import: string;
  };
  course: {
    course_id: string;
    date: string;
    reunion: string;
    numero_course: string;
    hippodrome: string;
    discipline: Discipline;
    distance_m: number;
    surface: string;
    corde: 'GAUCHE' | 'DROITE';
    terrain: string;
    nombre_partants: number;
  };
  partants: GenyParsedRunner[];
}

export interface PerplexityHorseScout {
  numero: number;
  nom: string;
  driver?: string;
  entraineur?: string;
  recentFormNotes: string;
  jockeyTrainerTrend: string;
  keyStrengths: string[];
  riskFactors: string[];
  perplexityConfidence: number; // 0-100
  verdict: 'Incontournable' | 'Belle Chance' | 'Outsider Aiguisé' | 'Tocard Spéculatif' | 'Méfiance';
  bruitEcurie?: string;
}

export interface PerplexityDriverFormScout {
  rank: number; // Rang au classement (1, 2, 3...)
  driverName: string;
  horseNumero: number;
  horseNom: string;
  driverMusique?: string; // Musique extraite en direct (ex: "1a 2a 2a 6a 1a 4a 3a 7a")
  musiqueSource?: string; // Source d'extraction : "API PMU Officielle (turfinfo)" | "geny.com" | "pmu.fr" | "Perplexity AI Live Web"
  tandemPoints?: number; // Score de points calculé sur la musique du driver
  winRateRecent: string; // ex: "78% dans le Top 4 (20 dernières courses)"
  top4Percentage: number; // Valeur numérique pour le tri (ex: 78)
  careerWins: number; // Nombre de victoires (1er) obtenues pendant sa carrière
  formTrend: 'En Haute Forme 🔥' | 'Synergie Révélée ⭐' | 'Spécialiste du Tracé 🏆' | 'Chaud Paddock ⚡' | 'Forme Régulière 👍' | 'En Recherche 📈';
  perplexityComment: string; // Commentaire Perplexity AI sur la forme récente et les victoires
  extractedAt?: string; // Horodatage temps réel
}

export interface PerplexityResearchResult {
  query: string;
  summary: string;
  contextualInsights: string[];
  trackAndWeatherCondition: {
    trackState: string;
    weatherForecast: string;
    biasObservation: string;
  };
  horsesScouted: PerplexityHorseScout[];
  topDriversToFollow?: PerplexityDriverFormScout[]; // Les 6 drivers/jockeys incontournables
  fullDriverRanking?: PerplexityDriverFormScout[]; // Le classement complet de tous les drivers/jockeys de la course
  keyTacticalFactors: string[];
  citations: Array<{ title: string; url: string; snippet?: string }>;
  modelUsed: string;
  executedAt: string;
  latencyMs: number;
}

export interface MultiAiStepDetail {
  etape: number;
  nom: string;
  ia: 'Gemini Flash' | 'Gemini Pro' | 'Claude' | 'Mistral' | 'Code JavaScript/TypeScript';
  role: string;
  details: string;
  pointsCles: string[];
  donneesTraitees?: Record<string, any>;
  statut: 'Validé ✓' | 'Certifié ✓' | 'En cours';
}

export interface ArchitectureMultiAiEngine {
  titre: string;
  description: string;
  dateExecution: string;
  etapes: {
    etape1Extraction: MultiAiStepDetail;
    etape2Validation: MultiAiStepDetail;
    etape3DonneesHistoriques: MultiAiStepDetail;
    etape4AnalyseStatistique: MultiAiStepDetail;
    etape5AnalyseCheval: MultiAiStepDetail;
    etape6AnalyseMarche: MultiAiStepDetail;
    etape7ContreAnalyse: MultiAiStepDetail;
    etape8Scoring: MultiAiStepDetail;
    etape9Synthese: MultiAiStepDetail;
  };
  selectionFinale: {
    base1: number;
    base2: number;
    top8: number[];
    outsiders: number[];
    tocards: number[];
    indiceConfiance: number;
  };
}

export interface TicketSimule {
  typePari: 'Simple Gagnant' | 'Simple Placé' | 'Couplé Gagnant' | 'Couplé Placé' | '2 sur 4' | 'Tiercé' | 'Quarté+' | 'Quinté+' | 'Multi 4' | 'Multi 5' | 'Multi 6' | 'Multi 7' | 'Pick 5';
  formule: 'Unitaire' | 'Combiné' | 'Champ Réduit';
  bases: number[];
  associes: number[];
  flexi: 100 | 50 | 25;
  miseBase: number; // en euros
  coutTotal: number; // en euros
  nombreCombinaisons: number;
}

export interface PmuMeeting {
  id: string;
  date: string; // ex: "Mercredi 24 Septembre 2026"
  dateRelative: 'Aujourd\'hui' | 'Demain' | 'Prochainement' | 'Hier';
  reunion: string; // ex: "R1"
  courseNumero?: string; // ex: "C1", "C3", etc. (1 à 9 au maximum)
  hippodrome: string; // ex: "Paris-Vincennes"
  heure: string; // ex: "13h55"
  discipline: Discipline | string;
  nomCoursePhare: string; // ex: "Prix de la Porte de Versailles"
  distance?: number | string;
  allocation?: number | string;
  estQuinte?: boolean;
  estPick5?: boolean;
  estTrio?: boolean;
  corde?: string;
  description: string;
  lienGeny: string;
  nombrePartants?: number;
  exactPartantsCount?: number;
  partants?: Partant[];
  statut?: 'À venir' | 'En direct' | 'Terminé' | 'À courir';
  arriveeOfficielle?: string;
  hasEnquete?: boolean;
  isProvisional?: boolean;
  sourceUrl?: string;
  sourceSite?: 'pmu.fr' | 'paristurf.com' | 'geny.com' | 'autre';
}

export interface GroundingSource {
  title?: string;
  url?: string;
}

export interface PmuCalendarResponse {
  meetings: PmuMeeting[];
  sourceType: 'google_search_grounding' | 'programme_officiel_pmu' | 'pdf_import_factchecked' | 'pmu.fr' | 'paristurf.com';
  updatedAt: string;
  groundingSources?: GroundingSource[];
  searchQuery?: string;
}

export interface GroundingLiveArrival {
  courseId: string;
  reunion: string;
  course: string;
  date: string;
  prixNom: string;
  hippodrome: string;
  discipline?: string;
  distance?: number;
  statut: 'Arrivée officielle' | 'Arrivée provisoire' | 'En attente' | 'Enquête en cours';
  isOfficial?: boolean;
  isProvisional?: boolean;
  hasEnquete?: boolean;
  arriveeOfficielle: string | null;
  ordreArrivee?: number[];
  sourceSite: 'paristurf.com' | 'pmu.fr' | 'multi';
  sourceUrl: string;
  lastUpdatedIso: string;
  detailsTop5?: Array<{ place: number; numero: number; nom: string; driver?: string; cote?: string }>;
  groundingSources?: GroundingSource[];
}

export interface GroundingArrivalsResponse {
  success: boolean;
  arrivals: GroundingLiveArrival[];
  groundingSources: GroundingSource[];
  sourceTargeted: string;
  sourceLabel: string;
  stats: {
    total: number;
    official: number;
    provisional: number;
    hasEnquete: number;
  };
  extractedAt: string;
  message?: string;
}

export interface ExpertHorseRow {
  numero: number;
  cheval: string;
  score: number;
  forme: string;
  classe: string;
  chrono: string;
  parcours: string;
  engagement: string;
  risque: string;
  cote?: string | number;
  groupe: string;
  aptitudeMonte?: string;
  jockeyDriver?: string;
  valeurHandicap?: string;
  poids?: string;
  corde?: string;
  obstacles?: string;
}

export interface ExpertDisciplineAnalysis {
  disciplineCategory: 'Trot Attelé' | 'Trot Monté' | 'Plat' | 'Obstacles' | 'Obstacle';
  disciplineTitle: string;
  identification: {
    hippodrome: string;
    date: string;
    reunion: string;
    course: string;
    distance: string | number;
    allocation: string | number;
    departType?: string;
    partantsCount: number;
    conditions: string;
    classeCat: string;
    pisteParticularites: string;
  };
  weightings: Record<string, number>;
  groups: {
    basePrincipale: number[];
    secondesBases: number[];
    chancesRegulieres: number[];
    outsiders: number[];
    grosOutsidersOrRisks: number[];
    // Structure officielle du Prompt Professionnel (Quotas stricts 2 + 3 + 4 + 2 = 11 + Délaissés)
    bases?: number[]; // exactement 2
    chances?: number[]; // exactement 3
    tocards?: number[]; // exactement 4
    surprises?: number[]; // exactement 2
    delaisses?: number[]; // tous les autres numéros partants
  };
  synthesisTable: ExpertHorseRow[];
  top5: number[];
  top8: number[];
  chevalASurveiller: number;
  principalRisqueCourse: string;
  probableScenario?: string;
  certifiedAuditNote: string;
}

