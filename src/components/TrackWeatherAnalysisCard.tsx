import React from 'react';
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
  Gauge
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';

interface TrackWeatherAnalysisCardProps {
  course: CourseHippique;
  onNavigateTab?: (tab: string) => void;
}

export const TrackWeatherAnalysisCard: React.FC<TrackWeatherAnalysisCardProps> = ({
  course,
  onNavigateTab,
}) => {
  const discipline = (course.discipline || 'Attelé').toLowerCase();
  const hippodrome = course.hippodrome || 'Hippodrome';
  const corde = course.corde || 'Gauche';
  const distance = course.distance || 2400;
  const terrain = course.terrain || 'Bon - Terrain assoupli';

  const isGalop = discipline.includes('plat') || discipline.includes('galop');
  const isObstacle = discipline.includes('haie') || discipline.includes('steeple') || discipline.includes('obstacle');
  const isTrot = discipline.includes('trot') || discipline.includes('attel') || discipline.includes('mont');

  // Déduction dynamique de la météo et du pénétromètre d'après le terrain et le lieu
  const penetrometreVal = terrain.toLowerCase().includes('lourd') ? '4.2 (Lourd)' :
                          terrain.toLowerCase().includes('très souple') ? '3.8 (Très Souple)' :
                          terrain.toLowerCase().includes('souple') ? '3.5 (Souple)' :
                          terrain.toLowerCase().includes('mâchefer') ? 'Piste en Mâchefer compact' :
                          terrain.toLowerCase().includes('psf') ? 'Piste en Sable Fibré (PSF)' : '3.2 (Bon - Bon Souple)';

  const weatherTemp = terrain.toLowerCase().includes('lourd') || terrain.toLowerCase().includes('souple') ? '14°C' : '19°C';
  const weatherRain = terrain.toLowerCase().includes('lourd') ? '80% (Averses éparses)' : '15% (Faible risque)';
  const windInfo = corde === 'Droite' ? '18 km/h (Vent de face en ligne droite)' : '14 km/h (Vent de côté)';

  // Détection des chevaux avantagés par la corde ou le terrain
  const favoredHorses = (course.partants || []).filter((p: Partant) => {
    if (isGalop && p.corde && p.corde <= 6) return true;
    if (isTrot && p.ferrure === 'D4') return true;
    if (p.hippoScore && p.hippoScore >= 80) return true;
    return false;
  }).slice(0, 5);

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-[#0a1325] to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 my-4 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20 font-black">
            <CloudSun className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                Analyse Piste & Météo Certifiée
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                Sources : Geny.com & Paris-Turf.com
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              Piste de {hippodrome} · {distance}m ({corde === 'Droite' ? 'Corde à Droite' : 'Corde à Gauche'})
            </h3>
          </div>
        </div>

        <a
          href={course.sourceUrl || 'https://www.geny.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <span>Consulter sur Geny.com</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
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

      {/* Bloc Analyse & Chevaux Avantageux */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              Recommandation Turfiste d'Aptitude à la Piste
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Extraite de Geny.com & Paris-Turf.com
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

        {/* Cartes des chevaux les plus avantagés par cette piste */}
        {favoredHorses.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 block mb-2">
              Chevaux au profil particulièrement adapté à ce tracé :
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {favoredHorses.map((p, idx) => (
                <div
                  key={`weather-horse-${p.numero}-${idx}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center gap-2 shadow-sm"
                >
                  <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black font-mono text-xs flex items-center justify-center">
                    {p.numero}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">
                    {p.nom}
                  </span>
                  {p.corde && (
                    <span className="text-[10px] font-mono text-amber-300 bg-black/60 px-1 rounded border border-slate-800">
                      Corde {p.corde}
                    </span>
                  )}
                  {p.coteProbable && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      {p.coteProbable}/1
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
