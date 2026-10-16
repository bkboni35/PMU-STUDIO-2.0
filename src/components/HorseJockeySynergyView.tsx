import React, { useState, useMemo } from 'react';
import { CourseHippique, Partant } from '../types/turf';
import {
  computeHorseJockeySynergy,
  generatePythonHorseJockeyScript,
  HorseJockeySynergyMetrics
} from '../utils/horseJockeySynergyEngine';
import {
  Users,
  Flame,
  Zap,
  Award,
  TrendingUp,
  AlertTriangle,
  Code,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info
} from 'lucide-react';

interface HorseJockeySynergyViewProps {
  course: CourseHippique;
}

export const HorseJockeySynergyView: React.FC<HorseJockeySynergyViewProps> = ({ course }) => {
  const partants = useMemo(() => course.partants || [], [course]);
  const [selectedHorseNumero, setSelectedHorseNumero] = useState<number>(
    partants[0]?.numero || 1
  );
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Selected horse partant
  const selectedPartant = useMemo(() => {
    return partants.find(p => p.numero === selectedHorseNumero) || partants[0] || {
      numero: 1,
      nom: 'Arturo',
      driver: 'A. Orani',
      entraineur: 'S. Guarato'
    } as Partant;
  }, [partants, selectedHorseNumero]);

  // Compute synergy metrics for selected horse
  const currentSynergy: HorseJockeySynergyMetrics = useMemo(() => {
    return selectedPartant.horseJockeySynergy || computeHorseJockeySynergy(selectedPartant.nom, selectedPartant.driver);
  }, [selectedPartant]);

  // Compute synergy metrics for ALL horses in the race for the ranking table
  const raceDuoRankings = useMemo(() => {
    return partants.map(p => {
      const syn = p.horseJockeySynergy || computeHorseJockeySynergy(p.nom, p.driver);
      return {
        partant: p,
        synergy: syn
      };
    }).sort((a, b) => b.synergy.horseJockeyTop3Surplus - a.synergy.horseJockeyTop3Surplus);
  }, [partants]);

  const pythonScript = useMemo(() => generatePythonHorseJockeyScript(), []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER HERO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Modèle d'Interaction Duo Cheval–Jockey
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Lissage Bayésien Hiérarchique (k=12)
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Analyse la compatibilité spécifique du couple : « bon cheval + bon jockey » ne suffit pas sans synergie mesurée.
              </p>
            </div>
          </div>

          {/* Selector Button Group */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Sélectionner un partant :</span>
            <select
              value={selectedHorseNumero}
              onChange={(e) => setSelectedHorseNumero(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              {partants.map(p => (
                <option key={p.numero} value={p.numero}>
                  N°{p.numero} {p.nom} ({p.driver})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DETAILED DUO INSPECTOR CARD FOR SELECTED HORSE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-md shadow-amber-500/20">
              N°{selectedPartant.numero}
            </span>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {selectedPartant.nom}
                <span className="text-xs text-slate-400 font-normal">avec</span>
                <span className="text-amber-300 font-semibold">{selectedPartant.driver}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Entraîneur : <span className="text-slate-200">{selectedPartant.entraineur}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
              currentSynergy.synergyVerdict.includes('confirmé')
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : currentSynergy.synergyVerdict.includes('prometteur')
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : currentSynergy.synergyVerdict.includes('bénéfique')
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : currentSynergy.synergyVerdict.includes('deçà')
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {currentSynergy.synergyVerdict}
            </span>
          </div>
        </div>

        {/* 3-TIER PERFORMANCE METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TIER 1: CHEVAL SEUL */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                🐴 Performance Cheval Seul
              </span>
              <span className="text-slate-500 font-mono">k=15</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 block">Courses / Victoires :</span>
                <span className="font-semibold text-white">{currentSynergy.horseStartsHist} / {currentSynergy.horseWinsHist}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Top 3 (Podium) :</span>
                <span className="font-semibold text-white">{currentSynergy.horseTop3Hist} ({Math.round(currentSynergy.horseTop3RateLisse * 100)}%)</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[11px] text-slate-400 block">Taux Top 3 Lissé :</span>
              <div className="flex items-center justify-between mt-1">
                <div className="w-full bg-slate-900 rounded-full h-2 mr-2 overflow-hidden">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(100, currentSynergy.horseTop3RateLisse * 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-indigo-400 font-mono">{(currentSynergy.horseTop3RateLisse * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* TIER 2: JOCKEY SEUL */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                🏇 Performance Jockey Seul
              </span>
              <span className="text-slate-500 font-mono">k=30</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 block">Montés / Victoires :</span>
                <span className="font-semibold text-white">{currentSynergy.jockeyStartsHist} / {currentSynergy.jockeyWinsHist}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Top 3 (Podium) :</span>
                <span className="font-semibold text-white">{currentSynergy.jockeyTop3Hist} ({Math.round(currentSynergy.jockeyTop3RateLisse * 100)}%)</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[11px] text-slate-400 block">Taux Top 3 Lissé :</span>
              <div className="flex items-center justify-between mt-1">
                <div className="w-full bg-slate-900 rounded-full h-2 mr-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, currentSynergy.jockeyTop3RateLisse * 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-blue-400 font-mono">{(currentSynergy.jockeyTop3RateLisse * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* TIER 3: DUO CHEVAL-JOCKEY */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                🤝 Interaction Duo Cheval-Jockey
              </span>
              <span className="text-amber-300 font-mono">k=12</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 block">Courses Ensemble :</span>
                <span className="font-bold text-amber-300">{currentSynergy.horseJockeyStartsHist} associations</span>
              </div>
              <div>
                <span className="text-slate-500 block">Top 3 Duo :</span>
                <span className="font-bold text-amber-300">{currentSynergy.horseJockeyTop3Hist} fois sur podium</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[11px] text-slate-400 block">Taux Top 3 Lissé Duo :</span>
              <div className="flex items-center justify-between mt-1">
                <div className="w-full bg-slate-900 rounded-full h-2 mr-2 overflow-hidden">
                  <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${Math.min(100, currentSynergy.horseJockeyTop3RateLisse * 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-amber-300 font-mono">{(currentSynergy.horseJockeyTop3RateLisse * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* HIERARCHICAL REFERENCE & SURPLUS FORMULA DISPLAY */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Décomposition Hiérarchique du Surplus du Duo
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Taux Référence (60/40) :</span>
              <span className="font-mono text-slate-200 font-bold text-sm">
                {(currentSynergy.horseJockeyRefTop3 * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                0.60×Cheval + 0.40×Jockey
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Taux Duo Lissé (k=12) :</span>
              <span className="font-mono text-amber-300 font-bold text-sm">
                {(currentSynergy.horseJockeyTop3RateLisse * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                (Top3_duo + 12×Ref) / (N_duo + 12)
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Surplus Duo Top 3 :</span>
              <span className={`font-mono font-bold text-sm flex items-center gap-1 ${
                currentSynergy.horseJockeyTop3Surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {currentSynergy.horseJockeyTop3Surplus >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {(currentSynergy.horseJockeyTop3Surplus * 100).toFixed(1)} pts
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Gain par rapport au niveau théorique
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Expérience Duo (Clip 20) :</span>
              <span className="font-mono text-blue-300 font-bold text-sm">
                {(currentSynergy.horseJockeyExperience * 100).toFixed(0)}% ({currentSynergy.horseJockeyStartsHist}/20)
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Poids de l'historique dans la décision
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300">Interprétation Modèle :</strong> {currentSynergy.interpretationNote}
            </span>
          </div>
        </div>
      </div>

      {/* RACE DUO RANKINGS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Classement de la Course par Surplus du Duo Cheval–Jockey
          </h3>
          <span className="text-xs text-slate-400">Tri par gain de synergie %</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                <th className="py-2.5 px-3">N° / Cheval</th>
                <th className="py-2.5 px-3">Jockey / Driver</th>
                <th className="py-2.5 px-3 text-center">Taux Cheval</th>
                <th className="py-2.5 px-3 text-center">Taux Jockey</th>
                <th className="py-2.5 px-3 text-center">Duo Lissé</th>
                <th className="py-2.5 px-3 text-right">Surplus Duo</th>
                <th className="py-2.5 px-3 text-center">Statut Synergy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {raceDuoRankings.map(({ partant, synergy }) => (
                <tr
                  key={partant.numero}
                  onClick={() => setSelectedHorseNumero(partant.numero)}
                  className={`cursor-pointer transition-colors ${
                    partant.numero === selectedHorseNumero
                      ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-white">
                    <span className="w-6 h-6 rounded bg-slate-800 text-amber-300 inline-flex items-center justify-center font-mono mr-2 text-[11px]">
                      {partant.numero}
                    </span>
                    {partant.nom}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-medium">{partant.driver}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-indigo-300">
                    {(synergy.horseTop3RateLisse * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-blue-300">
                    {(synergy.jockeyTop3RateLisse * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                    {(synergy.horseJockeyTop3RateLisse * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span className={synergy.horseJockeyTop3Surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {synergy.horseJockeyTop3Surplus >= 0 ? '+' : ''}{(synergy.horseJockeyTop3Surplus * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {synergy.synergyVerdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PYTHON SCRIPT EXPORTER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-400" />
            Script Python Feature Engineering (`app/features_horse_jockey.py`)
          </h3>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Copié !' : 'Copier le script Python'}
          </button>
        </div>

        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-80 leading-relaxed">
          <code>{pythonScript}</code>
        </pre>
      </div>
    </div>
  );
};
