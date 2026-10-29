import { useState, useEffect } from 'react';
import { CourseHippique } from '../types/turf';
import { getParisToUtcShift, parseFrenchOrIsoDate, isFranceWinterTime } from './timeConversion';

/**
 * Retourne à la fois l'heure officielle France (CET/CEST) et l'heure Côte d'Ivoire / GMT Abidjan (UTC+0)
 * Détection automatique avec ajustement heure d'hiver (CET = UTC+1, shift = 1h) et heure d'été (CEST = UTC+2, shift = 2h).
 * Ex en hiver : 13h55 France ➔ 12h55 GMT Abidjan (-1h)
 * Ex en été   : 13h55 France ➔ 11h55 GMT Abidjan (-2h)
 */
export function getDualDepartureTimes(heureStr?: string, dateStr?: string): { franceTime: string; ciTime: string; isWinter: boolean } {
  if (!heureStr) {
    const isW = isFranceWinterTime(dateStr);
    return { franceTime: '14h00', ciTime: isW ? '13h00' : '12h00', isWinter: isW };
  }

  const clean = heureStr.replace(':', 'h').trim();
  const match = clean.match(/(\d{1,2})h(\d{2})/i);
  if (!match) {
    const isW = isFranceWinterTime(dateStr);
    return { franceTime: heureStr, ciTime: heureStr, isWinter: isW };
  }

  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  // L'heure officielle Geny/PMU (ex: 13h55) est en Heure de France.
  // Décalage automatique heure d'hiver (CET: -1h) vs heure d'été (CEST: -2h) vers GMT Abidjan (UTC+0).
  const shift = getParisToUtcShift(dateStr);
  const isWinter = shift === 1;

  const franceH = h;
  let ciH = h - shift;
  if (ciH < 0) ciH += 24;

  const formattedFrance = `${String(franceH).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
  const formattedCI = `${String(ciH).padStart(2, '0')}h${String(m).padStart(2, '0')}`;

  return {
    franceTime: formattedFrance,
    ciTime: formattedCI,
    isWinter,
  };
}

/**
 * Construit un objet Date JS universel (en UTC/GMT) pour le compte à rebours précis.
 * Prend en compte l'heure d'hiver en France (UTC+1, shift = 1h) et heure d'été (UTC+2, shift = 2h).
 */
export function getRaceParisTargetTime(dateStr?: string, heureStr?: string): Date {
  const parsedDate = parseFrenchOrIsoDate(dateStr);
  const year = parsedDate.getUTCFullYear();
  const month = parsedDate.getUTCMonth();
  const day = parsedDate.getUTCDate();

  const rawHeure = (heureStr || '12h00').replace('h', ':').trim();
  const [hStr, mStr] = rawHeure.split(':');
  const hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;

  // L'heure de départ officielle Geny/PMU France est convertie en UTC/GMT
  // En heure d'hiver : shift = 1h (CET: UTC+1)
  // En heure d'été   : shift = 2h (CEST: UTC+2)
  const shift = getParisToUtcShift(dateStr);

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
  const hasArrival = Boolean(course.arriveeOfficielle && typeof course.arriveeOfficielle === 'string' && course.arriveeOfficielle.trim());
  if (!hasArrival) return false;

  const isProvisional = 
    course.statutCourse?.toLowerCase()?.includes('provisoire') ||
    (course as any).statutArrivee === 'provisoire' ||
    (course as any).statut === 'ARRIVEE_PROVISOIRE';

  if (isProvisional) return false;

  const isOfficialStatus = 
    course.statutCourse === 'Arrivée officielle' || 
    course.statutCourse === 'Course terminée' ||
    (course as any).statutArrivee === 'officielle' ||
    (course as any).statut === 'ARRIVEE_OFFICIELLE' ||
    Boolean((course as any).donneesFigees);

  return isOfficialStatus;
}

/**
 * Vérifie si l'arrivée d'une course est actuellement au stade PROVISOIRE
 * (dès que l'arrivée est disponible mais pas encore homologuée/confirmée).
 */
export function isCourseArrivalProvisional(course: Partial<CourseHippique> | null | undefined): boolean {
  if (!course) return false;
  const hasArrival = Boolean(course.arriveeOfficielle && typeof course.arriveeOfficielle === 'string' && course.arriveeOfficielle.trim());
  if (!hasArrival) return false;

  if (isCourseArrivalOfficiallyConfirmed(course)) return false;

  return (
    course.statutCourse?.toLowerCase()?.includes('provisoire') ||
    (course as any).statutArrivee === 'provisoire' ||
    (course as any).statut === 'ARRIVEE_PROVISOIRE' ||
    true // Toute arrivée présente non encore officiellement confirmée est provisoire
  );
}

/**
 * Vérifie si une course hippique est actuellement en cours :
 * dès que le compte à rebours est terminé (0 min 0 s) et qu'aucune arrivée n'est encore disponible.
 */
export function isCourseRunning(course: Partial<CourseHippique> | null | undefined): boolean {
  if (!course) return false;
  const hasArrival = Boolean(course.arriveeOfficielle && typeof course.arriveeOfficielle === 'string' && course.arriveeOfficielle.trim());
  if (hasArrival) return false;

  return (
    course.statutCourse === 'Course en cours' ||
    (course as any).statut === 'ATTENTE' ||
    isPastDepartureTime(course)
  );
}

/**
 * Vérifie si une course hippique est terminée (arrivée officielle ou provisoire présente, statut terminé/clôturé, etc.).
 * Dès qu'une course est terminée, les cotes sont définitives et ne varient plus.
 */
export function isCourseFinished(course: Partial<CourseHippique> | null | undefined): boolean {
  if (!course) return false;

  if (isCourseArrivalOfficiallyConfirmed(course)) return true;

  // Si une arrivée officielle ou provisoire est renseignée, la course est déjà courue et terminée
  if (course.arriveeOfficielle && typeof course.arriveeOfficielle === 'string' && course.arriveeOfficielle.trim().length > 0) {
    return true;
  }

  const statut = String(course.statutCourse || (course as any).statutArrivee || (course as any).statut || '').toLowerCase();
  if (
    statut.includes('termin') ||
    statut.includes('officiel') ||
    statut.includes('provisoire') ||
    statut.includes('clotur') ||
    statut.includes('definitive')
  ) {
    return true;
  }

  if (course.date && typeof course.date === 'string' && course.date.toLowerCase().includes('hier')) {
    return true;
  }

  return false;
}

/**
 * Vérifie si l'heure de départ officielle de la course est atteinte ou dépassée.
 * Active le cycle de polling toutes les 15 secondes après l'heure de départ.
 */
export function isPastDepartureTime(course: Partial<CourseHippique> | null | undefined): boolean {
  if (!course) return false;
  if (!course.heure) return false;

  try {
    const targetTime = getRaceParisTargetTime(course.date, course.heure);
    const now = new Date();
    return now.getTime() >= targetTime.getTime();
  } catch (e) {
    console.warn("Erreur calcul isPastDepartureTime:", e);
    return false;
  }
}

/**
 * Calcule le temps restant en secondes avant l'heure de départ d'une course (format "HH:mm" ou "HHhMM")
 * Prend en compte le décalage dynamique heure d'hiver (UTC+1) / heure d'été (UTC+2).
 */
export function getSecondsUntilRace(heureStr: string, dateStr?: string): number {
  if (!heureStr) return 999999;
  try {
    const target = getRaceParisTargetTime(dateStr, heureStr);
    const now = new Date();
    return Math.floor((target.getTime() - now.getTime()) / 1000);
  } catch {
    return 999999;
  }
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
 * 3 minutes (180 secondes) après l'affichage de l'ARRIVÉE OFFICIELLE,
 * actualiser automatiquement pour vérifier s'il n'y a pas de modification à l'arrivée
 * (rétrogradation suite à réclamation, disqualification après enquête tardive, etc.).
 */
export const POST_OFFICIAL_AUDIT_DELAY_MS = 3 * 60 * 1000; // 3 minutes = 180 000 ms

export interface OfficialArrivalAuditStatus {
  isAuditPending: boolean; // Les 3 minutes sont en cours de décompte
  isAuditDue: boolean; // Les 3 minutes sont écoulées, l'actualisation doit être exécutée
  isAuditCompleted: boolean; // Le contrôle a déjà été exécuté avec succès
  remainingSeconds: number; // Secondes restantes avant le déclenchement du contrôle
  totalDelaySeconds: number; // 180 secondes
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
      totalDelaySeconds: 180,
      officialTimestamp: officialArrivalAt ? new Date(officialArrivalAt).getTime() : null,
    };
  }

  if (!officialArrivalAt) {
    return {
      isAuditPending: false,
      isAuditDue: false,
      isAuditCompleted: false,
      remainingSeconds: 180,
      totalDelaySeconds: 180,
      officialTimestamp: null,
    };
  }

  const startTime = typeof officialArrivalAt === 'number' ? officialArrivalAt : new Date(officialArrivalAt).getTime();
  if (isNaN(startTime) || startTime <= 0) {
    return {
      isAuditPending: false,
      isAuditDue: false,
      isAuditCompleted: false,
      remainingSeconds: 180,
      totalDelaySeconds: 180,
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
      totalDelaySeconds: 180,
      officialTimestamp: startTime,
    };
  }

  return {
    isAuditPending: true,
    isAuditDue: false,
    isAuditCompleted: false,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    totalDelaySeconds: 180,
    officialTimestamp: startTime,
  };
}
