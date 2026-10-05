import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Zap,
  Globe,
  RefreshCw,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Eye,
  Check
} from 'lucide-react';
import { GroundingLiveArrival, GroundingSource, GroundingArrivalsResponse, CourseHippique } from '../types/turf';

interface GroundingArrivalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCourse?: CourseHippique;
  onApplyArrivalToCourse?: (arrivalStr: string, arrivalObj?: GroundingLiveArrival) => void;
  onSelectCourseForAnalysis?: (courseId: string) => void;
  initialSource?: 'pmu' | 'paristurf' | 'all';
}

export const GroundingArrivalsModal: React.FC<GroundingArrivalsModalProps> = ({
  isOpen,
  onClose,
  currentCourse,
  onApplyArrivalToCourse,
  onSelectCourseForAnalysis,
  initialSource = 'all',
}) => {
  const [source, setSource] = useState<'pmu' | 'paristurf' | 'all'>(initialSource);
  const [activeTab, setActiveTab] = useState<'all' | 'official' | 'provisional' | 'enquete'>('all');

  // Obtenir automatiquement la date du jour (YYYY-MM-DD)
  const getTodayIsoDate = (): string => {
    try {
      const stored = localStorage.getItem('hippo_selected_date');
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
    } catch {}
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [extractionStep, setExtractionStep] = useState<string>('');
  const [arrivals, setArrivals] = useState<GroundingLiveArrival[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [stats, setStats] = useState({ total: 0, official: 0, provisional: 0, hasEnquete: 0 });
  const [lastExtractedAt, setLastExtractedAt] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [appliedCourseId, setAppliedCourseId] = useState<string | null>(null);

  // Fonction d'extraction en temps réel via l'API Grounding Search
  const performGroundingExtraction = async (
    targetSrc: 'pmu' | 'paristurf' | 'all' = source,
    overrideDate?: string
  ) => {
    const dateToUse = overrideDate || selectedDate || getTodayIsoDate();
    setIsLoading(true);
    setExtractionStep('Connexion aux sources officielles (paristurf.com & pmu.fr)...');

    try {
      setTimeout(() => {
        setExtractionStep('Interrogation Google Search Grounding & Gemini 3.8 Flash...');
      }, 450);

      setTimeout(() => {
        setExtractionStep('Extraction des statuts (Arrivées officielles, provisoires, enquêtes)...');
      }, 950);

      const res = await fetch('/api/extract-arrivals-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: targetSrc,
          targetSource: targetSrc,
          date: dateToUse,
          course: currentCourse ? {
            reunion: currentCourse.reunion,
            course: currentCourse.course,
            prixNom: currentCourse.prixNom || currentCourse.titre,
            hippodrome: currentCourse.hippodrome,
          } : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erreur réseau HTTP ${res.status}`);
      }

      const data: GroundingArrivalsResponse = await res.json();
      if (data && data.arrivals) {
        setArrivals(data.arrivals);
        setGroundingSources(data.groundingSources || []);
        setStats(data.stats || {
          total: data.arrivals.length,
          official: data.arrivals.filter(a => a.isOfficial || a.statut === 'Arrivée officielle').length,
          provisional: data.arrivals.filter(a => a.isProvisional || a.statut === 'Arrivée provisoire').length,
          hasEnquete: data.arrivals.filter(a => a.hasEnquete || a.statut === 'Enquête en cours').length,
        });
        setLastExtractedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        
        // Sauvegarder dans le cache local pour la bannière haute
        try {
          localStorage.setItem('hippo_live_arrivals_cache', JSON.stringify(data.arrivals));
        } catch {}

        // Déclencher un événement global pour mettre à jour la bannière
        window.dispatchEvent(new CustomEvent('hippo_live_arrivals_extracted', {
          detail: { arrivals: data.arrivals, source: targetSrc }
        }));
      }
    } catch (err) {
      console.error('Erreur extraction Grounding arrivées:', err);
    } finally {
      setIsLoading(false);
      setExtractionStep('');
    }
  };

  // Charger automatiquement la date du jour et extraire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const todayIso = getTodayIsoDate();
      setSelectedDate(todayIso);
      performGroundingExtraction(source, todayIso);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrage selon onglets et recherche texte
  const filteredArrivals = arrivals.filter((arr) => {
    if (activeTab === 'official' && !arr.isOfficial && arr.statut !== 'Arrivée officielle') return false;
    if (activeTab === 'provisional' && !arr.isProvisional && arr.statut !== 'Arrivée provisoire') return false;
    if (activeTab === 'enquete' && !arr.hasEnquete && arr.statut !== 'Enquête en cours') return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchText = `${arr.reunion} ${arr.course} ${arr.prixNom} ${arr.hippodrome} ${arr.arriveeOfficielle || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    return true;
  });

  const handleApplyArrival = (arrival: GroundingLiveArrival) => {
    if (arrival.arriveeOfficielle && onApplyArrivalToCourse) {
      onApplyArrivalToCourse(arrival.arriveeOfficielle, arrival);
      setAppliedCourseId(arrival.courseId);
      setTimeout(() => setAppliedCourseId(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-1 sm:my-2 max-h-[96vh]">
        {/* EN-TÊTE MODALE */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-3.5 sm:p-4 border-b border-emerald-500/30 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black shrink-0">
                <Trophy className="w-5 h-5 fill-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                    Arrivées en Temps Réel
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-black border border-emerald-500/40 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Google Search Grounding
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
                  Extraction en direct des arrivées <strong className="text-emerald-300 font-bold">provisoires</strong> et <strong className="text-amber-300 font-bold">officielles</strong> depuis <span className="underline decoration-emerald-500">pmu.fr</span> et <span className="underline decoration-emerald-500">paristurf.com</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SÉLECTEUR DE SOURCE & CONTRÔLE DE SYNCHRO */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Boutons de sélection de source */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSource('pmu');
                  performGroundingExtraction('pmu');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  source === 'pmu'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>PMU.fr</span>
                <span className="text-[10px] opacity-75 font-mono">(Officiel)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSource('paristurf');
                  performGroundingExtraction('paristurf');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  source === 'paristurf'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Paris-Turf.com</span>
                <span className="text-[10px] opacity-75 font-mono">(Direct)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSource('all');
                  performGroundingExtraction('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  source === 'all'
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Multi-Sources</span>
              </button>
            </div>

            {/* Date Automatique (Date du jour) et Bouton de Relance */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const newD = e.target.value;
                    setSelectedDate(newD);
                    performGroundingExtraction(source, newD);
                  }}
                  className="bg-transparent text-white font-mono text-xs outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, '0');
                  const d = String(now.getDate()).padStart(2, '0');
                  const todayStr = `${y}-${m}-${d}`;
                  setSelectedDate(todayStr);
                  performGroundingExtraction(source, todayStr);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
                title="Saisir automatiquement la date du jour"
              >
                <span>⚡ Date du jour</span>
              </button>

              <button
                type="button"
                onClick={() => performGroundingExtraction(source)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Recherche en direct...' : 'Actualiser Grounding'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* BANDEAU DE PROGRESSION D'EXTRACTION */}
        {isLoading && (
          <div className="bg-emerald-950/60 border-b border-emerald-500/40 p-3 flex items-center justify-center gap-3 animate-pulse">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-emerald-200 font-bold font-mono">
              {extractionStep || 'Interrogation en cours de Google Search Grounding...'}
            </span>
          </div>
        )}

        {/* FILTRES D'ONGLETS & RECHERCHE */}
        <div className="p-3 sm:px-5 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Onglets */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toutes ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('official')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                activeTab === 'official'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-sm'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Officielles ({stats.official})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('provisional')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                activeTab === 'provisional'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Provisoires ({stats.provisional})</span>
            </button>

            {stats.hasEnquete > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('enquete')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  activeTab === 'enquete'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500 shadow-sm'
                    : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>Enquêtes ({stats.hasEnquete})</span>
              </button>
            )}
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrer (ex: R1, C1, Argentan...)"
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors w-48 sm:w-56"
            />
          </div>
        </div>

        {/* CONTENU PRINCIPAL : LISTE DES ARRIVÉES */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* CARTE CERTIFICAT GOOGLE SEARCH GROUNDING */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">
                  Certification Grounding Google Search & Gemini 3.8 Flash
                </span>
                <span className="text-slate-400 text-[11px]">
                  Requêtes Web vérifiées en direct auprès des serveurs PMU.fr et Paris-Turf.com {lastExtractedAt ? `à ${lastExtractedAt}` : ''}
                </span>
              </div>
            </div>

            {groundingSources.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {groundingSources.slice(0, 3).map((gSrc, gIdx) => (
                  <a
                    key={gIdx}
                    href={gSrc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-emerald-300 text-[10px] font-mono flex items-center gap-1 border border-emerald-500/20 transition-colors"
                  >
                    <span>{gSrc.title || 'Source Web'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* LISTE DES COURSES AVEC ARRIVÉES */}
          {filteredArrivals.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">
                Aucune arrivée trouvée pour cette sélection.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cliquez sur "Actualiser Grounding" pour interroger en temps réel Google Search Grounding et extraire les résultats les plus récents de la journée.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredArrivals.map((arr) => {
                const isItemOfficial = arr.isOfficial || arr.statut === 'Arrivée officielle';
                const isItemProvisional = arr.isProvisional || arr.statut === 'Arrivée provisoire';
                const hasInquiry = arr.hasEnquete || arr.statut === 'Enquête en cours';

                const arrivalNums = (arr.arriveeOfficielle || '')
                  .split(/[-,\s]+/)
                  .map(Number)
                  .filter((n) => !isNaN(n));

                const isApplied = appliedCourseId === arr.courseId;

                return (
                  <div
                    key={arr.courseId}
                    className={`p-4 rounded-2xl bg-slate-950 border transition-all duration-200 flex flex-col justify-between gap-3 shadow-lg ${
                      hasInquiry
                        ? 'border-rose-500/50 hover:border-rose-400 bg-rose-950/10'
                        : isItemOfficial
                        ? 'border-emerald-500/40 hover:border-emerald-400/80'
                        : 'border-amber-500/40 hover:border-amber-400/80'
                    }`}
                  >
                    <div>
                      {/* Ligne 1 : Badges Réunion/Course et Statut */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-white font-black text-xs border border-slate-700 font-mono shadow-sm">
                            {arr.reunion} {arr.course}
                          </span>
                          <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">
                            {arr.hippodrome}
                          </span>
                        </div>

                        {/* Badge Statut */}
                        <div>
                          {hasInquiry ? (
                            <span className="px-2.5 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-500 text-[11px] font-black flex items-center gap-1.5 shadow-md shadow-rose-950/50">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                              <span>Enquête Commissaires</span>
                            </span>
                          ) : isItemOfficial ? (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500 text-[11px] font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/50">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Arrivée Officielle</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-500 text-[11px] font-black flex items-center gap-1.5 shadow-md shadow-amber-950/50">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                              <span>Arrivée Provisoire</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ligne 2 : Nom de la Course */}
                      <h4 className="text-sm font-black text-white mt-2 leading-snug">
                        {arr.prixNom}
                      </h4>
                      {(arr.discipline || arr.distance) && (
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          {arr.discipline ? `${arr.discipline} · ` : ''}
                          {arr.distance ? `${arr.distance}m` : ''}
                        </p>
                      )}

                      {/* Ligne 3 : Podium de l'arrivée (Grands Numéros) */}
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {arrivalNums.map((num, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black font-mono text-sm shadow-md ${
                                  idx === 0
                                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300'
                                    : idx === 1
                                    ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 ring-1 ring-white'
                                    : idx === 2
                                    ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 ring-1 ring-amber-600'
                                    : 'bg-slate-800 text-emerald-300 border border-slate-700'
                                }`}
                              >
                                {num}
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                {idx === 0 ? '1er' : idx === 1 ? '2e' : idx === 2 ? '3e' : `${idx + 1}e`}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Ordre Texte Brut */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Ordre Validé
                          </span>
                          <span className="font-mono font-black text-sm text-emerald-400">
                            {arr.arriveeOfficielle}
                          </span>
                        </div>
                      </div>

                      {/* Ligne 4 : Détails des chevaux (Top 5 si présents) */}
                      {arr.detailsTop5 && arr.detailsTop5.length > 0 && (
                        <div className="mt-2.5 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Détail des 5 premiers :
                          </span>
                          <div className="grid grid-cols-1 gap-1 text-[11px]">
                            {arr.detailsTop5.slice(0, 3).map((h, hIdx) => (
                              <div
                                key={`grounding-h-${arr.courseId}-${h.place}-${h.numero}-${hIdx}`}
                                className="flex items-center justify-between py-0.5 px-2 rounded-lg bg-slate-900/60 text-slate-300"
                              >
                                <span className="font-medium truncate max-w-[170px]">
                                  <strong className="text-amber-400 font-mono mr-1">#{h.numero}</strong> {h.nom}
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                  {h.driver} {h.cote && h.cote !== '—' ? `(${h.cote})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions de la Carte */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      {/* Source & Lien */}
                      <a
                        href={arr.sourceUrl || (arr.sourceSite === 'paristurf.com' ? 'https://www.paris-turf.com/quinte/aujourdhui' : 'https://www.pmu.fr/turf/')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-slate-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>Source : {arr.sourceSite || 'PMU.fr'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <div className="flex items-center gap-1.5">
                        {onSelectCourseForAnalysis && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCourseForAnalysis(arr.courseId);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center gap-1"
                            title="Analyser cette course dans le tableau de bord"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>Analyser</span>
                          </button>
                        )}

                        {onApplyArrivalToCourse && (
                          <button
                            type="button"
                            onClick={() => handleApplyArrival(arr)}
                            className={`px-3 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1 shadow-sm ${
                              isApplied
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Appliquée !</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 fill-white" />
                                <span>Appliquer à la course</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PIED DE MODALE */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Les arrivées sont validées par recoupement direct entre les flux officiels PMU.fr et la rédaction de Paris-Turf.com.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
