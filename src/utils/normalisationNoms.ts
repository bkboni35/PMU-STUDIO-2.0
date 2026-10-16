/**
 * MODULE DE NORMALISATION CANONIQUE ET DE RAPPROCHEMENT FLOU DES ENTITÉS
 * (Jockeys, Drivers, Entraîneurs)
 * 
 * Évite les erreurs d'encodage et les catégories inconnues lors de la prédiction Scikit-learn / CatBoost
 */

export interface PersonneCanonicalInfo {
  id: string; // ex: "JOCKEY_0001"
  nom_normalise: string; // ex: "A ORANI"
  nom_affiche: string; // ex: "A. Orani"
  source: 'REFERENTIEL' | 'CORRESPONDANCE_APPROXIMATIVE' | 'NON_RESOLU';
  confiance: number; // 0.0 à 1.0
  alias_detecte?: string;
  action_requise?: 'AUCUNE' | 'VALIDATION_MANUELLE_REQUISE';
}

export interface ReferentielEntry {
  id: string;
  nom_affiche: string;
  aliases: string[];
}

export interface ReferentielPersonnes {
  jockeys: Record<string, ReferentielEntry>;
  drivers: Record<string, ReferentielEntry>;
  entraineurs: Record<string, ReferentielEntry>;
}

/**
 * Supprime les accents et diacritiques (NFD Unicode Normalization)
 */
