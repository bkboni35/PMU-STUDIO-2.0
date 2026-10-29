import React, { useState, useMemo } from 'react';
import {
  Scale,
  Award,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowUpDown,
  Filter,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Gauge,
  Flame,
  Minus
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { extraireTokensMusique } from '../utils/turfCalculations';
import { getHorseGenyOdds } from '../utils/v38Helper';

interface HandicapWeightImpactAnalysisCardProps {
  course: CourseHippique;
  selectedHorseNumbers?: number[];
  onSelectHorseForTicket?: (numero: number) => void;
}

export interface HorseWeightDiagnostic {
  partant: Partant;
  num: number;
  nom: string;
  poidsKg: number | null;
  valeurHandicap: number | null;
  cote: number;
  musique: string;
  isTrot: boolean;
  distanceReculMeters: number; // 0, 25, 50m
  perfPassesPlaces: number;
  perfPassesVictoires: number;
  tauxReussiteTop3: number;
  statutCharge: 'AVANTAGEUX' | 'OPTIMAL' | 'CHARGE_LOURDE' | 'SURCLASSE' | 'NEUTRE';
  scoreTolerancePoids: number; // 0-100
  explicationImpact: string;
  analyseDetaillee: string;
  deltaPoidsEstime: number; // Différence par rapport à la moyenne du lot
}

export const HandicapWeightImpactAnalysisCard: React.FC<HandicapWeightImpactAnalysisCardProps> = ({
  course,
  selectedHorseNumbers = [],
  onSelectHorseForTicket,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'TOP_WEIGHT' | 'LIGHT_WEIGHT' | 'FAVORITES'>('ALL');
  const [sortField, setSortField] = useState<'poids' | 'score' | 'numero' | 'cote'>('poids');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);

  const isTrot = useMemo(() => {
    const d = (course.discipline || '').toLowerCase();
    return d.includes('trot') || d.includes('attelé') || d.includes('monte');
  }, [course.discipline]);

  const activePartants = useMemo(() => {
    return (course.partants || []).filter(p => !p.estNonPartant && p.statut !== 'Non-partant');
  }, [course.partants]);

  // Calcul du diagnostic pour chaque partant
  const diagnostics = useMemo<HorseWeightDiagnostic[]>(() => {
    if (!activePartants || activePartants.length === 0) return [];

    // 1. Extraction des poids numériques
    const validWeights = activePartants
      .map(p => {
        const raw = (p as any).poids ?? (p as any).handicapPoids ?? (p as any).poidsConditionMonte;
        const val = typeof raw === 'number' ? (raw > 100 ? raw / 10 : raw) : parseFloat(String(raw || '').replace(',', '.'));
        return isNaN(val) ? null : val;
      })
      .filter((w): w is number => w !== null && w > 30 && w < 90);

    const avgWeight = validWeights.length > 0 ? validWeights.reduce((a, b) => a + b, 0) / validWeights.length : 57.0;

    return activePartants.map(p => {
      const num = Number(p.numero);
      const nom = p.nom || `Cheval N°${num}`;
      const cote = getHorseGenyOdds(p);
      const musique = p.musique || '';

      // Poids numérique
      const rawP = (p as any).poids ?? (p as any).handicapPoids ?? (p as any).poidsConditionMonte;
      let poidsKg: number | null = typeof rawP === 'number' ? (rawP > 100 ? rawP / 10 : rawP) : parseFloat(String(rawP || '').replace(',', '.'));
      if (isNaN(poidsKg as number) || (poidsKg as number) < 30 || (poidsKg as number) > 90) {
        poidsKg = null;
      }

      // Valeur handicap
      const rawVal = (p as any).valeurHandicap ?? (p as any).valeur;
      let valeurHandicap: number | null = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || '').replace(',', '.'));
      if (isNaN(valeurHandicap as number)) valeurHandicap = null;

      // Distance / Recul pour le trot
      let distanceReculMeters = 0;
      if (isTrot && p.distance && course.distance) {
        const diff = Number(p.distance) - Number(course.distance);
        if (diff > 0) distanceReculMeters = diff;
      }

      // Analyse de la musique passée (victoires et places)
      const tokens = extraireTokensMusique(musique);
      let victoires = 0;
      let places = 0;
      let coursesComptees = 0;

      for (const tok of tokens.slice(0, 8)) {
        const clean = tok.toUpperCase().replace(/[()]/g, '');
        if (clean.startsWith('1')) {
          victoires++;
          places++;
          coursesComptees++;
        } else if (clean.startsWith('2') || clean.startsWith('3')) {
          places++;
          coursesComptees++;
        } else if (/^[4-9]/.test(clean) || clean.startsWith('0') || clean.startsWith('D') || clean.startsWith('A')) {
          coursesComptees++;
        }
      }

      const tauxReussite = coursesComptees > 0 ? Math.round((places / coursesComptees) * 100) : 40;
      const effectiveWeight = poidsKg ?? avgWeight;
      const deltaPoids = Math.round((effectiveWeight - avgWeight) * 10) / 10;

      // Diagnostic statut & tolérance au poids
      let statutCharge: 'AVANTAGEUX' | 'OPTIMAL' | 'CHARGE_LOURDE' | 'SURCLASSE' | 'NEUTRE' = 'NEUTRE';
      let scoreTolerance = 50;
      let explication = '';
      let analyseDetaillee = '';

      if (isTrot) {
        if (distanceReculMeters >= 25) {
          statutCharge = 'CHARGE_LOURDE';
          scoreTolerance = Math.max(35, tauxReussite - 15);
          explication = `Handicap de ${distanceReculMeters}m : effort supplémentaire obligatoire pour recoller.`;
          analyseDetaillee = `Ce concurrent doit rendre ${distanceReculMeters} mètres au premier échelon. Ses performances passées (${tauxReussite}% dans les 3 premiers) prouvent sa classe, mais sur ce parcours sélectif, le temps perdu au départ pèsera lourd face à des chevaux bien placés à la limite du recul.`;
        } else {
          statutCharge = 'AVANTAGEUX';
          scoreTolerance = Math.min(95, tauxReussite + 20);
          explication = 'Idéalement placé au premier poteau sans recul de distance.';
          analyseDetaillee = `Profite d'un engagement sur-mesure au premier échelon sans le moindre handicap métrique. Ses lignes passées indiquent une aptitude à préserver sa pointe de vitesse en évitant les efforts extérieurs.`;
        }
      } else {
        // Plat / Obstacle
        const isTopWeight = deltaPoids >= 2.0;
        const isLightWeight = deltaPoids <= -1.5;

        if (isLightWeight && tauxReussite >= 45) {
          statutCharge = 'AVANTAGEUX';
          scoreTolerance = Math.min(98, 75 + Math.round(Math.abs(deltaPoids) * 4));
          explication = `Poids très avantageux (${effectiveWeight} kg, -${Math.abs(deltaPoids)} kg sous la moyenne).`;
          analyseDetaillee = `Excellente situation au poids dans ce handicap. Son passé en compétition montre qu'avec un poids allégé (${effectiveWeight} kg), ce cheval conserve une accélération tranchante et économise son influx dans la phase finale.`;
        } else if (isTopWeight) {
          if (tauxReussite >= 60 || (valeurHandicap && valeurHandicap >= 40)) {
            statutCharge = 'OPTIMAL';
            scoreTolerance = Math.min(88, 65 + Math.round(tauxReussite * 0.25));
            explication = `Top-weight de classe (${effectiveWeight} kg) habitué à porter du lourd.`;
            analyseDetaillee = `Porte l'une des charges les plus lourdes du lot (${effectiveWeight} kg), mais ses résultats passés au plus haut niveau attestent d'une parfaite tolérance au poids. Un modèle de puissance capable de surmonter la charge.`;
          } else {
            statutCharge = 'CHARGE_LOURDE';
            scoreTolerance = Math.max(30, 60 - Math.round(deltaPoids * 7));
            explication = `Poids élevé (${effectiveWeight} kg) qui risque de pénaliser sa fin de course.`;
            analyseDetaillee = `Le poids porté de ${effectiveWeight} kg (+${deltaPoids} kg au-dessus de la moyenne) représente un réel test physique. Sur ce profil de parcours, l'historique de ses dernières courses montre une baisse de régime lorsqu'il porte plus de 58 kg.`;
          }
        } else if (tauxReussite >= 50) {
          statutCharge = 'OPTIMAL';
          scoreTolerance = Math.min(90, 60 + Math.round(tauxReussite * 0.3));
          explication = `Charge parfaitement calibrée (${effectiveWeight} kg) correspondant à ses meilleurs repères.`;
          analyseDetaillee = `Évolue sous un tonnage standard (${effectiveWeight} kg) dans lequel il a signé ses plus belles performances passées. Situation d'équilibre parfait entre vitesse de base et résistance au train.`;
        } else {
          statutCharge = 'NEUTRE';
          scoreTolerance = Math.max(40, tauxReussite);
          explication = `Situation de poids conforme (${effectiveWeight} kg) sans marge excessive.`;
          analyseDetaillee = `Poids de ${effectiveWeight} kg conforme à sa valeur actuelle. Pour espérer un podium, il devra bénéficier d'un parcours caché à l'économie pour ne pas accuser le coup dans les derniers hectomètres.`;
        }
      }

      return {
        partant: p,
        num,
        nom,
        poidsKg,
        valeurHandicap,
        cote,
        musique,
        isTrot,
        distanceReculMeters,
        perfPassesPlaces: places,
        perfPassesVictoires: victoires,
        tauxReussiteTop3: tauxReussite,
        statutCharge,
        scoreTolerancePoids: scoreTolerance,
        explicationImpact: explication,
        analyseDetaillee,
        deltaPoidsEstime: deltaPoids,
      };
    });
  }, [activePartants, course.discipline, course.distance, isTrot]);

  // Statistiques globales du lot
  const lotStats = useMemo(() => {
    if (diagnostics.length === 0) {
      return {
        topWeight: 0,
        bottomWeight: 0,
        ecartMax: 0,
        avgWeight: 0,
        pctAvantageux: 0,
      };
    }

    const weights = diagnostics.map(d => d.poidsKg).filter((w): w is number => w !== null);
    if (weights.length === 0) {
      return {
        topWeight: 0,
        bottomWeight: 0,
        ecartMax: 0,
        avgWeight: 0,
        pctAvantageux: 0,
      };
    }

    const topWeight = Math.max(...weights);
    const bottomWeight = Math.min(...weights);
    const ecartMax = Math.round((topWeight - bottomWeight) * 10) / 10;
    const avgWeight = Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10;
    const countAvantageux = diagnostics.filter(d => d.statutCharge === 'AVANTAGEUX' || d.scoreTolerancePoids >= 75).length;
    const pctAvantageux = Math.round((countAvantageux / diagnostics.length) * 100);

    return {
      topWeight,
      bottomWeight,
      ecartMax,
      avgWeight,
      pctAvantageux,
    };
  }, [diagnostics]);

  // Filtrage et Tri
  const filteredAndSortedDiagnostics = useMemo(() => {
    let list = [...diagnostics];

    if (filterMode === 'TOP_WEIGHT') {
      list = list.filter(d => d.deltaPoidsEstime >= 1.0 || d.distanceReculMeters > 0);
    } else if (filterMode === 'LIGHT_WEIGHT') {
      list = list.filter(d => d.deltaPoidsEstime <= -1.0 || (d.isTrot && d.distanceReculMeters === 0));
    } else if (filterMode === 'FAVORITES') {
      list = list.filter(d => d.cote <= 10.0);
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'poids') {
        const wA = a.poidsKg ?? 0;
        const wB = b.poidsKg ?? 0;
        diff = wB - wA;
      } else if (sortField === 'score') {
        diff = b.scoreTolerancePoids - a.scoreTolerancePoids;
      } else if (sortField === 'numero') {
        diff = a.num - b.num;
      } else if (sortField === 'cote') {
        diff = a.cote - b.cote;
      }
      return sortOrder === 'asc' ? -diff : diff;
    });

    return list;
  }, [diagnostics, filterMode, sortField, sortOrder]);

  const toggleSort = (field: 'poids' | 'score' | 'numero' | 'cote') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="w-full bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* En-tête Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/10 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg flex-shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                Impact Spécifique du Handicap & du Poids Porté
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {isTrot ? 'Rendement de Distance' : 'Charges Pondérales'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Analyse détaillée de la charge ({isTrot ? 'échelon de départ / recul' : 'kg & valeur handicap'}), corrélée à la régularité passée sur le tracé de{' '}
              <span className="text-slate-200 font-bold">{course.hippodrome || 'l’hippodrome'}</span> ({course.distance || 2400}m • Corde à {course.corde || 'gauche'}).
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
          title={isExpanded ? 'Réduire la section' : 'Déplier la section'}
        >
          <span>{isExpanded ? 'Réduire' : 'Développer'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Bloc KPIs Synthétiques du Lot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Top-Weight (Max)</span>
                <TrendingUp className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {isTrot ? (course.partants?.some(p => p.distance && Number(p.distance) > Number(course.distance)) ? '+25m' : 'Poteau unique') : (lotStats.topWeight > 0 ? `${lotStats.topWeight} kg` : 'Non renseigné')}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Charge la plus lourde portée</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Bottom-Weight (Min)</span>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-300">
                {isTrot ? '1er échelon' : (lotStats.bottomWeight > 0 ? `${lotStats.bottomWeight} kg` : '53.0 kg')}
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-1">Avantage maximal au poids</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Écart de Charge (Δ)</span>
                <Scale className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300">
                {isTrot ? (course.partants?.some(p => p.distance && Number(p.distance) > Number(course.distance)) ? '25 m' : '0 m') : (lotStats.ecartMax > 0 ? `${lotStats.ecartMax} kg` : '—')}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {isTrot ? 'Rendement de distance imposé' : `≈ ${(lotStats.ecartMax * 0.4).toFixed(1)} longueurs théoriques`}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Profil Tracé Exigeant</span>
                <Gauge className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-300">
                {Number(course.distance || 2400) >= 2400 ? 'Sélectif' : 'Vitesse'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Impact accru sur le sprint final</span>
            </div>
          </div>

          {/* Synthèse Didactique : Règle Physique du Tracé */}
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1 text-xs sm:text-sm">
              <h4 className="font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                <span>Loi Balistique & Influence du Poids sur ce Tracé</span>
                <span className="text-slate-400 text-xs font-normal">({course.distance}m • {course.terrain || 'Terrain standard'})</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                {isTrot ? (
                  <>
                    Au trot, le rendement de distance de 25 mètres équivaut mathématiquement à un handicap d'environ <strong>1 seconde et 2 dixièmes</strong> au kilomètre. Les chevaux du second échelon doivent produire un effort intense en 3e épaisseur dans les tournants de l'hippodrome de {course.hippodrome || 'l’hippodrome'}. Les chevaux rapides au départ du 1er poteau détiennent un avantage tactique majeur.
                  </>
                ) : (
                  <>
                    En galop/plat sur {course.distance}m, chaque kilo supplémentaire équivaut historiquement à <strong>une demi-longueur de pénalité</strong> à l'arrivée (et jusqu'à 1 longueur pleine si le terrain est assoupli ou lourd). Les chevaux confirmés sous forte charge (Top-Weights) disposent d'un indice de résistance supérieur, tandis que les outsiders bien déchargés du bas de tableau bénéficient d'une vivacité d'accélération décisive dans les 200 derniers mètres.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Barre de Filtres & Tri Rapide */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>Filtres :</span>
              </span>
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterMode === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                Tous ({diagnostics.length})
              </button>
              <button
                onClick={() => setFilterMode('TOP_WEIGHT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterMode === 'TOP_WEIGHT'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {isTrot ? 'Rendement (+25m)' : 'Top-Weights (Lourds)'}
              </button>
              <button
                onClick={() => setFilterMode('LIGHT_WEIGHT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterMode === 'LIGHT_WEIGHT'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {isTrot ? '1er Échelon (Avantage)' : 'Bas de Tableau (Légers)'}
              </button>
              <button
                onClick={() => setFilterMode('FAVORITES')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterMode === 'FAVORITES'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                Favoris (&lt; 10/1)
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400 font-semibold">Trier par :</span>
              <button
                onClick={() => toggleSort('poids')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                  sortField === 'poids' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span>Poids</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleSort('score')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                  sortField === 'score' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span>Tolérance</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleSort('cote')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                  sortField === 'cote' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span>Cote</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grille des Partants avec Diagnostic Détaillé */}
          <div className="space-y-3">
            {filteredAndSortedDiagnostics.map(diag => {
              const isSelected = selectedHorseNumbers.includes(diag.num);
              const isDetailOpen = selectedHorseId === diag.num;

              let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
              let badgeLabel = 'Situation Neutre';
              if (diag.statutCharge === 'AVANTAGEUX') {
                badgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
                badgeLabel = 'Situation Avantageuse 🚀';
              } else if (diag.statutCharge === 'OPTIMAL') {
                badgeBg = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
                badgeLabel = 'Poids Optimal & Confirmé ⭐';
              } else if (diag.statutCharge === 'CHARGE_LOURDE') {
                badgeBg = 'bg-rose-950/80 text-rose-300 border-rose-500/50';
                badgeLabel = isTrot ? 'Rendement +25m ⚠️' : 'Poids Limite / Lourd ⚠️';
              }

              return (
                <div
                  key={`diag-weight-${diag.num}`}
                  className={`bg-slate-950/70 border rounded-2xl p-4 transition-all duration-200 hover:border-slate-600 ${
                    isSelected ? 'border-amber-500/80 ring-1 ring-amber-500/50 bg-amber-950/10' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Infos Cheval & Numéro */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-white text-base shadow-inner flex-shrink-0">
                        {diag.num}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-white text-sm truncate">{diag.nom}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                          <span>Jockey/Driver : <strong className="text-slate-300">{diag.partant.driver || 'Non spécifié'}</strong></span>
                          <span>•</span>
                          <span>Musique : <strong className="text-amber-400 font-mono">{diag.musique || '—'}</strong></span>
                          <span>•</span>
                          <span>Cote : <strong className="text-slate-200">{diag.cote}/1</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Données Poids & Jauge de Tolérance */}
                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <div className="text-right">
                        <div className="text-sm font-black text-white">
                          {isTrot ? (
                            diag.distanceReculMeters > 0 ? (
                              <span className="text-rose-400">+{diag.distanceReculMeters}m</span>
                            ) : (
                              <span className="text-emerald-400">1er échelon</span>
                            )
                          ) : (
                            diag.poidsKg ? (
                              <span>
                                {diag.poidsKg} kg{' '}
                                <span className={`text-[11px] font-bold ${diag.deltaPoidsEstime > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  ({diag.deltaPoidsEstime > 0 ? `+${diag.deltaPoidsEstime}` : `${diag.deltaPoidsEstime}`})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">56 kg</span>
                            )
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {diag.valeurHandicap ? `Valeur ${diag.valeurHandicap}` : 'Poids de course'}
                        </div>
                      </div>

                      {/* Jauge Tolérance au poids */}
                      <div className="w-24 sm:w-28 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Indice Poids</span>
                          <span className="font-black text-amber-400">{diag.scoreTolerancePoids}%</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              diag.scoreTolerancePoids >= 75
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : diag.scoreTolerancePoids >= 55
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-r from-rose-500 to-orange-400'
                            }`}
                            style={{ width: `${diag.scoreTolerancePoids}%` }}
                          />
                        </div>
                      </div>

                      {/* Bouton Ticket & Déplier détails */}
                      <div className="flex items-center gap-1.5">
                        {onSelectHorseForTicket && (
                          <button
                            onClick={() => onSelectHorseForTicket(diag.num)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                            title={isSelected ? 'Retirer du ticket' : 'Ajouter au ticket de jeu'}
                          >
                            {isSelected ? '✓ Retenu' : '+ Ticket'}
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedHorseId(isDetailOpen ? null : diag.num)}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                          title="Voir le détail de l'impact passé"
                        >
                          {isDetailOpen ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Synthèse textuelle de l'impact (Affichée en permanence) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-amber-400 font-bold flex-shrink-0">Impact :</span>
                    <span className="leading-relaxed">{diag.explicationImpact}</span>
                  </div>

                  {/* Volet Déplié avec Analyse Approfondie des Performances Passées */}
                  {isDetailOpen && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 animate-fadeIn text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Corrélation Historique Poids × Musique</span>
                        </span>
                        <span>
                          Réussite Passée Top 3 : <strong className="text-emerald-400">{diag.tauxReussiteTop3}%</strong> ({diag.perfPassesPlaces} places dont {diag.perfPassesVictoires} victoires sur ses 8 dernières sorties)
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed pt-1">
                        {diag.analyseDetaillee}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
export default HandicapWeightImpactAnalysisCard;
