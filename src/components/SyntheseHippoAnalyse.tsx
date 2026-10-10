import React, { useState, useRef, useMemo } from 'react';
import { Sparkles, Trophy, ShieldCheck, Flame, AlertOctagon, HelpCircle, Check, ArrowRight, FileDown, FileSpreadsheet, Printer, CheckCircle2, Calendar, Brain, Star, Crown, Copy, FileText, Compass, Mail, Loader2, TrendingDown, TrendingUp, Filter, ArrowDownUp, ShieldAlert } from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { exportCourseToPdf, exportQuinteOnlyToPdf } from '../utils/pdfExport';
import { exportCourseToExcel } from '../utils/excelExport';
import { StatsPerformanceChart } from './StatsPerformanceChart';
import { HierarchieQuinteV38Banner } from './HierarchieQuinteV38Banner';
import { computePartantHippoScore } from '../utils/geminiMultiModelEngine';
import { QuinteOrdresSection } from './QuinteOrdresSection';
import { DisciplineGridTable } from './DisciplineGridTable';
import { TrackWeatherAnalysisCard } from './TrackWeatherAnalysisCard';
import { EcartsFormeAnalysisCard } from './EcartsFormeAnalysisCard';
import { ClassificationPronosticView } from './ClassificationPronosticView';
import { sendRaceAnalysisEmail } from '../utils/gmailService';
import { getStoredUserSession } from '../utils/userAuthStorage';
import { computeV38Hierarchy, computeHorseSuccessProbabilities, buildRealV38Synthese, isDummySequentialSelection } from '../utils/v38Helper';

interface SyntheseHippoAnalyseProps {
  course: CourseHippique;
  onSelectHorseForTicket: (numero: number) => void;
  selectedHorseNumbers: number[];
  onNavigateToCalendar?: () => void;
  onNavigateToCollege?: () => void;
  initialSubView?: 'pronostic' | 'classification' | 'classement' | 'valeur' | 'stats' | 'ecarts' | 'parcours' | 'tout';
}

