import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Trophy,
  ShieldCheck,
  Flame,
  Crown,
  Zap,
  Target,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  DollarSign,
  Coins,
  FileText,
  Percent,
  Medal,
  Award,
  Gauge,
  Activity,
  Scale,
  Info,
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { computeV38Hierarchy, getHorseGenyOdds } from '../utils/v38Helper';
import { calculerPotentielTrio } from '../utils/scoreTrioModel';
import { scrollToTopInstant } from '../utils/scrollHelper';

interface PronosticsDeJeuViewProps {
  course: CourseHippique;
  selectedHorseNumbers?: number[];
  onSelectHorseForTicket?: (numero: number) => void;
  onOpenMusiqueDecoder?: (musique: string, nom: string) => void;
}

export const PronosticsDeJeuView: React.FC<PronosticsDeJeuViewProps> = ({
  course,
  selectedHorseNumbers = [],
  onSelectHorseForTicket,
  onOpenMusiqueDecoder,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  React.useEffect(() => {
    scrollToTopInstant();
  }, [course?.sourceUrl]);

  // Filtrer les partants actifs
  const activePartants = useMemo(() => {
    return (course.partants || []).filter(
      (p) => !p.estNonPartant && p.statut !== 'Non-partant'
    );
  }, [course.partants]);

  // V38 pour extraire tocards et surprises de manière déterministe
  const v38 = useMemo(() => {
    return computeV38Hierarchy(course);
  }, [course]);

  // Helper pour récupérer la cote numérique fiable
  const getCote = (p: Partant): number => {
    return getHorseGenyOdds(p);
  };

  // =========================================================================
  // 1. BASE DE JEU : Chevaux ayant une cote inférieure ou égale à 4,9
  // =========================================================================
  const baseDeJeuPartants = useMemo(() => {
    return activePartants
      .filter((p) => {
        const c = getCote(p);
        return c > 0 && c <= 4.9;
      })
      .sort((a, b) => getCote(a) - getCote(b));
  }, [activePartants]);

  // Si aucun cheval n'a de cote <= 4.9 (course hyper ouverte), identifier le favori du marché
  const alternativeBase = useMemo(() => {
    if (baseDeJeuPartants.length > 0) return null;
    return [...activePartants].sort((a, b) => getCote(a) - getCote(b))[0] || null;
  }, [activePartants, baseDeJeuPartants]);

  // =========================================================================
  // 2. TOP 8 : Les 8 premiers numéros de la sélection de l'analyse
  // =========================================================================
  const top8Nums = useMemo((): number[] => {
    const rawSel = course.synthese?.selection8 || (v38.selectionV38 || []).map((p) => Number(p.numero));
    const validNums = activePartants.map((p) => p.numero);
    const filtered = rawSel.filter((n) => validNums.includes(n));

    if (filtered.length >= 8) {
      return filtered.slice(0, 8);
    }
    // Compléter si nécessaire avec le reste de la hiérarchie V38
    const setNums = new Set(filtered);
    for (const p of v38.selectionV38 || activePartants) {
      if (!setNums.has(p.numero)) {
        setNums.add(p.numero);
        if (setNums.size === 8) break;
      }
    }
    return Array.from(setNums).slice(0, 8);
  }, [course.synthese?.selection8, v38, activePartants]);

  const top8Partants = useMemo(() => {
    return top8Nums
      .map((num) => activePartants.find((p) => p.numero === num))
      .filter((p): p is Partant => Boolean(p));
  }, [top8Nums, activePartants]);

  // =========================================================================
  // 3. GROS RAPPORT : Le 3e numéro des TOCARDS et les 3 premiers numéros des SURPRISES (au plus 4 numéros)
  // =========================================================================
  const grosRapportData = useMemo(() => {
    // Tocards : priorité à synthese.tocards puis v38.tocardsSpeculatifs
    const rawTocardNums: number[] = (course.synthese?.tocards && course.synthese.tocards.length > 0)
      ? course.synthese.tocards
      : (v38.tocardsSpeculatifs || []).map((p) => Number(p.numero));

    // Surprises : priorité à synthese.surprises puis v38.surprises
    const rawSurpriseNums: number[] = (course.synthese?.surprises && course.synthese.surprises.length > 0)
      ? course.synthese.surprises
      : (v38.surprises || []).map((p) => Number(p.numero));

    // 3e numéro des tocards (index 2 dans un tableau 0-indexé)
    const tocard3Num = rawTocardNums.length >= 3
      ? rawTocardNums[2]
      : rawTocardNums.length > 0
      ? rawTocardNums[rawTocardNums.length - 1]
      : null;

    // 3 premiers numéros des surprises
    const surprise3Nums = rawSurpriseNums.slice(0, 3);

    // Construction de la liste finale (au plus 4 numéros)
    const items: { numero: number; provenance: string; role: string; partant?: Partant }[] = [];

    if (tocard3Num !== null) {
      const p = activePartants.find((pt) => pt.numero === tocard3Num);
      items.push({
        numero: tocard3Num,
        provenance: '3e numéro des TOCARDS',
        role: 'Tocard à forte cote',
        partant: p,
      });
    }

    surprise3Nums.forEach((sNum, sIdx) => {
      if (!items.some((it) => it.numero === sNum) && items.length < 4) {
        const p = activePartants.find((pt) => pt.numero === sNum);
        items.push({
          numero: sNum,
          provenance: `${sIdx + 1}${sIdx === 0 ? 're' : 'e'} SURPRISE`,
          role: 'Surprise spéculative',
          partant: p,
        });
      }
    });

    return {
      tocard3Num,
      surprise3Nums,
      items: items.slice(0, 4),
      numbers: items.map((it) => it.numero).slice(0, 4),
    };
  }, [course.synthese?.tocards, course.synthese?.surprises, v38, activePartants]);

  // =========================================================================
  // 4. SCORE POTENTIEL TRIO (TOP 3) : Formule 0,30*F + 0,20*A + 0,15*N + 0,15*P + 0,10*C + 0,10*R
  // =========================================================================
  const trioData = useMemo(() => {
    return calculerPotentielTrio(course);
  }, [course]);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-slate-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/50 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Grille Stratégique Officielle</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              PRONOSTICS DE JEU
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Plan de jeu condensé en 3 piliers essentiels pour vos paris : la <strong className="text-emerald-400">Base de Jeu</strong> (côte ≤ 4,9), le <strong className="text-amber-400">TOP 8</strong> de l'analyse, et les <strong className="text-purple-400">Gros Rapports</strong> (3e Tocard + 3 Surprises, max 4 numéros).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-3 text-center">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Course</div>
              <div className="text-sm font-black text-white">{course.reunion} {course.course}</div>
              <div className="text-[11px] text-amber-400 font-bold">{course.hippodrome}</div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-3 text-center">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Discipline</div>
              <div className="text-sm font-black text-white">{course.discipline}</div>
              <div className="text-[11px] text-slate-400 font-bold">{course.distance}m</div>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé Visuel Rapide des 3 Piliers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pilier 1 : Base de Jeu */}
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PILIER 1</span>
            </span>
            <span className="text-[11px] text-slate-400 font-bold">Cote ≤ 4,9</span>
          </div>
          <div className="text-base font-black text-white">BASE DE JEU</div>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            {baseDeJeuPartants.length > 0 ? (
              baseDeJeuPartants.map((p) => {
                const cote = getCote(p);
                return (
                  <div key={`quick-base-${p.numero}`} className="flex flex-col items-center">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black text-base flex items-center justify-center shadow-md shadow-emerald-500/20">
                      {p.numero}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold mt-0.5">{cote > 0 ? `${cote}/1` : '-'}</span>
                  </div>
                );
              })
            ) : alternativeBase ? (
              <div className="flex flex-col items-center">
                <span className="w-9 h-9 rounded-xl bg-slate-800 border border-amber-500/50 text-amber-300 font-black text-base flex items-center justify-center">
                  {alternativeBase.numero}
                </span>
                <span className="text-[10px] text-amber-300 font-bold mt-0.5">{getCote(alternativeBase)}/1</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Aucune base &le; 4.9</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            {baseDeJeuPartants.length > 0
              ? `${baseDeJeuPartants.length} partant(s) certifié(s) avec une cote &le; 4,9.`
              : 'Course ouverte : favori alternatif sans cote &le; 4,9.'}
          </p>
        </div>

        {/* Pilier 2 : TOP 8 */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              <span>PILIER 2</span>
            </span>
            <span className="text-[11px] text-slate-400 font-bold">8 Partants</span>
          </div>
          <div className="text-base font-black text-white">TOP 8 SÉLECTION</div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {top8Nums.map((num) => {
              const p = activePartants.find((pt) => pt.numero === num);
              const cote = p ? getCote(p) : 0;
              return (
                <div key={`quick-top8-${num}`} className="flex flex-col items-center">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-xs">
                    {num}
                  </span>
                  <span className="text-[9px] text-amber-300 font-bold mt-0.5">{cote > 0 ? `${cote}` : '-'}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Les 8 premiers numéros dans l'ordre préférentiel de l'analyse officielle.
          </p>
        </div>

        {/* Pilier 3 : Gros Rapport */}
        <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>PILIER 3</span>
            </span>
            <span className="text-[11px] text-slate-400 font-bold">Max 4 Numéros</span>
          </div>
          <div className="text-base font-black text-white">GROS RAPPORT</div>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            {grosRapportData.items.length > 0 ? (
              grosRapportData.items.map((item) => {
                const cote = item.partant ? getCote(item.partant) : 25;
                return (
                  <div key={`quick-gros-${item.numero}`} className="flex flex-col items-center">
                    <span className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-purple-500/20 border border-purple-400">
                      {item.numero}
                    </span>
                    <span className="text-[10px] text-purple-300 font-bold mt-0.5">{cote}/1</span>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 italic">Données en cours de calcul</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            3e Tocard + 3 premières Surprises pour faire exploser les rapports.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 : BASE DE JEU (COTES <= 4.9)                                    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/95 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  BASE DE JEU
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950">
                  Règle stricte : Côte ≤ 4,9
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Concurrents du peloton bénéficiant du soutien massif des parieurs et d'une espérance mathématique supérieure.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {baseDeJeuPartants.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    baseDeJeuPartants.map((p) => p.numero).join(' - '),
                    'base'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold transition-all border border-emerald-500/30"
              >
                {copiedSection === 'base' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'base' ? 'Copié !' : 'Copier Bases'}</span>
              </button>
            )}

            {onSelectHorseForTicket && baseDeJeuPartants.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  baseDeJeuPartants.forEach((p) => onSelectHorseForTicket(p.numero));
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Charger au Ticket</span>
              </button>
            )}
          </div>
        </div>

        {/* Affichage des Partants Base de Jeu */}
        {baseDeJeuPartants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {baseDeJeuPartants.map((partant, idx) => {
              const cote = getCote(partant);
              const isSelected = selectedHorseNumbers.includes(partant.numero);

              return (
                <div
                  key={`base-card-${partant.numero}`}
                  className={`bg-slate-950/90 border rounded-2xl p-4.5 space-y-3 transition-all hover:border-emerald-500/60 ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-400/30 bg-emerald-950/10'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-md shadow-emerald-500/20 shrink-0">
                        <span className="text-xl leading-none">{partant.numero}</span>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-900">
                          Base #{idx + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-white text-base leading-tight">
                          {partant.nom}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {partant.driver} {partant.ferrure ? `• ${partant.ferrure}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/40">
                        {cote}/1
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-slate-850">
                    <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center">
                      <div className="text-slate-400">HippoScore</div>
                      <div className="font-black text-amber-400 text-xs mt-0.5">
                        {partant.hippoScore || 85}/100
                      </div>
                    </div>
                    <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center">
                      <div className="text-slate-400">Musique</div>
                      <div className="font-mono text-white text-[11px] font-bold mt-0.5 truncate">
                        {onOpenMusiqueDecoder && partant.musique && partant.musique !== '?' && partant.musique !== 'Inconnu' && partant.musique.trim() !== '' ? (
                          <button
                            type="button"
                            onClick={() => onOpenMusiqueDecoder(partant.musique, partant.nom)}
                            className="text-amber-300 hover:text-amber-200 underline cursor-pointer font-mono"
                            title="Cliquez pour décrypter cette musique"
                          >
                            {partant.musique}
                          </button>
                        ) : (
                          partant.musique || 'Régulière'
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center">
                      <div className="text-slate-400">Statut</div>
                      <div className="font-black text-emerald-400 text-[10px] mt-0.5">
                        Base Incont.
                      </div>
                    </div>
                  </div>

                  {onSelectHorseForTicket && (
                    <button
                      type="button"
                      onClick={() => onSelectHorseForTicket(partant.numero)}
                      className={`w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Sélectionné dans le ticket' : 'Ajouter au ticket'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">
                  Aucun partant avec une cote inférieure ou égale à 4,9
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cette épreuve est particulièrement ouverte : les enjeux sont largement disséminés et aucun favori écrasant n'est proposé sous la barre des 4,9/1.
                </p>
                {alternativeBase && (
                  <div className="mt-2 p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                        {alternativeBase.numero}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">
                          {alternativeBase.nom} (Favori du marché par défaut)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Cote la plus basse constatée : {getCote(alternativeBase)}/1
                        </div>
                      </div>
                    </div>
                    {onSelectHorseForTicket && (
                      <button
                        type="button"
                        onClick={() => onSelectHorseForTicket(alternativeBase.numero)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
                      >
                        Sélectionner
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 : TOP 8 (LES 8 PREMIERS NUMÉROS DE LA SÉLECTION)                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
              <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  TOP 8 SÉLECTION DE L'ANALYSE
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                  8 Premiers Numéros
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Les 8 concurrents incontournables classés par ordre préférentiel de compétitivité pour le Quinté+.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => copyToClipboard(top8Nums.join(' - '), 'top8')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all border border-amber-500/30"
            >
              {copiedSection === 'top8' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'top8' ? 'Copié !' : 'Copier TOP 8'}</span>
            </button>

            {onSelectHorseForTicket && (
              <button
                type="button"
                onClick={() => {
                  top8Nums.forEach((num) => onSelectHorseForTicket(num));
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Charger les 8 au Ticket</span>
              </button>
            )}
          </div>
        </div>

        {/* Ruban combiné express */}
        <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold uppercase text-amber-400 tracking-wider">
              Combinaison Quinté+ :
            </span>
            <span className="font-mono font-black text-white text-base sm:text-lg tracking-wider">
              {top8Nums.join(' - ')}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            Formule Quinté+ combiné Flexi 8 chevaux (56 combinaisons)
          </div>
        </div>

        {/* Grille détaillée des 8 partants */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {top8Partants.map((partant, idx) => {
            const cote = getCote(partant);
            const isSelected = selectedHorseNumbers.includes(partant.numero);
            const isBase = idx < 2;

            return (
              <div
                key={`top8-p-${partant.numero}`}
                className={`bg-slate-950/90 border rounded-2xl p-4 space-y-2.5 transition-all ${
                  isBase
                    ? 'border-amber-500/60 bg-gradient-to-b from-amber-500/5 to-slate-950'
                    : 'border-slate-800'
                } ${isSelected ? 'ring-2 ring-amber-400/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isBase
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {partant.numero}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white truncate max-w-[120px]">
                        {partant.nom}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Rang #{idx + 1} {isBase ? '• Base' : ''}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-black text-amber-400">
                    {cote}/1
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 truncate">
                  {partant.driver} {partant.ferrure ? `(${partant.ferrure})` : ''}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-850">
                  <span>Score : <strong className="text-amber-300">{partant.hippoScore || 75}/100</strong></span>
                  <span>
                    {onOpenMusiqueDecoder && partant.musique && partant.musique !== '?' && partant.musique !== 'Inconnu' && partant.musique.trim() !== '' ? (
                      <button
                        type="button"
                        onClick={() => onOpenMusiqueDecoder(partant.musique, partant.nom)}
                        className="text-amber-300 hover:text-amber-200 underline cursor-pointer font-mono text-[10px]"
                        title="Cliquez pour décrypter cette musique"
                      >
                        {partant.musique}
                      </button>
                    ) : (
                      partant.musique || 'Régulier'
                    )}
                  </span>
                </div>

                {onSelectHorseForTicket && (
                  <button
                    type="button"
                    onClick={() => onSelectHorseForTicket(partant.numero)}
                    className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-750'
                    }`}
                  >
                    {isSelected ? '✓ Dans le ticket' : '+ Sélectionner'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3 : GROS RAPPORT (3e TOCARD + 3 PREMIÈRES SURPRISES)              */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/95 border-2 border-purple-500/40 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  GROS RAPPORT
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500 text-white">
                  Max 4 Numéros
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-purple-300 border border-purple-500/30">
                  3e Tocard + 3 Surprises
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sélection spéculative ciblée pour pimenter les gains et viser les gros rapports d'ordre et de désordre.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {grosRapportData.numbers.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    grosRapportData.numbers.join(' - '),
                    'gros-rapport'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold transition-all border border-purple-500/30"
              >
                {copiedSection === 'gros-rapport' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'gros-rapport' ? 'Copié !' : 'Copier Gros Rapport'}</span>
              </button>
            )}

            {onSelectHorseForTicket && grosRapportData.numbers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  grosRapportData.numbers.forEach((num) => onSelectHorseForTicket(num));
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-md shadow-purple-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Charger Gros Rapport</span>
              </button>
            )}
          </div>
        </div>

        {/* Détail des 4 numéros Gros Rapport */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {grosRapportData.items.map((item, idx) => {
            const partant = item.partant;
            const cote = partant ? getCote(partant) : 25;
            const isSelected = selectedHorseNumbers.includes(item.numero);

            return (
              <div
                key={`gros-item-${item.numero}-${idx}`}
                className={`bg-slate-950/90 border rounded-2xl p-4.5 space-y-3 transition-all hover:border-purple-500/60 ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-400/30 bg-purple-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex flex-col items-center justify-center font-black shadow-md shadow-purple-500/20 shrink-0 border border-purple-400/30">
                      <span className="text-xl leading-none">{item.numero}</span>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-purple-200">
                        N° Cheval
                      </span>
                    </div>

                    <div>
                      <div className="font-black text-white text-sm leading-tight truncate max-w-[130px]">
                        {partant?.nom || `Cheval N°${item.numero}`}
                      </div>
                      <div className="text-[10px] text-purple-300 font-extrabold mt-0.5">
                        {item.provenance}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/30">
                    {cote}/1
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  {partant?.driver ? (
                    <span><strong>Driver :</strong> {partant.driver} {partant.ferrure ? `(${partant.ferrure})` : ''}</span>
                  ) : (
                    <span>Spéculatif pour les combinaisons élargies</span>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
                  <span>Rôle : </span>
                  <span className="text-slate-200 font-bold">{item.role}</span>
                </div>

                {onSelectHorseForTicket && (
                  <button
                    type="button"
                    onClick={() => onSelectHorseForTicket(item.numero)}
                    className={`w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Sélectionné dans le ticket' : 'Ajouter au ticket'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Conseil Stratégique Gros Rapport */}
        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-slate-300">
              <strong>Conseil de jeu Gros Rapport :</strong> Associez les <strong className="text-white">{grosRapportData.numbers.length} numéros</strong> en bout de combinaison avec la <strong className="text-emerald-400">Base de Jeu</strong> pour viser les gros rapports en Quinté+, Multi et Couplé Ordre.
            </span>
          </div>

          <div className="font-mono font-black text-purple-300 text-sm whitespace-nowrap">
            {grosRapportData.numbers.join(' - ') || 'Aucun'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SCORE « POTENTIEL TRIO » (TOP 3) - FORMULE STRICTE                     */}
      {/* Score trio = 0,30 F + 0,20 A + 0,15 N + 0,15 P + 0,10 C + 0,10 R           */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900/90 border border-teal-500/40 p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 font-black shadow-lg shadow-teal-500/20 shrink-0">
              <Medal className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-black uppercase tracking-wider">
                  Modèle Probabiliste Top 3
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                  {trioData.tailleLot} partants → {trioData.nombreRetenus} retenus
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                4. SCORE « POTENTIEL TRIO » (TOP 3)
              </h3>
              <p className="text-xs text-slate-400">
                Optimisé pour la <strong className="text-teal-300">place sur le podium</strong> plutôt que la seule victoire : combine Forme (30%), Aptitude (20%), Niveau (15%), Profil/Pace (15%), Couple (10%) et Risque (10%).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            <button
              type="button"
              onClick={() => copyToClipboard(trioData.selectionTrio.map(s => s.partant.numero).join(' - '), 'trio-selection')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              {copiedSection === 'trio-selection' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Sélection Copiée !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier Sélection Trio ({trioData.nombreRetenus})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Formule & Structure du Trio */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
              <Crown className="w-4 h-4 shrink-0" />
              <span>Base Solide (Top 1)</span>
            </div>
            <div className="font-mono text-base font-black text-white">
              N°{trioData.base?.partant.numero || '—'} {trioData.base?.partant.nom}
            </div>
            <div className="text-[11px] text-slate-400">
              Score Trio : <strong className="text-emerald-300">{trioData.base?.scoreTrio}/100</strong> ({trioData.base?.probabiliteTop3}% Top 3)
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-sky-500/30 space-y-1">
            <div className="flex items-center gap-2 text-sky-400 font-black text-xs">
              <Target className="w-4 h-4 shrink-0" />
              <span>Challenger (Top 2)</span>
            </div>
            <div className="font-mono text-base font-black text-white">
              N°{trioData.challenger?.partant.numero || '—'} {trioData.challenger?.partant.nom}
            </div>
            <div className="text-[11px] text-slate-400">
              Score Trio : <strong className="text-sky-300">{trioData.challenger?.scoreTrio}/100</strong> ({trioData.challenger?.probabiliteTop3}% Top 3)
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-1">
            <div className="flex items-center gap-2 text-purple-400 font-black text-xs">
              <Flame className="w-4 h-4 shrink-0" />
              <span>Outsider Utile</span>
            </div>
            <div className="font-mono text-base font-black text-white">
              N°{trioData.outsiderUtile?.partant.numero || '—'} {trioData.outsiderUtile?.partant.nom}
            </div>
            <div className="text-[11px] text-slate-400">
              Cote : <strong className="text-purple-300">{trioData.outsiderUtile?.partant.coteProbable ?? 15}/1</strong> ({trioData.outsiderUtile?.profilDetecte.label})
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
              <Award className="w-4 h-4 shrink-0" />
              <span>Complément</span>
            </div>
            <div className="font-mono text-base font-black text-white">
              N°{trioData.complement?.partant.numero || '—'} {trioData.complement?.partant.nom}
            </div>
            <div className="text-[11px] text-slate-400">
              Appui pour champ réduit et combiné
            </div>
          </div>
        </div>

        {/* Bannière Déroulement & Rythme estimé */}
        <div className="p-3.5 rounded-2xl bg-teal-950/30 border border-teal-500/30 flex items-center gap-3 text-xs text-slate-300">
          <Activity className="w-4 h-4 text-teal-400 shrink-0" />
          <div>
            <strong className="text-teal-300">Analyse du rythme :</strong> {trioData.statistiquesModele.rythmeCourseEstime} (Indice de confiance Trio : <span className="text-white font-bold">{trioData.statistiquesModele.indiceConfianceTrio}%</span>)
          </div>
        </div>

        {/* Tableau des partants classés par Potentiel Trio */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="py-2.5 px-3">Rang</th>
                <th className="py-2.5 px-3">N° & Cheval</th>
                <th className="py-2.5 px-3">Cote</th>
                <th className="py-2.5 px-3 text-center">Score Trio (0-100)</th>
                <th className="py-2.5 px-3 text-center">Probabilité Top 3</th>
                <th className="py-2.5 px-3">Profil Détecté</th>
                <th className="py-2.5 px-3">Rôle Trio</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium">
              {trioData.selectionTrio.map((chevalScore) => {
                const p = chevalScore.partant;
                const isSelected = selectedHorseNumbers.includes(p.numero);

                return (
                  <tr
                    key={`trio-row-${p.numero}`}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      chevalScore.roleTrio === 'BASE' ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-black text-slate-300">
                      #{chevalScore.rangTrio}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-black text-xs flex items-center justify-center border border-slate-700">
                          {p.numero}
                        </span>
                        <div>
                          <strong className="text-white">{p.nom}</strong>
                          <div className="text-[10px] text-slate-400">{p.driver || p.entraineur || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-300 font-bold">
                      {p.coteProbable ? `${p.coteProbable}/1` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/20 text-teal-300 font-mono font-black border border-teal-500/30">
                        <span>{chevalScore.scoreTrio}</span>
                        <span className="text-[9px] text-teal-400 font-normal">/100</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono font-black text-emerald-400">
                        {chevalScore.probabiliteTop3}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${chevalScore.profilDetecte.badgeColor}`}>
                        {chevalScore.profilDetecte.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        chevalScore.roleTrio === 'BASE' ? 'bg-emerald-500 text-slate-950 font-black' :
                        chevalScore.roleTrio === 'CHALLENGER' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        chevalScore.roleTrio === 'OUTSIDER_UTILE' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {chevalScore.roleTrio}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {onSelectHorseForTicket && (
                        <button
                          type="button"
                          onClick={() => onSelectHorseForTicket(p.numero)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-teal-500 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? '✓' : '+ Ticket'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tickets Trio Recommandés */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Trio Direct */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase">Trio Direct (3 Ch.)</span>
              <span className="text-[10px] text-slate-400">1 combinaison</span>
            </div>
            <div className="text-lg font-mono font-black text-white">
              {trioData.tickets.trioDirect.join(' - ') || '—'}
            </div>
            <p className="text-[10px] text-slate-400">
              Formule économique : Base ({trioData.base?.partant.numero}) + Challenger ({trioData.challenger?.partant.numero}) + Outsider utile.
            </p>
          </div>

          {/* Trio Champ Réduit */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-400 uppercase">Champ Réduit</span>
              <span className="text-[10px] text-slate-400">{trioData.tickets.champReduit.combinaisonsCount} comb.</span>
            </div>
            <div className="text-sm font-mono font-black text-white">
              Bases : <span className="text-teal-300">{trioData.tickets.champReduit.bases.join('-')}</span> X <span className="text-slate-300">{trioData.tickets.champReduit.associes.join('-')}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Couvre le podium autour des 2 bases fiables associées aux autres chevaux retenus.
            </p>
          </div>

          {/* Trio Combiné */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-400 uppercase">Trio Combiné ({trioData.nombreRetenus} Ch.)</span>
              <span className="text-[10px] text-slate-400">{trioData.tickets.combine.combinaisonsCount} comb.</span>
            </div>
            <div className="text-sm font-mono font-black text-white">
              {trioData.tickets.combine.chevaux.join(' - ')}
            </div>
            <p className="text-[10px] text-slate-400">
              Sécurise 100% des combinaisons possibles parmi les {trioData.nombreRetenus} meilleurs scores Trio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
