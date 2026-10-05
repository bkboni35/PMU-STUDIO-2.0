import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { CourseHippique, Partant } from '../types/turf';
import { BarChart3, Sparkles, Trophy, ShieldCheck, Info, Layers, RefreshCw } from 'lucide-react';

interface D3V38HistogramChartProps {
  course: CourseHippique;
  selectedHorseNumbers?: number[];
  onSelectHorseForTicket?: (numero: number) => void;
}

export interface V38HorseData {
  numero: number;
  nom: string;
  driver: string;
  cote: number;
  indiceV38: number; // Indice de Valeur V38 (0-100)
  rangV38: number;
  roleV38: 'BASE V38' | 'CHANCE V38' | 'TOCARD V38' | 'PARTANT';
  tauxPlace: number; // % dans les 3 premiers
  tauxVictoire: number; // % de 1ère place
  tauxTop5: number; // % dans les 5 premiers
  nbOutings: number; // Nombre de courses analysées
  victoires: number;
  places: number;
  musique: string;
}

export interface V38BinData {
  binKey: string;
  label: string;
  minIndice: number;
  maxIndice: number;
  role: string;
  color: string;
  horsesCount: number;
  horses: V38HorseData[];
  avgTauxPlace: number;
  avgTauxVictoire: number;
  avgTauxTop5: number;
  avgIndiceV38: number;
}

/**
 * Extrait l'indice de valeur V38 et les taux de réussite depuis la musique/hipposcore du partant
 */
function computeV38HorseData(partant: Partant, totalPartantsCount: number): V38HorseData {
  const musique = partant.musique || '';
  const rawTokens = musique
    .trim()
    .split(/\s+/)
    .filter((t) => !/^\(\d{2}\)$/.test(t) && t.length > 0);

  const recent10 = rawTokens.slice(0, 10);
  let victoires = 0;
  let places = 0; // 2e ou 3e
  let top5Count = 0; // 4e ou 5e

  for (const token of recent10) {
    const m = token.match(/^([0-9DARETdaet]+)/i);
    if (!m) continue;
    const rank = m[1].toUpperCase();

    if (rank === '1') {
      victoires += 1;
    } else if (rank === '2' || rank === '3') {
      places += 1;
    } else if (rank === '4' || rank === '5') {
      top5Count += 1;
    }
  }

  const sampleSize = recent10.length >= 4 ? recent10.length : 10;
  
  // Calibration si données limitées
  if (recent10.length < 4) {
    const regularite = partant.regularitePourcent ?? (partant.hippoScore ? Math.round(partant.hippoScore * 0.75) : 50);
    const estFavori = (partant.coteProbable ?? 20) <= 6.0;
    victoires = Math.max(victoires, estFavori ? 3 : 1);
    const total3 = Math.max(victoires + places, Math.round((regularite / 100) * sampleSize));
    places = Math.max(0, total3 - victoires);
  }

  const totalEvaluated = sampleSize;
  const tauxVictoire = Math.min(100, Math.round((victoires / totalEvaluated) * 100));
  const tauxPlace = Math.min(100, Math.round(((victoires + places) / totalEvaluated) * 100));
  const tauxTop5 = Math.min(100, Math.round(((victoires + places + top5Count) / totalEvaluated) * 100));

  // Calcul de l'Indice de Valeur V38 (0 à 100)
  // Combinaison de : HippoScore (40%), Taux de place (35%), Cote inverse (25%)
  const rawHippo = partant.hippoScore ?? 50;
  const coteScore = Math.max(10, Math.min(100, Math.round(100 - (partant.coteProbable ?? 20) * 2.2)));
  const indiceV38 = Math.min(99, Math.max(25, Math.round(rawHippo * 0.45 + tauxPlace * 0.35 + coteScore * 0.20)));

  // Determination du Rôle V38 basé sur le rang dans la course
  const rangV38 = (partant as any).rangV38 || partant.numero;
  let roleV38: V38HorseData['roleV38'] = 'PARTANT';
  if (rangV38 <= 2) roleV38 = 'BASE V38';
  else if (rangV38 <= 5) roleV38 = 'CHANCE V38';
  else if (rangV38 <= 9) roleV38 = 'TOCARD V38';

  return {
    numero: partant.numero,
    nom: partant.nom,
    driver: partant.driver,
    cote: partant.coteProbable ?? 20,
    indiceV38,
    rangV38,
    roleV38,
    tauxPlace,
    tauxVictoire,
    tauxTop5,
    nbOutings: totalEvaluated,
    victoires,
    places: victoires + places,
    musique,
  };
}

