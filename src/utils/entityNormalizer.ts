/**
 * MODULE DE NORMALISATION, RAPPROCHEMENT FLOU ET RÉFÉRENTIEL CANONIQUE DES JOCKEYS, DRIVERS ET ENTRAÎNEURS
 * Empêche les erreurs d'encodage Scikit-learn / XGBoost et harmonise la data PMU / Geny.
 */

export interface CanonicalEntity {
  canonicalId: string; // ex: "JOCKEY_000142", "ENTRAINEUR_000803"
  type: 'JOCKEY' | 'DRIVER' | 'ENTRAINEUR';
  displayName: string; // ex: "A. Orani"
  normalizedName: string; // ex: "A ORANI"
  aliases: string[]; // ex: ["A ORANI", "A. ORANI", "A.ORANI", "ANTOINE ORANI"]
  
  // Statistiques historiques de carrière
  careerStats: {
    totalRaces: number;
    careerWins: number; // 1er place
    top3Count: number; // 1er, 2e, 3e
    top4Count: number; // 1er, 2e, 3e, 4e
    rawWinRate: number; // %
    rawTop4Rate: number; // %
    bayesianSmoothedWinRate: number; // % (lissé prior=12%, m=10)
    bayesianSmoothedTop4Rate: number; // % (lissé prior=35%, m=10)
  };
  
  lastUpdatedIso: string;
}

export interface EntityResolutionResult {
  rawInputName: string;
  normalizedInputName: string;
  matchedEntity: CanonicalEntity | null;
  canonicalId: string;
  displayName: string;
  matchType: 'EXACT' | 'ALIAS' | 'FUZZY' | 'NEW_UNKNOWN';
  confidenceScore: number; // 0 à 100
  similarityDistance?: number;
  bayesianWinRate: number;
  bayesianTop4Rate: number;
  handleUnknownFlag: string;
}

/**
 * Supprime les accents d'un texte
 */
export function removeAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalise un nom de jockey / driver / entraîneur
 * - Majuscules
 * - Suppression des accents
 * - Nettoyage de la ponctuation (points, tirets, slash)
 * - Suppression des préfixes de civilité (M., MME, DR, etc.)
 * - Normalisation des espaces
 */
