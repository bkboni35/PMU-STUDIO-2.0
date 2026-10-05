import { CourseHippique } from '../types/turf';
import { SAMPLE_RACES } from '../data/sampleRaces';
import { PLR_FRIDAY_02_MEETINGS } from '../data/plrFriday02Data';

export interface FavoriteCourseItem {
  id: string; // unique id (or sourceUrl/course id)
  savedAt: number; // timestamp
  course: CourseHippique;
  notes?: string;
}

export interface HistoryCourseItem {
  id: string;
  analyzedAt: number;
  analyzedAtFormatted?: string;
  course: CourseHippique;
}

export interface RecurringReunionStat {
  code: string; // e.g. 'R1', 'R2'
  label: string; // e.g. 'R1 (Paris-Vincennes, Auteuil)'
  count: number;
  percentage: number;
  hippodromes: string[];
  isDominant: boolean;
}

const FAVORITES_STORAGE_KEY = 'hippoanalyse_favorite_races_v1';
const HISTORY_STORAGE_KEY = 'hippoanalyse_history_races_v2';
const SMART_FAVORITES_PREF_KEY = 'hippoanalyse_smart_favorites_enabled_v1';

/**
 * Normalise le code d'une réunion (ex: "R1", "Réunion 1", "R1 - Vincennes" -> "R1")
 */
export function normalizeReunionCode(reunionStr?: string): string {
  if (!reunionStr) return 'R1';
  const clean = String(reunionStr).trim().toUpperCase();
  const match = clean.match(/R(\d+)/i) || clean.match(/R[ÉE]UNION\s*(\d+)/i);
  if (match && match[1]) {
    return `R${match[1]}`;
  }
  return clean.slice(0, 4) || 'R1';
}

/**
 * Détecte intelligemment les réunions (R1, R2, etc.) récurrentes de l'utilisateur
 * en croisant ses favoris et son historique d'analyses.
 */
export function detectRecurringReunions(
  favorites: FavoriteCourseItem[] = [],
  history: HistoryCourseItem[] = []
): {
  reunions: RecurringReunionStat[];
  dominantReunion: RecurringReunionStat | null;
  totalCoursesAnalyzed: number;
} {
  const counts: Record<string, { count: number; hippodromes: Set<string> }> = {};
  let total = 0;

  // Analyser les favoris (poids 2 car choix intentionnel)
  favorites.forEach((fav) => {
    const code = normalizeReunionCode(fav.course.reunion);
    if (!counts[code]) {
      counts[code] = { count: 0, hippodromes: new Set() };
    }
    counts[code].count += 2;
    total += 2;
    if (fav.course.hippodrome) {
      counts[code].hippodromes.add(fav.course.hippodrome);
    }
  });

  // Analyser l'historique (poids 1)
  history.forEach((hist) => {
    const code = normalizeReunionCode(hist.course.reunion);
    if (!counts[code]) {
      counts[code] = { count: 0, hippodromes: new Set() };
    }
    counts[code].count += 1;
    total += 1;
    if (hist.course.hippodrome) {
      counts[code].hippodromes.add(hist.course.hippodrome);
    }
  });

  if (total === 0) {
    // Fallback par défaut avec R1 dominante (PMU standard)
    const defaultR1: RecurringReunionStat = {
      code: 'R1',
      label: 'R1 (Réunion principale)',
      count: 1,
      percentage: 100,
      hippodromes: ['Paris-Vincennes', 'Auteuil'],
      isDominant: true,
    };
    return {
      reunions: [defaultR1],
      dominantReunion: defaultR1,
      totalCoursesAnalyzed: 0,
    };
  }

  const sortedKeys = Object.keys(counts).sort((a, b) => counts[b].count - counts[a].count);
  const results: RecurringReunionStat[] = sortedKeys.map((code, index) => {
    const data = counts[code];
    const percentage = Math.round((data.count / total) * 100);
    const hippos = Array.from(data.hippodromes);
    const hippoLabel = hippos.slice(0, 2).join(', ');
    return {
      code,
      label: hippoLabel ? `${code} (${hippoLabel})` : `${code}`,
      count: data.count,
      percentage,
      hippodromes: hippos,
      isDominant: index === 0 && data.count >= 2,
    };
  });

  return {
    reunions: results,
    dominantReunion: results.length > 0 ? results[0] : null,
    totalCoursesAnalyzed: total,
  };
}

/**
 * Récupère la préférence utilisateur pour l'activation des favoris intelligents
 */
export function getSmartFavoritesPreference(): boolean {
  try {
    const raw = localStorage.getItem(SMART_FAVORITES_PREF_KEY);
    if (raw === null) return true; // Activé par défaut pour faire découvrir la fonctionnalité
    return raw === 'true';
  } catch {
    return true;
  }
}

