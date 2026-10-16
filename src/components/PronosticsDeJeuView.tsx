import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Trophy,
  ShieldCheck,
  Flame,
  Crown,
  Zap,
  Target,
  Copy,
  Check,
  TrendingUp,
  AlertCircle,
  Percent,
  Medal,
  Award,
  Gauge,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowUpRight,
  Layers,
  HelpCircle,
  Binary,
  CheckCircle2,
  DollarSign,
  Brain,
  FileText,
  Share2,
  Calculator,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CourseHippique, Partant, CalibrationMethod } from '../types/turf';
import {
  computeTabularEnsembleAnalysis,
  recalibratePredictionsWithTemperature
} from '../utils/tabularRankingEngine';
import { computeV38Hierarchy, getHorseGenyOdds } from '../utils/v38Helper';
import { calculerPerformanceTandem, calculerPerformanceDriverJockey, getPartantDriverMusique } from '../utils/turfCalculations';
import { scrollToTopInstant } from '../utils/scrollHelper';
import { TandemDiagnosticModal } from './TandemDiagnosticModal';

interface PronosticsDeJeuViewProps {
  course: CourseHippique;
  selectedHorseNumbers?: number[];
  onSelectHorseForTicket?: (numero: number) => void;
  onOpenMusiqueDecoder?: (musique: string, nom: string) => void;
  onNavigateToTriosIa?: () => void;
}

