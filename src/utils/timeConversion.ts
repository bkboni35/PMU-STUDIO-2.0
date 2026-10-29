/**
 * Retourne la date courante en Côte d'Ivoire (Fuseau GMT / Africa/Abidjan / UTC+0)
 * Format YYYY-MM-DD
 */
export function getIvoryCoastDate(offsetDays: number = 0): string {
  try {
    const now = new Date();
    // Créer la date calée sur GMT / Abidjan
    const utcTime = now.getTime() + offsetDays * 86400000;
    const d = new Date(utcTime);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Abidjan',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Calcule le nombre de millisecondes exact jusqu'au prochain 00h00:00.000 heure de Côte d'Ivoire (GMT / Africa/Abidjan)
 * Utilise une synchronisation robuste basée sur l'horloge UTC/GMT absolue.
 */
export function getMillisecondsUntilIvoryCoastMidnight(): number {
  try {
    const now = new Date();
    // En Côte d'Ivoire (GMT), minuit correspond exactement à 00:00:00.000 UTC
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const diff = nextMidnight.getTime() - now.getTime();
    return diff > 0 ? diff : 86400000;
  } catch {
    return 3600000;
  }
}

/**
 * Analyse une chaîne de date française ou ISO pour obtenir un objet Date exploitable.
 */
export function parseFrenchOrIsoDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const lower = dateStr.toLowerCase().trim();
  if (lower.includes('aujourd') || lower.includes('maintenant')) return new Date();
  if (lower.includes('demain')) return new Date(Date.now() + 86400000);
  if (lower.includes('hier')) return new Date(Date.now() - 86400000);

  // Format ISO : YYYY-MM-DD
  const isoMatch = lower.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return new Date(Date.UTC(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3], 12, 0, 0));
  }

  // Format français numérique : DD/MM/YYYY ou DD-MM-YYYY
  const numMatch = lower.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (numMatch) {
    return new Date(Date.UTC(+numMatch[3], +numMatch[2] - 1, +numMatch[1], 12, 0, 0));
  }

  // Format textuel : "27 octobre 2026", "mardi 27 octobre 2026", etc.
  const textMatch = lower.match(/(\d{1,2})\s+([a-zàâäéèêëîïôöùûüç]+)(?:\s+(\d{4}))?/);
  if (textMatch) {
    const months: Record<string, number> = {
      janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, décembre: 11,
    };
    const m = months[textMatch[2]];
    if (m !== undefined) {
      const year = textMatch[3] ? parseInt(textMatch[3], 10) : new Date().getFullYear();
      return new Date(Date.UTC(year, m, parseInt(textMatch[1], 10), 12, 0, 0));
    }
  }

  return new Date();
}

/**
 * Calcule le décalage horaire officiel entre l'Heure de France (Europe/Paris)
 * et le fuseau UTC/GMT (Côte d'Ivoire / Abidjan / UTC+0).
 * - En heure d'hiver (CET, UTC+1, du dernier dimanche d'octobre au dernier dimanche de mars) : décalage de 1 heure (-1h).
 * - En heure d'été (CEST, UTC+2, du dernier dimanche de mars au dernier dimanche d'octobre) : décalage de 2 heures (-2h).
 */
export function getParisToUtcShift(dateInput?: string | Date): number {
  const d = typeof dateInput === 'string' ? parseFrenchOrIsoDate(dateInput) : (dateInput || new Date());
  try {
    const utcDate = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
    const parisDate = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const offset = Math.round((parisDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60));
    if (offset === 1 || offset === 2) return offset;
  } catch {}

  // Algorithme européen officiel (dernier dimanche de mars -> dernier dimanche d'octobre)
  const month = d.getUTCMonth();
  if (month > 2 && month < 9) return 2; // Avril à Septembre : Heure d'été (UTC+2)
  if (month < 2 || month > 9) return 1; // Novembre à Février : Heure d'hiver (UTC+1)
  
  const day = d.getUTCDate();
  // En mars : passage à l'heure d'été le dernier dimanche
  if (month === 2) {
    const lastDayOfMonth = new Date(Date.UTC(d.getUTCFullYear(), 3, 0)).getUTCDate();
    const lastSunday = lastDayOfMonth - new Date(Date.UTC(d.getUTCFullYear(), 2, lastDayOfMonth)).getUTCDay();
    return day >= lastSunday ? 2 : 1;
  }
  // En octobre : passage à l'heure d'hiver le dernier dimanche
  if (month === 9) {
    const lastDayOfMonth = new Date(Date.UTC(d.getUTCFullYear(), 10, 0)).getUTCDate();
    const lastSunday = lastDayOfMonth - new Date(Date.UTC(d.getUTCFullYear(), 9, lastDayOfMonth)).getUTCDay();
    return day >= lastSunday ? 1 : 2;
  }

  return 1;
}

