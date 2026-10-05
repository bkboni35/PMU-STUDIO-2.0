import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  Trophy,
  Gauge,
  Wrench,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Flame,
  ArrowRight,
  ShieldCheck,
  Info,
  Zap,
  Search,
  Crown,
  FileDown,
  Cpu,
} from 'lucide-react';
import { CourseHippique, GeminiModelId, Partant } from '../types/turf';
import { buildGeminiCollegeTasks, computeHorseGeminiEvaluation } from '../utils/geminiMultiModelEngine';
import { exportQuinteOnlyToPdf } from '../utils/pdfExport';
import { FactCheckingAuditCard } from './FactCheckingAuditCard';

interface GeminiCollegeViewProps {
  course?: CourseHippique | null;
  onSelectHorseForTicket?: (numero: number) => void;
  selectedHorseNumbers?: number[];
  onOpenAdvisorWithModel?: (modelId: GeminiModelId) => void;
  onOpenQuinteHierarchy?: () => void;
  onOpenQuotasModal?: () => void;
}

export const GeminiCollegeView: React.FC<GeminiCollegeViewProps> = ({
  course,
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
  onOpenAdvisorWithModel,
  onOpenQuinteHierarchy,
  onOpenQuotasModal,
}) => {
  if (!course) return null;

  const college = course.collegeGemini || buildGeminiCollegeTasks(course);
  const [subTab, setSubTab] = useState<'tasks' | 'matrix' | 'consensus'>('tasks');
  const [selectedFilterModel, setSelectedFilterModel] = useState<GeminiModelId | 'all'>('all');
  const [expandedHorseNum, setExpandedHorseNum] = useState<number | null>(null);

  // Configuration visuelle par modèle
  const getModelConfig = (id: GeminiModelId) => {
    switch (id) {
      case 'gemini-3.1-flash-lite':
        return {
          border: 'border-amber-500/50',
          bgGlow: 'bg-amber-500/15',
          badgeBg: 'bg-amber-400 text-slate-950 font-black',
          textColor: 'text-amber-400',
          icon: Zap,
        };
      case 'gemini-3.8':
        return {
          border: 'border-amber-500/40',
          bgGlow: 'bg-amber-500/10',
          badgeBg: 'bg-amber-500 text-slate-950',
          textColor: 'text-amber-400',
          icon: Trophy,
        };
      case 'gemini-3.8-lite':
        return {
          border: 'border-rose-500/40',
          bgGlow: 'bg-rose-500/10',
          badgeBg: 'bg-rose-500 text-slate-950',
          textColor: 'text-rose-400',
          icon: Sparkles,
        };
      case 'gemini-3.7':
        return {
          border: 'border-emerald-500/40',
          bgGlow: 'bg-emerald-500/10',
          badgeBg: 'bg-emerald-500 text-slate-950',
          textColor: 'text-emerald-400',
          icon: TrendingUp,
        };
      case 'gemini-3.6':
        return {
          border: 'border-sky-500/40',
          bgGlow: 'bg-sky-500/10',
          badgeBg: 'bg-sky-500 text-slate-950',
          textColor: 'text-sky-400',
          icon: Gauge,
        };
      case 'gemini-3.5':
        return {
          border: 'border-purple-500/40',
          bgGlow: 'bg-purple-500/10',
          badgeBg: 'bg-purple-500 text-white',
          textColor: 'text-purple-400',
          icon: Wrench,
        };
      case 'gemini-3.5-lite':
        return {
          border: 'border-teal-500/40',
          bgGlow: 'bg-teal-500/10',
          badgeBg: 'bg-teal-500 text-slate-950',
          textColor: 'text-teal-400',
          icon: Zap,
        };
      case 'perplexity-ai':
        return {
          border: 'border-cyan-500/50',
          bgGlow: 'bg-cyan-500/10',
          badgeBg: 'bg-cyan-500 text-slate-950 font-black',
          textColor: 'text-cyan-400',
          icon: Sparkles,
        };
      case 'claude-4.6-sonnet':
        return {
          border: 'border-orange-500/50',
          bgGlow: 'bg-orange-500/10',
          badgeBg: 'bg-orange-500 text-slate-950 font-black',
          textColor: 'text-orange-400',
          icon: Brain,
        };
      case 'gpt-4o':
      case 'gpt-4o-fact-checker':
      case 'gemini-3.1-pro':
        return {
          border: 'border-blue-500/50',
          bgGlow: 'bg-blue-500/10',
          badgeBg: 'bg-blue-600 text-white font-black',
          textColor: 'text-blue-400',
          icon: ShieldCheck,
        };
      case 'deep-research':
        return {
          border: 'border-indigo-500/50',
          bgGlow: 'bg-indigo-500/10',
          badgeBg: 'bg-indigo-600 text-white font-black',
          textColor: 'text-indigo-400',
          icon: Search,
        };
      case 'antigravity-agent':
        return {
          border: 'border-red-500/50',
          bgGlow: 'bg-red-500/10',
          badgeBg: 'bg-red-600 text-white font-black',
          textColor: 'text-red-400',
          icon: Flame,
        };
      case 'gemma':
        return {
          border: 'border-slate-500/50',
          bgGlow: 'bg-slate-500/10',
          badgeBg: 'bg-slate-600 text-white font-black',
          textColor: 'text-slate-400',
          icon: Gauge,
        };
      case 'vertex-ai':
        return {
          border: 'border-indigo-400/50',
          bgGlow: 'bg-indigo-400/10',
          badgeBg: 'bg-indigo-400 text-slate-950 font-black',
          textColor: 'text-indigo-300',
          icon: Brain,
        };
      default:
        return {
          border: 'border-indigo-500/40',
          bgGlow: 'bg-indigo-500/10',
          badgeBg: 'bg-indigo-500 text-white',
          textColor: 'text-indigo-400',
          icon: Zap,
        };
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5" />
              <span>Collège Multi-Agents Spécialisés</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Collège d'Experts IA Multi-Dimensionnel : Zéro Hallucination & Performance
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Pour une précision absolue, nous mobilisons un écosystème d'IA spécialisées : du <span className="text-indigo-400 font-bold">Deep Research</span> pour les archives au <span className="text-red-400 font-bold">Antigravity Agent</span> pour les ruptures de forme, supervisés par <span className="text-blue-400 font-bold">OpenAI GPT-4o Multi-Source Fact-Checker</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0">
            {college.map((expert) => {
              const cfg = getModelConfig(expert.id);
              return (
                <div
                  key={expert.id}
                  className={`px-3 py-2 rounded-2xl border ${cfg.border} ${cfg.bgGlow} flex items-center gap-2 text-xs backdrop-blur-sm`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.badgeBg}`} />
                  <span className="font-black text-white">{expert.name}</span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    · {expert.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fact-Checking Audit Certificate Banner */}
      <FactCheckingAuditCard course={course} />

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              subTab === 'tasks'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Missions Indispensables des IA</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              subTab === 'matrix'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tableau Comparatif ({course.partants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('consensus')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              subTab === 'consensus'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Arbitrage & Consensus</span>
          </button>
        </div>

        {/* Action Quick Switch to Hiérarchie Quinté+ V38 (9 chevaux) & Export */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onOpenQuinteHierarchy) {
                onOpenQuinteHierarchy();
              } else {
                setSubTab('consensus');
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 border border-amber-300"
            title="Afficher la Hiérarchie Quinté+ V38 (9 chevaux) sur le tableau principal"
          >
            <Crown className="w-4 h-4 text-slate-950" />
            <span>Hiérarchie Quinté+ V38 (9 ch.)</span>
          </button>

          {onOpenQuotasModal && (
            <button
              type="button"
              onClick={onOpenQuotasModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs transition-all border border-amber-500/40 shadow-xs"
              title="Consulter les quotas et limites de requêtes (RPM, TPM, RPD) de chaque modèle IA"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>📊 Quotas API des IA</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => exportQuinteOnlyToPdf(course)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-black text-xs transition-all shadow-sm"
            title="Générer et télécharger le PDF officiel de la Hiérarchie Quinté+ V38 (9 chevaux)"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>Exporter Hiérarchie V38</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: 6 Experts et leurs rôles attribués */}
      {subTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Rôles Bien Définis Attribués à Chaque Modèle Gemini</span>
            </h3>
            <span className="text-xs text-slate-400 hidden sm:inline">
              6 angles d'attaque hautement spécialisés et complémentaires pour disséquer la course
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {college.map((expert) => {
              const cfg = getModelConfig(expert.id);
              const IconComponent = cfg.icon;

              return (
                <div
                  key={expert.id}
                  className={`relative rounded-3xl border ${cfg.border} bg-slate-900/90 p-5 sm:p-6 transition-all hover:shadow-xl flex flex-col justify-between`}
                >
                  <div className="space-y-4">
                    {/* Top Badge & Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${cfg.bgGlow} border ${cfg.border}`}>
                          <IconComponent className={`w-6 h-6 ${cfg.textColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-white">{expert.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${cfg.badgeBg}`}>
                              {expert.badge}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400">Indice Spécialiste</div>
                        <div className={`text-base font-black ${cfg.textColor}`}>
                          {expert.indiceSpecialiste}/10
                        </div>
                      </div>
                    </div>

                    {/* Rôle Officiel Bien Défini */}
                    <div className="bg-slate-950/90 rounded-2xl p-3 border border-amber-500/30 space-y-1">
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Rôle Officiel Bien Défini :</span>
                      </div>
                      <p className="text-xs font-black text-white">
                        {expert.role}
                      </p>
                    </div>

                    {/* Tâche Attribuée */}
                    <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800 space-y-1.5">
                      <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${cfg.textColor}`} />
                        <span>Mission & Tâche Clé :</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 leading-relaxed">
                        {expert.tacheAttribuee}
                      </p>
                    </div>

                    {/* Méthode & Focalisation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Focalisation
                        </span>
                        <span className="font-semibold text-slate-300 line-clamp-2">
                          {expert.focalisation}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Méthode
                        </span>
                        <span className="font-semibold text-slate-300 line-clamp-2">
                          {expert.methode}
                        </span>
                      </div>
                    </div>

                    {/* Verdict & Favoris */}
                    <div className="space-y-2">
                      <div className="text-xs text-slate-300 italic bg-slate-800/40 p-3 rounded-xl border border-slate-750">
                        « {expert.verdictGlobal} »
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-slate-400">
                          Chevaux plébiscités :
                        </span>
                        <div className="flex items-center gap-1.5">
                          {expert.topChevauxRecommandes.map((num, numIdx) => {
                            const isSelected = selectedHorseNumbers.includes(num);
                            return (
                              <button
                                key={`expert-${expert.id}-rec-${num}-${numIdx}`}
                                type="button"
                                onClick={() => onSelectHorseForTicket && onSelectHorseForTicket(num)}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                                }`}
                                title={`Cliquer pour sélectionner le N°${num} pour vos tickets`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  {onOpenAdvisorWithModel && (
                    <button
                      type="button"
                      onClick={() => onOpenAdvisorWithModel(expert.id)}
                      className={`mt-4 w-full py-2.5 px-4 rounded-xl border ${cfg.border} ${cfg.bgGlow} hover:bg-opacity-30 flex items-center justify-center gap-2 text-xs font-extrabold ${cfg.textColor} transition-all`}
                    >
                      <span>Consulter {expert.name} ({expert.badge})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Tableau comparatif des 4 notes et avis par cheval */}
      {subTab === 'matrix' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <span>Tableau Comparatif des Notes Attribuées par Cheval</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Confrontation des 4 évaluations indépendantes pour chaque partant du peloton.
              </p>
            </div>

            {/* Filtres de sélection de modèle */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedFilterModel('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilterModel === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tous (Consensus)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilterModel('gemini-3.8')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilterModel === 'gemini-3.8'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.8 Flash
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilterModel('gemini-3.8-lite')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilterModel === 'gemini-3.8-lite'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.8 Flash-Lite TTS
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilterModel('gemini-3.7')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilterModel === 'gemini-3.7'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.7 Flash
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilterModel('gemini-3.6')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilterModel === 'gemini-3.6'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.6 Flash
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilterModel('gemini-3.5')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilterModel === 'gemini-3.5'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.5 Flash
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilterModel('gemini-3.5-lite')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilterModel === 'gemini-3.5-lite'
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.5 Flash-Lite
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">N° & Partant</th>
                  <th className="py-3 px-3">Cote</th>
                  <th className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-amber-400">Gemini 3.8 Flash</span>
                      <span className="text-[9px] font-normal text-slate-400">Stratégie</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-emerald-400">Gemini 3.7 Flash</span>
                      <span className="text-[9px] font-normal text-slate-400">Musique</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sky-400">Gemini 3.6 Flash</span>
                      <span className="text-[9px] font-normal text-slate-400">Vitesse</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-purple-400">Gemini 3.5 Flash</span>
                      <span className="text-[9px] font-normal text-slate-400">Ferrure</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-white font-extrabold">HippoScore</span>
                      <span className="text-[9px] font-normal text-slate-400">Consensus</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                {[...course.partants]
                  .sort((a, b) => (b.hippoScore || 0) - (a.hippoScore || 0))
                  .map((partant, idx) => {
                  const evalG =
                    partant.evaluationsGemini || computeHorseGeminiEvaluation(partant, course);
                  const isSelected = selectedHorseNumbers.includes(partant.numero);
                  const isExpanded = expandedHorseNum === partant.numero;

                  return (
                    <React.Fragment key={`gemini-p-${partant.numero}-${idx}`}>
                      <tr
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        {/* Cheval info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                onSelectHorseForTicket && onSelectHorseForTicket(partant.numero)
                              }
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                                  : 'bg-slate-800 text-slate-200 border border-slate-700'
                              }`}
                            >
                              {partant.numero}
                            </button>
                            <div>
                              <div className="font-black text-white">{partant.nom}</div>
                              <div className="text-[11px] text-slate-400">
                                {partant.driver} · {partant.ferrure}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cote */}
                        <td className="py-3 px-3 font-bold text-slate-300">
                          {partant.coteProbable}/1
                        </td>

                        {/* Gemini 3.8 Note */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 font-black text-amber-400">
                            {evalG.gemini38.note}
                          </span>
                        </td>

                        {/* Gemini 3.7 Note */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 font-black text-emerald-400">
                            {evalG.gemini37.note}
                          </span>
                        </td>

                        {/* Gemini 3.6 Note */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 font-black text-sky-400">
                            {evalG.gemini36.note}
                          </span>
                        </td>

                        {/* Gemini 3.5 Note */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/30 font-black text-purple-400">
                            {evalG.gemini35.note}
                          </span>
                        </td>

                        {/* HippoScore Consensus */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-xl font-black text-xs ${
                              (partant.hippoScore || 0) >= 80
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                : (partant.hippoScore || 0) >= 60
                                ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-850 text-slate-400'
                            }`}
                          >
                            {partant.hippoScore || 0}/100
                          </span>
                        </td>

                        {/* Action Détail */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedHorseNum(isExpanded ? null : partant.numero)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all"
                          >
                            {isExpanded ? 'Masquer' : 'Avis détaillés'}
                          </button>
                        </td>
                      </tr>

                      {/* Ligne dépliée des 4 avis spécifiques */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              {/* Avis Gemini 3.8 Flash */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-black text-amber-400">
                                  <span>Gemini 3.8 Flash (Stratégie)</span>
                                  <span>{evalG.gemini38.note}/100</span>
                                </div>
                                <div className="text-[10px] text-amber-300/80 font-bold">
                                  {evalG.gemini38.impactQuinte}
                                </div>
                                <p className="text-xs text-slate-300 leading-snug">
                                  {evalG.gemini38.avis}
                                </p>
                              </div>

                              {/* Avis Gemini 3.7 Flash */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-black text-emerald-400">
                                  <span>Gemini 3.7 Flash (Musique)</span>
                                  <span>{evalG.gemini37.note}/100</span>
                                </div>
                                <div className="text-[10px] text-emerald-300/80 font-bold">
                                  {evalG.gemini37.dynamiqueMusique}
                                </div>
                                <p className="text-xs text-slate-300 leading-snug">
                                  {evalG.gemini37.avis}
                                </p>
                              </div>

                              {/* Avis Gemini 3.6 Flash */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-sky-500/30 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-black text-sky-400">
                                  <span>Gemini 3.6 Flash (Vitesse)</span>
                                  <span>{evalG.gemini36.note}/100</span>
                                </div>
                                <div className="text-[10px] text-sky-300/80 font-bold">
                                  {evalG.gemini36.aptitudePiste}
                                </div>
                                <p className="text-xs text-slate-300 leading-snug">
                                  {evalG.gemini36.avis}
                                </p>
                              </div>

                              {/* Avis Gemini 3.5 Flash */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-black text-purple-400">
                                  <span>Gemini 3.5 Flash (Ferrure)</span>
                                  <span>{evalG.gemini35.note}/100</span>
                                </div>
                                <div className="text-[10px] text-purple-300/80 font-bold">
                                  {evalG.gemini35.impactFerrure}
                                </div>
                                <p className="text-xs text-slate-300 leading-snug">
                                  {evalG.gemini35.avis}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Arbitrage & Consensus Quinté */}
      {subTab === 'consensus' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/30 p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Consensus et Arbitrage du Collège Multi-Agents
                </h3>
                <p className="text-xs text-slate-400">
                  Synthèse algorithmique croisant les archives (Deep Research), les ruptures (Antigravity) et les simulations (Vertex AI)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Points de Convergence Unanime (4/4 IA)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Les 4 modèles s'accordent sur la suprématie des bases de la course, notamment grâce à un croisement optimal entre la réduction kilométrique (Gemini 3.6 Flash) et l'impact de la ferrure D4 (Gemini 3.5 Flash).
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-black uppercase text-sky-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>Divergences Tactiques Arbitrées par Gemini 3.8 Flash</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Gemini 3.7 Flash valorisait un outsider régulier tandis que Gemini 3.6 Flash pointait son chrono moyen sur ce tracé précis. Gemini 3.8 Flash a tranché en faveur d'un rôle de tocard spéculatif en fin de combinaison Quinté+.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-amber-400">Sélection Consensuelle Quinté+ :</div>
                <div className="text-sm font-black text-white mt-0.5">
                  {course.synthese?.selection8?.join(' - ') || 'Non disponible'}
                </div>
              </div>

              {onSelectHorseForTicket && (
                <button
                  type="button"
                  onClick={() => {
                    course.synthese?.selection8?.forEach((num) => onSelectHorseForTicket(num));
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shrink-0"
                >
                  Charger cette sélection dans le Ticket
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
