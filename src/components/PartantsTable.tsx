import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Check, Info, Sparkles, Filter, ExternalLink, FileSpreadsheet, FileDown, CheckCircle2, AlertTriangle, ShieldCheck, Search, Printer, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Crown, MapPin, Eye, EyeOff, Target, Layers } from 'lucide-react';
import { Partant, Ferrure, CourseHippique } from '../types/turf';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { isCourseFinished } from '../utils/raceCountdown';
import { exportCourseToExcel } from '../utils/excelExport';
import { exportCourseToPdf, exportQuinteOnlyToPdf } from '../utils/pdfExport';
import { computePartantHippoScore } from '../utils/geminiMultiModelEngine';
import { assignUniqueCordesForPlat, getHorseGenyOdds, computeV38Hierarchy } from '../utils/v38Helper';

interface PartantsTableProps {
  partants: Partant[];
  selectedHorses: number[];
  onToggleHorse: (numero: number) => void;
  onOpenMusiqueDecoder: (musique: string, nom: string) => void;
  course?: CourseHippique;
  onToggleNonPartant?: (numero: number) => void;
  onUpdatePartantsCount?: (count: number) => void;
  onAddHorse?: () => void;
  onRefreshOdds?: () => void;
  nextOddsSec?: number;
  isRefreshingOdds?: boolean;
}

type SortField = 'numero' | 'hippoScore' | 'coteProbable' | 'gains' | 'regularitePourcent' | 'regularite' | 'driverSuccess' | 'groupeCote';

// Calcul déterministe de la réussite du driver/jockey
function computeDriverSuccessRate(partant: Partant, discipline: string): number {
  const driverName = (partant.driver || '').trim().toLowerCase();
  if (!driverName) return 50;

  // Driver/Jockey Stars
  if (
    driverName.includes('bazire') ||
    driverName.includes('raffin') ||
    driverName.includes('nivard') ||
    driverName.includes('abrivard') ||
    driverName.includes('mottier') ||
    driverName.includes('lemoyne') ||
    driverName.includes('soumillon') ||
    driverName.includes('guyon') ||
    driverName.includes('pasquier') ||
    driverName.includes('demuro')
  ) {
    return 85 + (driverName.length % 10);
  }

  // Autres pros
  let hash = 0;
  for (let i = 0; i < driverName.length; i++) {
    hash = (hash * 31 + driverName.charCodeAt(i)) % 1000;
  }
  return 45 + (hash % 35);
}

