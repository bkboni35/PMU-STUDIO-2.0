// Utilitaire de gestion des liens publics et QR Codes pour l'application mobile HippoAnalyse

export const PUBLIC_SHARED_URL = 'https://www.pmustudio20.com/';
export const PUBLIC_DEV_URL = 'https://www.pmustudio20.com/';

/**
 * Retourne le lien de l'application active en cours d'exécution
 */
export const getCurrentActiveUrl = (): string => {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin.replace(/\/$/, '') + '/';
    }
  } catch (e) {
    console.warn("Unable to parse origin", e);
  }
  return PUBLIC_DEV_URL;
};

/**
 * Retourne le lien utilisateur public pour la production / PWA mobile
 */
export const getUserAppUrl = (): string => {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin;
      // Ne jamais forcer '-pre-' si l'utilisateur est sur '-dev-', car le conteneur actif est sur '-dev-'
      return origin.replace(/\/$/, '') + '/';
    }
  } catch (e) {
    console.warn("Unable to parse origin, using fallback public URL", e);
  }
  return PUBLIC_DEV_URL;
};

/**
 * Retourne le lien de secours pré-production si configuré
 */
export const getSharedPublicUrl = (): string => {
  return PUBLIC_SHARED_URL;
};

/**
 * Retourne le lien de l'espace développeur
 */
export const getDevAppUrl = (): string => {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin;
      if (origin.includes('ais-dev-') || origin.includes('ais-pre-')) {
        return origin.replace('-pre-', '-dev-').replace(/\/$/, '') + '/';
      }
      return origin.replace(/\/$/, '') + '/';
    }
  } catch (e) {
    console.warn("Unable to parse origin, using fallback dev URL", e);
  }
  return PUBLIC_DEV_URL;
};

/**
 * Génère une URL de QR code haute résolution avec encodage universel
 */
export const getQrCodeImageUrl = (targetUrl: string, size = 300): string => {
  const cleanUrl = (targetUrl || PUBLIC_SHARED_URL).trim();
  return `https://quickchart.io/qr?size=${size}&text=${encodeURIComponent(cleanUrl)}&ecLevel=H&margin=1`;
};