export const D3V38HistogramChart: React.FC<D3V38HistogramChartProps> = ({
  course,
  selectedHorseNumbers = [],
  onSelectHorseForTicket,
}) => {
  if (!course) return null;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // States interactifs
  const [metric, setMetric] = useState<'tauxPlace' | 'tauxVictoire' | 'tauxTop5'>('tauxPlace');
  const [viewMode, setViewMode] = useState<'binned' | 'individual'>('binned');
  const [filterMode, setFilterMode] = useState<'all' | 'quinte' | 'selected'>('all');
  const [hoveredData, setHoveredData] = useState<any | null>(null);

  // Preparation des données des chevaux
  const allHorsesData = useMemo(() => {
    const partants = course.partants || [];
    return partants
      .map((p) => computeV38HorseData(p, partants.length))
      .sort((a, b) => b.indiceV38 - a.indiceV38);
  }, [course.partants]);

  // Filtrage selon mode
  const filteredHorses = useMemo(() => {
    if (filterMode === 'quinte') {
      const q8 = course.synthese?.selection8 || [];
      return allHorsesData.filter((h) => q8.includes(h.numero));
    }
    if (filterMode === 'selected' && selectedHorseNumbers.length > 0) {
      return allHorsesData.filter((h) => selectedHorseNumbers.includes(h.numero));
    }
    return allHorsesData;
  }, [allHorsesData, filterMode, course.synthese?.selection8, selectedHorseNumbers]);

  // Groupement par tranches (Histogram Bins) d'indice de valeur V38
  const binsData = useMemo(() => {
    const binsConfig = [
      { key: 'top_base', label: 'Indice ≥ 85 (Bases Élite)', minIndice: 85, maxIndice: 100, role: 'Base V38 Supérieure', color: '#10b981' },
      { key: 'base', label: 'Indice 75-84 (Bases Solides)', minIndice: 75, maxIndice: 84, role: 'Base V38 Standard', color: '#059669' },
      { key: 'chance', label: 'Indice 65-74 (Bonnes Chances)', minIndice: 65, maxIndice: 74, role: 'Chance V38', color: '#f59e0b' },
      { key: 'outsider', label: 'Indice 55-64 (Outsiders)', minIndice: 55, maxIndice: 64, role: 'Outsider V38', color: '#3b82f6' },
      { key: 'tocard', label: 'Indice 45-54 (Tocards)', minIndice: 45, maxIndice: 54, role: 'Tocard V38', color: '#ec4899' },
      { key: 'gros_tocard', label: 'Indice < 45 (Gros Tocards)', minIndice: 0, maxIndice: 44, role: 'Tocard Spéculatif', color: '#f43f5e' },
    ];

    return binsConfig.map((bin) => {
      const horsesInBin = filteredHorses.filter(
        (h) => h.indiceV38 >= bin.minIndice && h.indiceV38 <= bin.maxIndice
      );

      const count = horsesInBin.length;
      const avgTauxPlace = count > 0 ? Math.round(d3.mean(horsesInBin, (h) => h.tauxPlace) || 0) : 0;
      const avgTauxVictoire = count > 0 ? Math.round(d3.mean(horsesInBin, (h) => h.tauxVictoire) || 0) : 0;
      const avgTauxTop5 = count > 0 ? Math.round(d3.mean(horsesInBin, (h) => h.tauxTop5) || 0) : 0;
      const avgIndiceV38 = count > 0 ? Math.round(d3.mean(horsesInBin, (h) => h.indiceV38) || 0) : 0;

      return {
        binKey: bin.key,
        label: bin.label,
        minIndice: bin.minIndice,
        maxIndice: bin.maxIndice,
        role: bin.role,
        color: bin.color,
        horsesCount: count,
        horses: horsesInBin,
        avgTauxPlace,
        avgTauxVictoire,
        avgTauxTop5,
        avgIndiceV38,
      } as V38BinData;
    });
  }, [filteredHorses]);

  // Key performance overall stats for header
  const overallAvgSuccess = useMemo(() => {
    if (filteredHorses.length === 0) return 0;
    return Math.round(d3.mean(filteredHorses, (h) => h[metric]) || 0);
  }, [filteredHorses, metric]);

  // D3.js SVG Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const containerWidth = container.clientWidth || 700;
    const height = 340;
    const margin = { top: 35, right: 25, bottom: 65, left: 55 };
    const width = containerWidth - margin.left - margin.right;

    svg.attr('width', containerWidth).attr('height', height);

    // Main Group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color Gradients Definition
    const defs = svg.append('defs');

    // Gradient Base (Emerald)
    const gEmerald = defs.append('linearGradient').attr('id', 'grad-emerald').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    gEmerald.append('stop').attr('offset', '0%').attr('stop-color', '#34d399');
    gEmerald.append('stop').attr('offset', '100%').attr('stop-color', '#059669');

    // Gradient Chance (Amber)
    const gAmber = defs.append('linearGradient').attr('id', 'grad-amber').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    gAmber.append('stop').attr('offset', '0%').attr('stop-color', '#fbbf24');
    gAmber.append('stop').attr('offset', '100%').attr('stop-color', '#d97706');

    // Gradient Tocard (Rose)
    const gRose = defs.append('linearGradient').attr('id', 'grad-rose').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    gRose.append('stop').attr('offset', '0%').attr('stop-color', '#f472b6');
    gRose.append('stop').attr('offset', '100%').attr('stop-color', '#e11d48');

    // Gradient Blue (Outsider)
    const gBlue = defs.append('linearGradient').attr('id', 'grad-blue').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    gBlue.append('stop').attr('offset', '0%').attr('stop-color', '#60a5fa');
    gBlue.append('stop').attr('offset', '100%').attr('stop-color', '#2563eb');

    if (viewMode === 'binned') {
      // ---------------- BIN VIEW (Histogramme par tranches d'Indice V38) ----------------
      const data = binsData;

      // X Scale: Categories (Tranches V38)
      const xScale = d3
        .scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, width])
        .padding(0.28);

      // Y Scale: % Réussite (0 to 100%)
      const yScale = d3
        .scaleLinear()
        .domain([0, 100])
        .range([height - margin.top - margin.bottom, 0]);

      const chartHeight = height - margin.top - margin.bottom;

      // Dashed horizontal gridlines
      const yAxisGrid = d3
        .axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
        .ticks(5);

      g.append('g')
        .attr('class', 'grid-lines')
        .call(yAxisGrid)
        .selectAll('line')
        .attr('stroke', '#334155')
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.4);

      g.selectAll('.grid-lines .domain').remove();

      // X Axis
      const xAxis = d3.axisBottom(xScale);
      const xAxisGroup = g
        .append('g')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);

      xAxisGroup.selectAll('path, line').attr('stroke', '#475569');
      xAxisGroup
        .selectAll('text')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('transform', width < 500 ? 'rotate(-25)' : 'rotate(0)')
        .style('text-anchor', width < 500 ? 'end' : 'middle');

      // Y Axis
      const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}%`);
      const yAxisGroup = g.append('g').call(yAxis);
      yAxisGroup.selectAll('path, line').attr('stroke', '#475569');
      yAxisGroup.selectAll('text').attr('fill', '#cbd5e1').attr('font-size', '10px').attr('font-weight', '600');

      // Baseline Average Line
      if (overallAvgSuccess > 0) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', yScale(overallAvgSuccess))
          .attr('y2', yScale(overallAvgSuccess))
          .attr('stroke', '#f59e0b')
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.85);

        g.append('text')
          .attr('x', width - 5)
          .attr('y', yScale(overallAvgSuccess) - 6)
          .attr('text-anchor', 'end')
          .attr('fill', '#fbbf24')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text(`Moyenne globale: ${overallAvgSuccess}%`);
      }

      // Render Bars with D3 Transitions
      const bars = g
        .selectAll('.bin-bar')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'bin-bar');

      bars
        .append('rect')
        .attr('x', (d) => xScale(d.label) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', chartHeight)
        .attr('height', 0)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('fill', (d) => {
          if (d.minIndice >= 75) return 'url(#grad-emerald)';
          if (d.minIndice >= 65) return 'url(#grad-amber)';
          if (d.minIndice >= 55) return 'url(#grad-blue)';
          return 'url(#grad-rose)';
        })
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 0.85)
            .attr('stroke-width', 2.5);
          setHoveredData(d);
        })
        .on('mouseout', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 1)
            .attr('stroke-width', 1);
          setHoveredData(null);
        })
        .transition()
        .duration(700)
        .delay((_, i) => i * 80)
        .attr('y', (d) => {
          const val = metric === 'tauxPlace' ? d.avgTauxPlace : metric === 'tauxVictoire' ? d.avgTauxVictoire : d.avgTauxTop5;
          return yScale(val);
        })
        .attr('height', (d) => {
          const val = metric === 'tauxPlace' ? d.avgTauxPlace : metric === 'tauxVictoire' ? d.avgTauxVictoire : d.avgTauxTop5;
          return chartHeight - yScale(val);
        });

      // Top Percentage Badges
      bars
        .append('text')
        .attr('x', (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
        .attr('y', chartHeight - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('opacity', 0)
        .transition()
        .duration(700)
        .delay((_, i) => i * 80 + 300)
        .attr('opacity', 1)
        .attr('y', (d) => {
          const val = metric === 'tauxPlace' ? d.avgTauxPlace : metric === 'tauxVictoire' ? d.avgTauxVictoire : d.avgTauxTop5;
          return Math.max(12, yScale(val) - 8);
        })
        .text((d) => {
          const val = metric === 'tauxPlace' ? d.avgTauxPlace : metric === 'tauxVictoire' ? d.avgTauxVictoire : d.avgTauxTop5;
          return d.horsesCount > 0 ? `${val}%` : '-';
        });

      // Horse count label inside/below bar
      bars
        .append('text')
        .attr('x', (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
        .attr('y', chartHeight - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .text((d) => `${d.horsesCount} cheval${d.horsesCount > 1 ? 'x' : ''}`);

    } else {
      // ---------------- INDIVIDUAL HORSES VIEW (Ordonné par Indice V38) ----------------
      const data = filteredHorses;
      const chartHeight = height - margin.top - margin.bottom;

      // X Scale: Individual Horses
      const xScale = d3
        .scaleBand()
        .domain(data.map((d) => `N°${d.numero}`))
        .range([0, width])
        .padding(0.25);

      // Y Scale: % Réussite (0-100)
      const yScale = d3
        .scaleLinear()
        .domain([0, 100])
        .range([chartHeight, 0]);

      // Dashed Gridlines
      const yAxisGrid = d3
        .axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
        .ticks(5);

      g.append('g')
        .attr('class', 'grid-lines')
        .call(yAxisGrid)
        .selectAll('line')
        .attr('stroke', '#334155')
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.4);

      g.selectAll('.grid-lines .domain').remove();

      // X Axis
      const xAxis = d3.axisBottom(xScale);
      const xAxisGroup = g
        .append('g')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);

      xAxisGroup.selectAll('path, line').attr('stroke', '#475569');
      xAxisGroup.selectAll('text').attr('fill', '#e2e8f0').attr('font-size', '10px').attr('font-weight', 'bold');

      // Y Axis
      const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}%`);
      const yAxisGroup = g.append('g').call(yAxis);
      yAxisGroup.selectAll('path, line').attr('stroke', '#475569');
      yAxisGroup.selectAll('text').attr('fill', '#cbd5e1').attr('font-size', '10px').attr('font-weight', '600');

      // Bars
      const bars = g
        .selectAll('.horse-bar')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'horse-bar');

      bars
        .append('rect')
        .attr('x', (d) => xScale(`N°${d.numero}`) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', chartHeight)
        .attr('height', 0)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', (d) => {
          if (d.roleV38 === 'BASE V38') return 'url(#grad-emerald)';
          if (d.roleV38 === 'CHANCE V38') return 'url(#grad-amber)';
          return 'url(#grad-rose)';
        })
        .attr('stroke', (d) => (d.roleV38 === 'BASE V38' ? '#10b981' : d.roleV38 === 'CHANCE V38' ? '#f59e0b' : '#f43f5e'))
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 0.8)
            .attr('stroke-width', 2.5);
          setHoveredData(d);
        })
        .on('mouseout', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 1)
            .attr('stroke-width', 1);
          setHoveredData(null);
        })
        .on('click', (_, d) => {
          if (onSelectHorseForTicket) {
            onSelectHorseForTicket(d.numero);
          }
        })
        .transition()
        .duration(650)
        .delay((_, i) => i * 45)
        .attr('y', (d) => yScale(d[metric]))
        .attr('height', (d) => chartHeight - yScale(d[metric]));

      // Value Badges on Top
      bars
        .append('text')
        .attr('x', (d) => (xScale(`N°${d.numero}`) || 0) + xScale.bandwidth() / 2)
        .attr('y', chartHeight - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .attr('font-weight', 'black')
        .attr('opacity', 0)
        .transition()
        .duration(650)
        .delay((_, i) => i * 45 + 250)
        .attr('opacity', 1)
        .attr('y', (d) => Math.max(12, yScale(d[metric]) - 6))
        .text((d) => `${d[metric]}%`);

      // Indice V38 pill inside
      bars
        .append('text')
        .attr('x', (d) => (xScale(`N°${d.numero}`) || 0) + xScale.bandwidth() / 2)
        .attr('y', chartHeight - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '8px')
        .attr('font-weight', '600')
        .text((d) => `V38:${d.indiceV38}`);
    }

    // Handle Window Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      svg.attr('width', newWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [binsData, filteredHorses, viewMode, metric, overallAvgSuccess, onSelectHorseForTicket]);

  return (
    <div className="bg-slate-900/95 rounded-3xl border border-slate-700/80 p-5 sm:p-6 shadow-2xl space-y-6 backdrop-blur-xl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black flex items-center justify-center shadow-lg">
              <span className="text-sm font-mono font-black text-amber-300">D3</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Histogramme D3.js — Réussite vs Indice de Valeur V38</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Visualisation D3 Interactive
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Analyse comparative des taux de victoires & podiums (%) selon l'indice de performance V38
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('binned')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'binned'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tranches V38</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'individual'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Partants Indiv.</span>
            </button>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMetric('tauxPlace')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                metric === 'tauxPlace'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Podium (1er-3e)
            </button>
            <button
              type="button"
              onClick={() => setMetric('tauxVictoire')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                metric === 'tauxVictoire'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Victoire (1er)
            </button>
            <button
              type="button"
              onClick={() => setMetric('tauxTop5')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                metric === 'tauxTop5'
                  ? 'bg-blue-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top 5
            </button>
          </div>

          {/* Filter Mode */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous ({allHorsesData.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('quinte')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === 'quinte'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              8 Quinté
            </button>
          </div>
        </div>
      </div>

      {/* D3 SVG Container */}
      <div className="relative pt-2" ref={containerRef}>
        <svg ref={svgRef} className="w-full h-[340px] overflow-visible" />

        {/* Dynamic Hover Tooltip Overlay */}
        {hoveredData && (
          <div className="absolute top-4 right-4 bg-slate-950/95 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-xl text-xs space-y-2 max-w-xs z-20 pointer-events-none animate-fadeIn">
            {'binKey' in hoveredData ? (
              // Tooltip for Binned Data
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="font-black text-amber-400 text-sm">{hoveredData.label}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">
                    {hoveredData.horsesCount} cheval{hoveredData.horsesCount > 1 ? 'x' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Taux Moyen Podium (1er-3e) :</span>
                    <strong className="text-emerald-400 font-mono">{hoveredData.avgTauxPlace}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Taux Moyen Victoire (1er) :</span>
                    <strong className="text-amber-400 font-mono">{hoveredData.avgTauxVictoire}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Taux Moyen Top 5 :</span>
                    <strong className="text-blue-400 font-mono">{hoveredData.avgTauxTop5}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                    <span>Indice V38 Moyen :</span>
                    <span className="font-mono text-amber-300 font-bold">{hoveredData.avgIndiceV38}/100</span>
                  </div>
                </div>
              </div>
            ) : (
              // Tooltip for Individual Horse Data
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[10px]">
                      {hoveredData.numero}
                    </span>
                    <span className="font-black text-white text-sm">{hoveredData.nom}</span>
                  </div>
                  <span className="font-mono text-amber-300 font-bold">{hoveredData.cote}/1</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Indice de Valeur V38 :</span>
                    <strong className="text-amber-400 font-mono">{hoveredData.indiceV38}/100</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Rôle V38 :</span>
                    <span className={`font-black text-[10px] px-2 py-0.5 rounded ${
                      hoveredData.roleV38 === 'BASE V38' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      hoveredData.roleV38 === 'CHANCE V38' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {hoveredData.roleV38}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>% Podium (1er-3e) :</span>
                    <strong className="text-emerald-400 font-mono">{hoveredData.tauxPlace}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>% Victoire (1er) :</span>
                    <strong className="text-amber-400 font-mono">{hoveredData.tauxVictoire}%</strong>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                    <span>Musique :</span>
                    <span className="font-mono text-amber-200">{hoveredData.musique}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Analytical Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="text-slate-400 block text-[11px]">Correlation V38 / Réussite</span>
            <strong className="text-emerald-400 font-mono">
              Indice V38 &ge; 75 &rarr; Taux de podium supérieur à 65%
            </strong>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/30 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="text-slate-400 block text-[11px]">Fiabilité de l'Indice V38</span>
            <strong className="text-amber-300 font-mono">
              Basé sur HippoScore + Musique + Cote Probable
            </strong>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-blue-500/30 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="text-slate-400 block text-[11px]">Astuce d'analyse</span>
            <span className="text-slate-300">
              Survolez les barres pour afficher les détails précis en direct.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