export function normalizeEntityName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'INCONNU';

  let cleaned = name.trim().toUpperCase();
  cleaned = removeAccents(cleaned);

  // Supprimer les civilités et préfixes bruyants
  cleaned = cleaned.replace(/\b(MME|MLLE|MSTER|DR|PROF|M)\b\.?/gi, ' ');

  // Remplacer tirets, points, d'apostrophes et ponctuations par des espaces
  cleaned = cleaned.replace(/[\.\-\_\/'",;:\(\)]/g, ' ');

  // Remplacer les espaces multiples par un seul espace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned.length > 0 ? cleaned : 'INCONNU';
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
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
          matrix[i - 1][j] + 1      // suppression
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcule un score de similarité en % (0-100) basé sur Levenshtein
 */
export function calculateSimilarityScore(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  
  const distance = calculateLevenshteinDistance(str1, str2);
  const similarity = (1 - distance / maxLen) * 100;
  return Math.max(0, Math.min(100, Math.round(similarity * 10) / 10));
}

// ----------------------------------------------------------------------
// RÉFÉRENTIEL INITIAL EXEMPLE (CANONICAL ENTITY DATABASE)
// ----------------------------------------------------------------------
export const DEFAULT_CANONICAL_DATABASE: CanonicalEntity[] = [
  {
    canonicalId: 'JOCKEY_000123',
    type: 'JOCKEY',
    displayName: 'A. Orani',
    normalizedName: 'A ORANI',
    aliases: ['A ORANI', 'A. ORANI', 'A.ORANI', 'ANTOINE ORANI', 'A ORANI.'],
    careerStats: {
      totalRaces: 1240,
      careerWins: 186,
      top3Count: 452,
      top4Count: 682,
      rawWinRate: 15.0,
      rawTop4Rate: 55.0,
      bayesianSmoothedWinRate: 14.9,
      bayesianSmoothedTop4Rate: 54.8,
    },
    lastUpdatedIso: '2026-10-12T00:00:00Z',
  },
  {
    canonicalId: 'JOCKEY_000124',
    type: 'JOCKEY',
    displayName: 'M. Abrivard',
    normalizedName: 'M ABRIVARD',
    aliases: ['M ABRIVARD', 'M. ABRIVARD', 'M.ABRIVARD', 'MATTHIEU ABRIVARD'],
    careerStats: {
      totalRaces: 8900,
      careerWins: 1420,
      top3Count: 3310,
      top4Count: 4890,
      rawWinRate: 16.0,
      rawTop4Rate: 54.9,
      bayesianSmoothedWinRate: 15.9,
      bayesianSmoothedTop4Rate: 54.8,
    },
    lastUpdatedIso: '2026-10-12T00:00:00Z',
  },
  {
    canonicalId: 'JOCKEY_000125',
    type: 'JOCKEY',
    displayName: 'E. Raffin',
    normalizedName: 'E RAFFIN',
    aliases: ['E RAFFIN', 'E. RAFFIN', 'E.RAFFIN', 'ERIC RAFFIN'],
    careerStats: {
      totalRaces: 14200,
      careerWins: 2980,
      top3Count: 6100,
      top4Count: 8520,
      rawWinRate: 21.0,
      rawTop4Rate: 60.0,
      bayesianSmoothedWinRate: 20.9,
      bayesianSmoothedTop4Rate: 59.9,
    },
    lastUpdatedIso: '2026-10-12T00:00:00Z',
  },
  {
    canonicalId: 'JOCKEY_000126',
    type: 'JOCKEY',
    displayName: 'J.M. Bazire',
    normalizedName: 'J M BAZIRE',
    aliases: ['JM BAZIRE', 'J M BAZIRE', 'J.M. BAZIRE', 'JEAN MICHEL BAZIRE', 'J.M BAZIRE'],
    careerStats: {
      totalRaces: 18500,
      careerWins: 6540,
      top3Count: 11200,
      top4Count: 13800,
      rawWinRate: 35.3,
      rawTop4Rate: 74.6,
      bayesianSmoothedWinRate: 35.2,
      bayesianSmoothedTop4Rate: 74.4,
    },
    lastUpdatedIso: '2026-10-12T00:00:00Z',
  },
  {
    canonicalId: 'JOCKEY_000127',
    type: 'JOCKEY',
    displayName: 'C. Soumillon',
    normalizedName: 'C SOUMILLON',
    aliases: ['C SOUMILLON', 'C. SOUMILLON', 'CHRISTOPHE SOUMILLON'],
    careerStats: {
      totalRaces: 11800,
      careerWins: 2450,
      top3Count: 5200,
      top4Count: 7100,
      rawWinRate: 20.8,
      rawTop4Rate: 60.2,
      bayesianSmoothedWinRate: 20.7,
      bayesianSmoothedTop4Rate: 60.0,
    },
    lastUpdatedIso: '2026-10-12T00:00:00Z',
  },
  {
    canonicalId: 'ENTRAINEUR_000801',
    type: 'ENTRAINEUR',
    displayName: 'S. Guarato',
    normalizedName: 'S GUARATO',
    aliases: ['S GUARATO', 'S. GUARATO', 'SEBASTIEN GUARATO'],
    careerStats: {
      totalRaces: 6200,
      careerWins: 1180,
      top3Count: 2600,
      top4Count: 3800,
      rawWinRate: 19.0,
      rawTop4Rate: 61.3,
      bayesianSmoothedWinRate: 18.9,
      bayesianSmoothedTop4Rate: 61.1,
    },
    lastUpdatedIso: '2026-10-12T00:00:00Z',
  },
  {
    canonicalId: 'ENTRAINEUR_000802',
    type: 'ENTRAINEUR',
    displayName: 'P. Allaire',
    normalizedName: 'P ALLAIRE',
    aliases: ['P ALLAIRE', 'P. ALLAIRE', 'PHILIPPE ALLAIRE'],
    careerStats: {
      totalRaces: 4100,
      careerWins: 920,
      top3Count: 1950,
      top4Count: 2650,
      rawWinRate: 22.4,
      rawTop4Rate: 64.6,
      bayesianSmoothedWinRate: 22.2,
      bayesianSmoothedTop4Rate: 64.3,
    },
    lastUpdatedIso: '2026-10-12T00:00:00Z',
  },
];

/**
 * MOTEUR DE RAPPROCHEMENT FLOU ET D'IDENTIFICATION CANONIQUE
 */
export function resolveEntityName(
  rawName: string,
  type: 'JOCKEY' | 'DRIVER' | 'ENTRAINEUR' = 'JOCKEY',
  database: CanonicalEntity[] = DEFAULT_CANONICAL_DATABASE,
  minFuzzyThreshold: number = 75
): EntityResolutionResult {
  const normalized = normalizeEntityName(rawName);

  if (normalized === 'INCONNU') {
    return {
      rawInputName: rawName || '',
      normalizedInputName: 'INCONNU',
      matchedEntity: null,
      canonicalId: `${type}_UNKNOWN_0000`,
      displayName: 'Entourage Inconnu',
      matchType: 'NEW_UNKNOWN',
      confidenceScore: 0,
      bayesianWinRate: 12.0, // Prior PMU
      bayesianTop4Rate: 35.0, // Prior Top 4
      handleUnknownFlag: 'handle_unknown="infrequent_if_exist"',
    };
  }

  // 1. Recherche par alias exact ou nom normalisé exact dans le type demandé
  const filteredDb = database.filter(item => item.type === type || type === 'JOCKEY' && item.type === 'DRIVER' || type === 'DRIVER' && item.type === 'JOCKEY');

  for (const entity of filteredDb) {
    if (entity.normalizedName === normalized) {
      return {
        rawInputName: rawName,
        normalizedInputName: normalized,
        matchedEntity: entity,
        canonicalId: entity.canonicalId,
        displayName: entity.displayName,
        matchType: 'EXACT',
        confidenceScore: 100,
        similarityDistance: 0,
        bayesianWinRate: entity.careerStats.bayesianSmoothedWinRate,
        bayesianTop4Rate: entity.careerStats.bayesianSmoothedTop4Rate,
        handleUnknownFlag: 'handle_unknown="infrequent_if_exist"',
      };
    }

    if (entity.aliases.some(a => normalizeEntityName(a) === normalized)) {
      return {
        rawInputName: rawName,
        normalizedInputName: normalized,
        matchedEntity: entity,
        canonicalId: entity.canonicalId,
        displayName: entity.displayName,
        matchType: 'ALIAS',
        confidenceScore: 98,
        similarityDistance: 0,
        bayesianWinRate: entity.careerStats.bayesianSmoothedWinRate,
        bayesianTop4Rate: entity.careerStats.bayesianSmoothedTop4Rate,
        handleUnknownFlag: 'handle_unknown="infrequent_if_exist"',
      };
    }
  }

  // 2. Recherche par similarité floue (Levenshtein)
  let bestMatch: CanonicalEntity | null = null;
  let highestScore = 0;
  let minDistance = 999;

  for (const entity of filteredDb) {
    const scoreNorm = calculateSimilarityScore(normalized, entity.normalizedName);
    let scoreAliasMax = 0;

    for (const alias of entity.aliases) {
      const aliasNorm = normalizeEntityName(alias);
      const scoreA = calculateSimilarityScore(normalized, aliasNorm);
      if (scoreA > scoreAliasMax) scoreAliasMax = scoreA;
    }

    const currentBestScore = Math.max(scoreNorm, scoreAliasMax);

    if (currentBestScore > highestScore) {
      highestScore = currentBestScore;
      bestMatch = entity;
      minDistance = calculateLevenshteinDistance(normalized, entity.normalizedName);
    }
  }

  if (bestMatch && highestScore >= minFuzzyThreshold) {
    return {
      rawInputName: rawName,
      normalizedInputName: normalized,
      matchedEntity: bestMatch,
      canonicalId: bestMatch.canonicalId,
      displayName: bestMatch.displayName,
      matchType: 'FUZZY',
      confidenceScore: highestScore,
      similarityDistance: minDistance,
      bayesianWinRate: bestMatch.careerStats.bayesianSmoothedWinRate,
      bayesianTop4Rate: bestMatch.careerStats.bayesianSmoothedTop4Rate,
      handleUnknownFlag: 'handle_unknown="infrequent_if_exist"',
    };
  }

  // 3. Entity inédite non répertoriée -> Création canonique temporaire avec lissage Bayésien
  const pseudoHash = Math.abs(normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 90000 + 10000;
  const newCanonicalId = `${type}_NEW_${pseudoHash}`;

  return {
    rawInputName: rawName,
    normalizedInputName: normalized,
    matchedEntity: null,
    canonicalId: newCanonicalId,
    displayName: rawName,
    matchType: 'NEW_UNKNOWN',
    confidenceScore: 30,
    bayesianWinRate: 12.0, // Prior neutre
    bayesianTop4Rate: 35.0, // Prior Top 4 neutre
    handleUnknownFlag: 'handle_unknown="infrequent_if_exist"',
  };
}

/**
 * GÉNÉRATEUR DU CODE PYTHON SCIKIT-LEARN / TARGET ENCODER POUR DÉPLOIEMENT ROBUSTE
 */
export function generatePythonEncodingScript(): string {
  return `# ==============================================================================
# SCRIPT PYTHON ROBUSTE D'ENCODAGE DES JOCKEYS, DRIVERS ET ENTRAÎNEURS
# Évite les crashs de production causés par des noms inédits ou mal orthographiés
# ==============================================================================

import pandas as pd
import numpy as np
import unicodedata
import re
from sklearn.preprocessing import OneHotEncoder, TargetEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

def normaliser_nom(nom: str) -> str:
    """Normalise un nom : majuscules, suppression d'accents et ponctuations."""
    if not nom or pd.isna(nom):
        return "INCONNU"
    
    # Suppression des accents
    texte = unicodedata.normalize('NFD', str(nom))
    texte = "".join(c for c in texte if unicodedata.category(c) != 'Mn')
    
    # Majuscules
    texte = texte.upper().strip()
    
    # Supprimer civilités
    texte = re.sub(r'\\b(MME|MLLE|MSTER|DR|PROF|M)\\b\\.?', ' ', texte)
    
    # Remplacer ponctuations par espace
    texte = re.sub(r'[\\.\\-\\_\\/'",;:\\(\\)]', ' ', texte)
    
    # Espaces multiples
    texte = re.sub(r'\\s+', ' ', texte).strip()
    return texte if texte else "INCONNU"

# 1. Exemple de DataFrame de courses PMU
data = pd.DataFrame({
    'jockey_brut': ['A. Orani', 'A ORANI', 'Antoine Orani', 'E. Raffin', 'Inconnu Test', None],
    'entraineur_brut': ['S. Guarato', 'S GUARATO', 'P. Allaire', 'P. Allaire', 'Nouveau Coach', 'S. Guarato'],
    'victoire_cible': [1, 0, 1, 1, 0, 0]
})

# 2. Application de la normalisation métier
data['jockey_clean'] = data['jockey_brut'].apply(normaliser_nom)
data['entraineur_clean'] = data['entraineur_brut'].apply(normaliser_nom)

print("--- DataFrame Normalisé ---")
print(data[['jockey_brut', 'jockey_clean', 'entraineur_clean']])

# 3. Encoder Scikit-learn configuré avec handle_unknown='infrequent_if_exist'
#    Cela évite d'échouer sur des jockeys rares ou nouveaux lors du predict()
ohe_encoder = OneHotEncoder(
    handle_unknown='infrequent_if_exist',
    min_frequency=2,
    sparse_output=False
)

# Alternative : TargetEncoder pour garder 1 seule colonne numérique lissée
target_encoder = TargetEncoder(
    smooth="auto",
    cv=5,
    random_state=42
)

# 4. Pipeline complet ColumnTransformer
preprocessor = ColumnTransformer(
    transformers=[
        ('jockey_ohe', ohe_encoder, ['jockey_clean']),
        ('entraineur_target', target_encoder, ['entraineur_clean'])
    ],
    remainder='passthrough'
)

# Ajustement sur les données d'entraînement
preprocessor.fit(data[['jockey_clean', 'entraineur_clean']], data['victoire_cible'])

print("\\n✓ Pipeline Scikit-learn entraîné avec succès !")
print("✓ Les jockeys/entraîneurs inédits seront automatiquement mappés vers le cluster 'infrequent'.")
`;
}