/**
 * Sauvegarde la préférence utilisateur pour les favoris intelligents
 */
export function setSmartFavoritesPreference(enabled: boolean): void {
  try {
    localStorage.setItem(SMART_FAVORITES_PREF_KEY, String(enabled));
  } catch (err) {
    console.error('Erreur sauvegarde préférence favoris intelligents:', err);
  }
}

function sanitizeStoredCourse(course: CourseHippique): CourseHippique {
  if (!course) return course;
  const rNum = String(course.reunion || '').replace(/\D/g, '');
  const cNum = String(course.course || course.courseNumero || '').replace(/\D/g, '');

  // 1. Vérifier dans SAMPLE_RACES
  for (const s of SAMPLE_RACES) {
    const sR = String(s.reunion || '').replace(/\D/g, '');
    const sC = String(s.course || s.courseNumero || '').replace(/\D/g, '');
    if ((s.id === course.id || (sR === rNum && sC === cNum)) && s.arriveeOfficielle) {
      return {
        ...course,
        arriveeOfficielle: s.arriveeOfficielle,
        statutCourse: 'Arrivée officielle',
      };
    }
  }

  // 2. Vérifier dans PLR_FRIDAY_02_MEETINGS
  for (const m of PLR_FRIDAY_02_MEETINGS) {
    const mR = String(m.reunion || '').replace(/\D/g, '');
    const mC = String(m.courseNumero || '').replace(/\D/g, '');
    if ((m.id === course.id || (mR === rNum && mC === cNum)) && m.arriveeOfficielle) {
      return {
        ...course,
        arriveeOfficielle: m.arriveeOfficielle,
        statutCourse: 'Arrivée officielle',
      };
    }
  }

  return course;
}

/**
 * Récupère la liste des courses favorites depuis le localStorage.
 */
export function getFavoriteRaces(): FavoriteCourseItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      const initialFavorites: FavoriteCourseItem[] = SAMPLE_RACES[0] ? [
        {
          id: SAMPLE_RACES[0].id || 'fav-argentan-r1c6',
          savedAt: Date.now() - 3600000 * 2,
          course: SAMPLE_RACES[0],
        },
      ] : [];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(initialFavorites));
      return initialFavorites;
    }
    const parsed = JSON.parse(raw);
    const items: FavoriteCourseItem[] = Array.isArray(parsed) ? parsed : [];
    return items
      .filter((item) => item && item.course)
      .map((item) => ({
        ...item,
        course: sanitizeStoredCourse(item.course),
      }));
  } catch (err) {
    console.error('Erreur lecture favoris localStorage:', err);
    return [];
  }
}

/**
 * Sauvegarde ou retire une course des favoris
 */
export function toggleFavoriteRace(course: CourseHippique): {
  isFavorite: boolean;
  favorites: FavoriteCourseItem[];
} {
  const current = getFavoriteRaces();
  const existsIndex = current.findIndex(
    (item) => item && item.course && (item.course.id === course.id || item.course.sourceUrl === course.sourceUrl)
  );

  let updated: FavoriteCourseItem[];
  let isFavorite: boolean;

  if (existsIndex >= 0) {
    updated = current.filter((_, idx) => idx !== existsIndex);
    isFavorite = false;
  } else {
    const newItem: FavoriteCourseItem = {
      id: course.id || `fav-${Date.now()}`,
      savedAt: Date.now(),
      course,
    };
    updated = [newItem, ...current];
    isFavorite = true;
  }

  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erreur sauvegarde favoris localStorage:', err);
  }

  return { isFavorite, favorites: updated };
}

/**
 * Vérifie si une course est dans les favoris
 */
export function isCourseFavorite(course: CourseHippique): boolean {
  if (!course) return false;
  const current = getFavoriteRaces();
  return current.some(
    (item) => item && item.course && (item.course.id === course.id || item.course.sourceUrl === course.sourceUrl)
  );
}

/**
 * Supprime un favori spécifique
 */
export function removeFavoriteRace(courseIdOrUrl: string): FavoriteCourseItem[] {
  const current = getFavoriteRaces();
  const updated = current.filter(
    (item) => item && item.course && item.id !== courseIdOrUrl && item.course.id !== courseIdOrUrl && item.course.sourceUrl !== courseIdOrUrl
  );
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erreur suppression favori:', err);
  }
  return updated;
}

/**
 * Enregistre une course dans l'historique des analyses
 */
export function saveRaceToHistory(course: CourseHippique): HistoryCourseItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    let history: HistoryCourseItem[] = raw ? JSON.parse(raw) : [];
    
    // Dédupliquer par URL ou id
    history = history.filter(
      (item) => item.course.id !== course.id && item.course.sourceUrl !== course.sourceUrl
    );

    const newItem: HistoryCourseItem = {
      id: course.id || `hist-${Date.now()}`,
      analyzedAt: Date.now(),
      course,
    };

    const updated = [newItem, ...history].slice(0, 50); // Garder jusqu'à 50 courses
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Erreur sauvegarde historique localStorage:', err);
    return [];
  }
}

