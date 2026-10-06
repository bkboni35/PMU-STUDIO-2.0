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
 * Convertit une heure de départ officielle PMU / Geny France (ex: "18h58" ou "20h15")
 * en heure locale GMT Abidjan (Côte d'Ivoire / UTC+0).
 * - En heure d'été française (CEST = UTC+2, d'avril à fin octobre) : -2 heures.
 * - En heure d'hiver française (CET = UTC+1, de fin octobre à fin mars) : -1 heure.
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

    let shiftHours = 2; // -2h pour l'heure d'été CEST (France UTC+2 -> GMT Abidjan UTC+0)

    if (dateStr) {
      const lowerDate = dateStr.toLowerCase();
      if (
        lowerDate.includes('novembre') ||
        lowerDate.includes('décembre') ||
        lowerDate.includes('janvier') ||
        lowerDate.includes('février') ||
        lowerDate.includes('mars')
      ) {
        shiftHours = 1; // -1h pour l'heure d'hiver CET
      }
    }

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
 * Convertit et formate l'heure de départ en GMT Abidjan (ex: "16h58 GMT").
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
