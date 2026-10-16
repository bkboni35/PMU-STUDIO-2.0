import React, { useState } from 'react';
import { ArrowUpDown, Calculator, TrendingUp } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { computeDisciplineGrid, computeV38Hierarchy, getHorseGenyOdds } from '../utils/v38Helper';
import { computeTabularEnsembleAnalysis, recalibratePredictionsWithTemperature } from '../utils/tabularRankingEngine';
import { calculerPerformance3Musiques, calculerPerformanceDriverJockey, calculerPerformanceTandem, getPartantDriverMusique } from '../utils/turfCalculations';
import { TandemDiagnosticModal } from './TandemDiagnosticModal';

interface DisciplineGridTableProps {
  course: CourseHippique;
  variant?: 'dark' | 'light';
}

export const DisciplineGridTable: React.FC<DisciplineGridTableProps> = ({
  course,
  variant = 'dark',
}) => {
  // Permutation des positions des 2 tableaux (par défaut true : SYNTHÈSE DE JEU en 1er, TABLEAU DE RÉPARTITION en 2e)
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [showSynthesisTable, setShowSynthesisTable] = useState<boolean>(true);
  const [showSysteme74, setShowSysteme74] = useState<boolean>(false);
  const [showVariancePanel, setShowVariancePanel] = useState<boolean>(false);
  const [showFerrageTable, setShowFerrageTable] = useState<boolean>(false);
  const [showCordeTable, setShowCordeTable] = useState<boolean>(false);
  const [showPerformanceTable, setShowPerformanceTable] = useState<boolean>(false);

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

  const renderHorseBadge = (num: number, groupStyle: string = '', title?: string) => {
    const p = course.partants?.find((p) => Number(p.numero) === num);
    const cote = p ? getHorseGenyOdds(p) : 999;
    const scoreX = (73 + num) - cote;
    
    // Extraction sécurisée de la variable de couleur de groupe
    let groupRgb = '100, 116, 139'; // Slate-500 par défaut
    if (groupStyle && typeof groupStyle === 'string' && groupStyle.includes('--group-rgb:')) {
      const match = groupStyle.match(/--group-rgb:\s*([^;]+)/);
      if (match && match[1]) {
        groupRgb = match[1].trim();
      }
    } else if (groupStyle && typeof groupStyle === 'string' && groupStyle.includes('bg-[')) {
      // Rétrocompatibilité avec les anciennes classes Tailwind hardcodées
      if (groupStyle.includes('#059669')) groupRgb = '5, 150, 105';
      if (groupStyle.includes('#f59e0b')) groupRgb = '245, 158, 11';
      if (groupStyle.includes('#ea580c')) groupRgb = '234, 88, 12';
      if (groupStyle.includes('#dc2626')) groupRgb = '220, 38, 38';
    }

    // Calcul de l'intensité du gradient (opacité) basé sur le Score X
    // On normalise entre 0.3 (modéré) et 1.0 (intense) pour des scores allant de ~20 à ~85
    const intensity = Math.max(0.3, Math.min(1.0, (scoreX - 20) / 60));
    const bgColor = `rgba(${groupRgb}, ${intensity})`;
    const borderColor = `rgba(${groupRgb}, ${Math.min(1, intensity + 0.2)})`;

    return (
      <div
        className="w-9 sm:w-11 h-10 sm:h-12 rounded-lg font-mono font-black flex flex-col items-center justify-center text-center shadow-md border shrink-0 transition-transform hover:scale-110 cursor-pointer text-white"
        style={{ 
          backgroundColor: bgColor,
          borderColor: borderColor,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}
        title={title || `Cote: ${cote.toFixed(1)} | Score X: ${scoreX.toFixed(2)}`}
      >
        <span className="text-sm sm:text-base leading-none font-black">{num}</span>
        <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 opacity-90 font-bold">
          {scoreX.toFixed(1).replace('.', ',')}
        </span>
      </div>
    );
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

  // Alias for compatibility with tandem performance rows
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

    return (
      <div key="table-synthese-de-jeu" className="space-y-3 w-full flex flex-col items-center">
        <div className="w-full flex flex-col items-center justify-center gap-3 px-1 text-center">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
              <span>SYNTHÈSE DE JEU</span>
            </h3>
            <p className="text-xs text-slate-400">
              Croisement dynamique : <span className="text-amber-400 font-bold">Lignes</span> (SYSTÈME 74 : FAVORIS 3 N°, OUTSIDERS 3 N°, TOCARDS 4 N°, SURPRISES 4 N° aux + petites cotes) × <span className="text-cyan-400 font-bold">Colonnes</span> (Addition des 3 dernières performances du cheval : Élite 1er-3e, Régulier 4e-7e, Correct 8e-10e, Irrégulier 11e+).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowSynthesisTable((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                showSynthesisTable
                  ? 'bg-purple-600 text-white border-purple-400 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-purple-500/40'
              }`}
              title="Afficher ou masquer le tableau de synthèse de jeu"
            >
              <span>{showSynthesisTable ? 'Masquer Synthèse' : '📊 Afficher Synthèse'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSysteme74((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                showSysteme74
                  ? 'bg-amber-600 text-white border-amber-400 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
              title="Afficher ou masquer le tableau Système 74 sur l'interface"
            >
              <span>{showSysteme74 ? 'Masquer Système 74' : '⚡ Afficher Système 74'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVariancePanel((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                showVariancePanel
                  ? 'bg-cyan-600 text-white border-cyan-400 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/40'
              }`}
              title="Afficher ou masquer le tableau de variance inter-modèles"
            >
              <span>{showVariancePanel ? 'Masquer Variance' : '📈 Afficher Variance Modèles'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFerrageTable((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                showFerrageTable
                  ? 'bg-emerald-600 text-white border-emerald-400 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40'
              }`}
              title="Afficher ou masquer le tableau de ferrage / déferrage"
            >
              <span>{showFerrageTable ? 'Masquer Ferrures' : '👟 Tableau de Ferrures (Trot Attelé & Monté)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCordeTable((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                showCordeTable
                  ? 'bg-blue-600 text-white border-blue-400 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-blue-500/40'
              }`}
              title="Afficher ou masquer le tableau des positions à la corde"
            >
              <span>{showCordeTable ? 'Masquer Corde' : '🎯 Positions à la Corde'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPerformanceTable((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                showPerformanceTable
                  ? 'bg-rose-600 text-white border-rose-400 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border-rose-500/40'
              }`}
              title="Afficher ou masquer le tableau de performance du cheval"
            >
              <span>{showPerformanceTable ? 'Masquer Performance' : '⭐ Performance Cheval'}</span>
            </button>
          </div>
        </div>

        {showSynthesisTable && (
          <div className="w-full flex flex-col items-center justify-center gap-6">
          {/* Tableau de Synthèse de Jeu */}
          <div className="rounded-xl border-2 border-white overflow-x-auto shadow-2xl flex justify-center bg-slate-950 p-2 sm:p-3 w-full max-w-full lg:max-w-4xl">
            <div className="overflow-x-auto scrollbar-none w-full flex justify-center py-1">
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
                    { key: 'FAVORIS', label: '🥇 FAVORIS', subLabel: '(3 N° : 1e - 3e)', badgeBg: '--group-rgb: var(--group-favoris);', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', nums: v38.systeme74Ranked.slice(0, 3).map((item) => Number(item.numero)) },
                    { key: 'OUTSIDERS', label: '🥈 OUTSIDERS', subLabel: '(3 N° : 4e - 6e)', badgeBg: '--group-rgb: var(--group-outsiders);', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40', nums: v38.systeme74Ranked.slice(3, 6).map((item) => Number(item.numero)) },
                    { key: 'TOCARDS', label: '🥉 TOCARDS', subLabel: '(4 N° : 7e - 10e)', badgeBg: '--group-rgb: var(--group-tocards);', badgeClass: 'bg-orange-600/20 text-orange-300 border-orange-500/40', nums: v38.systeme74Ranked.slice(6, 10).map((item) => Number(item.numero)) },
                    { key: 'SURPRISES', label: '⚡ SURPRISES', subLabel: '(4 N° : petites cotes)', badgeBg: '--group-rgb: var(--group-surprises);', badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40', nums: surpriseNums },
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

                    colElite.sort(sortBySysteme74Desc);
                    colRegulier.sort(sortBySysteme74Desc);
                    colCorrect.sort(sortBySysteme74Desc);
                    colIrregulier.sort(sortBySysteme74Desc);

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
                  { key: 'FAVORIS', label: '🥇 FAVORIS', subLabel: '(3 N° : 1e - 3e)', badgeBg: '--group-rgb: var(--group-favoris);', nums: v38.systeme74Ranked.slice(0, 3).map((item) => Number(item.numero)) },
                  { key: 'OUTSIDERS', label: '🥈 OUTSIDERS', subLabel: '(3 N° : 4e - 6e)', badgeBg: '--group-rgb: var(--group-outsiders);', nums: v38.systeme74Ranked.slice(3, 6).map((item) => Number(item.numero)) },
                  { key: 'TOCARDS', label: '🥉 TOCARDS', subLabel: '(4 N° : 7e - 10e)', badgeBg: '--group-rgb: var(--group-tocards);', nums: v38.systeme74Ranked.slice(6, 10).map((item) => Number(item.numero)) },
                  { key: 'SURPRISES', label: '⚡ SURPRISES', subLabel: '(4 N° : petites cotes)', badgeBg: '--group-rgb: var(--group-surprises);', nums: surpriseNums },
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

                  colEnForme.sort(sortBySysteme74Desc);
                  colMoyenne.sort(sortBySysteme74Desc);
                  colExploit.sort(sortBySysteme74Desc);
                  colMeforme.sort(sortBySysteme74Desc);

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
        </div>

        {/* Bloc Arrivée de la course et Côtes des partants (Placé en-dessous, centré, largeur max 17.5cm) */}
        <div 
          className="rounded-xl border-2 border-amber-500/40 bg-slate-900/95 p-4 shadow-2xl shrink-0 w-full max-w-full lg:max-w-4xl mx-auto space-y-3 text-slate-200"
          style={{ fontSize: '12px' }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-black text-amber-400 uppercase tracking-wider text-xs sm:text-sm">
              🏆 ARRIVÉE & CÔTES DES PARTANTS (SCORE X = (73 + N°) - COTE)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs">
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
                    let badgeBg = 'bg-[#dc2626] text-white border-red-300'; // surprises (rouge)
                    if (favorisSet.has(num)) badgeBg = 'bg-[#059669] text-white border-emerald-300'; // favoris (vert)
                    else if (outsidersSet.has(num)) badgeBg = 'bg-[#f59e0b] text-slate-950 border-amber-300'; // outsiders (orange)
                    else if (tocardsSet.has(num)) badgeBg = 'bg-[#ea580c] text-white border-orange-300'; // tocards (orange foncé)

                    return (
                      <div key={`cote-sorted-${num}`} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/90 border border-slate-800/80 shadow-xs">
                        {/* Numéro et Nom du cheval */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-sm border ${badgeBg}`}>
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
                          <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-500/40 font-mono shrink-0 shadow-xs">
                            {scoreX.toFixed(1).replace('.', ',')}
                          </span>

                          {/* Trait vertical avec espacement de 1 cm (0.5cm de chaque côté) */}
                          <div className="w-px h-4 bg-slate-500 shrink-0 mx-[0.5cm]"></div>

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
    )}
  </div>
);
  };

  const renderSysteme74Table = () => {
    if (!showSysteme74) return null;

    const rankedPartants = (course.partants || [])
      .filter((p) => !p.estNonPartant && p.statut !== 'Non-partant')
      .map((p) => {
        const num = Number(p.numero);
        const cote = getHorseGenyOdds(p);
        const scoreX = (73 + num) - cote;
        return { p, num, cote, scoreX };
      })
      .sort((a, b) => b.scoreX - a.scoreX);

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
                  <th className="py-3.5 px-2 bg-[#a855f7] text-white font-black text-center border-2 border-white align-middle">
                    <div className="w-full text-center flex items-center justify-center">CHEVAL</div>
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
                {rankedPartants.map(({ p, num, cote, scoreX }, idx) => {
                  const rank = idx + 1;
                  let badgeClass = 'bg-red-500/20 text-red-300 border-red-500/40';
                  let numBadgeClass = 'border-red-500/50 text-red-400';
                  let catLabel = 'SURPRISE';
                  
                  if (rank <= 3) {
                    badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                    numBadgeClass = 'border-emerald-500/50 text-emerald-400';
                    catLabel = 'FAVORI';
                  } else if (rank <= 6) {
                    badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                    numBadgeClass = 'border-amber-500/50 text-amber-400';
                    catLabel = 'OUTSIDER';
                  } else if (rank <= 10) {
                    badgeClass = 'bg-orange-600/20 text-orange-300 border-orange-500/40';
                    numBadgeClass = 'border-orange-500/50 text-orange-400';
                    catLabel = 'TOCARD';
                  }

                  return (
                    <tr key={`sys74-row-${num}`} className="hover:bg-slate-900/60 transition-colors border-2 border-white">
                      <td className="py-2.5 px-2 text-center font-black text-slate-400 border-2 border-white align-middle">
                        <div className="w-full text-center flex items-center justify-center">{rank}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center border-2 border-white align-middle">
                        <div className="w-full flex items-center justify-center">
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded-md bg-slate-950 border-2 font-black shadow-sm ${numBadgeClass}`}>
                            {num}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-100 border-2 border-white align-middle">
                        <div className="truncate max-w-[150px] text-center">{p.nom}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-cyan-400 font-black border-2 border-white align-middle">
                        <div className="w-full text-center flex items-center justify-center">{cote ? `${cote}/1` : '—'}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-amber-300 border-2 border-white align-middle">
                        <div className="w-full text-center flex items-center justify-center">{scoreX.toFixed(1).replace('.', ',')}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center border-2 border-white align-middle">
                        <div className="w-full flex items-center justify-center">
                          <span className={`px-3 py-1 rounded-md text-[10px] font-black border-2 shadow-md uppercase tracking-wider ${badgeClass}`}>
                            {catLabel}
                          </span>
                        </div>
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

    const favNums = systeme74Ranked.slice(0, 3).map((item) => item.num);
    const outNums = systeme74Ranked.slice(3, 6).map((item) => item.num);
    const tocNums = systeme74Ranked.slice(6, 10).map((item) => item.num);
    const surpCandidates = systeme74Ranked.slice(10).sort((a, b) => a.cote - b.cote);
    const surpNums = surpCandidates.slice(0, 4).map((item) => item.num);

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
          <table className="w-full text-left text-xs sm:text-sm border-collapse table-fixed border-2 border-white">
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
                    return getShoeingGroup(p) === row.key;
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

    const favNums = systeme74Ranked.slice(0, 3).map((item) => item.num);
    const outNums = systeme74Ranked.slice(3, 6).map((item) => item.num);
    const tocNums = systeme74Ranked.slice(6, 10).map((item) => item.num);
    const surpCandidates = systeme74Ranked.slice(10).sort((a, b) => a.cote - b.cote);
    const surpNums = surpCandidates.slice(0, 4).map((item) => item.num);

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
          <table className="w-full text-left text-xs sm:text-sm border-collapse table-fixed border-2 border-white">
            <thead>
              <tr className="text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-white">
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-slate-900 text-slate-200 font-black text-center border-2 border-white align-middle">
                  CORDES
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#059669] text-white font-black text-center border-2 border-white align-middle">
                  🥇 FAVORIS <span className="block text-[10px] font-normal opacity-90">(3 N°)</span>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#f59e0b] text-slate-950 font-black text-center border-2 border-white align-middle">
                  🥈 OUTSIDERS <span className="block text-[10px] font-normal opacity-90">(3 N°)</span>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#ea580c] text-white font-black text-center border-2 border-white align-middle">
                  🥉 TOCARDS <span className="block text-[10px] font-normal opacity-90">(4 N°)</span>
                </th>
                <th className="w-1/5 min-w-[80px] py-3.5 px-2 bg-[#dc2626] text-white font-black text-center border-2 border-white align-middle">
                  ⚡ SURPRISES <span className="block text-[10px] font-normal opacity-90">(4 N° petites cotes)</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#0f172a] text-white font-black">
              {cordeRows.map((row) => {
                const getRowNums = (numsList: number[]) =>
                  numsList.filter((num) => {
                    const p = partants.find((item) => Number(item.numero) === num);
                    if (!p) return false;
                    return getCordeGroup(p) === row.key;
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
                <th className="py-2 px-2 text-center">Musique Récente</th>
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
                    <td className="py-1.5 px-2 text-center text-slate-300 font-mono text-[11px]">{p.musique || '—'}</td>
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

  return (
    <div
      className={`pronostics-jeu-container flex flex-col w-full rounded-2xl border ${
        isDark
          ? 'bg-[#0b1329] border-slate-800 text-white shadow-2xl p-4 sm:p-6'
          : 'bg-white border-slate-200 text-slate-900 shadow-lg p-4 sm:p-6'
      } space-y-6 font-sans`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black uppercase tracking-wider">
            Étape 3 : Grille Stratégique de Synthèse
          </span>
        </div>
      </div>

      {renderSyntheseDeJeuTable()}
      {renderSysteme74Table()}
      {renderVariancePanel()}
      {renderFerrageTable()}
      {renderCordeTable()}
      {renderPerformanceTable()}

      {/* Modal Diagnostic Formule Tandem */}
      <TandemDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        course={course}
      />
    </div>
  );
};