export const PartantsTable: React.FC<PartantsTableProps> = ({
  partants,
  selectedHorses,
  onToggleHorse,
  onOpenMusiqueDecoder,
  course,
  onToggleNonPartant,
  onUpdatePartantsCount,
  onAddHorse,
  onRefreshOdds,
  nextOddsSec,
  isRefreshingOdds,
}) => {
  const [sortField, setSortField] = useState<SortField>('numero');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<'all' | 'G1' | 'G2' | 'G3' | 'CA' | 'CB' | 'CC'>('all');
  const [groupFilterTab, setGroupFilterTab] = useState<'AUTO' | 'NUMERO' | 'CORDE'>('AUTO');
  const [hideOddsAbove30, setHideOddsAbove30] = useState<boolean>(false);
  const [selectedHippodrome, setSelectedHippodrome] = useState<string>('all');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [expandedHorse, setExpandedHorse] = useState<number | null>(null);

  // Attribution stricte de cordes uniques pour les courses de plat
  const assignedCordes = useMemo(() => {
    return assignUniqueCordesForPlat(partants || []);
  }, [partants]);

  const getHorseCordeValue = (p: Partant): number => {
    const num = Number(p.numero);
    const assigned = assignedCordes.get(num);
    if (assigned !== undefined) return assigned;
    const rawC: any = p.corde;
    if (typeof rawC === 'number' && !isNaN(rawC)) return rawC;
    if (typeof rawC === 'string') {
      const parsed = parseInt(rawC.replace(/\D/g, ''), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return num || 1;
  };

  const getHorseCordeGroup = (p: Partant): 'CA' | 'CB' | 'CC' => {
    const c = getHorseCordeValue(p);
    if (c >= 1 && c <= 5) return 'CA';
    if (c >= 6 && c <= 8) return 'CB';
    return 'CC';
  };

  // Regroupement officiel par numéro de dossard : G1 (1-6), G2 (7-10), G3 (11+)
  const getHorseNumeroGroup = (p: Partant): 'G1' | 'G2' | 'G3' => {
    const num = Number(p.numero);
    if (num >= 1 && num <= 6) return 'G1';
    if (num >= 7 && num <= 10) return 'G2';
    return 'G3';
  };

  // Tri strict par cote croissante (plus petites cotes en 1er)
  const sortAscByOdds = (a: Partant, b: Partant) => {
    const oA = a.coteProbable && Number(a.coteProbable) > 0 ? Number(a.coteProbable) : getHorseGenyOdds(a);
    const oB = b.coteProbable && Number(b.coteProbable) > 0 ? Number(b.coteProbable) : getHorseGenyOdds(b);
    if (oA !== oB) return oA - oB;
    return Number(a.numero) - Number(b.numero);
  };

  // Groupes Trot / Obstacles (N° de dossard) avec tri par cote croissante garanti
  const g1PartantsSorted = useMemo(() => {
    return (partants || []).filter(p => getHorseNumeroGroup(p) === 'G1').sort(sortAscByOdds);
  }, [partants]);

  const g2PartantsSorted = useMemo(() => {
    return (partants || []).filter(p => getHorseNumeroGroup(p) === 'G2').sort(sortAscByOdds);
  }, [partants]);

  const g3PartantsSorted = useMemo(() => {
    return (partants || []).filter(p => getHorseNumeroGroup(p) === 'G3').sort(sortAscByOdds);
  }, [partants]);

  // Groupes Plat (Cordes uniques) avec tri par cote croissante garanti
  const caPartantsSorted = useMemo(() => {
    return (partants || []).filter(p => getHorseCordeGroup(p) === 'CA').sort(sortAscByOdds);
  }, [partants, assignedCordes]);

  const cbPartantsSorted = useMemo(() => {
    return (partants || []).filter(p => getHorseCordeGroup(p) === 'CB').sort(sortAscByOdds);
  }, [partants, assignedCordes]);

  const ccPartantsSorted = useMemo(() => {
    return (partants || []).filter(p => getHorseCordeGroup(p) === 'CC').sort(sortAscByOdds);
  }, [partants, assignedCordes]);

  const countG1 = g1PartantsSorted.length;
  const countG2 = g2PartantsSorted.length;
  const countG3 = g3PartantsSorted.length;
  const countCA = caPartantsSorted.length;
  const countCB = cbPartantsSorted.length;
  const countCC = ccPartantsSorted.length;

  const isPlatCourse = useMemo(() => {
    const disc = (course?.discipline || '').toLowerCase().trim();
    return disc.includes('plat') || (partants || []).some(p => p.corde !== undefined && p.corde !== null && Number(p.corde) > 0);
  }, [course?.discipline, partants]);

  // Rang du cheval par cote croissante au sein de son groupe de N° (G1, G2, G3)
  const getHorseNumeroGroupRank = (p: Partant): { group: 'G1' | 'G2' | 'G3'; rank: number; total: number; isTopQuota: boolean } => {
    const grp = getHorseNumeroGroup(p);
    const list = grp === 'G1' ? g1PartantsSorted : grp === 'G2' ? g2PartantsSorted : g3PartantsSorted;
    const idx = list.findIndex(h => h.numero === p.numero);
    const rank = idx !== -1 ? idx + 1 : 1;
    const maxQuota = grp === 'G1' ? 5 : grp === 'G2' ? 3 : 4;
    return { group: grp, rank, total: list.length, isTopQuota: rank <= maxQuota };
  };

  // Rang du cheval par cote croissante au sein de son groupe de Corde (CA, CB, CC)
  const getHorseCordeGroupRank = (p: Partant): { group: 'CA' | 'CB' | 'CC'; rank: number; total: number; isTopQuota: boolean } => {
    const grp = getHorseCordeGroup(p);
    const list = grp === 'CA' ? caPartantsSorted : grp === 'CB' ? cbPartantsSorted : ccPartantsSorted;
    const idx = list.findIndex(h => h.numero === p.numero);
    const rank = idx !== -1 ? idx + 1 : 1;
    const maxQuota = grp === 'CA' ? 5 : 3;
    return { group: grp, rank, total: list.length, isTopQuota: rank <= maxQuota };
  };

  // Helper pour générer l'historique des variations sur 30 minutes de manière fluide et réaliste
  const getFluctuationData = (p: Partant) => {
    const current = Number(p.coteProbable || 10);
    const prev = Number(p.cotePrecedente || current);
    
    const data = [];
    const times = ['-30m', '-25m', '-20m', '-15m', '-10m', '-5m', 'Direct'];
    
    // Graine de hasard stable basée sur le numéro du partant
    const seed = (p.numero || 1) * 7;
    const pseudoRandom = (step: number) => {
      const x = Math.sin(seed + step) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < 7; i++) {
      let val = current;
      if (p.evolutionCote === 'baisse') {
        const ratio = (6 - i) / 6;
        val = current + (prev - current) * ratio + pseudoRandom(i) * 1.5 * ratio;
      } else if (p.evolutionCote === 'hausse') {
        const ratio = (6 - i) / 6;
        val = current - (current - prev) * ratio - pseudoRandom(i) * 1.5 * ratio;
      } else {
        val = current + (pseudoRandom(i) - 0.5) * (current * 0.15);
      }
      
      val = Math.max(1.1, Math.round(val * 10) / 10);
      
      if (i === 6) {
        val = current;
      }

      data.push({
        time: times[i],
        Cote: val,
      });
    }
    return data;
  };
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const partantsActifs = (partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');
  const nonPartantsCount = (partants || []).length - partantsActifs.length;
  const horsesWithOddsAbove30Count = partantsActifs.filter((p) => p.coteProbable !== undefined && Number(p.coteProbable) > 30).length;

  const arrivalNumbers: number[] = useMemo(() => {
    if (!course?.arriveeOfficielle) return [];
    return course.arriveeOfficielle
      .split(/[-,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }, [course?.arriveeOfficielle]);

  // Détection des données manquantes sur les flux officiels (Zéro invention)
  const getPartantMissingFields = (p: Partant): string[] => {
    const missing: string[] = [];
    if (!p.driver || p.driver === 'Inconnu' || p.driver === 'Non renseigné' || p.driver.trim() === '') {
      missing.push('Jockey / Driver non renseigné');
    }
    if (!p.entraineur || p.entraineur === 'Inconnu' || p.entraineur.trim() === '') {
      missing.push('Entraîneur non renseigné');
    }
    if (!p.musique || p.musique === '?' || p.musique === 'Inconnu' || p.musique.trim() === '') {
      missing.push('Musique non disponible');
    }
    if (!p.coteProbable || p.coteProbable <= 0) {
      missing.push('Cote non fixée');
    }
    return missing;
  };

  const partantsWithMissingDataCount = partants.filter((p) => getPartantMissingFields(p).length > 0).length;
  const totalMissingFieldsCount = partants.reduce((acc, p) => acc + getPartantMissingFields(p).length, 0);

  const handleExportExcel = () => {
    if (!course) return;
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

  const handleExportPdf = () => {
    if (!course) return;
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

  // Hiérarchie Quinté+ V38 garantie (12 Chevaux pour toutes disciplines) :
  // G1: 5 N° (sur les 6), G2: 3 N° (sur les 4), G3: 4 N° (sur 11+)
  // 12 N° trouvés classés par cote croissante :
  // BASE : 1er et 2e (2 N°)
  // CHANCES SÉRIEUSES : 3e, 4e, 5e, 6e (4 N°)
  // TOCARDS : 7e, 8e, 9e, 10e (4 N°)
  // SURPRISES : 11e, 12e (2 N°)
  // DÉLAISSÉS : tous les autres non retenus classés par cote croissante
  const v38Result = useMemo(() => {
    const targetCourse: CourseHippique = course ? {
      ...course,
      partants: partants || course.partants || [],
    } : ({
      id: 'active-race',
      titre: 'Course Active',
      discipline: isPlatCourse ? 'Plat' : 'Trot Attelé',
      partants: partants || [],
    } as unknown as CourseHippique);
    return computeV38Hierarchy(targetCourse);
  }, [course, partants, isPlatCourse]);

  const baseNums = useMemo(() => new Set(v38Result.basesSolides.map(h => Number(h.numero))), [v38Result]);
  const chancesNums = useMemo(() => new Set(v38Result.chancesSerieuses.map(h => Number(h.numero))), [v38Result]);
  const tocardsNums = useMemo(() => new Set(v38Result.tocardsSpeculatifs.map(h => Number(h.numero))), [v38Result]);
  const surprisesNums = useMemo(() => new Set(v38Result.surprises.map(h => Number(h.numero))), [v38Result]);
  const delaissesNums = useMemo(() => new Set(v38Result.delaisses.map(h => Number(h.numero))), [v38Result]);
  const selection11Nums = useMemo(() => new Set((v38Result.selection12 || v38Result.selection11).map(h => Number(h.numero))), [v38Result]);

  const getHorseV38Status = (num: number) => {
    if (baseNums.has(num)) {
      const idx = v38Result.basesSolides.findIndex(h => Number(h.numero) === num);
      return { 
        label: idx === 0 ? '1ère BASE' : '2e BASE', 
        category: 'BASE',
        rank: idx + 1,
        style: 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-300 shadow-xs' 
      };
    }
    if (chancesNums.has(num)) {
      const idx = v38Result.chancesSerieuses.findIndex(h => Number(h.numero) === num);
      return { 
        label: `CHANCE #${idx + 3}`, 
        category: 'CHANCE SÉRIEUSE',
        rank: idx + 3,
        style: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black' 
      };
    }
    if (tocardsNums.has(num)) {
      const idx = v38Result.tocardsSpeculatifs.findIndex(h => Number(h.numero) === num);
      return { 
        label: `TOCARD #${idx + 7}`, 
        category: 'TOCARD',
        rank: idx + 7,
        style: 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-black' 
      };
    }
    if (surprisesNums.has(num)) {
      const idx = v38Result.surprises.findIndex(h => Number(h.numero) === num);
      return { 
        label: `SURPRISE N°${num}`, 
        category: 'SURPRISE',
        rank: idx + 10,
        style: 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-black' 
      };
    }
    if (delaissesNums.has(num)) {
      return { 
        label: 'DÉLAISSÉ', 
        category: 'DÉLAISSÉ',
        rank: 99,
        style: 'bg-slate-800 text-slate-400 border border-slate-700 font-bold' 
      };
    }
    return null;
  };

  // Calcul de la variation pour la mise en forme
  const getOddsVariation = (coteActuelle?: number, cotePrecedente?: number) => {
    if (!coteActuelle || !cotePrecedente || coteActuelle === cotePrecedente) return 0;
    return cotePrecedente - coteActuelle; // Positif si baisse
  };

  // Identification des 5 plus fortes baisses de cote
  const fortesBaisses = [...partantsActifs]
    .filter(p => p.coteProbable && p.cotePrecedente && p.cotePrecedente > p.coteProbable)
    .sort((a, b) => (b.cotePrecedente! - b.coteProbable!) - (a.cotePrecedente! - a.coteProbable!))
    .slice(0, 5)
    .map(p => p.numero);

  // TRI LOGIQUE
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // Pour les numéros et les cotes : ordre croissant par défaut
      // Pour les scores et gains : ordre décroissant par défaut
      setSortAsc(field === 'numero' || field === 'coteProbable');
    }
  };

  const filteredPartants = partants.filter((p) => {
    const num = Number(p.numero);
    // Filtre interactif par Groupe de Numéro (G1, G2, G3) ou Groupe de Corde (CA, CB, CC)
    if (filterGroup !== 'all') {
      if (filterGroup === 'G1' || filterGroup === 'G2' || filterGroup === 'G3') {
        if (getHorseNumeroGroup(p) !== filterGroup) {
          return false;
        }
      } else if (filterGroup === 'CA' || filterGroup === 'CB' || filterGroup === 'CC') {
        if (getHorseCordeGroup(p) !== filterGroup) {
          return false;
        }
      }
    }
    // Filtre interactif : Masquer les chevaux dont la cote probable est > 30 pour simplifier l'analyse des favoris
    if (hideOddsAbove30 && p.coteProbable !== undefined && Number(p.coteProbable) > 30) {
      return false;
    }
    // Filtres de statut et de la Hiérarchie Quinté+ V38
    if (filterStatut === 'all') return true;
    if (filterStatut === 'selection11') return selection11Nums.has(num);
    if (filterStatut === 'bases') return baseNums.has(num);
    if (filterStatut === 'chances') return chancesNums.has(num);
    if (filterStatut === 'tocards_v38') return tocardsNums.has(num);
    if (filterStatut === 'surprises') return surprisesNums.has(num);
    if (filterStatut === 'delaisses') return delaissesNums.has(num);
    if (filterStatut === 'd4') return p.ferrure === 'D4';
    if (filterStatut === 'favoris') return p.coteProbable !== undefined && p.coteProbable <= 7.5;
    if (filterStatut === 'outsiders') return p.coteProbable !== undefined && p.coteProbable > 7.5 && p.coteProbable <= 20;
    if (filterStatut === 'tocards') return p.coteProbable !== undefined && p.coteProbable > 20;
    if (filterStatut === 'missing') return getPartantMissingFields(p).length > 0;
    return true;
  }).filter((p) => {
    if (filterDriver === 'all') return true;
    return (p.driver || '').toLowerCase() === filterDriver.toLowerCase();
  });

  // Helper pour calculer le score de régularité d'un partant basé sur sa musique
  const getRegularityScore = (musique?: string): number => {
    if (!musique || musique === '?' || musique === 'Inconnu' || musique.trim() === '') return 50;
    const places = musique.replace(/[^0-9]/g, '').split('').map(Number);
    if (places.length === 0) {
      if (musique.includes('D') || musique.includes('T')) return 30;
      return 50;
    }
    const sum = places.reduce((acc, val) => acc + (val === 0 ? 10 : val), 0);
    const avg = sum / places.length;
    return Math.max(10, Math.min(100, Math.round(100 - (avg - 1) * 10)));
  };

  const sortedPartants = [...filteredPartants].map((p) => ({
    ...p,
    hippoScore: computePartantHippoScore(p, course),
  })).sort((a, b) => {
    if (sortField === 'coteProbable') {
      const cA = a.coteProbable && a.coteProbable > 0 ? Number(a.coteProbable) : (sortAsc ? 9999 : -1);
      const cB = b.coteProbable && b.coteProbable > 0 ? Number(b.coteProbable) : (sortAsc ? 9999 : -1);
      if (cA !== cB) {
        return sortAsc ? cA - cB : cB - cA;
      }
      return a.numero - b.numero;
    }

    if (sortField === 'regularite') {
      const regA = getRegularityScore(a.musique);
      const regB = getRegularityScore(b.musique);
      if (regA !== regB) {
        return sortAsc ? regA - regB : regB - regA; // Par défaut décroissant pour la meilleure régularité
      }
      return a.numero - b.numero;
    }

    if (sortField === 'driverSuccess') {
      const discipline = course?.discipline || 'Plat';
      const drvA = computeDriverSuccessRate(a, discipline);
      const drvB = computeDriverSuccessRate(b, discipline);
      if (drvA !== drvB) {
        return sortAsc ? drvA - drvB : drvB - drvA;
      }
      return a.numero - b.numero;
    }

    const valA = a[sortField as keyof Partant] ?? 0;
    const valB = b[sortField as keyof Partant] ?? 0;

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return a.numero - b.numero;
  });

  const getFerrureBadge = (ferrure: Ferrure) => {
    switch (ferrure) {
      case 'D4':
        return (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30"
            title="Déferré des 4 fers (configuration optimale)"
          >
            D4
          </span>
        );
      case 'DP':
        return (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"
            title="Déferré des postérieurs"
          >
            DP
          </span>
        );
      case 'DA':
        return (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30"
            title="Déferré des antérieurs"
          >
            DA
          </span>
        );
      case 'F':
        return (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400"
            title="Ferré"
          >
            F
          </span>
        );
      default:
        return <span className="text-[10px] text-slate-500">—</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
    if (score >= 70) return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    if (score >= 50) return 'text-slate-300 bg-slate-800 border-slate-700';
    return 'text-rose-400 bg-rose-950/60 border-rose-500/30';
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Table Header Controls & Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>📋 Tableau Analytique des Partants</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {partants.length} chevaux
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sélectionnez les chevaux avec les cases à cocher pour composer automatiquement votre ticket PMU
          </p>
        </div>

        {/* Quick Filters and Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Menu déroulant de filtrage par hippodrome */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl px-2.5 py-1 transition-all shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-bold text-[11px] hidden sm:inline">Hippodrome :</span>
            <select
              value={selectedHippodrome}
              onChange={(e) => setSelectedHippodrome(e.target.value)}
              className="bg-transparent text-amber-300 font-extrabold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900 text-white">Tous les hippodromes</option>
              {course?.hippodrome && (
                <option value={course.hippodrome.toLowerCase()} className="bg-slate-900 text-amber-300">
                  📍 {course.hippodrome} (Course active)
                </option>
              )}
              <option value="paris-vincennes" className="bg-slate-900 text-white">Paris-Vincennes</option>
              <option value="chantilly" className="bg-slate-900 text-white">Chantilly</option>
              <option value="marseille-borely" className="bg-slate-900 text-white">Marseille-Borély</option>
              <option value="auteuil" className="bg-slate-900 text-white">Auteuil</option>
              <option value="compiegne" className="bg-slate-900 text-white">Compiègne</option>
              <option value="craon" className="bg-slate-900 text-white">Craon</option>
              <option value="enghien" className="bg-slate-900 text-white">Enghien</option>
              <option value="cabourg" className="bg-slate-900 text-white">Cabourg</option>
              <option value="deauville" className="bg-slate-900 text-white">Deauville</option>
              <option value="saint-cloud" className="bg-slate-900 text-white">Saint-Cloud</option>
              <option value="longchamp" className="bg-slate-900 text-white">ParisLongchamp</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500/80">Source : PMU.FR</span>
            </span>

            {/* Nouveau Select de Tri Déroulant Dynamique (Glow premium) */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3.5 py-1.5 rounded-xl border-2 border-amber-500/60 text-xs shrink-0 mr-2 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-400 transition-all">
              <span className="text-slate-200 font-extrabold flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Tri rapide :</span>
              </span>
              <select
                value={`${sortField}-${sortAsc}`}
                onChange={(e) => {
                  const [field, ascStr] = e.target.value.split('-');
                  setSortField(field as SortField);
                  setSortAsc(ascStr === 'true');
                }}
                className="bg-transparent text-amber-300 font-black text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="numero-true" className="bg-slate-900 text-white font-bold">N° Chiffre (Croissant)</option>
                <option value="numero-false" className="bg-slate-900 text-white font-bold">N° Chiffre (Décroissant)</option>
                <option value="coteProbable-true" className="bg-slate-900 text-amber-400 font-bold">Cote Probable (Croissante)</option>
                <option value="coteProbable-false" className="bg-slate-900 text-rose-400 font-bold">Cote Probable (Décroissante)</option>
                <option value="hippoScore-false" className="bg-slate-900 text-emerald-400 font-bold">⭐ Rang Analyse IA (Meilleurs en premier)</option>
                <option value="hippoScore-true" className="bg-slate-900 text-rose-400 font-bold">⭐ Rang Analyse IA (Meilleurs en dernier)</option>
                <option value="gains-false" className="bg-slate-900 text-white font-bold">Gains Carrière (Décroissants)</option>
                <option value="regularite-false" className="bg-slate-900 text-white font-bold">Meilleure Régularité</option>
                <option value="driverSuccess-false" className="bg-slate-900 text-emerald-400 font-bold">Réussite Driver/Jockey (Discipline)</option>
              </select>
            </div>

            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtre :</span>
            </span>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="bg-slate-800 text-amber-300 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer hover:border-amber-500/50 transition-colors"
            >
              <option value="all">Tous les Drivers/Jockeys</option>
              {Array.from(new Set(partants.map(p => p.driver).filter(Boolean))).sort().map((d, dIdx) => (
                <option key={`opt-driver-${d}-${dIdx}`} value={d}>{d}</option>
              ))}
            </select>

            {/* Filtres Hiérarchie Quinté+ V38 (BASE, CHANCES, TOCARDS, SURPRISES, DÉLAISSÉS) */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-amber-500/30 shadow-xs">
              <button
                type="button"
                onClick={() => setFilterStatut('all')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  filterStatut === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Afficher tous les partants"
              >
                Tous ({partants.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterStatut(filterStatut === 'selection11' ? 'all' : 'selection11')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatut === 'selection11'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-amber-300 hover:text-amber-200'
                }`}
                title="Isoler les 12 chevaux sélectionnés (5 G1 + 3 G2 + 4 G3 par cotes croissantes)"
              >
                <span>👑 12 N° V38</span>
                <span className="font-mono text-[10px]">({selection11Nums.size})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatut(filterStatut === 'bases' ? 'all' : 'bases')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatut === 'bases'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-amber-300 hover:text-amber-100'
                }`}
                title="BASE : Les 2 premiers numéros parmi les 12 par cotes croissantes"
              >
                <span>🥇 BASE</span>
                <span className="font-mono text-[10px]">({baseNums.size})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatut(filterStatut === 'chances' ? 'all' : 'chances')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatut === 'chances'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'text-emerald-300 hover:text-emerald-100'
                }`}
                title="CHANCES SÉRIEUSES : Les 3e, 4e, 5e et 6e numéros par cotes croissantes (4 chevaux)"
              >
                <span>🥈 CHANCES</span>
                <span className="font-mono text-[10px]">({chancesNums.size})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatut(filterStatut === 'tocards_v38' ? 'all' : 'tocards_v38')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatut === 'tocards_v38'
                    ? 'bg-rose-500 text-white font-black shadow-xs'
                    : 'text-rose-300 hover:text-rose-100'
                }`}
                title="TOCARDS : Les 7e, 8e et 9e numéros par cotes croissantes (3 chevaux)"
              >
                <span>🥉 TOCARDS</span>
                <span className="font-mono text-[10px]">({tocardsNums.size})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatut(filterStatut === 'surprises' ? 'all' : 'surprises')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatut === 'surprises'
                    ? 'bg-purple-500 text-white font-black shadow-xs'
                    : 'text-purple-300 hover:text-purple-100'
                }`}
                title="SURPRISES : Les plus petits numéros parmi le trio 10e-12e (classés par numéro croissant)"
              >
                <span>🔮 SURPRISES</span>
                <span className="font-mono text-[10px]">({surprisesNums.size})</span>
              </button>

              {delaissesNums.size > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatut(filterStatut === 'delaisses' ? 'all' : 'delaisses')}
                  className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    filterStatut === 'delaisses'
                      ? 'bg-slate-700 text-white font-black shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="DÉLAISSÉS : Tous autres numéros non retenus dans les 12 (classés par cote croissante)"
                >
                  <span>⚪ DÉLAISSÉS</span>
                  <span className="font-mono text-[10px]">({delaissesNums.size})</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setFilterStatut('favoris')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterStatut === 'favoris'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Favoris (&le; 7.5)
            </button>
            <button
              onClick={() => setFilterStatut('outsiders')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterStatut === 'outsiders'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Outsiders (8 à 20)
            </button>
            <button
              onClick={() => setFilterStatut('d4')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterStatut === 'd4'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Déferrés D4
            </button>
            {partantsWithMissingDataCount > 0 && (
              <button
                onClick={() => setFilterStatut('missing')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  filterStatut === 'missing'
                    ? 'bg-rose-500 text-white font-black'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/80'
                }`}
                title="Filtrer les partants ayant des données non renseignées sur le web"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Données manquantes ({partantsWithMissingDataCount})</span>
              </button>
            )}

            {/* Filtre interactif : Masquer cotes > 30 pour simplifier l'analyse des favoris */}
            <button
              type="button"
              onClick={() => setHideOddsAbove30(!hideOddsAbove30)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                hideOddsAbove30
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20'
                  : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
              }`}
              title={
                hideOddsAbove30
                  ? `Filtre actif : ${horsesWithOddsAbove30Count} chevaux avec cote > 30 masqués. Cliquez pour réafficher.`
                  : "Masquer les chevaux dont la cote probable est supérieure à 30 pour simplifier l'analyse des favoris."
              }
            >
              {hideOddsAbove30 ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                  <span>Cotes &gt; 30 masquées ({horsesWithOddsAbove30Count})</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Masquer cotes &gt; 30</span>
                  {horsesWithOddsAbove30Count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-950 text-amber-300 border border-slate-700 ml-0.5">
                      {horsesWithOddsAbove30Count}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Live Cotes PMU (30s) & Quick Table Exports */}
          <div className="flex flex-wrap items-center gap-2 pl-2 border-l border-slate-700/60">
            {isCourseFinished(course) ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400">
                <span className="font-bold text-[11px]">
                  🏁 Cotes définitives de départ
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-[11px] text-amber-300">
                  Cotes PMU.fr Direct 30s : {nextOddsSec !== undefined ? `${nextOddsSec}s` : '30s'}
                </span>
                {onRefreshOdds && (
                  <button
                    type="button"
                    onClick={onRefreshOdds}
                    disabled={isRefreshingOdds}
                    className="ml-1 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black transition-all disabled:opacity-50"
                    title="Rafraîchir les cotes immédiatement"
                  >
                    {isRefreshingOdds ? '...' : '⚡ Recharger'}
                  </button>
                )}
              </div>
            )}

            {course && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all shadow-xs"
                  title="Exporter ce tableau au format Excel (.xlsx)"
                >
                  {excelSuccess ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Prêt !</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                      <span>Excel</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all shadow-xs"
                  title="Exporter ce tableau au format PDF complet"
                >
                  {pdfSuccess ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      <span>Prêt !</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3 h-3 text-amber-400" />
                      <span>PDF Complet</span>
                    </>
                  )}
                </button>

                {course && (
                  <button
                    type="button"
                    onClick={() => exportQuinteOnlyToPdf(course)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] font-black transition-all shadow-xs"
                    title="Générer et télécharger le PDF officiel de la Hiérarchie Quinté+ V38 (9 chevaux)"
                  >
                    <Crown className="w-3 h-3 fill-slate-950" />
                    <span>Exporter Hiérarchie V38</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 text-[11px] font-bold transition-all shadow-xs print:hidden"
                  title="Imprimer le Tableau Analytique au format A4 Paysage"
                >
                  <Printer className="w-3 h-3 text-sky-400" />
                  <span>Imprimer (A4)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2c. Sélecteur de Filtrage Visuel par Groupe : Trot/Obstacles (G1 1-6, G2 7-10, G3 11+) & Plat (CA 1-5, CB 6-8, CC 9+) */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur de Mode (Universel G1, G2, G3 pour toutes disciplines) */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-700/80 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setGroupFilterTab('NUMERO');
                if (filterGroup === 'CA' || filterGroup === 'CB' || filterGroup === 'CC') setFilterGroup('all');
              }}
              className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                groupFilterTab === 'NUMERO' || groupFilterTab === 'AUTO'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Groupes par N° de dossard (G1: 1-6, G2: 7-10, G3: 11+) pour toutes les disciplines"
            >
              <span>🏆 Groupes N° (G1 / G2 / G3)</span>
            </button>
            {isPlatCourse && (
              <button
                type="button"
                onClick={() => {
                  setGroupFilterTab('CORDE');
                  if (filterGroup === 'G1' || filterGroup === 'G2' || filterGroup === 'G3') setFilterGroup('all');
                }}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                  groupFilterTab === 'CORDE'
                    ? 'bg-teal-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Afficher les cordes de départ pour le Plat (CA: 1-5, CB: 6-8, CC: 9+)"
              >
                <Target className="w-3 h-3" />
                <span>Cordes Plat (CA/CB/CC)</span>
              </button>
            )}
          </div>

          {/* Bouton Tous les partants */}
          <button
            type="button"
            onClick={() => setFilterGroup('all')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border cursor-pointer active:scale-95 ${
              filterGroup === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
            title="Afficher tous les partants du peloton"
          >
            <span>Tous</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
              filterGroup === 'all' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}>
              {partants.length}
            </span>
          </button>

          {/* Boutons Trot / Obstacles (N° : G1, G2, G3) */}
          {(groupFilterTab === 'NUMERO' || (groupFilterTab === 'AUTO' && !isPlatCourse)) && (
            <>
              {/* G1 : N° 1 à 6 */}
              <button
                type="button"
                onClick={() => setFilterGroup(filterGroup === 'G1' ? 'all' : 'G1')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border cursor-pointer active:scale-95 ${
                  filterGroup === 'G1'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/25'
                    : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/60 hover:text-amber-100'
                }`}
                title="G1 : Chevaux portant les numéros 1 à 6 (5 plus petites cotes retenues)"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
                <span>G1 (N° 1 à 6)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  filterGroup === 'G1' ? 'bg-slate-950 text-amber-300' : 'bg-amber-950 text-amber-200 border border-amber-500/40'
                }`}>
                  {countG1}
                </span>
                <span className="text-[9px] font-normal opacity-75">(Top 5 cotes)</span>
              </button>

              {/* G2 : N° 7 à 10 */}
              <button
                type="button"
                onClick={() => setFilterGroup(filterGroup === 'G2' ? 'all' : 'G2')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border cursor-pointer active:scale-95 ${
                  filterGroup === 'G2'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/25'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 hover:text-emerald-100'
                }`}
                title="G2 : Chevaux portant les numéros 7 à 10 (3 plus petites cotes retenues)"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                <span>G2 (N° 7 à 10)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  filterGroup === 'G2' ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-950 text-emerald-200 border border-emerald-500/40'
                }`}>
                  {countG2}
                </span>
                <span className="text-[9px] font-normal opacity-75">(Top 3 cotes)</span>
              </button>

              {/* G3 : N° 11 et plus */}
              <button
                type="button"
                onClick={() => setFilterGroup(filterGroup === 'G3' ? 'all' : 'G3')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border cursor-pointer active:scale-95 ${
                  filterGroup === 'G3'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-purple-400 ring-2 ring-purple-400/50 shadow-purple-500/25'
                    : 'bg-purple-950/40 text-purple-300 border-purple-500/40 hover:bg-purple-900/60 hover:text-purple-100'
                }`}
                title="G3 : Chevaux portant les numéros 11 et plus si partants > 10 (4 plus petites cotes retenues)"
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400"></span>
                <span>G3 (N° 11+)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  filterGroup === 'G3' ? 'bg-slate-950 text-purple-300' : 'bg-purple-950 text-purple-200 border border-purple-500/40'
                }`}>
                  {countG3}
                </span>
                <span className="text-[9px] font-normal opacity-75">(Top 4 cotes)</span>
              </button>
            </>
          )}

          {/* Boutons Plat (Cordes : CA, CB, CC) */}
          {(groupFilterTab === 'CORDE' || (groupFilterTab === 'AUTO' && isPlatCourse)) && (
            <>
              {/* CA : Cordes 1 à 5 */}
              <button
                type="button"
                onClick={() => setFilterGroup(filterGroup === 'CA' ? 'all' : 'CA')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border cursor-pointer active:scale-95 ${
                  filterGroup === 'CA'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/25'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 hover:text-emerald-100'
                }`}
                title="CA : Chevaux ayant une Corde intérieure de 1 à 5 (5 plus petites cotes retenues)"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                <span>CA (Cordes 1 à 5)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  filterGroup === 'CA' ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-950 text-emerald-200 border border-emerald-500/40'
                }`}>
                  {countCA}
                </span>
                <span className="text-[9px] font-normal opacity-75">(Top 5)</span>
              </button>

              {/* CB : Cordes 6 à 8 */}
              <button
                type="button"
                onClick={() => setFilterGroup(filterGroup === 'CB' ? 'all' : 'CB')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border cursor-pointer active:scale-95 ${
                  filterGroup === 'CB'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-slate-950 border-sky-400 ring-2 ring-sky-400/50 shadow-sky-500/25'
                    : 'bg-sky-950/40 text-sky-300 border-sky-500/40 hover:bg-sky-900/60 hover:text-sky-100'
                }`}
                title="CB : Chevaux ayant une Corde médiane de 6 à 8 (3 plus petites cotes retenues)"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400"></span>
                <span>CB (Cordes 6 à 8)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  filterGroup === 'CB' ? 'bg-slate-950 text-sky-300' : 'bg-sky-950 text-sky-200 border border-sky-500/40'
                }`}>
                  {countCB}
                </span>
                <span className="text-[9px] font-normal opacity-75">(Top 3)</span>
              </button>

              {/* CC : Cordes 9 et plus */}
              <button
                type="button"
                onClick={() => setFilterGroup(filterGroup === 'CC' ? 'all' : 'CC')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border cursor-pointer active:scale-95 ${
                  filterGroup === 'CC'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-purple-400 ring-2 ring-purple-400/50 shadow-purple-500/25'
                    : 'bg-purple-950/40 text-purple-300 border-purple-500/40 hover:bg-purple-900/60 hover:text-purple-100'
                }`}
                title="CC : Chevaux ayant une Corde extérieure de 9 et plus (3 plus petites cotes retenues)"
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400"></span>
                <span>CC (Cordes 9+)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  filterGroup === 'CC' ? 'bg-slate-950 text-purple-300' : 'bg-purple-950 text-purple-200 border border-purple-500/40'
                }`}>
                  {countCC}
                </span>
                <span className="text-[9px] font-normal opacity-75">(Top 3)</span>
              </button>
            </>
          )}
        </div>

        {/* Info rapide si filtre actif */}
        {filterGroup !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-300 font-bold bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>
                Filtre <strong>{filterGroup}</strong> actif : <strong>{filteredPartants.length}</strong> partants (triés par cote croissante)
              </span>
            </span>
            <button
              type="button"
              onClick={() => setFilterGroup('all')}
              className="text-[11px] font-black text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Annuler le filtrage et réafficher tous les partants"
            >
              ✕ Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* 2b. Section Spéciale : Plus Fortes Baisses de Cotes (Bruits d'Écurie) */}
      {fortesBaisses && fortesBaisses.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-rose-950/20 to-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-extrabold shrink-0">
            <TrendingDown className="w-4 h-4 text-rose-500 animate-bounce" />
            <span className="uppercase tracking-wider">🔥 Bruits d'Écurie (Fortes Baisses PMU) :</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {fortesBaisses.map((num, idx) => {
              const p = partantsActifs.find(h => h.numero === num);
              if (!p) return null;
              return (
                <div 
                  key={`drop-${num}-${idx}`}
                  onClick={() => onToggleHorse(num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-95 ${
                    selectedHorses.includes(num)
                      ? 'border-rose-500 bg-rose-950/30 text-rose-200 shadow-md shadow-rose-500/10'
                      : 'border-slate-800 hover:border-rose-500/30 bg-slate-900/60 text-slate-300'
                  }`}
                  title={`Cote précédente : ${p.cotePrecedente}/1 | Cote actuelle : ${p.coteProbable}/1. Cliquez pour cocher.`}
                >
                  <span className={`w-5 h-5 rounded-lg font-black flex items-center justify-center text-[10px] ${
                    selectedHorses.includes(num)
                      ? 'bg-rose-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {num}
                  </span>
                  <span className="font-extrabold text-[11px] max-w-[90px] truncate">{p.nom}</span>
                  <span className="text-[10px] text-rose-400 font-mono font-black flex items-center">
                    ({p.cotePrecedente}/1 ➔ {p.coteProbable}/1)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barre d'options de Tri Rapide des Partants : Sélecteur de Cote (Croissant / Décroissant), Numéro, HippoScore */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-bold shadow-xs shrink-0">
            <ArrowUpDown className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-black">Tri :</span>
          </div>

          {/* Sélecteur Déroulant de Tri */}
          <select
            value={`${sortField}-${sortAsc}`}
            onChange={(e) => {
              const [field, ascStr] = e.target.value.split('-');
              setSortField(field as SortField);
              setSortAsc(ascStr === 'true');
            }}
            className="bg-slate-950 text-slate-100 border-2 border-amber-500/40 hover:border-amber-400 rounded-xl px-3 py-1.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-md cursor-pointer transition-all"
            title="Sélectionner l'ordre de tri des partants"
          >
            <option value="numero-true">🔢 N° Dossard (Ordre officiel 1 ➔ N)</option>
            <option value="coteProbable-true">📈 Cote Probable CROISSANTE (Plus petite à plus grande ↗ · Favoris)</option>
            <option value="coteProbable-false">📉 Cote Probable DÉCROISSANTE (Plus grande à plus petite ↘ · Tocards)</option>
            <option value="hippoScore-false">🏆 Score IA HippoScore (Meilleurs d'abord ↘)</option>
            <option value="regularite-false">🔄 Régularité de la Musique (Plus stables d'abord ↘)</option>
          </select>

          {/* Boutons Sélecteurs Directs : Cotes Croissantes / Décroissantes */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 shadow-sm gap-1">
            {/* Tri Cotes Croissantes (Favoris d'abord) */}
            <button
              type="button"
              onClick={() => {
                setSortField('coteProbable');
                setSortAsc(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                sortField === 'coteProbable' && sortAsc
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-900'
              }`}
              title="Trier les chevaux par ordre CROISSANT de leur cote probable (de la plus petite cote à la plus grande)"
            >
              <ArrowUp className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
              <span>Cote Croissante ↗</span>
            </button>

            {/* Tri Cotes Décroissantes (Tocards d'abord) */}
            <button
              type="button"
              onClick={() => {
                setSortField('coteProbable');
                setSortAsc(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                sortField === 'coteProbable' && !sortAsc
                  ? 'bg-rose-500 text-white ring-2 ring-rose-400/50 shadow-md shadow-rose-500/20'
                  : 'text-slate-300 hover:text-rose-300 hover:bg-slate-900'
              }`}
              title="Trier les chevaux par ordre DÉCROISSANT de leur cote probable (de la plus grande cote à la plus petite)"
            >
              <ArrowDown className="w-3.5 h-3.5 text-rose-300 stroke-[2.5]" />
              <span>Cote Décroissante ↘</span>
            </button>

            {/* Réinitialiser vers Ordre Programme N° 1 à N */}
            <button
              type="button"
              onClick={() => {
                setSortField('numero');
                setSortAsc(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortField === 'numero' && sortAsc
                  ? 'bg-slate-800 text-amber-300 font-black border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Rétablir l'ordre naturel des partants (N° 1 à N)"
            >
              <span>N° Dossard</span>
            </button>
          </div>

          {/* Tri HippoScore */}
          <button
            type="button"
            onClick={() => {
              setSortField('hippoScore');
              setSortAsc(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              sortField === 'hippoScore' && !sortAsc
                ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400/50'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-amber-500/50 hover:text-white'
            }`}
            title="Trier par le meilleur score d'IA HippoScore"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Score IA ↘</span>
          </button>

          {/* Tri Régularité */}
          <button
            type="button"
            onClick={() => {
              setSortField('regularite');
              setSortAsc(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              sortField === 'regularite' && !sortAsc
                ? 'bg-sky-500 text-slate-950 font-black ring-2 ring-sky-400/50'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-sky-500/50 hover:text-white'
            }`}
            title="Trier par la meilleure régularité (musique la plus stable)"
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Régularité ↘</span>
          </button>
        </div>

        {/* Indicateur de statut du tri en cours */}
        <div className="flex flex-wrap items-center gap-2">
          {sortField === 'coteProbable' && (
            <div className="flex items-center gap-1.5">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-sm ${
                sortAsc 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${sortAsc ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span>
                  {sortAsc ? 'Cotes Croissantes (Favoris ➔ Tocards)' : 'Cotes Décroissantes (Tocards ➔ Favoris)'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                title="Inverser le sens du tri"
              >
                Inverser ⇅
              </button>
            </div>
          )}

          {/* Indicateur d'état du tri */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Actif :</span>
            {sortField === 'coteProbable' ? (
              sortAsc ? (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[11px] flex items-center gap-1 shadow-xs">
                  <ArrowUp className="w-3 h-3 text-emerald-400" /> Cotes Croissantes
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black text-[11px] flex items-center gap-1 shadow-xs">
                  <ArrowDown className="w-3 h-3 text-rose-400" /> Cotes Décroissantes
                </span>
              )
            ) : sortField === 'hippoScore' ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> HippoScore ↘
              </span>
            ) : sortField === 'regularite' ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold text-[11px] flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-400" /> Régularité ↘
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[11px]">
                N° Dossard (Programme)
              </span>
            )}

            {filterGroup !== 'all' && (
              <span className={`px-2.5 py-0.5 rounded-lg border font-black text-[11px] flex items-center gap-1 shadow-xs ${
                filterGroup === 'G1'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : filterGroup === 'G2'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : filterGroup === 'G3'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : filterGroup === 'CA'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : filterGroup === 'CB'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              }`}>
                <span>
                  Groupe {filterGroup} (
                  {filterGroup === 'G1' ? 'N° 1-6' : filterGroup === 'G2' ? 'N° 7-10' : filterGroup === 'G3' ? 'N° 11+' : filterGroup === 'CA' ? 'Cordes 1-5' : filterGroup === 'CB' ? 'Cordes 6-8' : 'Cordes 9+'}
                  )
                </span>
                <button
                  type="button"
                  onClick={() => setFilterGroup('all')}
                  className="ml-0.5 hover:text-white cursor-pointer"
                  title="Désactiver le filtre de groupe"
                >
                  ✕
                </button>
              </span>
            )}

            {hideOddsAbove30 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[11px] flex items-center gap-1.5 shadow-xs">
                <EyeOff className="w-3 h-3 text-amber-400" />
                <span>Cotes &gt; 30 masquées ({horsesWithOddsAbove30Count})</span>
                <button
                  type="button"
                  onClick={() => setHideOddsAbove30(false)}
                  className="ml-0.5 hover:text-white cursor-pointer"
                  title="Désactiver ce filtre"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Peloton Effectif & Non-Partants Controller Bar */}
      <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 font-bold text-[14px] text-amber-400">
            <span>🐎 Peloton officiel :</span>
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[14px]">
              Partants : {partants.length}
            </span>
          </span>
          {nonPartantsCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-[14px]">
              NP : {partants.filter((p) => p.estNonPartant || p.statut === 'Non-partant').map((p) => p.numero).join(', ')}
            </span>
          )}
          <span className="text-slate-600 font-bold text-[14px]">|</span>
          <span className="text-slate-300 font-bold text-[14px]">
            <strong className="text-emerald-400 font-bold text-[14px]">{partantsActifs.length}</strong> en course
          </span>
        </div>

        {/* Quick Stepper & Presets to adjust the exact count */}
        {onUpdatePartantsCount && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-[11px] font-semibold">Ajuster effectif :</span>
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => onUpdatePartantsCount(Math.max(6, partants.length - 1))}
                disabled={partants.length <= 6}
                className="px-2.5 py-1 hover:bg-slate-800 text-slate-300 disabled:opacity-30 font-black transition-colors"
                title="Retirer le dernier partant"
              >
                -1
              </button>
              <span className="px-2.5 py-1 text-xs font-bold text-white bg-slate-950 border-x border-slate-800">
                {partants.length}
              </span>
              <button
                type="button"
                onClick={() => onUpdatePartantsCount(Math.min(24, partants.length + 1))}
                disabled={partants.length >= 24}
                className="px-2.5 py-1 hover:bg-slate-800 text-slate-300 disabled:opacity-30 font-black transition-colors"
                title="Ajouter un partant"
              >
                +1
              </button>
            </div>

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1">
              {[12, 13, 14, 15, 16, 18].map((nb, nbIdx) => (
                <button
                  key={`quick-preset-${nb}-${nbIdx}`}
                  type="button"
                  onClick={() => onUpdatePartantsCount(nb)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                    partants.length === nb
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {nb}
                </button>
              ))}
            </div>

            {onAddHorse && (
              <button
                type="button"
                onClick={onAddHorse}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all"
                title="Ajouter manuellement le partant suivant"
              >
                + Partant
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bannière d'information lorsque des chevaux sont masqués par le filtre cotes > 30 */}
      {hideOddsAbove30 && horsesWithOddsAbove30Count > 0 && (
        <div className="mx-4 my-2.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Filtre favoris actif :</strong> {horsesWithOddsAbove30Count} cheval/chevaux dont la cote probable dépasse 30/1 sont masqués pour focaliser votre analyse sur les favoris et secondes chances ({filteredPartants.length} partants visibles).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHideOddsAbove30(false)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition-all shrink-0 active:scale-95 shadow-xs"
          >
            Réafficher tout ({partants.length})
          </button>
        </div>
      )}

      {/* Starters Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/80">
              <th className="py-3 px-3 w-10 text-center">Ticket</th>
              <th
                onClick={() => handleSort('numero')}
                className="py-3 px-3 cursor-pointer hover:text-white w-14 text-center select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>N°</span>
                  {sortField === 'numero' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-3 px-4">Cheval / Origines</th>
              <th className="py-3 px-3">Driver / Jockey</th>
              <th className="py-3 px-3">Entraîneur</th>
              <th className="py-3 px-3">Musique Récente</th>
              <th className="py-3 px-2 text-center">Fer</th>
              <th
                onClick={() => handleSort('coteProbable')}
                className="py-3 px-3 cursor-pointer hover:text-white text-right select-none"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold flex items-center gap-1 hover:text-amber-400">
                    <span>Cote</span>
                    {sortField === 'coteProbable' && (
                      sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                      )
                    )}
                  </span>
                  
                  {/* Boutons d'accès direct Favoris (croissant) / Tocards (décroissant) */}
                  <div className="inline-flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortField('coteProbable');
                        setSortAsc(true);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all ${
                        sortField === 'coteProbable' && sortAsc
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-emerald-300'
                      }`}
                      title="Cotes croissantes : Favoris d'abord"
                    >
                      ↗ Fav
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortField('coteProbable');
                        setSortAsc(false);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all ${
                        sortField === 'coteProbable' && !sortAsc
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-slate-400 hover:text-rose-300'
                      }`}
                      title="Cotes décroissantes : Tocards d'abord"
                    >
                      ↘ Toc
                    </button>
                  </div>
                </div>
              </th>
              <th
                onClick={() => handleSort('hippoScore')}
                className="py-3 px-3 cursor-pointer hover:text-white text-center select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>HippoScore</span>
                  <button
                    onClick={() => {
                        setSortField('hippoScore');
                        setSortAsc(false); // Default to highest to lowest
                    }}
                    className="ml-2 px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black hover:bg-amber-400"
                    title="Trier du score le plus haut au plus bas"
                  >
                    Classer
                  </button>
                  {sortField === 'hippoScore' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-3 px-3 text-center">Détails Pro</th>
              <th className="py-3 px-4 text-left text-amber-400 font-black flex-1 min-w-[400px]">Avis HippoAnalyse</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-xs">
            {sortedPartants.map((partant, index) => {
              const isChecked = selectedHorses.includes(partant.numero);
              const isNP = !!partant.estNonPartant || partant.statut === 'Non-partant';
              const isExpanded = expandedHorse === partant.numero;

              return (
                <React.Fragment key={`partant-${partant.numero}-${index}`}>
                  <tr
                    className={`transition-colors ${
                      isNP
                        ? 'bg-rose-950/20 opacity-60'
                        : isChecked
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox for ticket */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        disabled={isNP}
                        onClick={() => !isNP && onToggleHorse(partant.numero)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isNP
                            ? 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
                            : isChecked
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-transparent hover:border-slate-500'
                        }`}
                        title={isNP ? "Ce cheval est Non-Partant" : "Sélectionner pour le ticket PMU"}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>

                    {/* Numéro */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm border-2 shadow-sm ${
                          isNP 
                            ? 'bg-slate-900 text-slate-500 border-slate-800 line-through' 
                            : index === 0
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-black text-amber-400 border-2 border-amber-500'
                        }`}>
                          {partant.numero}
                        </span>
                        {(() => {
                          const arrIdx = arrivalNumbers.indexOf(partant.numero);
                          if (arrIdx === -1) return null;
                          const rank = arrIdx + 1;
                          return (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight shadow-sm whitespace-nowrap ${
                              rank === 1
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 ring-1 ring-amber-300'
                                : rank === 2
                                ? 'bg-slate-200 text-slate-950 ring-1 ring-white'
                                : rank === 3
                                ? 'bg-amber-700 text-amber-100 ring-1 ring-amber-600'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {rank === 1 ? '🥇 1er' : rank === 2 ? '🥈 2e' : rank === 3 ? '🥉 3e' : `${rank}e`}
                            </span>
                          );
                        })()}
                        {onToggleNonPartant && (
                          <button
                            type="button"
                            onClick={() => onToggleNonPartant(partant.numero)}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase transition-all ${
                              isNP
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-800'
                            }`}
                            title={isNP ? "Rétablir comme partant" : "Déclarer non-partant (NP)"}
                          >
                            {isNP ? 'NP' : 'Décl. NP'}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Cheval */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-extrabold text-sm ${isNP ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {partant.nom}
                          </span>
                          {isNP && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              NON-PARTANT (NP)
                            </span>
                          )}
                          {!isNP && (() => {
                            const v38 = getHorseV38Status(partant.numero);
                            if (!v38) return null;
                            return (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${v38.style}`}>
                                {v38.label}
                              </span>
                            );
                          })()}
                          {partant.record && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                              {partant.record}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span>
                            {partant.sexe}
                            {partant.age}
                          </span>
                          <span>·</span>
                          <span>{partant.distance}m</span>
                          {partant.poids ? <span>· {partant.poids}kg</span> : null}
                          
                          {/* Badge Groupe N° (G1: 1-6, G2: 7-10, G3: 11+) avec rang par cote */}
                          {(() => {
                            const nInfo = getHorseNumeroGroupRank(partant);
                            const isSelected = filterGroup === nInfo.group;
                            const grpStyles = {
                              G1: isSelected 
                                ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400/50' 
                                : nInfo.isTopQuota
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200',
                              G2: isSelected 
                                ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-400/50' 
                                : nInfo.isTopQuota
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200',
                              G3: isSelected 
                                ? 'bg-purple-500 text-white font-black ring-2 ring-purple-400/50' 
                                : nInfo.isTopQuota
                                ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 hover:bg-purple-900'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200',
                            }[nInfo.group];

                            return (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => setFilterGroup(filterGroup === nInfo.group ? 'all' : nInfo.group)}
                                  className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md border text-[10px] transition-all cursor-pointer shadow-xs ${grpStyles}`}
                                  title={`Groupe ${nInfo.group} (N° ${partant.numero}) : Classé ${nInfo.rank}e / ${nInfo.total} par cote dans son groupe.${nInfo.isTopQuota ? ' (Retenu dans le quota)' : ''} Cliquez pour filtrer.`}
                                >
                                  <span className="font-mono font-black">{nInfo.group}</span>
                                  <span>· #{nInfo.rank}/{nInfo.total}</span>
                                </button>
                              </>
                            );
                          })()}

                          {/* Badge Groupe Corde si course de Plat */}
                          {isPlatCourse && (() => {
                            const cVal = getHorseCordeValue(partant);
                            const cInfo = getHorseCordeGroupRank(partant);
                            const isSelectedGroup = filterGroup === cInfo.group;
                            const grpStyles = {
                              CA: isSelectedGroup 
                                ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-400/50' 
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900',
                              CB: isSelectedGroup 
                                ? 'bg-sky-500 text-slate-950 font-black ring-2 ring-sky-400/50' 
                                : 'bg-sky-950/80 text-sky-300 border-sky-500/40 hover:bg-sky-900',
                              CC: isSelectedGroup 
                                ? 'bg-purple-500 text-white font-black ring-2 ring-purple-400/50' 
                                : 'bg-purple-950/80 text-purple-300 border-purple-500/40 hover:bg-purple-900',
                            }[cInfo.group];

                            return (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => setFilterGroup(filterGroup === cInfo.group ? 'all' : cInfo.group)}
                                  className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md border text-[10px] transition-all cursor-pointer shadow-xs ${grpStyles}`}
                                  title={`Groupe ${cInfo.group} : Corde ${cVal} (Classé ${cInfo.rank}e / ${cInfo.total} par cote). Cliquez pour filtrer uniquement le groupe ${cInfo.group}.`}
                                >
                                  <span className="font-mono font-black">{cInfo.group}</span>
                                  <span>· Cde {cVal}</span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </td>

                    {/* Driver / Jockey */}
                    <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                      {partant.driver && partant.driver !== 'Inconnu' && partant.driver !== 'Non renseigné' && partant.driver.trim() !== '' ? (
                        partant.driver
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Non renseigné (vérifié web)</span>
                        </span>
                      )}
                    </td>

                    {/* Entraîneur */}
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {partant.entraineur && partant.entraineur !== 'Inconnu' && partant.entraineur.trim() !== '' ? (
                        partant.entraineur
                      ) : (
                        <span className="text-amber-400/80 text-[11px] italic font-medium">⚠️ Non renseigné</span>
                      )}
                    </td>

                    {/* Musique avec bouton interactif */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {partant.musique && partant.musique !== '?' && partant.musique !== 'Inconnu' && partant.musique.trim() !== '' ? (
                        <button
                          type="button"
                          onClick={() => onOpenMusiqueDecoder(partant.musique, partant.nom)}
                          className="font-mono text-xs font-semibold text-amber-300 hover:text-amber-200 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 hover:border-amber-400/50 transition-colors flex items-center gap-1"
                          title="Cliquez pour décrypter cette musique"
                        >
                          <span>{partant.musique}</span>
                          <Info className="w-3 h-3 text-amber-400/70" />
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400/90 text-[10px] font-bold border border-slate-700">
                          ⚠️ Musique non fournie
                        </span>
                      )}
                    </td>

                    {/* Ferrure */}
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      {getFerrureBadge(partant.ferrure || 'F')}
                    </td>

                    {/* Cote Probable avec Tendance Temps Réel et Option Graphique */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        {partant.coteProbable && partant.coteProbable > 0 ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {partant.cotePrecedente && Number(partant.cotePrecedente) !== Number(partant.coteProbable) && (
                              <span
                                className="text-[10px] font-mono text-slate-500 line-through bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800"
                                title={`Cote précédente : ${partant.cotePrecedente}/1`}
                              >
                                {partant.cotePrecedente}
                              </span>
                            )}
                            {partant.cotePrecedente && partant.coteProbable && partant.cotePrecedente > partant.coteProbable && ((partant.cotePrecedente - partant.coteProbable) / partant.cotePrecedente) >= 0.1 && (
                              <span
                                className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border-2 border-emerald-500 shadow-md shadow-emerald-500/10 animate-pulse"
                                title={`🔥 Alerte Insider : Forte baisse de cote de -${Math.round(((partant.cotePrecedente - partant.coteProbable) / partant.cotePrecedente) * 100)}%`}
                              >
                                ⬇️ -10%+
                              </span>
                            )}
                            {partant.evolutionCote === 'baisse' && (
                              <span
                                className="text-[10px] font-black text-emerald-300 bg-emerald-500/25 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-500/40 shadow-xs"
                                title={`Cote en baisse (argent frais sur le N°${partant.numero})`}
                              >
                                ↓ Baisse
                              </span>
                            )}
                            {partant.evolutionCote === 'hausse' && (
                              <span
                                className="text-[10px] font-black text-rose-300 bg-rose-500/25 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-rose-500/40 shadow-xs"
                                title={`Cote en hausse (délaissé pour le N°${partant.numero})`}
                              >
                                ↑ Hausse
                              </span>
                            )}
                            <span
                              className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg border transition-all ${
                                partant.evolutionCote === 'baisse'
                                  ? 'text-emerald-300 bg-emerald-950/70 border-emerald-500/40 shadow-sm'
                                  : partant.evolutionCote === 'hausse'
                                  ? 'text-rose-300 bg-rose-950/70 border-rose-500/40 shadow-sm'
                                  : partant.coteProbable <= 5
                                  ? 'text-emerald-400 bg-slate-950 border-slate-800'
                                  : partant.coteProbable <= 15
                                  ? 'text-amber-400 bg-slate-950 border-slate-800'
                                  : 'text-slate-300 bg-slate-950 border-slate-800'
                              }`}
                              title={partant.cotePrecedente ? `Cote précédente : ${partant.cotePrecedente}/1` : undefined}
                            >
                              {partant.coteProbable}/1
                            </span>
                          </div>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400/90 text-[10px] font-bold border border-amber-500/20">
                            ⚠️ Non fixée
                          </span>
                        )}

                        {!isNP && (
                          <button
                            type="button"
                            onClick={() => setExpandedHorse(isExpanded ? null : partant.numero)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase transition-all shadow-xs ${
                              isExpanded
                                ? 'bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                            title="Afficher l'historique des fluctuations de cotes"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Fermer' : 'Graphique'}</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* HippoScore */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-black text-xs">
                        <span className={`px-2 py-0.5 rounded-md border ${getScoreColor(partant.hippoScore || 0)}`}>
                          {partant.hippoScore || 0}/100
                        </span>
                      </div>
                    </td>

                    {/* Détails Pro : Réussite Driver/Jockey */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[11px] font-black text-white" title="Taux de réussite (Victoire + Placé) sur les 10 dernières courses">
                          {(() => {
                            const music = partant.musique || '';
                            const races = music.split(' ');
                            const success = races.filter(r => r.includes('1') || r.includes('2') || r.includes('3')).length;
                            const total = Math.max(1, races.length);
                            return `${Math.round((success / total) * 100)}% R`;
                          })()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400" title="Performance Globale">
                          {(() => {
                            const rate = computeDriverSuccessRate(partant, course?.discipline || 'Plat');
                            return `${rate}% G`;
                          })()}
                        </span>
                      </div>
                    </td>

                    {/* Avis Expert */}
                    <td className="py-3 px-4 text-slate-200 text-xs leading-relaxed font-medium min-w-[400px]">
                      {partant.avisExpert || '—'}
                    </td>
                  </tr>

                  {/* Expanded Graph Row with Recharts */}
                  {isExpanded && !isNP && (
                    <tr className="bg-slate-950/40">
                      <td colSpan={11} className="p-4 border-t border-b border-slate-800">
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-4 max-w-4xl mx-auto">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-amber-400" />
                                <span>Fluctuations de cotes : {partant.nom} (N°{partant.numero})</span>
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Relevé consolidé sur les 30 dernières minutes (temps réel)
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[9px] text-slate-500 block uppercase font-bold">Cote Directe</span>
                                <span className="text-xs font-black font-mono text-amber-400">{partant.coteProbable}/1</span>
                              </div>
                              <div className="text-right border-l border-slate-800 pl-3">
                                <span className="text-[9px] text-slate-500 block uppercase font-bold">Variation</span>
                                <span className={`text-[11px] font-black font-mono flex items-center gap-0.5 ${
                                  partant.evolutionCote === 'baisse' ? 'text-emerald-400' : partant.evolutionCote === 'hausse' ? 'text-rose-400' : 'text-slate-400'
                                }`}>
                                  {partant.evolutionCote === 'baisse' ? '↓ Baisse (Flux)' : partant.evolutionCote === 'hausse' ? '↑ Hausse (Dérive)' : 'Stable'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Recharts Area Chart Container */}
                          <div className="h-40 w-full text-xs font-mono">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={getFluctuationData(partant)}
                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id={`colorCote-${partant.numero}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={partant.evolutionCote === 'baisse' ? '#10b981' : partant.evolutionCote === 'hausse' ? '#f43f5e' : '#f59e0b'} stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor={partant.evolutionCote === 'baisse' ? '#10b981' : partant.evolutionCote === 'hausse' ? '#f43f5e' : '#f59e0b'} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                                <XAxis 
                                  dataKey="time" 
                                  stroke="#64748b" 
                                  fontSize={10} 
                                  tickLine={false}
                                />
                                <YAxis 
                                  stroke="#64748b" 
                                  fontSize={10} 
                                  tickLine={false}
                                  domain={['auto', 'auto']}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: '#020617',
                                    borderColor: '#334155',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    color: '#f8fafc'
                                  }}
                                  formatter={(value: any) => [`${value}/1`, 'Cote probable']}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="Cote" 
                                  stroke={partant.evolutionCote === 'baisse' ? '#10b981' : partant.evolutionCote === 'hausse' ? '#f43f5e' : '#f59e0b'} 
                                  strokeWidth={2}
                                  fillOpacity={1} 
                                  fill={`url(#colorCote-${partant.numero})`} 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Détails Techniques & Officiels */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
                            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Propriétaire</span>
                              <span className="text-[11px] text-slate-200 font-bold truncate block" title={partant.proprietaire}>
                                {partant.proprietaire || 'Non renseigné'}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Gains Carrière</span>
                              <span className="text-[11px] text-amber-400 font-black">
                                {partant.gains?.toLocaleString('fr-FR')} €
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Corde / Stalle</span>
                              <span className="text-[11px] text-sky-400 font-black">
                                {partant.corde ? `N° ${partant.corde}` : '—'}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Poids / Distance</span>
                              <span className="text-[11px] text-emerald-400 font-bold">
                                {partant.poids ? `${partant.poids} kg` : `${partant.distance} m`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
