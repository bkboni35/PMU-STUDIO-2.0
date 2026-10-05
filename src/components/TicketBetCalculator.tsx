import React, { useState } from 'react';
import { Calculator, Ticket, Copy, Check, Sparkles, RefreshCw, AlertCircle, Coins, ShieldCheck } from 'lucide-react';
import {
  calculerCoutTicket,
  CHEVAUX_REQUIS,
  PRIX_UNITAIRES_FCFA,
  formatFCFA,
} from '../utils/turfCalculations';
import { CourseHippique } from '../types/turf';

interface TicketBetCalculatorProps {
  course: CourseHippique;
  selectedHorses: number[];
  onSelectHorses: (numbers: number[]) => void;
  onClearHorses: () => void;
}

type BetType =
  | 'Simple Gagnant'
  | 'Simple Placé'
  | 'Couplé Gagnant'
  | 'Couplé Placé'
  | '2 sur 4'
  | 'Trio'
  | 'Tiercé'
  | 'Quarté+'
  | 'Quinté+'
  | 'Pick 5'
  | 'Multi 4'
  | 'Multi 5'
  | 'Multi 6'
  | 'Multi 7';

export const TicketBetCalculator: React.FC<TicketBetCalculatorProps> = ({
  course,
  selectedHorses,
  onSelectHorses,
  onClearHorses,
}) => {
  if (!course) return null;
  const [betType, setBetType] = useState<BetType>('Quinté+');
  const [formule, setFormule] = useState<'Combiné' | 'Champ Réduit'>('Combiné');
  const [flexi, setFlexi] = useState<100 | 50 | 25>(100);
  const [bases, setBases] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  // Available bet types covering all games
  const betTypes: BetType[] = [
    'Quinté+',
    'Quarté+',
    'Tiercé',
    'Pick 5',
    'Trio',
    'Couplé Gagnant',
    'Couplé Placé',
    '2 sur 4',
    'Multi 4',
    'Multi 5',
    'Multi 6',
    'Multi 7',
    'Simple Gagnant',
    'Simple Placé',
  ];

  // Calcul du coût en FCFA
  const associes = (selectedHorses || []).filter((h) => !(bases || []).includes(h));
  const { coutTotal, nombreCombinaisons, coutFCFAFormate } = calculerCoutTicket(
    betType,
    formule,
    formule === 'Champ Réduit' ? bases : (selectedHorses || []),
    associes,
    flexi
  );

  const unitPrice = PRIX_UNITAIRES_FCFA[betType] || 300;

  const handleInjectSynthese = () => {
    if (course.synthese?.selection8) {
      onSelectHorses(course.synthese.selection8);
      if (formule === 'Champ Réduit') {
        setBases([course.synthese.baseIncontournable, course.synthese.secondeBase].filter(Boolean));
      }
    }
  };

  const handleToggleBase = (num: number) => {
    if (bases.includes(num)) {
      setBases(bases.filter((b) => b !== num));
    } else {
      const requis = CHEVAUX_REQUIS[betType] || 5;
      if (bases.length < requis - 1) {
        setBases([...bases, num]);
      }
    }
  };

  const handleCopyTicket = () => {
    const text = `[HippoAnalyse] Ticket ${course.reunion || 'R1'} ${course.course || 'C1'} - ${course.hippodrome} (${course.titre})\nType: ${betType} ${formule} (Flexi ${flexi}%)\nMise minimale unitaire: ${formatFCFA(unitPrice)}\n${
      formule === 'Champ Réduit'
        ? `${bases.join(' - ')} | Associés: ${associes.join(' - ')}`
        : `Chevaux: ${selectedHorses.join(' - ')}`
    }\nCombinaisons: ${nombreCombinaisons} | Coût Total: ${coutFCFAFormate}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requis = CHEVAUX_REQUIS[betType] || 5;

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Calculateur de Tickets & Mises en FCFA
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                FCFA Officiel
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tiercé/Quarté/Quinté (300 F) · Tous Multi (350 F) · Pick 5 / Trio (400 F) · Couplés / Simple (500 F)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInjectSynthese}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Charger la sélection ({course.synthese?.selection8?.length || 8})</span>
          </button>

          {selectedHorses.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClearHorses();
                setBases([]);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Bet Type Selection */}
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-2">
          1. Choisissez le type de pari :
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {betTypes.map((type) => {
            const isSelected = betType === type;
            const prixMin = PRIX_UNITAIRES_FCFA[type] || 300;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setBetType(type);
                  setBases([]);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl text-xs font-bold transition-all border text-center ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="truncate max-w-[100px]">{type}</span>
                <span
                  className={`text-[10px] mt-0.5 font-semibold ${
                    isSelected ? 'text-slate-900 font-extrabold' : 'text-amber-400'
                  }`}
                >
                  {formatFCFA(prixMin)} / mise
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formula & Flexi Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Formule */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">
            2. Formule de jeu :
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['Combiné', 'Champ Réduit'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormule(f)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  formule === f
                    ? 'bg-slate-800 text-amber-300 border-amber-500/50 shadow-inner'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Flexi */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">
            3. Option Flexi :
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([100, 50, 25] as const).map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setFlexi(rate)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                  flexi === rate
                    ? 'bg-slate-800 text-amber-300 border-amber-500/50 shadow-inner'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                {rate === 100 ? '100% (Plein)' : `${rate}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Horses Selection */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300">
            {formule === 'Champ Réduit'
              ? `Sélectionnez vos Bases (max ${requis - 1}) et vos Associés :`
              : `Sélectionnez au moins ${requis} chevaux (${selectedHorses.length} choisis) :`}
          </label>
          <span className="text-[11px] text-amber-400 font-semibold">
            Mise unitaire : {formatFCFA(unitPrice)}
          </span>
        </div>

        {selectedHorses.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            Aucun cheval sélectionné. Cliquez sur "Charger la sélection" ou cochez les numéros ci-dessous.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedHorses.map((num, idx) => {
              const isBase = bases.includes(num);
              return (
                <div
                  key={`calc-sel-${num}-${idx}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isBase
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                >
                  <span>N°{num}</span>
                  {formule === 'Champ Réduit' && (
                    <button
                      type="button"
                      onClick={() => handleToggleBase(num)}
                      className={`text-[10px] px-1.5 py-0.5 rounded ml-1 transition-colors ${
                        isBase
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={isBase ? 'Retirer de la base' : 'Définir comme base'}
                    >
                      {isBase ? 'BASE' : 'associer'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick runner selector toggle chips */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 block mb-2">
            Ajouter ou retirer un partant en 1 clic :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {course.partants?.map((p, idx) => {
              const isChecked = selectedHorses.includes(p.numero);
              return (
                <button
                  key={`calc-quick-${p.numero}-${idx}`}
                  type="button"
                  onClick={() => {
                    if (isChecked) {
                      onSelectHorses(selectedHorses.filter((h) => h !== p.numero));
                      setBases(bases.filter((b) => b !== p.numero));
                    } else {
                      onSelectHorses([...selectedHorses, p.numero].sort((a, b) => a - b));
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isChecked
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                  title={`${p.nom} (Cote ${p.coteProbable}/1)`}
                >
                  <span>{p.numero}</span>
                  <span className="text-[10px] font-normal truncate max-w-[70px] hidden sm:inline opacity-80">
                    {p.nom}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Result Cost Banner in FCFA */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-950 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Coût total officiel du ticket en FCFA</span>
          </span>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="text-3xl font-black text-white tracking-tight">
              {coutFCFAFormate}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({nombreCombinaisons} combinaison{nombreCombinaisons > 1 ? 's' : ''} à {formatFCFA(unitPrice)})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyTicket}
          disabled={nombreCombinaisons === 0}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-slate-950" />
              <span>Ticket copié en FCFA !</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-950" />
              <span>Copier le Ticket (FCFA)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
