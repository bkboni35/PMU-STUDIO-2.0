import React, { useState } from 'react';
import { CourseHippique } from '../types/turf';
import { computeQuinteOrdres } from '../utils/geminiMultiModelEngine';
import { Trophy, Sparkles, Check, Copy, ArrowRight, ShieldCheck, Zap, Brain, Target, Award } from 'lucide-react';

interface QuinteOrdresSectionProps {
  course: CourseHippique;
  onSelectHorsesForTicket?: (horseNumbers: number[]) => void;
  selectedHorseNumbers?: number[];
  className?: string;
}

export const QuinteOrdresSection: React.FC<QuinteOrdresSectionProps> = ({
  course,
  onSelectHorsesForTicket,
  selectedHorseNumbers = [],
  className = '',
}) => {
  if (!course) return null;
  const [copiedProbable, setCopiedProbable] = useState(false);
  const [copiedPossible, setCopiedPossible] = useState(false);

  const ordres = computeQuinteOrdres(course);
  const ordreProbable = course.synthese?.ordreProbable || ordres.ordreProbable;
  const ordrePossible = course.synthese?.ordrePossible || ordres.ordrePossible;
  const explicationProbable = course.synthese?.ordreProbableExplication || ordres.ordreProbableExplication;
  const explicationPossible = course.synthese?.ordrePossibleExplication || ordres.ordrePossibleExplication;

  const partants = course.partants || [];
  const findPartant = (num: number) => partants.find((p) => p.numero === num);

  const handleCopy = (nums: number[], setCopied: React.Dispatch<React.SetStateAction<boolean>>) => {
    const text = nums.join(' - ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getHorseRoleBadge = (num: number) => {
    const synthese = course.synthese;
    if (synthese?.baseIncontournable === num) {
      return { label: '', bg: 'bg-emerald-500 text-slate-950 font-black' };
    }
    if (synthese?.secondeBase === num) {
      return { label: '', bg: 'bg-sky-500 text-slate-950 font-black' };
    }
    if (synthese?.chances?.includes(num)) {
      return { label: 'CHANCE', bg: 'bg-yellow-400 text-slate-950 font-black' };
    }
    if (synthese?.outsiders?.includes(num)) {
      return { label: 'OUTSIDER', bg: 'bg-orange-500 text-white font-black' };
    }
    if (synthese?.tocards?.includes(num)) {
      return { label: 'TOCARD', bg: 'bg-rose-500 text-white font-black' };
    }
    return { label: 'PARTANT', bg: 'bg-slate-700 text-white font-bold' };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header du bloc d'ordre avec consensus multi-IA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
            <Trophy className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase print-consensus-title">
                DÉDUCTION DE L'ORDRE QUINTÉ+ <span className="text-amber-400">· CONSENSUS MULTI-IA</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Arbitrage Validé
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Arbitre Suprême : <strong>Gemini 3.1 Pro</strong> (🧠 Expert)</span>
              <span>·</span>
              <span>Stratège : <strong>Gemini 3.8 Flash</strong> (⚡ Analyse)</span>
              <span>·</span>
              <span>Simulation : <strong>Gemini 2.5 Pro</strong> (🧠 Approfondie)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 self-start md:self-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Top 5 Ordonné : Probable & Possible</span>
        </div>
      </div>

      {/* Grid 2 colonnes : Ordre Probable vs Ordre Possible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CARTE 1 : ORDRE PROBABLE (Top consensus régularité et solidité) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border-2 border-emerald-500/60 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Header Carte Probable */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm">
                  1er au 5e
                </span>
                <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-tight print-card-title">
                  ORDRE PROBABLE <span className="text-emerald-400">(SÉCURISÉ)</span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(ordreProbable, setCopiedProbable)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
                  title="Copier la combinaison ordonnée"
                >
                  {copiedProbable ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                  <span>{copiedProbable ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Alignement des 5 chevaux dans l'ordre */}
            <div className="my-4 space-y-2">
              <div className="grid grid-cols-5 gap-2">
                {ordreProbable.map((num, idx) => {
                  const horse = findPartant(num);
                  const role = getHorseRoleBadge(num);
                  const posLabels = ['1er', '2e', '3e', '4e', '5e'];
                  const posColors = [
                    'bg-amber-400 text-slate-950 border-amber-300',
                    'bg-slate-300 text-slate-950 border-slate-200',
                    'bg-amber-700 text-white border-amber-600',
                    'bg-blue-600 text-white border-blue-500',
                    'bg-indigo-600 text-white border-indigo-500',
                  ];

                  return (
                    <div
                      key={`prob-${num}-${idx}`}
                      className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-950 border border-slate-800/80 shadow-inner group hover:border-emerald-500/50 transition-all"
                    >
                      {/* Badge position */}
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black uppercase mb-1 border ${posColors[idx]}`}>
                        {posLabels[idx]}
                      </span>

                      {/* Numéro du cheval */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-slate-950 font-mono font-black text-base sm:text-lg flex items-center justify-center shadow-md print-selection-number">
                        {num}
                      </div>

                      {/* Nom du cheval */}
                      <div className="text-[11px] font-black text-white truncate max-w-full mt-1.5" title={horse?.nom}>
                        {horse?.nom || `N°${num}`}
                      </div>

                      {/* Rôle & Cote */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`px-1 py-0.2 rounded text-[8px] uppercase ${role.bg}`}>
                          {role.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                        {horse?.coteProbable ? `${horse.coteProbable}/1` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explication experte */}
            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              💡 <strong>Lecture IA :</strong> {explicationProbable}
            </p>
          </div>

          {/* Action : Cocher les 5 chevaux pour le ticket */}
          {onSelectHorsesForTicket && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Ticket Quinté unitaire : <strong>{ordreProbable.join(' - ')}</strong>
              </span>
              <button
                type="button"
                onClick={() => onSelectHorsesForTicket(ordreProbable)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Jouer ces 5 chevaux</span>
              </button>
            </div>
          )}
        </div>

        {/* CARTE 2 : ORDRE POSSIBLE (Alternative spéculative / Gros Rapports) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border-2 border-orange-500/60 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Header Carte Possible */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm">
                  1er au 5e
                </span>
                <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-tight print-card-title">
                  ORDRE POSSIBLE <span className="text-orange-400">(SPÉCULATIF)</span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(ordrePossible, setCopiedPossible)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
                  title="Copier la combinaison ordonnée"
                >
                  {copiedPossible ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                  <span>{copiedPossible ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Alignement des 5 chevaux dans l'ordre alternatif */}
            <div className="my-4 space-y-2">
              <div className="grid grid-cols-5 gap-2">
                {ordrePossible.map((num, idx) => {
                  const horse = findPartant(num);
                  const role = getHorseRoleBadge(num);
                  const posLabels = ['1er', '2e', '3e', '4e', '5e'];
                  const posColors = [
                    'bg-orange-500 text-slate-950 border-orange-400',
                    'bg-amber-400 text-slate-950 border-amber-300',
                    'bg-slate-300 text-slate-950 border-slate-200',
                    'bg-yellow-500 text-slate-950 border-yellow-400',
                    'bg-rose-500 text-white border-rose-400',
                  ];

                  return (
                    <div
                      key={`poss-${num}-${idx}`}
                      className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-950 border border-slate-800/80 shadow-inner group hover:border-orange-500/50 transition-all"
                    >
                      {/* Badge position */}
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black uppercase mb-1 border ${posColors[idx]}`}>
                        {posLabels[idx]}
                      </span>

                      {/* Numéro du cheval */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 font-mono font-black text-base sm:text-lg flex items-center justify-center shadow-md print-selection-number">
                        {num}
                      </div>

                      {/* Nom du cheval */}
                      <div className="text-[11px] font-black text-white truncate max-w-full mt-1.5" title={horse?.nom}>
                        {horse?.nom || `N°${num}`}
                      </div>

                      {/* Rôle & Cote */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`px-1 py-0.2 rounded text-[8px] uppercase ${role.bg}`}>
                          {role.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-orange-400 font-bold mt-0.5">
                        {horse?.coteProbable ? `${horse.coteProbable}/1` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explication experte */}
            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              🎯 <strong>Stratégie Rendement :</strong> {explicationPossible}
            </p>
          </div>

          {/* Action : Cocher les 5 chevaux pour le ticket */}
          {onSelectHorsesForTicket && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Ticket Quinté spéculatif : <strong>{ordrePossible.join(' - ')}</strong>
              </span>
              <button
                type="button"
                onClick={() => onSelectHorsesForTicket(ordrePossible)}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Jouer cette alternative</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
