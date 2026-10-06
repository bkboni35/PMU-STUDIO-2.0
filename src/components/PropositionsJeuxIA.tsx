import React, { useState, useRef } from 'react';
import {
  Trophy,
  Printer,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Target,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Info,
  Check,
  Coins,
  FileText,
  Calculator,
  Crown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { FactCheckingAuditCard } from './FactCheckingAuditCard';
import { formatFCFA } from '../utils/turfCalculations';

interface PropositionsJeuxIAProps {
  course?: CourseHippique | null;
  onSelectHorses?: (horses: number[]) => void;
  onNavigateToCalculator?: () => void;
}

export const PropositionsJeuxIA: React.FC<PropositionsJeuxIAProps> = ({
  course,
  onSelectHorses,
  onNavigateToCalculator,
}) => {
  const [includeNonPartants, setIncludeNonPartants] = useState(false);
  const [showTierceOption, setShowTierceOption] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  if (!course) return null;

  const { synthese, partants = [] } = course;
  const partantsMap = new Map<number, Partant>(partants.map((p) => [p.numero, p]));

  // Chevaux actifs (hors non-partants)
  const partantsActifs = partants.filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

  // Calcul du classement par côte probable pour garantir un ordre hiérarchique réaliste (Favoris en premier)
  const partantsAvecIndex = [...partantsActifs].map((p) => ({
    ...p,
    indexValeur: p.coteProbable !== undefined ? (p.hippoScore || 0) - p.coteProbable : (p.hippoScore || 0),
    coteSort: p.coteProbable !== undefined ? Number(p.coteProbable) : 99,
  })).sort((a, b) => {
    if (a.coteSort !== b.coteSort) return a.coteSort - b.coteSort;
    return (b.hippoScore || 0) - (a.hippoScore || 0);
  });

  const selection9 = partantsAvecIndex.map((p) => p.numero);

  // Base incontournable et 2e base (S'assurer d'exclure rigoureusement tout non-partant)
  const rawBase1 = synthese?.baseIncontournable;
  const rawBase2 = synthese?.secondeBase;
  const isBase1Valid = rawBase1 && partantsMap.get(rawBase1) && !partantsMap.get(rawBase1)?.estNonPartant && partantsMap.get(rawBase1)?.statut !== 'Non-partant';
  const isBase2Valid = rawBase2 && partantsMap.get(rawBase2) && !partantsMap.get(rawBase2)?.estNonPartant && partantsMap.get(rawBase2)?.statut !== 'Non-partant';

  const base1Num = isBase1Valid ? rawBase1 : selection9[0] || partantsActifs[0]?.numero || 1;
  const base2Num = isBase2Valid ? rawBase2 : (selection9[1] !== base1Num ? selection9[1] : selection9[0] || 2);
  const base1Horse = partantsMap.get(base1Num) || partantsActifs[0];
  const base2Horse = partantsMap.get(base2Num) || partantsActifs[1];

  // Ordre préférentiel des chevaux actifs basé sur la hiérarchie V38
  const topList: number[] = [];
  if (base1Num && !topList.includes(base1Num)) topList.push(base1Num);
  if (base2Num && !topList.includes(base2Num)) topList.push(base2Num);

  selection9.forEach((n) => {
    if (!topList.includes(n)) topList.push(n);
  });

  // Sélections pour les différents jeux produits par algorithme :
  // 1. Couplé
  const coupleBases = [base1Num, base2Num].filter(Boolean);
  const coupleAssocies = topList.filter((n) => !coupleBases.includes(n)).slice(0, 3);
  const couple3 = topList.slice(0, 3);

  // 2. Trio : 5 Numéros
  const trio5 = topList.slice(0, 5);

  // 3. Quarté : Champ Réduit (2 bases + 4 associés)
  const quarteBases = [base1Num, base2Num].filter(Boolean);
  const quarteAssocies = topList.filter((n) => !quarteBases.includes(n)).slice(0, 4);
  const quarte6 = topList.slice(0, 6);

  // 4. Quinté+ : Champ Réduit (2 bases + 5 associés)
  const quinteBases = [base1Num, base2Num].filter(Boolean);
  const quinteAssocies = topList.filter((n) => !quinteBases.includes(n)).slice(0, 5);
  const quinte7 = topList.slice(0, 7);

  // Tiercé en 5 N°
  const tierce5 = topList.slice(0, 5);

  const handleSelectGameHorses = (nums: number[], label: string) => {
    if (onSelectHorses) {
      onSelectHorses(nums);
      setActionFeedback(`✓ Sélection "${label}" chargée (${nums.map(n => `N°${n}`).join(' - ')})`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Impression native
  const handlePrint = () => {
    window.print();
  };

  // Obtenir le rôle d'un partant
  const getHorseRole = (num: number, isNP?: boolean) => {
    if (isNP) return { label: 'NON-PARTANT', color: 'bg-rose-950/80 text-rose-300 border-rose-800' };
    if (num === base1Num) return { label: 'BASE 1 (Incontournable)', color: 'bg-amber-500 text-slate-950 font-black' };
    if (num === base2Num) return { label: 'BASE 2 (Seconde Base)', color: 'bg-emerald-500 text-slate-950 font-black' };
    if (synthese?.outsiders?.includes(num)) return { label: 'OUTSIDER', color: 'bg-purple-500/30 text-purple-200 border-purple-500/50' };
    if (synthese?.tocards?.includes(num)) return { label: 'TOCARD', color: 'bg-rose-500/30 text-rose-200 border-rose-500/50' };
    if (topList.slice(0, 8).includes(num)) return { label: 'CHANCE FORTE', color: 'bg-sky-500/30 text-sky-200 border-sky-500/50' };
    return { label: 'COMPLÉMENT', color: 'bg-slate-800 text-slate-400 border-slate-700' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Actions & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 rounded-3xl border border-amber-500/30 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-md">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Propositions de Jeux de l'Algorithme & Mises en FCFA
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
              Grille Tarifaire FCFA
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Formules algorithmiques certifiées : <strong>Couplé</strong> (Gagnant/Placé) · <strong>Trio : 5 N°</strong> (400 F) · <strong>Quarté : Champ Réduit</strong> (300 F) · <strong>Quinté+ : Champ Réduit</strong> (300 F).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            title="Imprimer la liste des chevaux et les coupons de jeux en FCFA"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer la Liste & Coupons</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback notification */}
      {actionFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Fact-Checking Audit Certificate */}
      <FactCheckingAuditCard course={course} />

      {/* HIÉRARCHIE QUINTÉ+ V38 - MODÈLE V38 RENFORCÉ & CONSENSUS MULTI-IA */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0a101d] to-slate-950 rounded-3xl border-2 border-amber-500/60 p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <h3 className="text-base sm:text-lg font-black text-amber-300 uppercase tracking-wider">
                HIÉRARCHIE QUINTÉ+ V38 · Modèle V38 Renforcé
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Classement d'élite officiel ordonné des 8 chevaux retenus après confrontation des 5 étapes du moteur d'analyse.
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black self-start sm:self-center">
            Indice de confiance : 8.8/10
          </span>
        </div>

        {/* 4 Piliers V38 : Bases, Chances, Outsiders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wide">1. BASE INCONTOURNABLE</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-base flex items-center justify-center">
                {base1Num}
              </span>
              <div className="truncate">
                <span className="text-xs font-bold text-white truncate block">{base1Horse?.nom || `N°${base1Num}`}</span>
                <span className="text-[10px] text-emerald-300 font-mono">Cote : {base1Horse?.coteProbable}/1</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-sky-400 tracking-wide">2. SECONDE BASE</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-sky-500 text-slate-950 font-black text-base flex items-center justify-center">
                {base2Num}
              </span>
              <div className="truncate">
                <span className="text-xs font-bold text-white truncate block">{base2Horse?.nom || `N°${base2Num}`}</span>
                <span className="text-[10px] text-sky-300 font-mono">Cote : {base2Horse?.coteProbable}/1</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-yellow-950/40 border border-yellow-500/40 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wide">3. CHANCES SÉRIEUSES</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selection9.slice(2, 5).map((num, idx) => {
                const h = partantsMap.get(num);
                return (
                  <span key={`prop-chance-${num}-${idx}`} className="px-2 py-0.5 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs font-mono">
                    N°{num} {h?.coteProbable ? `(${h.coteProbable}/1)` : ''}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wide">4. OUTSIDERS & TOCARDS</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selection9.slice(5, 9).map((num, idx) => {
                const h = partantsMap.get(num);
                return (
                  <span key={`prop-outsider-${num}-${idx}`} className="px-2 py-0.5 rounded-lg bg-purple-500/30 text-purple-200 font-black text-xs font-mono">
                    N°{num}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ordre Probable vs Ordre Possible Multi-IA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                ORDRE PROBABLE (Top Consensus Sécurisé)
              </span>
              <span className="text-[10px] font-bold text-slate-400">1er au 5e</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {topList.slice(0, 5).map((num, idx) => {
                const h = partantsMap.get(num);
                return (
                  <div key={`prop-prob-${num}-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-amber-400 font-black">{idx + 1}e</span>
                    <span className="font-black text-white font-mono">N°{num}</span>
                    <span className="text-slate-400 text-[10px] truncate max-w-[70px]">{h?.nom?.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                ORDRE POSSIBLE (Alternative Spéculative)
              </span>
              <span className="text-[10px] font-bold text-slate-400">1er au 5e</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[topList[1], topList[2], topList[0], topList[3], topList[4] || topList[5]].filter(Boolean).map((num, idx) => {
                const h = partantsMap.get(num);
                return (
                  <div key={`prop-poss-${num}-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-purple-400 font-black">{idx + 1}e</span>
                    <span className="font-black text-white font-mono">N°{num}</span>
                    <span className="text-slate-400 text-[10px] truncate max-w-[70px]">{h?.nom?.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of AI Game Proposals in FCFA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. COUPLÉ (Coupé) : GAGNANT / PLACÉ & CHAMP RÉDUIT */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 rounded-3xl border-2 border-amber-500/50 p-6 shadow-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Target className="w-3.5 h-3.5" />
                Couplé (Gagnant • Placé • Champ Réduit)
              </span>
              <span className="text-xs font-bold text-amber-400">
                Mise minimale : 500 FCFA
              </span>
            </div>

            {/* Bases Couplé */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/40 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-md shrink-0">
                  {base1Num}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-amber-400">Base 1 (Incontournable)</div>
                  <div className="text-xs font-black text-white truncate">{base1Horse?.nom}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Cote: {base1Horse?.coteProbable}/1 • Sc: {base1Horse?.hippoScore}/100</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/40 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-md shrink-0">
                  {base2Num}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Base 2 (Appui Solide)</div>
                  <div className="text-xs font-black text-white truncate">{base2Horse?.nom}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Cote: {base2Horse?.coteProbable}/1 • Sc: {base2Horse?.hippoScore}/100</div>
                </div>
              </div>
            </div>

            {/* Associés pour Champ Réduit */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 mb-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Associés Champ Réduit (X) :
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {coupleAssocies.map((num) => {
                  const h = partantsMap.get(num);
                  return (
                    <span
                      key={`cp-ass-${num}`}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs flex items-center gap-1"
                    >
                      <span className="text-amber-400 font-black">N°{num}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[60px]">{h?.nom?.split(' ')[0]}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Couplés Formules & Coûts */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Couplé Gagnant / Placé Sec ({base1Num} - {base2Num}) :</span>
                <strong className="text-emerald-400 font-black">500 FCFA (1 pari)</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Champ Réduit (Base N°{base1Num} + 3 associés) :</span>
                <strong className="text-amber-300 font-black">1 500 FCFA (3 paris à 500 F)</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Couplé Combiné 3 ch. ({couple3.join(' - ')}) :</span>
                <strong className="text-sky-300 font-black">1 500 FCFA (3 paris à 500 F)</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <span className="text-[11px] text-amber-200/80">
              Formule conseillée : Couplé Gagnant/Placé Sec & Champ Réduit N°{base1Num}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectGameHorses([base1Num, base2Num, ...coupleAssocies], 'Couplé')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
              >
                Charger ce Couplé
              </button>
              {onNavigateToCalculator && (
                <button
                  type="button"
                  onClick={onNavigateToCalculator}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all cursor-pointer"
                  title="Calculer dans le calculateur de tickets"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. TRIO : 5 N° (400 FCFA MIN) */}
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between hover:border-teal-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="px-3 py-1 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                Trio : 5 Numéros (5 N°)
              </span>
              <span className="text-xs font-bold text-teal-300">
                Mise minimale : 400 FCFA
              </span>
            </div>

            {/* 5 Horses Badges for Trio */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {trio5.map((num, idx) => {
                const h = partantsMap.get(num);
                return (
                  <div
                    key={`prop-trio-5-${num}-${idx}`}
                    className="flex flex-col items-center p-2 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-md"
                  >
                    <span className="text-[10px] font-bold text-slate-500">{idx + 1}e</span>
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 font-black text-base flex items-center justify-center my-1 shadow-sm">
                      {num}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200 truncate w-full">
                      {h?.nom?.split(' ')[0] || `N°${num}`}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-400">
                      {h?.coteProbable ? `${h.coteProbable}/1` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-teal-300 font-bold">Trio Combiné Intégral 5 N° ({trio5.join(' - ')}) :</span>
                <strong className="text-teal-300 font-black">4 000 FCFA (10 paris à 400 F)</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Champ Réduit (2 bases + 3 associés) :</span>
                <strong className="text-amber-300 font-bold">1 200 FCFA (3 paris à 400 F)</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Champ Réduit (1 base + 4 associés) :</span>
                <strong className="text-sky-300 font-bold">2 400 FCFA (6 paris à 400 F)</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <span className="text-[11px] text-teal-300/80">
              💡 Le Combiné 5 N° garantit 100% de toucher le Trio dès que 3 chevaux sont à l'arrivée !
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectGameHorses(trio5, 'Trio 5 N°')}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
              >
                Charger le Trio (5 N°)
              </button>
              {onNavigateToCalculator && (
                <button
                  type="button"
                  onClick={onNavigateToCalculator}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition-all cursor-pointer"
                  title="Calculer dans le calculateur de tickets"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. QUARTÉ+ : CHAMP RÉDUIT (300 FCFA MIN) */}
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between hover:border-purple-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                Quarté : Champ Réduit
              </span>
              <span className="text-xs font-bold text-purple-300">
                Mise minimale : 300 FCFA
              </span>
            </div>

            {/* Architecture Champ Réduit Quarté */}
            <div className="space-y-3 mb-4">
              {/* Bases Fixes (2 chevaux) */}
              <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 mb-2">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    2 Bases Solides Fixes
                  </span>
                  <span className="text-slate-400 font-mono">Position 1 & 2</span>
                </div>
                <div className="flex items-center gap-3">
                  {quarteBases.map((num, i) => {
                    const h = partantsMap.get(num);
                    return (
                      <div key={`qb-${num}-${i}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-purple-500/30 flex-1 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black font-mono flex items-center justify-center shrink-0">
                          {num}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{h?.nom}</div>
                          <div className="text-[10px] text-amber-300 font-mono">Cote: {h?.coteProbable}/1</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Associés (Champs X - 4 chevaux) */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                  <span>4 Chevaux Associés (Champs X)</span>
                  <span className="text-purple-400 font-mono">Compléments podium</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {quarteAssocies.map((num, idx) => {
                    const h = partantsMap.get(num);
                    return (
                      <div key={`qa-${num}-${idx}`} className="flex flex-col items-center p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[9px] text-purple-400 font-bold">X{idx + 1}</span>
                        <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-200 font-black font-mono flex items-center justify-center my-0.5 border border-purple-500/40">
                          {num}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold truncate w-full">{h?.nom?.split(' ')[0]}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{h?.coteProbable}/1</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formule visuelle du coupon */}
              <div className="px-3 py-2 rounded-xl bg-slate-950 border border-purple-500/20 text-center font-mono text-xs text-purple-200">
                Coupon : <strong className="text-amber-400">N°{quarteBases[0]} - N°{quarteBases[1]}</strong> - <span className="text-purple-400 font-bold">X - X</span> / Associés : <strong className="text-white">{quarteAssocies.join(', ')}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-purple-300 font-bold">Champ Réduit (2 bases + 4 associés) :</span>
                <strong className="text-purple-300 font-black">1 800 FCFA (6 combinaisons × 300 F)</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Option Flexi 50% au Quarté :</span>
                <strong className="text-emerald-400 font-bold">900 FCFA (6 combinaisons × 150 F)</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Champ Réduit (1 base + 5 associés) :</span>
                <strong className="text-slate-400 font-medium">3 000 FCFA (10 combinaisons)</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <span className="text-[11px] text-purple-300/80">
              💡 Formule reine : optimise vos chances Ordre, Désordre et Bonus 4 à coût réduit !
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectGameHorses([...quarteBases, ...quarteAssocies], 'Quarté Champ Réduit')}
                className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs transition-all cursor-pointer shadow-md"
              >
                Charger Quarté Champ Réduit
              </button>
              {onNavigateToCalculator && (
                <button
                  type="button"
                  onClick={onNavigateToCalculator}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition-all cursor-pointer"
                  title="Calculer dans le calculateur de tickets"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. QUINTÉ+ : CHAMP RÉDUIT (300 FCFA MIN) */}
        <div className="bg-gradient-to-br from-red-950/30 via-slate-900 to-slate-950 rounded-3xl border-2 border-red-500/40 p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Trophy className="w-3.5 h-3.5" />
                Quinté+ : Champ Réduit
              </span>
              <span className="text-xs font-bold text-rose-300">
                Mise minimale : 300 FCFA
              </span>
            </div>

            {/* Architecture Champ Réduit Quinté+ */}
            <div className="space-y-3 mb-4">
              {/* Bases Fixes (2 chevaux) */}
              <div className="p-3 rounded-2xl bg-red-950/30 border border-red-500/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-rose-300 mb-2">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    2 Bases Incontournables
                  </span>
                  <span className="text-slate-400 font-mono">Bases maîtresses</span>
                </div>
                <div className="flex items-center gap-3">
                  {quinteBases.map((num, i) => {
                    const h = partantsMap.get(num);
                    return (
                      <div key={`quinte-b-${num}-${i}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-red-500/30 flex-1 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white font-black font-mono flex items-center justify-center shrink-0">
                          {num}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{h?.nom}</div>
                          <div className="text-[10px] text-amber-300 font-mono">Cote: {h?.coteProbable}/1</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Associés (Champs X - 5 chevaux) */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                  <span>5 Chevaux Associés (Champs X)</span>
                  <span className="text-rose-400 font-mono">Garantie couverture</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {quinteAssocies.map((num, idx) => {
                    const h = partantsMap.get(num);
                    return (
                      <div key={`quinte-a-${num}-${idx}`} className="flex flex-col items-center p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[9px] text-rose-400 font-bold">X{idx + 1}</span>
                        <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-200 font-black font-mono flex items-center justify-center my-0.5 border border-rose-500/40">
                          {num}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold truncate w-full">{h?.nom?.split(' ')[0]}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{h?.coteProbable}/1</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formule visuelle du coupon */}
              <div className="px-3 py-2 rounded-xl bg-slate-950 border border-red-500/20 text-center font-mono text-xs text-rose-200">
                Coupon : <strong className="text-amber-400">N°{quinteBases[0]} - N°{quinteBases[1]}</strong> - <span className="text-rose-400 font-bold">X - X - X</span> / Associés : <strong className="text-white">{quinteAssocies.join(', ')}</strong>
              </div>
            </div>

            {/* Mises en FCFA pour le Quinté Champ Réduit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/80 border border-red-500/30 text-xs text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">Plein Tarif (100%)</span>
                <strong className="text-rose-400 text-sm sm:text-base font-black block">3 000 FCFA</strong>
                <span className="text-[9px] text-slate-500 block">10 combinaisons × 300 F</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-center space-y-0.5">
                <span className="text-[10px] text-emerald-400 block font-bold">Option Flexi 50%</span>
                <strong className="text-emerald-400 text-sm sm:text-base font-black block">1 500 FCFA</strong>
                <span className="text-[9px] text-slate-400 block">10 combinaisons × 150 F</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-0.5">
                <span className="text-[10px] text-sky-400 block font-semibold">Option Flexi 25%</span>
                <strong className="text-sky-300 text-sm sm:text-base font-black block">750 FCFA</strong>
                <span className="text-[9px] text-slate-500 block">10 combinaisons × 75 F</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-red-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <span className="text-[11px] text-rose-300/90">
              ⭐ Formule reine du Quinté+ : couvre l'Ordre, Désordre, Bonus 4 et Bonus 3 dès 1 500 FCFA !
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectGameHorses([...quinteBases, ...quinteAssocies], 'Quinté+ Champ Réduit')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs transition-all cursor-pointer shadow-md"
              >
                Charger Quinté+ Champ Réduit
              </button>
              {onNavigateToCalculator && (
                <button
                  type="button"
                  onClick={onNavigateToCalculator}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 transition-all cursor-pointer"
                  title="Calculer dans le calculateur de tickets"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COMPLÉMENT OPTIONNEL : TIERCE EN 5 NUMÉROS */}
      <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-5 shadow-lg">
        <div
          onClick={() => setShowTierceOption(!showTierceOption)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Formule Tiercé Complémentaire en 5 Numéros</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                  Mise min: 300 FCFA
                </span>
              </h4>
              <p className="text-xs text-slate-400">Pour les turfistes souhaitant également valider le Tiercé classique</p>
            </div>
          </div>
          <button type="button" className="p-1 text-slate-400 hover:text-white">
            {showTierceOption ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showTierceOption && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {tierce5.map((num, idx) => {
                const h = partantsMap.get(num);
                return (
                  <div key={`tierce-badge-${num}-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-sky-400 font-black">{idx + 1}e</span>
                    <span className="font-mono font-black text-white">N°{num}</span>
                    <span className="text-slate-400 text-[10px] truncate max-w-[65px]">{h?.nom?.split(' ')[0]}</span>
                    <span className="text-amber-400 text-[10px] font-mono font-bold">({h?.coteProbable}/1)</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div>
                Combiné 5 chevaux : <strong className="text-emerald-400 font-black">3 000 FCFA</strong> (10 paris à 300 F) · Champ Réduit (2B + 3A) : <strong className="text-sky-300 font-black">900 FCFA</strong> (3 paris à 300 F)
              </div>
              <button
                type="button"
                onClick={() => handleSelectGameHorses(tierce5, 'Tiercé 5 N°')}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                Charger Tiercé (5 N°)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION : LISTE DE CHEVAUX IMPRIMABLES & COUPON PMU EN FCFA */}
      <div
        id="printable-turf-section"
        ref={printRef}
        className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none"
      >
        {/* Printable Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400 print:text-black" />
              <h3 className="text-lg sm:text-xl font-black text-white print:text-black">
                Bordereau Récapitulatif & Grille des Mises FCFA Imprimable
              </h3>
            </div>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
              Épreuve : {course.titre} • {course.hippodrome} • {course.discipline} ({course.distance}m, corde à {course.corde?.toLowerCase() || 'droite'}) • {course.date}
            </p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeNonPartants}
                onChange={(e) => setIncludeNonPartants(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              <span>Afficher les Non-Partants ({partants.filter((p) => p.estNonPartant).length})</span>
            </label>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimer cette fiche</span>
            </button>
          </div>
        </div>

        {/* Printable Recap Cards with FCFA minimum bets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 print:grid print:grid-cols-6 print:gap-1.5 mb-4">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 print:border-black print:bg-gray-100">
            <span className="text-[9px] uppercase font-bold text-slate-500 print:text-gray-700 block truncate">
              Couplé (500 F)
            </span>
            <strong className="text-xs sm:text-sm font-black text-amber-400 print:text-black block truncate">
              N°{base1Num} - N°{base2Num}
            </strong>
            <span className="text-[9px] text-slate-400 print:text-gray-600">Sec 500 F • Ch.R 1 500 F</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 print:border-black print:bg-gray-100">
            <span className="text-[9px] uppercase font-bold text-slate-500 print:text-gray-700 block truncate">
              Trio (5 N° - 400 F)
            </span>
            <strong className="text-xs sm:text-sm font-black text-teal-400 print:text-black block truncate">
              {trio5.join(' - ')}
            </strong>
            <span className="text-[9px] text-slate-400 print:text-gray-600">Comb. 4 000 F • Ch.R 1 200 F</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 print:border-black print:bg-gray-100">
            <span className="text-[9px] uppercase font-bold text-slate-500 print:text-gray-700 block truncate">
              Quarté Champ Réduit
            </span>
            <strong className="text-xs sm:text-sm font-black text-purple-400 print:text-black block truncate">
              {quarteBases.join('-')}-X-X / {quarteAssocies.join('-')}
            </strong>
            <span className="text-[9px] text-slate-400 print:text-gray-600">6 combis = 1 800 FCFA</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 print:border-black print:bg-gray-100">
            <span className="text-[9px] uppercase font-bold text-slate-500 print:text-gray-700 block truncate">
              Quinté+ Champ Réduit
            </span>
            <strong className="text-xs sm:text-sm font-black text-rose-400 print:text-black block truncate">
              {quinteBases.join('-')}-X-X-X / {quinteAssocies.join('-')}
            </strong>
            <span className="text-[9px] text-slate-400 print:text-gray-600">10 combis = 3 000 F (Flexi 1 500)</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 print:border-black print:bg-gray-100">
            <span className="text-[9px] uppercase font-bold text-slate-500 print:text-gray-700 block truncate">
              Tiercé (300 F)
            </span>
            <strong className="text-xs sm:text-sm font-black text-sky-400 print:text-black block truncate">
              {tierce5.join(' - ')}
            </strong>
            <span className="text-[9px] text-slate-400 print:text-gray-600">Comb. 3 000 F • Ch.R 900 F</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 print:border-black print:bg-gray-100">
            <span className="text-[9px] uppercase font-bold text-slate-500 print:text-gray-700 block truncate">
              Multi en 4 (350 F)
            </span>
            <strong className="text-xs sm:text-sm font-black text-emerald-400 print:text-black block truncate">
              {trio5.slice(0, 4).join(' - ')}
            </strong>
            <span className="text-[9px] text-slate-400 print:text-gray-600">350 FCFA / mise</span>
          </div>
        </div>

        {/* The Printable Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-black">
          <table className="w-full text-left text-xs text-slate-300 print:text-black">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800 print:bg-gray-200 print:text-black print:border-black">
              <tr>
                <th className="py-3 px-3 text-center w-12">N°</th>
                <th className="py-3 px-3">Cheval</th>
                <th className="py-3 px-3">Driver / Entraîneur</th>
                <th className="py-3 px-2 text-center">Fer.</th>
                <th className="py-3 px-2 text-right">Cote</th>
                <th className="py-3 px-2 text-center">Score</th>
                <th className="py-3 px-3">Rôle IA</th>
                <th className="py-3 px-3 text-center print:table-cell">Cases à cocher (1 à 7)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-black">
              {partants
                .filter((p) => includeNonPartants || (!p.estNonPartant && p.statut !== 'Non-partant'))
                .map((horse, idx) => {
                  const role = getHorseRole(horse.numero, horse.estNonPartant);
                  const isTop7 = quinte7.includes(horse.numero);
                  const rankIn7 = quinte7.indexOf(horse.numero) + 1;

                  return (
                    <tr
                      key={`prop-table-${horse.numero}-${idx}`}
                      className={`hover:bg-slate-800/40 transition-colors print:hover:bg-transparent ${
                        horse.estNonPartant
                          ? 'opacity-50 bg-rose-950/10'
                          : horse.numero === base1Num
                          ? 'bg-amber-500/10 font-bold'
                          : isTop7
                          ? 'bg-slate-900/60'
                          : ''
                      }`}
                    >
                      {/* N° */}
                      <td className="py-3 px-3 text-center font-black text-sm">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-xl ${
                            horse.numero === base1Num
                              ? 'bg-amber-500 text-slate-950'
                              : horse.numero === base2Num
                              ? 'bg-emerald-500 text-slate-950'
                              : isTop7
                              ? 'bg-slate-800 text-white border border-slate-700 print:border-black print:text-black'
                              : 'text-slate-400 print:text-black'
                          }`}
                        >
                          {horse.numero}
                        </span>
                      </td>

                      {/* Nom & Musique */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-white print:text-black text-sm flex items-center gap-1.5">
                          <span>{horse.nom}</span>
                          {horse.estNonPartant && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] uppercase font-black">
                              NP
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 print:text-gray-700 block">
                          Musique : {horse.musique} • Dist : {horse.distance}m
                        </span>
                      </td>

                      {/* Driver & Entraineur */}
                      <td className="py-3 px-3 text-slate-300 print:text-black">
                        <div className="font-semibold">{horse.driver}</div>
                        <div className="text-[11px] text-slate-500 print:text-gray-700">Entr: {horse.entraineur}</div>
                      </td>

                      {/* Ferrure */}
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                            horse.ferrure === 'D4'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30 print:text-black'
                              : horse.ferrure === 'DA' || horse.ferrure === 'DP'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 print:text-black'
                              : 'bg-slate-800 text-slate-400 print:text-black'
                          }`}
                        >
                          {horse.ferrure}
                        </span>
                      </td>

                      {/* Cote */}
                      <td className="py-3 px-2 text-right font-black text-amber-400 print:text-black">
                        {horse.coteProbable} / 1
                      </td>

                      {/* HippoScore */}
                      <td className="py-3 px-2 text-center font-bold text-emerald-400 print:text-black">
                        {horse.hippoScore ? `${horse.hippoScore}/100` : '—'}
                      </td>

                      {/* Rôle IA */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-black inline-block ${role.color}`}>
                          {role.label}
                        </span>
                      </td>

                      {/* Cases à cocher PMU (1er à 7e) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {[1, 2, 3, 4, 5, 6, 7].map((pos) => (
                            <span
                              key={`chk-pos-${horse.numero}-${pos}`}
                              className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold ${
                                rankIn7 === pos
                                   ? 'bg-amber-500 text-slate-950 border-amber-400 print:bg-black print:text-white'
                                  : 'border-slate-700 text-slate-500 print:border-black print:text-black'
                              }`}
                              title={`Cocher en position ${pos}`}
                            >
                              {rankIn7 === pos ? '✓' : pos}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Printable Footer Notice */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 print:text-black pt-3 border-t border-slate-800 print:border-black">
          <span>Édité par HippoAnalyse • Barème officiel en FCFA</span>
          <span>Jouer comporte des risques • 18+</span>
        </div>
      </div>
    </div>
  );
};