/**
 * Indique si une date donnée est sous le régime officiel de l'heure d'hiver en France (CET / UTC+1).
 */
export function isFranceWinterTime(dateInput?: string | Date): boolean {
  return getParisToUtcShift(dateInput) === 1;
}

/**
 * Convertit une heure de départ officielle PMU / Geny France (ex: "13h55", "18h58" ou "20h15")
 * en heure locale GMT Abidjan (Côte d'Ivoire / UTC+0).
 * - En heure d'hiver française (CET = UTC+1, fin octobre à fin mars) : -1 heure (ex: 13h55 FR -> 12h55 GMT).
 * - En heure d'été française (CEST = UTC+2, fin mars à fin octobre) : -2 heures (ex: 13h55 FR -> 11h55 GMT).
 */
export function convertToAbidjanGMT(heureStr: string, dateStr?: string): string {
  if (!heureStr) return "";

  try {
    const cleanHeure = heureStr.replace(':', 'h').trim();
    const match = cleanHeure.match(/(\d{1,2})h(\d{2})/i);
    if (!match) return heureStr;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (isNaN(hours) || isNaN(minutes)) return heureStr;

    // Décalage dynamique avec détection automatique de l'heure d'hiver (CET: -1h) vs heure d'été (CEST: -2h)
    const shiftHours = getParisToUtcShift(dateStr);

    hours = hours - shiftHours;
    if (hours < 0) hours += 24;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}h${formattedMinutes}`;
  } catch (e) {
    console.error("Erreur conversion heure GMT Abidjan:", e);
    return heureStr;
  }
}

/**
 * Convertit et formate l'heure de départ en GMT Abidjan (ex: "12h55 GMT").
 */
export function convertToUTC(heureStr: string, dateStr?: string): string {
  return convertToAbidjanGMT(heureStr, dateStr);
}

/**
 * Résout précisément si la course a lieu "Hier", "Aujourd'hui", "Demain" ou "Prochainement"
 * en analysant les mentions textuelles et les dates calendaires par rapport au jour actuel.
 */
export function resolveMeetingDateRelative(
  dateStr?: string,
  existingRelative?: string
): "Aujourd'hui" | 'Demain' | 'Prochainement' | 'Hier' {
  const combined = `${existingRelative || ''} ${dateStr || ''}`.toLowerCase().trim();
  
  if (combined.includes('hier')) return 'Hier';
  if (combined.includes('demain')) return 'Demain';
  if (combined.includes('prochain') || combined.includes('après-demain') || combined.includes('apres-demain')) return 'Prochainement';

  // Analyser si la date numérique ou textuelle est dans le futur ou le passé
  if (dateStr) {
    const cleanDate = dateStr.trim();

    // Analyser le jour et le mois de référence avec le fuseau horaire UTC/GMT
    const now = new Date();
    const utcString = now.toLocaleDateString('en-US', { timeZone: 'UTC' });
    const nowUtc = new Date(utcString);
    const currentDay = nowUtc.getDate();
    const currentMonth = nowUtc.getMonth();

    // Format DD/MM/YYYY ou DD/MM
    const slashMatch = cleanDate.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1;

      if (month < currentMonth || (month === currentMonth && day < currentDay)) {
        return day === currentDay - 1 ? 'Hier' : 'Hier';
      } else if (month === currentMonth && day === currentDay) {
        return "Aujourd'hui";
      } else if (month > currentMonth || (month === currentMonth && day > currentDay)) {
        return day === currentDay + 1 ? 'Demain' : 'Prochainement';
      }
    }

    // Format textuel avec numéro de jour (ex: "Dimanche 27 Septembre", "Samedi 26 Septembre")
    const textDayMatch = cleanDate.match(/\b(\d{1,2})\b/);
    if (textDayMatch) {
      const day = parseInt(textDayMatch[1], 10);
      if (day === currentDay) return "Aujourd'hui";
      if (day === currentDay + 1) return 'Demain';
      if (day > currentDay + 1) return 'Prochainement';
      if (day === currentDay - 1) return 'Hier';
      if (day < currentDay - 1) return 'Hier';
    }
  }

  if (existingRelative && existingRelative.trim()) {
    const norm = existingRelative.trim().toLowerCase();
    if (norm === 'hier') return 'Hier';
    if (norm === 'demain') return 'Demain';
    if (norm === 'prochainement') return 'Prochainement';
    if (norm.includes("aujourd'hui") || norm.includes("aujourd’hui")) return "Aujourd'hui";
  }

  return "Aujourd'hui";
}

/**
 * Normalise une chaîne de date en format standard YYYY-MM-DD pour les requêtes API et comparaisons.
 */
export function normalizeDateForQuery(dateStr: string): string {
  if (!dateStr || dateStr === 'all' || dateStr === 'today' || dateStr === 'last7' || dateStr === 'upcoming7') return '';
  const clean = dateStr.trim();

  // Format ISO YYYY-MM-DD
  const isoMatch = clean.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // Format DD/MM/YYYY
  const slashMatch = clean.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    const d = slashMatch[1].padStart(2, '0');
    const m = slashMatch[2].padStart(2, '0');
    return `${slashMatch[3]}-${m}-${d}`;
  }

  // Format textuel français : ex "Vendredi 02 Octobre 2026", "2 Octobre 2026", etc.
  const lower = clean.toLowerCase();
  const months: Record<string, string> = {
    janv: '01', jan: '01',
    févr: '02', fevr: '02', fév: '02', fev: '02',
    mars: '03', mar: '03',
    avr: '04',
    mai: '05',
    juin: '06',
    juil: '07',
    août: '08', aout: '08',
    sept: '09', sep: '09',
    oct: '10',
    nov: '11',
    déc: '12', dec: '12',
  };

  let monthNum = '';
  for (const [prefix, num] of Object.entries(months)) {
    if (lower.includes(prefix)) {
      monthNum = num;
      break;
    }
  }

  if (monthNum) {
    const yearMatch = lower.match(/\b(202\d)\b/);
    const year = yearMatch ? yearMatch[1] : '2026';
    // Supprimer l'année pour ne pas confondre "2026" avec le jour "26"
    const withoutYear = lower.replace(/\b202\d\b/g, '');
    const dayMatch = withoutYear.match(/\b(0?[1-9]|[12]\d|3[01])\b/);
    if (dayMatch) {
      const day = dayMatch[1].padStart(2, '0');
      return `${year}-${monthNum}-${day}`;
    }
  }

  return clean;
}

/**
 * Extrait et retourne la date standardisée YYYY-MM-DD d'une réunion PMU.
 */
export function getMeetingIsoDate(m: { date?: string; dateRelative?: string }): string {
  if (!m) return getIvoryCoastDate(0);

  if (m.date) {
    const isoMatch = m.date.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch) return isoMatch[1];

    const norm = normalizeDateForQuery(m.date);
    if (norm && /^\d{4}-\d{2}-\d{2}$/.test(norm)) {
      return norm;
    }

    const lower = m.date.toLowerCase();
    const dayMatch = lower.match(/\b(\d{1,2})\b/);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1], 10);
      let monthNum = 10; // Octobre par défaut
      if (lower.includes('sept')) monthNum = 9;
      else if (lower.includes('oct')) monthNum = 10;
      else if (lower.includes('nov')) monthNum = 11;
      else if (lower.includes('dec') || lower.includes('déc')) monthNum = 12;
      else if (lower.includes('janv')) monthNum = 1;
      else if (lower.includes('févr') || lower.includes('fevr')) monthNum = 2;
      else if (lower.includes('mars')) monthNum = 3;
      else if (lower.includes('avr')) monthNum = 4;
      else if (lower.includes('mai')) monthNum = 5;
      else if (lower.includes('juin')) monthNum = 6;
      else if (lower.includes('juil')) monthNum = 7;
      else if (lower.includes('août') || lower.includes('aout')) monthNum = 8;

      let yearNum = 2026;
      const yearMatch = lower.match(/\b(202\d)\b/);
      if (yearMatch) yearNum = parseInt(yearMatch[1], 10);

      const mm = String(monthNum).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      return `${yearNum}-${mm}-${dd}`;
    }
  }

  if (m.dateRelative) {
    const rel = m.dateRelative.toLowerCase();
    if (rel.includes('hier')) return getIvoryCoastDate(-1);
    if (rel.includes('demain')) return getIvoryCoastDate(1);
    if (rel.includes("aujourd")) return getIvoryCoastDate(0);
    if (rel.includes('prochain')) return getIvoryCoastDate(2);
  }

  return getIvoryCoastDate(0);
}
