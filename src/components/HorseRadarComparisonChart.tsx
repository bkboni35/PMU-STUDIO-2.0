import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { ShieldCheck, Compass, Sparkles, Trophy, Flame, Gauge, Award, CheckCircle2, Filter, Layers } from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';
import { calculerEcartEtForme } from '../utils/turfCalculations';
import { computePartantHippoScore } from '../utils/geminiMultiModelEngine';

interface HorseRadarComparisonChartProps {
  course: CourseHippique;
  selectedHorseNumbers?: number[];
  onSelectHorseForTicket?: (numero: number) => void;
}

export interface HorseRadarMetrics {
  numero: number;
  nom: string;
  keyName: string;
  driver: string;
  ferrure: string;
  cote?: number;
  color: string;
  fillColor: string;
  regularite: number;
  forme: number;
  vitesse: number;
  gains: number;
  aptitude: number;
  hippoScore: number;
}

const PRESET_COLORS = [
  { stroke: '#10b981', fill: '#10b981', badge: 'bg-emerald-500 text-slate-950', border: 'border-emerald-500/50' },
  { stroke: '#f59e0b', fill: '#f59e0b', badge: 'bg-amber-500 text-slate-950', border: 'border-amber-500/50' },
  { stroke: '#06b6d4', fill: '#06b6d4', badge: 'bg-cyan-500 text-slate-950', border: 'border-cyan-500/50' },
  { stroke: '#ec4899', fill: '#ec4899', badge: 'bg-pink-500 text-white', border: 'border-pink-500/50' },
  { stroke: '#8b5cf6', fill: '#8b5cf6', badge: 'bg-purple-500 text-white', border: 'border-purple-500/50' },
];

