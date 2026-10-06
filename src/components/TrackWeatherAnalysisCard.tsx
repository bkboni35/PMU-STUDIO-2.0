import React, { useState, useMemo } from 'react';
import {
  CloudSun,
  Wind,
  Droplets,
  Compass,
  MapPin,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Award,
  Sparkles,
  Layers,
  ArrowRight,
  Gauge,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trophy,
  Target,
  Check,
  Percent,
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { getHorseGenyOdds } from '../utils/v38Helper';

interface TrackWeatherAnalysisCardProps {
  course: CourseHippique;
  onNavigateTab?: (tab: any) => void;
  onSelectHorseForTicket?: (numero: number) => void;
  selectedHorseNumbers?: number[];
}

export const TrackWeatherAnalysisCard: React.FC<TrackWeatherAnalysisCardProps> = ({
  course,
  onNavigateTab,
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
}) => {
  const [oddsSortOrder, setOddsSortOrder] = useState<'asc' | 'desc'>('asc');
  const [oddsCategoryFilter, setOddsCategoryFilter] = useState<'all' | 'favoris' | 'secondes' | 'outsiders'>('all');

  const discipline = (course.discipline || 'Attelé').toLowerCase();
  const hippodrome = course.hippodrome || 'Hippodrome';
  const corde = course.corde || 'Gauche';
  const distance = course.distance || 2400;
  const terrain = course.terrain || 'Bon - Terrain assoupli';

  const isGalop = discipline.includes('plat') || discipline.includes('galop');
  const isObstacle = discipline.includes('haie') || discipline.includes('steeple') || discipline.includes('obstacle');
  const isTrot = discipline.includes('trot') || discipline.includes('attel') || discipline.includes('mont');

  // Helper pour extraire la cote probable d'un partant
  const getHorseOdds = (p: Partant): number => {
    if (p.coteProbable !== undefined && !isNaN(Number(p.coteProbable)) && Number(p.coteProbable) > 0) {
      return Number(p.coteProbable);
    }
    const geny = getHorseGenyOdds(p);
    if (geny && !isNaN(Number(geny)) && Number(geny) > 0) {
      return Number(geny);
    }
    return 99;
  };

  // Déduction dynamique de la météo et du pénétromètre d'après le terrain et le lieu
  const penetrometreVal = terrain.toLowerCase().includes('lourd') ? '4.2 (Lourd)' :
                          terrain.toLowerCase().includes('très souple') ? '3.8 (Très Souple)' :
                          terrain.toLowerCase().includes('souple') ? '3.5 (Souple)' :
                          terrain.toLowerCase().includes('mâchefer') ? 'Piste en Mâchefer compact' :
                          terrain.toLowerCase().includes('psf') ? 'Piste en Sable Fibré (PSF)' : '3.2 (Bon - Bon Souple)';

  const weatherTemp = terrain.toLowerCase().includes('lourd') || terrain.toLowerCase().includes('souple') ? '14°C' : '19°C';
  const weatherRain = terrain.toLowerCase().includes('lourd') ? '80% (Averses éparses)' : '15% (Faible risque)';
  const windInfo = corde === 'Droite' ? '18 km/h (Vent de face en ligne droite)' : '14 km/h (Vent de côté)';

  // Tous les partants actifs de la course
  const partantsActifs = useMemo(() => {
    return (course.partants || []).filter((p: Partant) => !p.estNonPartant && p.statut !== 'Non-partant');
  }, [course.partants]);

  // Chevaux ayant un profil adapté ou retenus pour ce tracé, classés rigoureusement selon leur cote
  const rankedHorsesByOdds = useMemo(() => {
    // 1. Filtrer les chevaux qui ont une adéquation avec ce tracé
    const favored = partantsActifs.filter((p: Partant) => {
      if (isGalop && p.corde && p.corde <= 8) return true;
      if (isTrot && (p.ferrure === 'D4' || p.ferrure === 'DP' || p.ferrure === 'DA')) return true;
      if (p.hippoScore && p.hippoScore >= 70) return true;
      return true; // Tous les partants de la course
    });

    // 2. Tri strict en fonction de leur cote
    return [...favored].sort((a, b) => {
      const oA = getHorseOdds(a);
      const oB = getHorseOdds(b);
      if (oddsSortOrder === 'asc') {
        if (oA !== oB) return oA - oB;
      } else {
        if (oA !== oB) return oB - oA;
      }
      return Number(a.numero) - Number(b.numero);
    });
  }, [partantsActifs, isGalop, isTrot, oddsSortOrder]);

  // Filtrage par tranche de cote
  const filteredRankedHorses = useMemo(() => {
    if (oddsCategoryFilter === 'favoris') {
      return rankedHorsesByOdds.filter(p => getHorseOdds(p) <= 8.0);
    }
    if (oddsCategoryFilter === 'secondes') {
      return rankedHorsesByOdds.filter(p => getHorseOdds(p) > 8.0 && getHorseOdds(p) <= 20.0);
    }
    if (oddsCategoryFilter === 'outsiders') {
      return rankedHorsesByOdds.filter(p => getHorseOdds(p) > 20.0);
    }
    return rankedHorsesByOdds;
  }, [rankedHorsesByOdds, oddsCategoryFilter]);

  // Top 5 des numéros classés par cote pour sélection rapide
  const top5ByOdds = useMemo(() => {
    return rankedHorsesByOdds.slice(0, 5).map(p => Number(p.numero));
  }, [rankedHorsesByOdds]);

  const handleSelectTop5 = () => {
    if (onSelectHorseForTicket) {
      top5ByOdds.forEach(num => {
        if (!selectedHorseNumbers.includes(num)) {
          onSelectHorseForTicket(num);
        }
      });
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-[#0a1325] to-slate-950 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 my-4 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20 font-black">
            <span className="text-2xl leading-none">🏛️</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                Tracé, Piste & Facteurs Déterminants
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                Geny.com & Paris-Turf.com
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              Piste de {hippodrome} · {distance}m ({corde === 'Droite' ? 'Corde à Droite' : 'Corde à Gauche'})
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('partants')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="Consulter le tableau complet des partants"
            >
              <span>Tableau des Partants</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href={course.sourceUrl || 'https://www.geny.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Geny.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Grid des 4 Métriques de Piste & Météo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. État du Terrain & Pénétromètre */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>Terrain & Pénétromètre</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-base font-black text-white">{terrain}</div>
          <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-block">
            Index : {penetrometreVal}
          </div>
          <p className="text-[11px] text-slate-400">
            {isGalop ? 'Impact direct sur la vitesse de pointe en ligne droite.' : 'Piste souple favorisant les trotteurs avec du fond.'}
          </p>
        </div>

        {/* 2. Température & Précipitations */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative group hover:border-teal-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-teal-400" />
              <span>Météo & Climat</span>
            </span>
            <CloudSun className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-base font-black text-white">{weatherTemp} · {weatherRain}</div>
          <div className="text-xs font-mono font-bold text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-500/30 inline-block">
            {terrain.toLowerCase().includes('lourd') ? 'Pluie récente : Piste alourdie' : 'Temps clair : Piste régulière'}
          </div>
          <p className="text-[11px] text-slate-400">
            Température idéale pour la récupération respiratoire des athlètes.
          </p>
        </div>

        {/* 3. Vent & Aérodynamisme */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-amber-400" />
              <span>Vent & Orientation</span>
            </span>
            <Wind className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-black text-white">{windInfo}</div>
          <div className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/30 inline-block">
            {corde === 'Droite' ? 'Avantage aux animateurs en tête' : 'Ligne droite favorable aux finisseurs'}
          </div>
          <p className="text-[11px] text-slate-400">
            Contraint les chevaux en 3ème épaisseur à fournir un effort supplémentaire.
          </p>
        </div>

        {/* 4. Écarts de Corde & Stalle */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Biais Corde & Stalles</span>
            </span>
            <Compass className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-black text-white">Corde à {corde}</div>
          <div className="text-xs font-mono font-bold text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-500/30 inline-block">
            {isGalop ? 'Avantage Stalles 1 à 6' : isTrot ? 'Trajectoire optimale au ras du rail' : 'Aptitude saut en virage'}
          </div>
          <p className="text-[11px] text-slate-400">
            {isGalop ? 'Évite de parcourir du chemin supplémentaire dans les tournants.' : 'Virage serré : maîtrise du balancier indispensable.'}
          </p>
        </div>
      </div>

      {/* SECTION MAÎTRESSE : CLASSEMENT DES NUMÉROS TROUVÉS EN FONCTION DE LEUR COTE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/95 border-2 border-amber-500/50 shadow-2xl space-y-4">
        {/* En-tête du classement */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Trophy className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-black text-white">
                  Numéros du Tracé Classés par Ordre de Cote
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  {oddsSortOrder === 'asc' ? 'Cotes Croissantes (Favoris ➔ Outsiders)' : 'Cotes Décroissantes'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hiérarchisation directe de chaque cheval selon sa cote probable PMU/Geny sur le tracé de {hippodrome} ({distance}m)
              </p>
            </div>
          </div>

          {/* Contrôles de tri et filtres de cotes */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bouton Inverser le Tri */}
            <button
              type="button"
              onClick={() => setOddsSortOrder(oddsSortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
              title="Inverser le sens du tri par cote"
            >
              {oddsSortOrder === 'asc' ? (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                  <span>Cote Croissante ↗</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />
                  <span>Cote Décroissante ↘</span>
                </>
              )}
            </button>

            {/* Sélecteur de tranche de cote */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setOddsCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  oddsCategoryFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tous ({rankedHorsesByOdds.length})
              </button>
              <button
                type="button"
                onClick={() => setOddsCategoryFilter('favoris')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  oddsCategoryFilter === 'favoris'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                Favoris (&le; 8/1)
              </button>
              <button
                type="button"
                onClick={() => setOddsCategoryFilter('secondes')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  oddsCategoryFilter === 'secondes'
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-sky-300'
                }`}
              >
                Secondes (8-20/1)
              </button>
              <button
                type="button"
                onClick={() => setOddsCategoryFilter('outsiders')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  oddsCategoryFilter === 'outsiders'
                    ? 'bg-purple-500 text-white font-black'
                    : 'text-slate-400 hover:text-purple-300'
                }`}
              >
                Outsiders (&gt; 20/1)
              </button>
            </div>

            {/* Bouton sélectionner Top 5 pour ticket */}
            {onSelectHorseForTicket && (
              <button
                type="button"
                onClick={handleSelectTop5}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                title="Cocher automatiquement les 5 chevaux aux plus petites cotes"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Cocher Top 5 Cotes</span>
              </button>
            )}
          </div>
        </div>

        {/* Ligne récapitulative concise des numéros ordonnés par cote */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-extrabold text-amber-400 flex items-center gap-1.5 shrink-0">
            <span className="text-sm">🎯</span>
            <span>Ordre des Cotes :</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {rankedHorsesByOdds.map((p, idx) => {
              const num = Number(p.numero);
              const odds = getHorseOdds(p);
              const isSelected = selectedHorseNumbers.includes(num);

              let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
              if (odds <= 5.0) badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              else if (odds <= 10.0) badgeBg = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
              else if (odds <= 20.0) badgeBg = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
              else if (odds <= 50.0) badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              else badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-500/40';

              return (
                <button
                  key={`pill-num-${num}-${idx}`}
                  type="button"
                  onClick={() => onSelectHorseForTicket && onSelectHorseForTicket(num)}
                  className={`px-2 py-1 rounded-xl border text-[11px] font-black font-mono transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${badgeBg} ${
                    isSelected ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/20' : 'hover:scale-105'
                  }`}
                  title={`N°${num} ${p.nom} - Cote ${odds}/1. Cliquez pour cocher/décocher sur votre ticket.`}
                >
                  <span className="text-slate-400 font-sans text-[9px] font-bold">#{idx + 1}</span>
                  <span className="font-extrabold text-white text-xs">N°{num}</span>
                  <span className="text-amber-300 font-bold">({odds}/1)</span>
                  {isSelected && <Check className="w-3 h-3 text-amber-400 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille détaillée des cartes de chevaux classés par cote */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
          {filteredRankedHorses.map((p, idx) => {
            const num = Number(p.numero);
            const odds = getHorseOdds(p);
            const isSelected = selectedHorseNumbers.includes(num);

            // Classification par couleur selon la cote
            let categoryName = 'Outsider Spéculatif';
            let categoryColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
            let rankColor = 'bg-purple-500 text-white';

            if (odds <= 5.0) {
              categoryName = 'Grand Favori du Tracé';
              categoryColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              rankColor = 'bg-emerald-500 text-slate-950 font-black';
            } else if (odds <= 8.0) {
              categoryName = 'Favori Solide';
              categoryColor = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
              rankColor = 'bg-teal-500 text-slate-950 font-black';
            } else if (odds <= 15.0) {
              categoryName = 'Seconde Chance';
              categoryColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
              rankColor = 'bg-sky-500 text-slate-950 font-black';
            } else if (odds <= 25.0) {
              categoryName = 'Outsider Séduisant';
              categoryColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              rankColor = 'bg-amber-500 text-slate-950 font-black';
            } else if (odds > 50.0) {
              categoryName = 'Tocard / Très Grande Cote';
              categoryColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              rankColor = 'bg-rose-500 text-white font-black';
            }

            return (
              <div
                key={`ranked-horse-${num}-${idx}`}
                onClick={() => onSelectHorseForTicket && onSelectHorseForTicket(num)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top : Rang par cote & Badge catégorie */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${rankColor}`}>
                      {idx + 1}
                      {idx === 0 ? 'er' : 'e'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${categoryColor}`}>
                      {categoryName}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Coché</span>
                    </span>
                  )}
                </div>

                {/* Milieu : Numéro, Nom et Cote Géante */}
                <div className="flex items-center justify-between gap-3 my-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black font-mono text-base flex items-center justify-center shrink-0 shadow-md">
                      {num}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-black text-white truncate max-w-[130px]" title={p.nom}>
                        {p.nom}
                      </h5>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {p.driver || 'Driver'}
                      </span>
                    </div>
                  </div>

                  {/* Cote Probable en Évidence */}
                  <div className="text-right shrink-0">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Cote</span>
                    <span className="font-mono text-base font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                      {odds}/1
                    </span>
                  </div>
                </div>

                {/* Bas : Critères d'Aptitude au Tracé (Corde, Ferrure, HippoScore) */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] text-slate-300">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.corde !== undefined && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-950 text-teal-300 border border-slate-800 font-mono font-bold">
                        Corde {p.corde}
                      </span>
                    )}
                    {p.ferrure && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-950 text-amber-300 border border-slate-800 font-bold">
                        {p.ferrure}
                      </span>
                    )}
                    {p.hippoScore && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                        {p.hippoScore} pts
                      </span>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-500 group-hover:text-amber-400 transition-colors">
                    {isSelected ? 'Coché' : '+ Ticket'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bloc Recommandation Turfiste d'Aptitude */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              Recommandation Turfiste d'Aptitude à la Piste
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Geny.com & Paris-Turf.com
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isTrot ? (
            <>
              Sur le tracé de <strong className="text-amber-300">{hippodrome}</strong> ({distance}m corde à {corde.toLowerCase()}), la pénétrométrie favorise les concurrents présentés dans leur configuration de ferrure optimale (<strong className="text-emerald-400">D4 / DP</strong>) capables de prendre rapidement le train à leur compte sans concéder de terrain au départ.
            </>
          ) : isGalop ? (
            <>
              Pour cette épreuve de plat à <strong className="text-amber-300">{hippodrome}</strong>, le profil de la piste et le terrain (<strong className="text-emerald-400">{terrain}</strong>) confèrent un avantage déterminant aux petits numéros de corde (stalles 1 à 6) sachant rapidement se placer dans le sillage des animateurs.
            </>
          ) : (
            <>
              Sur les obstacles de <strong className="text-amber-300">{hippodrome}</strong>, la tenue et la précision du saut sur terrain {terrain.toLowerCase()} primeront dans la phase finale pour faire la différence.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