/**
 * Récupère l'historique complet des courses analysées
 */
export function getRaceHistory(): HistoryCourseItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    let items: HistoryCourseItem[];

    if (!raw) {
      // Si vide, pré-remplir avec les courses modèles disponibles pour l'utilisateur
      items = SAMPLE_RACES.map((race, idx) => ({
        id: race.id,
        analyzedAt: Date.now() - (idx + 1) * 3600000,
        course: race,
      }));
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
      } catch {}
    } else {
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed) ? parsed : [];
    }

    const itemsToReturn = items.map((item) => ({
      ...item,
      course: sanitizeStoredCourse(item.course),
    }));

    return itemsToReturn;
  } catch {
    return [];
  }
}

/**
 * Supprime une course spécifique de l'historique
 */
export function removeRaceFromHistory(idOrUrl: string): HistoryCourseItem[] {
  try {
    const current = getRaceHistory();
    const updated = current.filter(
      (item) => item.id !== idOrUrl && item.course.id !== idOrUrl && item.course.sourceUrl !== idOrUrl
    );
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Erreur suppression course historique:', err);
    return [];
  }
}

/**
 * Supprime l'ensemble des courses de l'historique
 */
export function clearAllRaceHistory(): HistoryCourseItem[] {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Erreur vidage historique:', err);
  }
  return [];
}

/**
 * Met à jour l'arrivée officielle pour une course dans l'historique
 */
export function updateRaceArrivalInHistory(
  idOrUrl: string,
  arriveeOfficielle: string
): HistoryCourseItem[] {
  if (!idOrUrl || !idOrUrl.trim()) return getRaceHistory();
  try {
    const current = getRaceHistory();
    const updated = current.map((item) => {
      if (
        item.id === idOrUrl ||
        item.course.id === idOrUrl ||
        item.course.sourceUrl === idOrUrl
      ) {
        return {
          ...item,
          course: {
            ...item.course,
            arriveeOfficielle,
            statutCourse: arriveeOfficielle ? ('Arrivée officielle' as const) : item.course.statutCourse,
          },
        };
      }
      return item;
    });
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Erreur mise à jour arrivée dans l\'historique:', err);
    return getRaceHistory();
  }
}

/**
 * Met à jour une course entière (partants, arrivée, cotes, statut) dans l'historique
 */
export function updateCourseInHistory(
  idOrUrl: string,
  updatedCourse: Partial<CourseHippique>
): HistoryCourseItem[] {
  if (!idOrUrl || !idOrUrl.trim()) return getRaceHistory();
  try {
    const current = getRaceHistory();
    const updated = current.map((item) => {
      if (
        item.id === idOrUrl ||
        item.course.id === idOrUrl ||
        (item.course.sourceUrl && idOrUrl && item.course.sourceUrl === idOrUrl) ||
        (item.course.sourceUrl && updatedCourse.sourceUrl && item.course.sourceUrl === updatedCourse.sourceUrl)
      ) {
        const arrivalToKeep = updatedCourse.arriveeOfficielle || item.course.arriveeOfficielle;
        const statusToKeep = arrivalToKeep ? 'Arrivée officielle' : (updatedCourse.statutCourse || item.course.statutCourse);

        return {
          ...item,
          course: {
            ...item.course,
            ...updatedCourse,
            arriveeOfficielle: arrivalToKeep,
            statutCourse: statusToKeep,
          },
        };
      }
      return item;
    });
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Erreur mise à jour globale de la course dans l\'historique:', err);
    return getRaceHistory();
  }
}

/**
 * Purge automatiquement les courses passées de l'historique
 * (courses antérieures à aujourd'hui ou terminées avec arrivée depuis plus de 24h)
 */
export function purgePastRacesFromHistory(): { updated: HistoryCourseItem[]; purgedCount: number } {
  try {
    const current = getRaceHistory();
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];

    const updated = current.filter((item) => {
      // 1. Si la date de la course est précisée et antérieure à aujourd'hui
      if (item.course.date) {
        const match = item.course.date.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const iso = `${match[1]}-${match[2]}-${match[3]}`;
          if (iso < todayISO) return false;
        }
      }
      // 2. Si arrivée officielle et analysée depuis plus de 24h
      if (item.course.arriveeOfficielle && item.analyzedAt && (Date.now() - item.analyzedAt > 24 * 3600 * 1000)) {
        return false;
      }
      return true;
    });

    const purgedCount = current.length - updated.length;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return { updated, purgedCount };
  } catch (err) {
    console.error('Erreur purge automatique historique:', err);
    return { updated: getRaceHistory(), purgedCount: 0 };
  }
}