export const HorseRadarComparisonChart: React.FC<HorseRadarComparisonChartProps> = ({
  course,
  selectedHorseNumbers = [],
  onSelectHorseForTicket,
}) => {
  const partants = (course.partants || []).filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

  // Trouver le gain maximal dans le lot pour la normalisation
  const maxGainsInField = useMemo(() => {
    return Math.max(...partants.map((p) => p.gains || 0), 10000);
  }, [partants]);

  // Calcul des 5 dimensions pour chaque cheval
  const allHorseMetrics = useMemo(() => {
    return partants.map((p) => {
      const ecartData = calculerEcartEtForme(p.musique || '');
      const hScore = computePartantHippoScore(p, course);

      // 1. Gains / Classe (0-100)
      const rawGains = p.gains || 0;
      const gainsScore = Math.min(100, Math.max(15, Math.round((rawGains / maxGainsInField) * 100)));

      // 2. Régularité (0-100)
      let regScore = p.regularitePourcent;
      if (regScore === undefined || regScore === null) {
        regScore = ecartData.totalRacesRecorded > 0 ? ecartData.tauxPodium : Math.round(hScore * 0.7);
      }
      regScore = Math.min(100, Math.max(15, Math.round(regScore)));

      // 3. Forme Récente (0-100)
      let formeScore = 50;
      if (ecartData.ecartVictoire === 0) formeScore = 95;
      else if (ecartData.ecartVictoire === 1) formeScore = 88;
      else if (ecartData.ecartVictoire === 2) formeScore = 78;
      else if (ecartData.ecartVictoire === 3) formeScore = 68;
      else if (ecartData.ecartVictoire === 4) formeScore = 58;
      else formeScore = Math.max(20, 50 - (ecartData.ecartVictoire - 4) * 5);

      if (p.coteProbable && p.coteProbable <= 4.0) formeScore = Math.min(100, formeScore + 8);

      // 4. Vitesse / Chrono (0-100)
      let vitScore = Math.round(hScore * 0.92);
      if (p.coteProbable !== undefined && p.coteProbable > 0) {
        const coteVit = Math.max(20, Math.round(100 - p.coteProbable * 1.5));
        vitScore = Math.round((vitScore + coteVit) / 2);
      }
      vitScore = Math.min(100, Math.max(20, vitScore));

      // 5. Aptitude Terrain & Parcours (0-100)
      let aptScore = 60;
      const discipline = (course.discipline || '').toLowerCase();
      const ferrure = (p.ferrure || '').toUpperCase();

      if (ferrure === 'D4') aptScore += 20;
      else if (ferrure === 'DP' || ferrure === 'DA') aptScore += 10;

      if (discipline.includes('plat') && p.corde && p.corde <= 6) aptScore += 15;
      if (p.hippoScore && p.hippoScore >= 80) aptScore += 10;

      aptScore = Math.min(100, Math.max(25, aptScore));

      return {
        numero: p.numero,
        nom: p.nom,
        keyName: `N°${p.numero} ${p.nom.slice(0, 12)}`,
        driver: p.driver || 'Driver N.R.',
        ferrure: p.ferrure || 'F',
        cote: p.coteProbable,
        hippoScore: hScore,
        regularite: regScore,
        forme: formeScore,
        vitesse: vitScore,
        gains: gainsScore,
        aptitude: aptScore,
      };
    });
  }, [partants, course, maxGainsInField]);

  // Déterminer les chevaux à afficher dans le comparateur (jusqu'à 5)
  const defaultSelectedNums = useMemo(() => {
    if (selectedHorseNumbers && selectedHorseNumbers.length > 0) {
      return selectedHorseNumbers.slice(0, 5);
    }
    // Si aucun sélectionné, prendre les 3-4 premiers chevaux favoris
    const sorted = [...allHorseMetrics].sort((a, b) => (a.cote ?? 99) - (b.cote ?? 99));
    return sorted.slice(0, 3).map((h) => h.numero);
  }, [selectedHorseNumbers, allHorseMetrics]);

  const [activeNums, setActiveNums] = useState<number[]>(defaultSelectedNums);

  // Synchroniser quand la sélection de tickets évolue
  React.useEffect(() => {
    if (selectedHorseNumbers && selectedHorseNumbers.length > 0) {
      setActiveNums(selectedHorseNumbers.slice(0, 5));
    }
  }, [selectedHorseNumbers]);

  const toggleHorseComparison = (num: number) => {
    if (activeNums.includes(num)) {
      if (activeNums.length > 1) {
        setActiveNums(activeNums.filter((n) => n !== num));
      }
    } else {
      if (activeNums.length < 5) {
        setActiveNums([...activeNums, num]);
      } else {
        setActiveNums([...activeNums.slice(1), num]);
      }
    }
  };

  // Filtrer les métriques des chevaux actuellement comparés
  const comparedHorses: HorseRadarMetrics[] = useMemo(() => {
    const list: HorseRadarMetrics[] = [];
    activeNums.forEach((num, idx) => {
      const h = allHorseMetrics.find((m) => m.numero === num);
      if (h) {
        const colorObj = PRESET_COLORS[idx % PRESET_COLORS.length];
        list.push({
          ...h,
          ferrure: String(h.ferrure),
          color: colorObj.stroke,
          fillColor: colorObj.fill,
        });
      }
    });
    return list;
  }, [activeNums, allHorseMetrics]);

  // Transformer les données pour Recharts RadarChart (6 Axes avec corrélation HippoScore & Gains)
  const radarChartData = useMemo(() => {
    const axes = [
      { dimensionKey: 'regularite', label: 'Régularité %' },
      { dimensionKey: 'forme', label: 'Forme Récente' },
      { dimensionKey: 'vitesse', label: 'Vitesse / Chrono' },
      { dimensionKey: 'gains', label: 'Gains & Classe' },
      { dimensionKey: 'hippoScore', label: 'Indice IA (HippoScore)' },
      { dimensionKey: 'aptitude', label: 'Aptitude Terrain' },
    ];

    return axes.map((axis) => {
      const dataRow: Record<string, any> = {
        subject: axis.label,
        fullMark: 100,
      };

      comparedHorses.forEach((horse) => {
        dataRow[horse.keyName] = (horse as any)[axis.dimensionKey] || 0;
      });

      return dataRow;
    });
  }, [comparedHorses]);

  if (!partants || partants.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-[#0b1428] to-slate-950 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-4 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/20 font-black">
            <Compass className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider">
                Graphique Radar Interactif 6D
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                Corrélation HippoScore & Gains
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              HippoScore · Gains · Régularité · Forme · Vitesse · Aptitude
            </h3>
          </div>
        </div>

        {/* Info Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Comparez jusqu'à <strong>5 chevaux</strong> simultanément</span>
        </div>
      </div>

      {/* Boutons Sélecteurs des Chevaux pour le Comparateur Radar */}
      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase text-slate-400 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sélectionner les chevaux à comparer sur le Radar :</span>
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {allHorseMetrics.map((h, idx) => {
            const isCompared = activeNums.includes(h.numero);
            const colorIdx = activeNums.indexOf(h.numero);
            const colorObj = colorIdx >= 0 ? PRESET_COLORS[colorIdx % PRESET_COLORS.length] : null;

            return (
              <button
                key={`radar-horse-${h.numero}-${idx}`}
                type="button"
                onClick={() => toggleHorseComparison(h.numero)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 border shadow-sm active:scale-95 ${
                  isCompared
                    ? `${colorObj?.badge} ${colorObj?.border} ring-2 ring-indigo-400/50`
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span className="font-mono font-black text-xs">N°{h.numero}</span>
                <span className="truncate max-w-[100px]">{h.nom}</span>
                {h.cote !== undefined && (
                  <span className="text-[10px] opacity-80 font-mono">({h.cote}/1)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone Graphique Radar & Légende synthétique */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts RadarChart Container */}
        <div className="lg:col-span-7 h-[340px] sm:h-[380px] w-full bg-slate-950/80 border border-slate-800 rounded-3xl p-3 shadow-inner flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
              <PolarGrid stroke="#334155" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 'bold' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              />
              {comparedHorses.map((horse, idx) => (
                <Radar
                  key={`radar-comp-${horse.numero}-${idx}`}
                  name={horse.keyName}
                  dataKey={horse.keyName}
                  stroke={horse.color}
                  fill={horse.fillColor}
                  fillOpacity={0.35}
                  strokeWidth={2.5}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Fiches de Synthèse des 5 Dimensions par Cheval */}
        <div className="lg:col-span-5 space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-slate-800">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Scores Détaillés des Chevaux Comparés (/100) :</span>
          </h4>

          {comparedHorses.map((horse, idx) => (
            <div
              key={`radar-card-${horse.numero}-${idx}`}
              className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: horse.color }}
                  />
                  <span className="font-extrabold text-white text-sm">
                    N°{horse.numero} {horse.nom}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {horse.ferrure}
                  </span>
                </div>
                {horse.cote !== undefined && (
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {horse.cote}/1
                  </span>
                )}
              </div>

              {/* Progress Bars for 5 Dimensions */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-medium text-slate-300">
                {/* Régularité */}
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-400">Régularité</span>
                    <span className="font-mono font-bold text-emerald-400">{horse.regularite}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${horse.regularite}%` }}
                    />
                  </div>
                </div>

                {/* Forme */}
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-400">Forme</span>
                    <span className="font-mono font-bold text-amber-300">{horse.forme}/100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${horse.forme}%` }}
                    />
                  </div>
                </div>

                {/* Vitesse */}
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-400">Vitesse</span>
                    <span className="font-mono font-bold text-cyan-400">{horse.vitesse}/100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{ width: `${horse.vitesse}%` }}
                    />
                  </div>
                </div>

                {/* Gains / Classe */}
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-400">Gains & Classe</span>
                    <span className="font-mono font-bold text-purple-400">{horse.gains}/100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${horse.gains}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
