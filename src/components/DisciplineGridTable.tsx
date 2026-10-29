import React, { useState } from 'react';
import { ArrowUpDown, Calculator, TrendingUp, Sparkles, SlidersHorizontal, Flame, User, MapPin, Trophy } from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { computeDisciplineGrid, computeV38Hierarchy, getHorseGenyOdds, getSysteme74TocardsAndSurprises, computeSysteme74TacticalGroups, TacticalGroupItem } from '../utils/v38Helper';
import { computeTabularEnsembleAnalysis, recalibratePredictionsWithTemperature } from '../utils/tabularRankingEngine';
import { calculerPerformance3Musiques, calculerPerformanceDriverJockey, calculerPerformanceTandem, getPartantDriverMusique, classerChevauxFormeEtPoints } from '../utils/turfCalculations';
import { TandemDiagnosticModal } from './TandemDiagnosticModal';
import { getHorseBadgeTheme } from '../utils/horseBadgeTheme';
import { computePartantHippoScore } from '../utils/geminiMultiModelEngine';
import { TableScrollWrapper } from './TableScrollWrapper';
import { DriversRankingTable } from './DriversRankingTable';
import { Systeme74RulesModal } from './Systeme74RulesModal';
import { TableauSyntheseTactique } from './TableauSyntheseTactique';
import { StrategieProprietairesCard } from './StrategieProprietairesCard';
import { useSysteme74 } from '../utils/systeme74Store';
import { Systeme74ThresholdControlBar } from './Systeme74ThresholdControlBar';

interface DisciplineGridTableProps {
  course: CourseHippique;
  variant?: 'dark' | 'light';
  onSelectHorseForTicket?: (numero: number) => void;
  selectedHorseNumbers?: number[];
}

