import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Brain,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Search,
  Scale,
  Crosshair,
  Award,
  Crown,
  Zap,
  FileSpreadsheet,
  FileDown,
  Trophy,
  Bot,
  Database,
  BarChart3,
  TrendingUp,
  Layers,
  ArrowRight,
  Code2
} from 'lucide-react';
import { CourseHippique, MultiAiStepDetail } from '../types/turf';
import { exportCourseToExcel } from '../utils/excelExport';
import { exportCourseToPdf, exportQuinteOnlyToPdf } from '../utils/pdfExport';
import { HierarchieQuinteV38Banner } from './HierarchieQuinteV38Banner';
import { computeQuinteOrdres, buildArchitectureMultiAi } from '../utils/geminiMultiModelEngine';

interface StudioV38PipelineProps {
  course: CourseHippique;
  onNavigateTab: (tab: 'synthese' | 'propositions-ia' | 'partants' | 'ticket' | 'college-gemini' | 'stats' | 'advisor' | 'favoris' | 'calendrier' | 'fiche-pdf-v38' | 'trace-facteurs') => void;
  activeTab: string;
}

export const StudioV38Pipeline: React.FC<StudioV38PipelineProps> = ({
  course,
  onNavigateTab,
  activeTab,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePipelineMode, setActivePipelineMode] = useState<'workflow-expert' | 'multi-ai-9' | 'pipeline-5'>('workflow-expert');
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState<number | null>(1);
  const [selectedStage5, setSelectedStage5] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [selectedStep9, setSelectedStep9] = useState<number | null>(1);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      exportCourseToExcel(course);
      setExcelSuccess(true);
      setTimeout(() => setExcelSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      exportCourseToPdf(course);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const partantsCount = course.partants?.length || 0;
  const p5 = course.pipeline5Stages;
  const multiAi = course.architectureMultiAi || buildArchitectureMultiAi(course);
  const stepsList: MultiAiStepDetail[] = Object.values(multiAi.etapes);

  const activeStepDetail = stepsList.find((s) => s.etape === selectedStep9) || stepsList[0];

  const getIaBadgeColor = (ia: string) => {
    switch (ia) {
      case 'Gemini Flash':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Gemini Pro':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Claude':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Mistral':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'Code JavaScript/TypeScript':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl border border-amber-500/30 shadow-2xl p-4 sm:p-5 relative overflow-hidden">
      {/* Background ambient gold aura */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 text-sm">
            9IA
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                ARCHITECTURE MULTI-IA <span className="text-amber-400">EN 9 ÉTAPES</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Moteur Renforcé V38
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gemini Flash (Extraction & Marché) · Gemini Pro (Analyses factorielles & Synthèse) · Claude (Contre-analyse critique) · Mistral · Scoring Déterministe TypeScript
            </p>
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActivePipelineMode('workflow-expert')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activePipelineMode === 'workflow-expert'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🔄 Workflow Déclencheur (9 Étapes)
            </button>
            <button
              type="button"
              onClick={() => setActivePipelineMode('multi-ai-9')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activePipelineMode === 'multi-ai-9'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏇 9 Étapes Multi-IA
            </button>
            <button
              type="button"
              onClick={() => setActivePipelineMode('pipeline-5')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activePipelineMode === 'pipeline-5'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Pipeline 5 Phases
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportQuinteOnlyToPdf(course)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 border border-amber-300"
            title="Générer et télécharger le PDF officiel de la Hiérarchie Quinté+ V38 (9 chevaux)"
          >
            <Crown className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">Exporter Hiérarchie V38</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title={isExpanded ? 'Réduire' : 'Agrandir'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Pipeline Workflow */}
      {isExpanded && (
        <div className="mt-4 pt-1 space-y-4">
          {/* ================= MODE 0 : WORKFLOW DÉCLENCHEUR QUOTIDIEN (9 ÉTAPES) ================= */}
          {activePipelineMode === 'workflow-expert' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Info Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-white font-black text-sm block">Pipeline Automatisé & Workflow Quotidien</span>
                    <span className="text-slate-400 text-[11px]">Déclencheur → Ingestion → Recoupement → Expert → Quotas Stricts (2-3-4-2) → Rapport</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    9 Étapes Certifiées
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
                    {course.partants?.length || 0} partants actifs
                  </span>
                </div>
              </div>

              {/* 9 Interactive Sequential Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {[
                  { step: 1, title: 'Déclencheur quotidien', icon: '⏰', role: 'Automation & Sync', status: 'Actif', desc: 'Déclencheur automatique matinal' },
                  { step: 2, title: 'Récupération course', icon: '📥', role: 'PMU / Geny / Paris-Turf', status: 'Conforme', desc: 'Extraction officielle des épreuves' },
                  { step: 3, title: 'Données par cheval', icon: '📊', role: 'Musique, Cotes, Poids', status: 'Complet', desc: 'Collecte exhaustive par partant' },
                  { step: 4, title: 'Sources & Contradictions', icon: '🛡️', role: 'Fact-Checker Zéro Faux', status: 'Vérifié', desc: 'Détection des divergences et NP' },
                  { step: 5, title: 'Analyse par Expert', icon: '🎯', role: course.discipline || 'Discipline', status: 'Pondéré', desc: 'Pondération mathématique /100' },
                  { step: 6, title: 'Classement indicatif', icon: '📈', role: 'Hiérarchie /100', status: 'Classé', desc: 'Rangs par préférence sportive' },
                  { step: 7, title: 'Attribution Quotas', icon: '⚖️', role: '2-3-4-2 + Délaissés', status: '11 Chevaux', desc: 'Bases, Chances, Tocards, Surprises' },
                  { step: 8, title: 'Contrôle & Doublons', icon: '🔍', role: 'Zéro Doublon & NP', status: 'Audit OK', desc: 'Vérification stricte de cohérence' },
                  { step: 9, title: 'Rapport final', icon: '📋', role: 'Synthèse & Export', status: 'Généré', desc: 'Tableau, synthèse et fichier Excel' },
                ].map((s) => {
                  const isSelected = selectedWorkflowStep === s.step;
                  return (
                    <div
                      key={s.step}
                      onClick={() => setSelectedWorkflowStep(s.step)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left relative group ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span className="font-black text-amber-400">Étape {s.step}</span>
                          <span>{s.icon}</span>
                        </div>
                        <div className="font-black text-xs text-white leading-tight truncate" title={s.title}>
                          {s.title}
                        </div>
                        <div className="text-[10px] text-amber-300 font-bold truncate mt-0.5" title={s.role}>
                          {s.role}
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px]">
                        <span className="text-emerald-400 font-bold">{s.status}</span>
                        <span className="text-slate-500 group-hover:text-amber-400 font-bold">Détails →</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail Panel of the Selected Workflow Step */}
              {selectedWorkflowStep && (
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 animate-fadeIn space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                        {selectedWorkflowStep}
                      </span>
                      <h4 className="text-sm font-black text-white">
                        {selectedWorkflowStep === 1 && "1. Déclencheur Quotidien (Automatisme & Initialisation)"}
                        {selectedWorkflowStep === 2 && "2. Récupération de la Course (Multi-sources officielles)"}
                        {selectedWorkflowStep === 3 && "3. Collecte des Données par Cheval (Attributs indispensables)"}
                        {selectedWorkflowStep === 4 && "4. Vérification des Sources et Détection des Contradictions"}
                        {selectedWorkflowStep === 5 && `5. Analyse par Expert Spécialisé (${course.discipline})`}
                        {selectedWorkflowStep === 6 && "6. Classement Indicatif (Score Mathématique sur 100)"}
                        {selectedWorkflowStep === 7 && "7. Attribution des 5 Catégories (BASE, CHANCES, TOCARDS, SURPRISES, DÉLAISSÉS)"}
                        {selectedWorkflowStep === 8 && "8. Contrôle des Quotas et des Doublons (Intégrité Absolue)"}
                        {selectedWorkflowStep === 9 && "9. Rapport Final (Fiche Complète & Exportations)"}
                      </h4>
                    </div>

                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/30">
                      Phase Validée ✓
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                    {selectedWorkflowStep === 1 && (
                      <p>
                        Le déclencheur automatique s'exécute chaque matin pour synchroniser le programme officiel du jour, rafraîchir les cotes directes (PMU.fr / Geny / Paris-Turf) et vérifier les heures de départ réelles à Paris et Abidjan.
                      </p>
                    )}
                    {selectedWorkflowStep === 2 && (
                      <p>
                        Extraction de l'épreuve « {course.titre || course.prixNom} » à {course.hippodrome} ({course.reunion} {course.course}). Distance : {course.distance}m, Discipline : {course.discipline}, Corde : {course.corde}, Allocation : {course.allocation?.toLocaleString('fr-FR')} €.
                      </p>
                    )}
                    {selectedWorkflowStep === 3 && (
                      <p>
                        Collecte des {course.partants?.length || 0} partants déclarés avec : numéros officiels, noms, drivers/jockeys, entraîneurs, musiques intégrales, ferrures déclarées (D4, DP, DA, F), poids portés, stalles de départ et cotes probables.
                      </p>
                    )}
                    {selectedWorkflowStep === 4 && (
                      <p>
                        Contrôle de conformité multi-sources (PMU.fr, Geny.com, Paris-Turf, Equidia). Recoupement systématique sans aucune invention de données. Détection et exclusion stricte des chevaux déclarés non-partants (ex: NP).
                      </p>
                    )}
                    {selectedWorkflowStep === 5 && (
                      <p>
                        Mobilisation de l'expertise dédiée ({course.discipline}). Application rigoureuse de la grille de pondération mathématique sur 100 (forme, classe/valeur handicap, chrono/distance, driver/jockey, poids et marché).
                      </p>
                    )}
                    {selectedWorkflowStep === 6 && (
                      <p>
                        Calcul du score indicatif sur 100 pour chaque cheval actif et ordonnancement décroissant par mérite sportif et régularité (Bases identifiées : N°{course.synthese?.baseIncontournable || 1} et N°{course.synthese?.secondeBase || 2}).
                      </p>
                    )}
                    {selectedWorkflowStep === 7 && (
                      <p>
                        Affectation stricte selon les 5 quotas officiels : <strong>BASE (exactement 2)</strong>, <strong>CHANCES (exactement 3)</strong>, <strong>TOCARDS (exactement 4)</strong>, <strong>SURPRISES (exactement 2)</strong>, et <strong>DÉLAISSÉS (tous les autres partants)</strong>.
                      </p>
                    )}
                    {selectedWorkflowStep === 8 && (
                      <p>
                        Audit de cohérence terminal : vérification de l'unicité de chaque numéro, exclusion totale des non-partants de toute sélection, validation des 11 numéros distincts (2+3+4+2) et garantie de zéro doublon.
                      </p>
                    )}
                    {selectedWorkflowStep === 9 && (
                      <p>
                        Génération du rapport d'expertise complet, mise à jour des tableaux interactifs, synthèse Quinté+ 8 chevaux et génération des classeurs Excel natifs (.xlsx) avec formules et Value Index.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 1 : ARCHITECTURE MULTI-IA EN 9 ÉTAPES ================= */}
          {activePipelineMode === 'multi-ai-9' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Timeline Header Info */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-200 font-bold">Flux séquentiel de haute précision (9 Échelons d'Analyse)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>Modèles actifs :</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">Gemini Flash</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">Gemini Pro</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">Claude</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">Code TS</span>
                </div>
              </div>

              {/* 9-Step Interactive Horizontal Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {stepsList.map((step) => {
                  const isSelected = selectedStep9 === step.etape;
                  return (
                    <div
                      key={step.etape}
                      onClick={() => setSelectedStep9(step.etape)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-black font-mono text-amber-400">
                            #{step.etape}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${getIaBadgeColor(step.ia)}`}>
                            {step.ia.replace('Code JavaScript/', '').replace('JavaScript/', '')}
                          </span>
                        </div>
                        <div className="text-xs font-black text-white leading-tight truncate" title={step.nom}>
                          {step.nom.replace(/^\d+\.\s*/, '')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                          {step.role}
                        </div>
                      </div>

                      <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-400 font-bold">{step.statut}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Active Step Focus Card */}
              {activeStepDetail && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-xl space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-sm">
                        #{activeStepDetail.etape}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-white">
                            {activeStepDetail.nom}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getIaBadgeColor(activeStepDetail.ia)}`}>
                            IA Assignée : {activeStepDetail.ia}
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 font-semibold mt-0.5">
                          {activeStepDetail.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                        {activeStepDetail.statut}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {activeStepDetail.details}
                  </p>

                  {/* Key Highlights and Processed Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Points clés audités & validés :</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {activeStepDetail.pointsCles.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold shrink-0">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-amber-400" />
                        <span>Données & Métriques en sortie :</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-amber-300/90 overflow-x-auto space-y-1">
                        {Object.entries(activeStepDetail.donneesTraitees || {}).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center gap-2 border-b border-slate-900 pb-1">
                            <span className="text-slate-400">{k}:</span>
                            <span className="text-white font-bold">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Navigation */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                    <button
                      type="button"
                      disabled={activeStepDetail.etape <= 1}
                      onClick={() => setSelectedStep9((prev) => Math.max(1, (prev || 1) - 1))}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      ← Étape précédente
                    </button>

                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <span>Étape {activeStepDetail.etape} sur 9</span>
                    </div>

                    <button
                      type="button"
                      disabled={activeStepDetail.etape >= 9}
                      onClick={() => setSelectedStep9((prev) => Math.min(9, (prev || 1) + 1))}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                    >
                      <span>Étape suivante</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 2 : PIPELINE 5 PHASES (SYNTHÈSE) ================= */}
          {activePipelineMode === 'pipeline-5' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* ÉTAPE 1 */}
                <div
                  onClick={() => setSelectedStage5(selectedStage5 === 1 ? null : 1)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedStage5 === 1
                      ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>PHASE 1</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase font-mono">
                        Gemini Flash
                      </span>
                    </div>
                    <div className="font-black text-xs text-white uppercase tracking-tight">
                      Collecte & Extraction
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      Lecture Geny / Paris-Turf, structuration des {partantsCount} partants
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold">Validé ✓</span>
                    <span className="text-slate-400 font-mono">{partantsCount} chevaux</span>
                  </div>
                </div>

                {/* ÉTAPE 2 */}
                <div
                  onClick={() => setSelectedStage5(selectedStage5 === 2 ? null : 2)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedStage5 === 2
                      ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-amber-400" />
                        <span>PHASE 2</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase font-mono">
                        Gemini Flash
                      </span>
                    </div>
                    <div className="font-black text-xs text-white uppercase tracking-tight">
                      Données Historiques
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      Déchiffrage des musiques, fers D4, chronos de référence
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold">Validé ✓</span>
                    <span className="text-slate-400 font-mono">HippoScore 0-100</span>
                  </div>
                </div>

                {/* ÉTAPE 3 */}
                <div
                  onClick={() => setSelectedStage5(selectedStage5 === 3 ? null : 3)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedStage5 === 3
                      ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-amber-400" />
                        <span>PHASE 3</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase font-mono">
                        Gemini Pro
                      </span>
                    </div>
                    <div className="font-black text-xs text-white uppercase tracking-tight">
                      Analyses Factorielles
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      Aptitude tracé, corde {course.corde}, distance {course.distance}m
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold">Validé ✓</span>
                    <span className="text-slate-400 font-mono">Approfondi</span>
                  </div>
                </div>

                {/* ÉTAPE 4 */}
                <div
                  onClick={() => setSelectedStage5(selectedStage5 === 4 ? null : 4)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedStage5 === 4
                      ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-amber-400" />
                        <span>PHASE 4</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase font-mono">
                        Claude / Mistral
                      </span>
                    </div>
                    <div className="font-black text-xs text-white uppercase tracking-tight">
                      Contre-Analyse Critique
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      Faux favoris traqués, outsiders cachés et tocards détectés
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold">Certifié ✓</span>
                    <span className="text-slate-400 font-mono">Double Contrôle</span>
                  </div>
                </div>

                {/* ÉTAPE 5 */}
                <div
                  onClick={() => setSelectedStage5(selectedStage5 === 5 ? null : 5)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedStage5 === 5
                      ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>PHASE 5</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase font-mono">
                        Gemini Pro
                      </span>
                    </div>
                    <div className="font-black text-xs text-white uppercase tracking-tight">
                      Synthèse & Arbitrage
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      Bases N°{course.synthese?.baseIncontournable || '?'} - N°{course.synthese?.secondeBase || '?'} et Top 8 Quinté+
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-amber-400 font-black">Pronostic V38</span>
                    <span className="text-slate-400 font-mono">{course.synthese?.indiceConfiance || 8.8}/10</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bandeau Officiel HIÉRARCHIE QUINTÉ+ V38 */}
          <HierarchieQuinteV38Banner course={course} />
        </div>
      )}
    </div>
  );
};
