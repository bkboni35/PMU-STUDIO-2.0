import { useState, useEffect } from 'react';
import { CourseHippique } from '../types/turf';

/**
 * Retourne à la fois l'heure officielle France (CEST/CET) et l'heure Côte d'Ivoire / GMT Abidjan (UTC+0)
 * Ex: 18h58 France ➔ 16h58 GMT Abidjan (-2h en été)
 * Ex: 20h15 France ➔ 18h15 GMT Abidjan (-2h en été)
 */
export function getDualDepartureTimes(heureStr?: string, dateStr?: string): { franceTime: string; ciTime: string } {
  if (!heureStr) return { franceTime: '14h00', ciTime: '12h00' };

  const clean = heureStr.replace(':', 'h').trim();
  const match = clean.match(/(\d{1,2})h(\d{2})/i);
  if (!match) return { franceTime: heureStr, ciTime: heureStr };

  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  // L'heure officielle Geny/PMU (ex: 18h58) est en Heure de France.
  // L'heure de Côte d'Ivoire / GMT Abidjan (UTC+0) est l'heure de France - 2h en été (CEST) ou - 1h en hiver (CET).
  let shift = 2;
  if (dateStr) {
    const lower = dateStr.toLowerCase();
    if (
      lower.includes('novembre') ||
      lower.includes('décembre') ||
      lower.includes('janvier') ||
      lower.includes('février') ||
      lower.includes('mars')
    ) {
      shift = 1;
    }
  }

  const franceH = h;
  let ciH = h - shift;
  if (ciH < 0) ciH += 24;

  const formattedFrance = `${String(franceH).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
  const formattedCI = `${String(ciH).padStart(2, '0')}h${String(m).padStart(2, '0')}`;

  return {
    franceTime: formattedFrance,
    ciTime: formattedCI,
  };
}

/**
 * Construit un objet Date JS universel (en UTC/GMT) pour le compte à rebours précis.
 * Les heures du programme LONACI étant en GMT (UTC+0), l'heure fournie (ex: 10h17) est directement l'heure UTC.
 */
export function getRaceParisTargetTime(dateStr?: string, heureStr?: string): Date {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  const lowerDate = (dateStr || '').toLowerCase().trim();

  if (lowerDate.includes('demain')) {
    const tomorrow = new Date(now.getTime() + 86400000);
    year = tomorrow.getFullYear();
    month = tomorrow.getMonth();
    day = tomorrow.getDate();
  } else if (lowerDate.includes('hier')) {
    const yesterday = new Date(now.getTime() - 86400000);
    year = yesterday.getFullYear();
    month = yesterday.getMonth();
    day = yesterday.getDate();
  } else if (lowerDate.includes('prochainement')) {
    const nextDay = new Date(now.getTime() + 172800000);
    year = nextDay.getFullYear();
    month = nextDay.getMonth();
    day = nextDay.getDate();
  } else if (lowerDate.includes('/') || lowerDate.includes('-')) {
    const parts = lowerDate.split(/[/.-]/).map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 3) {
      if (parts[0] > 1000) {
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
      } else {
        day = parts[0];
        month = parts[1] - 1;
        year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
      }
    }
  } else {
    // Ex: "mercredi 30 septembre 2026", "mardi 29 septembre 2026", etc.
    const match = lowerDate.match(/(?:[a-zàâäéèêëîïôöùûüç]+\s+)?(\d{1,2})\s+([a-zàâäéèêëîïôöùûüç]+)\s+(\d{4})/);
    if (match) {
      day = parseInt(match[1], 10);
      const monthName = match[2];
      year = parseInt(match[3], 10);

      const monthsMap: Record<string, number> = {
        janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
        juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, décembre: 11,
      };
      if (monthsMap[monthName] !== undefined) {
        month = monthsMap[monthName];
      }
    }
  }

  const rawHeure = (heureStr || '12h00').replace('h', ':').trim();
  const [hStr, mStr] = rawHeure.split(':');
  const hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;

  // L'heure de départ officielle Geny/PMU (ex: 18h58 France CEST) est convertie en GMT (UTC+0)
  let shift = 2; // -2h heure d'été CEST
  if (
    lowerDate.includes('novembre') ||
    lowerDate.includes('décembre') ||
    lowerDate.includes('janvier') ||
    lowerDate.includes('février') ||
    lowerDate.includes('mars')
  ) {
    shift = 1;
  }

  let utcH = hours - shift;
  if (utcH < 0) utcH += 24;

  const utcTimeMs = Date.UTC(year, month, day, utcH, minutes, 0, 0);
  return new Date(utcTimeMs);
}

/**
 * Vérifie si l'arrivée officielle définitive d'une course est confirmée et homologuée.
 */
export function isCourseArrivalOfficiallyConfirmed(course: Partial<CourseHippique> | null | undefined): boolean {
  if (!course) return false;
  const hasArrival = Boolean(course.arriveeOfficielle && course.arriveeOfficielle.trim());
  if (!hasArrival) return false;

  const isOfficialStatus = 
    course.statutCourse === 'Arrivée officielle' || 
    (course as any).statutArrivee === 'officielle';

  const isProvisional = 
    course.statutCourse?.toLowerCase()?.includes('provisoire') ||
    (course as any).statutArrivee === 'provisoire';

  const isAuditDone = Boolean((course as any).arrivalAuditCompleted);

  return isOfficialStatus && !isProvisional && isAuditDone;
}

/**
 * Vérifie si une course hippique est terminée ou passée ("après la course").
 * RÈGLE COMMISSAIRES : Après la course, plus de variation des cotes !
 * Une course est considérée terminée/scellée si une arrivée officielle est publiée,
 * si le statut est officiel/terminé, si la date est passée, ou si l'heure de départ est dépassée.
 */
export function isCourseFinished(course: Partial<CourseHippique> | null | undefined): boolean {
  if (!course) return false;

  // 1. Statut explicite ou présence d'une arrivée officielle publiée
  if (
    course.statutCourse === 'Arrivée officielle' ||
    course.statutCourse === 'Course terminée' ||
    (typeof course.statutCourse === 'string' && (course.statutCourse.toLowerCase()?.includes('officielle') || course.statutCourse.toLowerCase()?.includes('termin'))) ||
    Boolean(course.arriveeOfficielle && course.arriveeOfficielle.trim()) ||
    Boolean((course as any).statutArrivee === 'officielle')
  ) {
    return true;
  }

  // 2. Date antérieure (hier ou date passée)
  if (course.date) {
    const lowerDate = course.date.toLowerCase().trim();
    if (lowerDate.includes('hier')) {
      return true;
    }
    // Vérification dynamique du jour
    const matchSlash = lowerDate.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (matchSlash) {
      const d = parseInt(matchSlash[1], 10);
      const m = parseInt(matchSlash[2], 10) - 1;
      const parsedY = parseInt(matchSlash[3], 10);
      const y = parsedY < 100 ? 2000 + parsedY : parsedY;
      const cDate = new Date(Date.UTC(y, m, d));
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      if (cDate.getTime() < today.getTime()) {
        return true;
      }
    }
  }

  // 3. Vérification temporelle : après l'heure de départ de la course
  if (course.heure) {
    try {
      const targetTime = getRaceParisTargetTime(course.date, course.heure);
      const now = new Date();
      // Si l'heure de départ est dépassée de plus de 5 minutes, la course est en cours ou terminée
      if (now.getTime() >= (targetTime.getTime() + 5 * 60 * 1000)) {
        return true;
      }
    } catch (e) {
      console.warn("Erreur calcul isCourseFinished:", e);
    }
  }

  return false;
}

/**
 * Calcule le temps restant en secondes avant l'heure de départ d'une course (format "HH:mm" ou "HHhMM")
 */
export function getSecondsUntilRace(heureStr: string): number {
  if (!heureStr) return 999999;
  
  const clean = heureStr.replace('h', ':').trim();
  const parts = clean.split(':');
  if (parts.length < 2) return 999999;
  
  const targetHour = parseInt(parts[0], 10);
  const targetMin = parseInt(parts[1], 10);
  if (isNaN(targetHour) || isNaN(targetMin)) return 999999;

  const now = new Date();
  const targetDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    targetHour,
    targetMin,
    0,
    0
  ));

  const diffSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
  return diffSeconds;
}

/**
 * Formate un nombre de secondes en MM:SS ou HH:MM:SS
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calcule le délai requis (en ms et minutes) pour l'homologation automatique
 * d'une arrivée provisoire en l'absence d'enquête des commissaires :
 * - Trot Attelé & Trot Monté : 3 minutes (180 000 ms)
 * - Plat & Obstacle (Haies, Steeple, Cross) : 1 minute (60 000 ms)
 */
export function getOfficialArrivalDelayMs(disciplineStr?: string): { delayMs: number; delayMinutes: number; category: 'trot' | 'galop' } {
  const disc = (disciplineStr || '').toLowerCase().trim();

  // Plat et Obstacle (Haies, Steeple-chase, Cross-country, Galop) -> 1 minute (60 000 ms)
  if (
    disc.includes('plat') ||
    disc.includes('obstacle') ||
    disc.includes('haie') ||
    disc.includes('steeple') ||
    disc.includes('cross') ||
    disc.includes('galop') ||
    disc === 'p' ||
    disc === 'o'
  ) {
    return { delayMs: 60 * 1000, delayMinutes: 1, category: 'galop' };
  }

  // Trot Attelé & Trot Monté -> 3 minutes (180 000 ms)
  return { delayMs: 3 * 60 * 1000, delayMinutes: 3, category: 'trot' };
}

/**
 * Vérifie si l'arrivée provisoire doit basculer en ARRIVÉE OFFICIELLE :
 * - S'il y a une enquête des commissaires (hasEnquete = true), l'arrivée reste PROVISOIRE.
 * - Si pas d'enquête et que le délai (1 min Plat/Obstacle, 3 min Trot) est dépassé, elle devient OFFICIELLE.
 */
export function shouldPromoteProvisionalToOfficial(
  provisionalArrivalAt: string | number | undefined | null,
  disciplineStr?: string,
  hasEnquete?: boolean
): { shouldPromote: boolean; remainingSeconds: number; delayMinutes: number } {
  const { delayMs, delayMinutes } = getOfficialArrivalDelayMs(disciplineStr);

  if (hasEnquete) {
    return { shouldPromote: false, remainingSeconds: 999999, delayMinutes };
  }

  if (!provisionalArrivalAt) {
    return { shouldPromote: false, remainingSeconds: Math.ceil(delayMs / 1000), delayMinutes };
  }

  const startTime = typeof provisionalArrivalAt === 'number' ? provisionalArrivalAt : new Date(provisionalArrivalAt).getTime();

  if (isNaN(startTime) || startTime <= 0) {
    return { shouldPromote: false, remainingSeconds: Math.ceil(delayMs / 1000), delayMinutes };
  }

  const elapsedMs = Date.now() - startTime;
  const remainingMs = delayMs - elapsedMs;

  if (remainingMs <= 0) {
    return { shouldPromote: true, remainingSeconds: 0, delayMinutes };
  }

  return {
    shouldPromote: false,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    delayMinutes,
  };
}

/**
 * RÈGLE PMU COMMISSAIRES :
 * 5 minutes (300 secondes) après l'affichage de l'ARRIVÉE OFFICIELLE,
 * actualiser automatiquement pour vérifier s'il n'y a pas de modification à l'arrivée
 * (rétrogradation suite à réclamation, disqualification après enquête tardive, etc.).
 */
export const POST_OFFICIAL_AUDIT_DELAY_MS = 5 * 60 * 1000; // 5 minutes = 300 000 ms

export interface OfficialArrivalAuditStatus {
  isAuditPending: boolean; // Les 5 minutes sont en cours de décompte
  isAuditDue: boolean; // Les 5 minutes sont écoulées, l'actualisation doit être exécutée
  isAuditCompleted: boolean; // Le contrôle a déjà été exécuté avec succès
  remainingSeconds: number; // Secondes restantes avant le déclenchement du contrôle
  totalDelaySeconds: number; // 300 secondes
  officialTimestamp: number | null;
}

export function checkOfficialArrivalAuditStatus(
  officialArrivalAt: string | number | undefined | null,
  isAuditCompleted = false
): OfficialArrivalAuditStatus {
  if (isAuditCompleted) {
    return {
      isAuditPending: false,
      isAuditDue: false,
      isAuditCompleted: true,
      remainingSeconds: 0,
      totalDelaySeconds: 300,
      officialTimestamp: officialArrivalAt ? new Date(officialArrivalAt).getTime() : null,
    };
  }

  if (!officialArrivalAt) {
    return {
      isAuditPending: false,
      isAuditDue: false,
      isAuditCompleted: false,
      remainingSeconds: 300,
      totalDelaySeconds: 300,
      officialTimestamp: null,
    };
  }

  const startTime = typeof officialArrivalAt === 'number' ? officialArrivalAt : new Date(officialArrivalAt).getTime();
  if (isNaN(startTime) || startTime <= 0) {
    return {
      isAuditPending: false,
      isAuditDue: false,
      isAuditCompleted: false,
      remainingSeconds: 300,
      totalDelaySeconds: 300,
      officialTimestamp: null,
    };
  }

  const elapsedMs = Date.now() - startTime;
  const remainingMs = POST_OFFICIAL_AUDIT_DELAY_MS - elapsedMs;

  if (remainingMs <= 0) {
    return {
      isAuditPending: false,
      isAuditDue: true,
      isAuditCompleted: false,
      remainingSeconds: 0,
      totalDelaySeconds: 300,
      officialTimestamp: startTime,
    };
  }

  return {
    isAuditPending: true,
    isAuditDue: false,
    isAuditCompleted: false,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    totalDelaySeconds: 300,
    officialTimestamp: startTime,
  };
}
