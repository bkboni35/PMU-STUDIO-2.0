import React, { useState } from 'react';
import { CourseHippique } from '../types/turf';
import { Trophy, Compass, Shield, Zap, Info, X, ExternalLink, Sparkles, ZoomIn } from 'lucide-react';

interface RaceDisciplineImageProps {
  course: CourseHippique;
  className?: string;
}

/**
 * Normalise la discipline de manière robuste contre les variations d'accents et de casse
 */
export function normalizeDisciplineType(
  rawDiscipline?: string,
  rawTitle?: string
): 'attele' | 'monte' | 'plat' | 'haies' | 'steeple' | 'cross' {
  const text = `${rawDiscipline || ''} ${rawTitle || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (text.includes('cross')) return 'cross';
  if (text.includes('steeple')) return 'steeple';
  if (text.includes('haie')) return 'haies';
  if (text.includes('monte')) return 'monte';
  if (text.includes('plat') || text.includes('galop')) return 'plat';
  if (text.includes('attele') || text.includes('trot') || text.includes('sulky')) return 'attele';
  if (text.includes('obstacle')) return 'haies';
  return 'attele';
}

export const RaceDisciplineImage: React.FC<RaceDisciplineImageProps> = ({
  course,
  className = '',
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const disciplineType = normalizeDisciplineType(course?.discipline, course?.titre);

  // Configuration visuelle et textuelle par discipline avec écritures en capitales demandées
  const config = {
    attele: {
      name: 'Trot Attelé',
      titleLabel: 'TROT ATTELÉ',
      fallbackLabel: 'TROT ATTELE',
      tagline: 'Sulky & Allures Réglementaires',
      badgeBg: 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white border-2 border-white',
      cardBg: 'from-amber-950 via-slate-900 to-blue-950',
      borderColor: 'border-amber-400',
      glowColor: 'shadow-amber-500/25',
      accentColor: 'text-amber-400',
      iconEmoji: '🛞',
      description: 'Course au trot attelé avec sulky et driver sur piste en mâchefer. Interdiction formelle de passer au galop sous peine de disqualification immédiate.',
      sceneDescription: 'Trotteur en extension avec sulky et driver sur piste en mâchefer.',
      particularites: ['Départ volté ou autostart', 'Contrôle vidéo strict des allures', 'Piste en mâchefer / cendrée'],
    },
    monte: {
      name: 'Trot Monté',
      titleLabel: 'TROT MONTÉ',
      fallbackLabel: 'TROT MONTE',
      tagline: 'Trot athlétique avec jockey en selle',
      badgeBg: 'bg-gradient-to-r from-rose-700 to-pink-800 text-white border-2 border-white',
      cardBg: 'from-purple-950 via-slate-900 to-rose-950',
      borderColor: 'border-rose-400',
      glowColor: 'shadow-rose-500/25',
      accentColor: 'text-rose-400',
      iconEmoji: '🏇',
      description: 'Discipline sélective où le jockey monte directement le cheval au trot avec une position profil bas et étriers courts.',
      sceneDescription: 'Trotteur monté avec jockey en selle profil bas.',
      particularites: ['Poids minimum réglementaire imposé', 'Portage direct du jockey', 'Épreuve physique intense'],
    },
    plat: {
      name: 'Plat',
      titleLabel: 'PLAT',
      fallbackLabel: 'PLAT',
      tagline: 'Vitesse pure au galop',
      badgeBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-2 border-white',
      cardBg: 'from-emerald-950 via-slate-900 to-teal-950',
      borderColor: 'border-emerald-400',
      glowColor: 'shadow-emerald-500/25',
      accentColor: 'text-emerald-400',
      iconEmoji: '⚡',
      description: 'Pur-sang au grand galop sur piste en herbe avec jockeys en casaques vives. Vitesse pure sans obstacles.',
      sceneDescription: 'Pur-sang au grand galop sur piste en herbe avec jockeys en casaques vives.',
      particularites: ['Départ en stalles de départ', 'Importance capitale du numéro de corde', 'Spécialistes de vitesse et de tenue'],
    },
    haies: {
      name: 'Haies',
      titleLabel: 'HAIES',
      fallbackLabel: 'HAIES',
      tagline: 'Obstacles vifs & fluidité du saut',
      badgeBg: 'bg-gradient-to-r from-amber-600 to-orange-700 text-white border-2 border-white',
      cardBg: 'from-sky-950 via-slate-900 to-amber-950',
      borderColor: 'border-sky-400',
      glowColor: 'shadow-sky-500/25',
      accentColor: 'text-sky-400',
      iconEmoji: '🚧',
      description: 'Course d\'obstacles sur haies vives standardisées. Saut en suspension au-dessus de la haie d\'obstacles.',
      sceneDescription: 'Saut en suspension au-dessus de la haie d\'obstacles.',
      particularites: ['Haies standardisées de 1m10', 'Parcours très rythmé', 'Agilité et fluidité du saut'],
    },
    steeple: {
      name: 'Steeple-Chase',
      titleLabel: 'STEEPLE-CHASE',
      fallbackLabel: 'STEEPLE-CHASE',
      tagline: 'L\'épreuve reine des obstacles',
      badgeBg: 'bg-gradient-to-r from-red-700 to-rose-900 text-white border-2 border-white',
      cardBg: 'from-rose-950 via-slate-900 to-stone-950',
      borderColor: 'border-amber-500',
      glowColor: 'shadow-red-500/25',
      accentColor: 'text-amber-400',
      iconEmoji: '🏛️',
      description: 'L\'épreuve reine des obstacles : franchissement aérien d\'un oxer / obstacle de steeple avec rivière des tribunes.',
      sceneDescription: 'Franchissement aérien d\'un oxer / obstacle de steeple avec rivière.',
      particularites: ['Obstacles massifs variés (oxers, rivière)', 'Sauts d\'envergure spectaculaires', 'Sélection sévère par le terrain'],
    },
    cross: {
      name: 'Cross-Country',
      titleLabel: 'CROSS-COUNTRY',
      fallbackLabel: 'CROSS-COUNTRY',
      tagline: 'Obstacles naturels & Terrains vallonnés',
      badgeBg: 'bg-gradient-to-r from-lime-700 to-emerald-800 text-white border-2 border-white',
      cardBg: 'from-emerald-950 via-slate-900 to-amber-950',
      borderColor: 'border-lime-400',
      glowColor: 'shadow-lime-500/25',
      accentColor: 'text-lime-400',
      iconEmoji: '🌲',
      description: 'Parcours en milieu naturel sur très longue distance avec terrain vallonné, banquettes, talus et contre-hauts.',
      sceneDescription: 'Saut naturel sur terrain vallonné.',
      particularites: ['Distances extrêmes (jusqu\'à 6000m)', 'Saut d\'obstacles naturels', 'Complémentarité cheval-cavalier'],
    },
  }[disciplineType];

  return (
    <>
      {/* Conteneur principal de l'image de la discipline positionné à l'extrême droite */}
      <div 
        onClick={() => setIsZoomOpen(true)}
        className={`group relative overflow-hidden rounded-2xl border-2 ${config.borderColor} bg-slate-900 shadow-xl ${config.glowColor} cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl select-none shrink-0 w-[205px] sm:w-[235px] md:w-[250px] h-[125px] sm:h-[135px] flex flex-col justify-between ${className}`}
        style={{ minWidth: '195px' }}
        title={`Cliquez pour agrandir les détails de la discipline : ${config.name}`}
      >
        {/* FOND ET ILLUSTRATION VIVE ET LUMINEUSE DE LA DISCIPLINE */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {/* ======================================================== */}
          {/* 1. TROT ATTELÉ : Piste et ciel de Vincennes */}
          {/* ======================================================== */}
          {disciplineType === 'attele' && (
            <svg viewBox="0 0 240 140" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="atteleSkyVivid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="45%" stopColor="#334155" />
                  <stop offset="75%" stopColor="#c2410c" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="macheferTrack" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#c2410c" />
                  <stop offset="40%" stopColor="#9a3412" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </linearGradient>
                <radialGradient id="lightGlow" cx="0.8" cy="0.3" r="0.6">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="240" height="140" fill="url(#atteleSkyVivid)" />
              <circle cx="195" cy="30" r="38" fill="url(#lightGlow)" />
              <circle cx="195" cy="30" r="10" fill="#ffffff" opacity="0.9" />
              <path d="M 0 85 Q 120 78 240 88 L 240 140 L 0 140 Z" fill="url(#macheferTrack)" />
              <path d="M 0 92 Q 120 85 240 95" stroke="#ffedd5" strokeWidth="2" strokeDasharray="6 3" opacity="0.8" fill="none" />
            </svg>
          )}

          {/* ======================================================== */}
          {/* 2. TROT MONTÉ : Ambiance nocturne passion */}
          {/* ======================================================== */}
          {disciplineType === 'monte' && (
            <svg viewBox="0 0 240 140" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="monteSkyVivid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#312e81" />
                  <stop offset="50%" stopColor="#4c1d95" />
                  <stop offset="100%" stopColor="#831843" />
                </linearGradient>
                <linearGradient id="monteTrackVivid" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#701a75" />
                  <stop offset="60%" stopColor="#4a044e" />
                  <stop offset="100%" stopColor="#2e1065" />
                </linearGradient>
              </defs>
              <rect width="240" height="140" fill="url(#monteSkyVivid)" />
              <circle cx="50" cy="35" r="30" fill="#e879f9" opacity="0.3" />
              <path d="M 0 88 Q 120 80 240 92 L 240 140 L 0 140 Z" fill="url(#monteTrackVivid)" />
              <path d="M 0 94 Q 120 86 240 98" stroke="#fbcfe8" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" fill="none" />
            </svg>
          )}

          {/* ======================================================== */}
          {/* 3. PLAT : Hippodrome verdoyant */}
          {/* ======================================================== */}
          {disciplineType === 'plat' && (
            <svg viewBox="0 0 240 140" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="platSkyVivid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#bae6fd" />
                </linearGradient>
                <linearGradient id="platTurfVivid" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="45%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#14532d" />
                </linearGradient>
              </defs>
              <rect width="240" height="140" fill="url(#platSkyVivid)" />
              <circle cx="210" cy="30" r="25" fill="#fef08a" opacity="0.6" />
              <circle cx="210" cy="30" r="14" fill="#fef08a" />
              <path d="M 0 85 Q 120 76 240 88 L 240 140 L 0 140 Z" fill="url(#platTurfVivid)" />
              <line x1="0" y1="80" x2="240" y2="82" stroke="#ffffff" strokeWidth="3" />
            </svg>
          )}

          {/* ======================================================== */}
          {/* 4. HAIES : Parcours de haie vive */}
          {/* ======================================================== */}
          {disciplineType === 'haies' && (
            <svg viewBox="0 0 240 140" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="haiesSkyVivid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0369a1" />
                  <stop offset="50%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#7dd3fc" />
                </linearGradient>
                <linearGradient id="haiesTurfVivid" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#166534" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <rect width="240" height="140" fill="url(#haiesSkyVivid)" />
              <path d="M 0 95 L 240 95 L 240 140 L 0 140 Z" fill="url(#haiesTurfVivid)" />
              <rect x="160" y="82" width="35" height="24" rx="3" fill="#14532d" stroke="#22c55e" strokeWidth="2" />
            </svg>
          )}

          {/* ======================================================== */}
          {/* 5. STEEPLE-CHASE : Piste d'obstacle & rivière */}
          {/* ======================================================== */}
          {disciplineType === 'steeple' && (
            <svg viewBox="0 0 240 140" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="steepleSkyVivid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#881337" />
                  <stop offset="60%" stopColor="#be123c" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
                <linearGradient id="steepleTurfVivid" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#14532d" />
                  <stop offset="100%" stopColor="#166534" />
                </linearGradient>
              </defs>
              <rect width="240" height="140" fill="url(#steepleSkyVivid)" />
              <path d="M 0 94 L 240 94 L 240 140 L 0 140 Z" fill="url(#steepleTurfVivid)" />
            </svg>
          )}

          {/* ======================================================== */}
          {/* 6. CROSS-COUNTRY : Terrain naturel vallonné */}
          {/* ======================================================== */}
          {disciplineType === 'cross' && (
            <svg viewBox="0 0 240 140" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="crossSkyVivid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#166534" />
                  <stop offset="50%" stopColor="#15803d" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>
              </defs>
              <rect width="240" height="140" fill="url(#crossSkyVivid)" />
              <path d="M 0 102 Q 60 84 120 80 Q 180 90 240 106 L 240 140 L 0 140 Z" fill="#3f2e18" />
              <path d="M 0 100 Q 60 82 120 78 Q 180 88 240 104" stroke="#84cc16" strokeWidth="5" fill="none" />
            </svg>
          )}
        </div>

        {/* LIGNE SUPÉRIEURE : BADGE DU TYPE DE COURSE */}
        <div className="relative z-10 p-1.5 flex items-center justify-between gap-1">
          <div className="px-2 py-0.5 rounded-lg bg-slate-950/90 text-amber-300 border border-amber-400/80 shadow-md flex items-center gap-1 font-mono text-[10px] font-black tracking-wide">
            <span className="text-amber-400">🏇</span>
            <span>{course?.distance ? `${course.distance}m` : 'RACE'}</span>
            <span className="text-slate-500">•</span>
            <span>{course?.corde ? `Corde ${course.corde}` : 'Corde G'}</span>
          </div>

          <span className="p-1 rounded-lg bg-slate-950/80 text-slate-300 border border-slate-700/80 shadow text-[9px] font-bold group-hover:text-amber-300 transition-colors">
            🔍 Zoom
          </span>
        </div>

        {/* LIGNE INFÉRIEURE : CARTOUCHE ÉCRIVANT LE TYPE DE COURSE EN CAPITALES TRÈS NET ET LISIBLE */}
        <div className="relative z-10 pb-2 px-2 flex flex-col items-center justify-center text-center">
          <div className={`w-full py-1.5 px-3 rounded-xl ${config.badgeBg} shadow-2xl font-black text-xs sm:text-sm tracking-wider uppercase leading-none drop-shadow-lg text-center flex items-center justify-center gap-1.5`}>
            <span>{config.iconEmoji}</span>
            <span className="truncate">{config.titleLabel}</span>
          </div>
        </div>

        {/* Effet visuel au survol */}
        <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
          <span className="px-3 py-1 rounded-full bg-slate-950/95 text-amber-300 border-2 border-amber-400 text-xs font-black shadow-2xl flex items-center gap-1">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Agrandir</span>
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE ZOOM ET DÉTAILS COMPLETS DE LA DISCIPLINE */}
      {/* ======================================================== */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsZoomOpen(false)}
        >
          <div 
            className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl p-2 rounded-2xl bg-slate-800 border border-slate-700">{config.iconEmoji}</span>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Discipline : {config.titleLabel}</span>
                  </h3>
                  <p className="text-xs text-amber-400 font-semibold">{config.tagline}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Agrandissement plein cadre avec illustration détaillée */}
            <div className="w-full h-48 rounded-2xl overflow-hidden border-2 border-amber-500/50 relative shadow-inner">
              <div className="w-full h-full">
                {/* On réutilise l'illustration en grand */}
                <div className="w-full h-full bg-slate-950 flex items-center justify-center flex-col gap-3 p-4 text-center">
                  <span className="text-5xl">{config.iconEmoji}</span>
                  <div className={`px-4 py-1.5 rounded-2xl ${config.badgeBg} text-sm sm:text-base font-black shadow-lg uppercase`}>
                    {config.titleLabel}
                  </div>
                  <p className="text-xs text-amber-300 font-bold max-w-sm">
                    {config.sceneDescription}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 px-3 py-1 rounded-xl bg-slate-950/90 text-white text-xs font-black border border-slate-700">
                {course.reunion} {course.course} • {course.hippodrome} ({course.date})
              </div>
            </div>

            {/* Description détaillée & Spécificités */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider block">
                  Description Officielle de la Discipline :
                </span>
                <p className="leading-relaxed text-slate-200">
                  {config.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider block">
                  Points Clés & Règlement :
                </span>
                <ul className="space-y-1">
                  {config.particularites.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-center gap-2 text-slate-300">
                      <span className="text-amber-500 font-black">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Caractéristiques de la course */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Distance</span>
                <span className="text-xs font-black text-white">{course.distance} m</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Corde</span>
                <span className="text-xs font-black text-amber-400">{course.corde ? `Corde ${course.corde}` : 'Gauche'}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Partants</span>
                <span className="text-xs font-black text-emerald-400">{course.partants?.length || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Terrain</span>
                <span className="text-xs font-black text-white truncate">{course.terrain || 'Standard'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Fermer la vue détaillée
            </button>
          </div>
        </div>
      )}
    </>
  );
};
