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
  poids?: number; // pour le plat ou monté (kg)
  corde?: number; // numéro de stalle à la corde pour le plat
  hippoScore?: number; // Note sur 100 calculée
  indexValeur?: number; // Index de valeur (rapport performance / cote / value bet)
  avisExpert?: string;
  regularitePourcent?: number; // % dans les 3 premiers
  victoiresTotal?: number;
  placesTotal?: number;
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
}

export type GeminiModelId = 
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
  | 'claude-4.6-sonnet';

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
  chances?: number[]; // CHANCES (premières chances de podium)
  outsiders: number[]; // OUTSIDERS (2 ou 3 numéros)
  tocards: number[]; // TOCARDS (1 ou 2 numéros coups de poker)
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
  statutCourse?: 'À venir' | 'Partants définitifs' | 'Arrivée officielle' | 'Arrivée provisoire' | 'En attente de l\'arrivée officielle' | 'Course terminée';
  statutArrivee?: string; // ex: "PROVISOIRE" | "OFFICIELLE"
  isOfficial?: boolean;
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
  partants?: Partant[];
  statut?: 'À venir' | 'En direct' | 'Terminé';
  arriveeOfficielle?: string;
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

