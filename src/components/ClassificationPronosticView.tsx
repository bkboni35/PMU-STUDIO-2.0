import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  ShieldCheck,
  Flame,
  Star,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Download,
  Target,
  FileSpreadsheet,
  FileDown,
  Info,
  Calendar,
  Clock,
  MapPin,
  Compass,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { computeV38Hierarchy, getHorseGenyOdds } from '../utils/v38Helper';
import { RadarPerformanceChart } from './RadarPerformanceChart';
import { exportQuinteOnlyToPdf } from '../utils/pdfExport';
import { exportCourseToExcel } from '../utils/excelExport';

interface ClassificationPronosticViewProps {
  course: CourseHippique;
  selectedHorseNumbers?: number[];
  onSelectHorseForTicket?: (numero: number) => void;
  onToggleHorse?: (numero: number) => void;
}

export const ClassificationPronosticView: React.FC<ClassificationPronosticViewProps> = ({
  course,
  selectedHorseNumbers = [],
  onSelectHorseForTicket,
  onToggleHorse,
}) => {
  const [copiedPronostic, setCopiedPronostic] = useState(false);
  const [activeStepFilter, setActiveStepFilter] = useState<'ALL' | 'ETAPE1' | 'ETAPE2' | 'ETAPE3' | 'TICKETS'>('ALL');

  // Calcul officiel de la hiérarchie V38 (G1, G2, G3 -> 5, 3, 4 -> 12 N° par cotes croissantes -> Base, Chances, Tocards, Surprises, Délaissés)
  const v38Hierarchy = useMemo(() => {
    return computeV38Hierarchy(course);
  }, [course]);

  const {
    g1,
    g2,
    g3,
    poolG1,
    poolG2,
    poolG3,
    selection12,
    selection11,
    basesSolides,
    chancesSerieuses,
    tocardsSpeculatifs,
    surprises,
    delaisses,
  } = v38Hierarchy;

  const activeSelection = selection12 || selection11;

  const poolG1Nums = useMemo(() => new Set(poolG1.map(p => Number(p.numero))), [poolG1]);
  const poolG2Nums = useMemo(() => new Set(poolG2.map(p => Number(p.numero))), [poolG2]);
  const poolG3Nums = useMemo(() => new Set(poolG3.map(p => Number(p.numero))), [poolG3]);

  // Arrivée officielle si disponible pour concordance
  const arrivalNumbers: number[] = useMemo(() => {
    if (!course?.arriveeOfficielle) return [];
    return course.arriveeOfficielle
      .split(/[-,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }, [course?.arriveeOfficielle]);

  const hasArrival = arrivalNumbers.length > 0;

  // Copier le pronostic complet dans le presse-papiers
  const handleCopyPronostic = () => {
    const trio5Nums = [...basesSolides, ...chancesSerieuses.slice(0, 3)].map(p => p.numero);
    const quarteAssociesNums = chancesSerieuses.map(p => p.numero);
    const quinteAssociesNums = [...chancesSerieuses, tocardsSpeculatifs[0]].filter(Boolean).map(p => p.numero);

    const text = [
      `🏁 CLASSIFICATION & PRONOSTIC OFFICIEL V38 (12 CHEVAUX)`,
      `🏇 ${course.titre || course.prixNom || 'Course Hippique'} - ${course.hippodrome || ''} (${course.reunion || 'R1'} ${course.courseNumero || course.course || 'C1'})`,
      `📅 ${course.date || "Aujourd'hui"} à ${course.heure || ''} - ${course.discipline || ''} ${course.distance ? `${course.distance}m` : ''}`,
      ``,
      `🥇 BASES SOLIDES (2 N°) : ${basesSolides.map(p => `N°${p.numero} (${p.nom})`).join(' - ')}`,
      `🥈 CHANCES SÉRIEUSES (4 N°) : ${chancesSerieuses.map(p => `N°${p.numero} (${p.nom})`).join(' - ')}`,
      `🥉 TOCARDS SPÉCULATIFS (3 N°) : ${tocardsSpeculatifs.map(p => `N°${p.numero} (${p.nom})`).join(' - ')}`,
      `⚡ SURPRISES (3 N° classées par N° croissant) : ${surprises.map(p => `N°${p.numero} (${p.nom})`).join(' - ')}`,
      `💤 DÉLAISSÉS : ${delaisses.map(p => `N°${p.numero}`).join(', ')}`,
      ``,
      `🎯 SÉLECTION DES 12 N° CLASSÉS PAR COTE :`,
      activeSelection.map((p, idx) => `${idx + 1}. N°${p.numero} ${p.nom} (Cote: ${p.coteProbable || getHorseGenyOdds(p)}/1) [${idx < 2 ? 'BASE' : idx < 6 ? 'CHANCE' : idx < 9 ? 'TOCARD' : 'SURPRISE'}]`).join('\n'),
      ``,
      `🎟️ PROPOSITIONS DE JEUX PRODUITS PAR ALGORITHME :`,
      `1. COUPLÉ : Bases N°${basesSolides.map(p => p.numero).join(' - ')} | Champ Réduit Base N°${basesSolides[0]?.numero} + Associés (${chancesSerieuses.slice(0, 3).map(p => `N°${p.numero}`).join(', ')})`,
      `2. TRIO (5 N°) : ${trio5Nums.map(n => `N°${n}`).join(' - ')} (Combiné 10 combis = 4 000 FCFA | Champ Réduit = 1 200 FCFA)`,
      `3. QUARTÉ (CHAMP RÉDUIT) : Bases ${basesSolides.map(p => `N°${p.numero}`).join(' - ')} - X - X / Associés: ${quarteAssociesNums.map(n => `N°${n}`).join(', ')} (6 combinaisons = 1 800 FCFA)`,
      `4. QUINTÉ+ (CHAMP RÉDUIT) : Bases ${basesSolides.map(p => `N°${p.numero}`).join(' - ')} - X - X - X / Associés: ${quinteAssociesNums.map(n => `N°${n}`).join(', ')} (10 combinaisons = 3 000 FCFA / Flexi 50% = 1 500 FCFA)`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedPronostic(true);
    setTimeout(() => setCopiedPronostic(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto pb-12">
      {/* 1. Bandeau Hero de la Page Classification & Pronostic */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/30">
                <Crown className="w-4 h-4 fill-slate-950" />
                <span>Page Officielle</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-900 text-amber-300 border border-amber-500/30 font-black text-xs font-mono">
                {course.reunion || 'R1'} {course.courseNumero || course.course || 'C1'}
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 font-bold text-xs">
                {course.discipline || 'Course Hippique'}
              </span>
              {course.corde && (
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-xs font-bold">
                  Corde {course.corde}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Classification & Pronostic Officiel V38 (12 Chevaux)
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed">
              Méthode universelle de calcul : Répartition en <strong className="text-amber-400">3 Groupes (G1: 1-6, G2: 7-10, G3: 11+)</strong>, sélection des <strong className="text-amber-400">5, 3 et 4 plus petites cotes</strong>, réordonnancement des <strong className="text-emerald-400">12 numéros trouvés par cote croissante</strong> et distribution hiérarchique : <span className="text-amber-300 font-bold">Base (2)</span>, <span className="text-emerald-300 font-bold">Chances Sérieuses (4)</span>, <span className="text-rose-300 font-bold">Tocards (3)</span>, <span className="text-purple-300 font-bold">Surprises (2 petits N° du trio 10e-12e)</span> & <span className="text-slate-400 font-bold">Délaissés</span>.
            </p>
          </div>

          {/* Boutons d'actions rapides */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyPronostic}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer active:scale-95"
              title="Copier l'intégralité de la classification et du pronostic"
            >
              {copiedPronostic ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span className="text-emerald-300 font-black">Pronostic Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copier le Pronostic</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => exportQuinteOnlyToPdf(course)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
              title="Télécharger la fiche PDF officielle"
            >
              <FileDown className="w-4 h-4" />
              <span>Exporter PDF V38</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs transition-all cursor-pointer print:hidden"
              title="Imprimer cette page"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>

        {/* Barre de navigation interne pour filtrer les étapes */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1">Navigation Rapide :</span>
          <button
            type="button"
            onClick={() => setActiveStepFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStepFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Vue Complète (Toutes les étapes)
          </button>
          <button
            type="button"
            onClick={() => setActiveStepFilter('ETAPE1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStepFilter === 'ETAPE1'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            1. Répartition G1, G2, G3
          </button>
          <button
            type="button"
            onClick={() => setActiveStepFilter('ETAPE2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStepFilter === 'ETAPE2'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            2. Les 12 N° par Cote
          </button>
          <button
            type="button"
            onClick={() => setActiveStepFilter('ETAPE3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStepFilter === 'ETAPE3'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            3. Hiérarchie (Base, Chances, Tocards)
          </button>
          <button
            type="button"
            onClick={() => setActiveStepFilter('TICKETS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStepFilter === 'TICKETS'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            4. Tickets & Combinaisons
          </button>
        </div>
      </div>

      {/* 2. ÉTAPE 1 : RÉPARTITION PAR GROUPES & TRI PAR COTE CROISSANTE */}
      {(activeStepFilter === 'ALL' || activeStepFilter === 'ETAPE1') && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                1
              </span>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>Étape 1 : Répartition par Groupes & Tri par Cote Croissante</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Dans chaque groupe, les chevaux sont triés par leur cote de manière croissante (les plus petites cotes en tête).
                </p>
              </div>
            </div>

            <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>Quota Total :</span>
              <strong className="text-white">5 (G1) + 3 (G2) + 4 (G3) = 12 Numéros</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* GROUPE G1 (N° 1 à 6) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/40 shadow-xl flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
                  <h3 className="text-base font-black text-white">Groupe G1</h3>
                  <span className="text-xs text-slate-400 font-bold">(N° 1 à 6)</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black">
                  Top 5 Retenus / {g1.length}
                </span>
              </div>

              <div className="space-y-2 flex-grow">
                {g1.map((p, idx) => {
                  const isRetenu = poolG1Nums.has(Number(p.numero));
                  const cote = p.coteProbable || getHorseGenyOdds(p);
                  return (
                    <div
                      key={`g1-horse-${p.numero}`}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isRetenu
                          ? 'bg-amber-950/30 border-amber-500/40 shadow-xs'
                          : 'bg-slate-950/50 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                          isRetenu ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {p.numero}
                        </span>
                        <div>
                          <div className="font-extrabold text-white text-xs leading-tight">{p.nom}</div>
                          <div className="text-[10px] text-slate-400">{p.driver}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {cote}/1
                        </span>
                        {isRetenu ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                            #{idx + 1} Retenu
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                            Écarté
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GROUPE G2 (N° 7 à 10) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 shadow-xl flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                  <h3 className="text-base font-black text-white">Groupe G2</h3>
                  <span className="text-xs text-slate-400 font-bold">(N° 7 à 10)</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black">
                  Top 3 Retenus / {g2.length}
                </span>
              </div>

              <div className="space-y-2 flex-grow">
                {g2.map((p, idx) => {
                  const isRetenu = poolG2Nums.has(Number(p.numero));
                  const cote = p.coteProbable || getHorseGenyOdds(p);
                  return (
                    <div
                      key={`g2-horse-${p.numero}`}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isRetenu
                          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-xs'
                          : 'bg-slate-950/50 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                          isRetenu ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {p.numero}
                        </span>
                        <div>
                          <div className="font-extrabold text-white text-xs leading-tight">{p.nom}</div>
                          <div className="text-[10px] text-slate-400">{p.driver}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {cote}/1
                        </span>
                        {isRetenu ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                            #{idx + 1} Retenu
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                            Écarté
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GROUPE G3 (N° 11 et plus) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-purple-500/40 shadow-xl flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-400 shadow-sm shadow-purple-400"></span>
                  <h3 className="text-base font-black text-white">Groupe G3</h3>
                  <span className="text-xs text-slate-400 font-bold">(N° 11 et +)</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-black">
                  Top 4 Retenus / {g3.length}
                </span>
              </div>

              <div className="space-y-2 flex-grow">
                {g3.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 italic">
                    Course à 10 partants ou moins (Groupe G3 vide).
                  </div>
                ) : (
                  g3.map((p, idx) => {
                    const isRetenu = poolG3Nums.has(Number(p.numero));
                    const cote = p.coteProbable || getHorseGenyOdds(p);
                    return (
                      <div
                        key={`g3-horse-${p.numero}`}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isRetenu
                            ? 'bg-purple-950/30 border-purple-500/40 shadow-xs'
                            : 'bg-slate-950/50 border-slate-800/80 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                            isRetenu ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {p.numero}
                          </span>
                          <div>
                            <div className="font-extrabold text-white text-xs leading-tight">{p.nom}</div>
                            <div className="text-[10px] text-slate-400">{p.driver}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-purple-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {cote}/1
                          </span>
                          {isRetenu ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black">
                              #{idx + 1} Retenu
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                              Écarté
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. ÉTAPE 2 : CLASSEMENT UNIQUE DES 12 NUMÉROS TROUVÉS PAR COTE CROISSANTE */}
      {(activeStepFilter === 'ALL' || activeStepFilter === 'ETAPE2') && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
              2
            </span>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Étape 2 : Classement des 12 Numéros par Cote Croissante</span>
                <span className="text-xs text-amber-400 font-bold font-mono">(Indépendamment du groupe initial)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Les 12 chevaux extraits des viviers G1, G2 et G3 sont réordonnés de la 1ère plus petite cote à la 12e cote.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {activeSelection.map((p, idx) => {
              const position = idx + 1;
              const cote = p.coteProbable || getHorseGenyOdds(p);
              const num = Number(p.numero);

              let roleLabel = 'Surprise';
              let badgeColor = 'bg-purple-500 text-white';
              let cardBg = 'bg-slate-900 border-slate-800';

              if (position <= 2) {
                roleLabel = `${position}ère BASE`;
                badgeColor = 'bg-amber-400 text-slate-950 font-black';
                cardBg = 'bg-amber-950/20 border-amber-500/50 shadow-amber-500/10 shadow-lg';
              } else if (position <= 6) {
                roleLabel = `CHANCE #${position}`;
                badgeColor = 'bg-emerald-500 text-slate-950 font-black';
                cardBg = 'bg-emerald-950/20 border-emerald-500/40';
              } else if (position <= 9) {
                roleLabel = `TOCARD #${position}`;
                badgeColor = 'bg-rose-500 text-white font-black';
                cardBg = 'bg-rose-950/20 border-rose-500/40';
              } else {
                roleLabel = `SURPRISE #${position}`;
                badgeColor = 'bg-purple-600 text-white font-black';
                cardBg = 'bg-purple-950/20 border-purple-500/40';
              }

              const grpOrigine = num <= 6 ? 'G1' : num <= 10 ? 'G2' : 'G3';

              return (
                <div
                  key={`selection12-card-${num}`}
                  className={`p-3.5 rounded-2xl border ${cardBg} transition-all space-y-2 relative flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${badgeColor}`}>
                        {roleLabel}
                      </span>
                      <span className="font-mono text-slate-400 text-[10px]">
                        Origine: <strong>{grpOrigine}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 py-2">
                      <span className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-700 font-mono font-black text-base flex items-center justify-center text-white shrink-0">
                        {num}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-white text-xs truncate">{p.nom}</div>
                        <div className="text-[10px] text-slate-400 truncate">{p.driver}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Cote Geny</span>
                    <span className="text-xs font-mono font-black text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {cote}/1
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. ÉTAPE 3 : HIÉRARCHIE OFFICIELLE DU PRONOSTIC (BASE, CHANCES, TOCARDS, SURPRISES, DÉLAISSÉS) */}
      {(activeStepFilter === 'ALL' || activeStepFilter === 'ETAPE3') && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-purple-500 text-white font-black text-sm flex items-center justify-center shadow-md">
              3
            </span>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Étape 3 : Hiérarchie Officielle du Pronostic</span>
              </h2>
              <p className="text-xs text-slate-400">
                Constitution des catégories officielles : 2 Bases Solides, 4 Chances Sérieuses, 3 Tocards Spéculatifs, 3 Surprises (classées par numéro) et les Délaissés.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. BASES (2 N°) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-amber-300">1. BASES</h3>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                  2 N° (1er & 2e)
                </span>
              </div>

              <div className="space-y-2">
                {basesSolides.map((p, idx) => (
                  <div key={`base-h-${p.numero}`} className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-mono font-black text-xs flex items-center justify-center">
                        {p.numero}
                      </span>
                      <div>
                        <div className="font-extrabold text-white text-xs">{p.nom}</div>
                        <div className="text-[10px] text-slate-400">{p.driver}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-300">{p.coteProbable || getHorseGenyOdds(p)}/1</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. CHANCES SÉRIEUSES (4 N°) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-2 border-emerald-500 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-emerald-300">2. CHANCES SÉRIEUSES</h3>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">
                  4 N° (3e au 6e)
                </span>
              </div>

              <div className="space-y-2">
                {chancesSerieuses.map((p, idx) => (
                  <div key={`chance-h-${p.numero}`} className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-mono font-black text-xs flex items-center justify-center">
                        {p.numero}
                      </span>
                      <div>
                        <div className="font-extrabold text-white text-xs">{p.nom}</div>
                        <div className="text-[10px] text-slate-400">{p.driver}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-300">{p.coteProbable || getHorseGenyOdds(p)}/1</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. TOCARDS (3 N°) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 border-2 border-rose-500 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-400" />
                  <h3 className="text-base font-black text-rose-300">3. TOCARDS</h3>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white font-black text-xs">
                  3 N° (7e au 9e)
                </span>
              </div>

              <div className="space-y-2">
                {tocardsSpeculatifs.map((p, idx) => (
                  <div key={`tocard-h-${p.numero}`} className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-rose-500 text-white font-mono font-black text-xs flex items-center justify-center">
                        {p.numero}
                      </span>
                      <div>
                        <div className="font-extrabold text-white text-xs">{p.nom}</div>
                        <div className="text-[10px] text-slate-400">{p.driver}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-rose-300">{p.coteProbable || getHorseGenyOdds(p)}/1</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. SURPRISES (3 N° classées par ordre de numéro) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border-2 border-purple-500 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-purple-500/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-black text-purple-300">4. SURPRISES</h3>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-purple-500 text-white font-black text-xs">
                  Petits N° des 10e-12e
                </span>
              </div>

              <div className="space-y-2">
                {surprises.map((p, idx) => (
                  <div key={`surprise-h-${p.numero}`} className="p-2.5 rounded-xl bg-slate-950 border border-purple-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-purple-500 text-white font-mono font-black text-xs flex items-center justify-center">
                        {p.numero}
                      </span>
                      <div>
                        <div className="font-extrabold text-white text-xs">{p.nom}</div>
                        <div className="text-[10px] text-slate-400">{p.driver}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-purple-300">{p.coteProbable || getHorseGenyOdds(p)}/1</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DÉLAISSÉS (Courses > 12 partants) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 font-black text-xs">
                💤 DÉLAISSÉS ({delaisses.length})
              </span>
              <span className="text-xs text-slate-400">
                Tous les autres numéros non retenus dans les 12, classés en fonction de leur cote :
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {delaisses.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Aucun cheval délaissé (lot ≤ 12 partants).</span>
              ) : (
                delaisses.map((p) => (
                  <span
                    key={`delaisse-chip-${p.numero}`}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <span>N°{p.numero}</span>
                    <span className="text-slate-500">({p.coteProbable || getHorseGenyOdds(p)}/1)</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* 5. ÉTAPE 4 : PROPOSITIONS DE JEUX PRODUITS PAR ALGORITHME */}
      {(activeStepFilter === 'ALL' || activeStepFilter === 'TICKETS') && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
              4
            </span>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Étape 4 : Propositions de Jeux Produits par Algorithme</span>
              </h2>
              <p className="text-xs text-slate-400">
                Formules mathématiquement optimisées par le moteur d'analyse : Couplé, Trio en 5 N°, Quarté Champ Réduit et Quinté+ Champ Réduit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. COUPLÉ */}
            <div className="p-5 rounded-2xl bg-slate-900 border-2 border-amber-500/50 shadow-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    <span>Couplé (Gagnant • Placé)</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    500 FCFA
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Formule sèche sur les 2 bases solides ou en champ réduit avec les premières chances.
                </p>
                
                <div className="space-y-1.5 py-1">
                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl text-xs">
                    <span className="text-slate-400 font-bold">Couplé Sec :</span>
                    <span className="font-mono font-black text-amber-300">{basesSolides.map(p => `N°${p.numero}`).join(' - ')}</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl text-xs">
                    <span className="text-slate-400 font-bold">Champ Réduit :</span>
                    <span className="font-mono text-[11px] text-cyan-300">
                      N°{basesSolides[0]?.numero} / {chancesSerieuses.slice(0, 3).map(p => p.numero).join('-')}
                    </span>
                  </div>
                </div>
              </div>

              {onSelectHorseForTicket && (
                <button
                  type="button"
                  onClick={() => {
                    basesSolides.forEach(p => onSelectHorseForTicket(Number(p.numero)));
                  }}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  Charger ce Couplé
                </button>
              )}
            </div>

            {/* 2. TRIO : 5 N° */}
            <div className="p-5 rounded-2xl bg-slate-900 border-2 border-teal-500/50 shadow-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-black text-teal-300 text-sm flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Trio : 5 Numéros (5 N°)</span>
                  </span>
                  <span className="text-[10px] font-bold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                    400 FCFA
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Les 5 numéros clés recommandés : 100% de garantie dès que les 3 premiers sont dans vos 5 !
                </p>
                
                <div className="flex items-center gap-1.5 py-1 justify-center">
                  {[...basesSolides, ...chancesSerieuses.slice(0, 3)].map((p, i) => (
                    <span key={`trio5-disp-${p.numero}-${i}`} className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-mono font-black text-sm flex items-center justify-center shadow-md">
                      {p.numero}
                    </span>
                  ))}
                </div>

                <div className="bg-slate-950 p-2 rounded-xl text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Combiné 5 N° :</span>
                    <strong className="text-teal-300 font-bold">4 000 FCFA (10 paris)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Champ Réduit (2B+3A) :</span>
                    <strong className="text-amber-300 font-bold">1 200 FCFA (3 paris)</strong>
                  </div>
                </div>
              </div>

              {onSelectHorseForTicket && (
                <button
                  type="button"
                  onClick={() => {
                    [...basesSolides, ...chancesSerieuses.slice(0, 3)].forEach(p => onSelectHorseForTicket(Number(p.numero)));
                  }}
                  className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  Charger le Trio (5 N°)
                </button>
              )}
            </div>

            {/* 3. QUARTÉ : CHAMP RÉDUIT */}
            <div className="p-5 rounded-2xl bg-slate-900 border-2 border-purple-500/50 shadow-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-black text-purple-300 text-sm flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    <span>Quarté : Champ Réduit</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
                    300 FCFA
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  2 Bases Solides + 4 Chevaux Associés (Champs X) pour viser Ordre, Désordre et Bonus 4.
                </p>
                
                <div className="bg-slate-950 p-2.5 rounded-xl border border-purple-500/30 text-center font-mono text-xs">
                  <div className="text-amber-400 font-bold">Bases: {basesSolides.map(p => `N°${p.numero}`).join(' - ')} - X - X</div>
                  <div className="text-[10px] text-purple-300 mt-1">Associés : {chancesSerieuses.map(p => `N°${p.numero}`).join(', ')}</div>
                </div>

                <div className="bg-slate-950 p-2 rounded-xl text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coût Champ Réduit :</span>
                    <strong className="text-purple-300 font-bold">1 800 FCFA (6 paris)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Option Flexi 50% :</span>
                    <strong className="text-emerald-400 font-bold">900 FCFA</strong>
                  </div>
                </div>
              </div>

              {onSelectHorseForTicket && (
                <button
                  type="button"
                  onClick={() => {
                    [...basesSolides, ...chancesSerieuses].forEach(p => onSelectHorseForTicket(Number(p.numero)));
                  }}
                  className="w-full py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  Charger Quarté Champ Réduit
                </button>
              )}
            </div>

            {/* 4. QUINTÉ+ : CHAMP RÉDUIT */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-red-950/30 via-slate-900 to-slate-950 border-2 border-red-500/50 shadow-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-black text-rose-300 text-sm flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Quinté+ : Champ Réduit</span>
                  </span>
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                    300 FCFA
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  2 Bases Incontournables + 5 Associés (Champs X) : couverture maximale Ordre/Bonus.
                </p>
                
                <div className="bg-slate-950 p-2.5 rounded-xl border border-red-500/30 text-center font-mono text-xs">
                  <div className="text-amber-400 font-bold">Bases: {basesSolides.map(p => `N°${p.numero}`).join(' - ')} - X - X - X</div>
                  <div className="text-[10px] text-rose-300 mt-1">
                    Associés : {[...chancesSerieuses, tocardsSpeculatifs[0]].filter(Boolean).map(p => `N°${p.numero}`).join(', ')}
                  </div>
                </div>

                <div className="bg-slate-950 p-2 rounded-xl text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plein Tarif (100%) :</span>
                    <strong className="text-rose-400 font-bold">3 000 FCFA (10 paris)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Option Flexi 50% :</span>
                    <strong className="text-emerald-400 font-bold">1 500 FCFA</strong>
                  </div>
                </div>
              </div>

              {onSelectHorseForTicket && (
                <button
                  type="button"
                  onClick={() => {
                    [...basesSolides, ...chancesSerieuses, tocardsSpeculatifs[0]].filter(Boolean).forEach(p => onSelectHorseForTicket(Number(p.numero)));
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  Charger Quinté+ Champ Réduit
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 6. RADAR DE PERFORMANCE INTÉGRÉ SUR LES 5 CRITÈRES CLÉS */}
      <section className="space-y-3">
        <RadarPerformanceChart
          course={course}
          selectedHorseNumbers={selectedHorseNumbers}
          onSelectHorseForTicket={onSelectHorseForTicket}
        />
      </section>
    </div>
  );
};
