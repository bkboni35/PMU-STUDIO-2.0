import React, { useState } from 'react';
import { Activity, Flame, ShieldAlert, Award, Clock, ArrowUpDown, Sparkles, CheckCircle2, AlertTriangle, ChevronRight, Zap } from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { calculerEcartEtForme, EcartFormeResult, calculerPerformance3Musiques, classerChevauxFormeEtPoints } from '../utils/turfCalculations';

interface EcartsFormeAnalysisCardProps {
  course: CourseHippique;
  onSelectHorseForTicket?: (numero: number) => void;
  selectedHorseNumbers?: number[];
}

export const EcartsFormeAnalysisCard: React.FC<EcartsFormeAnalysisCardProps> = ({
  course,
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
}) => {
  const partants = (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

  const [sortBy, setSortBy] = useState<'ecart_asc' | 'ecart_desc' | 'numero'>('ecart_asc');

  if (!partants || partants.length === 0) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400">
        <p className="text-sm font-bold">Aucune donnée de musique disponible pour cette course.</p>
      </div>
    );
  }

  // Calculer l'analyse d'écart pour chaque partant
  const partantsAnalyse = partants.map((p) => {
    const analysis = calculerEcartEtForme(p.musique || '');
    return {
      partant: p,
      analysis,
    };
  });

  // Tri dynamique
  const partantsTries = [...partantsAnalyse].sort((a, b) => {
    if (sortBy === 'ecart_asc') {
      return a.analysis.ecartVictoire - b.analysis.ecartVictoire;
    }
    if (sortBy === 'ecart_desc') {
      return b.analysis.ecartVictoire - a.analysis.ecartVictoire;
    }
    return a.partant.numero - b.partant.numero;
  });

  // Statistiques globales de l'épreuve
  const minEcart = Math.min(...partantsAnalyse.map((pa) => pa.analysis.ecartVictoire));
  const maxEcart = Math.max(...partantsAnalyse.map((pa) => pa.analysis.ecartVictoire));
  const avgEcart = Math.round(
    partantsAnalyse.reduce((acc, curr) => acc + curr.analysis.ecartVictoire, 0) / partantsAnalyse.length
  );

  const topFormeHorses = partantsAnalyse.filter((pa) => pa.analysis.ecartVictoire === minEcart);
  const maxEcartHorses = partantsAnalyse.filter((pa) => pa.analysis.ecartVictoire === maxEcart);

  // Classification officielle par points de musique
  const classification = classerChevauxFormeEtPoints(course.partants || []);

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-[#0c162d] to-slate-950 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-4 relative overflow-hidden">
      {/* Visual Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 font-black">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider">
                Module 'Écarts & Forme'
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                Extraits de la Musique Scraper
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              Nombre de Courses Sans Victoire (Écart) & Diagnostic Physio
            </h3>
          </div>
        </div>

        {/* Dynamic Sort Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-extrabold text-slate-400 pl-2 hidden sm:inline">Trier par :</span>
          <button
            type="button"
            onClick={() => setSortBy('ecart_asc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              sortBy === 'ecart_asc'
                ? 'bg-indigo-500 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Forme Récents (Écart min)</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy('ecart_desc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              sortBy === 'ecart_desc'
                ? 'bg-rose-500 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Grands Écarts (Rupture)</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy('numero')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              sortBy === 'numero'
                ? 'bg-slate-700 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>N° Cheval</span>
          </button>
        </div>
      </div>

      {/* 3 Cartes d'Aperçu Synthétique Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Vainqueur récent / Meilleur Écart */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>Plus Petite Rupture d'Écart</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
              Écart {minEcart}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {topFormeHorses.map((h, idx) => (
              <span
                key={`top-forme-${h.partant.numero}-${idx}`}
                className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1"
              >
                N°{h.partant.numero} {h.partant.nom}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            {minEcart === 0
              ? 'Cheval ayant remporté sa toute dernière course officielle.'
              : `Plus faible écart de victoire (${minEcart} course sans succès).`}
          </p>
        </div>

        {/* Card 2: Plus Grand Écart */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Plus Grand Écart de Victoire</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black">
              Écart {maxEcart}+
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {maxEcartHorses.slice(0, 3).map((h, idx) => (
              <span
                key={`max-ecart-${h.partant.numero}-${idx}`}
                className="px-2.5 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/40 font-bold text-xs"
              >
                N°{h.partant.numero} {h.partant.nom}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Concurrents cherchant un déclic de victoire depuis au moins {maxEcart} épreuves.
          </p>
        </div>

        {/* Card 3: Moyenne de l'Écart dans le Lot */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Moyenne d'Écart du Lot</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">
              {avgEcart} courses
            </span>
          </div>
          <div className="text-sm font-black text-white">
            Densité de Forme : {avgEcart <= 2 ? 'Très Relevée 🔥' : avgEcart <= 4 ? 'Équilibrée ⚖️' : 'Ouverte / Spéculative 🎯'}
          </div>
          <p className="text-[11px] text-slate-400">
            Niveau global de fraîcheur et de régularité des concurrents engagés.
          </p>
        </div>
      </div>

      {/* SECTION CLASSIFICATION PAR POINTS DE PERFORMANCE (4 CATÉGORIES) */}
      <div className="p-5 rounded-3xl bg-slate-950/90 border-2 border-amber-500/40 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Classification Officielle par Points de Performance</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Addition 3 Musiques
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Surprises Triées par Points de Performance
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Règle : 1er-6e = En Forme · 7e-10e = Forme Moyenne · 11e+ = Méforme · Méforme avec Cote &lt; 8.0 = Capable d'Exploit !
                <span className="ml-1 text-indigo-300 font-semibold">(Surprises / Capable d'exploit triées par Points de Performance)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. CHEVAUX EN FORME (1e au 6e) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/50 space-y-3 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
              <span className="text-xs font-black text-emerald-300 uppercase flex items-center gap-1.5">
                <span>🟢</span> CHEVAUX EN FORME
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-black text-[11px] border border-emerald-500/40">
                1e au 6e ({classification.chevauxEnForme.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {classification.chevauxEnForme.map((item) => (
                <div
                  key={`forme-${item.partant.numero}`}
                  onClick={() => onSelectHorseForTicket?.(item.partant.numero)}
                  className={`p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                    selectedHorseNumbers.includes(item.partant.numero) ? 'bg-amber-500/10 border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0" title={`Rang points musique: #${item.rangPoints}`}>
                      #{item.rangPoints}
                    </span>
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-700 shrink-0">
                      {item.partant.numero}
                    </span>
                    <span className="font-bold text-white truncate max-w-[90px]">{item.partant.nom}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-extrabold text-[11px]">{item.pointsMusique} pts</span>
                    {item.cote < 99 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                        {item.cote}/1
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. FORME MOYENNE (7e à 10e) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-amber-500/50 space-y-3 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
              <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                <span>🟡</span> FORME MOYENNE
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-black text-[11px] border border-amber-500/40">
                7e à 10e ({classification.formeMoyenne.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {classification.formeMoyenne.map((item) => (
                <div
                  key={`moyenne-${item.partant.numero}`}
                  onClick={() => onSelectHorseForTicket?.(item.partant.numero)}
                  className={`p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                    selectedHorseNumbers.includes(item.partant.numero) ? 'bg-amber-500/10 border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0" title={`Rang points musique: #${item.rangPoints}`}>
                      #{item.rangPoints}
                    </span>
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-700 shrink-0">
                      {item.partant.numero}
                    </span>
                    <span className="font-bold text-white truncate max-w-[90px]">{item.partant.nom}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-extrabold text-[11px]">{item.pointsMusique} pts</span>
                    {item.cote < 99 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                        {item.cote}/1
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. CAPABLE D'EXPLOIT (Méforme + Cote < 8.0) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-cyan-400/80 space-y-3 shadow-lg relative overflow-hidden ring-2 ring-cyan-500/30">
            <div className="flex items-center justify-between border-b border-cyan-500/40 pb-2">
              <span className="text-xs font-black text-cyan-300 uppercase flex items-center gap-1.5">
                <span>⚡</span> CAPABLE D'EXPLOIT
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/30 text-cyan-200 font-mono font-black text-[11px] border border-cyan-400" title="Triés selon la Classification Officielle par Points de Performance">
                Pts Perf. ({classification.capableExploit.length})
              </span>
            </div>

            {classification.capableExploit.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 text-center">Aucun cheval en méforme avec cote &lt; 8.0 dans cette course.</p>
            ) : (
              <div className="space-y-1.5">
                {classification.capableExploit.map((item) => (
                  <div
                    key={`exploit-${item.partant.numero}`}
                    onClick={() => onSelectHorseForTicket?.(item.partant.numero)}
                    className={`p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/50 hover:border-cyan-400 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                      selectedHorseNumbers.includes(item.partant.numero) ? 'bg-cyan-500/20 border-cyan-300' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-cyan-400 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0" title={`Rang points musique: #${item.rangPoints}`}>
                        #{item.rangPoints}
                      </span>
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-700 shrink-0">
                        {item.partant.numero}
                      </span>
                      <span className="font-bold text-white truncate max-w-[90px]">{item.partant.nom}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-rose-400 font-bold text-[11px]">{item.pointsMusique} pts</span>
                      <span className="text-cyan-300 font-black px-1.5 py-0.5 bg-cyan-900/80 rounded border border-cyan-400 text-[10px]">{item.cote}/1</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. MÉFORME (11e et plus, Cote >= 8.0) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-rose-500/50 space-y-3 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
              <span className="text-xs font-black text-rose-300 uppercase flex items-center gap-1.5">
                <span>🔴</span> MÉFORME
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-black text-[11px] border border-rose-500/40">
                11e et + ({classification.meforme.length})
              </span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {classification.meforme.map((item) => (
                <div
                  key={`meforme-${item.partant.numero}`}
                  onClick={() => onSelectHorseForTicket?.(item.partant.numero)}
                  className={`p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                    selectedHorseNumbers.includes(item.partant.numero) ? 'bg-amber-500/10 border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-rose-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0" title={`Rang points musique: #${item.rangPoints}`}>
                      #{item.rangPoints}
                    </span>
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-700 shrink-0">
                      {item.partant.numero}
                    </span>
                    <span className="font-bold text-slate-300 truncate max-w-[90px]">{item.partant.nom}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400 font-bold text-[11px]">{item.pointsMusique} pts</span>
                    {item.cote < 99 && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold text-[10px]">
                        {item.cote}/1
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau détaillé des partants avec leur Écart et Musique décryptée */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl shadow-xl bg-slate-900/80">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-[11px] font-black uppercase tracking-wider text-slate-300">
              <th className="py-4 px-4">N° / Cheval</th>
              <th className="py-4 px-4 min-w-[180px]">Musique Détaillée (Dernières Sorties)</th>
              <th className="py-4 px-4 text-center min-w-[160px]">
                <div className="flex items-center justify-center gap-1 text-indigo-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Écart (Courses Sans Victoire)</span>
                </div>
              </th>
              <th className="py-4 px-4 text-center">Podiums %</th>
              <th className="py-4 px-4 min-w-[200px]">Diagnostic de Forme</th>
              {onSelectHorseForTicket && <th className="py-4 px-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-xs">
            {partantsTries.map(({ partant, analysis }, idx) => {
              const isSelected = selectedHorseNumbers.includes(partant.numero);

              return (
                <tr
                  key={`ecart-row-${partant.numero}-${idx}`}
                  className={`hover:bg-slate-800/50 transition-all ${
                    isSelected ? 'bg-amber-500/10' : ''
                  }`}
                >
                  {/* N° / Cheval */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 font-black text-amber-400 font-mono text-xs flex items-center justify-center shrink-0">
                        {partant.numero}
                      </span>
                      <div>
                        <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <span>{partant.nom}</span>
                          {partant.ferrure && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                              {partant.ferrure}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {partant.driver || 'Driver N.R.'} {partant.coteProbable ? `· ${partant.coteProbable}/1` : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Musique avec pastilles colorées & Score 3 Musiques */}
                  <td className="py-3.5 px-4">
                    {analysis.dernieresPerformances.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {analysis.dernieresPerformances.map((perf, idx) => (
                            <span
                              key={idx}
                              title={`${perf.token} : ${perf.placeLabel}`}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono border shadow-sm ${perf.badgeBg}`}
                            >
                              {perf.token}
                            </span>
                          ))}
                        </div>
                        {(() => {
                          const perf3 = calculerPerformance3Musiques(partant.musique || '');
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border font-black ${perf3.badgeColorClass}`}>
                                Score 3 Musiques : {perf3.totalPoints} pts
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({perf3.formulaCalculation})
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">Musique non disponible</span>
                    )}
                  </td>

                  {/* Écart Victoire (Large Badge) */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black font-mono border shadow-md flex items-center gap-1.5 ${
                          analysis.ecartVictoire === 0
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                            : analysis.ecartVictoire === 1
                            ? 'bg-teal-950 text-teal-300 border-teal-500/50'
                            : analysis.ecartVictoire <= 3
                            ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                            : 'bg-rose-950 text-rose-300 border-rose-500/50'
                        }`}
                      >
                        {analysis.ecartVictoire === 0 ? (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>0 (Victoire Récente)</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{analysis.ecartVictoire} {analysis.ecartVictoire === 1 ? 'course' : 'courses'}</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {analysis.aVictoireDansMusique ? 'Depuis son dernier succès' : 'Aucun succès récents'}
                      </span>
                    </div>
                  </td>

                  {/* Podiums % */}
                  <td className="py-3.5 px-4 text-center font-mono font-bold">
                    <span
                      className={
                        analysis.tauxPodium >= 50
                          ? 'text-emerald-400'
                          : analysis.tauxPodium >= 30
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }
                    >
                      {analysis.tauxPodium}%
                    </span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      {analysis.podiumsCount}/{analysis.totalRacesRecorded} top 3
                    </span>
                  </td>

                  {/* Diagnostic de Forme */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border inline-block ${analysis.formeColorClass}`}
                      >
                        {analysis.formeBadgeText}
                      </span>
                      <p className="text-[11px] text-slate-300 font-medium leading-tight">
                        {analysis.diagnosticForme}
                      </p>
                    </div>
                  </td>

                  {/* Action Selection pour le ticket */}
                  {onSelectHorseForTicket && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectHorseForTicket(partant.numero)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ml-auto ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span>{isSelected ? 'Sélectionné' : 'Ajouter'}</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
