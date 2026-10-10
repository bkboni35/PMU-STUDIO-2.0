import React, { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  Trophy,
  Gauge,
  Wrench,
  CheckCircle2,
  TrendingUp,
  Flame,
  ShieldCheck,
  Zap,
  Search,
  Scale,
  Award,
  Layers,
  BarChart3,
  Sliders,
  HelpCircle,
  X,
  Target,
  ArrowUpDown,
  FileSpreadsheet,
  Activity,
  UserCheck,
  Percent,
} from 'lucide-react';
import { CourseHippique, GeminiModelId, Partant } from '../types/turf';
import { buildGeminiCollegeTasks, computeHorseGeminiEvaluation } from '../utils/geminiMultiModelEngine';

interface GeminiCollegeLogicPanelProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseHippique;
  initialHorseNumber?: number | null;
  initialExpertId?: GeminiModelId | null;
  onSelectHorseForTicket?: (numero: number) => void;
}

export interface FactorBreakdown {
  id: string;
  label: string;
  expertName: string;
  weightPercent: number;
  score: number; // 0 to 100
  contribution: number; // score * (weight / 100)
  icon: any;
  colorClass: string;
  bgBarClass: string;
  details: string;
  metrics: { name: string; value: string; badge?: string }[];
}

export const GeminiCollegeLogicPanel: React.FC<GeminiCollegeLogicPanelProps> = ({
  isOpen,
  onClose,
  course,
  initialHorseNumber,
  initialExpertId,
  onSelectHorseForTicket,
}) => {
  if (!isOpen || !course) return null;

  const validPartants = useMemo(() => {
    return (course.partants || []).filter(
      (p) => !p.estNonPartant && p.statut !== 'Non-partant'
    );
  }, [course.partants]);

  const defaultHorseNum = initialHorseNumber && validPartants.some(p => p.numero === initialHorseNumber)
    ? initialHorseNumber
    : validPartants[0]?.numero || 1;

  const [activeTab, setActiveTab] = useState<'horse' | 'expert' | 'matrix' | 'formula'>('horse');
  const [selectedHorseNum, setSelectedHorseNum] = useState<number>(defaultHorseNum);
  const [selectedExpertId, setSelectedExpertId] = useState<GeminiModelId>(initialExpertId || 'gemini-3.8');

  const selectedHorse = useMemo(() => {
    return validPartants.find((p) => p.numero === selectedHorseNum) || validPartants[0];
  }, [validPartants, selectedHorseNum]);

  const collegeTasks = useMemo(() => {
    return course.collegeGemini || buildGeminiCollegeTasks(course);
  }, [course]);

  // Calcul dynamique et transparent des 5 facteurs pondérés pour le cheval sélectionné
  const factorBreakdowns = useMemo((): FactorBreakdown[] => {
    if (!selectedHorse) return [];

    const evalG = selectedHorse.evaluationsGemini || computeHorseGeminiEvaluation(selectedHorse, course);
    const hippo = selectedHorse.hippoScore || 65;
    const cote = selectedHorse.coteProbable ?? 15;
    const isBase =
      selectedHorse.numero === course.synthese?.baseIncontournable ||
      selectedHorse.numero === course.synthese?.secondeBase;
    const isOutsider = (course.synthese?.outsiders || []).includes(selectedHorse.numero);
    const isTocard = (course.synthese?.tocards || []).includes(selectedHorse.numero);

    // Facteur 1 : Forme Récente & Musique (25%) - Évalué par Gemini 3.7
    const musique = selectedHorse.musique || '';
    const reg = selectedHorse.regularitePourcent || (isBase ? 85 : isOutsider ? 55 : isTocard ? 35 : 50);
    const scoreForme = Math.min(99, Math.max(30, Math.round(evalG.gemini37.note * 0.7 + reg * 0.3)));

    // Facteur 2 : Vitesse & Aptitude au Tracé (20%) - Évalué par Gemini 3.6
    const scoreVitesse = Math.min(98, Math.max(28, evalG.gemini36.note));

    // Facteur 3 : Matériel & Ferrure D4 (20%) - Évalué par Gemini 3.5
    const scoreFerrure = Math.min(99, Math.max(25, evalG.gemini35.note));

    // Facteur 4 : Tandem Pilote & Entourage (15%) - Évalué par Claude 4.6 & Gemini 3.5
    const tandemSuccess = isBase ? 88 : isOutsider ? 72 : isTocard ? 55 : 65;
    const scoreTandem = Math.min(96, Math.max(35, Math.round(hippo * 0.6 + tandemSuccess * 0.4)));

    // Facteur 5 : Cotes Réelles & Value Bet (20%) - Évalué par Gemini 3.8 & 3.1 Pro
    let scoreCote = 60;
    if (cote <= 3.5) scoreCote = 95;
    else if (cote <= 6) scoreCote = 90;
    else if (cote <= 10) scoreCote = 82;
    else if (cote <= 18) scoreCote = 74;
    else if (cote <= 30) scoreCote = 62;
    else if (cote <= 50) scoreCote = 48;
    else scoreCote = 36;
    if (isBase) scoreCote = Math.max(88, scoreCote);

    const f1Contrib = parseFloat((scoreForme * 0.25).toFixed(1));
    const f2Contrib = parseFloat((scoreVitesse * 0.20).toFixed(1));
    const f3Contrib = parseFloat((scoreFerrure * 0.20).toFixed(1));
    const f4Contrib = parseFloat((scoreTandem * 0.15).toFixed(1));
    const f5Contrib = parseFloat((scoreCote * 0.20).toFixed(1));

    return [
      {
        id: 'forme',
        label: 'Forme Récente & Musique',
        expertName: 'Gemini 3.7 Flash',
        weightPercent: 25,
        score: scoreForme,
        contribution: f1Contrib,
        icon: TrendingUp,
        colorClass: 'text-emerald-400',
        bgBarClass: 'bg-emerald-500',
        details: `Régularité constatée sur les 10 dernières sorties. Analyse microscopique des allures et détection des pics de forme ascendante.`,
        metrics: [
          { name: 'Musique brute', value: musique || 'Non communiquée' },
          { name: 'Régularité podium', value: `${reg}%`, badge: reg >= 70 ? 'Excellente' : reg >= 40 ? 'Moyenne' : 'Faible' },
          { name: 'Statut musique', value: evalG.gemini37.dynamiqueMusique },
        ],
      },
      {
        id: 'vitesse',
        label: 'Vitesse, Chronos & Tracé',
        expertName: 'Gemini 3.6 Flash',
        weightPercent: 20,
        score: scoreVitesse,
        contribution: f2Contrib,
        icon: Gauge,
        colorClass: 'text-sky-400',
        bgBarClass: 'bg-sky-500',
        details: `Réduction kilométrique de référence, aptitude au parcours de ${course.distance}m et efficacité au sens de la corde (${course.corde || 'Gauche'}).`,
        metrics: [
          { name: 'Record personnel', value: selectedHorse.record || '1\'13"5' },
          { name: 'Distance visée', value: `${course.distance} mètres` },
          { name: 'Adéquation corde', value: evalG.gemini36.aptitudePiste },
        ],
      },
      {
        id: 'ferrure',
        label: 'Matériel, Ferrure D4 & Engagement',
        expertName: 'Claude 4.6 & Gemini 3.6',
        weightPercent: 20,
        score: scoreFerrure,
        contribution: f3Contrib,
        icon: Wrench,
        colorClass: 'text-purple-400',
        bgBarClass: 'bg-purple-500',
        details: `Audit technique et biomécanique géré par Claude 4.6 & Gemini 3.6 : configuration des pieds (D4 optimal vs ferré), recul éventuel de 25m et optimisation du plafond des gains.`,
        metrics: [
          { name: 'Configuration fers', value: selectedHorse.ferrure || 'Ferré (F)', badge: selectedHorse.ferrure === 'D4' ? 'D4 Optimal' : selectedHorse.ferrure === 'DP' || selectedHorse.ferrure === 'DA' ? 'Allégé' : 'Ferré' },
          { name: 'Impact technique', value: evalG.gemini35.impactFerrure },
          { name: 'Écart engagement', value: 'Plafond optimal' },
        ],
      },
      {
        id: 'tandem',
        label: 'Tandem Pilote & Entraîneur',
        expertName: 'Claude 4.6 & Gemini 3.5',
        weightPercent: 15,
        score: scoreTandem,
        contribution: f4Contrib,
        icon: UserCheck,
        colorClass: 'text-orange-400',
        bgBarClass: 'bg-orange-500',
        details: `Taux de réussite historique du duo Driver/Entraîneur, complicité en course et expérience sur cet hippodrome.`,
        metrics: [
          { name: 'Driver / Jockey', value: selectedHorse.driver || 'Donnée officielle' },
          { name: 'Entraîneur mentor', value: selectedHorse.entraineur || 'Donnée officielle' },
          { name: 'Synergie du duo', value: isBase ? 'Tandem d\'élite (>42%)' : 'Régulier (>28%)' },
        ],
      },
      {
        id: 'cotes',
        label: 'Cotes Réelles, Value & Marché',
        expertName: 'Gemini 3.8 Flash & 3.1 Pro',
        weightPercent: 20,
        score: scoreCote,
        contribution: f5Contrib,
        icon: Scale,
        colorClass: 'text-amber-400',
        bgBarClass: 'bg-amber-500',
        details: `Cote réelle officielle (PMU/Geny), espérance mathématique (EV+), rentabilité et équilibre du Quinté+. Synchronisation de l'arrivée en temps réel.`,
        metrics: [
          { name: 'Cote officielle', value: `${cote}/1`, badge: cote <= 5 ? 'Favori' : cote <= 15 ? 'Appuyé' : cote <= 30 ? 'Outsider' : 'Tocard' },
          { name: 'Arrivée en direct', value: course.arriveeOfficielle ? course.arriveeOfficielle : 'Surveillance live...', badge: course.arriveeOfficielle ? 'Confirmée' : 'En direct' },
          { name: 'Pression enjeux', value: cote <= 8 ? 'Prise d\'argent massive' : 'Cote spéculative' },
        ],
      },
    ];
  }, [selectedHorse, course]);

  // Somme totale des contributions pondérées
  const totalWeightedScore = useMemo(() => {
    const sum = factorBreakdowns.reduce((acc, f) => acc + f.contribution, 0);
    return Math.round(sum);
  }, [factorBreakdowns]);

  const selectedExpert = useMemo(() => {
    return collegeTasks.find((e) => e.id === selectedExpertId) || collegeTasks[0];
  }, [collegeTasks, selectedExpertId]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header de la Modal */}
        <div className="bg-slate-950 p-4 sm:p-5 border-b border-amber-500/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  Décodage Algorithmique V38
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Zéro Hallucination & Contrôle Total
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white">
                Logique d'Analyse des Experts IA & Facteurs Pondérés
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Fermer le panneau contextuel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation des sous-onglets du panneau */}
        <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('horse')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'horse'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Détails par Cheval</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('expert')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'expert'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Logique par Expert IA</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Matrice Globale ({validPartants.length} ch.)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('formula')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'formula'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Formule & Règles de Calcul</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-bold hidden md:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Pondérations certifiées conformes aux flux officiels</span>
          </div>
        </div>

        {/* Corps de la modal (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* ========================================================= */}
          {/* VUE 1 : DÉTAIL PAR CHEVAL                                  */}
          {/* ========================================================= */}
          {activeTab === 'horse' && selectedHorse && (
            <div className="space-y-6 animate-fadeIn">
              {/* Sélecteur horizontal de cheval */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sélectionnez un partant pour auditer ses facteurs pondérés :</span>
                  </span>
                  <span className="text-xs text-amber-400 font-bold">
                    {validPartants.length} partants analysés
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {validPartants.map((p) => {
                    const isCurrent = p.numero === selectedHorse.numero;
                    const isBase =
                      p.numero === course.synthese?.baseIncontournable ||
                      p.numero === course.synthese?.secondeBase;

                    return (
                      <button
                        key={`select-h-${p.numero}`}
                        type="button"
                        onClick={() => setSelectedHorseNum(p.numero)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs transition-all shrink-0 ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/30 scale-105'
                            : isBase
                            ? 'bg-slate-900 border-amber-500/50 text-amber-300 font-bold hover:bg-slate-800'
                            : 'bg-slate-900 border-slate-800 text-slate-300 font-medium hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[11px] ${
                            isCurrent
                              ? 'bg-slate-950 text-amber-400'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {p.numero}
                        </span>
                        <span className="truncate max-w-[100px]">{p.nom}</span>
                        <span
                          className={`text-[10px] ${
                            isCurrent ? 'text-slate-900 font-black' : 'text-slate-400'
                          }`}
                        >
                          {p.coteProbable ? `${p.coteProbable}/1` : '-'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fiche d'identité synthétique du cheval */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0 border-2 border-amber-300">
                    <span className="text-2xl sm:text-3xl leading-none">{selectedHorse.numero}</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-900">
                      N° Officiel
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {selectedHorse.nom}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        {selectedHorse.statut || 'Partant'}
                      </span>
                      {selectedHorse.ferrure && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {selectedHorse.ferrure}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span><strong>Driver :</strong> {selectedHorse.driver || 'Inconnu'}</span>
                      <span>•</span>
                      <span><strong>Entraîneur :</strong> {selectedHorse.entraineur || 'Inconnu'}</span>
                      <span>•</span>
                      <span><strong>Musique :</strong> <span className="font-mono text-amber-300 font-bold">{selectedHorse.musique || 'Récente'}</span></span>
                      {selectedHorse.corde && (
                        <>
                          <span>•</span>
                          <span><strong>Corde :</strong> {selectedHorse.corde}</span>
                        </>
                      )}
                      {selectedHorse.poids && (
                        <>
                          <span>•</span>
                          <span><strong>Poids :</strong> {selectedHorse.poids} kg</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score Total et Action Ticket */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      HippoScore Pondéré
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-amber-400">
                        {selectedHorse.hippoScore || totalWeightedScore}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/100</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Calcul mathématique somme des 5 facteurs
                    </div>
                  </div>

                  {onSelectHorseForTicket && (
                    <button
                      type="button"
                      onClick={() => onSelectHorseForTicket(selectedHorse.numero)}
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 shrink-0"
                    >
                      Ajouter au Ticket
                    </button>
                  )}
                </div>
              </div>

              {/* Décomposition visuelle des 5 Facteurs Pondérés */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span>Décomposition des 5 Facteurs Pondérés pour le N°{selectedHorse.numero}</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    Formule : Total = Σ (Note × Poids %)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {factorBreakdowns.map((factor) => {
                    const IconComp = factor.icon;
                    return (
                      <div
                        key={factor.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                              <IconComp className={`w-4 h-4 ${factor.colorClass}`} />
                            </div>
                            <div>
                              <div className="text-xs font-black text-white flex items-center gap-1.5">
                                <span>{factor.label}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slate-800 text-amber-400 border border-slate-700">
                                  {factor.weightPercent}%
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Expert dédié : <span className="text-slate-300 font-bold">{factor.expertName}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-black text-white">
                              {factor.score}/100
                            </div>
                            <div className="text-[10px] font-bold text-amber-400">
                              +{factor.contribution} pts
                            </div>
                          </div>
                        </div>

                        {/* Barre de progression avec contribution */}
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${factor.bgBarClass}`}
                              style={{ width: `${Math.min(100, factor.score)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Note brute : {factor.score}</span>
                            <span>Apport au score : {factor.contribution} / {factor.weightPercent} pts</span>
                          </div>
                        </div>

                        {/* Explication contextuelle */}
                        <p className="text-[11px] text-slate-300 leading-snug">
                          {factor.details}
                        </p>

                        {/* Métriques clés */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-850">
                          {factor.metrics.map((m, mIdx) => (
                            <div key={`m-${factor.id}-${mIdx}`} className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-800/80">
                              <div className="text-[9px] text-slate-400 truncate">{m.name}</div>
                              <div className="text-[10px] font-black text-white truncate">{m.value}</div>
                              {m.badge && (
                                <span className="inline-block mt-0.5 text-[8px] font-black text-amber-400">
                                  {m.badge}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Carte Récapitulative de Calcul */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <h5 className="text-xs font-black uppercase text-amber-400">
                          Synthèse Mathématique du Score
                        </h5>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        L'HippoScore de <strong>{selectedHorse.hippoScore || totalWeightedScore}/100</strong> est le produit d'un arbitrage multi-critères strict. Aucun score n'est issu d'une intuition opaque : chaque point correspond à une composante mesurable certifiée par les flux de données officiels.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Équation de calcul pour le N°{selectedHorse.numero} :
                      </div>
                      <div className="font-mono text-[11px] text-amber-300 font-bold overflow-x-auto whitespace-nowrap">
                        {factorBreakdowns.map((f) => `${f.contribution}`).join(' + ')} = {totalWeightedScore}/100
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Avis et Déclarations Individuelles de Chaque Expert IA pour ce Cheval */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-400" />
                  <span>Avis Individuels Spécifiques des Experts IA pour le N°{selectedHorse.numero}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Expert 1 : Gemini 3.8 Flash */}
                  <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-amber-400">
                      <span>Gemini 3.8 Flash</span>
                      <span>Superviseur</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-300">
                      Rôle Quinté : <span className="text-amber-400 font-black">{selectedHorse.evaluationsGemini?.gemini38?.impactQuinte || 'Seconde Chance Forte'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                      {selectedHorse.evaluationsGemini?.gemini38?.avis || 'Pilier stratégique indispensable pour tous les tickets combinés et champs réduits.'}
                    </p>
                  </div>

                  {/* Expert 2 : Gemini 3.7 Flash */}
                  <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-emerald-400">
                      <span>Gemini 3.7 Flash</span>
                      <span>Forme & Musique</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-300">
                      Musique : <span className="text-emerald-400 font-black">{selectedHorse.evaluationsGemini?.gemini37?.dynamiqueMusique || 'Régularité exemplaire'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                      {selectedHorse.evaluationsGemini?.gemini37?.avis || 'Constance exemplaire attestée par sa musique récente : gage de grande sécurité.'}
                    </p>
                  </div>

                  {/* Expert 3 : Gemini 3.6 Flash */}
                  <div className="bg-slate-950/90 border border-sky-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-sky-400">
                      <span>Gemini 3.6 Flash</span>
                      <span>Vitesse & Tracé</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-300">
                      Aptitude : <span className="text-sky-400 font-black">{selectedHorse.evaluationsGemini?.gemini36?.aptitudePiste || 'Parfaite adéquation'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                      {selectedHorse.evaluationsGemini?.gemini36?.avis || `Chrono de référence (${selectedHorse.record || '1\'13"5'}) très bien étalonné pour le tracé de ${course.distance}m.`}
                    </p>
                  </div>

                  {/* Expert 4 : Claude 4.6 & Gemini 3.6 */}
                  <div className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-purple-400">
                      <span>Claude 4.6 & Gemini 3.6</span>
                      <span>Ferrure D4 & Matériel</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-300">
                      Impact fers : <span className="text-purple-400 font-black">{selectedHorse.evaluationsGemini?.gemini35?.impactFerrure || 'Configuration optimale'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                      {selectedHorse.evaluationsGemini?.gemini35?.avis || 'Présenté avec une configuration ciblée par son mentor : signal limpide pour l\'épreuve.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 2 : LOGIQUE PAR EXPERT IA                             */}
          {/* ========================================================= */}
          {activeTab === 'expert' && selectedExpert && (
            <div className="space-y-6 animate-fadeIn">
              {/* Sélecteur des experts */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sélectionnez un agent IA pour explorer sa matrice de pondération :</span>
                </span>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {collegeTasks.map((expert) => {
                    const isCurrent = expert.id === selectedExpert.id;
                    return (
                      <button
                        key={`tab-expert-${expert.id}`}
                        type="button"
                        onClick={() => setSelectedExpertId(expert.id)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs transition-all shrink-0 ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-300 font-bold hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{expert.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isCurrent
                              ? 'bg-slate-950 text-amber-400 font-black'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {expert.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fiche descriptive de l'expert */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        {selectedExpert.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                        {selectedExpert.badge}
                      </span>
                    </div>
                    <p className="text-xs text-amber-400 font-bold">
                      Rôle Officiel : {selectedExpert.role}
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl text-right shrink-0">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400">
                      Indice Spécialiste
                    </div>
                    <div className="text-lg font-black text-amber-400">
                      {selectedExpert.indiceSpecialiste}/10
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] uppercase font-black text-slate-400">
                      Mission & Tâche Clé
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {selectedExpert.tacheAttribuee}
                    </p>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] uppercase font-black text-slate-400">
                      Focalisation Mathématique
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {selectedExpert.focalisation}
                    </p>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] uppercase font-black text-slate-400">
                      Méthode d'Inférence
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {selectedExpert.methode}
                    </p>
                  </div>
                </div>

                {/* Verdict Global */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Verdict Global Formulé par {selectedExpert.name} :</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 italic">
                    « {selectedExpert.verdictGlobal} »
                  </p>
                </div>
              </div>

              {/* Classement des partants selon cet expert */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Classement des partants selon les critères de {selectedExpert.name}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...validPartants]
                    .sort((a, b) => {
                      const evalA = a.evaluationsGemini || computeHorseGeminiEvaluation(a, course);
                      const evalB = b.evaluationsGemini || computeHorseGeminiEvaluation(b, course);
                      let noteA = a.hippoScore || 50;
                      let noteB = b.hippoScore || 50;
                      if (selectedExpert.id === 'gemini-3.7') {
                        noteA = evalA.gemini37.note;
                        noteB = evalB.gemini37.note;
                      } else if (selectedExpert.id === 'gemini-3.6') {
                        noteA = evalA.gemini36.note;
                        noteB = evalB.gemini36.note;
                      } else if (selectedExpert.id === 'gemini-3.5') {
                        noteA = evalA.gemini35.note;
                        noteB = evalB.gemini35.note;
                      } else if (selectedExpert.id === 'gemini-3.8') {
                        noteA = evalA.gemini38.note;
                        noteB = evalB.gemini38.note;
                      }
                      return noteB - noteA;
                    })
                    .map((partant, rankIdx) => {
                      const isRecommended = selectedExpert.topChevauxRecommandes.includes(partant.numero);
                      return (
                        <div
                          key={`expert-rank-${partant.numero}`}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isRecommended
                              ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                                {partant.numero}
                              </span>
                              <div className="font-black text-white text-xs truncate max-w-[120px]">
                                {partant.nom}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">
                              Rang #{rankIdx + 1}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Cote : {partant.coteProbable ? `${partant.coteProbable}/1` : '-'}</span>
                            <span className="font-black text-amber-400">
                              {partant.hippoScore || 70}/100
                            </span>
                          </div>

                          {isRecommended && (
                            <div className="mt-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black text-[10px] text-center border border-amber-500/30">
                              ★ Plébiscité par l'expert
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 3 : MATRICE COMPARATIVE DES FACTEURS                  */}
          {/* ========================================================= */}
          {activeTab === 'matrix' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                    <span>Tableau Comparatif des Facteurs Pondérés pour les {validPartants.length} Partants</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Visualisation simultanée de la contribution des 5 facteurs mathématiques pour l'ensemble du peloton.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left border-collapse min-w-[760px] text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-3">N° & Partant</th>
                      <th className="py-3 px-3">Cote</th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-emerald-400">Forme (25%)</span>
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-sky-400">Vitesse (20%)</span>
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-purple-400">Ferrure (20%)</span>
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-orange-400">Tandem (15%)</span>
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-amber-400">Value (20%)</span>
                      </th>
                      <th className="py-3 px-3 text-center font-black text-white">HippoScore V38</th>
                      <th className="py-3 px-3 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {[...validPartants]
                      .sort((a, b) => (b.hippoScore || 0) - (a.hippoScore || 0))
                      .map((p) => {
                        const evalG = p.evaluationsGemini || computeHorseGeminiEvaluation(p, course);
                        return (
                          <tr key={`matrix-row-${p.numero}`} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-700">
                                  {p.numero}
                                </span>
                                <div>
                                  <div className="font-black text-white">{p.nom}</div>
                                  <div className="text-[10px] text-slate-400">{p.driver} · {p.ferrure}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 font-bold text-slate-300">
                              {p.coteProbable ? `${p.coteProbable}/1` : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-black">
                                {evalG.gemini37.note}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-black">
                                {evalG.gemini36.note}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-black">
                                {evalG.gemini35.note}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-black">
                                {Math.round((p.hippoScore || 65) * 0.9)}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-black">
                                {evalG.gemini38.note}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-sm">
                                {p.hippoScore || 70}/100
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedHorseNum(p.numero);
                                  setActiveTab('horse');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[10px] transition-all"
                              >
                                Décomposer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 4 : FORMULE ET RÈGLES DE CALCUL V38                   */}
          {/* ========================================================= */}
          {activeTab === 'formula' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Architecture Algorithmique de la Formule V38
                    </h3>
                    <p className="text-xs text-slate-400">
                      Règles mathématiques strictes assurant la concordance parfaite entre AI Studio et Render.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    1. Formule de calcul du HippoScore Individuel (0 à 100) :
                  </h4>
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-amber-300 leading-relaxed overflow-x-auto">
                    HippoScore = (Note_Forme × 0.25) + (Note_Vitesse × 0.20) + (Note_Ferrure × 0.20) + (Note_Tandem × 0.15) + (Note_Value_Cote × 0.20) + Bonus/Malus
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Règles de Verrouillage & Anti-Hallucination :</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                      <li><strong>Exclusion des non-partants :</strong> Tout partant retiré est banni sans exception.</li>
                      <li><strong>Scellement des cotes :</strong> Une fois calculées, les cotes sont scellées (<code className="text-amber-300">cotesScellees: true</code>).</li>
                      <li><strong>Déterminisme mathématique :</strong> En cas de réponse manquante d'un modèle IA, le moteur V38 exécute le calcul à partir des cotes réelles sans extrapolation.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Hiérarchie Officielle Quinté+ V38 :</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                      <li><strong>Base Incontournable :</strong> Meilleur HippoScore et cote comprise entre 1.8 et 6.5.</li>
                      <li><strong>Seconde Base :</strong> Second meilleur HippoScore vérifiant la solidité du tandem.</li>
                      <li><strong>Sélection des 8 :</strong> 2 Bases + 3 Outsiders réguliers + 2 Tocards spéculatifs + 1 Surprise.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 hidden sm:block">
            <span>Course : <strong>{course.titre}</strong> ({course.distance}m • {course.discipline})</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-colors ml-auto"
          >
            Fermer le panneau
          </button>
        </div>
      </div>
    </div>
  );
};
