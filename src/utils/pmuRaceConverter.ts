import { CourseHippique, PmuMeeting } from '../types/turf';
import { normalizeDateForQuery } from './timeConversion';
import { buildRealV38Synthese } from './v38Helper';

export function getReunionColorClasses(rNum: string) {
  switch ((rNum || '').toUpperCase()) {
    case 'R1':
      return {
        bg: 'bg-blue-950/80',
        border: 'border-blue-500/60',
        text: 'text-blue-300',
        badge: 'bg-blue-500 text-slate-950',
        accent: 'border-l-blue-500',
      };
    case 'R2':
      return {
        bg: 'bg-emerald-950/80',
        border: 'border-emerald-500/60',
        text: 'text-emerald-300',
        badge: 'bg-emerald-500 text-slate-950',
        accent: 'border-l-emerald-500',
      };
    case 'R3':
      return {
        bg: 'bg-purple-950/80',
        border: 'border-purple-500/60',
        text: 'text-purple-300',
        badge: 'bg-purple-500 text-slate-950',
        accent: 'border-l-purple-500',
      };
    case 'R4':
      return {
        bg: 'bg-amber-950/80',
        border: 'border-amber-500/60',
        text: 'text-amber-300',
        badge: 'bg-amber-500 text-slate-950',
        accent: 'border-l-amber-500',
      };
    case 'R5':
      return {
        bg: 'bg-rose-950/80',
        border: 'border-rose-500/60',
        text: 'text-rose-300',
        badge: 'bg-rose-500 text-slate-950',
        accent: 'border-l-rose-500',
      };
    default:
      return {
        bg: 'bg-slate-900/80',
        border: 'border-slate-700/60',
        text: 'text-slate-300',
        badge: 'bg-slate-600 text-white',
        accent: 'border-l-slate-500',
      };
  }
}

export function convertMeetingToCourseHippique(m: PmuMeeting): CourseHippique {
  const distNum =
    typeof m.distance === 'number'
      ? m.distance
      : parseInt(String(m.distance || '2100').replace(/\D/g, ''), 10) || 2100;
  const cordeVal: 'Droite' | 'Gauche' = m.corde === 'Droite' ? 'Droite' : 'Gauche';
  const allocNum =
    typeof m.allocation === 'number'
      ? m.allocation
      : parseInt(String(m.allocation || '30000').replace(/\D/g, ''), 10) || 30000;

  const hippoSlug = (m.hippodrome || 'Hippodrome')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-');
  const courseSlug = (m.nomCoursePhare || m.description || 'Course')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-');
  const numericId = String(m.id || '').replace(/\D/g, '') || '1482910';
  const defaultDateStr = m.date || 'Dimanche 11 Octobre 2026';
  const dateSlug = normalizeDateForQuery(defaultDateStr) || '2026-10-11';
  const constructedGenyUrl = `https://www.geny.com/partants-pmu/${dateSlug}-${hippoSlug}-pmu-${courseSlug}_c${numericId}`;

  const basePartants =
    m.partants && m.partants.length >= 10
      ? m.partants
      : Array.from({ length: m.nombrePartants || 14 }, (_, idx) => {
          const num = idx + 1;
          const trotDrivers = [
            'E. RAFFIN',
            'F. NIVARD',
            'M. ABRIVARD',
            'Y. LEBOURGEOIS',
            'D. THOMAIN',
            'A. BARRIER',
            'B. ROCHARD',
            'CH. MOTTIER',
          ];
          const galopJockeys = [
            'M. GUYON',
            'C. SOUMILLON',
            'M. BARZALONA',
            'S. PASQUIER',
            'A. POUCHIN',
            'T. BACHELOT',
            'C. DEMURO',
            'A. LEMAITRE',
          ];
          const isGalop =
            (m.discipline || '').toLowerCase().includes('plat') ||
            (m.discipline || '').toLowerCase().includes('haie') ||
            (m.discipline || '').toLowerCase().includes('steeple');
          const driverList = isGalop ? galopJockeys : trotDrivers;
          return {
            numero: num,
            nom: `PARTANT OFFICIEL N°${num}`,
            driver: driverList[(num - 1) % driverList.length],
            entraineur: 'J.M. BAZIRE',
            musique: isGalop ? '2p 1p 4p' : '1a 2a 3a Da',
            coteProbable: +(3.8 + num * 2.1).toFixed(1),
            ferrure: isGalop ? undefined : num % 2 === 0 ? 'D4' : 'DP',
            distance: distNum,
            gains: 45000 + num * 12000,
            age: 5,
            sexe: (num % 3 === 0 ? 'F' : 'M') as 'M' | 'F' | 'H',
            hippoScore: Math.max(50, Math.min(94, 94 - idx * 2.5)),
            statut: idx < 3 ? 'Favori' : idx < 7 ? 'Seconde chance' : 'Outsider',
          };
        });

  const hasRealPartants = Boolean(
    m.partants &&
      m.partants.length >= 2 &&
      m.partants.some((p: any) => p.nom && !p.nom.toUpperCase().includes('PARTANT OFFICIEL'))
  );

  const baseCourse = {
    id: m.id,
    sourceUrl: m.lienGeny || constructedGenyUrl,
    sourceType: 'pmu.lonacionline.ci' as const,
    isPlaceholder: !hasRealPartants,
    titre: `${m.nomCoursePhare} (${m.reunion} ${m.courseNumero}) - ${m.hippodrome}`,
    prixNom: m.nomCoursePhare,
    hippodrome: m.hippodrome,
    reunion: m.reunion || 'R1',
    course: m.courseNumero || 'C1',
    estQuinte: Boolean(m.estQuinte),
    estPick5: Boolean(m.estPick5),
    discipline: m.discipline as any,
    date: m.date || defaultDateStr,
    heure: m.heure || '12h00',
    distance: distNum,
    corde: cordeVal,
    terrain: 'Bon',
    allocation: allocNum,
    conditions: m.description,
    statutCourse:
      m.statut?.toLowerCase().includes('termin') || Boolean(m.arriveeOfficielle)
        ? ('Arrivée officielle' as const)
        : ('À venir' as const),
    arriveeOfficielle: m.arriveeOfficielle,
    partants: basePartants.map((p) => {
      const pDist =
        typeof p.distance === 'number'
          ? p.distance
          : parseInt(String(p.distance || distNum).replace(/\D/g, ''), 10) || distNum;
      return {
        numero: p.numero,
        nom: p.nom,
        driver: p.driver,
        entraineur: p.entraineur,
        musique: p.musique,
        coteProbable: p.coteProbable,
        ferrure: p.ferrure as any,
        distance: pDist,
        gains: p.gains,
        age: p.age,
        sexe: p.sexe,
        hippoScore: p.hippoScore || 70,
        statut: p.statut || 'Outsider',
      };
    }),
  };

  return {
    ...baseCourse,
    synthese: buildRealV38Synthese(baseCourse as unknown as CourseHippique),
  };
}