export function enleverAccents(texte: string): string {
  if (!texte) return '';
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalise un nom de jockey / driver / entraîneur en chaîne canonique majuscule sans ponctuation
 * Ex: "A. Orani" -> "A ORANI", "A.ORANI" -> "A ORANI", "Mlle M. Vélon" -> "MLLE M VELON"
 */
export function normaliserNom(nom?: string | null): string {
  if (!nom || !String(nom).trim()) {
    return 'INCONNU';
  }

  let str = String(nom).trim().toUpperCase();
  str = enleverAccents(str);

  // Remplacement de la ponctuation par des espaces
  str = str.replace(/[-.']/g, ' ');

  // Suppression des caractères non-alphanumériques
  str = str.replace(/[^A-Z0-9 ]/g, ' ');

  // Condensation des espaces multiples
  str = str.replace(/\s+/g, ' ').trim();

  return str || 'INCONNU';
}

/**
 * Référentiel initial embarqué des entités hippiques canoniques (Jockeys, Drivers, Entraîneurs)
 */
export const DEFAULT_REFERENTIEL: ReferentielPersonnes = {
  jockeys: {
    'A ORANI': {
      id: 'JOCKEY_0001',
      nom_affiche: 'A. Orani',
      aliases: ['A ORANI', 'A. ORANI', 'A ORANI', 'A ORANI', 'ANTOINE ORANI', 'A. ORANI'],
    },
    'M GUYON': {
      id: 'JOCKEY_0002',
      nom_affiche: 'M. Guyon',
      aliases: ['M GUYON', 'M. GUYON', 'MAXIME GUYON', 'MAX GUYON'],
    },
    'C SOUMILLON': {
      id: 'JOCKEY_0003',
      nom_affiche: 'C. Soumillon',
      aliases: ['C SOUMILLON', 'C. SOUMILLON', 'CHRISTOPHE SOUMILLON'],
    },
    'MLLE M VELON': {
      id: 'JOCKEY_0004',
      nom_affiche: 'Mlle M. Vélon',
      aliases: ['MLLE M VELON', 'M VELON', 'MARIE VELON', 'MLLE MARIE VELON', 'M. VELON'],
    },
    'T PICCONE': {
      id: 'JOCKEY_0005',
      nom_affiche: 'T. Piccone',
      aliases: ['T PICCONE', 'T. PICCONE', 'TONY PICCONE'],
    },
    'S PASQUIER': {
      id: 'JOCKEY_0006',
      nom_affiche: 'S. Pasquier',
      aliases: ['S PASQUIER', 'S. PASQUIER', 'STEPHANE PASQUIER'],
    },
    'E RAFFIN': {
      id: 'JOCKEY_0007',
      nom_affiche: 'E. Raffin',
      aliases: ['E RAFFIN', 'E. RAFFIN', 'ERIC RAFFIN'],
    },
    'A ABRIVARD': {
      id: 'JOCKEY_0008',
      nom_affiche: 'A. Abrivard',
      aliases: ['A ABRIVARD', 'A. ABRIVARD', 'ALEXANDRE ABRIVARD'],
    },
  },
  drivers: {
    'E RAFFIN': {
      id: 'DRIVER_0001',
      nom_affiche: 'E. Raffin',
      aliases: ['E RAFFIN', 'E. RAFFIN', 'ERIC RAFFIN'],
    },
    'M MOTTIER': {
      id: 'DRIVER_0002',
      nom_affiche: 'M. Mottier',
      aliases: ['M MOTTIER', 'M. MOTTIER', 'MATHIEU MOTTIER'],
    },
  },
  entraineurs: {
    'FX WEISSMEIER': {
      id: 'ENT_0001',
      nom_affiche: 'F.-X. Weissmeier',
      aliases: ['FX WEISSMEIER', 'F X WEISSMEIER', 'FRANCOIS XAVIER WEISSMEIER'],
    },
    'P DECOUZ': {
      id: 'ENT_0002',
      nom_affiche: 'P. Decouz',
      aliases: ['P DECOUZ', 'P. DECOUZ', 'PHILIPPE DECOUZ'],
    },
    'JP GAUVIN': {
      id: 'ENT_0003',
      nom_affiche: 'J.-P. Gauvin',
      aliases: ['JP GAUVIN', 'J P GAUVIN', 'JEAN PIERRE GAUVIN'],
    },
    'C BOUTIN': {
      id: 'ENT_0004',
      nom_affiche: 'C. Boutin',
      aliases: ['C BOUTIN', 'C. BOUTIN', 'CEDRIC BOUTIN'],
    },
    'HA PANTALL': {
      id: 'ENT_0005',
      nom_affiche: 'H.-A. Pantall',
      aliases: ['HA PANTALL', 'HENRI ALEX PANTALL'],
    },
  },
};

/**
 * Calcul de la distance de Levenshtein entre deux chaînes (Similitude de chaîne)
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcule le score de similitude en pourcentage (0 à 100%) entre deux noms
 */
export function calculateSimilarityPercentage(str1: string, str2: string): number {
  const norm1 = normaliserNom(str1);
  const norm2 = normaliserNom(str2);
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 100;

  const dist = calculateLevenshteinDistance(norm1, norm2);
  return Math.round((1 - dist / maxLen) * 100);
}

/**
 * Résolution exacte d'un nom de personne dans le référentiel
 */
export function resoudrePersonne(
  nom?: string | null,
  categorie: 'jockeys' | 'drivers' | 'entraineurs' = 'jockeys',
  referentiel: ReferentielPersonnes = DEFAULT_REFERENTIEL
): PersonneCanonicalInfo {
  const nomNormalise = normaliserNom(nom);

  const entries = referentiel[categorie] || {};

  // 1. Recherche par clé exacte
  if (entries[nomNormalise]) {
    const entry = entries[nomNormalise];
    return {
      id: entry.id,
      nom_normalise: nomNormalise,
      nom_affiche: entry.nom_affiche,
      source: 'REFERENTIEL',
      confiance: 1.0,
      action_requise: 'AUCUNE',
    };
  }

  // 2. Recherche parmi tous les alias enregistrés
  for (const entry of Object.values(entries)) {
    for (const alias of entry.aliases) {
      if (normaliserNom(alias) === nomNormalise) {
        return {
          id: entry.id,
          nom_normalise: nomNormalise,
          nom_affiche: entry.nom_affiche,
          source: 'REFERENTIEL',
          confiance: 1.0,
          action_requise: 'AUCUNE',
        };
      }
    }
  }

  // Si non trouvé
  return {
    id: `${categorie.toUpperCase()}_INCONNU_${nomNormalise.replace(/\s+/g, '_')}`,
    nom_normalise: nomNormalise,
    nom_affiche: nom || 'Inconnu',
    source: 'NON_RESOLU',
    confiance: 0.0,
    action_requise: 'VALIDATION_MANUELLE_REQUISE',
  };
}

/**
 * Résolution approximative floue (Fuzzy Match / RapidFuzz) avec seuil de tolérance (ex: 88%)
 */
export function resoudrePersonneApproximative(
  nom?: string | null,
  categorie: 'jockeys' | 'drivers' | 'entraineurs' = 'jockeys',
  seuil: number = 88,
  referentiel: ReferentielPersonnes = DEFAULT_REFERENTIEL
): PersonneCanonicalInfo {
  // Tenter d'abord la résolution exacte
  const exactMatch = resoudrePersonne(nom, categorie, referentiel);
  if (exactMatch.source === 'REFERENTIEL') {
    return exactMatch;
  }

  const nomNormalise = exactMatch.nom_normalise;
  const entries = referentiel[categorie] || {};

  let bestMatchEntry: ReferentielEntry | null = null;
  let bestScore = 0;
  let bestAlias = '';

  // Parcourir tous les alias et clés pour trouver la meilleure similitude Levenshtein
  for (const entry of Object.values(entries)) {
    const allNames = [entry.nom_affiche, ...entry.aliases];
    for (const candidate of allNames) {
      const score = calculateSimilarityPercentage(nomNormalise, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatchEntry = entry;
        bestAlias = candidate;
      }
    }
  }

  if (bestMatchEntry && bestScore >= seuil) {
    return {
      id: bestMatchEntry.id,
      nom_normalise: nomNormalise,
      nom_affiche: bestMatchEntry.nom_affiche,
      source: 'CORRESPONDANCE_APPROXIMATIVE',
      confiance: Math.round((bestScore / 100) * 100) / 100,
      alias_detecte: bestAlias,
      action_requise: bestScore < 95 ? 'VALIDATION_MANUELLE_REQUISE' : 'AUCUNE',
    };
  }

  return exactMatch;
}
