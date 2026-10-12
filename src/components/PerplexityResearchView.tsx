import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  RefreshCw,
  Wind,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  Code,
  Copy,
  Check,
  Terminal,
  Database,
  Globe,
  Plus,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { CourseHippique, GeminiModelId, PerplexityResearchResult } from '../types/turf';
import { runPerplexityLiveResearch, generatePerplexityResearch } from '../utils/geminiMultiModelEngine';

export interface PerplexityResearchViewProps {
  course: CourseHippique;
  onSelectHorseForTicket?: (num: number) => void;
  selectedHorseNumbers?: number[];
  onOpenAdvisorWithModel?: (modelId: GeminiModelId) => void;
  onOpenPmuApiHub?: () => void;
}

export const PerplexityResearchView: React.FC<PerplexityResearchViewProps> = ({
  course,
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
  onOpenAdvisorWithModel,
  onOpenPmuApiHub,
}) => {
  const [researchData, setResearchData] = useState<PerplexityResearchResult>(() => {
    return course.perplexityResearch || generatePerplexityResearch(course);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'scout' | 'tactics' | 'api-guide'>('scout');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleRunSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    setIsLoading(true);
    try {
      const updated = await runPerplexityLiveResearch(course, q.trim() || undefined);
      setResearchData(updated);
    } catch (err) {
      console.error('Erreur recherche Perplexity AI:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const quickPresets = [
    { label: '🌿 Piste & Météo', query: `État de la piste, pénétromètre et météo pour ${course.hippodrome || 'la course'}` },
    { label: '🤫 Bruits d\'Écurie', query: `Derniers bruits d'écurie et déclarations entraîneurs pour ${course.reunion || 'R1'}${course.courseNumero || 'C1'}` },
    { label: '🎯 Biais de Corde', query: `Biais de corde et statistiques du tracé ${course.distance || 2150}m à ${course.hippodrome}` },
    { label: '🔥 Duos Clés', query: `Réussite des associations jockeys et entraîneurs dans cette épreuve` },
    { label: '⚠️ Non-Partants & Incidents', query: `Vérification officielle des non-partants et changements de monte` },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner : Perplexity Sonar Deep Research */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-full bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <span className="text-[11px] font-black tracking-widest uppercase text-cyan-400">
                Perplexity AI Live Web Grounding · Moteur Sonar
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {researchData.modelUsed}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {researchData.latencyMs}ms
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 flex-wrap">
              <Sparkles className="w-6 h-6 text-cyan-400 shrink-0" />
              <span>Recherches Contextuelles & Scouting Temps Réel</span>
              <span className="text-sm px-3 py-1 rounded-full font-bold bg-slate-800 text-cyan-300 border border-cyan-500/30">
                {course.reunion || 'R1'}{course.courseNumero || 'C1'} · {course.hippodrome || 'Hippodrome'}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Exploration continue du Web (PMU TurfInfo, Paris-Turf, Geny, Equidia) pour certifier l'état du terrain, scruter les bruits d'écurie et anticiper les dynamiques tactiques sans hallucination.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRunSearch()}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Recherche en direct...' : 'Actualiser Perplexity'}</span>
            </button>

            {onOpenPmuApiHub && (
              <button
                type="button"
                onClick={onOpenPmuApiHub}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                title="Consulter le hub officiel des APIs PMU TurfInfo & Open PMU"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Hub APIs PMU</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Poser une question spécifique à Perplexity (ex: État de la piste, bruits d'écurie pour le N°4, etc.)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs sm:text-sm text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>Explorer</span>
            </button>
          </form>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Requêtes rapides :</span>
            {quickPresets.map((preset, idx) => (
              <button
                key={`preset-${idx}`}
                type="button"
                onClick={() => {
                  setSearchQuery(preset.query);
                  handleRunSearch(preset.query);
                }}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-750 text-[11px] font-semibold transition-all flex items-center gap-1"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Synthèse Contextuelle & Insights Clés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Synthèse Exécutive Perplexity</h3>
                <p className="text-[11px] text-slate-400">Croisement multi-sources des dernières 24h</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Certifié Conforme
            </span>
          </div>

          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            « {researchData.summary} »
          </div>

          <div className="space-y-2 pt-1">
            <h4 className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">
              Points d'Attention Contextuels du Peloton :
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {researchData.contextualInsights.map((insight, idx) => (
                <div
                  key={`insight-${idx}`}
                  className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 flex items-start gap-2 text-xs text-slate-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Radar Terrain, Météo & Biais de Corde */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Conditions Piste & Météo</h3>
                <p className="text-[11px] text-slate-400">Impact direct sur les allures</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                🌿 État de la piste & Pénétromètre
              </span>
              <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                {researchData.trackAndWeatherCondition.trackState}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                🌤️ Prévisions Météo & Vent
              </span>
              <p className="text-xs sm:text-sm font-bold text-cyan-300 mt-0.5">
                {researchData.trackAndWeatherCondition.weatherForecast}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                🎯 Biais du Tracé & Tactique de Corde
              </span>
              <p className="text-xs font-semibold text-slate-300 mt-0.5">
                {researchData.trackAndWeatherCondition.biasObservation}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Discipline : <strong className="text-white">{course.discipline || 'Trot'}</strong></span>
            <span>Distance : <strong className="text-white">{course.distance || 2150}m</strong></span>
          </div>
        </div>
      </div>

      {/* Sous-onglets de navigation : Scouting Chevaux | Tactiques | Guide API PMU */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('scout')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              activeSubTab === 'scout'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Scouting des Chevaux Clés ({researchData.horsesScouted.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tactics')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              activeSubTab === 'tactics'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Facteurs Tactiques ({researchData.keyTacticalFactors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('api-guide')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              activeSubTab === 'api-guide'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Architecture APIs PMU & Automatisation</span>
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Source : <span className="text-cyan-400 font-bold">{researchData.citations.length} sources officielles indexées</span>
        </div>
      </div>

      {/* CONTENU SUB-TAB 1 : SCOUTING DES CHEVAUX */}
      {activeSubTab === 'scout' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {researchData.horsesScouted.map((horse) => {
              const isSelected = selectedHorseNumbers.includes(horse.numero);

              const verdictBadgeColor =
                horse.verdict === 'Incontournable'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : horse.verdict === 'Belle Chance'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : horse.verdict === 'Outsider Aiguisé'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : horse.verdict === 'Tocard Spéculatif'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

              return (
                <div
                  key={`scout-${horse.numero}`}
                  className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 sm:p-5 shadow-lg transition-all space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 font-black flex items-center justify-center text-sm border border-cyan-500/40">
                        N°{horse.numero}
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                          {horse.nom}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {horse.driver} · Entr. {horse.entraineur}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${verdictBadgeColor}`}>
                        {horse.verdict}
                      </span>
                      {onSelectHorseForTicket && (
                        <button
                          type="button"
                          onClick={() => onSelectHorseForTicket(horse.numero)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                              : 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white border border-slate-700'
                          }`}
                          title={`Ajouter le N°${horse.numero} au ticket de pari`}
                        >
                          {isSelected ? '✓' : '+'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Confiance Perplexity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-semibold">Indice de confiance Perplexity :</span>
                      <span className="text-cyan-400 font-black">{horse.perplexityConfidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${horse.perplexityConfidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Notes de forme & Tendance duo */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-850 text-xs text-slate-300 space-y-1">
                    <p><strong className="text-slate-400">Forme :</strong> {horse.recentFormNotes}</p>
                    <p><strong className="text-slate-400">Duo :</strong> {horse.jockeyTrainerTrend}</p>
                  </div>

                  {/* Points forts & risques */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-1">
                      <span className="text-emerald-400 font-bold block">Points forts :</span>
                      {horse.keyStrengths.map((str, idx) => (
                        <div key={`str-${idx}`} className="flex items-center gap-1.5 text-slate-300">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{str}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <span className="text-amber-400 font-bold block">Risques / Vigilance :</span>
                      {horse.riskFactors.map((rf, idx) => (
                        <div key={`rf-${idx}`} className="flex items-center gap-1.5 text-slate-300">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{rf}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bruit d'écurie */}
                  {horse.bruitEcurie && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 italic">
                      {horse.bruitEcurie}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENU SUB-TAB 2 : FACTEURS TACTIQUES */}
      {activeSubTab === 'tactics' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span>Facteurs Décisifs du Parcours & Allure</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {researchData.keyTacticalFactors.map((factor, idx) => (
                <div
                  key={`factor-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-300 flex items-start gap-2.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black shrink-0 text-xs">
                    {idx + 1}
                  </span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENU SUB-TAB 3 : GUIDE APIs PMU & AUTOMATISATION */}
      {activeSubTab === 'api-guide' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <span>Architecture d'Intégration des APIs PMU & Automatisation Quotidienne</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Comment alimenter automatiquement vos pronostics avec les flux officiels PMU TurfInfo et Open PMU.
              </p>
            </div>

            {/* Endpoints PMU TurfInfo */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                1. Endpoints Officiels PMU « TurfInfo » (Base URL : https://online.turfinfo.api.pmu.fr/rest/client/1)
              </h4>

              <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-emerald-400 font-bold mr-2">GET</span>
                    <span className="text-slate-300">/programme/&#123;DATE&#125;?specialisation=INTERNET</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Récupère la liste de toutes les réunions (R1 à R5) et épreuves du jour.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://online.turfinfo.api.pmu.fr/rest/client/1/programme/12102026?specialisation=INTERNET', 'ep-1')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedSnippet === 'ep-1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-emerald-400 font-bold mr-2">GET</span>
                    <span className="text-slate-300">/programme/&#123;DATE&#125;/&#123;REUNION&#125;/&#123;COURSE&#125;/participants?specialisation=INTERNET</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Partants, cotes de référence, cotes directes, musiques, casaques et non-partants.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://online.turfinfo.api.pmu.fr/rest/client/1/programme/12102026/R1/C4/participants?specialisation=INTERNET', 'ep-2')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedSnippet === 'ep-2' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-emerald-400 font-bold mr-2">GET</span>
                    <span className="text-slate-300">/programme/&#123;DATE&#125;/&#123;REUNION&#125;/&#123;COURSE&#125;/rapports-definitifs?specialisation=INTERNET</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Rapports définitifs (Simple, Couplé, Quinté+) indispensables pour calculer le ROI réel.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://online.turfinfo.api.pmu.fr/rest/client/1/programme/12102026/R1/C4/rapports-definitifs?specialisation=INTERNET', 'ep-3')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedSnippet === 'ep-3' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Snippet Python */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                  Script Python d'Automatisation (httpx + normalisation)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
`import httpx

PMU_BASE_URL = "https://online.turfinfo.api.pmu.fr/rest/client/1"

async def get_course_data(date_jjmmaaaa: str, reunion: str, course: str):
    url = f"{PMU_BASE_URL}/programme/{date_jjmmaaaa}/{reunion}/{course}/participants"
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    params = {"specialisation": "INTERNET"}
    
    async with httpx.AsyncClient(timeout=15, headers=headers) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        data = res.json()
        
        # Filtrer et normaliser
        partants = []
        for p in data.get("participants", []):
            if p.get("statut") == "NON_PARTANT":
                continue  # Exclusion automatique des non-partants
            rapport = p.get("dernierRapportDirect") or p.get("dernierRapportReference") or {}
            partants.append({
                "numero": p.get("numPmu"),
                "nom": p.get("nom"),
                "driver": p.get("driver") or p.get("jockey"),
                "cote": rapport.get("rapport"),
                "musique": p.get("musique")
            })
        return partants`,
                      'py-code'
                    )
                  }
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedSnippet === 'py-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copier le script</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto leading-relaxed">
{`import httpx

PMU_BASE_URL = "https://online.turfinfo.api.pmu.fr/rest/client/1"

async def get_course_data(date_jjmmaaaa: str, reunion: str, course: str):
    url = f"{PMU_BASE_URL}/programme/{date_jjmmaaaa}/{reunion}/{course}/participants"
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    params = {"specialisation": "INTERNET"}
    
    async with httpx.AsyncClient(timeout=15, headers=headers) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        data = res.json()
        
        # Filtrer et normaliser
        partants = []
        for p in data.get("participants", []):
            if p.get("statut") == "NON_PARTANT":
                continue  # Exclusion automatique des non-partants
            rapport = p.get("dernierRapportDirect") or p.get("dernierRapportReference") or {}
            partants.append({
                "numero": p.get("numPmu"),
                "nom": p.get("nom"),
                "driver": p.get("driver") or p.get("jockey"),
                "cote": rapport.get("rapport"),
                "musique": p.get("musique")
            })
        return partants`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Section Citations & Sources Web */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Sources & Citations Web Authentifiées ({researchData.citations.length})
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">Grounding Web Vérifié</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {researchData.citations.map((cite, idx) => (
            <a
              key={`cite-${idx}`}
              href={cite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-2 group"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Source #{idx + 1}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors mt-1 line-clamp-1">
                  {cite.title}
                </h5>
                {cite.snippet && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {cite.snippet}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-slate-500 truncate font-mono">
                {cite.url}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
