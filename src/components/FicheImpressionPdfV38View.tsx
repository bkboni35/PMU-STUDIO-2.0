import React, { useMemo, useState } from 'react';
import { CourseHippique } from '../types/turf';
import { exportToCSV } from '../utils/exportUtils';
import { exportProgramAndCodeToWord } from '../utils/wordExport';
import { exportQuinteOnlyToPdf, printQuinteOnlyPdf } from '../utils/pdfExport';
import { generateFicheV38PdfFromDom } from '../utils/ficheV38PdfGenerator';
import { computeV38Hierarchy, computeDisciplineGrid, computeHorseSuccessProbabilities } from '../utils/v38Helper';
import { classerChevauxFormeEtPoints } from '../utils/turfCalculations';
import { DisciplineGridTable } from './DisciplineGridTable';
import { Printer, Download, Trophy, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { scrollToTopInstant } from '../utils/scrollHelper';

interface FicheImpressionPdfV38ViewProps {
  course?: CourseHippique | null;
}

export const FicheImpressionPdfV38View: React.FC<FicheImpressionPdfV38ViewProps> = ({ course }) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!course) return null;

  const v38Hierarchy = computeV38Hierarchy(course);
  const successProbMap = useMemo(() => computeHorseSuccessProbabilities(course.partants, course), [course]);
  const {
    isPlat,
    selection11,
    basesSolides,
    chancesSerieuses,
    favoris = basesSolides,
    outsiders = chancesSerieuses,
    tocardsSpeculatifs,
    surprises,
    delaisses,
  } = v38Hierarchy;

  const formClassification = useMemo(() => classerChevauxFormeEtPoints(course.partants || []), [course]);

  React.useEffect(() => {
    scrollToTopInstant();
  }, [course?.sourceUrl]);
  const allOrdered = [...selection11, ...delaisses];
  const allOrderedSortedByProb = useMemo(() => {
    const list = [...selection11, ...delaisses];
    return list.sort((a, b) => {
      const probA = successProbMap.get(Number(a.numero))?.percent || 0;
      const probB = successProbMap.get(Number(b.numero))?.percent || 0;
      if (probB !== probA) return probB - probA;
      const coteA = parseFloat((a.coteProbable || a.genyOdds || '99').toString().replace(',', '.'));
      const coteB = parseFloat((b.coteProbable || b.genyOdds || '99').toString().replace(',', '.'));
      return coteA - coteB;
    });
  }, [selection11, delaisses, successProbMap]);

  const triggerExportPDF = async () => {
    try {
      setIsGenerating(true);
      setNotice("🚀 Génération du modèle de fichier PDF officiel « PRONOS - PMU - STUDIO 2.0 » avec le design exact...");
      await generateFicheV38PdfFromDom(course, 'download');
      setNotice("✅ Fiche PDF officielle téléchargée avec succès !");
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      console.warn('Génération DOM échouée, repli vers export PDF vectoriel:', e);
      try {
        exportQuinteOnlyToPdf(course);
        setNotice("✅ Fiche PDF officielle téléchargée avec succès !");
        setTimeout(() => setNotice(null), 4000);
      } catch {
        setNotice("⚠️ Erreur lors de la génération du PDF. Veuillez réessayer.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerPrintPage = async () => {
    try {
      setIsGenerating(true);
      setNotice("🖨️ Préparation de l'impression du modèle officiel de fichier PDF avec le design exact...");
      await generateFicheV38PdfFromDom(course, 'print');
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      console.warn('Impression DOM échouée, repli vers impression standard:', e);
      printQuinteOnlyPdf(course);
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerExportCSV = () => {
    try {
      setNotice("📊 Génération du fichier CSV « PRONOS - PMU - STUDIO 2.0 » lancée !");
      exportToCSV(course);
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerExportWord = () => {
    try {
      setNotice("📝 Génération du rapport Word complet (Programme & Programmation de l'application)...");
      exportProgramAndCodeToWord(course);
      setNotice("✅ Rapport Word téléchargé avec succès !");
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      console.error(e);
      setNotice("⚠️ Erreur lors de l'export Word.");
    }
  };

  const rawTitle = course.prixNom || course.titre || 'Grand Prix';
  const cleanTitle = rawTitle.replace(/\s*\(Quinté\+\)/gi, '').trim();
  const typeStr = course.estQuinte ? 'Quinté+' : 'V38';
  const hippodromeStr = (course.hippodrome || 'PARIS-VINCENNES').toUpperCase();
  const cordeStr = (course.corde || 'GAUCHE').toUpperCase();
  const distanceStr = course.distance ? `${course.distance}M` : '2700M';
  const cartoucheText = `RÉUNION ${course.reunion || 'R1'} - COURSE ${course.course || 'C1'} | ${cleanTitle.toUpperCase()} (${typeStr}) | HIPPODROME : ${hippodromeStr} | CORDE : ${cordeStr} | DISTANCE : ${distanceStr}`;

  return (
    <div className="space-y-4 animate-fadeIn max-w-[1200px] mx-auto w-full flex flex-col items-center">
      {notice && (
        <div className="w-full p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-400 hover:text-white p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Action Ribbon Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 w-full flex flex-wrap items-center justify-between gap-3 shadow-xl no-print">
        <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Fiche Impression Officielle : PRONOS - PMU - STUDIO 2.0</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={triggerPrintPage}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all active:scale-95"
            title="Imprimer directement ce modèle officiel de fichier PDF (A4 Portrait)"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>Imprimer (A4)</span>
          </button>
          <button
            onClick={triggerExportPDF}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-amber-300 border-2 border-amber-500/50 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg active:scale-95"
            title="Télécharger ce modèle de fichier PDF officiel uniquement"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-amber-400" />}
            <span>Télécharger Fiche PDF V38</span>
          </button>
          <button
            onClick={triggerExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            title="Exporter les données au format CSV"
          >
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={triggerExportWord}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
            title="Exporter tout le programme hippique et la programmation technique au format Word (.doc)"
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Exporter Word (Programme & Code)</span>
          </button>
        </div>
      </div>

      {/* Printable Visual Canvas Container (Standard A4 Proportions 800px) */}
      <div className="w-full overflow-x-auto flex flex-col items-center py-2 space-y-6">
        
        {/* ================= PAGE 1 : HIÉRARCHIE OFFICIELLE V38 & GRILLE DISCIPLINE ================= */}
        <div
          id="fiche-v38-page-1"
          className="w-[800px] min-w-[800px] bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-4 border border-slate-300 font-sans relative"
        >
          {/* 1. Header Box (Model: PRONOS - PMU - STUDIO 2.0) */}
          <div className="bg-[#0b1329] text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-md border border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#1e293b] border-2 border-amber-500 flex items-center justify-center text-amber-400 font-black text-2xl shadow-inner shrink-0">
                P
              </div>
              <div>
                <div className="text-amber-400 font-black text-xl sm:text-2xl tracking-tight">
                  PRONOS - PMU - STUDIO 2.0
                </div>
                <div className="text-xs text-slate-200 font-bold tracking-wider mt-0.5">
                  Concepteur : Ghislain BONI • Extraction certifiée Geny.com
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shrink-0">
                Fiche Officielle PMU-STUDIO 2.0
              </div>
              <div className="text-right text-[11px] text-slate-300 space-y-0.5">
                <div>Date officielle : <strong className="text-amber-300">{course.date || '08/10/2026'}</strong></div>
              </div>
            </div>
          </div>

          {/* 2. Course Details Cartouche */}
          <div className="bg-[#0b1329] rounded-xl border border-slate-800 p-3.5 shadow-md">
            <div className="text-xs sm:text-[13px] font-black text-amber-300 uppercase tracking-tight">
              {cartoucheText}
            </div>
          </div>

          {/* 3. PRONOSTIC OFFICIEL QUINTÉ+ V38 (SÉLECTION PAR COTE) */}
          <div className="rounded-xl border border-slate-800 overflow-hidden shadow-lg bg-[#0b1329] text-white">
            <div className="bg-[#0b1329] border-b border-slate-800 text-white p-3 px-4 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between">
              <span className="text-white font-black tracking-tight">PRONOSTIC OFFICIEL QUINTÉ+ V38 (SÉLECTION PAR COTE)</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/90 px-2.5 py-0.5 rounded border border-emerald-500/50">
                🔒 COTES SCELLÉES SANS VARIATION
              </span>
            </div>

            <div className="p-4 bg-[#0b1329] space-y-3.5">
              {/* Row 1 : FAVORIS, OUTSIDERS, TOCARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* FAVORIS */}
                <div className="bg-[#052e16]/40 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      FAVORIS (3 N°) :
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      {favoris.length} Ch.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {favoris.map((p, idx) => {
                      const cote = p.coteProbable || p.genyOdds || '—';
                      return (
                        <div
                          key={`pdf-base-${p.numero}-${idx}`}
                          className="group flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-0.5"
                          title={`N°${p.numero} - ${p.nom || ''} • Driver: ${p.driver || '—'} • Cote: ${cote}/1`}
                        >
                          <div className="w-10 h-7 rounded-md bg-[#059669] text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-md border border-emerald-300/80">
                            {p.numero}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-black text-emerald-300 tracking-tight mt-1 leading-none">
                            {cote}/1
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* OUTSIDERS */}
                <div className="bg-[#0c4a6e]/30 border border-sky-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      OUTSIDERS (3 N°) :
                    </span>
                    <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/40">
                      {outsiders.length} Ch.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {outsiders.map((p, idx) => {
                      const cote = p.coteProbable || p.genyOdds || '—';
                      return (
                        <div
                          key={`pdf-chance-${p.numero}-${idx}`}
                          className="group flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-0.5"
                          title={`N°${p.numero} - ${p.nom || ''} • Driver: ${p.driver || '—'} • Cote: ${cote}/1`}
                        >
                          <div className="w-10 h-7 rounded-md bg-[#0284c7] text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-md border border-sky-300/80">
                            {p.numero}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-black text-sky-300 tracking-tight mt-1 leading-none">
                            {cote}/1
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TOCARDS */}
                <div className="bg-[#4c0519]/30 border border-rose-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      TOCARDS (3 N°) :
                    </span>
                    <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                      {tocardsSpeculatifs.length} Ch.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {tocardsSpeculatifs.map((p, idx) => {
                      const cote = p.coteProbable || p.genyOdds || '—';
                      return (
                        <div
                          key={`pdf-tocard-${p.numero}-${idx}`}
                          className="group flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-0.5"
                          title={`N°${p.numero} - ${p.nom || ''} • Driver: ${p.driver || '—'} • Cote: ${cote}/1`}
                        >
                          <div className="w-10 h-7 rounded-md bg-[#e11d48] text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-md border border-rose-300/80">
                            {p.numero}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-black text-rose-300 tracking-tight mt-1 leading-none">
                            {cote}/1
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2 : SURPRISES & DÉLAISSÉS */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SURPRISES */}
                <div className="bg-[#3b0764]/30 border border-purple-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      SURPRISES ({surprises.length} N°) :
                    </span>
                    <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
                      Tri points perf.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {surprises.map((p, idx) => {
                      const cote = p.coteProbable || p.genyOdds || '—';
                      return (
                        <div
                          key={`pdf-surprise-${p.numero}-${idx}`}
                          className="group flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-0.5"
                          title={`N°${p.numero} - ${p.nom || ''} • Driver: ${p.driver || '—'} • Cote: ${cote}/1`}
                        >
                          <div className="w-10 h-7 rounded-md bg-[#9333ea] text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-md border border-purple-300/80">
                            {p.numero}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-black text-purple-300 tracking-tight mt-1 leading-none">
                            {cote}/1
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DÉLAISSÉS */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      DÉLAISSÉS ({delaisses.length} N°) :
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      ↓ Ordre décroissant
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {delaisses.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">Aucun cheval délaissé (lot ≤ 12 partants)</span>
                    ) : (
                      delaisses.map((p, idx) => {
                        const cote = p.coteProbable || p.genyOdds || '—';
                        return (
                          <div
                            key={`pdf-delaisse-${p.numero}-${idx}`}
                            className="group flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-0.5"
                            title={`N°${p.numero} - ${p.nom || ''} • Driver: ${p.driver || '—'} • Cote: ${cote}/1`}
                          >
                            <div className="w-10 h-7 rounded-md bg-[#334155] text-slate-100 font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-sm border border-slate-500/60">
                              {p.numero}
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-tight mt-1 leading-none">
                              {cote}/1
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. GRILLE V38 DISCIPLINE (TABLEAU DE RÉPARTITION) & CLASSIFICATION PAR FORME DE FORMULE */}
          <div className="w-full">
            <DisciplineGridTable course={course} variant="dark" />
          </div>

          {/* Page 1 Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>PRONOS - PMU - STUDIO 2.0 • Concepteur : Ghislain BONI</span>
            <span>Page 1 / 2</span>
          </div>
        </div>

        {/* ================= PAGE 2 : TABLEAU DÉTAILLÉ & MÉTHODOLOGIE ================= */}
        <div
          id="fiche-v38-page-2"
          className="w-[800px] min-w-[800px] bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-4 border border-slate-300 font-sans relative"
        >
          {/* Header Bar Page 2 */}
          <div className="bg-[#0b1329] text-white rounded-xl p-3 px-4 flex items-center justify-between shadow-md border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>PRONOS - PMU - STUDIO 2.0 • TABLEAU DÉTAILLÉ CLASSÉ PAR PROBABILITÉ DE SUCCÈS</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950 px-3 py-1 rounded-full border border-emerald-500/50">
              EXTRACTION OFFICIELLE
            </span>
          </div>

          {/* Tableau Détaillé */}
          <div id="v38-table-container" className="rounded-xl border-2 border-slate-800 overflow-hidden shadow-xl bg-[#0b1329] text-white">
            <div className="overflow-x-auto bg-[#0b1329]">
              <table className="w-full text-left text-xs border-collapse font-sans min-w-[700px]">
                <thead>
                  <tr className="bg-[#070d1e] text-sky-300 font-black uppercase text-[11px] border-b-2 border-slate-800">
                    <th className="py-2.5 px-3 text-center w-12 text-amber-400">N°</th>
                    <th className="py-2.5 px-2 text-sky-300">{isPlat ? 'Cheval (Corde)' : 'Cheval'}</th>
                    <th className="py-2.5 px-2 text-sky-300">Driver / Jockey</th>
                    <th className="py-2.5 px-2 text-center text-sky-300">MUSIQUE</th>
                    <th className="py-2.5 px-3 text-center text-sky-300">Cote</th>
                    <th className="py-2.5 px-3 text-center text-sky-300">Score IA</th>
                    <th className="py-2.5 px-3 text-center text-amber-400">Prob. Succès</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-bold">
                  {allOrderedSortedByProb.map((p, idx) => {
                    const rank = idx + 1;
                    const probInfo = successProbMap.get(Number(p.numero));
                    let roleText = 'Délaissé';
                    let rowBg = 'bg-[#0f172a] text-white';
                    let rolePillBg = 'bg-slate-800 text-slate-200 border border-slate-700 font-black';

                    if (rank === 1) {
                      roleText = 'Base';
                      rowBg = 'bg-[#042f2e] text-white border-l-4 border-l-emerald-400';
                      rolePillBg = 'bg-emerald-500 text-slate-950 font-black border border-emerald-300 shadow-sm';
                    } else if (rank === 2) {
                      roleText = '2nd Base';
                      rowBg = 'bg-[#064e3b]/80 text-white border-l-4 border-l-emerald-500';
                      rolePillBg = 'bg-emerald-400 text-slate-950 font-black border border-emerald-200 shadow-sm';
                    } else if (rank <= 5) {
                      roleText = 'Chance';
                      rowBg = 'bg-[#0c4a6e]/80 text-white border-l-4 border-l-sky-400';
                      rolePillBg = 'bg-sky-400 text-slate-950 font-black border border-sky-200 shadow-sm';
                    } else if (rank === 6) {
                      roleText = 'Tocards';
                      rowBg = 'bg-[#7c2d12]/80 text-white border-l-4 border-l-amber-500';
                      rolePillBg = 'bg-amber-500 text-slate-950 font-black border border-amber-300 shadow-sm';
                    } else if (rank <= 9) {
                      roleText = 'Tocard';
                      rowBg = 'bg-[#7c2d12]/60 text-white border-l-4 border-l-amber-600';
                      rolePillBg = 'bg-amber-500/90 text-slate-950 font-black border border-amber-300 shadow-sm';
                    } else if (rank <= 11) {
                      roleText = 'Faible chance';
                      rowBg = 'bg-[#4c1d95]/60 text-white border-l-4 border-l-purple-500';
                      rolePillBg = 'bg-purple-500 text-white font-black border border-purple-300 shadow-sm';
                    }

                    const coteVal = parseFloat((p.coteProbable || p.genyOdds || '0').toString().replace(',', '.'));
                    let coteBadgeStyle = 'bg-slate-900/90 text-slate-200 border-slate-700';
                    if (coteVal > 0 && coteVal <= 8) {
                      coteBadgeStyle = 'bg-emerald-950/90 text-emerald-300 font-black border border-emerald-500/60';
                    } else if (coteVal <= 15) {
                      coteBadgeStyle = 'bg-sky-950/90 text-sky-300 font-black border border-sky-500/60';
                    } else if (coteVal <= 30) {
                      coteBadgeStyle = 'bg-amber-950/90 text-amber-300 font-black border border-amber-500/60';
                    } else if (coteVal > 30) {
                      coteBadgeStyle = 'bg-purple-950/90 text-purple-300 font-black border border-purple-500/60';
                    }

                    const hippoScoreNum = p.hippoScore || 0;
                    let scoreBadgeStyle = 'text-slate-200 bg-slate-900/90 border-slate-700';
                    if (hippoScoreNum >= 88) {
                      scoreBadgeStyle = 'text-emerald-300 font-black bg-emerald-950/90 border border-emerald-500/60';
                    } else if (hippoScoreNum >= 80) {
                      scoreBadgeStyle = 'text-sky-300 font-black bg-sky-950/90 border border-sky-500/60';
                    } else if (hippoScoreNum > 0) {
                      scoreBadgeStyle = 'text-amber-300 font-bold bg-amber-950/90 border border-amber-500/60';
                    }

                    const rawMusique = p.musique || '';
                    const musiqueMatches = rawMusique.match(/\d+[apmshd]|D[apmshd]/gi);
                    const displayMusique = musiqueMatches && musiqueMatches.length > 0
                      ? musiqueMatches.slice(0, 3).join(' ')
                      : rawMusique.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(' ') || '—';

                    return (
                      <tr key={`pdf-partant-${p.numero}-${idx}`} className={`${rowBg} transition-colors border-b border-slate-800/80`}>
                        <td className="py-2 px-3 text-center">
                          <div className="w-8 h-8 rounded-lg bg-amber-200 text-slate-950 font-black text-sm flex items-center justify-center border-2 border-amber-400 shadow-md mx-auto">
                            {p.numero}
                          </div>
                        </td>
                        <td className="py-2 px-2 font-black text-white text-xs uppercase tracking-tight whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{p.nom}</span>
                            {isPlat && (
                              <span className="text-[10px] text-amber-300 font-extrabold bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/50">
                                Corde {p.corde ?? '—'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-white text-xs font-bold whitespace-nowrap">
                          {p.driver || '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[11px] font-black text-amber-300 whitespace-nowrap">
                          {displayMusique}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-xs whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs shadow-xs font-black ${coteBadgeStyle}`}>
                            {p.coteProbable ? `${p.coteProbable}/1` : (p.genyOdds ? `${p.genyOdds}/1` : '—')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-xs whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs shadow-xs font-black ${scoreBadgeStyle}`}>
                            {p.hippoScore ? `${p.hippoScore}/100` : '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {probInfo ? (
                            <div className="inline-flex flex-col items-center justify-center gap-0.5">
                              <span className={`px-2 py-0.5 rounded text-xs font-mono font-black border ${probInfo.badgeBg}`}>
                                {probInfo.percent}%
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">{probInfo.label}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. MÉTHODOLOGIE ET FIABILITÉ DU PRONOSTIC */}
          <div className="bg-[#0b1329] rounded-xl border border-slate-800 p-3.5 space-y-1.5 text-xs text-slate-300 font-sans shadow-md">
            <div className="font-black text-amber-300 uppercase text-xs tracking-wider mb-1">
              MÉTHODOLOGIE ET FIABILITÉ DU PRONOSTIC :
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              • La sélection officielle V38 extrait dynamiquement les 9 premiers chevaux du peloton triés par leur cote probable (du plus petit au plus grand).
            </p>
            <p className="text-[11px] leading-relaxed text-slate-300">
              • Les cotes affichées proviennent en temps réel de l'API PMU ou du scraping officiel Geny. Aucune simulation artificielle n'est appliquée à ces valeurs.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-300">
              • Ce document sert de support d'aide à la décision pour vos jeux simples, couplés, 2sur4 et combinaisons Quinté+. Conservez une gestion de mise responsable.
            </p>
          </div>

          {/* Page 2 Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>PRONOS - PMU - STUDIO 2.0 • Concepteur : Ghislain BONI</span>
            <span>Page 2 / 2</span>
          </div>
        </div>

      </div>
    </div>
  );
};
