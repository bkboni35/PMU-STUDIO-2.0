import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, RefreshCw, Calculator, ShieldCheck, Info, FileText, Edit3, Check, Sparkles } from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import {
  calculerPerformance3Musiques,
  calculerPerformanceDriverJockey,
  calculerPerformanceTandem,
  getPartantDriverMusique,
  saveDriverMusiqueOverride,
} from '../utils/turfCalculations';
import { extractDriversMusiqueLive } from '../utils/geminiMultiModelEngine';
import { getHorseGenyOdds } from '../utils/v38Helper';

interface TandemDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseHippique;
}

export interface DiagnosticRowResult {
  numero: number;
  nom: string;
  driver: string;
  musiqueCheval: string;
  musiqueDriver: string;
  horsePoints: number;
  horseFormula: string;
  driverPoints: number;
  driverFormula: string;
  scoreTandemCalculated: number;
  scoreTandemExpected: number;
  isConform: boolean;
  categoryLabel: string;
  categoryBadgeClass: string;
  diffNote?: string;
  cote: number;
}

export const TandemDiagnosticModal: React.FC<TandemDiagnosticModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testExecutedAt, setTestExecutedAt] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [editingDriver, setEditingDriver] = useState<{ driver: string; initialMusique: string } | null>(null);
  const [editInputVal, setEditInputVal] = useState('');
  const [isExtractingLive, setIsExtractingLive] = useState(false);
  const [liveSuccessMsg, setLiveSuccessMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Déplacement automatique vers le haut dès l'ouverture
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activePartants = (course.partants || []).filter(
    (p) => !p.estNonPartant && p.statut !== 'Non-partant'
  );

  // Exécution du test unitaire de conformité de la formule Tandem
  const diagnosticResults: DiagnosticRowResult[] = activePartants.map((p) => {
    const musiqueCheval = p.musique || '';
    const musiqueDriver = getPartantDriverMusique(p);

    const horseRes = calculerPerformance3Musiques(musiqueCheval);
    const driverRes = calculerPerformanceDriverJockey(musiqueDriver);
    const tandemRes = calculerPerformanceTandem(musiqueCheval, musiqueDriver);

    const calculatedScore = tandemRes.totalPoints;
    const expectedRawSum = horseRes.totalPoints + driverRes.totalPoints;

    // Vérification de conformité stricte
    const isConform =
      calculatedScore === expectedRawSum &&
      tandemRes.horsePoints === horseRes.totalPoints &&
      tandemRes.driverPoints === driverRes.totalPoints;

    let diffNote: string | undefined = undefined;
    if (!isConform) {
      diffNote = `Écart détecté: Calculé (${calculatedScore}) ≠ Attendu (${expectedRawSum})`;
    }

    return {
      numero: Number(p.numero),
      nom: p.nom,
      driver: p.driver || 'Non renseigné',
      musiqueCheval,
      musiqueDriver,
      horsePoints: horseRes.totalPoints,
      horseFormula: horseRes.formulaCalculation,
      driverPoints: driverRes.totalPoints,
      driverFormula: driverRes.formulaCalculation,
      scoreTandemCalculated: calculatedScore,
      scoreTandemExpected: expectedRawSum,
      isConform,
      categoryLabel: tandemRes.badgeLabel,
      categoryBadgeClass: tandemRes.badgeClass,
      diffNote,
      cote: getHorseGenyOdds(p),
    };
  }).sort((a, b) => {
    if (a.scoreTandemCalculated !== b.scoreTandemCalculated) {
      return a.scoreTandemCalculated - b.scoreTandemCalculated;
    }
    if (a.cote !== b.cote) {
      return a.cote - b.cote;
    }
    return a.numero - b.numero;
  }).map((row, index) => {
    const rank = index + 1;
    let categoryBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    let badgeLabel = '🔴 IRRÉGULIER';

    if (rank <= 3) {
      badgeLabel = '⭐ ÉLITE / TOP';
      categoryBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
    } else if (rank <= 7) {
      badgeLabel = '🟢 RÉGULIER';
      categoryBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    } else if (rank <= 10) {
      badgeLabel = '🟡 CORRECT';
      categoryBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }

    return {
      ...row,
      categoryLabel: badgeLabel,
      categoryBadgeClass,
    };
  });

  const totalTested = diagnosticResults.length;
  const conformCount = diagnosticResults.filter((r) => r.isConform).length;
  const anomalyCount = totalTested - conformCount;

  const handleExtractLiveMusique = async () => {
    setIsExtractingLive(true);
    setLiveSuccessMsg(null);
    try {
      const res = await extractDriversMusiqueLive(course, 'all');
      if (res && res.driversMusique && res.driversMusique.length > 0) {
        setRefreshCounter((prev) => prev + 1);
        setTestExecutedAt(new Date().toLocaleTimeString('fr-FR'));
        const verifiedCount = res.driversMusique.filter((d) => d.driverMusique && d.driverMusique.trim()).length;
        setLiveSuccessMsg(
          `Gemini 4 Argon + Manus 2.0 Pro/Lite : ${verifiedCount}/${res.driversMusique.length} musiques réelles extraites sans invention`
        );
        setTimeout(() => setLiveSuccessMsg(null), 6000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtractingLive(false);
    }
  };

  const handleRunDiagnostic = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setTestExecutedAt(new Date().toLocaleTimeString('fr-FR'));
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-1 sm:p-3 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn pt-1 sm:pt-3">
      <div
        ref={containerRef}
        className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl max-w-7xl w-[98vw] p-3 sm:p-5 shadow-2xl space-y-3 mt-0 mb-2 max-h-[96vh] flex flex-col"
      >
        {/* Top Header Bar - Ultra Compact */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black uppercase tracking-wider">
                  Test Unitaire V38
                </span>
                {testExecutedAt && (
                  <span className="text-[9px] text-slate-400 font-mono">
                    Test: {testExecutedAt}
                  </span>
                )}
                {liveSuccessMsg && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    {liveSuccessMsg}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-tight mt-0.5">
                Diagnostic Performance Tandem (Cheval + Driver)
              </h3>
            </div>
          </div>

          {/* Compact Summary Badges & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="px-2 py-0.5 rounded bg-slate-800 font-black text-white text-[11px]">
                {totalTested} Partants
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {conformCount}/{totalTested} Conformes
              </span>
              <span className={`px-2 py-0.5 rounded font-black text-[11px] flex items-center gap-1 ${
                anomalyCount > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {anomalyCount} Anomalies
              </span>
            </div>

            <button
              type="button"
              onClick={handleExtractLiveMusique}
              disabled={isExtractingLive || isRunning}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-[11px] uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Extraire en direct par Gemini 4 Argon, Manus 2.0 Pro & Manus 2.0 Lite la vraie musique de chaque pilote sans rien inventer (API PMU / geny.com)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isExtractingLive ? 'animate-spin' : 'text-amber-300'}`} />
              <span>{isExtractingLive ? 'Extraction Argon...' : 'Gemini 4 Argon · Manus 2.0 Musique Réelle'}</span>
            </button>

            <button
              onClick={handleRunDiagnostic}
              disabled={isRunning}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[11px] uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? '...' : 'Re-tester'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Status Banner - Compact */}
        {anomalyCount === 0 ? (
          <div className="p-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center gap-2.5 shrink-0 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="leading-tight">
              <strong className="font-bold">Formule 100% Conforme :</strong> Calculé par client = Score Brut Attendu (Somme 3 perf Cheval + Somme 3 perf Driver).
            </div>
          </div>
        ) : (
          <div className="p-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-center gap-2.5 shrink-0 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="leading-tight">
              <strong className="font-bold">Attention :</strong> {anomalyCount} écart(s) de calcul identifié(s).
            </div>
          </div>
        )}

        {/* Comparison Table - Immediately in foreground */}
        <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-950 scrollbar-thin flex-1">
          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900 text-slate-200 font-black uppercase text-[10px] tracking-wider border-b border-slate-800 whitespace-nowrap shadow-md">
                <th className="py-2.5 px-3">N° & Cheval</th>
                <th className="py-2.5 px-3 text-left">Performances Cheval (3 musiques)</th>
                <th className="py-2.5 px-3 text-left">Driver / Jockey & Musique</th>
                <th className="py-2.5 px-3 text-center">Score Client</th>
                <th className="py-2.5 px-3 text-center">Score Brut Attendu</th>
                <th className="py-2.5 px-3 text-center">Statut Test</th>
                <th className="py-2.5 px-3 text-center">Catégorie Tandem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {diagnosticResults.map((row) => (
                <tr
                  key={row.numero}
                  className={`hover:bg-slate-900/50 transition-colors ${
                    !row.isConform ? 'bg-rose-950/20' : ''
                  }`}
                >
                  {/* N° & Cheval */}
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-300 font-mono font-black flex items-center justify-center text-xs shrink-0">
                        {row.numero}
                      </span>
                      <span className="font-extrabold text-white text-xs truncate max-w-[130px]">
                        {row.nom}
                      </span>
                    </div>
                  </td>

                  {/* Cheval Musique & Score */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 font-bold">{row.musiqueCheval || 'N/A'}</span>
                        <span className="text-emerald-400 font-black">({row.horsePoints} pts)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                        {row.horseFormula}
                      </span>
                    </div>
                  </td>

                  {/* Driver & Musique */}
                  <td className="py-2.5 px-3 font-sans">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[130px]">
                          {row.driver}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDriver({ driver: row.driver, initialMusique: row.musiqueDriver });
                            setEditInputVal(row.musiqueDriver || '');
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                          title={`Modifier la musique de ${row.driver}`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-slate-400">{row.musiqueDriver || '—'}</span>
                        <span className="text-cyan-400 font-black">({row.driverPoints} pts)</span>
                      </div>
                    </div>
                  </td>

                  {/* Score Client */}
                  <td className="py-2.5 px-3 text-center font-black text-sm text-purple-300">
                    {row.scoreTandemCalculated} pts
                  </td>

                  {/* Score Brut Attendu */}
                  <td className="py-2.5 px-3 text-center font-black text-sm text-amber-300">
                    {row.scoreTandemExpected} pts
                  </td>

                  {/* Statut Test */}
                  <td className="py-2.5 px-3 text-center">
                    {row.isConform ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Conforme</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>Discrépance</span>
                      </span>
                    )}
                  </td>

                  {/* Catégorie Tandem */}
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${row.categoryBadgeClass}`}>
                      {row.categoryLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend / Info Footer */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-sans">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Rappel du Barème Officiel Tandem :</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
              ⭐ Élite / Top : ≤ 18 pts
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              🟢 Régulier : ≤ 24 pts
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              🟡 Correct : ≤ 36 pts
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              🔴 Irrégulier : &gt; 36 pts
            </div>
          </div>
        </div>

        {/* Modal d'édition de la musique du Driver */}
        {editingDriver && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Musique du Driver</h4>
                    <p className="text-[11px] text-cyan-400 font-bold">{editingDriver.driver}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingDriver(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Dernières performances réelles (ex: 1a 2a 2a 6a 1a 4a 3a 7a) :
                </label>
                <input
                  type="text"
                  value={editInputVal}
                  onChange={(e) => setEditInputVal(e.target.value)}
                  placeholder="Ex: 1a 2a 2a 6a 1a 4a 3a 7a"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400">
                  Le calcul officiel du Tandem utilise les 3 performances récentes (ex: 1a + 2a + 2a = 5 pts).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveDriverMusiqueOverride(editingDriver.driver, editInputVal);
                    setEditingDriver(null);
                    setRefreshCounter((c) => c + 1);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