/**
 * Purge complètement une course et son arrivée de toutes les mémoires et stockages de l'application
 * (Historique, Favoris, Calendrier, Cache d'arrivées, etc.)
 */
export function purgeRaceByKeywordsFromAllStorage(keywords: string[]): {
  historyPurged: number;
  favoritesPurged: number;
  calendarPurged: number;
} {
  const lowerKeywords = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);
  if (lowerKeywords.length === 0) return { historyPurged: 0, favoritesPurged: 0, calendarPurged: 0 };

  const matchesKeyword = (obj: any): boolean => {
    if (!obj) return false;
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    const lower = str.toLowerCase();
    return lowerKeywords.some(kw => lower.includes(kw));
  };

  let historyPurged = 0;
  let favoritesPurged = 0;
  let calendarPurged = 0;

  try {
    // 1. Purge de l'historique
    const rawHist = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (rawHist) {
      const parsed: HistoryCourseItem[] = JSON.parse(rawHist);
      if (Array.isArray(parsed)) {
        const kept = parsed.filter(item => !matchesKeyword(item));
        historyPurged = parsed.length - kept.length;
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(kept));
      }
    }
    const rawAltHist = localStorage.getItem('hippoanalyse_race_history');
    if (rawAltHist) {
      const parsed = JSON.parse(rawAltHist);
      if (Array.isArray(parsed)) {
        const kept = parsed.filter(item => !matchesKeyword(item));
        localStorage.setItem('hippoanalyse_race_history', JSON.stringify(kept));
      }
    }

    // 2. Purge des favoris
    const rawFavs = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (rawFavs) {
      const parsed: FavoriteCourseItem[] = JSON.parse(rawFavs);
      if (Array.isArray(parsed)) {
        const kept = parsed.filter(item => !matchesKeyword(item));
        favoritesPurged = parsed.length - kept.length;
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(kept));
      }
    }

    // 3. Purge des données calendrier
    const rawCal = localStorage.getItem('hippo_calendar_data');
    if (rawCal) {
      const parsed = JSON.parse(rawCal);
      if (parsed && typeof parsed === 'object') {
        let changed = false;
        for (const dateKey of Object.keys(parsed)) {
          const day = parsed[dateKey];
          if (day && Array.isArray(day.meetings)) {
            const initialLen = day.meetings.length;
            day.meetings = day.meetings.filter((m: any) => !matchesKeyword(m));
            if (day.meetings.length !== initialLen) {
              changed = true;
              calendarPurged += (initialLen - day.meetings.length);
            }
          }
        }
        if (changed) {
          localStorage.setItem('hippo_calendar_data', JSON.stringify(parsed));
        }
      }
    }

    // 4. Purge des courses importées
    const rawImp = localStorage.getItem('hippo_imported_races');
    if (rawImp) {
      const parsed = JSON.parse(rawImp);
      if (Array.isArray(parsed)) {
        const kept = parsed.filter((m: any) => !matchesKeyword(m));
        localStorage.setItem('hippo_imported_races', JSON.stringify(kept));
      }
    }

    // 5. Purge du cache d'arrivées en direct
    const rawArrivals = localStorage.getItem('hippo_live_arrivals_cache');
    if (rawArrivals) {
      const parsed = JSON.parse(rawArrivals);
      if (parsed && typeof parsed === 'object') {
        let changed = false;
        for (const k of Object.keys(parsed)) {
          if (matchesKeyword(k) || matchesKeyword(parsed[k])) {
            delete parsed[k];
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem('hippo_live_arrivals_cache', JSON.stringify(parsed));
        }
      }
    }

    // 6. Purge de la dernière arrivée officielle enregistrée et caches de course active
    const rawLastArrival = localStorage.getItem('hippo_last_official_arrival_course');
    if (rawLastArrival && matchesKeyword(rawLastArrival)) {
      localStorage.removeItem('hippo_last_official_arrival_course');
    }

    // 7. Purge de toutes les autres clés localStorage / sessionStorage contenant les mots-clés ou l'arrivée
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        if (matchesKeyword(key) || matchesKeyword(val)) {
          localStorage.removeItem(key);
        }
      }
    }

    if (typeof sessionStorage !== 'undefined') {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key) {
          const val = sessionStorage.getItem(key);
          if (matchesKeyword(key) || matchesKeyword(val)) {
            sessionStorage.removeItem(key);
          }
        }
      }
    }
  } catch (err) {
    console.error('Erreur purge ciblée de la course en mémoire:', err);
  }

  return { historyPurged, favoritesPurged, calendarPurged };
}


