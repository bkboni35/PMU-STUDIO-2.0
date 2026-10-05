import React, { useState } from 'react';
import { Trophy, ShieldAlert, Award, X, Sparkles, CheckCircle2, Zap, Scale, Flame, AlertTriangle, Eye, Target, Layers, FileSpreadsheet, Download, TrendingUp, Compass } from 'lucide-react';
import { CourseHippique, ExpertHorseRow } from '../types/turf';
import { buildExpertDisciplineAnalysis } from '../utils/expertDisciplinePrompts';
import { exportCourseToExcel } from '../utils/excelExport';
import { calculerModelePlatPondere, exportPlatModelToExcel } from '../utils/platQuantitativeModel';
import { computeV38Hierarchy } from '../utils/v38Helper';

interface DisciplineExpertAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseHippique;
}

export const DisciplineExpertAnalysisModal: React.FC<DisciplineExpertAnalysisModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  if (!isOpen || !course) return null;

  const isPlat = (course.discipline || '').toLowerCase().includes('plat') || (course.discipline || '').toLowerCase().includes('galop');
  const platResult = calculerModelePlatPondere(course);
  const analysis = course.expertDisciplineAnalysis || buildExpertDisciplineAnalysis(course);
  const v38Hierarchy = computeV38Hierarchy(course);
  const [activeTab, setActiveTab] = useState<'tableau' | 'modele_plat' | 'classification' | 'ponderation' | 'risques'>(
    isPlat ? 'modele_plat' : 'tableau'
  );

  const {
    disciplineCategory,
    disciplineTitle,
    identification,
    weightings,
    synthesisTable,
    top5,
    top8,
    chevalASurveiller,
    principalRisqueCourse,
    probableScenario,
  } = analysis;

  const getGroupBadgeStyle = (groupe?: string) => {
    if (!groupe) return 'bg-slate-800 text-slate-400 border-slate-700';
    if (groupe.includes('BASE')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    if (groupe.includes('PRIORITAIRE') || groupe.includes('SECONDE')) return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
    if (groupe.includes('RÉGULIÈRE') || groupe.includes('CHANCES')) return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
    if (groupe.includes('OUTSIDER')) return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-2 sm:my-4 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-slate-950 p-3.5 sm:p-5 border-b border-amber-500/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm">
                  {disciplineCategory}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Prompt Expert Certifié
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-black text-white mt-0.5 truncate">
                {disciplineTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => isPlat ? exportPlatModelToExcel(course) : exportCourseToExcel(course)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-950/40 border border-emerald-400 active:scale-95"
              title={isPlat ? "Télécharger le Modèle Plat Pondéré officiel à 2 feuilles (.xlsx)" : "Exporter l'analyse dans le classeur Excel (.xlsx)"}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span className="hidden sm:inline">{isPlat ? 'Exporter Modèle Plat (.xlsx)' : 'Exporter Classeur Excel (.xlsx)'}</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'identification officielle de la course */}
        <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 text-xs text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Épreuve</span>
            <span className="font-extrabold text-amber-400 truncate block">
              {identification.reunion} {identification.course} · {identification.hippodrome}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Distance & Allocation</span>
            <span className="font-bold text-white">
              {identification.distance}m · {identification.allocation?.toLocaleString('fr-FR')} €
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Spécificités</span>
            <span className="font-bold text-sky-400">
              {identification.departType} · {identification.partantsCount} partants
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Date & Statut</span>
            <span className="font-bold text-emerald-400">
              {identification.date}
            </span>
          </div>
        </div>

        {/* Navigation des Onglets de l'Expertise */}
        <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          {isPlat && (
            <button
              type="button"
              onClick={() => setActiveTab('modele_plat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'modele_plat'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-300'
                  : 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-emerald-500/30'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Modèle Plat Pondéré (Value Index)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('tableau')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tableau'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tableau Synthétique /100</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('classification')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'classification'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Classification & Pronostic</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ponderation')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ponderation'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Pondérations (100%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('risques')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'risques'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Analyse des Risques</span>
          </button>
        </div>

        {/* Zone de Contenu Principal Scrollable */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* TAB SPÉCIAL : MODÈLE PLAT PONDÉRÉ & VALUE INDEX */}
          {activeTab === 'modele_plat' && (
            <div className="space-y-4">
              {/* Entête & Grille de pondération */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                        Modèle Quantitatif Plat
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Pondération 6 Modules ajustée aux données réelles
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white mt-1">
                      Calcul du SCORE FINAL /100 & Value Index (Softmax K=10)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportPlatModelToExcel(course)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-md shrink-0 border border-emerald-400 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger Modèle Excel (.xlsx)</span>
                  </button>
                </div>

                {/* Modules et coefficients */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs pt-1">
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Forme</span>
                    <span className="text-sm font-black text-amber-400">22 %</span>
                    <span className="text-[9px] text-slate-500 block">4 dernières pos.</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Classe / Valeur</span>
                    <span className="text-sm font-black text-sky-400">20 %</span>
                    <span className="text-[9px] text-slate-500 block">Handicap normalisé</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Poids Porté</span>
                    <span className="text-sm font-black text-indigo-400">12 %</span>
                    <span className="text-[9px] text-slate-500 block">Inversé (faible = +)</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Jockey</span>
                    <span className="text-sm font-black text-emerald-400">14 %</span>
                    <span className="text-[9px] text-slate-500 block">Note 1 à 10</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Entraîneur</span>
                    <span className="text-sm font-black text-purple-400">8 %</span>
                    <span className="text-[9px] text-slate-500 block">Note 1 à 10</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Marché / Cote</span>
                    <span className="text-sm font-black text-rose-400">24 %</span>
                    <span className="text-[9px] text-slate-500 block">Cote inversée</span>
                  </div>
                </div>
              </div>

              {/* Table détaillée des partants */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-2.5 text-center">Rang</th>
                      <th className="py-3 px-2.5">Cheval</th>
                      <th className="py-3 px-2 text-center">Poids / Corde</th>
                      <th className="py-3 px-2 text-center">Valeur</th>
                      <th className="py-3 px-2 text-center">Cote PMU</th>
                      <th className="py-3 px-2 text-center">Forme (22%)</th>
                      <th className="py-3 px-2 text-center">Classe (20%)</th>
                      <th className="py-3 px-2 text-center">Poids (12%)</th>
                      <th className="py-3 px-2 text-center">Jockey (14%)</th>
                      <th className="py-3 px-2 text-center">Entr. (8%)</th>
                      <th className="py-3 px-2 text-center">Marché (24%)</th>
                      <th className="py-3 px-2.5 text-center bg-amber-500/10 text-amber-300">Score /100</th>
                      <th className="py-3 px-2 text-center">P_modèle</th>
                      <th className="py-3 px-2 text-center">P_marché</th>
                      <th className="py-3 px-2 text-center">Value Index</th>
                      <th className="py-3 px-3 text-center">Flag Tactique</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {platResult.runners.map((r, idx) => {
                      const getFlagBadge = (flag: string) => {
                        if (flag.includes('VALUE') || flag.includes('SOUS-ÉVALUÉ')) {
                          return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
                        }
                        if (flag.includes('SUR-ÉVALUÉ') || flag.includes('FAUX FAVORI')) {
                          return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
                        }
                        if (flag.includes('COTE MANQUANTE')) {
                          return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
                        }
                        if (flag === 'NON-PARTANT') {
                          return 'bg-slate-800 text-slate-400 border-slate-700';
                        }
                        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                      };

                      return (
                        <tr
                          key={`trot-runner-${r.numero}-${idx}`}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            r.estNonPartant ? 'opacity-40 bg-slate-950' : r.rang <= 3 ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center font-mono font-black">
                            {r.estNonPartant ? (
                              <span className="text-slate-500 text-[10px]">NP</span>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                r.rang === 1 ? 'bg-amber-500 text-slate-950 shadow-sm' :
                                r.rang === 2 ? 'bg-slate-300 text-slate-950' :
                                r.rang === 3 ? 'bg-amber-700 text-white' :
                                'bg-slate-800 text-slate-300'
                              }`}>
                                {r.rang}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-amber-400 font-black text-xs shrink-0">N°{r.numero}</span>
                              <span className="text-white truncate max-w-[130px]" title={r.nom}>{r.nom}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate block max-w-[130px]" title={`${r.jockey} / ${r.entraineur}`}>
                              {r.jockey}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-300">
                            {r.poids} kg · C{r.corde}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-sky-300">
                            {r.valeur !== null ? r.valeur : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-300">
                            {r.cote !== null ? `${r.cote}/1` : (r.coteManquante ? 'NP' : '—')}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                            {r.estNonPartant ? '—' : r.scoreForme}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                            {r.estNonPartant ? '—' : r.scoreClasse}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                            {r.estNonPartant ? '—' : r.scorePoids}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                            {r.estNonPartant ? '—' : r.scoreJockey}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                            {r.estNonPartant ? '—' : r.scoreEntraineur}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                            {r.estNonPartant ? '—' : r.scoreMarche}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-black text-amber-300 bg-amber-500/10 text-xs">
                            {r.estNonPartant ? 'NP' : r.scoreFinal}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-300">
                            {r.estNonPartant ? '—' : `${(r.pModele * 100).toFixed(1)} %`}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-300">
                            {r.pMarche !== null ? `${(r.pMarche * 100).toFixed(1)} %` : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-black text-xs">
                            {r.valueIndex !== null ? (
                              <span className={r.valueIndex > 1.3 ? 'text-emerald-400' : r.valueIndex < 0.7 ? 'text-rose-400' : 'text-slate-300'}>
                                {r.valueIndex}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getFlagBadge(r.flag)}`}>
                              {r.flag}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Résumé Top 8 & Chevaux Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sélection Top 8 Modèle Plat (Quinté élargi)</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {platResult.top8.map((r, idx) => (
                      <span
                        key={`plat-top8-${r.numero}-${idx}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : idx < 3
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span>{idx + 1}ᵉ</span>
                        <span className="font-mono text-amber-200">N°{r.numero}</span>
                        <span>{r.nom}</span>
                        <span className="text-[10px] opacity-80 font-mono">({r.scoreFinal}/100)</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Opportunités Value (Value Index &gt; 1.30)</span>
                  </span>
                  <div className="space-y-1 pt-1">
                    {platResult.runners.filter(r => r.valueIndex !== null && r.valueIndex > 1.3).length > 0 ? (
                      platResult.runners
                        .filter(r => r.valueIndex !== null && r.valueIndex > 1.3)
                        .map((r, idx) => (
                          <div key={`plat-val-${r.numero}-${idx}`} className="flex items-center justify-between text-xs py-0.5">
                            <span className="font-bold text-white">
                              N°{r.numero} {r.nom} (Cote : {r.cote}/1)
                            </span>
                            <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 text-[11px]">
                              Index : {r.valueIndex} · SOUS-ÉVALUÉ
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400">
                        Cotes cohérentes avec les probabilités du modèle. Aucun cheval sous-évalué au-delà de 1.30.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: TABLEAU SYNTHÉTIQUE COMPLET */}
          {activeTab === 'tableau' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Tableau de Synthèse Spécifique — {disciplineCategory}</span>
                </h3>
                <span className="text-[10px] text-slate-400 italic">
                  Chaque colonne correspond aux exigences du Prompt Expert {disciplineCategory}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-extrabold text-amber-300 tracking-wider">
                      <th className="py-2.5 px-3 text-center">N°</th>
                      <th className="py-2.5 px-3">Cheval</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3">Forme</th>
                      <th className="py-2.5 px-3">
                        {disciplineCategory === 'Trot Monté' ? 'Aptitude Monté' : disciplineCategory === 'Plat' ? 'Valeur / Poids' : 'Classe'}
                      </th>
                      <th className="py-2.5 px-3">Chrono / Dist.</th>
                      <th className="py-2.5 px-3">
                        {disciplineCategory === 'Obstacles' ? 'Obstacles' : 'Driver / Jockey'}
                      </th>
                      <th className="py-2.5 px-3">Risque</th>
                      <th className="py-2.5 px-3 text-right">Cote</th>
                      <th className="py-2.5 px-3 text-center">Groupe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {synthesisTable.map((row: ExpertHorseRow, idx: number) => (
                      <tr key={`expert-synth-${row.numero}-${idx}`} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 px-3 text-center font-black text-white">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-black border border-amber-500/60 text-amber-400 font-extrabold">
                            {row.numero}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-white">
                          {row.cheval}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black">
                          <span className={`px-2 py-0.5 rounded-lg text-xs border ${
                            row.score >= 80 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            row.score >= 65 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {row.score}/100
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                          {row.forme}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                          {row.aptitudeMonte || row.valeurHandicap || row.classe}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-sky-300">
                          {row.chrono}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                          {row.obstacles || row.jockeyDriver}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-rose-300 font-medium">
                          {row.risque}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {row.cote}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${getGroupBadgeStyle(row.groupe)}`}>
                            {row.groupe}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CLASSIFICATION FINALE ET TOP 5 / TOP 8 */}
          {activeTab === 'classification' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BASES PRINCIPALES */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Bases Principales Incontournables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.groups.basePrincipale.map((num: number, idx: number) => {
                      const h = course.partants.find((p) => p.numero === num);
                      return (
                        <div key={`base-princ-${num}-${idx}`} className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex-1 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm">
                            {num}
                          </span>
                          <div className="truncate">
                            <span className="font-extrabold text-white text-xs block truncate">{h?.nom || `N°${num}`}</span>
                            <span className="text-[10px] text-emerald-300 font-semibold">{h?.driver || 'Driver attitré'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECONDES BASES / PRIORITAIRES */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs">
                    <Award className="w-4 h-4" />
                    <span>Secondes Bases / Chances Prioritaires</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {analysis.groups.secondesBases.map((num: number, idx: number) => {
                      const h = course.partants.find((p) => p.numero === num);
                      return (
                        <div key={`sec-base-${num}-${idx}`} className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/50 flex-1 min-w-[130px] flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm">
                            {num}
                          </span>
                          <div className="truncate">
                            <span className="font-extrabold text-white text-xs block truncate">{h?.nom || `N°${num}`}</span>
                            <span className="text-[10px] text-amber-300 font-semibold">{h?.driver || 'Jockey'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RANGS CLÉS TOP 5 ET TOP 8 */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span>Sélection Quinté+ Ordre Préférentiel (Top 5 & Top 8)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Top 5 Recommandé</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {top5.map((num: number, idx: number) => (
                        <span key={`top5-${num}-${idx}`} className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                          idx === 0 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-950 text-white border-slate-700'
                        }`}>
                          N°{num}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Top 8 Quinté+ Complété</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {top8.map((num: number, idx: number) => (
                        <span key={`top8-${num}-${idx}`} className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 font-bold text-xs border border-slate-800">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <span className="font-bold">Cheval à surveiller : N°{chevalASurveiller} ({course.partants.find(p=>p.numero===chevalASurveiller)?.nom || 'Spéculatif'})</span>
                  <span className="text-[11px] font-mono text-amber-400">Indicateur de surprise potentiel</span>
                </div>

                {/* Synthèse Officielle selon le Prompt Professionnel (Quotas Stricts : 2 Bases, 4 Chances Sérieuses, 4 Tocards, 2 Surprises = 12 + Délaissés) */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-3 mt-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Grille de Sélection Professionnelle (12 chevaux retenus sans doublon)</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      Quotas vérifiés (2 Bases + 4 Chances + 4 Tocards + 2 Surprises = 12 N°)
                    </span>
                  </div>

                  {/* Rappel des 3 viviers initiaux */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 font-bold text-[11px]">{v38Hierarchy.labelGroup1} :</span>
                      <div className="flex items-center gap-1">
                        {v38Hierarchy.poolG1.map((p, idx) => (
                          <span key={`p1-${p.numero}-${idx}`} className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[11px]">
                            {p.numero}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 font-bold text-[11px]">{v38Hierarchy.labelGroup2} :</span>
                      <div className="flex items-center gap-1">
                        {v38Hierarchy.poolG2.map((p, idx) => (
                          <span key={`p2-${p.numero}-${idx}`} className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold font-mono text-[11px]">
                            {p.numero}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 font-bold text-[11px]">{v38Hierarchy.labelGroup3} :</span>
                      <div className="flex items-center gap-1">
                        {v38Hierarchy.poolG3.map((p, idx) => (
                          <span key={`p3-${p.numero}-${idx}`} className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold font-mono text-[11px]">
                            {p.numero}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Répartition finale des 12 chevaux classés par cote croissante */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
                      <span className="text-[10px] font-black uppercase text-emerald-400 block mb-1">BASE (2 N°)</span>
                      <div className="font-black text-white flex items-center gap-1.5 flex-wrap">
                        {v38Hierarchy.basesSolides.map((p, idx) => (
                          <span key={`exp-base-${p.numero}-${idx}`} className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-xs shadow-xs" title={`${p.nom} (Cote: ${p.coteProbable}/1)`}>
                            N°{p.numero}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-sky-950/60 border border-sky-500/40">
                      <span className="text-[10px] font-black uppercase text-sky-400 block mb-1">CHANCES SÉRIEUSES (4 N°)</span>
                      <div className="font-black text-white flex items-center gap-1.5 flex-wrap">
                        {v38Hierarchy.chancesSerieuses.map((p, idx) => (
                          <span key={`exp-chance-${p.numero}-${idx}`} className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-black text-xs shadow-xs" title={`${p.nom} (Cote: ${p.coteProbable}/1)`}>
                            N°{p.numero}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40">
                      <span className="text-[10px] font-black uppercase text-amber-400 block mb-1">TOCARDS (3 N°)</span>
                      <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        {v38Hierarchy.tocardsSpeculatifs.map((p, idx) => (
                          <span key={`exp-tocard-${p.numero}-${idx}`} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold" title={`${p.nom} (Cote: ${p.coteProbable}/1)`}>
                            N°{p.numero}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/40">
                      <span className="text-[10px] font-black uppercase text-purple-400 block mb-1">SURPRISES (3 N°)</span>
                      <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        {v38Hierarchy.surprises.map((p, idx) => (
                          <span key={`exp-surprise-${p.numero}-${idx}`} className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold" title={`${p.nom} (Cote: ${p.coteProbable}/1)`}>
                            N°{p.numero}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">DÉLAISSÉS (Classés par cote)</span>
                      <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1 flex-wrap">
                        {(v38Hierarchy.delaisses && v38Hierarchy.delaisses.length > 0) ? (
                          v38Hierarchy.delaisses.map((p, idx) => (
                            <span key={`exp-delaisse-${p.numero}-${idx}`} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-mono" title={`${p.nom} (Cote: ${p.coteProbable}/1)`}>
                              N°{p.numero}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs">Aucun</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MATRICE DE PONDÉRATION DE LA DISCIPLINE */}
          {activeTab === 'ponderation' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  <span>Matrice de Pondération Mathématique — {disciplineCategory} (100%)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(weightings).map(([key, weight]: [string, number]) => (
                  <div key={key} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{key}</span>
                      <span className="text-amber-400 font-black">{weight}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{ width: `${(weight / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RISQUES & SCÉNARIO PROBABLE */}
          {activeTab === 'risques' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-2">
                <h4 className="text-xs font-black uppercase text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Principal Risque de la Course ({disciplineCategory})</span>
                </h4>
                <p className="text-xs text-rose-200 font-semibold leading-relaxed">
                  {principalRisqueCourse}
                </p>
              </div>

              {probableScenario && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/40 space-y-2">
                  <h4 className="text-xs font-black uppercase text-sky-400 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>Scénario Probable & Tactique de Course</span>
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {probableScenario}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal avec Bouton de Confirmation */}
        <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[10px] text-slate-400 font-mono">
            Moteur de Recherche 100% Conforme aux Prompts Experts {disciplineCategory}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
          >
            Fermer l'Expertise
          </button>
        </div>
      </div>
    </div>
  );
};