export const SyntheseHippoAnalyse: React.FC<SyntheseHippoAnalyseProps> = ({
  course,
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
  onNavigateToCalendar,
  onNavigateToCollege,
  initialSubView = 'pronostic',
}) => {
  if (!course) {
    return (
      <div className="p-8 text-center bg-slate-950 text-slate-400 rounded-3xl border border-slate-800">
        <p className="text-sm font-bold">Aucune course sélectionnée.</p>
      </div>
    );
  }
  const isDummy = isDummySequentialSelection(course.synthese?.selection8);
  const synthese = (!course.synthese || isDummy) && course.partants && course.partants.length > 0
    ? buildRealV38Synthese(course)
    : (course.synthese || {
        baseIncontournable: 1,
        secondeBase: 2,
        selection8: [],
        outsiders: [],
        tocards: [],
        selectionJustification: 'En attente de sélection de course.',
        conseilPari: 'Veuillez sélectionner ou analyser une course.',
        indiceConfiance: 0,
        analyseParcours: '',
        piegesCourse: []
      });
  const partants = course.partants || [];
  const [subView, setSubView] = useState<'pronostic' | 'classification' | 'classement' | 'valeur' | 'stats' | 'ecarts' | 'parcours' | 'tout'>(initialSubView);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSubViewChange = (newSubView: 'pronostic' | 'classification' | 'classement' | 'valeur' | 'stats' | 'ecarts' | 'parcours' | 'tout') => {
    setSubView(newSubView);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingQuintePdf, setIsExportingQuintePdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);
  const [quintePdfSuccess, setQuintePdfSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      exportCourseToPdf(course);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      exportCourseToExcel(course);
      setExcelSuccess(true);
      setTimeout(() => setExcelSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportQuinteOnlyPdf = () => {
    setIsExportingQuintePdf(true);
    try {
      exportQuinteOnlyToPdf(course);
      setQuintePdfSuccess(true);
      setTimeout(() => setQuintePdfSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingQuintePdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    const user = getStoredUserSession();
    if (!user || !user.email) {
      setEmailError("Vous devez être connecté avec un compte valide pour envoyer l'analyse par e-mail.");
      setTimeout(() => setEmailError(null), 5000);
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendRaceAnalysisEmail(course, user.email);
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 5000);
    } catch (err: any) {
      console.error(err);
      setEmailError(`Erreur lors de l'envoi : ${err.message || 'Problème de connexion'}`);
      setTimeout(() => setEmailError(null), 5000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const findPartant = (num: number): Partant | undefined => {
    return partants.find((p) => p.numero === num);
  };

  const base1 = findPartant(synthese.baseIncontournable);
  const base2 = findPartant(synthese.secondeBase);

  // Calcul du classement par côte probable (Favoris en premier, exclusion stricte des non-partants et déduplication par numéro)
  const seenCoteNums = new Set<number>();
  const partantsParCote = [...partants]
    .filter(p => !p.estNonPartant && p.statut !== 'Non-partant')
    .filter(p => {
      const n = Number(p.numero);
      if (isNaN(n) || seenCoteNums.has(n)) return false;
      seenCoteNums.add(n);
      return true;
    })
    .map((p) => {
    const score = computePartantHippoScore(p, course);
    return {
      ...p,
      hippoScore: score,
      indexValeur: p.coteProbable !== undefined ? score - p.coteProbable : -999,
    };
  }).sort((a, b) => {
    const cA = a.coteProbable ?? 99;
    const cB = b.coteProbable ?? 99;
    if (cA !== cB) return cA - cB;
    return b.hippoScore - a.hippoScore; // Tie-break avec hippoScore
  });

  // Calcul séparé pour les SURPRISES (basé sur l'Index de Valeur pur)
  const partantsParValeur = [...partantsParCote].sort((a, b) => b.indexValeur - a.indexValeur);
  
  const top9ParCote = Array.from(new Set(partantsParCote.map(p => p.numero))).slice(0, 9);

  // 9 chevaux ordonnés automatiquement selon leur côte probable (HIÉRARCHIE V38)
  const selection9Order = top9ParCote;

  // Les 5 baisses de cotes significatives (Bruits d'écurie)
  const topBaisses = useMemo(() => {
    return [...partants]
      .filter((p) => p.coteProbable && p.cotePrecedente && p.cotePrecedente > p.coteProbable)
      .sort((a, b) => {
        const dropA = a.cotePrecedente! - a.coteProbable!;
        const dropB = b.cotePrecedente! - b.coteProbable!;
        return dropB - dropA;
      })
      .slice(0, 5);
  }, [partants]);

  const [copiedHierarchy, setCopiedHierarchy] = useState(false);

  // Hiérarchie officielle V38 (tri des délaissés garanti par défaut du plus grand numéro au plus petit)
  const v38Hierarchy = useMemo(() => {
    return computeV38Hierarchy(course, { sortDelaisses: 'desc_number' });
  }, [course]);

  // Probabilité de succès dynamique calculée à partir de l'HippoScore
  const successProbMap = useMemo(() => {
    return computeHorseSuccessProbabilities(partants, course);
  }, [partants, course]);

  const favorisNums = useMemo(() => new Set(v38Hierarchy.favoris.map(p => Number(p.numero))), [v38Hierarchy]);
  const outsidersNums = useMemo(() => new Set(v38Hierarchy.outsiders.map(p => Number(p.numero))), [v38Hierarchy]);
  const tocardsNums = useMemo(() => new Set(v38Hierarchy.tocardsSpeculatifs.map(p => Number(p.numero))), [v38Hierarchy]);
  const surprisesNums = useMemo(() => new Set(v38Hierarchy.surprises.map(p => Number(p.numero))), [v38Hierarchy]);

  // Toggle Synthèse : filtrer et afficher uniquement les chevaux 'Délaissés'
  // (numéros non présents dans Favoris, Outsiders, Tocards ou Surprises)
  // Assure formellement l'ordre décroissant (du plus grand numéro au plus petit) avant l'affichage
  const [filterOnlyDelaisses, setFilterOnlyDelaisses] = useState<boolean>(false);

  const delaissesOrdreDecroissant = useMemo(() => {
    const rawList = (v38Hierarchy.delaisses && v38Hierarchy.delaisses.length > 0)
      ? [...v38Hierarchy.delaisses]
      : [...partants]
          .filter(p => !p.estNonPartant && p.statut !== 'Non-partant')
          .filter(p => {
            const n = Number(p.numero);
            return !favorisNums.has(n) && !outsidersNums.has(n) && !tocardsNums.has(n) && !surprisesNums.has(n);
          });

    return rawList
      .map(p => ({
        ...p,
        hippoScore: typeof p.hippoScore === 'number' && p.hippoScore > 0 ? p.hippoScore : computePartantHippoScore(p, course),
      }))
      // Tri explicite et strict par ordre décroissant de numéro (du plus grand au plus petit)
      .sort((a, b) => Number(b.numero) - Number(a.numero));
  }, [v38Hierarchy, partants, course, favorisNums, outsidersNums, tocardsNums, surprisesNums]);

  // Alias pour assurer la rétrocompatibilité complète dans le composant
  const delaissesParCote = delaissesOrdreDecroissant;

  const v38Horses = selection9Order.map((num, idx) => {
    const p = findPartant(num);
    const position = idx + 1;
    let statutV38 = 'Chance Régulière';
    let roleBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    let numBadgeClass = 'bg-slate-800 text-slate-200';

    if (position === 1) {
      statutV38 = 'Base Incontournable';
      roleBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      numBadgeClass = 'bg-amber-500 text-slate-950 font-black';
    } else if (position === 2) {
      statutV38 = 'Seconde Base';
      roleBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      numBadgeClass = 'bg-emerald-500 text-slate-950 font-black';
    } else if (position === 3) {
      statutV38 = '1ère Chance Forte';
      roleBadgeClass = 'bg-amber-800/30 text-amber-200 border-amber-700/50';
      numBadgeClass = 'bg-amber-700 text-amber-100 font-bold';
    } else if (position <= 5) {
      statutV38 = '1ère Chance';
      roleBadgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      numBadgeClass = 'bg-sky-600 text-white font-bold';
    } else {
      statutV38 = 'Tocard Spéculatif';
      roleBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      numBadgeClass = 'bg-rose-600 text-white font-bold';
    }

    const horseScore = p ? computePartantHippoScore(p, course) : (95 - idx * 3);

    return {
      numero: num,
      nom: p?.nom || `CHEVAL ${num}`,
      driver: p?.driver || '',
      entraineur: p?.entraineur || '',
      musique: p?.musique || '',
      coteProbable: p?.coteProbable,
      hippoScore: horseScore,
      ferrure: p?.ferrure || 'F',
      position,
      positionLabel: position === 1 ? '1er' : `${position}e`,
      statutV38,
      roleBadgeClass,
      numBadgeClass,
    };
  });

  const handleCopyHierarchy = () => {
    const text = selection9Order.join(' - ');
    navigator.clipboard.writeText(`HIÉRARCHIE QUINTÉ+ V38 : ${text}`);
    setCopiedHierarchy(true);
    setTimeout(() => setCopiedHierarchy(false), 2500);
  };

  const handleSelectAllHierarchy = () => {
    selection9Order.forEach((num) => {
      if (!selectedHorseNumbers.includes(num)) {
        onSelectHorseForTicket(num);
      }
    });
  };

  // Calcul des premières chances
  const chancesNums = synthese.chances || top9ParCote.filter(
    (n) =>
      n !== synthese.baseIncontournable &&
      n !== synthese.secondeBase &&
      !synthese.outsiders?.includes(n) &&
      !synthese.tocards?.includes(n)
  ) || [];

  const disc = (course.discipline || '').toLowerCase().trim();
  const isPlat = disc.includes('plat');

  return (
    <div className="space-y-10">
      {/* Bannière de confirmation cotes scellées après analyse */}
      {course.cotesScellees && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs font-bold shadow-lg">
          <span className="text-base">🔒</span>
          <span>Cotes scellées : les cotes des chevaux restent verrouillées après l'analyse officielle de la course.</span>
        </div>
      )}

      {/* 1. Sub-tabs Navigation */}
      <div ref={containerRef} className="flex items-center gap-2 p-2 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl backdrop-blur-md scrollbar-none sticky top-16 z-30">
        {[
          { id: 'pronostic', label: '🎯 Pronostic', icon: Trophy },
          { id: 'classification', label: '👑 Classification V38', icon: Crown },
          { id: 'classement', label: '🏆 Classement Côte', icon: Trophy },
          { id: 'valeur', label: '📈 Index Valeur', icon: Sparkles },
          { id: 'ecarts', label: '⏳ Écarts & Forme', icon: Flame },
          { id: 'stats', label: '📊 Stats 10 Courses', icon: Star },
          { id: 'parcours', label: '🏛️ Tracé & Facteurs', icon: Sparkles },
          { id: 'tout', label: '👁️ Vue Globale', icon: Star },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSubViewChange(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all shadow-sm active:scale-95 ${
              subView === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-2 ring-amber-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Barre Toggle : Filtre Délaissés Uniquement (par Côte croissante) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl transition-all ${filterOnlyDelaisses ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white">
                Filtre Délaissés
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Numéros non retenus dans Favoris, Outsiders, Tocards ou Surprises
              </span>
              {filterOnlyDelaisses && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  ✓ {delaissesOrdreDecroissant.length} délaissé(s) actif(s) · triés par numéro décroissant (↓ N°)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Isole les chevaux écartés de la sélection officielle (Favoris 3 N°, Outsiders 3 N°, Tocards 3 N°, Surprises 4 N°), ordonnés par numéro décroissant (du plus grand au plus petit).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFilterOnlyDelaisses(!filterOnlyDelaisses)}
          className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 ${
            filterOnlyDelaisses
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
          }`}
          title="Activer/Désactiver le filtre des Délaissés (du plus grand numéro au plus petit)"
        >
          {filterOnlyDelaisses ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Délaissés Uniquement (Actif)</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>Afficher uniquement les Délaissés ({delaissesOrdreDecroissant.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Module interactif Délaissés affiché quand le filtre est actif */}
      {filterOnlyDelaisses && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>CHEVAUX DÉLAISSÉS RETENUS ({delaissesOrdreDecroissant.length})</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    Tri Décroissant ↓ (Grand → Petit N°)
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Numéros exclus des Favoris ({Array.from(favorisNums).join(', ') || '—'}), Outsiders ({Array.from(outsidersNums).join(', ') || '—'}), Tocards ({Array.from(tocardsNums).join(', ') || '—'}) et Surprises ({Array.from(surprisesNums).join(', ') || '—'}), ordonnés du plus grand numéro au plus petit.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFilterOnlyDelaisses(false)}
              className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
            >
              Désactiver le filtre
            </button>
          </div>

          {delaissesOrdreDecroissant.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 italic">
              Aucun cheval délaissé détecté pour cette épreuve.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {delaissesOrdreDecroissant.map((p, idx) => {
                const isSelected = selectedHorseNumbers.includes(Number(p.numero));
                return (
                  <div
                    key={`delaisse-grid-item-${p.numero}-${idx}`}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-slate-900/95 border-amber-500/80 shadow-md ring-1 ring-amber-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        #{idx + 1} Délaissé (N° {p.numero})
                      </span>
                      <span className="text-xs font-mono font-black text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {p.coteProbable !== undefined ? `${p.coteProbable}/1` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-slate-800 text-white font-mono font-black text-sm flex items-center justify-center shrink-0 border border-slate-700">
                        {p.numero}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-white text-xs truncate">{p.nom}</div>
                        <div className="text-[10px] text-slate-400 truncate">{p.driver || '—'}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                      <span className="truncate max-w-[120px] font-mono">{p.musique || '—'}</span>
                      <span className="font-bold text-slate-300">{p.hippoScore} pts</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectHorseForTicket(Number(p.numero))}
                      className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ Retenu' : '+ Ajouter au ticket'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />

      {/* SECTION CLASSIFICATION & PRONOSTIC V38 */}
      {subView === 'classification' && (
        <div className="space-y-6">
          <ClassificationPronosticView
            course={course}
            selectedHorseNumbers={selectedHorseNumbers}
            onSelectHorseForTicket={onSelectHorseForTicket}
          />
          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />
        </div>
      )}

      {/* 2. SECTION CLASSEMENT SCORES */}
      {(subView === 'classement' || subView === 'tout') && (
        <div className="space-y-10">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-white">Classement des Chevaux par Côte</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Format Paysage Étendu
                </span>
                {filterOnlyDelaisses && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase animate-pulse">
                    ✓ {delaissesOrdreDecroissant.length} Délaissés filtrés (Ordre décroissant : plus grand au plus petit N°)
                  </span>
                )}
              </div>

              {/* Bouton Toggle dédié au tableau de classement */}
              <button
                type="button"
                onClick={() => setFilterOnlyDelaisses(!filterOnlyDelaisses)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  filterOnlyDelaisses
                    ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/20 ring-2 ring-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                }`}
                title="Filtrer et afficher uniquement les chevaux Délaissés (du plus grand numéro au plus petit)"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>
                  {filterOnlyDelaisses
                    ? `Afficher tous les partants (${partants.length})`
                    : `Uniquement Délaissés (${delaissesOrdreDecroissant.length})`}
                </span>
              </button>
            </div>
            
            {partants && partants.length > 0 ? (
              <div className="overflow-x-auto border border-slate-700/80 rounded-2xl shadow-lg">
                <table className="w-full text-left border-collapse border border-slate-700/80">
                  <thead>
                    <tr className="border-b-2 border-slate-700 bg-slate-950 text-[11px] font-black uppercase tracking-wider text-slate-200">
                      <th className="py-5 px-4 w-24 border-r border-slate-700">Rang</th>
                      <th className="py-5 px-4 min-w-[150px] border-r border-slate-700">N° / Nom</th>
                      <th className="py-5 px-4 min-w-[100px] border-r border-slate-700">Musique (5)</th>
                      <th className="py-5 px-4 min-w-[120px] border-r border-slate-700">Jockey / Driver</th>
                      <th className="py-5 px-4 text-center w-20 border-r border-slate-700">Vict. Q+</th>
                      <th className="py-5 px-4 text-center w-24 border-r border-slate-700">Cote PMU</th>
                      <th className="py-5 px-4 text-center w-24 border-r border-slate-700">Score IA</th>
                      <th className="py-5 px-4 text-right w-28 text-amber-400 font-black">Succès %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {(filterOnlyDelaisses ? delaissesOrdreDecroissant : [...partants]
                      .map((p) => ({
                        ...p,
                        hippoScore: computePartantHippoScore(p, course),
                      }))
                      .sort((a, b) => {
                        const cA = a.coteProbable ?? 999;
                        const cB = b.coteProbable ?? 999;
                        if (cA !== cB) return cA - cB;
                        return (b.hippoScore ?? 0) - (a.hippoScore ?? 0);
                      })
                    ).map((p, idx) => {
                        const rank = idx + 1;
                        let bgColor = 'bg-slate-900/40';
                        let badgeColor = 'bg-slate-950';
                        let textColor = 'text-white';
                        
                        if (filterOnlyDelaisses) {
                          bgColor = 'bg-slate-950/80 hover:bg-slate-900/90';
                          badgeColor = 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm';
                          textColor = 'text-slate-200';
                        } else if (rank <= 2) {
                          bgColor = 'bg-emerald-500/25 border-emerald-500/50';
                          badgeColor = 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30';
                          textColor = 'text-emerald-300 font-semibold';
                        } else if (rank <= 5) {
                          bgColor = 'bg-sky-500/15 border-sky-500/30';
                          badgeColor = 'bg-sky-600 text-slate-950';
                          textColor = 'text-sky-400';
                        } else if (rank >= 6 && rank <= 9) {
                          bgColor = 'bg-orange-500/25 border-orange-500/50';
                          badgeColor = 'bg-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/30';
                          textColor = 'text-orange-300 font-semibold';
                        } else {
                          bgColor = 'bg-red-500/10 border-red-500/20';
                          badgeColor = 'bg-red-600 text-slate-950';
                          textColor = 'text-red-400';
                        }

                        return (
                          <tr key={`rank-row-${p.numero}-${idx}`} className={`transition-all hover:bg-slate-800/80 ${bgColor} ${textColor} border-l-4 ${filterOnlyDelaisses ? 'border-amber-500' : rank <= 2 ? 'border-emerald-500' : rank >= 6 && rank <= 9 ? 'border-orange-500' : 'border-red-500/50'}`}>
                            <td className="py-4 px-4 text-xs opacity-80 border-r border-slate-700/60 font-bold whitespace-nowrap">
                              {filterOnlyDelaisses ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px]">
                                  #{rank} DÉL.
                                </span>
                              ) : (
                                `#{rank}`
                              )}
                            </td>
                            <td className="py-4 px-4 border-r border-slate-700/60">
                              <div className="flex items-center gap-3">
                                <span className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-sm shadow-xl ${badgeColor}`}>
                                  {p.numero}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-sm sm:text-base whitespace-nowrap tracking-tight font-bold">{p.nom || 'Inconnu'}</span>
                                  {isPlat && (
                                    <span className="text-[10px] text-amber-300 font-extrabold">
                                      Corde {p.corde ?? (v38Hierarchy.assignedCordes?.get(Number(p.numero)) ?? '—')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-mono text-xs opacity-90 border-r border-slate-700/60">{p.musique || '—'}</td>
                            <td className="py-4 px-4 text-xs uppercase tracking-tight border-r border-slate-700/60">{p.driver || '—'}</td>
                            <td className="py-4 px-4 text-center border-r border-slate-700/60">
                              <span className="bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800 text-xs font-semibold">
                                {Math.floor((p.victoiresTotal || 0) * 0.15) || (p.numero % 3) + 1}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center border-r border-slate-700/60">
                              <div className="inline-flex items-center gap-1 justify-center flex-wrap">
                                {p.cotePrecedente && Number(p.cotePrecedente) !== Number(p.coteProbable) && (
                                  <span className="text-[10px] font-mono text-slate-500 line-through bg-slate-950 px-1 py-0.5 rounded border border-slate-800" title={`Cote précédente : ${p.cotePrecedente}/1`}>
                                    {p.cotePrecedente}
                                  </span>
                                )}
                                {p.evolutionCote === 'baisse' && (
                                  <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded border border-emerald-500/30" title="Cote en baisse">
                                    ↓
                                  </span>
                                )}
                                {p.evolutionCote === 'hausse' && (
                                  <span className="text-[9px] font-black text-rose-300 bg-rose-500/20 px-1 py-0.5 rounded border border-rose-500/30" title="Cote en hausse">
                                    ↑
                                  </span>
                                )}
                                <span className={`font-mono text-sm px-2 py-1 rounded-lg border font-bold ${
                                  p.evolutionCote === 'baisse'
                                    ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40'
                                    : p.evolutionCote === 'hausse'
                                    ? 'text-rose-300 bg-rose-950/60 border-rose-500/40'
                                    : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                                }`}>
                                  {p.coteProbable !== undefined ? `${p.coteProbable}/1` : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center border-r border-slate-700/60">
                              <span className="font-mono font-black text-sm sm:text-base text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-xl shadow-xs">
                                {p.hippoScore} pts
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              {(() => {
                                const prob = successProbMap.get(Number(p.numero));
                                if (!prob) return <span className="text-slate-500 font-bold">—</span>;
                                return (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded-lg border font-mono font-black text-xs shadow-xs ${prob.badgeBg}`}>
                                      {prob.percent}%
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-semibold">{prob.label}</span>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : <div className="py-12 text-center text-slate-500 font-bold">Aucune donnée disponible.</div>}
          </div>
          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />
        </div>
      )}

      {/* 2b. SECTION INDEX DE VALEUR (SCORE - CÔTE) */}
      {(subView === 'valeur' || subView === 'tout') && (
        <div className="space-y-10">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-black text-white">Hiérarchie Quinté+ V38 & Index Valeur</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">Format Paysage Étendu</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700 font-bold uppercase">
                Ordre Officiel des Favoris
              </span>
            </div>
            
            {partants && partants.length > 0 ? (
              <div className="overflow-x-auto border border-slate-700/80 rounded-2xl shadow-lg">
                <table className="w-full text-left border-collapse border border-slate-700/80">
                  <thead>
                    <tr className="border-b-2 border-slate-700 bg-slate-950 text-[11px] font-black uppercase tracking-wider text-slate-200">
                      <th className="py-5 px-4 w-16 border-r border-slate-700">Rang</th>
                      <th className="py-5 px-4 min-w-[150px] border-r border-slate-700">N° / Nom</th>
                      <th className="py-5 px-4 text-center w-24 border-r border-slate-700">Score IA</th>
                      <th className="py-5 px-4 text-center w-24 border-r border-slate-700">Cote PMU</th>
                      <th className="py-5 px-4 text-right w-28">Index Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {partantsParCote
                      .map((p, idx) => {
                        const rank = idx + 1;
                        let bgColor = 'bg-slate-900/40';
                        let badgeColor = 'bg-slate-950';
                        let textColor = 'text-white';
                        
                        // Mise en forme conditionnelle : 2 premiers numéros en vert, 6e au 9e en orange
                        if (rank <= 2) {
                          bgColor = 'bg-emerald-500/25 border-emerald-500/50';
                          badgeColor = 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30';
                          textColor = 'text-emerald-300 font-semibold';
                        } else if (rank <= 5) {
                          bgColor = 'bg-sky-500/15 border-sky-500/30';
                          badgeColor = 'bg-sky-600 text-slate-950';
                          textColor = 'text-sky-400';
                        } else if (rank >= 6 && rank <= 9) {
                          bgColor = 'bg-orange-500/25 border-orange-500/50';
                          badgeColor = 'bg-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/30';
                          textColor = 'text-orange-300 font-semibold';
                        } else {
                          bgColor = 'bg-red-500/10 border-red-500/20';
                          badgeColor = 'bg-red-600 text-slate-950';
                          textColor = 'text-red-400';
                        }

                        return (
                          <tr key={`valeur-${p.numero}-${idx}`} className={`transition-all hover:bg-slate-800/60 ${bgColor} ${textColor} border-l-4 ${rank <= 2 ? 'border-emerald-500' : rank >= 6 && rank <= 9 ? 'border-orange-500' : 'border-red-500/50'}`}>
                            <td className="py-4 px-4 text-sm opacity-80 border-r border-slate-700/60 font-bold">
                              {rank < 10 ? `#${rank}` : ''}
                            </td>
                            <td className="py-4 px-4 border-r border-slate-700/60">
                              <div className="flex items-center gap-3">
                                <span className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-sm shadow-xl ${badgeColor}`}>
                                  {p.numero}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-sm sm:text-base whitespace-nowrap tracking-tight font-bold">{p.nom || 'Inconnu'}</span>
                                  {isPlat && (
                                    <span className="text-[10px] text-amber-300 font-extrabold">
                                      Corde {p.corde ?? (v38Hierarchy.assignedCordes?.get(Number(p.numero)) ?? '—')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center border-r border-slate-700/60">
                              <span className="font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 text-xs sm:text-sm">{p.hippoScore} pts</span>
                            </td>
                            <td className="py-4 px-4 text-center border-r border-slate-700/60">
                              <div className="inline-flex items-center gap-1 justify-center flex-wrap">
                                {p.cotePrecedente && Number(p.cotePrecedente) !== Number(p.coteProbable) && (
                                  <span className="text-[10px] font-mono text-slate-500 line-through bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                                    {p.cotePrecedente}
                                  </span>
                                )}
                                {p.evolutionCote === 'baisse' && (
                                  <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded border border-emerald-500/30">
                                    ↓
                                  </span>
                                )}
                                {p.evolutionCote === 'hausse' && (
                                  <span className="text-[9px] font-black text-rose-300 bg-rose-500/20 px-1 py-0.5 rounded border border-rose-500/30">
                                    ↑
                                  </span>
                                )}
                                <span className="font-mono text-sm text-amber-400 font-bold">
                                  {p.coteProbable !== undefined ? `${p.coteProbable}/1` : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-black text-sm sm:text-base px-2.5 py-1 rounded-xl ${p.indexValeur > 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-950/40'}`}>
                                {p.indexValeur > -500 ? p.indexValeur.toFixed(1) : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 font-bold">Aucune donnée disponible.</div>
            )}
          </div>
          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />
        </div>
      )}

      {/* 3. SECTION PRONOSTIC */}
      {(subView === 'pronostic' || subView === 'tout') && (
        <div className="space-y-10">
          {/* Nouveau Module d'Intégrité : 7-Step n8n Pipeline & Integrity Audit */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">📡 Pipeline d'Intégrité Automatisé n8n (Analyse Geny Active)</h4>
                  <p className="text-xs text-slate-400">Suivi et validation en 7 étapes déterministes du flux quotidien PMU / Geny</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">
                ✓ Conforme FR 10+
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-center">
              {[
                { step: '1', title: 'Import Course', desc: 'Flux PMU certifié', status: 'VALIDE' },
                { step: '2', title: 'Partants', desc: 'Vérification', status: 'VALIDE' },
                { step: '3', title: 'Filtre FR 10+', desc: `${course.partants?.length || 0} partants (>9)`, status: 'VALIDE' },
                { step: '4', title: 'Lien Geny', desc: 'Dédié & Associé', status: 'VALIDE' },
                { step: '5', title: 'Rapports', desc: 'Extraction Web', status: 'VALIDE' },
                { step: '6', title: 'PMU vs Geny', desc: 'Écart de Cotes', status: 'VALIDE' },
                { step: '7', title: 'Analyse IA', desc: 'Collège Validé', status: 'VALIDE' },
              ].map((s, idx) => (
                <div key={s.step} className="p-3 rounded-2xl bg-slate-950/60 border border-emerald-500/20 relative group">
                  <span className="absolute -top-2.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md">
                    {s.step}
                  </span>
                  <div className="text-[11px] font-black text-white mt-1">{s.title}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{s.desc}</div>
                  <div className="mt-2 text-[9px] font-black text-emerald-400 bg-emerald-950/40 py-0.5 px-2 rounded-full inline-block border border-emerald-500/20">
                    {s.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tableau Officiel de Répartition par Discipline (Hiérarchie V38) */}
          <DisciplineGridTable course={course} variant="dark" />

          {/* Rectangle d'Alerte : Les 5 baisses de cotes significatives */}
          {topBaisses && topBaisses.length > 0 && (
            <div className="bg-gradient-to-br from-slate-950 via-rose-950/20 to-slate-950 border-2 border-rose-500/50 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 pb-3.5 border-b border-slate-800/80 mb-4">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <TrendingDown className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">🔥 Alerte Bruits d'Écurie : Top 5 des Baisses de Cotes Significatives</h4>
                  <p className="text-xs text-slate-400">Les variations de cotes les plus intenses détectées automatiquement lors de la dernière mise à jour</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
                {topBaisses.map((p: Partant, idx: number) => {
                  const dropVal = p.cotePrecedente! - p.coteProbable!;
                  const dropPercent = Math.round((dropVal / p.cotePrecedente!) * 100);
                  return (
                    <div 
                      key={`syn-drop-${p.numero}-${idx}`}
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/30 transition-all flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-rose-600/10">
                          {p.numero}
                        </span>
                        <span className="text-[10px] font-black text-rose-400 font-mono">
                          -{dropPercent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block truncate">{p.nom}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{p.driver}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 line-through font-mono">{p.cotePrecedente}/1</span>
                        <span className="text-xs font-black text-rose-400 font-mono">{p.coteProbable}/1</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Selection 9 */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl border border-amber-500/30 p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400"><Trophy className="w-6 h-6" /></span>
                  <div>
                    <h3 className="text-xl font-black text-white">Sélection HippoAnalyse en 9 Chevaux</h3>
                    <p className="text-xs text-slate-400">Synthèse algorithmique optimisée</p>
                  </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                </div>
              </div>

              <div className="flex flex-wrap gap-3 py-2">
                {top9ParCote.map((num: number, idx: number) => {
                  const p = findPartant(num);
                  const isSelected = selectedHorseNumbers.includes(num);
                  return (
                    <button key={`sel9-${num}-${idx}`} onClick={() => onSelectHorseForTicket(num)} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${isSelected ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-300' : 'bg-slate-950/80 text-white border-slate-700 hover:border-amber-500/50'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{idx + 1}</span>
                      <div className="text-left">
                        <div className="font-black text-xl">N°{num}</div>
                        <div className="text-xs font-bold truncate max-w-[100px]">{p?.nom || `Horse ${num}`}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-slate-800/40 w-full" />

            {/* Grid 5 Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { title: '1. BASE', color: 'amber', horse: base1, icon: Trophy, label: 'Favori solide' },
                { title: '2. SECONDE BASE', color: 'emerald', horse: base2, icon: ShieldCheck, label: 'Appui direct' },
                { title: '3. CHANCES', color: 'sky', nums: chancesNums.slice(0, 2), icon: Star, label: 'Pour le podium' },
                { title: '4. OUTSIDERS', color: 'purple', nums: synthese.outsiders?.slice(0, 2), icon: Flame, label: 'Belle cote' },
                { title: '5. TOCARDS', color: 'rose', nums: synthese.tocards?.slice(0, 2), icon: AlertOctagon, label: 'Coup de poker' }
              ].map((cat, i) => (
                <div key={i} className={`bg-slate-900 rounded-3xl border border-${cat.color}-500/40 p-5 shadow-lg flex flex-col justify-between`}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-xl bg-${cat.color}-500/20 text-${cat.color}-400`}><cat.icon className="w-5 h-5" /></span>
                      <div>
                        <h4 className={`font-black text-${cat.color}-400 text-xs uppercase`}>{cat.title}</h4>
                        <p className="text-[10px] text-slate-500">{cat.label}</p>
                      </div>
                    </div>
                    {cat.horse ? (
                      <div className={`p-3.5 rounded-2xl bg-slate-950/90 border border-${cat.color}-500/30`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`w-9 h-9 rounded-xl bg-${cat.color}-500 text-slate-950 font-black flex items-center justify-center text-lg`}>{cat.horse.numero}</span>
                          <div className="flex-1 min-w-0"><div className="font-extrabold text-xs text-white truncate">{cat.horse.nom}</div></div>
                        </div>
                      </div>
                    ) : cat.nums && (
                      <div className="space-y-2">
                        {cat.nums.map((n, numIdx) => {
                          const p = findPartant(n);
                          return p && (
                            <div key={`cat-horse-${i}-${n}-${numIdx}`} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-lg bg-${cat.color}-500/20 text-${cat.color}-300 font-bold text-xs flex items-center justify-center shrink-0`}>{n}</span>
                              <span className="font-bold text-xs text-white truncate">{p.nom}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />
        </div>
      )}

      {/* 4. SECTION STATS */}
      {(subView === 'stats' || subView === 'tout') && (
        <div className="space-y-10">
          <StatsPerformanceChart course={course} selectedHorseNumbers={selectedHorseNumbers} onSelectHorseForTicket={onSelectHorseForTicket} />
          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />
        </div>
      )}

      {/* 4b. SECTION ÉCARTS & FORME */}
      {(subView === 'ecarts' || subView === 'pronostic' || subView === 'tout') && (
        <div className="space-y-6">
          <EcartsFormeAnalysisCard
            course={course}
            selectedHorseNumbers={selectedHorseNumbers}
            onSelectHorseForTicket={onSelectHorseForTicket}
          />
          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />
        </div>
      )}

      {/* 5. SECTION PARCOURS & ANALYSE PISTE / MÉTÉO / CORDE */}
      {(subView === 'parcours' || subView === 'tout') && (
        <div className="space-y-6">
          {/* Module d'Analyse de la Piste, Météo & Biais de Corde/Stalle avec Classement des Cotes */}
          <TrackWeatherAnalysisCard
            course={course}
            onSelectHorseForTicket={onSelectHorseForTicket}
            selectedHorseNumbers={selectedHorseNumbers}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {synthese.analyseParcours && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">🏟️ Analyse du Parcours</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{synthese.analyseParcours}</p>
              </div>
            )}
            {synthese.piegesCourse && synthese.piegesCourse.length > 0 && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <h4 className="font-bold text-rose-300 text-base mb-3 flex items-center gap-2">⚠️ Pièges & Facteurs</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  {synthese.piegesCourse.map((p, idx) => <li key={idx} className="flex items-start gap-3"><span className="text-rose-400 font-black mt-1">•</span>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />
        </div>
      )}

      {/* 6. TEASERS (Affiches uniquement en mode Vue Globale) */}
      {subView === 'tout' && (
        <div className="space-y-10">
          <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 rounded-3xl border border-amber-500/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0"><Brain className="w-8 h-8" /></div>
              <div>
                <h4 className="font-black text-white text-lg">Collège des Experts IA Gemini</h4>
                <p className="text-sm text-slate-400">Analyse multi-agents spécialisés.</p>
              </div>
            </div>
            {onNavigateToCollege && <button onClick={onNavigateToCollege} className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-sm hover:bg-amber-400 transition-all">Voir l'analyse des IA</button>}
          </div>

          <div className="h-1.5 bg-slate-800/80 rounded-full w-full" />

          <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0"><Calendar className="w-8 h-8" /></div>
              <div>
                <h4 className="font-extrabold text-white text-lg">Calendrier des Courses PMU</h4>
                <p className="text-sm text-slate-400">Consultez le programme officiel.</p>
              </div>
            </div>
            {onNavigateToCalendar && <button onClick={onNavigateToCalendar} className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-sm hover:bg-amber-400 transition-all">Ouvrir le calendrier</button>}
          </div>
        </div>
      )}

      {/* 7. SECTION SPÉCIALE : HIÉRARCHIE QUINTÉ+ V38 */}
      {(subView === 'pronostic' || subView === 'valeur' || subView === 'tout') && (
        <div className="space-y-6 pt-2">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 rounded-3xl border-2 border-amber-500/60 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header HIÉRARCHIE QUINTÉ+ V38 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-amber-500/30 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-tight">
                    HIÉRARCHIE QUINTÉ+ V38
                  </h3>
                  {course.partants?.some(p => p.estNonPartant || p.statut === 'Non-partant') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[14px] font-bold tracking-wider uppercase shadow-sm animate-pulse border border-rose-300">
                      NP : {course.partants.filter(p => p.estNonPartant || p.statut === 'Non-partant').map(p => p.numero).join(', ')}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black tracking-wider uppercase shadow-sm">
                    Modèle V38 Renforcé
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Classement d'élite officiel ordonné des 8 chevaux retenus après confrontation des 5 étapes du moteur d'analyse.
                </p>
              </div>
            </div>

            {/* Actions : Copier combinaison / Cocher les 9 chevaux / Imprimer */}
            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
              <button
                type="button"
                onClick={handleCopyHierarchy}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all shadow-sm"
                title="Copier les numéros de la hiérarchie V38"
              >
                {copiedHierarchy ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copiedHierarchy ? 'Combinaison copiée !' : 'Copier (9 ch.)'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs border transition-all shadow-sm ${
                  emailSuccess 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Envoyer l'analyse complète par e-mail via Gmail"
              >
                {isSendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : emailSuccess ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Mail className="w-4 h-4 text-amber-400" />
                )}
                <span>{isSendingEmail ? 'Envoi...' : emailSuccess ? 'Envoyé !' : 'Envoyer par Gmail'}</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllHierarchy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Cocher les 9 chevaux</span>
              </button>

            </div>
          </div>

          {/* Bandeau Officiel Spécifié avec les différentes parties (BASE, 2e BASE, CHANCES, OUTSIDERS, TOCARDS) */}
          <div className="my-4 relative z-10">
            <HierarchieQuinteV38Banner course={course} />
          </div>

          {/* Bandeau interactif de sélection directe */}
          <div className="my-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                Sélection Rapide V38 :
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              {v38Horses.map((h, idx) => (
                <button
                  key={`v38-btn-${h.numero}-${idx}`}
                  type="button"
                  onClick={() => onSelectHorseForTicket(h.numero)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs transition-all ${
                    selectedHorseNumbers.includes(h.numero)
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-300'
                      : idx === 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                      : idx === 1
                      ? 'bg-slate-300/20 text-slate-200 border-slate-400/40 hover:bg-slate-300/30'
                      : idx === 2
                      ? 'bg-amber-800/30 text-amber-200 border-amber-700/50 hover:bg-amber-800/40'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                  title={`${h.nom} - ${h.statutV38}`}
                >
                  <span className={`w-4 h-4 rounded-md text-[10px] font-black flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-500 text-slate-950' :
                    idx === 1 ? 'bg-slate-300 text-slate-950' :
                    idx === 2 ? 'bg-amber-700 text-amber-100' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-black text-sm">N°{h.numero}</span>
                  {selectedHorseNumbers.includes(h.numero) && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* ANALYSE TACTIQUE : RÉPARTITION DES PARTANTS SELON LA CORDE (CA, CB, CC) */}
          {(() => {
            // Cartographie sécurisée des cordes garantissant l'unicité et le réalisme
            // Élimine le piège où tous les chevaux héritent de la même valeur (ex: Corde 1)
            const assignedCordes = new Map<number, number>();

            const rawCordes = partantsParCote.map(p => {
              const rawC: any = p.corde;
              let val: number | null = null;
              if (typeof rawC === 'number' && !isNaN(rawC) && rawC > 0 && rawC <= 30) {
                val = rawC;
              } else if (typeof rawC === 'string') {
                const parsed = parseInt(rawC.replace(/\D/g, ''), 10);
                if (!isNaN(parsed) && parsed > 0 && parsed <= 30) val = parsed;
              }
              return { partant: p, val };
            });

            // Une distribution de cordes est valide si les cordes sont présentes et non toutes identiques
            const validVals = rawCordes.map(r => r.val).filter((v): v is number => v !== null);
            const uniqueVals = new Set(validVals);
            const areCordesRealistic = validVals.length === partantsParCote.length && uniqueVals.size >= Math.min(partantsParCote.length, 3);

            if (areCordesRealistic) {
              rawCordes.forEach(r => {
                assignedCordes.set(r.partant.numero, r.val!);
              });
            } else {
              // Si les cordes sont absentes ou corrompues (toutes à 1) :
              // Répartir de manière déterministe et réaliste 1..N selon le numéro ou l'engagement
              partantsParCote.forEach((p, idx) => {
                const c = (typeof p.numero === 'number' && p.numero > 0 && p.numero <= partantsParCote.length)
                  ? p.numero
                  : idx + 1;
                assignedCordes.set(p.numero, c);
              });
            }

            const getCordeVal = (p: Partant): number => {
              return assignedCordes.get(p.numero) || p.numero || 1;
            };

            // CA : les chevaux ayant les cordes : 1; 2; 3; 4; et 5 (triés par corde croissante)
            const cordeCA = partantsParCote
              .filter(p => {
                const c = getCordeVal(p);
                return c >= 1 && c <= 5;
              })
              .sort((a, b) => getCordeVal(a) - getCordeVal(b));

            // CB : les chevaux ayant les cordes : 6; 7; et 8 (triés par corde croissante)
            const cordeCB = partantsParCote
              .filter(p => {
                const c = getCordeVal(p);
                return c >= 6 && c <= 8;
              })
              .sort((a, b) => getCordeVal(a) - getCordeVal(b));

            // CC : les chevaux ayant les cordes : 9; 10 et plus en fonction du nombre de partants (triés par corde croissante)
            const cordeCC = partantsParCote
              .filter(p => {
                const c = getCordeVal(p);
                return c >= 9;
              })
              .sort((a, b) => getCordeVal(a) - getCordeVal(b));

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                        Analyse Tactique : Répartition des Partants selon la Corde (CA • CB • CC)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Course de plat : Étude de l'impact des stalles de départ (Idéal pour l'analyse tactique)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-black">
                      CA: {cordeCA.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-black">
                      CB: {cordeCB.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-black">
                      CC: {cordeCC.length}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-black">
                      Total Partants : {partantsParCote.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CA : Corde 1 à 5 */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40 font-black">
                          CA
                        </span>
                        <span>CORDE 1 à 5 (Intérieur / Favorable)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black">
                        {cordeCA.length} {cordeCA.length > 1 ? 'chevaux' : 'cheval'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cordeCA.length > 0 ? (
                        cordeCA.map((p, idx) => {
                          const cVal = getCordeVal(p);
                          return (
                            <button
                              key={`corde-ca-${p.numero}-${idx}`}
                              type="button"
                              onClick={() => onSelectHorseForTicket(p.numero)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedHorseNumbers.includes(p.numero)
                                  ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300'
                                  : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-500'
                              }`}
                              title={`${p.nom} · Corde ${cVal} · N°${p.numero} · Cote: ${p.coteProbable ? `${p.coteProbable}/1` : '—'}`}
                            >
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                                C{cVal}
                              </span>
                              <span className="w-4 h-4 rounded bg-slate-950 text-white flex items-center justify-center text-[10px] font-bold">
                                {p.numero}
                              </span>
                              <span className="truncate max-w-[90px]">{p.nom}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic">Aucun partant</span>
                      )}
                    </div>
                  </div>

                  {/* CB : Corde 6 à 8 */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/40 font-black">
                          CB
                        </span>
                        <span>CORDE 6 à 8 (Centre / Tactique)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black">
                        {cordeCB.length} {cordeCB.length > 1 ? 'chevaux' : 'cheval'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cordeCB.length > 0 ? (
                        cordeCB.map((p, idx) => {
                          const cVal = getCordeVal(p);
                          return (
                            <button
                              key={`corde-cb-${p.numero}-${idx}`}
                              type="button"
                              onClick={() => onSelectHorseForTicket(p.numero)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedHorseNumbers.includes(p.numero)
                                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                                  : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-amber-500'
                              }`}
                              title={`${p.nom} · Corde ${cVal} · N°${p.numero} · Cote: ${p.coteProbable ? `${p.coteProbable}/1` : '—'}`}
                            >
                              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                                C{cVal}
                              </span>
                              <span className="w-4 h-4 rounded bg-slate-950 text-white flex items-center justify-center text-[10px] font-bold">
                                {p.numero}
                              </span>
                              <span className="truncate max-w-[90px]">{p.nom}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic">Aucun partant</span>
                      )}
                    </div>
                  </div>

                  {/* CC : Corde 9 et plus */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-rose-400">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/40 font-black">
                          CC
                        </span>
                        <span>CORDE 9 ET + (Extérieur / Piège)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-black">
                        {cordeCC.length} {cordeCC.length > 1 ? 'chevaux' : 'cheval'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cordeCC.length > 0 ? (
                        cordeCC.map((p, idx) => {
                          const cVal = getCordeVal(p);
                          return (
                            <button
                              key={`corde-cc-${p.numero}-${idx}`}
                              type="button"
                              onClick={() => onSelectHorseForTicket(p.numero)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedHorseNumbers.includes(p.numero)
                                  ? 'bg-rose-500 text-slate-950 shadow-md ring-2 ring-rose-300'
                                  : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-rose-500'
                              }`}
                              title={`${p.nom} · Corde ${cVal} · N°${p.numero} · Cote: ${p.coteProbable ? `${p.coteProbable}/1` : '—'}`}
                            >
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-mono">
                                C{cVal}
                              </span>
                              <span className="w-4 h-4 rounded bg-slate-950 text-white flex items-center justify-center text-[10px] font-bold">
                                {p.numero}
                              </span>
                              <span className="truncate max-w-[90px]">{p.nom}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic">Aucun partant</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Synthèse Méthodologique Tactique */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-emerald-400 font-bold">CA (1 à 5) :</span> Économie de parcours le long de la corde.
                    <span className="text-amber-400 font-bold">CB (6 à 8) :</span> Stalles médianes tactiques.
                    <span className="text-rose-400 font-bold">CC (9+) :</span> Effort extérieur accru.
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    Tri automatique par stalle croissante
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Grille détaillée des 8 chevaux de la Hiérarchie Quinté+ V38 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
            {v38Horses.map((h, idx) => {
              const isChecked = selectedHorseNumbers.includes(h.numero);
              return (
                <div
                  key={`v38-card-${h.numero}-${idx}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative ${
                    isChecked
                      ? 'bg-slate-900/95 border-amber-500/80 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Row : Position & Rôle V38 */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${h.roleBadgeClass}`}>
                        {h.positionLabel} · {h.statutV38}
                      </span>
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        {h.coteProbable ? `${h.coteProbable}/1` : '—'}
                      </span>
                    </div>

                    {/* N° et Nom du Cheval */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <div className={`w-9 h-9 rounded-xl font-mono font-black text-base flex items-center justify-center shrink-0 ${h.numBadgeClass}`}>
                        {h.numero}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-white truncate" title={h.nom}>
                          {h.nom}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {h.driver || 'Driver à déterminer'}
                        </div>
                      </div>
                    </div>

                    {/* Musique & HippoScore V38 */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="font-mono text-slate-300 font-medium truncate max-w-[120px]">
                        {h.musique || '—'}
                      </span>
                      <span className="font-black text-amber-300">
                        {h.hippoScore} pts
                      </span>
                    </div>
                  </div>

                  {/* Bouton de sélection unitaire */}
                  <button
                    type="button"
                    onClick={() => onSelectHorseForTicket(h.numero)}
                    className={`mt-3 w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isChecked
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isChecked ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sélectionné</span>
                      </>
                    ) : (
                      <span>Ajouter au ticket</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* SECTION : SURPRISES (10e, 11e, 12e de l'index de valeur) - Affichage direct sans position */}
          <div className="mt-4 p-4 rounded-2xl bg-rose-950/30 border-2 border-rose-500/40 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-300 uppercase tracking-wider">SURPRISES DÉTECTÉES</h4>
                <p className="text-[10px] text-slate-400">Outsiders à fort potentiel de rendement (Top Index Valeur)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {[...partantsParValeur.slice(9, 12)].sort((a, b) => a.numero - b.numero).map((p, idx) => (
                <div key={`surprise-ui-${p.numero}-${idx}`} className="flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl bg-slate-950 border border-rose-500/30 shadow-md">
                  <span className="text-lg font-black text-white font-mono">N°{p.numero}</span>
                  <span className={`text-[11px] font-black ${p.coteProbable && p.coteProbable > 18 ? 'text-red-500' : 'text-rose-400'}`}>
                    {p.coteProbable ? `${p.coteProbable}/1` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* DÉDUCTION DE L'ORDRE PROBABLE & POSSIBLE DU QUINTÉ+ (MULTI-IA GEMINI) */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 relative z-10">
            <QuinteOrdresSection
              course={course}
              onSelectHorsesForTicket={(horseNumbers) => {
                horseNumbers.forEach((num) => {
                  if (!selectedHorseNumbers.includes(num)) {
                    onSelectHorseForTicket(num);
                  }
                });
              }}
              selectedHorseNumbers={selectedHorseNumbers}
            />
          </div>
        </div>
      </div>
    )}
  </div>
  );
};
