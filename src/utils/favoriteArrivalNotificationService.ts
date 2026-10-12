import { CourseHippique } from '../types/turf';

export interface FavoriteArrivalAlert {
  id: string; // unique alert id (e.g. `alert-${courseId}-${timestamp}`)
  courseId: string;
  courseTitle: string;
  reunion: string;
  courseNumero: string;
  hippodrome: string;
  arriveeOfficielle: string;
  previousArrivee?: string;
  statutArrivee: 'officielle' | 'modifiee' | 'provisoire';
  isOfficialConfirmed: boolean;
  timestamp: number;
  read: boolean;
  course: CourseHippique;
}

const FAVORITES_ALERTS_STORAGE_KEY = 'hippo_favorite_arrival_alerts_v1';
const FAVORITES_NOTIFICATION_PREF_KEY = 'hippo_favorite_notifications_enabled_v1';

/**
 * Récupère les notifications d'arrivée stockées en localStorage
 */
export function getFavoriteArrivalAlerts(): FavoriteArrivalAlert[] {
  try {
    const raw = localStorage.getItem(FAVORITES_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erreur lecture alertes arrivées favoris:', err);
    return [];
  }
}

/**
 * Enregistre une nouvelle notification d'arrivée pour une course favorite
 */
export function addFavoriteArrivalAlert(
  alert: Omit<FavoriteArrivalAlert, 'id' | 'timestamp' | 'read'>
): { alert: FavoriteArrivalAlert; alerts: FavoriteArrivalAlert[] } {
  try {
    const current = getFavoriteArrivalAlerts();
    
    // Dédupliquer si une alerte identique existe déjà pour la même course et la même arrivée
    const duplicate = current.find(
      (a) =>
        (a.courseId === alert.courseId || (a.reunion === alert.reunion && a.courseNumero === alert.courseNumero)) &&
        a.arriveeOfficielle === alert.arriveeOfficielle &&
        a.statutArrivee === alert.statutArrivee
    );

    if (duplicate) {
      return { alert: duplicate, alerts: current };
    }

    const newAlert: FavoriteArrivalAlert = {
      ...alert,
      id: `alert-${alert.courseId || Date.now()}-${Date.now()}`,
      timestamp: Date.now(),
      read: false,
    };

    const updated = [newAlert, ...current].slice(0, 30); // Garder les 30 plus récentes
    localStorage.setItem(FAVORITES_ALERTS_STORAGE_KEY, JSON.stringify(updated));

    // Dispatcher un événement CustomEvent pour mise à jour réactive immédiate de l'UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hippo-favorite-arrival-alert', { detail: { newAlert, alerts: updated } })
      );
    }

    return { alert: newAlert, alerts: updated };
  } catch (err) {
    console.error('Erreur enregistrement alerte arrivée favori:', err);
    const fallbackAlert: FavoriteArrivalAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: Date.now(),
      read: false,
    };
    return { alert: fallbackAlert, alerts: [] };
  }
}

/**
 * Marque une ou toutes les alertes comme lues
 */
export function markFavoriteAlertAsRead(alertId?: string): FavoriteArrivalAlert[] {
  try {
    const current = getFavoriteArrivalAlerts();
    const updated = current.map((a) => {
      if (!alertId || a.id === alertId) {
        return { ...a, read: true };
      }
      return a;
    });
    localStorage.setItem(FAVORITES_ALERTS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hippo-favorite-arrival-alert', { detail: { alerts: updated } })
      );
    }
    return updated;
  } catch (err) {
    console.error('Erreur marquage alerte lue:', err);
    return [];
  }
}

/**
 * Supprime une alerte spécifique
 */
export function removeFavoriteArrivalAlert(alertId: string): FavoriteArrivalAlert[] {
  try {
    const current = getFavoriteArrivalAlerts();
    const updated = current.filter((a) => a.id !== alertId);
    localStorage.setItem(FAVORITES_ALERTS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hippo-favorite-arrival-alert', { detail: { alerts: updated } })
      );
    }
    return updated;
  } catch (err) {
    console.error('Erreur suppression alerte:', err);
    return [];
  }
}

/**
 * Vide toutes les alertes
 */
export function clearAllFavoriteArrivalAlerts(): void {
  try {
    localStorage.setItem(FAVORITES_ALERTS_STORAGE_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hippo-favorite-arrival-alert', { detail: { alerts: [] } })
      );
    }
  } catch (err) {
    console.error('Erreur vidage alertes:', err);
  }
}

/**
 * Préférences utilisateur pour les notifications d'arrivées des favoris
 */
export function getFavoriteNotificationsEnabled(): boolean {
  try {
    const val = localStorage.getItem(FAVORITES_NOTIFICATION_PREF_KEY);
    return val !== 'false'; // activé par défaut
  } catch {
    return true;
  }
}

export function setFavoriteNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(FAVORITES_NOTIFICATION_PREF_KEY, enabled ? 'true' : 'false');
  } catch {}
}
