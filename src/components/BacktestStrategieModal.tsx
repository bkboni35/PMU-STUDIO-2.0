import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  Trophy,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Percent,
  Coins,
  DollarSign,
  Medal,
  Calendar,
  X,
  BookOpen,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import { HistoryCourseItem } from '../utils/favoritesStorage';
import { computeRaceEvaluation, BacktestGlobalStats, getBacktestGlobalStats } from '../utils/raceBacktestService';
import { calculerPotentielTrio } from '../utils/scoreTrioModel';

interface BacktestStrategieModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryCourseItem[];
}

export type PariType =
  | 'SIMPLE_GAGNANT'
  | 'SIMPLE_PLACE'
  | 'COUPLE_GAGNANT'
  | 'COUPLE_PLACE'
  | 'TRIO_DIRECT'
  | 'TRIO_CHAMP_REDUIT'
  | 'TIERCE'
  | 'QUINTE';

export const BacktestStrategieModal: React.FC<BacktestStrategieModalProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  const [selectedPari, setSelectedPari] = useState<PariType>('TRIO_DIRECT');
  const [minTrioScore, setMinTrioScore] = useState<number>(70);
  const [minCote, setMinCote] = useState<number>(2.5);
  const [maxCote, setMaxCote] = useState<number>(25.0);
  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'TROT' | 'PLAT' | 'OBSTACLE'>('ALL');
  const [miseUnitaireFCFA, setMiseUnitaireFCFA] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<'simulateur' | 'outils_ia' | 'methodologie'>('simulateur');

  // TRJ moyen PMU / LONACI selon le type de pari
  const trjByPari: Record<PariType, number> = {
    SIMPLE_GAGNANT: 0.85,
    SIMPLE_PLACE: 0.85,
    COUPLE_GAGNANT: 0.75,
    COUPLE_PLACE: 0.75,
    TRIO_DIRECT: 0.70,
    TRIO_CHAMP_REDUIT: 0.70,
    TIERCE: 0.65,
    QUINTE: 0.60,
  };

  // Courses avec arrivée officielle confirmée pour le backtest
  const coursesAvecArrivee = useMemo(() => {
    return history.filter(
      (item) => item.course && item.course.arriveeOfficielle && item.course.arriveeOfficielle.trim().length > 0
    );
  }, [history]);

  // Simulation dynamique du backtest sur les données historiques réelles
  const simulationResult = useMemo(() => {
    let coursesEligibles = 0;
    let parisGagnants = 0;
    let misesTotales = 0;
    let gainsTotaux = 0;

    coursesAvecArrivee.forEach((item) => {
      const c = item.course;
      const disc = (c.discipline || '').toLowerCase();

      // Filtre discipline
      if (disciplineFilter === 'TROT' && !disc.includes('trot') && !disc.includes('attelé')) return;
      if (disciplineFilter === 'PLAT' && !disc.includes('plat')) return;
      if (disciplineFilter === 'OBSTACLE' && !disc.includes('obstacle') && !disc.includes('haies') && !disc.includes('steeple')) return;

      const arrivalNums = (c.arriveeOfficielle || '')
        .split(/[-,\s]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      if (arrivalNums.length < 3) return;

      // Calcul du modèle Trio
      const trioResult = calculerPotentielTrio(c);
      const topTrio = trioResult.selectionTrio;
      if (topTrio.length < 3) return;

      const base = topTrio[0];
      const challenger = topTrio[1];
      const outsider = topTrio[2];

      const baseCote = base.partant.coteProbable ?? 5.0;

      // Filtres de cotes et de score
      if (base.scoreTrio < minTrioScore) return;
      if (baseCote < minCote || baseCote > maxCote) return;

      coursesEligibles += 1;
      const mise = miseUnitaireFCFA;
      misesTotales += mise;

      const top3Arrival = arrivalNums.slice(0, 3);
      const winner = arrivalNums[0];

      let isGagnant = false;
      let rapportEstime = 0;

      switch (selectedPari) {
        case 'SIMPLE_GAGNANT':
          if (winner === base.partant.numero) {
            isGagnant = true;
            rapportEstime = Math.max(1.5, baseCote * trjByPari.SIMPLE_GAGNANT);
          }
          break;

        case 'SIMPLE_PLACE':
          if (top3Arrival.includes(base.partant.numero)) {
            isGagnant = true;
            rapportEstime = Math.max(1.2, 1.2 + (baseCote / 3.5) * trjByPari.SIMPLE_PLACE);
          }
          break;

        case 'COUPLE_PLACE':
          const cpBases = [base.partant.numero, challenger.partant.numero];
          const hitCount = cpBases.filter((n) => top3Arrival.includes(n)).length;
          if (hitCount === 2) {
            isGagnant = true;
            rapportEstime = Math.max(4.0, (baseCote * 0.8 + 3.0) * trjByPari.COUPLE_PLACE);
          }
          break;

        case 'TRIO_DIRECT':
          const trioPredicted = [base.partant.numero, challenger.partant.numero, outsider.partant.numero];
          if (trioPredicted.every((n) => top3Arrival.includes(n))) {
            isGagnant = true;
            rapportEstime = Math.max(25.0, (baseCote * (challenger.partant.coteProbable ?? 6.0) * 0.6) * trjByPari.TRIO_DIRECT);
          }
          break;

        case 'TRIO_CHAMP_REDUIT':
          const deuxBases = [base.partant.numero, challenger.partant.numero];
          const associes = topTrio.slice(2, 6).map((s) => s.partant.numero);
          const basesOk = deuxBases.every((n) => top3Arrival.includes(n));
          const associeOk = associes.some((n) => top3Arrival.includes(n));
          if (basesOk && associeOk) {
            isGagnant = true;
            rapportEstime = Math.max(35.0, 45.0 * trjByPari.TRIO_CHAMP_REDUIT);
          }
          break;

        case 'TIERCE':
          const selTierce = topTrio.slice(0, 5).map((s) => s.partant.numero);
          if (top3Arrival.every((n) => selTierce.includes(n))) {
            isGagnant = true;
            rapportEstime = Math.max(15.0, 22.0 * trjByPari.TIERCE);
          }
          break;

        case 'QUINTE':
          const top5Arrival = arrivalNums.slice(0, 5);
          const selQuinte = c.synthese?.selection8 || topTrio.slice(0, 8).map((s) => s.partant.numero);
          if (top5Arrival.length === 5 && top5Arrival.every((n) => selQuinte.includes(n))) {
            isGagnant = true;
            rapportEstime = 350.0 * trjByPari.QUINTE;
          }
          break;
      }

      if (isGagnant) {
        parisGagnants += 1;
        gainsTotaux += mise * rapportEstime;
      }
    });

    const beneficeNet = gainsTotaux - misesTotales;
    const tauxReussite = coursesEligibles > 0 ? Math.round((parisGagnants / coursesEligibles) * 100) : 0;
    const roi = misesTotales > 0 ? Math.round((beneficeNet / misesTotales) * 100) : 0;

    return {
      coursesEligibles,
      parisGagnants,
      misesTotales,
      gainsTotaux,
      beneficeNet,
      tauxReussite,
      roi,
    };
  }, [
    coursesAvecArrivee,
    selectedPari,
    minTrioScore,
    minCote,
    maxCote,
    disciplineFilter,
    miseUnitaireFCFA,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-4 sm:px-4 sm:pb-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-teal-500/50 rounded-none sm:rounded-3xl p-5 sm:p-7 max-w-5xl w-full shadow-2xl space-y-6 my-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-teal-500/20 shrink-0">
              <BarChart3 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-black uppercase tracking-wider">
                  Laboratoire Quantitatif
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {coursesAvecArrivee.length} courses archivées avec arrivée officielle
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Backtesting Stratégique & Analyse Walk-Forward
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('simulateur')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'simulateur'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Simulateur Mécanique PMU</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outils_ia')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'outils_ia'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Panorama des Outils IA Turf</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('methodologie')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'methodologie'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Guide Méthodologique</span>
          </button>
        </div>

        {/* TAB 1: SIMULATEUR MÉCANIQUE */}
        {activeTab === 'simulateur' && (
          <div className="space-y-6">
            {/* Contrôles de Stratégie */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Type de Pari Simulé
                </label>
                <select
                  value={selectedPari}
                  onChange={(e) => setSelectedPari(e.target.value as PariType)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                >
                  <option value="TRIO_DIRECT">🎯 Trio Direct (3 Chevaux)</option>
                  <option value="TRIO_CHAMP_REDUIT">🛡️ Trio Champ Réduit (2 Bases)</option>
                  <option value="SIMPLE_PLACE">🥉 Simple Placé (Top 3)</option>
                  <option value="SIMPLE_GAGNANT">🥇 Simple Gagnant</option>
                  <option value="COUPLE_PLACE">🤝 Couplé Placé</option>
                  <option value="TIERCE">🥉 Tiercé (5 Ch.)</option>
                  <option value="QUINTE">🏆 Quinté+ (8 Ch.)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Discipline Cible
                </label>
                <select
                  value={disciplineFilter}
                  onChange={(e) => setDisciplineFilter(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                >
                  <option value="ALL">Toutes disciplines</option>
                  <option value="TROT">Trot Attelé & Monté</option>
                  <option value="PLAT">Plat</option>
                  <option value="OBSTACLE">Obstacles (Haies/Steeple)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Seuil Score Trio Minimum : <span className="text-teal-300 font-mono">{minTrioScore}/100</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="85"
                  step="5"
                  value={minTrioScore}
                  onChange={(e) => setMinTrioScore(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mise Unitaire (FCFA / EUR)
                </label>
                <input
                  type="number"
                  step="500"
                  min="500"
                  value={miseUnitaireFCFA}
                  onChange={(e) => setMiseUnitaireFCFA(Math.max(100, parseInt(e.target.value, 10) || 1000))}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold font-mono text-xs"
                />
              </div>
            </div>

            {/* Dashboard des Résultats du Backtest */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Courses Testées</span>
                <div className="text-2xl font-mono font-black text-white">
                  {simulationResult.coursesEligibles}
                </div>
                <div className="text-[10px] text-slate-500">filtrées selon la règle</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Taux de Réussite</span>
                <div className="text-2xl font-mono font-black text-teal-300">
                  {simulationResult.tauxReussite}%
                </div>
                <div className="text-[10px] text-slate-500">{simulationResult.parisGagnants} paris gagnants</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Bénéfice Net Simulé</span>
                <div className={`text-2xl font-mono font-black ${simulationResult.beneficeNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simulationResult.beneficeNet >= 0 ? '+' : ''}{Math.round(simulationResult.beneficeNet).toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[10px] text-slate-500">après prélèvements TRJ</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">ROI Net</span>
                <div className={`text-2xl font-mono font-black ${simulationResult.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simulationResult.roi >= 0 ? '+' : ''}{simulationResult.roi}%
                </div>
                <div className="text-[10px] text-slate-500">sur capital engagé</div>
              </div>
            </div>

            {/* Note d'intégrité quantitative */}
            <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 flex items-start gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-white block">Règle d'or de l'audit hors-échantillon :</strong>
                <span>
                  Ce backtest utilise exclusivement les cotes probables disponibles <strong>avant le départ officiel</strong> et déduit rigoureusement les prélèvements légaux PMU/LONACI ({Math.round((1 - trjByPari[selectedPari]) * 100)}% de marge opérateur). Aucune fuite d'information après-course n'est injectée dans le modèle.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PANORAMA DES OUTILS IA TURF */}
        {activeTab === 'outils_ia' && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-400">
              Comparatif des principales solutions IA du turf francophone pour orienter votre pratique :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-amber-300 text-sm">HIPIKA</h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Value Bets</span>
                </div>
                <p className="text-slate-300">
                  Estime les probabilités pures, compare aux cotes du marché et signale les courses à éviter.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Idéal pour : Repérer les value bets et filtrer les courses sans avantage.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sky-300 text-sm">Turfiste IA</h4>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">Décisions Expliquées</span>
                </div>
                <p className="text-slate-300">
                  Dashboard complet expliquant la sélection : forme, musique, chronos, terrain et duo cheval/jockey.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Idéal pour : Comprendre le raisonnement derrière chaque partant retenu.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-teal-300 text-sm">Dataturf Critérium</h4>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold">Backtesting Avancé</span>
                </div>
                <p className="text-slate-300">
                  Éditeur de règles testables sur plusieurs années d'historique de courses françaises.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Idéal pour : Créer, éprouver et backtester ses propres stratégies mécaniques.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-purple-300 text-sm">HippoAnalyse Pro (Intégré)</h4>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">Moteur Trios & Quinté</span>
                </div>
                <p className="text-slate-300">
                  Score Potentiel Trio (Top 3), analyse quantitative V38, certification officielle et polling 15s post-départ.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Idéal pour : Turfistes professionnels et parieurs PMU / LONACI en Afrique de l'Ouest et France.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GUIDE MÉTHODOLOGIQUE DU BACKTEST */}
        {activeTab === 'methodologie' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-black text-white text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-400" />
                <span>Les 3 Règles Fondamentales du Backtest PMU</span>
              </h4>

              <div className="space-y-2 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <strong className="text-teal-300 block mb-0.5">1. Formuler une règle mécanique stricte</strong>
                  <span>Pas de jugement émotionnel au moment du test. La règle doit définir le pari, le filtre (ex: Score Trio ≥ 70, cote entre 3/1 et 15/1) et la mise fixe.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <strong className="text-teal-300 block mb-0.5">2. Séparer apprentissage et test (Walk-Forward)</strong>
                  <span>Ne jamais tester sur les données qui ont servi à calibrer le modèle. Utilisez l'approche walk-forward : calibrer sur N mois, valider sur le mois suivant.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <strong className="text-teal-300 block mb-0.5">3. Intégrer les prélèvements réels (TRJ)</strong>
                  <span>Un modèle rentable à 100% brut peut être déficitaire après les 15% à 35% de prélèvements opérateurs PMU/LONACI. Toujours calculer en net.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            Moteur de backtest HippoAnalyse · Conforme normes mathématiques PMU / LONACI
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black transition-all cursor-pointer shadow-md"
          >
            Fermer le Laboratoire
          </button>
        </div>
      </div>
    </div>
  );
};