export const PronosticsDeJeuView: React.FC<PronosticsDeJeuViewProps> = ({
  course,
  selectedHorseNumbers = [],
  onSelectHorseForTicket,
  onOpenMusiqueDecoder,
  onNavigateToTriosIa,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(1.15);
  const [wCat, setWCat] = useState<number>(0.65);
  const [wLgb, setWLgb] = useState<number>(0.35);
  const [calibrationMethod, setCalibrationMethod] = useState<CalibrationMethod>('softmax_temperature');
  const [showModelDetails, setShowModelDetails] = useState<boolean>(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'BASE' | 'OUTSIDER' | 'TOCARD' | 'DELAISSE' | 'VALUE'>('ALL');

  // Mode de tri pour la catégorie DÉLAISSÉS (Demandé par l'utilisateur: classer les délaissés en fonction de leur cote)
  const [delaissesSortMode, setDelaissesSortMode] = useState<'asc_odds' | 'desc_odds' | 'p_win' | 'asc_number' | 'desc_number'>('asc_odds');

  // Gestion de l'arrivée officielle / simulation
  const [customArrivalInput, setCustomArrivalInput] = useState<string>(course?.arriveeOfficielle || '');
  const [activeArrival, setActiveArrival] = useState<number[]>(() => {
    const raw = course?.arriveeOfficielle || '';
    if (!raw) return [];
    return raw.split(/[-,\s]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
  });

  React.useEffect(() => {
    scrollToTopInstant();
  }, [course?.sourceUrl]);

  React.useEffect(() => {
    if (course?.arriveeOfficielle) {
      setCustomArrivalInput(course.arriveeOfficielle);
      const parsed = course.arriveeOfficielle
        .split(/[-,\s]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);
      setActiveArrival(parsed);
    }
  }, [course?.arriveeOfficielle]);

  const handleApplyArrival = () => {
    const parsed = customArrivalInput
      .split(/[-,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    setActiveArrival(parsed);
  };

  // Discipline de la course
  const discipline = course.discipline || 'Trot Attelé';

  // 1. Calcul de l'Analyse d'Ensemble Tabulaire Spécialisée par Discipline
  const tabularAnalysis = useMemo(() => {
    return computeTabularEnsembleAnalysis(course);
  }, [course]);

  // 2. Application de la Calibration et du Blending CatBoost (wCat%) + LightGBM LambdaRank (wLgb%)
  const calibratedRunners = useMemo(() => {
    if (!tabularAnalysis?.runnersPredictions) return [];
    return recalibratePredictionsWithTemperature(
      tabularAnalysis.runnersPredictions,
      temperature,
      calibrationMethod,
      wCat,
      wLgb
    );
  }, [tabularAnalysis, temperature, calibrationMethod, wCat, wLgb]);

  // 3. Extraction Algorithmique Avancée par Catégorie
  // BASE INCONTOURNABLE : Top 2 chevaux aux probabilités combinées les plus élevées
  const basesIncontournables = useMemo(() => {
    return calibratedRunners
      .filter((r) => r.category === 'BASE INCONTOURNABLE' && !r.estNonPartant)
      .slice(0, 2);
  }, [calibratedRunners]);

  // OUTSIDER SÉDUISANT : Rang 3 à 6 avec fort taux de podium P(Top 3)
  const outsidersSeduisants = useMemo(() => {
    return calibratedRunners
      .filter((r) => r.category === 'OUTSIDER SÉDUISANT' && !r.estNonPartant)
      .slice(0, 4);
  }, [calibratedRunners]);

  // SELECTION GROS RAPPORTS (CAPABLES D'EXPLOIT) & TOCARDS SPÉCULATIFS
  // 1. Source filtrée : Uniquement CAPABLES D'EXPLOITS ou DÉLAISSÉ
  const sourceCapablesExploit = useMemo(() => {
    return calibratedRunners
      .filter((r) => (r.category === "CAPABLES D'EXPLOITS" || r.category === 'DÉLAISSÉ') && !r.estNonPartant)
      .sort((a, b) => {
        const coteA = Number(a.coteProbable) || 999;
        const coteB = Number(b.coteProbable) || 999;
        if (coteA !== coteB) return coteA - coteB;
        return a.numero - b.numero;
      });
  }, [calibratedRunners]);

  // 2. Capables d'exploit : Strictement les 4 plus petites cotes de la source
  const delaisses = useMemo(() => {
    return sourceCapablesExploit.slice(0, 4);
  }, [sourceCapablesExploit]);

  // 3. Tocards spéculatifs : Le reste de la source + les autres partants non classés
  const tocardsSpeculatifs = useMemo(() => {
    const exploitRestants = sourceCapablesExploit.slice(4);
    
    // Autres partants (ni Base, ni Outsider, ni dans Capables d'exploit/Delaisses)
    const autresPartants = calibratedRunners.filter(r => 
        !r.estNonPartant && 
        r.category !== 'BASE INCONTOURNABLE' && 
        r.category !== 'OUTSIDER SÉDUISANT' &&
        r.category !== "CAPABLES D'EXPLOITS" &&
        r.category !== 'DÉLAISSÉ'
    );
    
    return [...exploitRestants, ...autresPartants].sort((a, b) => {
      const coteA = Number(a.coteProbable) || 999;
      const coteB = Number(b.coteProbable) || 999;
      if (coteA !== coteB) return coteA - coteB;
      return a.numero - b.numero;
    });
  }, [sourceCapablesExploit, calibratedRunners]);

  const rawDelaisses = delaisses;

  // 5. SIMPLE GAGNANT VALUE : Tous les partants actifs triés par Edge calculé décroissant
  const simpleGagnantValueRunners = useMemo(() => {
    return [...calibratedRunners]
      .filter((r) => !r.estNonPartant)
      .map((r) => {
        const cote = Number(r.coteProbable) || 15;
        const pImplicit = 100 / Math.max(1.1, cote);
        const edge = r.pVictoire - pImplicit;
        const rendementEspere = (r.pVictoire / 100) * cote * 100;
        return {
          ...r,
          cote,
          pImplicit,
          edge,
          rendementEspere,
        };
      })
      .sort((a, b) => b.edge - a.edge);
  }, [calibratedRunners]);

  // Évaluation de l'arrivée officielle / renseignée
  const arrivalDetails = useMemo(() => {
    if (activeArrival.length === 0) return null;

    const runnerMap = new Map<number, typeof calibratedRunners[0]>();
    calibratedRunners.forEach((r) => runnerMap.set(r.numero, r));

    const evaluatedPositions = activeArrival.slice(0, 5).map((num, idx) => {
      const runner = runnerMap.get(num);
      return {
        position: idx + 1,
        numero: num,
        runner,
        category: runner ? runner.category : 'INCONTU',
        cote: runner?.coteProbable || null,
        delaisseRankByOdds: runner && runner.category === 'DÉLAISSÉ'
          ? [...rawDelaisses].sort((a, b) => (Number(a.coteProbable) || 999) - (Number(b.coteProbable) || 999)).findIndex(r => r.numero === num) + 1
          : null
      };
    });

    const basesHit = evaluatedPositions.filter((p) => p.category === 'BASE INCONTOURNABLE');
    const outsidersHit = evaluatedPositions.filter((p) => p.category === 'OUTSIDER SÉDUISANT');
    const tocardsHit = evaluatedPositions.filter((p) => p.category === 'TOCARD SPÉCULATIF');
    const delaissesHit = evaluatedPositions.filter((p) => p.category === 'DÉLAISSÉ');

    return {
      evaluatedPositions,
      basesHitCount: basesHit.length,
      outsidersHitCount: outsidersHit.length,
      tocardsHitCount: tocardsHit.length,
      delaissesHit,
      hasDelaisseInTop5: delaissesHit.length > 0,
    };
  }, [activeArrival, calibratedRunners, rawDelaisses]);

  // Non partants
  const nonPartants = useMemo(() => {
    return calibratedRunners.filter((r) => r.estNonPartant || r.category === 'NON-PARTANT');
  }, [calibratedRunners]);

  // Classement des jockeys/drivers selon les numéros de partants (demandé par l'utilisateur)
  // Triés au sein de chaque groupe par cote (de la plus basse/favorite à la plus haute/outsider)
  const sortByCoteAsc = (a: any, b: any) => {
    const coteA = Number(a.coteProbable) || 999;
    const coteB = Number(b.coteProbable) || 999;
    if (coteA !== coteB) return coteA - coteB;
    return (a.numero || 0) - (b.numero || 0);
  };

  // FORME RECENTE : les 6 1er numéros (1 à 6) - classés par cote
  const jockeysFormeRecente = useMemo(() => {
    return calibratedRunners
      .filter((r) => !r.estNonPartant && r.numero >= 1 && r.numero <= 6)
      .sort(sortByCoteAsc);
  }, [calibratedRunners]);

  // FORME MOYENNE : 7e, 8e, 9e, 10e numéros (7 à 10) - classés par cote
  const jockeysFormeMoyenne = useMemo(() => {
    return calibratedRunners
      .filter((r) => !r.estNonPartant && r.numero >= 7 && r.numero <= 10)
      .sort(sortByCoteAsc);
  }, [calibratedRunners]);

  // MEFORME : les numéros au delà de 10 (> 10) - classés par cote
  const jockeysMeforme = useMemo(() => {
    return calibratedRunners
      .filter((r) => !r.estNonPartant && r.numero > 10)
      .sort(sortByCoteAsc);
  }, [calibratedRunners]);

  // Croisement dynamique TABLEAU RECAP : Lignes (Catégories Performance Tandem <=20, <=30, <=36, >36) × Colonnes (Forme : EN FORME, MOYENNE, EXPLOIT, MÉFORME)
  const tandemRowsView = useMemo(() => {
    const oddsMap = new Map<number, number>();
    (course.partants || []).forEach((p) => {
      oddsMap.set(Number(p.numero), getHorseGenyOdds(p));
    });

    const sortByOdds = (a: number, b: number) => {
      const cA = oddsMap.get(a) ?? 999;
      const cB = oddsMap.get(b) ?? 999;
      if (cA !== cB) return cA - cB;
      return a - b;
    };

    const activePartants = (course.partants || []).filter(
      (p) => !p.estNonPartant && p.statut !== 'Non-partant'
    );

    // Forme classement drivers/jockeys
    const sortedByDriverPerf = [...activePartants].sort((a, b) => {
      const perfA = calculerPerformanceDriverJockey(getPartantDriverMusique(a)).totalPoints;
      const perfB = calculerPerformanceDriverJockey(getPartantDriverMusique(b)).totalPoints;
      if (perfA !== perfB) return perfA - perfB;
      const coteA = getHorseGenyOdds(a);
      const coteB = getHorseGenyOdds(b);
      if (coteA !== coteB) return coteA - coteB;
      return Number(a.numero) - Number(b.numero);
    });

    const enFormeSet = new Set(sortedByDriverPerf.slice(0, 6).map((p) => Number(p.numero)));
    const formeMoyenneSet = new Set(sortedByDriverPerf.slice(6, 10).map((p) => Number(p.numero)));

    const restDrivers = sortedByDriverPerf.slice(10);
    const capableExploitSet = new Set<number>();
    const meformeSet = new Set<number>();

    restDrivers.forEach((p) => {
      const cote = getHorseGenyOdds(p);
      const num = Number(p.numero);
      if (cote <= 8.0) {
        capableExploitSet.add(num);
      } else {
        meformeSet.add(num);
      }
    });

    const categories = [
      {
        key: 'ELITE_TOP',
        badgeLabel: '⭐ ÉLITE / TOP',
        subLabel: '(<= 18 pts)',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
        minPts: 0,
        maxPts: 18,
      },
      {
        key: 'REGULIER',
        badgeLabel: '🟢 RÉGULIER',
        subLabel: '(<= 24 pts)',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        minPts: 19,
        maxPts: 24,
      },
      {
        key: 'CORRECT',
        badgeLabel: '🟡 CORRECT',
        subLabel: '(<= 36 pts)',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        minPts: 25,
        maxPts: 36,
      },
      {
        key: 'IRREGULIER',
        badgeLabel: '🔴 IRRÉGULIER',
        subLabel: '(> 36 pts)',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        minPts: 37,
        maxPts: 999,
      },
    ];

    const usedInTandemTable = new Set<number>();

    return categories.map((cat) => {
      const rowPartants = activePartants.filter((p) => {
        const perfRes = calculerPerformanceTandem(p.musique, getPartantDriverMusique(p));
        return perfRes.totalPoints >= cat.minPts && perfRes.totalPoints <= cat.maxPts;
      });

      const favs: number[] = []; // 🟢 EN FORME
      const outs: number[] = []; // 🟡 MOYENNE
      const tocs: number[] = []; // ⚡ CAPABLES D'EXPLOIT
      const surps: number[] = []; // 🔴 MÉFORME

      rowPartants.forEach((p) => {
        const num = Number(p.numero);
        if (usedInTandemTable.has(num)) return;
        usedInTandemTable.add(num);

        if (enFormeSet.has(num)) favs.push(num);
        else if (formeMoyenneSet.has(num)) outs.push(num);
        else if (capableExploitSet.has(num)) tocs.push(num);
        else if (meformeSet.has(num)) surps.push(num);
        else {
          if (cat.key === 'ELITE_TOP') favs.push(num);
          else if (cat.key === 'REGULIER') outs.push(num);
          else if (cat.key === 'CORRECT') tocs.push(num);
          else surps.push(num);
        }
      });

      favs.sort(sortByOdds);
      outs.sort(sortByOdds);
      tocs.sort(sortByOdds);
      surps.sort(sortByOdds);

      const isIrregulier = cat.key === 'IRREGULIER';

      const finalFavs = isIrregulier ? favs.slice(0, 2) : favs;
      const finalOuts = isIrregulier ? outs.slice(0, 2) : outs;
      const finalTocs = isIrregulier ? tocs.slice(0, 2) : tocs;
      const finalSurps = isIrregulier ? surps.slice(0, 2) : surps.slice(0, 3);

      return {
        ...cat,
        favs: finalFavs,
        outs: finalOuts,
        tocs: finalTocs,
        surps: finalSurps,
      };
    });
  }, [course]);

  // Helper de Copie vers le presse-papier
  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Fiche Synthétique - Pronostics de Jeu", 10, 15);

    doc.setFontSize(12);
    doc.text("Capables d'Exploits", 10, 25);
    (doc as any).autoTable({
      head: [['N°', 'Nom', 'Cote', 'Justification']],
      body: delaisses.map(r => [r.numero, r.nom, r.coteProbable, r.decisionJustification]),
      startY: 30,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Tocards Spéculatifs", 10, finalY);
    (doc as any).autoTable({
      head: [['N°', 'Nom', 'Cote', 'Justification']],
      body: tocardsSpeculatifs.slice(0, 10).map(r => [r.numero, r.nom, r.coteProbable, r.decisionJustification]),
      startY: finalY + 5,
    });

    doc.save('pronostics_jeu.pdf');
  };

  const handleShare = async () => {
    const shareText = `🎯 PRONOSTICS DE JEU - ${course.hippodrome || 'Course'} (${course.reunion || 'R1'}C${course.course || 'C1'})

👑 Base Incontournable: ${basesIncontournables.map(b => `N°${b.numero} (${b.nom})`).join(', ')}
⭐ Outsider Séduisant: ${outsidersSeduisants.map(o => `N°${o.numero} (${o.nom})`).join(', ')}
⚡ Capables d'Exploits: ${delaisses.map(d => `N°${d.numero} (${d.nom})`).join(', ')}
🔥 Tocards Spéculatifs: ${tocardsSpeculatifs.slice(0, 4).map(t => `N°${t.numero} (${t.nom})`).join(', ')}

Généré par HippoAnalyse Studio V38`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pronostics de Jeu - HippoAnalyse',
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Résumé copié dans le presse-papiers (Web Share API non supporté).');
    }
  };

  // Helper de badge discipline avec nom officiel du moteur cloisonné
  const getDisciplineBadge = (disc: string) => {
    if (disc.includes('Attelé') || disc.includes('Attele') || disc.includes('Harnais')) {
      return { label: 'Trot Attelé (trot_attele_rk_deferrage_v1)', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    if (disc.includes('Monté') || disc.includes('Monte')) {
      return { label: 'Trot Monté (trot_monte_weight_rk_jockey_v1)', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
    }
    if (disc.includes('Plat')) {
      return { label: 'Plat Speed & Draw (plat_speed_draw_v1)', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
    return { label: 'Obstacles Jumping (obstacle_jump_stamina_going_v1)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  const discBadge = getDisciplineBadge(discipline);

  // Combinaison synthétique Quinté+ Recommandée
  const quinteTicketNums = useMemo(() => {
    const nums: number[] = [];
    basesIncontournables.forEach(b => nums.push(b.numero));
    outsidersSeduisants.forEach(o => nums.push(o.numero));
    tocardsSpeculatifs.forEach(t => nums.push(t.numero));
    return Array.from(new Set(nums)).slice(0, 8);
  }, [basesIncontournables, outsidersSeduisants, tocardsSpeculatifs]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-slate-200">
      {/* HEADER : PRONOSTIC DE JEU AVEC MODÈLES SPÉCIALISÉS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/50 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${discBadge.bg}`}>
                <Activity className="w-3.5 h-3.5" />
                <span>{discBadge.label}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider">
                <Binary className="w-3.5 h-3.5" />
                <span>Blending CatBoost ({(wCat * 100).toFixed(0)}%) + LightGBM ({(wLgb * 100).toFixed(0)}%)</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
              <span>PRONOSTIC DE JEU</span>
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Catégorisation algorithmique avancée par modèles de discipline spécialisés (<strong className="text-amber-300">Trot attelé, Trot monté, Plat, Haies, Steeple / Cross</strong>). Calibration chronologique des probabilités et calcul de l'Edge spéculatif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onNavigateToTriosIa && (
              <button
                type="button"
                onClick={onNavigateToTriosIa}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border border-indigo-400 text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                title="Consulter le Hub Multi-IA : Programmer (ChatGPT + DeepSeek + Gemini) • Analyser (DeepSeek + Gemini + Perplexity) • Comparer (Qwen + Kimi + GLM)"
              >
                <Brain className="w-4 h-4 text-indigo-300" />
                <span>Hub Multi-IA (9 IA)</span>
              </button>
            )}
            <button
              onClick={() => setShowModelDetails(!showModelDetails)}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-2 transition-all shadow-md"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Ajuster Modèle & Calibration</span>
              {showModelDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* REGLAGES DYNAMIQUES DU MODÈLE ET CALIBRATION */}
        {showModelDetails && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/80 rounded-2xl p-5 border border-amber-500/30 animate-fadeIn">
            <div>
              <label className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4" />
                <span>Température Softmax (T = {temperature.toFixed(2)})</span>
              </label>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                T &lt; 1.0 : Accentue les favoris. T &gt; 1.0 : Lisse les probabilités.
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4" />
                <span>Poids Blending (CatBoost / LightGBM)</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={wCat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setWCat(val);
                  setWLgb(1 - val);
                }}
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-bold mt-1 text-slate-300">
                <span className="text-emerald-400">CatBoost: {(wCat * 100).toFixed(0)}%</span>
                <span className="text-blue-400">LightGBM: {(wLgb * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-2 mb-2">
                <Sliders className="w-4 h-4" />
                <span>Méthode de Calibration Chronologique</span>
              </label>
              <select
                value={calibrationMethod}
                onChange={(e) => setCalibrationMethod(e.target.value as CalibrationMethod)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="softmax_temperature">Softmax + Température T</option>
                <option value="platt_scaling">Platt Scaling (Régression Logistique)</option>
                <option value="isotonic">Isotonic Regression (Non-paramétrique)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Ajuste les prédictions brutes vers la réalité historique observée.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MODULE D'AUDIT & D'ÉVALUATION PAR L'ARRIVÉE OFFICIELLE */}
      <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  ÉVALUATION & AUDIT DES PRONOSTICS PAR L'ARRIVÉE
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {activeArrival.length > 0 ? '🏁 Arrivée Certifiée' : '📡 Saisie / Simulation Live'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Renseignez l'ordre d'arrivée des 5 premiers chevaux (ex: <code className="text-emerald-300 font-mono">3 - 9 - 4 - 8 - 12</code>) pour vérifier l'exactitude des BASES, OUTSIDERS, CAPABLES D'EXPLOITS et TOCARDS SPÉCULATIFS retenus.
              </p>
            </div>
          </div>

          {/* Formulaire de Saisie / Ajustement rapide de l'arrivée */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            <input
              type="text"
              value={customArrivalInput}
              onChange={(e) => setCustomArrivalInput(e.target.value)}
              placeholder="Ex: 3-9-4-8-12"
              className="bg-slate-900 text-white font-mono font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 w-36 sm:w-44 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleApplyArrival}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Évaluer</span>
            </button>
          </div>
        </div>

        {/* AFFICHAGE DES RÉSULTATS DE L'ARRIVÉE SI DISPONIBLE */}
        {arrivalDetails && arrivalDetails.evaluatedPositions.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {arrivalDetails.evaluatedPositions.map((pos) => {
                const isBase = pos.category === 'BASE INCONTOURNABLE';
                const isOutsider = pos.category === 'OUTSIDER SÉDUISANT';
                const isTocard = pos.category === 'TOCARD SPÉCULATIF';
                const isExploit = pos.category === "CAPABLES D'EXPLOITS" || pos.category === 'DÉLAISSÉ';

                return (
                  <div
                    key={`arrival-pos-${pos.position}-${pos.numero}`}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isBase
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : isOutsider
                        ? 'bg-blue-950/40 border-blue-500/60'
                        : isExploit
                        ? 'bg-orange-950/40 border-orange-500/60'
                        : isTocard
                        ? 'bg-purple-950/40 border-purple-500/60'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                        pos.position === 1 ? 'bg-amber-400 text-slate-950' :
                        pos.position === 2 ? 'bg-slate-300 text-slate-950' :
                        pos.position === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {pos.position === 1 ? '🥇 1er' : pos.position === 2 ? '🥈 2e' : pos.position === 3 ? '🥉 3e' : `${pos.position}e`}
                      </span>
                      <span className="font-mono text-xs font-black text-slate-300">
                        {pos.cote ? `${pos.cote}/1` : '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-slate-800 text-white font-black text-sm flex items-center justify-center border border-slate-700 shrink-0">
                        {pos.numero}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-white text-xs truncate">
                          {pos.runner ? pos.runner.nom : `N°${pos.numero}`}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {pos.runner ? pos.runner.driver : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isBase ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        isOutsider ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        isExploit ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                        isTocard ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isExploit ? "CAPABLES D'EXPLOITS" : pos.category}
                      </span>
                      {isExploit && pos.delaisseRankByOdds && (
                        <span className="text-[9px] font-mono text-orange-300/90 font-bold">
                          Exploit #{pos.delaisseRankByOdds} (Cote)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Alerte spécifique pour les capables d'exploits figurant à l'arrivée */}
            {arrivalDetails.hasDelaisseInTop5 && (
              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/40 flex items-center gap-3 text-orange-200 text-xs">
                <Sparkles className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <strong className="text-orange-300">Exploit Confirmé à l'Arrivée : </strong>
                  {arrivalDetails.delaissesHit.map(d => `Le cheval N°${d.numero} (${d.runner?.nom || 'Inconnu'}) à la cote de ${d.cote || '-'}/1 se classe ${d.position}e à l'arrivée (Rang #${d.delaisseRankByOdds} parmi les cotes).`).join(' ')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-center">
            En attente de la publication de l'arrivée ou entrez directement les numéros ci-dessus pour simuler et auditer la performance du modèle.
          </div>
        )}
      </div>

      {/* RAPPEL VISUEL DE LA CATÉGORISATION ALGORITHMIQUE AVANCÉE */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-all cursor-pointer shadow-md"
        >
          <Share2 className="w-4 h-4" />
          Partager
        </button>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-all cursor-pointer shadow-md"
        >
          <FileText className="w-4 h-4" />
          Exporter Pronostics de Jeu en PDF
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* BASE INCONTOURNABLE */}
        <div
          onClick={() => setActiveCategoryTab(activeCategoryTab === 'BASE' ? 'ALL' : 'BASE')}
          className={`cursor-pointer bg-slate-900/90 rounded-2xl p-4 border-2 transition-all hover:scale-[1.02] ${
            activeCategoryTab === 'BASE'
              ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/20'
              : 'border-emerald-500/40 hover:border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>TOP 2 IA</span>
            </span>
            <span className="text-lg font-black text-emerald-400">{basesIncontournables.length}</span>
          </div>
          <div className="text-xs font-black text-white uppercase tracking-wider">BASE INCONTOURNABLE</div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
            Top 2 chevaux aux probabilités combinées les plus élevées (P_blend).
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {basesIncontournables.map((b) => (
              <span key={`badge-base-${b.numero}`} className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                {b.numero}
              </span>
            ))}
          </div>
        </div>

        {/* OUTSIDER SÉDUISANT */}
        <div
          onClick={() => setActiveCategoryTab(activeCategoryTab === 'OUTSIDER' ? 'ALL' : 'OUTSIDER')}
          className={`cursor-pointer bg-slate-900/90 rounded-2xl p-4 border-2 transition-all hover:scale-[1.02] ${
            activeCategoryTab === 'OUTSIDER'
              ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-950/20'
              : 'border-amber-500/40 hover:border-amber-500'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              <span>RANG 3 À 6</span>
            </span>
            <span className="text-lg font-black text-amber-400">{outsidersSeduisants.length}</span>
          </div>
          <div className="text-xs font-black text-white uppercase tracking-wider">OUTSIDER SÉDUISANT</div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
            Rang 3 à 6 avec fort taux de podium (P(Top 3) &ge; 35%).
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {outsidersSeduisants.map((o) => (
              <span key={`badge-outsider-${o.numero}`} className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                {o.numero}
              </span>
            ))}
          </div>
        </div>

        {/* CAPABLES D'EXPLOITS (GROS RAPPORT : 5 Petites Cotes + Tocards Spéculatifs) */}
        <div
          onClick={() => setActiveCategoryTab(activeCategoryTab === 'DELAISSE' ? 'ALL' : 'DELAISSE')}
          className={`cursor-pointer bg-slate-900/90 rounded-2xl p-4 border-2 transition-all hover:scale-[1.02] ${
            activeCategoryTab === 'DELAISSE'
              ? 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-950/20'
              : 'border-orange-500/50 hover:border-orange-500'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>GROS RAPPORT</span>
            </span>
            <span className="text-lg font-black text-orange-400">{delaisses.length}</span>
          </div>
          <div className="text-xs font-black text-white uppercase tracking-wider">CAPABLES D'EXPLOITS</div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
            4 plus petites cotes de la course (bases solides).
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {delaisses.map((d) => (
              <span key={`badge-petite-cote-${d.numero}`} className="w-6 h-6 rounded-md bg-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center justify-center border border-amber-500/50" title="Petite cote">
                {d.numero}
              </span>
            ))}
            {tocardsSpeculatifs.slice(0, 3).map((d) => (
              <span key={`badge-delaisse-${d.numero}`} className="w-6 h-6 rounded-md bg-orange-500/20 text-orange-300 font-bold text-[10px] flex items-center justify-center border border-orange-500/40" title="Tocard spéculatif">
                {d.numero}
              </span>
            ))}
            {tocardsSpeculatifs.length > 3 && (
              <span className="text-[10px] text-orange-400 font-bold">+{tocardsSpeculatifs.length - 3}</span>
            )}
          </div>
        </div>

        {/* TOCARD SPÉCULATIF */}
        <div
          onClick={() => setActiveCategoryTab(activeCategoryTab === 'TOCARD' ? 'ALL' : 'TOCARD')}
          className={`cursor-pointer bg-slate-900/90 rounded-2xl p-4 border-2 transition-all hover:scale-[1.02] ${
            activeCategoryTab === 'TOCARD'
              ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-950/20'
              : 'border-purple-500/40 hover:border-purple-500'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>EDGE POSITIF</span>
            </span>
            <span className="text-lg font-black text-purple-400">{tocardsSpeculatifs.length}</span>
          </div>
          <div className="text-xs font-black text-white uppercase tracking-wider">TOCARD SPÉCULATIF</div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
            Edge positif (P_calibrée - P_implicite &gt; 0) apportant de la valeur attendue (EV+).
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {tocardsSpeculatifs.map((t) => (
              <span key={`badge-tocard-${t.numero}`} className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {t.numero}
              </span>
            ))}
          </div>
        </div>

        {/* SIMPLE GAGNANT VALUE */}
        <div
          onClick={() => setActiveCategoryTab(activeCategoryTab === 'VALUE' ? 'ALL' : 'VALUE')}
          className={`cursor-pointer bg-slate-900/90 rounded-2xl p-4 border-2 transition-all hover:scale-[1.02] ${
            activeCategoryTab === 'VALUE'
              ? 'border-emerald-400 ring-2 ring-emerald-400/30 bg-emerald-950/20'
              : 'border-emerald-500/40 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>SIMPLE VALUE</span>
            </span>
            <span className="text-lg font-black text-emerald-400">{simpleGagnantValueRunners.length}</span>
          </div>
          <div className="text-xs font-black text-white uppercase tracking-wider">SIMPLE GAGNANT VALUE</div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
            Classement par Edge calculé et Rendement Espéré (P_blend × Cote).
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {simpleGagnantValueRunners.slice(0, 4).map((v) => (
              <span key={`badge-value-${v.numero}`} className="w-6 h-6 rounded-md bg-emerald-500/30 text-emerald-300 font-bold text-[10px] flex items-center justify-center border border-emerald-500/50" title={`Edge: +${v.edge.toFixed(1)}%`}>
                {v.numero}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CATEGORIE 1 : BASE INCONTOURNABLE */}
      {(activeCategoryTab === 'ALL' || activeCategoryTab === 'BASE') && (
        <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    BASE INCONTOURNABLE
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950">
                    Top 2 Chevaux Probabilités Combinées
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Les 2 chevaux avec les probabilités combinées CatBoost + LightGBM LambdaRank les plus élevées de la course.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {basesIncontournables.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      basesIncontournables.map((p) => p.numero).join(' - '),
                      'base'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold transition-all border border-emerald-500/30"
                >
                  {copiedSection === 'base' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'base' ? 'Copié !' : 'Copier Bases'}</span>
                </button>
              )}

              {onSelectHorseForTicket && basesIncontournables.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    basesIncontournables.forEach((p) => onSelectHorseForTicket(p.numero));
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Charger au Ticket</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {basesIncontournables.map((runner, idx) => {
              const isSelected = selectedHorseNumbers.includes(runner.numero);
              const cote = runner.coteProbable || 3.5;

              return (
                <div
                  key={`base-runner-${runner.numero}`}
                  className={`bg-slate-950/90 border rounded-2xl p-5 space-y-4 transition-all hover:border-emerald-500/80 ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-950/20'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-lg shadow-emerald-500/25 shrink-0">
                        <span className="text-2xl leading-none">{runner.numero}</span>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-900 mt-0.5">
                          Base #{idx + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-white text-lg leading-tight">
                          {runner.nom}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-amber-300 font-bold">{runner.driver}</span>
                          <span>•</span>
                          <span>Entr. {runner.entraineur}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-sm border border-emerald-500/40 shadow-xs">
                        {cote}/1
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-bold">Cote PMU</div>
                    </div>
                  </div>

                  {/* PROBABILITÉS COMBINÉES CATBOOST + LIGHTGBM */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-850">
                    <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">P(Victoire) Calibrée</div>
                      <div className="text-base font-black text-emerald-400 mt-0.5">{runner.pVictoireFormatted}</div>
                    </div>
                    <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">P(Top 3) Podium</div>
                      <div className="text-base font-black text-amber-400 mt-0.5">{runner.pTop3Formatted}</div>
                    </div>
                    <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Score LambdaRank</div>
                      <div className="text-base font-black text-blue-400 mt-0.5">{runner.lambdaRankScore}/100</div>
                    </div>
                  </div>

                  {/* DÉCISION JUSTIFIÉE PAR L'IA */}
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 text-xs leading-relaxed text-emerald-200">
                    <strong className="text-emerald-400">Verdict Algorithmique : </strong>
                    {runner.decisionJustification}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORIE 2 : OUTSIDER SÉDUISANT */}
      {(activeCategoryTab === 'ALL' || activeCategoryTab === 'OUTSIDER') && (
        <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    OUTSIDER SÉDUISANT
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                    Rang 3 à 6 • Fort Taux de Podium
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Partants situés entre le rang 3 et 6 de l'IA bénéficiant d'un taux de podium P(Top 3) élevé pour pimenter les jeux réduits.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {outsidersSeduisants.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      outsidersSeduisants.map((p) => p.numero).join(' - '),
                      'outsider'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all border border-amber-500/30"
                >
                  {copiedSection === 'outsider' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'outsider' ? 'Copié !' : 'Copier Outsiders'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outsidersSeduisants.map((runner) => {
              const isSelected = selectedHorseNumbers.includes(runner.numero);
              const cote = runner.coteProbable || 8.5;

              return (
                <div
                  key={`outsider-runner-${runner.numero}`}
                  className={`bg-slate-950/90 border rounded-2xl p-4.5 space-y-3 transition-all hover:border-amber-500/80 ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-950/20'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
                        <span className="text-xl leading-none">{runner.numero}</span>
                      </div>
                      <div>
                        <div className="font-black text-white text-base leading-tight">
                          {runner.nom}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {runner.driver} • Entr. {runner.entraineur}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/40">
                        {cote}/1
                      </span>
                    </div>
                  </div>

                  {/* BARRE DE PODIUM P(TOP 3) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Taux de Podium P(Top 3)</span>
                      <span className="text-amber-400 font-black">{runner.pTop3Formatted}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, runner.pTop3)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
                    <span className="text-amber-400 font-bold">Rôle : </span>
                    {runner.decisionJustification}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORIE 3 : CAPABLES D'EXPLOITS / GROS RAPPORT (4 Petites Cotes) */}
      {(activeCategoryTab === 'ALL' || activeCategoryTab === 'DELAISSE') && (
        <div className="bg-slate-900/95 border-2 border-orange-500/50 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase">
                    CAPABLES D'EXPLOITS / GROS RAPPORT ({delaisses.length})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/40">
                    4 Plus Petites Cotes
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sélection Gros Rapports : les 4 plus petites cotes de la course.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-center">Rang</th>
                  <th className="p-3 text-center">Groupe</th>
                  <th className="p-3 text-center">N°</th>
                  <th className="p-3 text-center">Cheval</th>
                  <th className="p-3 text-center">Pilote / Entraîneur</th>
                  <th className="p-3 text-center">Cote PMU</th>
                  <th className="p-3 text-center">P(Victoire)</th>
                  <th className="p-3 text-center">P(Top 3)</th>
                  <th className="p-3 text-center">Motif Algorithmique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {delaisses.map((runner, idx) => {
                  return (
                    <tr key={`delaisse-row-${runner.numero}`} className="hover:bg-slate-900/50 transition-colors bg-amber-950/10">
                      <td className="p-3 font-mono font-bold text-orange-400/90 text-[11px]">#{idx + 1}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                          <span>⚡</span> Petite Cote
                        </span>
                      </td>
                      <td className="p-3 font-black text-slate-300">{runner.numero}</td>
                      <td className="p-3 font-bold text-white">{runner.nom}</td>
                      <td className="p-3 text-slate-400">{runner.driver}</td>
                      <td className="p-3 font-bold text-amber-300">{runner.coteProbable ? `${runner.coteProbable}/1` : '-'}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{runner.pVictoireFormatted}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{runner.pTop3Formatted}</td>
                      <td className="p-3 text-[11px] text-slate-400 italic">{runner.decisionJustification}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORIE 4 : TOCARD SPÉCULATIF (AUTRES PARTANTS TRIÉS PAR COTE) */}
      {(activeCategoryTab === 'ALL' || activeCategoryTab === 'TOCARD') && (
        <div className="bg-slate-900/95 border-2 border-purple-500/50 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    TOCARD SPÉCULATIF ({tocardsSpeculatifs.length})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-600 text-white flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Triés par Cote</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Les autres partants de la course (après les 4 plus petites cotes), triés par cote.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* BOUTONS DE TRI INTERACTIF DES TOCARDS */}
              <div className="flex items-center gap-1.5 flex-wrap mr-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Trier par :</span>
                <button
                  type="button"
                  onClick={() => setDelaissesSortMode('asc_odds')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    delaissesSortMode === 'asc_odds'
                      ? 'bg-purple-600 text-white font-black shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  📈 Cote Croissante
                </button>
                <button
                  type="button"
                  onClick={() => setDelaissesSortMode('desc_odds')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    delaissesSortMode === 'desc_odds'
                      ? 'bg-purple-600 text-white font-black shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  📉 Cote Décroissante
                </button>
                <button
                  type="button"
                  onClick={() => setDelaissesSortMode('p_win')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    delaissesSortMode === 'p_win'
                      ? 'bg-purple-600 text-white font-black shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  🎯 Probabilité IA
                </button>
                <button
                  type="button"
                  onClick={() => setDelaissesSortMode('asc_number')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    delaissesSortMode === 'asc_number'
                      ? 'bg-purple-600 text-white font-black shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  🔢 N° Dossard
                </button>
              </div>

              {tocardsSpeculatifs.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      tocardsSpeculatifs.map((p) => p.numero).join(' - '),
                      'tocard'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold transition-all border border-purple-500/30"
                >
                  {copiedSection === 'tocard' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'tocard' ? 'Copié !' : 'Copier Tocards'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tocardsSpeculatifs.map((runner) => {
              const isSelected = selectedHorseNumbers.includes(runner.numero);
              const cote = runner.coteProbable || 22;
              const pImplicit = 100 / Math.max(1.5, cote);
              const edgePct = (runner.pVictoire - pImplicit);
              const expectedValue = ((runner.pVictoire / 100) * cote - 1) * 100;

              return (
                <div
                  key={`tocard-runner-${runner.numero}`}
                  className={`bg-slate-950/90 border rounded-2xl p-5 space-y-4 transition-all hover:border-purple-500/80 ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-400/40 bg-purple-950/20'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex flex-col items-center justify-center font-black shadow-lg shadow-purple-500/25 shrink-0 border border-purple-400">
                        <span className="text-2xl leading-none">{runner.numero}</span>
                      </div>
                      <div>
                        <div className="font-black text-white text-base leading-tight">
                          {runner.nom}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {runner.driver} • Entr. {runner.entraineur}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-black text-sm border border-purple-500/40">
                        {cote}/1
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-bold">Cote PMU</div>
                    </div>
                  </div>

                  {/* CALCULS D'EDGE ET D'ESPÉRANCE MATHÉMATIQUE (EV+) */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-850">
                    <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">P(Calibrée)</div>
                      <div className="text-sm font-black text-purple-300 mt-0.5">{runner.pVictoireFormatted}</div>
                    </div>
                    <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">P(Implicite PMU)</div>
                      <div className="text-sm font-black text-slate-400 mt-0.5">{pImplicit.toFixed(1)}%</div>
                    </div>
                    <div className="bg-purple-950/40 rounded-xl p-2.5 border border-purple-500/30">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase">Edge Spéculatif</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">
                        {edgePct >= 0 ? '+' : ''}{edgePct.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-200">
                    <strong className="text-purple-300">Indice Spéculatif : </strong>
                    {runner.decisionJustification}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORIE 5 : SIMPLE GAGNANT VALUE */}
      {(activeCategoryTab === 'ALL' || activeCategoryTab === 'VALUE') && (
        <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase">
                    TABLEAU SIMPLE GAGNANT VALUE ({simpleGagnantValueRunners.length})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Edge & Rendement Espéré
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Évaluation mathématique en Simple Gagnant : classement par Edge calculé (P_calibrée - P_implicite) et Rendement Espéré (P_calibrée × Cote).
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-center">Rang Value</th>
                  <th className="p-3 text-center">N°</th>
                  <th className="p-3 text-center">Cheval</th>
                  <th className="p-3 text-center">Pilote / Entraîneur</th>
                  <th className="p-3 text-center">Cote PMU</th>
                  <th className="p-3 text-center">P(Victoire)</th>
                  <th className="p-3 text-center">P(Implicite)</th>
                  <th className="p-3 text-center">Edge Calculé</th>
                  <th className="p-3 text-center">Rendement Espéré</th>
                  <th className="p-3 text-center">Diagnostic Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {simpleGagnantValueRunners.map((runner, idx) => {
                  const isPositiveEdge = runner.edge >= 0;
                  return (
                    <tr key={`value-row-${runner.numero}`} className={`hover:bg-slate-900/50 transition-colors ${runner.edge > 5 ? 'bg-emerald-950/20' : ''}`}>
                      <td className="p-3 font-mono font-bold text-emerald-400 text-[11px]">#{idx + 1}</td>
                      <td className="p-3 font-black text-slate-300">{runner.numero}</td>
                      <td className="p-3 font-bold text-white">{runner.nom}</td>
                      <td className="p-3 text-slate-400">{runner.driver}</td>
                      <td className="p-3 font-bold text-amber-300">{runner.cote ? `${runner.cote}/1` : '-'}</td>
                      <td className="p-3 text-center font-mono text-slate-300">{runner.pVictoireFormatted}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{runner.pImplicit.toFixed(1)}%</td>
                      <td className="p-3 text-center font-mono font-black">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          isPositiveEdge ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isPositiveEdge ? '+' : ''}{runner.edge.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-black">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          runner.rendementEspere >= 100 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {runner.rendementEspere.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 italic">
                        {isPositiveEdge ? 'Valeur positive (EV+)' : 'Sous le par mathématique'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLASSEMENT DES JOCKEYS & DRIVERS (FORME RÉCENTE, MOYENNE, MÉFORME) */}
      <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              <span>Classement Jockeys / Drivers Officiel</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              CLASSEMENT DES JOCKEYS & DRIVERS PAR FORME
            </h3>
            <p className="text-xs text-slate-400">
              Répartition analytique des professionnels selon leur tranche : <strong className="text-emerald-400">Forme Récente (1 à 6)</strong>, <strong className="text-amber-400">Forme Moyenne (7 à 10)</strong> et <strong className="text-rose-400">Méforme (&gt; 10)</strong> — <em>classés dans chaque groupe par cote (de la plus basse à la plus élevée)</em>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. FORME RÉCENTE (1 à 6) */}
          <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  FORME RÉCENTE (1 à 6)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                {jockeysFormeRecente.length} Pilotes
              </span>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {jockeysFormeRecente.map((runner) => (
                <div key={`forme-rec-${runner.numero}`} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                        {runner.numero}
                      </span>
                      <span className="font-black text-white text-xs truncate max-w-[140px]" title={runner.driver || 'Non renseigné'}>
                        {runner.driver || 'Driver non renseigné'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      {runner.coteProbable ? `${runner.coteProbable}/1` : '-'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-[160px]">Cheval: <strong className="text-slate-200">{runner.nom}</strong></span>
                    <span className="font-mono text-emerald-300">{runner.pTop3Formatted || 'P(Podium)'}</span>
                  </div>
                </div>
              ))}
              {jockeysFormeRecente.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">Aucun partant dans cette tranche</div>
              )}
            </div>
          </div>

          {/* 2. FORME MOYENNE (7 à 10) */}
          <div className="bg-slate-950/90 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  FORME MOYENNE (7 à 10)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">
                {jockeysFormeMoyenne.length} Pilotes
              </span>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {jockeysFormeMoyenne.map((runner) => (
                <div key={`forme-moy-${runner.numero}`} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5 hover:border-amber-500/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                        {runner.numero}
                      </span>
                      <span className="font-black text-white text-xs truncate max-w-[140px]" title={runner.driver || 'Non renseigné'}>
                        {runner.driver || 'Driver non renseigné'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-400">
                      {runner.coteProbable ? `${runner.coteProbable}/1` : '-'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-[160px]">Cheval: <strong className="text-slate-200">{runner.nom}</strong></span>
                    <span className="font-mono text-amber-300">{runner.pTop3Formatted || 'P(Podium)'}</span>
                  </div>
                </div>
              ))}
              {jockeysFormeMoyenne.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">Aucun partant dans cette tranche</div>
              )}
            </div>
          </div>

          {/* 3. MÉFORME (> 10) */}
          <div className="bg-slate-950/90 border-2 border-rose-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">
                  MÉFORME (&gt; 10)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black">
                {jockeysMeforme.length} Pilotes
              </span>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {jockeysMeforme.map((runner) => (
                <div key={`forme-meforme-${runner.numero}`} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5 hover:border-rose-500/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {runner.numero}
                      </span>
                      <span className="font-black text-white text-xs truncate max-w-[140px]" title={runner.driver || 'Non renseigné'}>
                        {runner.driver || 'Driver non renseigné'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-400">
                      {runner.coteProbable ? `${runner.coteProbable}/1` : '-'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-[160px]">Cheval: <strong className="text-slate-200">{runner.nom}</strong></span>
                    <span className="font-mono text-rose-300">{runner.pTop3Formatted || 'P(Podium)'}</span>
                  </div>
                </div>
              ))}
              {jockeysMeforme.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">Aucun partant au-delà du numéro 10</div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* SYNTHÈSE DES TICKETS DE JEU RECOMMANDÉS */}
      <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Combinaisons Optimales</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              TICKETS & COMBINAISONS RECOMMANDÉS
            </h3>
            <p className="text-xs text-slate-400">
              Sélection Quinté+ combinant les Bases, Outsiders et Tocards Spéculatifs de la course.
            </p>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(quinteTicketNums.join(' - '), 'ticket')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 shrink-0"
          >
            {copiedSection === 'ticket' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSection === 'ticket' ? 'Ticket Copié !' : 'Copier le Ticket Quinté'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ticket Quinté 8 Chevaux */}
          <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Quinté+ Champt Réduit / Combiné</span>
              <span className="text-[10px] font-bold text-slate-400">8 Numéros</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {quinteTicketNums.map((num, idx) => (
                <span key={`ticket-num-${num}-${idx}`} className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                  {num}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Combinaison à 8 chevaux intégrant les Bases ({basesIncontournables.map(b => b.numero).join('-')}), Outsiders et Tocards EV+.
            </p>
          </div>

          {/* Ticket Multi 4 */}
          <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">Multi 4 / 2 sur 4 Prioritaire</span>
              <span className="text-[10px] font-bold text-slate-400">4 Numéros</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {[...basesIncontournables, ...outsidersSeduisants].slice(0, 4).map((r, idx) => (
                <span key={`ticket-multi-${r.numero}-${idx}`} className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                  {r.numero}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Ticket condensé sur la plus haute probabilité de podium globale.
            </p>
          </div>

          {/* Ticket Spéculatif Grosses Cotes */}
          <div className="bg-slate-950/90 border border-purple-500/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-purple-400 tracking-wider">Trio Spéculatif EV+</span>
              <span className="text-[10px] font-bold text-slate-400">3 Numéros</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {[basesIncontournables[0], ...tocardsSpeculatifs].filter(Boolean).slice(0, 3).map((r, idx) => (
                <span key={`ticket-spec-${r.numero}-${idx}`} className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md border border-purple-400">
                  {r.numero}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Base prioritaire + Tocards à fort Edge positif pour faire exploser les rapports.
            </p>
          </div>
        </div>

      </div>

      {/* CROISEMENT DYNAMIQUE : TABLEAU RECAP */}
      <div className="bg-slate-900/95 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              <span>Synthèse Croisée Global Tandem & Forme</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              TABLEAU RECAP
            </h3>
            <p className="text-xs text-slate-400">
              Croisement dynamique : <strong className="text-amber-400">Lignes</strong> (Catégories de performance Tandem : Élite/Top &le; 18 pts, Régulier &le; 24 pts, Correct &le; 36 pts, Irrégulier &gt; 36 pts) &times; <strong className="text-cyan-400">Colonnes</strong> (🟢 EN FORME, 🟡 MOYENNE, ⚡ CAPABLES D'EXPLOIT, 🔴 MÉFORME).
            </p>
          </div>

          <button
            onClick={() => setIsDiagnosticModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2 shrink-0 border border-purple-400/30 cursor-pointer"
            title="Lancer le test unitaire sur la formule de calcul Tandem"
          >
            <Calculator className="w-4 h-4 text-purple-200" />
            <span>Diagnostic Formule Tandem</span>
          </button>
        </div>

        {/* Table de croisement dynamique 15cm */}
        <div className="rounded-xl border-2 border-white overflow-x-auto shadow-2xl flex justify-center bg-slate-950 p-2 sm:p-4">
          <div className="overflow-x-auto scrollbar-none w-full flex justify-center py-1">
            <table
              className="table-fixed border-collapse border-2 border-white mx-auto shrink-0"
              style={{ width: '15cm', minWidth: '15cm', maxWidth: '15cm' }}
            >
              <colgroup>
                <col style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} />
                <col style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} />
                <col style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} />
                <col style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} />
                <col style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} />
              </colgroup>
              <thead>
                <tr className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  <th style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-2.5 px-1 bg-[#38bdf8] text-slate-950 font-black text-center border-2 border-white text-xs align-middle">
                    CATEGORIE
                  </th>
                  <th style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-2.5 px-1 bg-[#059669] text-white font-black text-center border-2 border-white text-xs align-middle">
                    🟢 EN FORME
                  </th>
                  <th style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-2.5 px-1 bg-[#f59e0b] text-slate-950 font-black text-center border-2 border-white text-xs align-middle">
                    🟡 MOYENNE
                  </th>
                  <th style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-2.5 px-1 bg-[#0284c7] text-white font-black text-center border-2 border-white text-xs align-middle">
                    ⚡ EXPLOIT
                  </th>
                  <th style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-2.5 px-1 bg-[#dc2626] text-white font-black text-center border-2 border-white text-xs align-middle">
                    🔴 MÉFORME
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#0f172a] text-white font-black">
                {tandemRowsView.map((row) => {
                  return (
                    <tr key={`tandem-pj-row-${row.key}`} className="hover:bg-slate-900/60 transition-colors">
                      <td style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-3 px-1.5 border-2 border-white text-center align-middle bg-slate-900/80">
                        <div className="w-full flex flex-col items-center justify-center gap-0.5 text-center">
                          <span className={`px-2 py-0.5 rounded-md ${row.badgeClass} font-black text-[10px] sm:text-[11px] text-center leading-tight shadow-xs`}>
                            {row.badgeLabel}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold tracking-tight text-center">
                            {row.subLabel}
                          </span>
                        </div>
                      </td>

                      {/* 🟢 EN FORME (1e au 6e) */}
                      <td style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-3 px-1.5 border-2 border-white text-center align-middle">
                        {row.favs.length > 0 ? (
                          <div className="w-full flex items-center justify-center gap-1.5 flex-wrap">
                            {row.favs.map((num) => (
                              <div key={`pj-fav-${row.key}-${num}`} className="w-8 sm:w-9 h-7 rounded-md bg-[#059669] text-white font-mono font-black flex items-center justify-center text-center shadow-md border border-emerald-300/80 shrink-0 text-xs sm:text-sm">
                                {num}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-sm">—</span>
                        )}
                      </td>

                      {/* 🟡 MOYENNE (7e au 10e) */}
                      <td style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-3 px-1.5 border-2 border-white text-center align-middle">
                        {row.outs.length > 0 ? (
                          <div className="w-full flex items-center justify-center gap-1.5 flex-wrap">
                            {row.outs.map((num) => (
                              <div key={`pj-outs-${row.key}-${num}`} className="w-8 sm:w-9 h-7 rounded-md bg-[#f59e0b] text-slate-950 font-mono font-black flex items-center justify-center text-center shadow-md border border-amber-200 shrink-0 text-xs sm:text-sm">
                                {num}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-sm">—</span>
                        )}
                      </td>

                      {/* ⚡ CAPABLES D'EXPLOIT */}
                      <td style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-3 px-1.5 border-2 border-white text-center align-middle">
                        {row.tocs.length > 0 ? (
                          <div className="w-full flex items-center justify-center gap-1.5 flex-wrap">
                            {row.tocs.map((num) => (
                              <div key={`pj-tocs-${row.key}-${num}`} className="w-8 sm:w-9 h-7 rounded-md bg-[#0284c7] text-white font-mono font-black flex items-center justify-center text-center shadow-md border border-cyan-300/80 shrink-0 text-xs sm:text-sm">
                                {num}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-sm">—</span>
                        )}
                      </td>

                      {/* 🔴 MÉFORME */}
                      <td style={{ width: '3cm', minWidth: '3cm', maxWidth: '3cm' }} className="py-3 px-1.5 border-2 border-white text-center align-middle">
                        {row.surps.length > 0 ? (
                          <div className="w-full flex items-center justify-center gap-1.5 flex-wrap">
                            {row.surps.map((num) => (
                              <div key={`pj-surps-${row.key}-${num}`} className="w-8 sm:w-9 h-7 rounded-md bg-[#dc2626] text-white border border-rose-300/80 font-mono font-black flex items-center justify-center text-center shadow-md shrink-0 text-xs sm:text-sm">
                                {num}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-slate-500 font-bold text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Diagnostic Formule Tandem */}
      <TandemDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        course={course}
      />
    </div>
  );
};
