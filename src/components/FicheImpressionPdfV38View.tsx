import React from 'react';
import { CourseHippique } from '../types/turf';
import { exportToCSV } from '../utils/exportUtils';
import { exportCourseToPdf, exportQuinteOnlyToPdf } from '../utils/pdfExport';
import { computeV38Hierarchy, computeDisciplineGrid } from '../utils/v38Helper';
import { DisciplineGridTable } from './DisciplineGridTable';
import { FileText, Printer, Download, Crown, FileSpreadsheet, Trophy, ShieldCheck, CheckCircle2, Sparkles, Award, Layers, Compass } from 'lucide-react';

interface FicheImpressionPdfV38ViewProps {
  course?: CourseHippique | null;
}

export const FicheImpressionPdfV38View: React.FC<FicheImpressionPdfV38ViewProps> = ({ course }) => {
  const [notice, setNotice] = React.useState<string | null>(null);

  if (!course) return null;

  const {
    poolG1,
    poolG2,
    poolG3,
    selection11,
    basesSolides,
    chancesSerieuses,
    tocardsSpeculatifs,
    surprises,
    delaisses,
  } = computeV38Hierarchy(course);

  const disciplineGrid = computeDisciplineGrid(course);

  const allOrdered = [...selection11, ...delaisses];

  const triggerExportPDF = () => {
    try {
      setNotice("🚀 Génération du PDF « PRONOS -PMU -STUDIO 2.0 » lancée ! Le téléchargement démarre...");
      exportQuinteOnlyToPdf(course);
      setTimeout(() => setNotice(null), 5000);
    } catch (e) {
      console.error('Erreur export PDF:', e);
      setNotice("⚠️ Erreur lors de la génération du PDF. Veuillez réessayer.");
    }
  };

  const triggerExportComplete = () => {
    try {
      setNotice("📄 Génération de l'Analyse Complète PDF lancée ! Le téléchargement démarre...");
      exportCourseToPdf(course);
      setTimeout(() => setNotice(null), 5000);
    } catch (e) {
      console.error('Erreur export complet PDF:', e);
      setNotice("⚠️ Erreur lors de la génération du PDF complet. Veuillez réessayer.");
    }
  };

  const triggerExportCSV = () => {
    try {
      setNotice("📊 Génération du fichier CSV « PRONOS -PMU -STUDIO 2.0 » lancée !");
      exportToCSV(course);
      setTimeout(() => setNotice(null), 5000);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerPrintPage = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-[1200px] mx-auto w-full flex flex-col items-center">
      {notice && (
        <div className="w-full p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 w-full flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Document PDF Officiel : HIPPOANALYSE PRO (Hiérarchie V38)</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={triggerPrintPage}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer (A4)</span>
          </button>
          <button
            onClick={triggerExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Télécharger Fiche PDF V38</span>
          </button>
          <button
            onClick={triggerExportComplete}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Télécharger Analyse Complète (PDF)</span>
          </button>
          <button
            onClick={triggerExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Pristine Paper Canvas Preview (A4 Portrait Mode Preview) */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-8 space-y-6 border border-slate-300 font-sans relative w-full max-w-[800px] mx-auto min-h-[1130px]">
        
        {/* 1. Header Box (Model: PRONOS - PMU - STUDIO 2.0) */}
        <div className="bg-[#0b1329] text-white rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
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
          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shrink-0">
              Fiche Officielle PMU-STUDIO 2.0
            </div>
            <div className="text-left sm:text-right text-[11px] text-slate-300 space-y-0.5">
              <div>Date officielle : <strong className="text-amber-300">{course.date || 'Mercredi 30 Septembre 2026'}</strong></div>
            </div>
          </div>
        </div>

        {/* 2. Course Details Cartouche */}
        <div className="bg-[#0b1329] rounded-xl border border-slate-800 p-4 space-y-2 shadow-md">
          <div className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-tight">
            {(() => {
              const rawTitle = course.prixNom || course.titre || 'Grand Prix Anjou-Maine';
              const cleanTitle = rawTitle.replace(/\s*\(Quinté\+\)/gi, '').trim();
              const typeStr = course.estQuinte ? 'Quinté+' : 'V38';
              return `RÉUNION ${course.reunion || 'R1'} - COURSE ${course.course || 'C1'} | ${cleanTitle} (${typeStr}) | Hippodrome : ${course.hippodrome || 'Laval'} | Corde : ${course.corde || 'Gauche'} | Distance : ${course.distance || 2850}m`;
            })()}
          </div>
        </div>

        {/* 3. PRONOSTIC OFFICIEL QUINTÉ+ V38 (SÉLECTION PAR COTE) */}
        <div className="rounded-xl border border-slate-800 overflow-hidden shadow-lg bg-[#0b1329] text-white">
          <div className="bg-[#0b1329] border-b border-slate-800 text-white p-3 px-4 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between">
            <span className="text-amber-400 font-extrabold">PRONOSTIC OFFICIEL QUINTÉ+ V38 (SÉLECTION PAR COTE)</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/90 px-2.5 py-0.5 rounded border border-emerald-500/50">
              🔒 COTES SCELLÉES SANS VARIATION
            </span>
          </div>

          <div className="p-4 sm:p-5 bg-[#0b1329] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* BASES SOLIDES */}
              <div className="space-y-2">
                <div className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span>BASES SOLIDES :</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {basesSolides.map((p, idx) => (
                    <div key={`pdf-base-${p.numero}-${idx}`} className="flex flex-col items-center">
                      <div className="w-12 h-10 rounded-lg bg-[#059669] text-white font-black text-lg flex items-center justify-center shadow-md border border-emerald-400/30">
                        {p.numero}
                      </div>
                      <span className="text-[11px] font-extrabold text-emerald-300 mt-1">
                        {p.coteProbable || p.genyOdds}/1
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHANCES SÉRIEUSES */}
              <div className="space-y-2">
                <div className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center justify-between">
                  <span>CHANCES SÉRIEUSES :</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {chancesSerieuses.map((p, idx) => (
                    <div key={`pdf-chance-${p.numero}-${idx}`} className="flex flex-col items-center">
                      <div className="w-12 h-10 rounded-lg bg-[#0284c7] text-white font-black text-lg flex items-center justify-center shadow-md border border-sky-400/30">
                        {p.numero}
                      </div>
                      <span className="text-[11px] font-extrabold text-sky-300 mt-1">
                        {p.coteProbable || p.genyOdds}/1
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOCARDS SPÉCULATIFS */}
              <div className="space-y-2">
                <div className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center justify-between">
                  <span>TOCARDS SPÉCULATIFS :</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tocardsSpeculatifs.map((p, idx) => (
                    <div key={`pdf-tocard-${p.numero}-${idx}`} className="flex flex-col items-center">
                      <div className="w-12 h-10 rounded-lg bg-[#e11d48] text-white font-black text-lg flex items-center justify-center shadow-md border border-rose-400/30">
                        {p.numero}
                      </div>
                      <span className="text-[11px] font-extrabold text-rose-300 mt-1">
                        {p.coteProbable || p.genyOdds}/1
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SURPRISES */}
              <div className="space-y-2">
                <div className="text-xs font-black text-purple-400 uppercase tracking-wider">
                  <span>SURPRISES :</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {surprises.map((p, idx) => (
                    <div key={`pdf-surprise-${p.numero}-${idx}`} className="flex flex-col items-center">
                      <div className="w-12 h-10 rounded-lg bg-[#be123c] text-white font-black text-lg flex items-center justify-center shadow-md border border-purple-400/30">
                        {p.numero}
                      </div>
                      <span className="text-[11px] font-extrabold text-purple-300 mt-1">
                        {p.coteProbable || p.genyOdds}/1
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DÉLAISSÉS */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  <span>DÉLAISSÉS :</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {delaisses.map((p, idx) => (
                    <div key={`pdf-delaisse-${p.numero}-${idx}`} className="flex flex-col items-center">
                      <div className="w-12 h-10 rounded-lg bg-[#334155] text-white font-black text-lg flex items-center justify-center shadow-sm border border-slate-600/40">
                        {p.numero}
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 mt-1">
                        {p.coteProbable || p.genyOdds}/1
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. TABLEAU DÉTAILLÉ DE TOUS LES PARTANTS & CLASSEMENT PAR COTE V38 */}
        <div id="v38-table-container" className="rounded-xl border-2 border-slate-800 overflow-hidden shadow-xl bg-[#0b1329] text-white">
          <div className="bg-[#0b1329] text-amber-400 p-3.5 px-5 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between border-b-2 border-amber-500">
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              TABLEAU DÉTAILLÉ DE TOUS LES PARTANTS & CLASSEMENT PAR COTE V38
            </span>
            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950 px-3 py-1 rounded-full border border-emerald-500/50">
              EXTRACTION OFFICIELLE
            </span>
          </div>

          <div className="overflow-x-auto bg-[#0b1329]">
            <table className="w-full text-left text-xs border-collapse font-sans min-w-[700px]">
              <thead>
                <tr className="bg-[#070d1e] text-sky-300 font-black uppercase text-[11px] border-b-2 border-slate-800">
                  <th className="py-3 px-3 text-center w-12 text-amber-400">N°</th>
                  <th className="py-3 px-1 text-sky-300">Cheval</th>
                  <th className="py-3 px-1 text-sky-300">Driver / Jockey</th>
                  <th className="py-3 px-1 text-center text-sky-300">MUSIQUE</th>
                  <th className="py-3 px-3 text-center text-sky-300">Cote</th>
                  <th className="py-3 px-3 text-center text-sky-300">Score IA</th>
                  <th className="py-3 px-3 text-center text-sky-300">Rôle V38</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-bold">
                {allOrdered.map((p, idx) => {
                  const rank = idx + 1;
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

                  // Traitement des 3 dernières musiques
                  const rawMusique = p.musique || '';
                  const musiqueMatches = rawMusique.match(/\d+[apmshd]|D[apmshd]/gi);
                  const displayMusique = musiqueMatches && musiqueMatches.length > 0
                    ? musiqueMatches.slice(0, 3).join(' ')
                    : rawMusique.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(' ') || '—';

                  return (
                    <tr key={`pdf-partant-${p.numero}-${idx}`} className={`${rowBg} transition-colors border-b border-slate-800/80`}>
                      <td className="py-2.5 px-3 text-center">
                        <div className="w-8 h-8 rounded-lg bg-amber-200 text-slate-950 font-black text-sm flex items-center justify-center border-2 border-amber-400 shadow-md mx-auto">
                          {p.numero}
                        </div>
                      </td>
                      <td className="py-2.5 px-1 font-black text-white text-xs uppercase tracking-tight whitespace-nowrap">
                        {p.nom}
                      </td>
                      <td className="py-2.5 px-1 text-white text-xs font-bold whitespace-nowrap">
                        {p.driver || '—'}
                      </td>
                      <td className="py-2.5 px-1 text-center font-mono text-[11px] font-black text-amber-300 whitespace-nowrap">
                        {displayMusique}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs shadow-xs font-black ${coteBadgeStyle}`}>
                          {p.coteProbable ? `${p.coteProbable}/1` : (p.genyOdds ? `${p.genyOdds}/1` : '—')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-xs whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs shadow-xs font-black ${scoreBadgeStyle}`}>
                          {p.hippoScore ? `${p.hippoScore}/100` : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-md text-[10px] uppercase inline-block whitespace-nowrap shadow-xs ${rolePillBg}`}>
                          {roleText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. MÉTHODOLOGIE ET FIABILITÉ DU PRONOSTIC */}
        <div className="bg-[#0b1329] rounded-xl border border-slate-800 p-4 space-y-1.5 text-xs text-slate-300 font-sans shadow-md">
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

        {/* Footer line */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>HippoAnalyse - Synthèse de Performance Certifiée pour l'Impression</span>
          <span>Page 1 / 1</span>
        </div>
      </div>
    </div>
  );
};
