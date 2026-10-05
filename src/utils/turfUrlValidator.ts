import { TurfSource } from '../types/turf';

export interface UrlValidationResult {
  isValid: boolean;
  isProgramUrl?: boolean;
  isSearchQuery?: boolean;
  searchQuery?: string;
  sourceType?: TurfSource;
  error?: string;
  cleanedUrl?: string;
}

/**
 * Nettoie et extrait une URL cible si l'utilisateur a collé un lien de redirection Google ou autre
 */
function unwrapRedirectUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('google.') && (parsed.searchParams.has('url') || parsed.searchParams.has('q'))) {
      const target = parsed.searchParams.get('url') || parsed.searchParams.get('q');
      if (target && /^https?:\/\//i.test(target)) {
        return target;
      }
    }
  } catch {
    // Ne rien faire
  }
  return url;
}

/**
 * Valide et normalise les liens de courses hippiques (Geny, Paris-Turf, PMU, etc.)
 */
export function validateTurfUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      error: "Veuillez saisir ou coller un lien de course hippique (geny.com, genybet, paristurf.com...)."
    };
  }

  let cleaned = rawUrl.trim();

  // Supprimer d'éventuels guillemets ou chevrons ou syntaxe markdown [title](url)
  cleaned = cleaned.replace(/^[<"']+|[>"']+$/g, '');
  const markdownMatch = cleaned.match(/\]\((https?:\/\/[^\s)]+)\)/i);
  if (markdownMatch && markdownMatch[1]) {
    cleaned = markdownMatch[1];
  }

  // Dérouler les liens de redirection (Google Search / Mobile)
  cleaned = unwrapRedirectUrl(cleaned);

  // Vérification : s'il s'agit d'une recherche texte (ex: "Vincennes", "R1C1", "Prix de France", "Pouchin")
  const isExplicitUrl = /^https?:\/\//i.test(cleaned) || /\.(com|fr|ci|net|org|be|de|co\.uk|eu)\b/i.test(cleaned);
  if (!isExplicitUrl && cleaned.length >= 2) {
    return {
      isValid: true,
      isSearchQuery: true,
      searchQuery: cleaned,
      sourceType: 'autre',
      cleanedUrl: cleaned,
    };
  }

  // Ajouter https:// si omis pour les URLs
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    const host = parsed.hostname.toLowerCase();

    // 1. Détection élargie de tout l'écosystème Geny (geny.com, genycourses, genybet, etc.)
    const isGeny = 
      host.includes('geny.com') ||
      host.includes('genybet.fr') ||
      host.includes('genybet.com') ||
      host.includes('genycourses') ||
      host.includes('geny-courses') ||
      host.includes('geny.courses');

    // 2. Détection de Paris-Turf
    const isParisTurf = 
      host.includes('paristurf.com') ||
      host.includes('paris-turf.com') ||
      host.includes('paristurf.fr') ||
      host.includes('paris-turf.fr');

    const isProgram = 
      parsed.pathname.includes('/programme') || 
      parsed.pathname.includes('/calendrier') || 
      parsed.pathname.includes('/reunions') ||
      parsed.pathname.includes('/programme-courses');

    const isLonaCi = host.includes('lonacionline.ci');

    // 3. Détection d'autres sources turf reconnues (PMU, Equidia, ZEturf, etc.)
    const isOtherTurf =
      host.includes('pmu.fr') ||
      host.includes('zeturf') ||
      host.includes('turfomania') ||
      host.includes('zone-turf') ||
      host.includes('canalturf') ||
      host.includes('equidia') ||
      host.includes('letrot') ||
      host.includes('france-galop') ||
      host.includes('tierce-magazine');

    if (isGeny) {
      return {
        isValid: true,
        isProgramUrl: isProgram,
        sourceType: 'geny.com',
        cleanedUrl: parsed.toString()
      };
    }

    if (isParisTurf) {
      return {
        isValid: true,
        isProgramUrl: isProgram,
        sourceType: 'paristurf.com',
        cleanedUrl: parsed.toString()
      };
    }

    if (isLonaCi) {
      return {
        isValid: true,
        isProgramUrl: isProgram,
        sourceType: 'pmu.lonacionline.ci',
        cleanedUrl: parsed.toString()
      };
    }

    if (isOtherTurf) {
      return {
        isValid: true,
        isProgramUrl: isProgram,
        sourceType: 'autre',
        cleanedUrl: parsed.toString()
      };
    }

    // Si c'est un autre domaine valide avec protocole http/https
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return {
        isValid: true,
        isProgramUrl: isProgram,
        sourceType: 'autre',
        cleanedUrl: parsed.toString()
      };
    }

    return {
      isValid: false,
      error: `Domaine non reconnu ("${host}"). Veuillez saisir un lien hippique valide (ex: Geny ou Paris-Turf).`
    };
  } catch {
    return {
      isValid: false,
      error: "Format de lien invalide. Veuillez vérifier et coller l'adresse complète (ex: https://www.geny.com/...)."
    };
  }
}