export const DisciplineGridTable: React.FC<DisciplineGridTableProps> = ({
  course,
  variant = 'dark',
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
}) => {
  // Permutation des positions des 2 tableaux (par défaut true : SYNTHÈSE DE JEU en 1er, TABLEAU DE RÉPARTITION en 2e)
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [showSynthesisTable, setShowSynthesisTable] = useState<boolean>(true);
  const [showSysteme74, setShowSysteme74] = useState<boolean>(false);
  const [showStrategieProprietaires, setShowStrategieProprietaires] = useState<boolean>(true);
  const [showSysteme74RulesModal, setShowSysteme74RulesModal] = useState<boolean>(false);
  const [showVariancePanel, setShowVariancePanel] = useState<boolean>(false);
  const [showFerrageTable, setShowFerrageTable] = useState<boolean>(false);
  const [showCordeTable, setShowCordeTable] = useState<boolean>(false);
  const [showPerformanceTable, setShowPerformanceTable] = useState<boolean>(false);
  const [showDriversRanking, setShowDriversRanking] = useState<boolean>(true);
  const {
    threshold: minScoreXThreshold,
    mode: diffXMode,
    isActive: filterMinScoreX,
    setThreshold: setMinScoreXThreshold,
    setMode: setDiffXMode,
  } = useSysteme74();
  const [hoveredDriverNum, setHoveredDriverNum] = useState<number | null>(null);

  // Filtre interactif par cote PMU pour le Tableau Secondaire Système 74
  const [sys74CotePreset, setSys74CotePreset] = useState<'all' | 'favoris' | 'outsiders' | 'tocards' | 'custom'>('all');
  const [sys74MinCote, setSys74MinCote] = useState<number>(0);
  const [sys74MaxCote, setSys74MaxCote] = useState<number>(100);
  const [sys74HideUndefinedCote, setSys74HideUndefinedCote] = useState<boolean>(false);

  const getDriverHoverDetails = (p: Partant) => {
    const driverName = p.driver || (p as any).jockey || 'Driver Non Renseigné';
    const drvMusique = getPartantDriverMusique(p);
    
    // Extraction des 5 dernières musiques
    const rawTokens = drvMusique.split(/\s+/).filter(Boolean);
    const last5Musique = rawTokens.slice(0, 5);

    // Taux de réussite sur l'hippodrome du jour
    const hippoName = course?.hippodrome || 'Hippodrome du Jour';
    const reussiteGlobal = p.driverReussite || 24;
    let hippoRate = Math.min(95, Math.max(12, Math.round(reussiteGlobal * 1.15)));
    const rawHippoRate = (p as any).driverReussiteHippodrome;
    if (typeof rawHippoRate === 'number' && rawHippoRate > 0) {
      hippoRate = rawHippoRate;
    }

    return {
      driverName,
      hippoName,
      hippoRate,
      last5Musique,
      drvMusiqueRaw: drvMusique,
    };
  };

  const hippoActivePartantsList = React.useMemo(() => {
    return (course?.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');
  }, [course?.partants]);

  const horsesWithScoreXBelowThresholdCount = React.useMemo(() => {
    return hippoActivePartantsList.filter((p) => {
      const num = Number(p.numero);
      const cote = getHorseGenyOdds(p);
      const scoreX = (73 + num) - cote;
      return scoreX < minScoreXThreshold;
    }).length;
  }, [hippoActivePartantsList, minScoreXThreshold, course]);

  const horsesMatchingMinScoreXCount = React.useMemo(() => {
    return hippoActivePartantsList.filter((p) => {
      const num = Number(p.numero);
      const cote = getHorseGenyOdds(p);
      const scoreX = (73 + num) - cote;
      return scoreX >= minScoreXThreshold;
    }).length;
  }, [hippoActivePartantsList, minScoreXThreshold, course]);

  const grid = computeDisciplineGrid(course);
  const isDark = variant === 'dark';

  function sortBySysteme74Desc(a: number, b: number) {
    const pA = course.partants?.find((p) => Number(p.numero) === a);
    const pB = course.partants?.find((p) => Number(p.numero) === b);
    const oA = pA ? getHorseGenyOdds(pA) : 999;
    const oB = pB ? getHorseGenyOdds(pB) : 999;
    const scoreXA = (73 + a) - oA;
    const scoreXB = (73 + b) - oB;
    return scoreXB - scoreXA;
  }

  const getTop5Arrival = (arriveeStr?: string) => {
    if (!arriveeStr) return 'En attente / Non parue';
    const parts = String(arriveeStr).split(/[-,\s]+/).filter(Boolean);
    if (parts.length === 0) return arriveeStr;
    return parts.slice(0, 5).join(' - ');
  };



  // --- Données dynamiques de SYNTHÈSE DE JEU ---
  const v38 = computeV38Hierarchy(course);
  const tabularData = computeTabularEnsembleAnalysis(course);
  const calibratedRunners = recalibratePredictionsWithTemperature(
    tabularData.runnersPredictions || [],
    1.0,
    'softmax_temperature',
    0.65,
    0.35
  );

  // --- Données dynamiques de SYNTHÈSE DE JEU (Blending CatBoost 65% + LightGBM 35%) ---
  const activePartantsList = calibratedRunners.filter((r) => !r.estNonPartant);

  // Ensemble de suivi pour éliminer toute répétition de numéro dans l'ensemble des lignes de la Synthèse de Jeu
  const synthesisGlobalUsed = new Set<number>();

  // 1. TOP 2 IA (Bases IA) : Les 2 meilleurs chevaux du blending
  const top2Runners = [...activePartantsList].sort((a, b) => b.pVictoire - a.pVictoire).slice(0, 2);
  const top2Nums = top2Runners.map((p) => Number(p.numero));
  top2Nums.forEach((n) => synthesisGlobalUsed.add(n));

  // 2. OUTSIDER SÉDUISANT (Outsiders séduisants) : 4 chevaux outsiders à fort potentiel, hors TOP 2 IA
  const outsiderCandidates = activePartantsList.filter(
    (r) => !synthesisGlobalUsed.has(Number(r.numero))
  );
  const outsiderRunners = outsiderCandidates.filter((r) => r.category === 'OUTSIDER SÉDUISANT');
  const outsiderSelected = (
    outsiderRunners.length >= 2
      ? outsiderRunners
      : [...outsiderCandidates].sort((a, b) => b.pVictoire - a.pVictoire)
  ).slice(0, 4);
  const outsiderNums = outsiderSelected.map((p) => Number(p.numero));
  outsiderNums.forEach((n) => synthesisGlobalUsed.add(n));

  // 3. CAPABLES D'EXPLOITS (Défenseurs d'exploit) : 4 chevaux défenseurs d'exploit / délaissés, hors numéros déjà pris
  const capablesCandidates = activePartantsList.filter(
    (r) => !synthesisGlobalUsed.has(Number(r.numero))
  );
  const capablesRunners = capablesCandidates
    .filter((r) => r.category === "CAPABLES D'EXPLOITS" || r.category === 'DÉLAISSÉ')
    .sort((a, b) => (Number(a.coteProbable) || 999) - (Number(b.coteProbable) || 999));
  const capablesSelected = (
    capablesRunners.length >= 2
      ? capablesRunners
      : [...capablesCandidates].sort((a, b) => (Number(a.coteProbable) || 999) - (Number(b.coteProbable) || 999))
  ).slice(0, 4);
  const capablesNums = capablesSelected.map((p) => Number(p.numero));
  capablesNums.forEach((n) => synthesisGlobalUsed.add(n));

  // 4. EDGE POSITIF (Values EV+) : 4 chevaux affichant le meilleur Edge EV+, hors numéros déjà pris
  const edgeCandidates = activePartantsList
    .filter((r) => !synthesisGlobalUsed.has(Number(r.numero)))
    .map((r) => {
      const cote = Number(r.coteProbable) || 10;
      const edge = (r.pVictoire / 100) * cote - 1;
      return { r, edge };
    })
    .sort((a, b) => b.edge - a.edge);
  const edgeSelected = edgeCandidates.slice(0, 4).map((item) => item.r);
  const edgeNums = edgeSelected.map((p) => Number(p.numero));
  edgeNums.forEach((n) => synthesisGlobalUsed.add(n));

  // 5. TOCARD SPÉCULATIF (les 4 plus petites cotes) : Les 4 chevaux avec les plus petites cotes parmi les tocards / délaissés / partants restants !
  const remainingTocards = activePartantsList
    .filter((r) => !synthesisGlobalUsed.has(Number(r.numero)))
    .sort((a, b) => {
      const coteA = Number(a.coteProbable) || 999;
      const coteB = Number(b.coteProbable) || 999;
      if (coteA !== coteB) return coteA - coteB;
      return Number(a.numero) - Number(b.numero);
    });
  const tocardSelected = remainingTocards.slice(0, 4);
  const tocardNums = tocardSelected.map((p) => Number(p.numero));
  tocardNums.forEach((n) => synthesisGlobalUsed.add(n));

  // --- Classification Performance Drivers / Jockeys ---
  const activePartants = (course.partants || []).filter(
    (p) => !p.estNonPartant && p.statut !== 'Non-partant'
  );

  // --- Classification Performance Drivers / Jockeys ---

  const sortedByDriverPerf = [...activePartants].sort((a, b) => {
    const perfA = calculerPerformanceDriverJockey(getPartantDriverMusique(a)).totalPoints;
    const perfB = calculerPerformanceDriverJockey(getPartantDriverMusique(b)).totalPoints;
    if (perfA !== perfB) return perfA - perfB;
    const coteA = getHorseGenyOdds(a);
    const coteB = getHorseGenyOdds(b);
    if (coteA !== coteB) return coteA - coteB;
    return Number(a.numero) - Number(b.numero);
  });

  const driverEnFormeNums = sortedByDriverPerf.slice(0, 6).map((p) => Number(p.numero));
  const driverFormeMoyenneNums = sortedByDriverPerf.slice(6, 10).map((p) => Number(p.numero));

  const driverRestPartants = sortedByDriverPerf.slice(10);
  const driverCapableExploitNums: number[] = [];
  const driverMeformeCandidates: typeof activePartants = [];

  driverRestPartants.forEach((p) => {
    const cote = getHorseGenyOdds(p);
    if (cote <= 8.0) {
      driverCapableExploitNums.push(Number(p.numero));
    } else {
      driverMeformeCandidates.push(p);
    }
  });

  driverMeformeCandidates.sort((a, b) => getHorseGenyOdds(a) - getHorseGenyOdds(b));
  const driverMeformeNums = driverMeformeCandidates.slice(0, 4).map((p) => Number(p.numero));

  // --- Système 74 ---
  const systeme74Items = activePartants.map((p) => {
    const num = Number(p.numero);
    const cote = getHorseGenyOdds(p);
    const scoreX = (73 + num) - cote;
    return { num, scoreX };
  }).sort((a, b) => b.scoreX - a.scoreX);

  // Sélection Système 74 pour les colonnes ("PRONOSTICS DE L'ÉPREUVE")
  const favorisSet = new Set(systeme74Items.slice(0, 3).map((item) => item.num));
  const outsidersSet = new Set(systeme74Items.slice(3, 6).map((item) => item.num));
  const tocardsSet = new Set(systeme74Items.slice(6, 10).map((item) => item.num));
  const surprisesSet = new Set(systeme74Items.slice(10).map((item) => item.num));

  const synthesisRows = [
    { label: 'TOP 2 IA', description: 'Bases IA', rawNums: top2Nums },
    { label: 'OUTSIDER SÉDUISANT', description: 'Outsiders séduisants', rawNums: outsiderNums },
    { label: "CAPABLES D'EXPLOITS", description: "Défenseurs d'exploit", rawNums: capablesNums },
    { label: 'EDGE POSITIF', description: 'Values EV+', rawNums: edgeNums },
    { label: 'TOCARD SPÉCULATIF', description: '4 plus petites cotes', rawNums: tocardNums },
  ];



  const driverPerformanceRows = [
    {
      key: 'DRIVER_EN_FORME',
      badgeLabel: '🟢 EN FORME',
      subLabel: '(1e au 6e)',
      description: '6 premiers drivers/jockeys',
      rawNums: driverEnFormeNums,
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      key: 'DRIVER_FORME_MOYENNE',
      badgeLabel: '🟡 MOYENNE',
      subLabel: '(7e au 10e)',
      description: '7e au 10e driver/jockey',
      rawNums: driverFormeMoyenneNums,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      key: 'DRIVER_CAPABLE_EXPLOIT',
      badgeLabel: '⚡ EXPLOIT',
      subLabel: '(>10, <=8.0)',
      description: '11e+ avec cote <= 8.0',
      rawNums: driverCapableExploitNums,
      badgeClass: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50',
    },
    {
      key: 'DRIVER_MEFORME',
      badgeLabel: '🔴 MÉFORME',
      subLabel: '(4 petites cotes)',
      description: '4 plus petites cotes des numéros restants',
      rawNums: driverMeformeNums,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
  ];

  // --- Classification Performance (Addition des 3 dernières performances du cheval) ---
  const horseEliteNums: number[] = [];
  const horseRegulierNums: number[] = [];
  const horseCorrectNums: number[] = [];
  const horseIrregulierNums: number[] = [];

  const sortedByHorsePerf = [...activePartants].sort((a, b) => {
    const ptsA = calculerPerformance3Musiques(a.musique || '').totalPoints;
    const ptsB = calculerPerformance3Musiques(b.musique || '').totalPoints;
    if (ptsA !== ptsB) return ptsA - ptsB; // Moins de points = meilleure performance récente
    const coteA = getHorseGenyOdds(a);
    const coteB = getHorseGenyOdds(b);
    if (coteA !== coteB) return coteA - coteB;
    return Number(a.numero) - Number(b.numero);
  });

  sortedByHorsePerf.forEach((p, idx) => {
    const rank = idx + 1;
    const num = Number(p.numero);
    if (rank <= 3) {
      horseEliteNums.push(num);
    } else if (rank <= 7) {
      horseRegulierNums.push(num);
    } else if (rank <= 10) {
      horseCorrectNums.push(num);
    } else {
      horseIrregulierNums.push(num);
    }
  });

  // --- SURPRISES (4 N° aux plus petites cotes parmi les 11e+ du Système 74) ---
  const surpriseCandidates = v38.systeme74Ranked.slice(10);
  const sortedSurprisesByOdds = [...surpriseCandidates].sort((a, b) => {
    const pA = activePartants.find((item) => Number(item.numero) === Number(a.numero));
    const pB = activePartants.find((item) => Number(item.numero) === Number(b.numero));
    const coteA = pA ? getHorseGenyOdds(pA) : (a.cote || 999);
    const coteB = pB ? getHorseGenyOdds(pB) : (b.cote || 999);
    if (coteA !== coteB) return coteA - coteB;
    return Number(a.numero) - Number(b.numero);
  });
  const surpriseNums = sortedSurprisesByOdds.slice(0, 4).map((item) => Number(item.numero));

  // --- GRADIENTS DYNAMIQUES & DÉGRADÉS PROGRESSIFS BASÉS SUR LE SCORE X ---
  // 🥇 Favoris : Dégradé émeraude intense (#059669), allant d'un vert forêt profond à un émeraude lumineux #34d399
  // 🥈 Outsiders : Dégradé ambre progressif (#f59e0b), passant d'un ambre soutenu à des reflets dorés chauds
  // 🥉 Tocards : Dégradé orange nuancé (#ea580c), combinant teintes cuivrées et orange corail éclatant
  // ⚡ Surprises : Dégradé rouge vif (#dc2626), dont le rayonnement et le contraste s'intensifient selon la cote et le score
  const getDynamicHorseBadgeGradient = (num: number, groupStyle: string = '') => {
    return getHorseBadgeTheme(num, course, groupStyle);
  };

  const renderHorseBadge = (num: number, groupStyle: string = '', title?: string) => {
    const styleInfo = getDynamicHorseBadgeGradient(num, groupStyle);

    return (
      <div
        className={`w-9 sm:w-11 h-10 sm:h-12 rounded-xl font-mono font-black flex flex-col items-center justify-center text-center border-2 shrink-0 transition-all duration-200 hover:scale-110 hover:z-20 cursor-pointer ${styleInfo.textColor} select-none relative overflow-hidden group`}
        style={{ 
          background: styleInfo.background,
          borderColor: styleInfo.borderColor,
          boxShadow: styleInfo.boxShadow,
        }}
        title={title || `N°${num} | Catégorie: ${styleInfo.category.toUpperCase()} | Cote: ${styleInfo.cote.toFixed(1)} | Score X: ${styleInfo.scoreX.toFixed(2)} (${styleInfo.scoreFactor >= 0.7 ? 'X Élevé' : styleInfo.scoreFactor <= 0.3 ? 'X Faible' : 'X Modéré'})`}
      >
        {/* Reflet 3D spéculaire oblique supérieur net */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-lg" />

        <span className="text-sm sm:text-base leading-none font-black z-10 drop-shadow-none select-none">{num}</span>
        <span className={`text-[8px] sm:text-[9px] leading-none mt-1 font-black tracking-tight z-10 drop-shadow-none select-none ${styleInfo.scoreX < minScoreXThreshold ? 'text-red-400 font-extrabold' : 'opacity-95'}`}>
          {styleInfo.scoreX.toFixed(1).replace('.', ',')}
        </span>
      </div>
    );
  };
  const tandemEliteNums = horseEliteNums;
  const tandemRegulierNums = horseRegulierNums;
  const tandemCorrectNums = horseCorrectNums;
  const tandemIrregulierNums = horseIrregulierNums;

  const tandemPerformanceRows = [
    {
      key: 'TANDEM_ELITE_TOP',
      badgeLabel: '⭐ ÉLITE / TOP',
      subLabel: '(1e - 3e N°)',
      description: '1e au 3e N°',
      rawNums: tandemEliteNums,
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    },
    {
      key: 'TANDEM_REGULIER',
      badgeLabel: '🟢 RÉGULIER',
      subLabel: '(4e - 7e N°)',
      description: '4e au 7e N°',
      rawNums: tandemRegulierNums,
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      key: 'TANDEM_CORRECT',
      badgeLabel: '🟡 CORRECT',
      subLabel: '(8e - 10e N°)',
      description: '8e au 10e N°',
      rawNums: tandemCorrectNums,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      key: 'TANDEM_IRREGULIER',
      badgeLabel: '🔴 IRRÉGULIER',
      subLabel: '(11e et +)',
      description: '11e et plus',
      rawNums: tandemIrregulierNums,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
  ];

  // --- Score Tandem (Cheval + Driver/Jockey) & Tri Dynamique ---
  const tandemScoreMap = new Map<number, { horseScore: number; driverScore: number; tandemScore: number }>();
  (course.partants || []).forEach((p) => {
    const num = Number(p.numero);
    const horseScore = calculerPerformance3Musiques(p.musique || '').totalPoints;
    const driverScore = calculerPerformanceDriverJockey(getPartantDriverMusique(p)).totalPoints;
    const tandemScore = horseScore + driverScore;
    tandemScoreMap.set(num, { horseScore, driverScore, tandemScore });
  });

  const getRowTandemMetric = (nums: number[]) => {
    if (!nums || nums.length === 0) return 999;
    const validScores = nums.map((n) => tandemScoreMap.get(n)?.tandemScore).filter((s): s is number => s !== undefined);
    if (validScores.length === 0) return 999;
    const sum = validScores.reduce((acc, s) => acc + s, 0);
    return Number((sum / validScores.length).toFixed(1));
  };

  const sortedSynthesisRows = [...synthesisRows].sort((a, b) => getRowTandemMetric(a.rawNums) - getRowTandemMetric(b.rawNums));

  // --- Fonction utilitaire de tri par score X descendant ---
  const scoreXMap = new Map<number, number>();
  (course.partants || []).forEach((p) => {
    const item = v38.systeme74Ranked.find((i) => Number(i.numero) === Number(p.numero));
    scoreXMap.set(Number(p.numero), item ? item.scoreX : -999);
  });

  const sortByScoreXDesc = (a: number, b: number) => {
    const scoreXA = scoreXMap.get(a) ?? -999;
    const scoreXB = scoreXMap.get(b) ?? -999;
    if (scoreXA !== scoreXB) return scoreXB - scoreXA;
    return a - b;
  };

  // ==========================================
  // TABLEAU 1 (OU 2) : SYNTHÈSE DE JEU
  // Dimensions exactes :
  // - Colonne « Catégorie » : 3.00 cm
  // - Colonnes « Favoris », « Outsiders », « Tocards », « Surprises » : 3.00 cm chacune
  // - Largeur Totale : 15.00 cm (5 × 3.00 cm)
  // - Écriture et contenus parfaitement centrés
  // ==========================================
  const renderSyntheseDeJeuTable = () => {
    const renderedTableNums = new Set<number>();

    const matchesScoreXFilter = (num: number) => {
      if (diffXMode === 'OFF' || diffXMode === 'GREY') return true;
      const p = course.partants?.find(item => Number(item.numero) === num);
      if (!p) return true;
      const cote = getHorseGenyOdds(p);
      const scoreX = (73 + Number(p.numero)) - cote;
      return scoreX >= minScoreXThreshold;
    };

    return (
      <div key="table-synthese-de-jeu" className="space-y-3 w-full flex flex-col items-center">
        <div className="w-full flex flex-col items-center justify-center gap-3 px-1 text-center">
          
          {/* BANDEAU INTERACTIF DYNAMIQUE DU SEUIL DIFF(X) SYSTÈME 74 (La 2e manière, unifiée) */}
          <div className="w-full max-w-4xl mx-auto my-2">
            <Systeme74ThresholdControlBar partants={hippoActivePartantsList} />
          </div>

          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                <span>SYNTHÈSE DE JEU</span>
              </h3>
              
              {/* Badge interactif Système 74 avec info-bulle au survol */}
              <div 
                className="relative group cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm"
                title="Règle du Système 74 : Tocards = chevaux classés 7e et + avec score X ≥ 25 (max 4 plus grands scores X). Les autres classés 7e et + sont des Surprises."
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Règle Système 74</span>
                <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono flex items-center justify-center font-black">?</span>

                {/* Info-bulle interactive au survol (Tooltip card) */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-80 p-4 rounded-2xl bg-slate-900 border-2 border-amber-500/60 shadow-2xl text-left pointer-events-none animate-fadeIn">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-amber-400 font-black text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Règle de classification Système 74</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    Score de différence <strong className="text-cyan-300 font-mono">X = (73 + N°) - Cote</strong>. Les partants sont classés par score X décroissant :
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px]">
                    <li className="flex items-start gap-1.5 text-orange-300">
                      <span className="font-bold shrink-0">🥉 TOCARDS :</span>
                      <span>Chevaux classés <strong>7e et plus</strong> ayant un score <strong>X ≥ 25</strong> (sélection des <strong>4 plus grands scores X</strong> si plusieurs).</span>
                    </li>
                    <li className="flex items-start gap-1.5 text-rose-300">
                      <span className="font-bold shrink-0">⚡ SURPRISES :</span>
                      <span>Tous les autres chevaux classés <strong>7e et plus</strong> (score X &lt; 25).</span>
                    </li>
                  </ul>
                  <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 italic">
                    💡 Survolez pour consulter la règle à tout moment.
                  </div>
                </div>
              </div>

              {/* Toggle bouton */}
              <button 
                onClick={() => setShowSysteme74(!showSysteme74)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors ${showSysteme74 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700/50 text-slate-400'}`}
              >
                {showSysteme74 ? 'Masquer Positionnement Tactique' : 'Afficher Positionnement Tactique'}
              </button>
            </div>

            {showSysteme74 && (
              <div className="w-full mt-4 p-4 rounded-xl bg-slate-900 border border-slate-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-800">
                  <h4 className="text-white font-black uppercase text-sm sm:text-base tracking-wide flex items-center gap-2">
                    <span>⚡</span> Positionnement Tactique (Système 74)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowSysteme74RulesModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                    title="Consulter le résumé détaillé des règles du Système 74 (Groupes A, B, C, Cotes, Score X)"
                  >
                    <span className="text-sm">ℹ️</span>
                    <span>Règles Système 74</span>
                  </button>
                </div>
                
                {(() => {
                  const { groupA, groupB, groupC } = computeSysteme74TacticalGroups(
                    course.partants || [],
                    { filterMinScoreX, minScoreXThreshold }
                  );

                  const allPartantsWithX = (course.partants || [])
                    .filter((p) => !p.estNonPartant && p.statut !== 'Non-partant')
                    .map((p) => {
                      const num = Number(p.numero);
                      const cote = getHorseGenyOdds(p);
                      const scoreX = Math.round(((73 + num) - cote) * 10) / 10;
                      return { num, scoreX };
                    });

                  const renderCell = (item: any | undefined) => {
                    if (!item) return <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-950/60 border border-slate-800/50 rounded-lg flex items-center justify-center text-slate-700 font-bold text-xs">—</div>;
                    
                    const cat = item.classified?.categorie;
                    let perfColor = 'bg-slate-700';
                    let perfEmoji = '';
                    
                    if (cat === 'EN_FORME') { perfColor = 'bg-emerald-600'; perfEmoji = ''; }
                    else if (cat === 'FORME_MOYENNE') { perfColor = 'bg-amber-500'; perfEmoji = '🟡'; }
                    else if (cat === 'CAPABLE_EXPLOIT') { perfColor = 'bg-blue-600'; perfEmoji = '⚡'; }
                    else if (cat === 'MEFORME') { perfColor = 'bg-rose-600'; perfEmoji = '🔴'; }

                    // System 74 category colors for the border/position indicator
                    // Rank 1-3: Favoris, 4-6: Outsiders, 7-10: Tocards, 11+: Surprises
                    const globalRankX = [...allPartantsWithX].sort((a, b) => b.scoreX - a.scoreX).findIndex(h => h.num === item.num) + 1;
                    let s74Color = 'border-slate-500';
                    if (globalRankX <= 3) s74Color = 'border-emerald-400';
                    else if (globalRankX <= 6) s74Color = 'border-amber-400';
                    else if (globalRankX <= 10) s74Color = 'border-orange-500';
                    else s74Color = 'border-rose-500';

                    return (
                      <div 
                        className={`w-10 h-10 sm:w-11 sm:h-11 flex flex-col items-center justify-center rounded-lg border-2 ${s74Color} ${perfColor} relative overflow-hidden transition-transform hover:scale-110 cursor-help shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)]`}
                        title={`N°${item.num} | Score X: ${item.scoreX} | Performance: ${item.classified?.categorieLabel || 'N/A'}`}
                      >
                        {/* 3D Highlight */}
                        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        
                        <div className="flex items-center justify-center gap-0.5 z-10">
                          <span className="text-[14px] sm:text-[15px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{item.num}</span>
                          {perfEmoji && <span className="text-[8px] sm:text-[9px] drop-shadow-sm">{perfEmoji}</span>}
                        </div>
                        <span className={`text-[8px] sm:text-[9px] font-mono font-black z-10 drop-shadow-sm ${item.scoreX < minScoreXThreshold ? 'text-red-400 font-extrabold' : 'text-white/90'}`}>
                          {item.scoreX.toFixed(1).replace('.', ',')}
                        </span>
                      </div>
                    );
                  };

                  return (
                    <div className="flex flex-col gap-6 w-full">
                      <div className="flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-8">
                        {/* Groupe A : 3 colonnes x 2 rangées */}
                        <div className="flex flex-col items-center p-3 border-2 border-white rounded-2xl bg-slate-950/40 shadow-xl w-fit">
                          <span className="text-emerald-400 font-black mb-3 uppercase text-[11px] tracking-widest px-2 py-0.5 bg-slate-900/80 rounded-full border border-emerald-500/30">GROUPE A (1-6)</span>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {[...Array(6)].map((_, i) => <div key={`tact-a-${i}`}>{renderCell(groupA[i])}</div>)}
                          </div>
                        </div>

                        {/* Groupe B : 3 colonnes x 2 rangées */}
                        <div className="flex flex-col items-center p-3 border-2 border-white rounded-2xl bg-slate-950/40 shadow-xl w-fit">
                          <span className="text-amber-400 font-black mb-3 uppercase text-[11px] tracking-widest px-2 py-0.5 bg-slate-900/80 rounded-full border border-amber-500/30">GROUPE B (7-10)</span>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {[...Array(6)].map((_, i) => <div key={`tact-b-${i}`}>{renderCell(groupB[i])}</div>)}
                          </div>
                        </div>

                        {/* Groupe C : 3 colonnes x 2 rangées */}
                        <div className="flex flex-col items-center p-3 border-2 border-white rounded-2xl bg-slate-950/40 shadow-xl w-fit">
                          <span className="text-rose-400 font-black mb-3 uppercase text-[11px] tracking-widest px-2 py-0.5 bg-slate-900/80 rounded-full border border-rose-500/30">GROUPE C (11+)</span>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {groupC && groupC.length > 0 ? (
                              [...Array(6)].map((_, i) => <div key={`tact-c-${i}`}>{renderCell(groupC[i])}</div>)
                            ) : (
                              [...Array(6)].map((_, i) => <div key={`tact-c-empty-${i}`}>{renderCell(undefined)}</div>)
                            )}
                          </div>
                        </div>
                      </div>

                      {/* TABLEAU DE SYNTHÈSE TACTIQUE */}
                      <TableauSyntheseTactique 
                        course={course}
                        filterMinScoreX={filterMinScoreX}
                        minScoreXThreshold={minScoreXThreshold}
                      />
                    </div>
                  );
              })()}
            </div>
          )}

            <p className="text-xs text-slate-400 max-w-2xl text-center">
              Croisement dynamique : <span className="text-amber-400 font-bold">Lignes</span> (SYSTÈME 74 : FAVORIS 3 N°, OUTSIDERS 3 N°, TOCARDS 4 N°, SURPRISES 4 N° aux + petites cotes) × <span className="text-cyan-400 font-bold">Colonnes</span> (Addition des 3 dernières performances du cheval : Élite 1er-3e, Régulier 4e-7e, Correct 8e-10e, Irrégulier 11e+).
            </p>
          </div>

          <div className="w-full flex flex-col items-center justify-center gap-2.5 py-2 px-1">
            {/* Ligne 1 : Synthèse, Système 74, Variance Modèles, Ferrures (4 onglets centrés) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowSynthesisTable((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showSynthesisTable
                    ? 'bg-purple-600 text-white border-purple-400 font-black shadow-purple-600/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-purple-300 border-purple-500/40'
                }`}
                title="Afficher ou masquer le tableau de synthèse de jeu"
              >
                <span>{showSynthesisTable ? 'Masquer Synthèse' : '📊 Afficher Synthèse'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSysteme74((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showSysteme74
                    ? 'bg-amber-600 text-white border-amber-400 font-black shadow-amber-600/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                }`}
                title="Afficher ou masquer le tableau Système 74 sur l'interface"
              >
                <span>{showSysteme74 ? 'Masquer Système 74' : '⚡ Afficher Système 74'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSysteme74RulesModal(true)}
                className="px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-500/50 hover:text-white"
                title="Consulter les règles détaillées du Système 74 (Groupes A, B, C, Cotes, Score X)"
              >
                <span className="text-sm">ℹ️</span>
                <span>Règles Système 74</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVariancePanel((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showVariancePanel
                    ? 'bg-cyan-600 text-white border-cyan-400 font-black shadow-cyan-600/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border-cyan-500/40'
                }`}
                title="Afficher ou masquer le tableau de variance inter-modèles"
              >
                <span>{showVariancePanel ? 'Masquer Variance' : '📈 Afficher Variance Modèles'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFerrageTable((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showFerrageTable
                    ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow-emerald-600/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border-emerald-500/40'
                }`}
                title="Afficher ou masquer le tableau de ferrage / déferrage"
              >
                <span>{showFerrageTable ? 'Masquer Ferrures' : '👟 Afficher Ferrures'}</span>
              </button>
            </div>

            {/* Ligne 2 : Corde, Performance Cheval, Palmarès Drivers / Jockeys, Stratégie Propriétaires */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowStrategieProprietaires((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showStrategieProprietaires
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-300 font-black shadow-amber-500/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                }`}
                title="Afficher ou masquer la section Stratégie des Propriétaires"
              >
                <span>{showStrategieProprietaires ? 'Masquer Stratégie Propriétaires' : '🎯 Stratégie Propriétaires'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCordeTable((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showCordeTable
                    ? 'bg-blue-600 text-white border-blue-400 font-black shadow-blue-600/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-blue-300 border-blue-500/40'
                }`}
                title="Afficher ou masquer le tableau des positions à la corde"
              >
                <span>{showCordeTable ? 'Masquer Corde' : '🎯 Afficher Corde'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPerformanceTable((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showPerformanceTable
                    ? 'bg-rose-600 text-white border-rose-400 font-black shadow-rose-600/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-rose-300 border-rose-500/40'
                }`}
                title="Afficher ou masquer le tableau de performance du cheval"
              >
                <span>{showPerformanceTable ? 'Masquer Performance' : '⭐ Performance Cheval'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDriversRanking((prev) => !prev)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border ${
                  showDriversRanking
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-amber-500/30'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                }`}
                title="Afficher ou masquer le tableau de classement et palmarès des drivers / jockeys"
              >
                <span>{showDriversRanking ? 'Masquer Drivers/Jockeys' : '🏆 Palmarès Drivers / Jockeys'}</span>
              </button>
            </div>
          </div>
        </div>

        {showSynthesisTable ? (
          <div className="w-full flex flex-col items-center justify-center gap-6">
          {/* Tableau de Synthèse de Jeu */}
          <TableScrollWrapper
            title="Déplacement de la grille de synthèse"
            description="Déplacez vers la droite ou la gauche pour visualiser l'ensemble des colonnes de forme"
            className="w-full max-w-full lg:max-w-4xl mx-auto"
          >
            <div className="w-full flex justify-center py-1">
              <table className="w-full max-w-full border-collapse border-2 border-white mx-auto text-xs sm:text-sm table-fixed">
                <colgroup>
                  <col className="w-1/5 min-w-[110px] sm:min-w-[140px]" />
                  <col className="w-1/5 min-w-[110px] sm:min-w-[140px]" />
                  <col className="w-1/5 min-w-[110px] sm:min-w-[140px]" />
                  <col className="w-1/5 min-w-[110px] sm:min-w-[140px]" />
                  <col className="w-1/5 min-w-[110px] sm:min-w-[140px]" />
                </colgroup>
                <thead>
                  <tr className="text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-white">
                <th className="w-1/5 min-w-[80px] py-3 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white align-middle">
                      <div className="w-full text-center flex items-center justify-center font-black">
                        CATEGORIE
                      </div>
                    </th>
                    <th className="w-1/5 min-w-[80px] py-3 px-2 bg-[#a855f7] text-white font-black text-center border-2 border-white align-middle">
                      <div className="w-full text-center flex items-center justify-center font-black">
                        ⭐ ÉLITE / TOP
                      </div>
                    </th>
                    <th className="w-1/5 min-w-[80px] py-3 px-2 bg-[#059669] text-white font-black text-center border-2 border-white align-middle">
                      <div className="w-full text-center flex items-center justify-center font-black">
                        🟢 RÉGULIER
                      </div>
                    </th>
                    <th className="w-1/5 min-w-[80px] py-3 px-2 bg-[#f59e0b] text-slate-950 font-black text-center border-2 border-white align-middle">
                      <div className="w-full text-center flex items-center justify-center font-black">
                        🟡 CORRECT
                      </div>
                    </th>
                    <th className="w-1/5 min-w-[80px] py-3 px-2 bg-[#dc2626] text-white font-black text-center border-2 border-white align-middle">
                      <div className="w-full text-center flex items-center justify-center font-black">
                        🔴 IRRÉGULIER
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#0f172a] text-white font-black">
                  {/* Lignes : Système 74 (FAVORIS 1er-3e, OUTSIDERS 4e-6e, TOCARDS 7e-10e, SURPRISES 4 N° petites cotes) × Colonnes : Addition 3 dernières performances */}
                  {[
                    { key: 'FAVORIS', label: '🥇 FAVORIS', subLabel: '(3 N° : 1e - 3e)', badgeBg: '--group-rgb: var(--group-favoris);', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', nums: v38.favoris.map((item) => Number(item.numero)) },
                    { key: 'OUTSIDERS', label: '🥈 OUTSIDERS', subLabel: '(3 N° : 4e - 6e)', badgeBg: '--group-rgb: var(--group-outsiders);', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40', nums: v38.outsiders.map((item) => Number(item.numero)) },
                    { key: 'TOCARDS', label: '🥉 TOCARDS', subLabel: '(4 N° : 7e - 10e)', badgeBg: '--group-rgb: var(--group-tocards);', badgeClass: 'bg-orange-600/20 text-orange-300 border-orange-500/40', nums: getSysteme74TocardsAndSurprises(course).tocards74.map((item) => Number(item.num)) },
                    { key: 'SURPRISES', label: '⚡ SURPRISES', subLabel: '(4 N° : petites cotes)', badgeBg: '--group-rgb: var(--group-surprises);', badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40', nums: getSysteme74TocardsAndSurprises(course).surprises74.map((item) => Number(item.num)) },
                  ].map((row) => {
                    const uniqueNums = Array.from(new Set(row.nums));
                    const colElite: number[] = [];
                    const colRegulier: number[] = [];
                    const colCorrect: number[] = [];
                    const colIrregulier: number[] = [];

                    const horseEliteSet = new Set(horseEliteNums);
                    const horseRegulierSet = new Set(horseRegulierNums);
                    const horseCorrectSet = new Set(horseCorrectNums);
                    const horseIrregulierSet = new Set(horseIrregulierNums);

                    uniqueNums.forEach((n) => {
                      if (!matchesScoreXFilter(n)) return;
                      if (horseEliteSet.has(n)) {
                        colElite.push(n);
                      } else if (horseRegulierSet.has(n)) {
                        colRegulier.push(n);
                      } else if (horseCorrectSet.has(n)) {
                        colCorrect.push(n);
                      } else if (horseIrregulierSet.has(n)) {
                        colIrregulier.push(n);
                      } else {
                        colCorrect.push(n);
                      }
                    });

                    const isCoteRow = row.key === 'FAVORIS' || row.key === 'OUTSIDERS';

                    const sortByCoteAsc = (a: number, b: number) => {
                      const pA = activePartants.find((item) => Number(item.numero) === a);
                      const pB = activePartants.find((item) => Number(item.numero) === b);
                      const coteA = pA ? getHorseGenyOdds(pA) : 999;
                      const coteB = pB ? getHorseGenyOdds(pB) : 999;
                      if (coteA !== coteB) return coteA - coteB;
                      return a - b;
                    };

                    const sortByPerfAsc = (a: number, b: number) => {
                      const pA = activePartants.find((item) => Number(item.numero) === a);
                      const pB = activePartants.find((item) => Number(item.numero) === b);
                      const perfA = pA ? calculerPerformance3Musiques(pA.musique || '').totalPoints : 999;
                      const perfB = pB ? calculerPerformance3Musiques(pB.musique || '').totalPoints : 999;
                      if (perfA !== perfB) return perfA - perfB;
                      const coteA = pA ? getHorseGenyOdds(pA) : 999;
                      const coteB = pB ? getHorseGenyOdds(pB) : 999;
                      if (coteA !== coteB) return coteA - coteB;
                      return a - b;
                    };

                    const sortFn = sortByCoteAsc;

                    colElite.sort(sortFn);
                    colRegulier.sort(sortFn);
                    colCorrect.sort(sortFn);
                    colIrregulier.sort(sortFn);

                    return (
                      <tr key={`synth-v38-row-${row.key}`} className="hover:bg-slate-900/60 transition-colors border-2 border-white">
                        {/* Colonne 1 : Catégorie V38 - Centré */}
                        <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle bg-slate-900/80">
                          <div className="w-full flex flex-col items-center justify-center gap-1 text-center">
                            <span className="text-xs sm:text-sm font-black tracking-tight text-amber-400 uppercase leading-tight text-center">
                              {row.label}
                            </span>
                            <span className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-tight text-center">
                              {row.subLabel}
                            </span>
                          </div>
                        </td>

                        {/* Colonne 2 : ⭐ Élite / Top (1er - 3e) */}
                        <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                          {colElite.length > 0 ? (
                            <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                              {colElite.map((num, idx) => (
                                <React.Fragment key={`synth-elite-${row.key}-${num}-${idx}`}>
                                  {renderHorseBadge(num, row.badgeBg)}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <span className="block text-center text-slate-500 font-bold text-base">—</span>
                          )}
                        </td>

                        {/* Colonne 3 : 🟢 Régulier (4e - 7e) */}
                        <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                          {colRegulier.length > 0 ? (
                            <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                              {colRegulier.map((num, idx) => (
                                <React.Fragment key={`synth-reg-${row.key}-${num}-${idx}`}>
                                  {renderHorseBadge(num, row.badgeBg)}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <span className="block text-center text-slate-500 font-bold text-base">—</span>
                          )}
                        </td>

                        {/* Colonne 4 : 🟡 Correct (8e - 10e) */}
                        <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                          {colCorrect.length > 0 ? (
                            <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                              {colCorrect.map((num, idx) => {
                                const p = activePartants.find((item) => Number(item.numero) === num);
                                const cote = p ? getHorseGenyOdds(p) : 999;
                                const isSpecialBlue = cote <= 8.0;
                                return (
                                  <React.Fragment key={`synth-corr-${row.key}-${num}-${idx}`}>
                                    {renderHorseBadge(
                                      num,
                                      isSpecialBlue
                                        ? '--group-rgb: 56, 189, 248;'
                                        : `${row.badgeBg}`,
                                      isSpecialBlue ? `Cote <= 8/1 (${cote})` : undefined
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="block text-center text-slate-500 font-bold text-base">—</span>
                          )}
                        </td>

                        {/* Colonne 5 : 🔴 Irrégulier (11e et +) */}
                        <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                          {colIrregulier.length > 0 ? (
                            <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                              {colIrregulier.map((num, idx) => {
                                const p = activePartants.find((item) => Number(item.numero) === num);
                                const cote = p ? getHorseGenyOdds(p) : 999;
                                const isSpecialBlue = cote <= 8.0;
                                return (
                                  <React.Fragment key={`synth-irreg-${row.key}-${num}-${idx}`}>
                                    {renderHorseBadge(
                                      num,
                                      isSpecialBlue
                                        ? '--group-rgb: 56, 189, 248;'
                                        : `${row.badgeBg}`,
                                      isSpecialBlue ? `Cote <= 8/1 (${cote})` : undefined
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="block text-center text-slate-500 font-bold text-base">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}



                {/* Bande de séparation : TABLEAU DE CROISEMENT DYNAMIQUE (HIÉRARCHIE x FORME DU CHEVAL) */}
                <tr key="forme-separator-band" className="border-2 border-white">
                  <td
                    colSpan={5}
                    className="py-2.5 px-3 bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg border-2 border-white align-middle"
                  >
                    <div className="flex items-center justify-between gap-3 h-full text-center w-full px-2">
                      <div className="flex items-center gap-2 mx-auto">
                        <span className="h-0.5 w-6 sm:w-12 bg-white/40 rounded-full inline-block"></span>
                        <span className="drop-shadow-sm font-black uppercase tracking-wider text-center">
                          📊 CROISEMENT DYNAMIQUE : HIÉRARCHIE DYNAMIQUE × FORME DU CHEVAL
                        </span>
                        <span className="h-0.5 w-6 sm:w-12 bg-white/40 rounded-full inline-block"></span>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* En-tête des colonnes : FORME DU CHEVAL */}
                <tr key="forme-header-row" className="text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-white">
                  <th className="w-1/5 min-w-[140px] sm:min-w-[180px] py-3.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center font-black">HIÉRARCHIE</div>
                  </th>
                  <th className="w-1/5 min-w-[140px] sm:min-w-[180px] py-3.5 px-2 bg-[#059669] text-white font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center font-black">🟢 EN FORME</div>
                  </th>
                  <th className="w-1/5 min-w-[140px] sm:min-w-[180px] py-3.5 px-2 bg-[#f59e0b] text-slate-950 font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center font-black">🟡 MOYENNE</div>
                  </th>
                  <th className="w-1/5 min-w-[140px] sm:min-w-[180px] py-3.5 px-2 bg-[#0284c7] text-white font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center font-black">⚡ EXPLOIT</div>
                  </th>
                  <th className="w-1/5 min-w-[140px] sm:min-w-[180px] py-3.5 px-2 bg-[#dc2626] text-white font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center font-black">🔴 MÉFORME</div>
                  </th>
                </tr>

                {/* 4 Lignes du Tableau (FAVORIS, OUTSIDERS, TOCARDS, SURPRISES) × Colonnes (Forme du Cheval) */}
                {[
                  { key: 'FAVORIS', label: '🥇 FAVORIS', subLabel: '(3 N° : 1e - 3e)', badgeBg: '--group-rgb: var(--group-favoris);', nums: v38.favoris.map((item) => Number(item.numero)) },
                  { key: 'OUTSIDERS', label: '🥈 OUTSIDERS', subLabel: '(3 N° : 4e - 6e)', badgeBg: '--group-rgb: var(--group-outsiders);', nums: v38.outsiders.map((item) => Number(item.numero)) },
                  { 
                    key: 'TOCARDS', 
                    label: <span>🥉 TOCARDS</span>, 
                    subLabel: '(4 N° : 7e - 10e)', 
                    badgeBg: '--group-rgb: var(--group-tocards);', 
                    nums: getSysteme74TocardsAndSurprises(course).tocards74
                      .map((item) => Number(item.num))
                  },
                  { 
                    key: 'SURPRISES', 
                    label: <span>⚡ SURPRISES</span>, 
                    subLabel: '(4 N° : petites cotes)', 
                    badgeBg: '--group-rgb: var(--group-surprises);', 
                    nums: getSysteme74TocardsAndSurprises(course).surprises74
                      .map((item) => Number(item.num))
                  },
                ].map((row) => {
                  const uniqueNums = Array.from(new Set(row.nums));
                  const colEnForme: number[] = [];
                  const colMoyenne: number[] = [];
                  const colExploit: number[] = [];
                  const colMeforme: number[] = [];

                  // Classification selon la forme du cheval (calculerPerformance3Musiques)
                  const sortedByPerf = [...activePartants].sort((a, b) => {
                    const perfA = calculerPerformance3Musiques(a.musique).totalPoints;
                    const perfB = calculerPerformance3Musiques(b.musique).totalPoints;
                    if (perfA !== perfB) return perfA - perfB;
                    return getHorseGenyOdds(a) - getHorseGenyOdds(b);
                  });

                  const enFormeSet = new Set(sortedByPerf.slice(0, 6).map((p) => Number(p.numero)));
                  const moyenneSet = new Set(sortedByPerf.slice(6, 10).map((p) => Number(p.numero)));
                  
                  const restPartants = sortedByPerf.slice(10);
                  const exploitSet = new Set<number>();
                  const meformeSet = new Set<number>();

                  restPartants.forEach((p) => {
                    const n = Number(p.numero);
                    const cote = getHorseGenyOdds(p);
                    if (cote <= 8.0) {
                      exploitSet.add(n);
                    } else {
                      meformeSet.add(n);
                    }
                  });

                  uniqueNums.forEach((n) => {
                    if (!matchesScoreXFilter(n)) return;
                    if (enFormeSet.has(n)) {
                      colEnForme.push(n);
                    } else if (moyenneSet.has(n)) {
                      colMoyenne.push(n);
                    } else if (exploitSet.has(n)) {
                      colExploit.push(n);
                    } else {
                      colMeforme.push(n);
                    }
                  });

                  const sortByCoteAsc = (a: number, b: number) => {
                    const pA = activePartants.find((item) => Number(item.numero) === a);
                    const pB = activePartants.find((item) => Number(item.numero) === b);
                    const coteA = pA ? getHorseGenyOdds(pA) : 999;
                    const coteB = pB ? getHorseGenyOdds(pB) : 999;
                    if (coteA !== coteB) return coteA - coteB;
                    return a - b;
                  };

                  colEnForme.sort(sortByCoteAsc);
                  colMoyenne.sort(sortByCoteAsc);
                  colExploit.sort(sortByCoteAsc);
                  colMeforme.sort(sortByCoteAsc);

                  return (
                    <tr key={`synth-forme-row-${row.key}`} className="hover:bg-slate-900/60 transition-colors border-2 border-white">
                      {/* Colonne 1 : Hiérarchie Dynamique */}
                      <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle bg-slate-900/80">
                        <div className="w-full flex flex-col items-center justify-center gap-1 text-center">
                          <span className="text-xs sm:text-sm font-black tracking-tight text-amber-400 uppercase leading-tight text-center">
                            {row.label}
                          </span>
                          <span className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-tight text-center">
                            {row.subLabel}
                          </span>
                        </div>
                      </td>

                      {/* Colonne 2 : 🟢 EN FORME */}
                      <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                        {colEnForme.length > 0 ? (
                          <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                            {colEnForme.map((num, idx) => (
                              <React.Fragment key={`forme-enforme-${row.key}-${num}-${idx}`}>
                                {renderHorseBadge(num, row.badgeBg)}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-base">—</span>
                        )}
                      </td>

                      {/* Colonne 3 : 🟡 MOYENNE */}
                      <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                        {colMoyenne.length > 0 ? (
                          <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                            {colMoyenne.map((num, idx) => (
                              <React.Fragment key={`forme-moy-${row.key}-${num}-${idx}`}>
                                {renderHorseBadge(num, row.badgeBg)}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-base">—</span>
                        )}
                      </td>

                      {/* Colonne 4 : ⚡ EXPLOIT */}
                      <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                        {colExploit.length > 0 ? (
                          <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                            {colExploit.map((num, idx) => (
                              <React.Fragment key={`forme-exploit-${row.key}-${num}-${idx}`}>
                                {renderHorseBadge(num, row.badgeBg)}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-base">—</span>
                        )}
                      </td>

                      {/* Colonne 5 : 🔴 MÉFORME */}
                      <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                        {colMeforme.length > 0 ? (
                          <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                            {colMeforme.map((num, idx) => (
                              <React.Fragment key={`forme-meforme-${row.key}-${num}-${idx}`}>
                                {renderHorseBadge(num, row.badgeBg)}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-base">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TableScrollWrapper>

        {/* Bloc Arrivée de la course et Côtes des partants (Placé en-dessous, centré, largeur max 17.5cm) */}
        <div 
          className="rounded-xl border-2 border-amber-500/40 bg-slate-900/95 p-4 shadow-2xl shrink-0 w-full max-w-full lg:max-w-4xl mx-auto space-y-3 text-slate-200"
          style={{ fontSize: '12px' }}
        >
          <div className="relative flex items-center justify-center border-b border-slate-800 pb-2">
            <span className="font-black text-amber-400 uppercase tracking-wider text-xs sm:text-sm text-center">
              🏆 ARRIVÉE _ CÔTES & VALEURS DES PARTANTS
            </span>
            <span className="absolute right-0 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs">
              {course.arriveeOfficielle ? 'Officielle' : 'En direct'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-slate-300 text-xs">Arrivée de la course :</div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono font-black text-emerald-300 text-center tracking-wider text-sm shadow-inner">
              {getTop5Arrival(course.arriveeOfficielle || (course as any).arrivee)}
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="font-bold text-slate-300 flex items-center justify-between text-xs">
              <span>Classement dynamique (Score X décroissant) :</span>
              <span className="text-slate-400 text-[11px]">PMU / Live</span>
            </div>
            <div className="space-y-1">
              {/* En-têtes de colonnes alignées exactement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 text-[11px] font-black text-slate-400 uppercase px-2 mb-1">
                <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
                  <span>Cheval</span>
                  <div className="w-px h-4 opacity-0 shrink-0 mx-2"></div>
                  <div className="flex items-center shrink-0">
                    <span className="text-cyan-400 text-center w-[50px]">Valeur</span>
                    <div className="w-px h-4 opacity-0 shrink-0 mx-[0.5cm]"></div>
                    <span className="text-amber-400 min-w-[45px] text-right">Cote</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
                  <span>Cheval</span>
                  <div className="w-px h-4 opacity-0 shrink-0 mx-2"></div>
                  <div className="flex items-center shrink-0">
                    <span className="text-cyan-400 text-center w-[50px]">Valeur</span>
                    <div className="w-px h-4 opacity-0 shrink-0 mx-[0.5cm]"></div>
                    <span className="text-amber-400 min-w-[45px] text-right">Cote</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
              {course.partants && course.partants.filter(p => !p.estNonPartant && p.statut !== 'Non-partant').length > 0 ? (
                [...course.partants]
                  .filter(p => !p.estNonPartant && p.statut !== 'Non-partant')
                  .map(p => {
                    const num = Number(p.numero);
                    const cote = getHorseGenyOdds(p);
                    const scoreX = (73 + num) - cote;
                    return { p, num, cote, scoreX };
                  })
                  .sort((a, b) => b.scoreX - a.scoreX)
                  .map(({ p, num, cote, scoreX }) => {
                    const badgeInfo = getDynamicHorseBadgeGradient(num);

                    return (
                      <div key={`cote-sorted-${num}`} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/90 border border-slate-800/80 shadow-xs">
                        {/* Numéro et Nom du cheval avec dégradé dynamique progressif */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span 
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-md border-2 ${badgeInfo.textColor}`}
                            style={{
                              background: badgeInfo.background,
                              borderColor: badgeInfo.borderColor,
                              boxShadow: badgeInfo.boxShadow,
                              textShadow: '0 1px 2px rgba(0,0,0,0.85)'
                            }}
                            title={`N°${num} - ${p.nom} | Catégorie: ${badgeInfo.category.toUpperCase()} | Cote: ${cote.toFixed(1)} | Score X: ${scoreX.toFixed(2)}`}
                          >
                            {num}
                          </span>
                          <span className="font-bold text-slate-200 truncate max-w-[120px] text-xs">
                            {p.nom}
                          </span>
                        </div>

                        {/* Trait vertical de séparation */}
                        <div className="w-px h-4 bg-slate-700/80 shrink-0 mx-2"></div>

                        {/* Bloc Valeur + Trait vertical + Cote séparés de 1 cm */}
                        <div className="flex items-center shrink-0">
                          <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded font-mono shrink-0 shadow-xs ${scoreX < minScoreXThreshold ? 'bg-red-950/90 text-red-400 border border-red-500/70 shadow-sm' : 'bg-slate-900 text-cyan-300 border border-cyan-500/40'}`}>
                            {scoreX.toFixed(1).replace('.', ',')}
                          </span>

                          {/* Trait vertical avec espacement de 0,5 cm (0,25cm de chaque côté) */}
                          <div className="w-px h-4 bg-slate-500 shrink-0 mx-[0.25cm]"></div>

                          <span className="font-mono font-black text-cyan-300 shrink-0 text-xs sm:text-sm min-w-[45px] text-right">
                            {cote ? `${cote}/1` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-slate-500 text-center italic py-2 col-span-2 text-xs">Aucun partant</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    ) : null}

        {renderTocardsAndSurprisesComponent()}
      </div>
    );
  };

  function renderTocardsAndSurprisesComponent() {
    const { tocards74, surprises74 } = getSysteme74TocardsAndSurprises(course);

    return (
      <div className="w-full max-w-4xl bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Flame className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wide">
                🎯 Analyse Système 74 : Tocards & Surprises
              </h4>
              <p className="text-[11px] text-slate-400 font-bold">
                Règle de classification (Différence X = (73 + N°) - Cote)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Colonne Tocards (4 N° : 7e - 10e) */}
          <div className="bg-slate-950 border-2 border-orange-500/40 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2.5 border-b border-orange-500/20 pb-2">
              <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-400" />
                {`🥉 TOCARDS (4 N° : 7e - 10e)`}
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[10px] font-bold">
                {tocards74.length} Ch.
              </span>
            </div>
            <div className="space-y-2">
              {tocards74.length > 0 ? (
                tocards74.map(({ p, num, cote, scoreX }) => {
                  const perfRes = calculerPerformance3Musiques(p.musique || '');
                  return (
                    <div key={`tocard-item-${num}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-orange-500/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-orange-600 text-white font-mono font-black text-xs flex items-center justify-center shadow shrink-0">
                          {num}
                        </span>
                        <span className="font-bold text-slate-100 text-xs truncate max-w-[120px]">{p.nom}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40" title={`4 Musiques: ${perfRes.formulaCalculation}`}>
                          {perfRes.badgeShort}
                        </span>
                        <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${scoreX < minScoreXThreshold ? 'bg-red-950/90 text-red-400 border border-red-500/70 shadow-sm' : 'bg-slate-950 text-amber-300 border border-amber-500/30'}`} title="Score X">
                          X: {scoreX.toFixed(1).replace('.', ',')}
                        </span>
                        <span className="text-xs font-mono font-black text-cyan-400">{cote}/1</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-center text-xs py-3 italic">Aucun tocard disponible</div>
              )}
            </div>
          </div>

          {/* Colonne Surprises (4 N° : petites cotes) */}
          <div className="bg-slate-950 border-2 border-rose-500/40 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2.5 border-b border-rose-500/20 pb-2">
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                {`⚡ SURPRISES (4 N° : petites cotes)`}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                {surprises74.length} Ch.
              </span>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-none">
              {surprises74.length > 0 ? (
                surprises74.map(({ p, num, cote, scoreX }) => {
                  const perfRes = calculerPerformance3Musiques(p.musique || '');
                  return (
                    <div key={`surprise-item-${num}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-rose-500/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-mono font-black text-xs flex items-center justify-center shadow shrink-0">
                          {num}
                        </span>
                        <span className="font-bold text-slate-100 text-xs truncate max-w-[120px]">{p.nom}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40" title={`4 Musiques: ${perfRes.formulaCalculation}`}>
                          {perfRes.badgeShort}
                        </span>
                        <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${scoreX < minScoreXThreshold ? 'bg-red-950/90 text-red-400 border border-red-500/70 shadow-sm' : 'bg-slate-950 text-amber-300 border border-amber-500/30'}`} title="Score X">
                          X: {scoreX.toFixed(1).replace('.', ',')}
                        </span>
                        <span className="text-xs font-mono font-black text-cyan-400">{cote}/1</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-center text-xs py-3 italic">Aucune surprise détectée</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderSysteme74Table = () => {
    if (!showSysteme74) return null;

    const allRanked = (course.partants || [])
      .filter((p) => !p.estNonPartant && p.statut !== 'Non-partant')
      .map((p) => {
        const num = Number(p.numero);
        const cote = getHorseGenyOdds(p);
        const scoreX = (73 + num) - cote;
        return { p, num, cote, scoreX };
      })
      .sort((a, b) => b.scoreX - a.scoreX);

    const filteredRanked = allRanked.filter(({ cote }) => {
      const hasDefinedCote = cote && cote > 0;
      if (!hasDefinedCote) {
        return !sys74HideUndefinedCote && (sys74CotePreset === 'all' || sys74CotePreset === 'custom');
      }

      if (sys74CotePreset === 'favoris') return cote < 5;
      if (sys74CotePreset === 'outsiders') return cote >= 5 && cote <= 15;
      if (sys74CotePreset === 'tocards') return cote > 15;
      if (sys74CotePreset === 'custom') {
        return cote >= sys74MinCote && cote <= sys74MaxCote;
      }
      return true;
    });

    return (
      <div key="table-systeme-74" className="w-full flex flex-col items-center space-y-3 pt-4 border-t border-slate-800/80">
        <div className="w-full text-center space-y-1 relative flex flex-col items-center">
          <div className="w-full flex items-center justify-between sm:justify-center gap-2 relative">
            <h4 className="text-md sm:text-lg font-black text-amber-400 uppercase tracking-wider flex items-center justify-center gap-2 mx-auto">
              <span>⚡ TABLEAU SECONDAIRE : SYSTÈME 74</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowSysteme74(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm shrink-0"
              title="Masquer le tableau Système 74"
            >
              ✕ Masquer
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Classement dynamique des partants du plus grand au plus petit score <span className="text-cyan-300 font-mono font-bold">X = (73 + N°) - Cote</span>.
          </p>
        </div>

        {/* Barre de Filtre Interactif par Cote PMU */}
        <div className="w-full max-w-4xl mx-auto p-3.5 rounded-2xl bg-slate-950/95 border-2 border-slate-800 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-black text-slate-200">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Filtre Cote PMU :</span>
            </div>

            {/* Presets de Filtre rapide */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSys74CotePreset('all');
                  setSys74MinCote(0);
                  setSys74MaxCote(100);
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  sys74CotePreset === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80'
                }`}
              >
                <span>Tous</span>
                <span className="opacity-80 font-mono text-[10px] px-1 py-0.2 rounded bg-slate-950/30">
                  {allRanked.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSys74CotePreset('favoris')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  sys74CotePreset === 'favoris'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-emerald-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                <span>🔥 Favoris (&lt; 5)</span>
                <span className="opacity-80 font-mono text-[10px] px-1 py-0.2 rounded bg-slate-950/30">
                  {allRanked.filter((r) => r.cote > 0 && r.cote < 5).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSys74CotePreset('outsiders')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  sys74CotePreset === 'outsiders'
                    ? 'bg-orange-500 text-slate-950 font-black shadow-orange-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-orange-400 border border-orange-500/30'
                }`}
              >
                <span>🎯 Outsiders (5 - 15)</span>
                <span className="opacity-80 font-mono text-[10px] px-1 py-0.2 rounded bg-slate-950/30">
                  {allRanked.filter((r) => r.cote >= 5 && r.cote <= 15).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSys74CotePreset('tocards')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  sys74CotePreset === 'tocards'
                    ? 'bg-rose-500 text-slate-950 font-black shadow-rose-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30'
                }`}
              >
                <span>💣 Tocards (&gt; 15)</span>
                <span className="opacity-80 font-mono text-[10px] px-1 py-0.2 rounded bg-slate-950/30">
                  {allRanked.filter((r) => r.cote > 15).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSys74CotePreset('custom')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  sys74CotePreset === 'custom'
                    ? 'bg-purple-500 text-white font-black shadow-purple-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30'
                }`}
              >
                <span>⚙️ Personnalisé</span>
              </button>
            </div>

            {/* Option Masquer Cotes Indéfinies */}
            <button
              type="button"
              onClick={() => setSys74HideUndefinedCote(!sys74HideUndefinedCote)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                sys74HideUndefinedCote
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Masquer les chevaux n'ayant pas de cote PMU renseignée"
            >
              <span className="text-xs">{sys74HideUndefinedCote ? '☑' : '☐'}</span>
              <span>Masquer cotes "—"</span>
            </button>
          </div>

          {/* Curseur / Inputs si mode Personnalisé */}
          {sys74CotePreset === 'custom' && (
            <div className="flex items-center gap-3 pt-2.5 border-t border-slate-800 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Cote Min :</span>
                <input
                  type="number"
                  min={0}
                  max={sys74MaxCote}
                  step={0.5}
                  value={sys74MinCote}
                  onChange={(e) => setSys74MinCote(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold font-mono text-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Cote Max :</span>
                <input
                  type="number"
                  min={sys74MinCote}
                  max={150}
                  step={0.5}
                  value={sys74MaxCote}
                  onChange={(e) => setSys74MaxCote(Math.max(sys74MinCote, parseFloat(e.target.value) || 100))}
                  className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold font-mono text-center"
                />
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-[11px] text-slate-400">Curseur Cote Max : </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sys74MaxCote}
                  onChange={(e) => setSys74MaxCote(parseFloat(e.target.value) || 100)}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Badge indicateur de filtrage */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>
              Chevaux affichés : <strong className="text-amber-300 font-mono text-xs">{filteredRanked.length}</strong> sur <span className="font-mono">{allRanked.length}</span>
            </span>
            {(sys74CotePreset !== 'all' || sys74HideUndefinedCote) && (
              <button
                type="button"
                onClick={() => {
                  setSys74CotePreset('all');
                  setSys74MinCote(0);
                  setSys74MaxCote(100);
                  setSys74HideUndefinedCote(false);
                }}
                className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer transition-colors"
              >
                Réinitialiser le filtre
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border-2 border-white overflow-x-auto shadow-2xl flex justify-center bg-slate-950 p-2 sm:p-3 w-full max-w-full lg:max-w-4xl mx-auto">
          <div className="overflow-x-auto scrollbar-none w-full flex justify-center py-1">
            <table className="w-full max-w-full border-collapse border-2 border-white mx-auto text-xs sm:text-sm table-fixed">
              <thead>
                <tr className="text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-white">
                  <th className="w-16 py-3.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center">RANG</div>
                  </th>
                  <th className="w-16 py-3.5 px-2 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center">N°</div>
                  </th>
                  <th className="py-3.5 px-3 bg-[#a855f7] text-white font-black text-left border-2 border-white align-middle">
                    <div className="w-full text-left flex items-center justify-start">CHEVAL</div>
                  </th>
                  <th className="py-3.5 px-3 bg-[#0284c7] text-white font-black text-left border-2 border-white align-middle">
                    <div className="w-full text-left flex items-center justify-start">DRIVER / JOCKEY</div>
                  </th>
                  <th className="py-3.5 px-2 bg-[#059669] text-white font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center">COTE PMU</div>
                  </th>
                  <th className="py-3.5 px-2 bg-[#f59e0b] text-slate-950 font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center">SCORE X</div>
                  </th>
                  <th className="py-3.5 px-2 bg-[#dc2626] text-white font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center">CATÉGORIE</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#0f172a] text-white font-black">
                {filteredRanked.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-slate-300 italic bg-slate-950 border-2 border-white">
                      <div className="flex flex-col items-center justify-center space-y-2.5">
                        <span className="text-amber-400 font-bold text-sm">
                          ⚠️ Aucun partant ne correspond au filtre de cote PMU sélectionné.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSys74CotePreset('all');
                            setSys74MinCote(0);
                            setSys74MaxCote(100);
                            setSys74HideUndefinedCote(false);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
                        >
                          Afficher tous les partants
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRanked.map(({ p, num, cote, scoreX }, idx) => {
                  const rank = idx + 1;
                  let catHint: 'favoris' | 'outsiders' | 'tocards' | 'surprises' = 'surprises';
                  if (rank <= 3) catHint = 'favoris';
                  else if (rank <= 6) catHint = 'outsiders';
                  else if (rank <= 10) catHint = 'tocards';

                  const badgeInfo = getHorseBadgeTheme(num, course, catHint, scoreX, cote);

                  return (
                    <tr key={`sys74-row-${num}`} className="hover:bg-slate-900/60 transition-colors border-2 border-white">
                      <td className="py-2.5 px-2 text-center font-black text-slate-400 border-2 border-white align-middle">
                        <div className="w-full text-center flex items-center justify-center">{rank}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center border-2 border-white align-middle">
                        <div className="w-full flex items-center justify-center">
                          <span 
                            className={`inline-flex w-7 h-7 items-center justify-center rounded-lg border-2 font-mono font-black text-xs shadow-md ${badgeInfo.textColor} relative overflow-hidden`}
                            style={{
                              background: badgeInfo.background,
                              borderColor: badgeInfo.borderColor,
                              boxShadow: badgeInfo.boxShadow,
                              textShadow: '0 1px 2px rgba(0,0,0,0.85)'
                            }}
                            title={`N°${num} - ${p.nom} | Catégorie: ${badgeInfo.category.toUpperCase()} | Score X: ${scoreX.toFixed(1)}`}
                          >
                            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t" />
                            <span className="z-10">{num}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-100 border-2 border-white align-middle text-left">
                        <div className="truncate max-w-[170px] text-left">{p.nom}</div>
                      </td>

                      {/* Colonne DRIVER / JOCKEY avec Info-Bulle survol interactive */}
                      <td className="py-2.5 px-3 font-black border-2 border-white align-middle relative text-left">
                        <div 
                          className="truncate max-w-[160px] text-left text-amber-300 font-extrabold hover:text-white transition-colors cursor-pointer flex items-center justify-start gap-1.5 p-1 rounded-lg hover:bg-slate-800/80"
                          onMouseEnter={() => setHoveredDriverNum(num)}
                          onMouseLeave={() => setHoveredDriverNum(null)}
                        >
                          <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{p.driver || 'Non renseigné'}</span>
                        </div>

                        {/* Info-bulle interactive / Panneau au survol du Jockey */}
                        {hoveredDriverNum === num && (() => {
                          const details = getDriverHoverDetails(p);
                          return (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-80 p-4 bg-slate-950/98 border-2 border-amber-500/90 rounded-2xl shadow-2xl z-50 text-left pointer-events-none animate-fadeIn backdrop-blur-md space-y-2.5">
                              {/* Card Header */}
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                    <User className="w-4 h-4 text-amber-400" />
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-white text-xs block leading-tight">{details.driverName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Associé au N°{num} ({p.nom})</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black border border-amber-500/30">
                                  {details.hippoRate >= 20 ? '🏆 ÉLITE' : 'EXPÉRIMENTÉ'}
                                </span>
                              </div>

                              {/* Taux de réussite sur l'hippodrome du jour */}
                              <div className="space-y-1.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Taux Réussite {details.hippoName} :</span>
                                  </span>
                                  <span className="font-mono font-black text-amber-300 text-xs">
                                    {details.hippoRate}%
                                  </span>
                                </div>
                                {/* Progress bar */}
                                <div className="w-full h-1.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                                    style={{ width: `${Math.min(100, details.hippoRate)}%` }}
                                  />
                                </div>
                              </div>

                              {/* 5 Dernières Musiques du Driver */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block flex items-center gap-1">
                                  <Trophy className="w-3 h-3 text-amber-400" />
                                  <span>5 Dernières Musiques (Forme Récente) :</span>
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                                  {details.last5Musique.map((mToken, mIdx) => {
                                    const placeNum = parseInt(mToken.replace(/\D/g, ''), 10);
                                    let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                                    if (placeNum === 1) badgeColor = 'bg-amber-500 text-slate-950 font-black border-amber-300';
                                    else if (placeNum === 2 || placeNum === 3) badgeColor = 'bg-cyan-500/20 text-cyan-300 font-bold border-cyan-500/40';
                                    else if (placeNum === 4 || placeNum === 5) badgeColor = 'bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40';

                                    return (
                                      <span key={`drv-m-${mIdx}`} className={`px-2 py-0.5 rounded-lg border text-[11px] ${badgeColor}`}>
                                        {mToken}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                                Survolez d'autres drivers pour afficher leur fiche interactive.
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center text-cyan-400 font-black border-2 border-white align-middle">
                        <div className="w-full text-center flex items-center justify-center">{cote ? `${cote}/1` : '—'}</div>
                      </td>
                      <td className={`py-2.5 px-2 text-center font-black border-2 border-white align-middle ${scoreX < minScoreXThreshold ? 'text-red-500 font-extrabold bg-red-950/30' : 'text-amber-300'}`}>
                        <div className="w-full text-center flex items-center justify-center">{scoreX.toFixed(1).replace('.', ',')}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center border-2 border-white align-middle">
                        <div className="w-full flex items-center justify-center">
                          <span 
                            className={`px-3 py-1 rounded-md text-[10px] font-black border-2 shadow-md uppercase tracking-wider ${badgeInfo.textColor} relative overflow-hidden`}
                            style={{
                              background: badgeInfo.background,
                              borderColor: badgeInfo.borderColor,
                              boxShadow: badgeInfo.boxShadow,
                              textShadow: '0 1px 2px rgba(0,0,0,0.85)'
                            }}
                          >
                            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t" />
                            <span className="z-10">{badgeInfo.badgeLabel}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderVariancePanel = () => {
    if (!showVariancePanel) return null;

    return (
      <div key="table-variance-panel" className="w-full flex flex-col items-center space-y-3 pt-4 border-t border-slate-800/80">
        <div className="w-full text-center space-y-1">
          <h4 className="text-md sm:text-lg font-black text-cyan-400 uppercase tracking-wider flex items-center justify-center gap-2">
            <span>📈 TABLEAU SECONDAIRE : VARIANCE & ÉCARTS DE CONFIANCE INTER-MODÈLES</span>
          </h4>
          <p className="text-xs text-slate-400">
            Comparaison des probabilités brutes CatBoost Classifier (65%) vs LightGBM Softmax (35%).
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4 w-full max-w-full lg:max-w-4xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2 px-2 text-center w-12">N°</th>
                <th className="py-2 px-2">Cheval</th>
                <th className="py-2 px-2 text-center">CatBoost (65%)</th>
                <th className="py-2 px-2 text-center">LightGBM (35%)</th>
                <th className="py-2 px-2 text-center">Blend Victoire</th>
                <th className="py-2 px-2 text-center">Écart Modèles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {calibratedRunners.map((r) => {
                const num = Number(r.numero);
                const pCat = r.pCatBoostFormatted || `${r.pCatBoost.toFixed(1)}%`;
                const pLgb = r.pLightGBMFormatted || `${r.pLightGBM.toFixed(1)}%`;
                const pBlend = `${r.pVictoire.toFixed(1)}%`;
                const dev = `${Math.abs(r.pCatBoost - r.pLightGBM).toFixed(1)}%`;

                return (
                  <tr key={`variance-row-${num}`} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-1.5 px-2 text-center">
                      <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-slate-900 border border-slate-700 font-black text-cyan-300">
                        {num}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-sans font-bold text-slate-200">{r.nom}</td>
                    <td className="py-1.5 px-2 text-center text-purple-300 font-bold">{pCat}</td>
                    <td className="py-1.5 px-2 text-center text-cyan-300 font-bold">{pLgb}</td>
                    <td className="py-1.5 px-2 text-center font-black text-emerald-300">{pBlend}</td>
                    <td className="py-1.5 px-2 text-center font-black text-amber-300">{dev}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFerrageTable = () => {
    if (!showFerrageTable) return null;

    const partants = (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

    // --- Calcul Croisement Dynamique : TABLEAU DE FERRURES ---
    const systeme74Ranked = partants
      .map((p) => {
        const num = Number(p.numero);
        const cote = getHorseGenyOdds(p);
        const scoreX = (73 + num) - cote;
        return { p, num, cote, scoreX };
      })
      .sort((a, b) => b.scoreX - a.scoreX);

    const { tocards74: sysTocards, surprises74: sysSurprises } = getSysteme74TocardsAndSurprises(course);
    const favNums = systeme74Ranked.slice(0, 3).map((item) => item.num);
    const outNums = systeme74Ranked.slice(3, 6).map((item) => item.num);
    const tocNums = sysTocards.map((item) => item.num);
    const surpNums = sysSurprises.map((item) => item.num);

    const getShoeingGroup = (p: typeof partants[0]) => {
      const f = (p.ferrure || (p as any).fer || 'F').toUpperCase();
      if (f === 'D4' || f.includes('D4')) return 'D4';
      if (f === 'DP' || f === 'DA' || f.includes('DP') || f.includes('DA')) return 'DA_DP';
      return 'PF';
    };

    const ferrureRows = [
      {
        key: 'D4',
        label: 'D4',
        subLabel: '(déferrés des 4)',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-2 border-white font-black',
      },
      {
        key: 'DA_DP',
        label: 'DA / DP',
        subLabel: '(déferrés ant. & post.)',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-2 border-white font-black',
      },
      {
        key: 'PF',
        label: 'P / F',
        subLabel: '(plaqués & ferrés)',
        badgeClass: 'bg-slate-800 text-slate-300 border-2 border-white font-bold',
      },
    ];

    return (
      <div key="table-ferrage" className="w-full flex flex-col items-center space-y-4 pt-4 border-t border-slate-800/80">
        {/* En-tête de section */}
        <div className="w-full text-center space-y-1 relative flex flex-col items-center">
          <div className="w-full flex items-center justify-between sm:justify-center gap-2 relative">
            <h4 className="text-md sm:text-lg font-black text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-2 mx-auto">
              <span>👟 TABLEAU DE FERRURES (CROISEMENT DYNAMIQUE) _ TROT ATTELÉ & MONTÉ</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowFerrageTable(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm shrink-0"
              title="Masquer le tableau de ferrage"
            >
              ✕ Masquer
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Spécialités : <span className="text-emerald-300 font-bold uppercase">TROT ATTELÉ & TROT MONTÉ</span> — Croisement dynamique : <span className="text-emerald-400 font-bold">Lignes (Ferrures : D4, DA/DP, P/F)</span> × <span className="text-amber-400 font-bold">Colonnes (Favoris, Outsiders, Tocards, Surprises)</span>.
          </p>
        </div>

        {/* 1. TABLEAU DE FERRURES (Matrice de Croisement Dynamique) */}
        <div className="rounded-xl border-2 border-emerald-500/30 bg-slate-950 p-2 sm:p-3 w-full max-w-full lg:max-w-4xl overflow-x-auto shadow-2xl">
          <table className="w-full text-center text-xs sm:text-sm border-collapse table-fixed border-2 border-white mx-auto">
            <thead>
              <tr className="text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-white">
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-slate-900 text-slate-200 font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex items-center justify-center font-black">FERRURES</div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#059669] text-white font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black">
                    <span>🥇 FAVORIS</span>
                    <span className="block text-[10px] font-normal opacity-90">(3 N°)</span>
                  </div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#f59e0b] text-slate-950 font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black">
                    <span>🥈 OUTSIDERS</span>
                    <span className="block text-[10px] font-normal opacity-90">(3 N°)</span>
                  </div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#ea580c] text-white font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black">
                    <span>🥉 TOCARDS</span>
                    <span className="block text-[10px] font-normal opacity-90">(4 N°)</span>
                  </div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#dc2626] text-white font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black">
                    <span>⚡ SURPRISES</span>
                    <span className="block text-[10px] font-normal opacity-90">(4 N° petites cotes)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#0f172a] text-white font-black">
              {ferrureRows.map((row) => {
                const getRowNums = (numsList: number[]) =>
                  numsList.filter((num) => {
                    const p = partants.find((item) => Number(item.numero) === num);
                    if (!p) return false;
                    const cote = getHorseGenyOdds(p);
                    const scoreX = (73 + num) - cote;
                    if (filterMinScoreX && scoreX < minScoreXThreshold) return false;
                    return getShoeingGroup(p) === row.key;
                  }).sort((a, b) => {
                    const pA = partants.find((item) => Number(item.numero) === a);
                    const pB = partants.find((item) => Number(item.numero) === b);
                    const coteA = pA ? getHorseGenyOdds(pA) : 999;
                    const coteB = pB ? getHorseGenyOdds(pB) : 999;
                    if (coteA !== coteB) return coteA - coteB;
                    return a - b;
                  });

                const cellFavs = getRowNums(favNums);
                const cellOuts = getRowNums(outNums);
                const cellTocs = getRowNums(tocNums);
                const cellSurps = getRowNums(surpNums);

                return (
                  <tr key={`ferrure-cross-row-${row.key}`} className="hover:bg-slate-900/60 transition-colors border-2 border-white">
                    {/* Colonne 1 : Type de Ferrure */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle bg-slate-900/80">
                      <div className="w-full flex flex-col items-center justify-center gap-1 text-center">
                        <span className={`px-2.5 py-1 rounded-md ${row.badgeClass} text-xs sm:text-sm text-center leading-tight shadow-xs`}>
                          {row.label}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-tight text-center">
                          {row.subLabel}
                        </span>
                      </div>
                    </td>

                    {/* Colonne 2 : 🥇 FAVORIS (3 N°) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellFavs.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellFavs.map((num, idx) => (
                            <React.Fragment key={`ferr-fav-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-favoris);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>

                    {/* Colonne 3 : 🥈 OUTSIDERS (3 N°) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellOuts.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellOuts.map((num, idx) => (
                            <React.Fragment key={`ferr-out-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-outsiders);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>

                    {/* Colonne 4 : 🥉 TOCARDS (4 N°) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellTocs.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellTocs.map((num, idx) => (
                            <React.Fragment key={`ferr-toc-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-tocards);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>

                    {/* Colonne 5 : ⚡ SURPRISES (4 N° petites cotes) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellSurps.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellSurps.map((num, idx) => (
                            <React.Fragment key={`ferr-surp-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-surprises);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. DÉTAIL INDIVIDUEL DE FERRAGE PAR CHEVAL */}
        <div className="w-full max-w-full lg:max-w-6xl space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>📋 Détail individuel de ferrure des partants</span>
            <span className="text-slate-500 text-[10px]">Indice & impact condition</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-2 text-center w-12">N°</th>
                  <th className="py-2 px-2">Cheval</th>
                  <th className="py-2 px-2 text-center">Ferrure</th>
                  <th className="py-2 px-2">Configuration & Impact</th>
                  <th className="py-2 px-2 text-center">Cote PMU</th>
                  <th className="py-2 px-2 text-center">Indice Ferrage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {partants.map((p) => {
                  const num = Number(p.numero);
                  const cote = getHorseGenyOdds(p);
                  const ferrureStr = (p.ferrure || (p as any).fer || 'F').toUpperCase();
                  
                  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                  let configDesc = 'Configuration classique (Ferré)';
                  let impactText = 'Standard';
                  let impactColor = 'text-slate-400';

                  if (ferrureStr === 'D4' || ferrureStr.includes('D4')) {
                    badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-black';
                    configDesc = 'Déferré des 4 pieds (D4)';
                    impactText = '🚀 Gain maximal (+4 pts)';
                    impactColor = 'text-emerald-400 font-bold';
                  } else if (ferrureStr === 'DP' || ferrureStr === 'DA' || ferrureStr.includes('DP') || ferrureStr.includes('DA')) {
                    badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-black';
                    configDesc = ferrureStr.includes('DP') ? 'Déferré des postérieurs (DP)' : 'Déferré des antérieurs (DA)';
                    impactText = '⚡ Configuration allégée (+2 pts)';
                    impactColor = 'text-amber-400 font-bold';
                  } else if (ferrureStr === 'F') {
                    badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                    configDesc = 'Ferré des 4 pieds (F)';
                    impactText = '🛡️ Configuration classique';
                    impactColor = 'text-slate-400';
                  }

                  return (
                    <tr key={`ferrage-row-${num}`} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-1.5 px-2 text-center">
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-slate-900 border border-slate-700 font-black text-cyan-300">
                          {num}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-sans font-bold text-slate-200">{p.nom}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeStyle}`}>
                          {ferrureStr}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-sans text-[11px] text-slate-300">
                        <div>{configDesc}</div>
                        <div className={`text-[10px] ${impactColor}`}>{impactText}</div>
                      </td>
                      <td className="py-1.5 px-2 text-center text-cyan-400 font-bold">{cote ? `${cote}/1` : '—'}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`text-xs ${impactColor}`}>
                          {ferrureStr.includes('D4') ? '⭐ Max' : ferrureStr.includes('DP') || ferrureStr.includes('DA') ? '🟢 Moyen' : '⚪ Neutre'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCordeTable = () => {
    if (!showCordeTable) return null;

    const partants = (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

    // --- Calcul Croisement Dynamique : TABLEAU DES POSITIONS À LA CORDE ---
    const systeme74Ranked = partants
      .map((p) => {
        const num = Number(p.numero);
        const cote = getHorseGenyOdds(p);
        const scoreX = (73 + num) - cote;
        return { p, num, cote, scoreX };
      })
      .sort((a, b) => b.scoreX - a.scoreX);

    const { tocards74: sysTocardsCorde, surprises74: sysSurprisesCorde } = getSysteme74TocardsAndSurprises(course);
    const favNums = systeme74Ranked.slice(0, 3).map((item) => item.num);
    const outNums = systeme74Ranked.slice(3, 6).map((item) => item.num);
    const tocNums = sysTocardsCorde.map((item) => item.num);
    const surpNums = sysSurprisesCorde.map((item) => item.num);

    const getCordeGroup = (p: typeof partants[0]) => {
      const cordeVal = Number(p.corde) || Number((p as any).place) || Number((p as any).stalle) || Number(p.numero);
      if (cordeVal >= 1 && cordeVal <= 5) return 'CORDE_1_5';
      if (cordeVal >= 6 && cordeVal <= 8) return 'CORDE_6_8';
      return 'CORDE_9_PLUS';
    };

    const cordeRows = [
      {
        key: 'CORDE_1_5',
        label: '🟢 CORDES : 1 à 5',
        subLabel: '(Positions intérieures / avantage)',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-black',
      },
      {
        key: 'CORDE_6_8',
        label: '🟡 CORDES : 6 à 8',
        subLabel: '(Positions médianes)',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black',
      },
      {
        key: 'CORDE_9_PLUS',
        label: '⚪ CORDES : 9 et +',
        subLabel: '(Positions extérieures)',
        badgeClass: 'bg-slate-800 text-slate-300 border-slate-700 font-bold',
      },
    ];

    return (
      <div key="table-corde" className="w-full flex flex-col items-center space-y-4 pt-4 border-t border-slate-800/80">
        {/* En-tête de section */}
        <div className="w-full text-center space-y-1 relative flex flex-col items-center">
          <div className="w-full flex items-center justify-between sm:justify-center gap-2 relative">
            <h4 className="text-md sm:text-lg font-black text-cyan-400 uppercase tracking-wider flex items-center justify-center gap-2 mx-auto">
              <span>🎯 TABLEAU DES POSITIONS À LA CORDE (CROISEMENT DYNAMIQUE)</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowCordeTable(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm shrink-0"
              title="Masquer le tableau de la corde"
            >
              ✕ Masquer
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Croisement dynamique : <span className="text-cyan-400 font-bold">Lignes (Positions Corde : 1-5, 6-8, 9+)</span> × <span className="text-amber-400 font-bold">Colonnes (Favoris, Outsiders, Tocards, Surprises)</span>.
          </p>
        </div>

        {/* 1. TABLEAU DES POSITIONS À LA CORDE (Matrice de Croisement Dynamique) */}
        <div className="rounded-xl border-2 border-cyan-500/30 bg-slate-950 p-2 sm:p-3 w-full max-w-full lg:max-w-4xl overflow-x-auto shadow-2xl">
          <table className="w-full text-center text-xs sm:text-sm border-collapse table-fixed border-2 border-white mx-auto">
            <thead>
              <tr className="text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-white">
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-slate-900 text-slate-200 font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex items-center justify-center font-black mx-auto">
                    CORDES
                  </div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#059669] text-white font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black mx-auto">
                    <span>🥇 FAVORIS</span>
                    <span className="block text-[10px] font-normal opacity-90 text-center">(3 N°)</span>
                  </div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#f59e0b] text-slate-950 font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black mx-auto">
                    <span>🥈 OUTSIDERS</span>
                    <span className="block text-[10px] font-normal opacity-90 text-center">(3 N°)</span>
                  </div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#ea580c] text-white font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black mx-auto">
                    <span>🥉 TOCARDS</span>
                    <span className="block text-[10px] font-normal opacity-90 text-center">(4 N°)</span>
                  </div>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#dc2626] text-white font-black text-center border-2 border-white align-middle">
                  <div className="w-full text-center flex flex-col items-center justify-center font-black mx-auto">
                    <span>⚡ SURPRISES</span>
                    <span className="block text-[10px] font-normal opacity-90 text-center">(4 N° petites cotes)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#0f172a] text-white font-black">
              {cordeRows.map((row) => {
                const getRowNums = (numsList: number[]) =>
                  numsList.filter((num) => {
                    const p = partants.find((item) => Number(item.numero) === num);
                    if (!p) return false;
                    const cote = getHorseGenyOdds(p);
                    const scoreX = (73 + num) - cote;
                    if (filterMinScoreX && scoreX < minScoreXThreshold) return false;
                    return getCordeGroup(p) === row.key;
                  }).sort((a, b) => {
                    const pA = partants.find((item) => Number(item.numero) === a);
                    const pB = partants.find((item) => Number(item.numero) === b);
                    const coteA = pA ? getHorseGenyOdds(pA) : 999;
                    const coteB = pB ? getHorseGenyOdds(pB) : 999;
                    if (coteA !== coteB) return coteA - coteB;
                    return a - b;
                  });

                const cellFavs = getRowNums(favNums);
                const cellOuts = getRowNums(outNums);
                const cellTocs = getRowNums(tocNums);
                const cellSurps = getRowNums(surpNums);

                return (
                  <tr key={`corde-cross-row-${row.key}`} className="hover:bg-slate-900/60 transition-colors border-2 border-white">
                    {/* Colonne 1 : Secteur Corde */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle bg-slate-900/80">
                      <div className="w-full flex flex-col items-center justify-center gap-1 text-center">
                        <span className={`px-2.5 py-1 rounded-md ${row.badgeClass} text-xs sm:text-sm text-center leading-tight shadow-xs`}>
                          {row.label}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-tight text-center">
                          {row.subLabel}
                        </span>
                      </div>
                    </td>

                    {/* Colonne 2 : 🥇 FAVORIS (3 N°) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellFavs.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellFavs.map((num, idx) => (
                            <React.Fragment key={`corde-fav-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-favoris);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>

                    {/* Colonne 3 : 🥈 OUTSIDERS (3 N°) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellOuts.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellOuts.map((num, idx) => (
                            <React.Fragment key={`corde-out-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-outsiders);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>

                    {/* Colonne 4 : 🥉 TOCARDS (4 N°) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellTocs.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellTocs.map((num, idx) => (
                            <React.Fragment key={`corde-toc-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-tocards);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>

                    {/* Colonne 5 : ⚡ SURPRISES (4 N° petites cotes) */}
                    <td className="w-1/5 min-w-[140px] sm:min-w-[180px] py-4 px-2 border-2 border-white text-center align-middle">
                      {cellSurps.length > 0 ? (
                        <div className="w-full flex flex-row items-center justify-center gap-2 flex-wrap">
                          {cellSurps.map((num, idx) => (
                            <React.Fragment key={`corde-surp-${row.key}-${num}-${idx}`}>
                              {renderHorseBadge(num, '--group-rgb: var(--group-surprises);')}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-slate-500 font-bold text-base">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. DÉTAIL INDIVIDUEL DE LA CORDE PAR CHEVAL */}
        <div className="w-full max-w-full lg:max-w-6xl space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>📋 Détail individuel des numéros de corde des partants</span>
            <span className="text-slate-500 text-[10px]">Positions de départ & cotes</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-2 text-center w-12">N°</th>
                  <th className="py-2 px-2">Cheval</th>
                  <th className="py-2 px-2 text-center">N° Corde</th>
                  <th className="py-2 px-2">Secteur Corde</th>
                  <th className="py-2 px-2 text-center">Cote PMU</th>
                  <th className="py-2 px-2 text-center">Impact Corde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {partants.map((p) => {
                  const num = Number(p.numero);
                  const cote = getHorseGenyOdds(p);
                  const cordeVal = Number(p.corde) || Number((p as any).place) || Number((p as any).stalle) || num;
                  
                  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                  let sectorDesc = 'Corde Extérieure (9+)';
                  let impactText = '⚪ Parcours rallongé';
                  let impactColor = 'text-slate-400';

                  if (cordeVal >= 1 && cordeVal <= 5) {
                    badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-black';
                    sectorDesc = 'Corde Intérieure (1 à 5)';
                    impactText = '🚀 Parcours économisé (Avantage)';
                    impactColor = 'text-emerald-400 font-bold';
                  } else if (cordeVal >= 6 && cordeVal <= 8) {
                    badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-black';
                    sectorDesc = 'Corde Médiane (6 à 8)';
                    impactText = '⚡ Configuration standard';
                    impactColor = 'text-amber-400 font-bold';
                  }

                  return (
                    <tr key={`corde-row-${num}`} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-1.5 px-2 text-center">
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-slate-900 border border-slate-700 font-black text-cyan-300">
                          {num}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-sans font-bold text-slate-200">{p.nom}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeStyle}`}>
                          Corde {cordeVal}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-sans text-[11px] text-slate-300">
                        <div>{sectorDesc}</div>
                        <div className={`text-[10px] ${impactColor}`}>{impactText}</div>
                      </td>
                      <td className="py-1.5 px-2 text-center text-cyan-400 font-bold">{cote ? `${cote}/1` : '—'}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`text-xs ${impactColor}`}>
                          {cordeVal <= 5 ? '⭐ Favorable' : cordeVal <= 8 ? '🟢 Neutre' : '⚪ Désavantage'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceTable = () => {
    if (!showPerformanceTable) return null;

    const partants = (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

    const sortedByPerf = [...partants].sort((a, b) => {
      const perfA = calculerPerformance3Musiques(a.musique).totalPoints;
      const perfB = calculerPerformance3Musiques(b.musique).totalPoints;
      if (perfA !== perfB) return perfA - perfB;
      return (getHorseGenyOdds(a) || 99) - (getHorseGenyOdds(b) || 99);
    });

    return (
      <div key="table-performance" className="w-full flex flex-col items-center space-y-3 pt-4 border-t border-slate-800/80">
        <div className="w-full text-center space-y-1 relative flex flex-col items-center">
          <div className="w-full flex items-center justify-between sm:justify-center gap-2 relative">
            <h4 className="text-md sm:text-lg font-black text-rose-400 uppercase tracking-wider flex items-center justify-center gap-2 mx-auto">
              <span>⭐ TABLEAU SECONDAIRE : PERFORMANCE DU CHEVAL (3 DERNIÈRES MUSIQUES)</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowPerformanceTable(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm shrink-0"
              title="Masquer le tableau de performance"
            >
              ✕ Masquer
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Calcul de la régularité par addition des 3 derniers résultats : <span className="text-purple-400 font-bold">1er à 3e N°</span> (Élite/Top), <span className="text-emerald-400 font-bold">4e à 7e N°</span> (Régulier), <span className="text-amber-400 font-bold">8e à 10e N°</span> (Correct), <span className="text-red-400 font-bold">11e+</span> (Irrégulier).
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4 w-full max-w-full lg:max-w-4xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2 px-2 text-center w-12">Rang</th>
                <th className="py-2 px-2 text-center w-12">N°</th>
                <th className="py-2 px-2">Cheval</th>
                <th className="py-2 px-2 text-left">Musique Récente</th>
                <th className="py-2 px-2 text-center">Somme 3 Perf.</th>
                <th className="py-2 px-2 text-center">Catégorie</th>
                <th className="py-2 px-2 text-center">Cote PMU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedByPerf.map((p, idx) => {
                const rank = idx + 1;
                const num = Number(p.numero);
                const cote = getHorseGenyOdds(p);
                const scorePerfObj = calculerPerformance3Musiques(p.musique);
                
                let badgeBg = 'bg-red-500/20 text-red-300 border-red-500/40';
                let catLabel = '🔴 IRRÉGULIER';
                if (rank <= 3) {
                  badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                  catLabel = '⭐ ÉLITE / TOP';
                } else if (rank <= 7) {
                  badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  catLabel = '🟢 RÉGULIER';
                } else if (rank <= 10) {
                  badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  catLabel = '🟡 CORRECT';
                }

                return (
                  <tr key={`perf-row-${num}`} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-1.5 px-2 text-center font-bold text-slate-400">{rank}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-slate-900 border border-slate-700 font-black text-cyan-300">
                        {num}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-sans font-bold text-slate-200">{p.nom}</td>
                    <td className="py-1.5 px-2 text-left text-slate-300 font-mono text-[11px]">{p.musique || '—'}</td>
                    <td className="py-1.5 px-2 text-center font-black text-cyan-300">{scorePerfObj.totalPoints} pts</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${badgeBg}`}>
                        {catLabel}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center text-cyan-400 font-bold">{cote ? `${cote}/1` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDriversRankingTable = () => {
    if (!showDriversRanking) return null;

    return (
      <div key="table-drivers-ranking" className="w-full flex flex-col items-center space-y-3 pt-4 border-t border-slate-800/80">
        <div className="w-full text-center space-y-1 relative flex flex-col items-center">
          <div className="w-full flex items-center justify-between sm:justify-center gap-2 relative">
            <h4 className="text-md sm:text-lg font-black text-amber-400 uppercase tracking-wider flex items-center justify-center gap-2 mx-auto">
              <span>🏆 TABLEAU DE CLASSEMENT ET PALMARÈS DES DRIVERS / JOCKEYS</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowDriversRanking(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
              title="Masquer le tableau du classement drivers / jockeys"
            >
              ✕ Masquer
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Palmarès officiel, taux de réussite %, forme récente et synergie duo avec le cheval.
          </p>
        </div>

        <div className="w-full">
          <DriversRankingTable course={course} title="Tableau de Classement et Palmarès des Drivers / Jockeys" />
        </div>
      </div>
    );
  };

  const renderStrategieProprietairesTable = () => {
    if (!showStrategieProprietaires) return null;

    return (
      <div key="table-strategie-proprietaires" className="w-full space-y-3 pt-4 border-t border-slate-800/80">
        <div className="w-full flex items-center justify-between gap-2">
          <h4 className="text-md sm:text-lg font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <span>🎯 STRATÉGIE DES PROPRIÉTAIRES & ENTOURAGES</span>
          </h4>
          <button
            type="button"
            onClick={() => setShowStrategieProprietaires(false)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            title="Masquer la section Stratégie des Propriétaires"
          >
            ✕ Masquer
          </button>
        </div>
        <StrategieProprietairesCard
          course={course}
          selectedHorseNumbers={selectedHorseNumbers}
          onSelectHorseForTicket={onSelectHorseForTicket}
        />
      </div>
    );
  };

  return (
    <div
      className={`pronostics-jeu-container flex flex-col w-full rounded-2xl border ${
        isDark
          ? 'bg-[#0b1329] border-slate-800 text-white shadow-2xl p-4 sm:p-6'
          : 'bg-white border-slate-200 text-slate-900 shadow-lg p-4 sm:p-6'
      } space-y-6 font-sans`}
    >
      <div className="flex items-center justify-center border-b border-slate-800/80 pb-1">
        <div className="flex items-center">
          <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black uppercase tracking-wider">
            Étape 3 : Grille Stratégique de Synthèse
          </span>
        </div>
      </div>

      {renderSyntheseDeJeuTable()}
      {renderSysteme74Table()}
      {renderStrategieProprietairesTable()}
      {renderVariancePanel()}
      {renderFerrageTable()}
      {renderCordeTable()}
      {renderPerformanceTable()}
      {renderDriversRankingTable()}

      {/* Modal Diagnostic Formule Tandem */}
      <TandemDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        course={course}
      />

      {/* Modal Règles et Fonctionnement Système 74 */}
      <Systeme74RulesModal
        isOpen={showSysteme74RulesModal}
        onClose={() => setShowSysteme74RulesModal(false)}
      />
    </div>
  );
};
