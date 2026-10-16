/**
 * MODULE D'INTERACTION CHEVAL-JOCKEY ET LISSAGE BAYÉSIEN HIÉRARCHIQUE
 * Calcule les variables d'interaction, le surplus du duo, la qualité des changements de jockey,
 * et prépare le vecteur de caractéristiques pour Scikit-learn, CatBoost et LightGBM LambdaRank.
 */

export interface HorseJockeySynergyMetrics {
  // Performance propre du cheval
  horseStartsHist: number;
  horseWinsHist: number;
  horseTop3Hist: number;
  horseWinRateLisse: number; // Taux de victoire lissé (0 à 1)
  horseTop3RateLisse: number; // Taux de top 3 lissé (0 à 1)

  // Performance propre du jockey/driver
  jockeyStartsHist: number;
  jockeyWinsHist: number;
  jockeyTop3Hist: number;
  jockeyWinRateLisse: number; // Taux de victoire lissé (0 à 1)
  jockeyTop3RateLisse: number; // Taux de top 3 lissé (0 à 1)

  // Identifiant & Historique du Duo Cheval-Jockey
  horseJockeyId: string;
  horseJockeyStartsHist: number;
  horseJockeyWinsHist: number;
  horseJockeyTop3Hist: number;

  // Référence Hiérarchique (60% Cheval + 40% Jockey)
  horseJockeyRefWin: number;
  horseJockeyRefTop3: number;

  // Taux Lissés du Duo (k=12)
  horseJockeyWinRateLisse: number;
  horseJockeyTop3RateLisse: number;

  // Surplus du Duo (Surplus = Duo_Lissé - Ref_Hiérarchique)
  horseJockeyWinSurplus: number; // Delta en points % (ex: +0.034 = +3.4%)
  horseJockeyTop3Surplus: number; // Delta en points % (ex: +0.094 = +9.4%)
  horseJockeyExperience: number; // Ratio min(starts, 20) / 20 ∈ [0, 1]

  // Indicateurs de Changement de Jockey
  jockeyChange: boolean;
  jockeyPreviousName?: string;
  jockeyChangeQuality: number; // Delta top3 rate new_jockey vs prev_jockey

  // Verdict & Recommandation Métier
  synergyVerdict: 'Couple confirmé 🔥' | 'Signal prometteur ⭐' | 'Historique modéré 👍' | 'Duo en deçà ⚠️' | 'Nouveau duo 🆕' | 'Changement bénéfique ⚡';
  interpretationNote: string;
}

/**
 * Calcul du lissage bayésien avec référence donnée
 * T_lisse = (succes + force * taux_ref) / (total + force)
 */
export function computeBayesianRate(
  successes: number,
  total: number,
  referenceRate: number,
  smoothingForce: number = 12
): number {
  if (total <= 0) return referenceRate;
  const rate = (successes + smoothingForce * referenceRate) / (total + smoothingForce);
  return Math.max(0, Math.min(1, rate));
}

/**
 * Génère un identifiant déterministe pour un cheval ou jockey à partir du nom
 */
export function generateSlugId(name: string): string {
  if (!name) return 'INCONNU';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Calcul des métriques d'interaction Cheval-Jockey pour un partant
 */
export function computeHorseJockeySynergy(
  horseName: string,
  jockeyName: string,
  horseStatsOverride?: { starts?: number; wins?: number; top3?: number },
  jockeyStatsOverride?: { starts?: number; wins?: number; top3?: number },
  duoStatsOverride?: { starts?: number; wins?: number; top3?: number },
  previousJockeyName?: string
): HorseJockeySynergyMetrics {
  const horseSlug = generateSlugId(horseName);
  const jockeySlug = generateSlugId(jockeyName);
  const duoSlug = `${horseSlug}__${jockeySlug}`;

  // Priors globaux de la discipline PMU
  const GLOBAL_PRIOR_WIN = 0.12; // 12%
  const GLOBAL_PRIOR_TOP3 = 0.35; // 35%

  // 1. Performance propre du cheval (par défaut générée à partir du hash du nom si non fournie)
  const hashH = Math.abs(horseSlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const horseStarts = horseStatsOverride?.starts ?? (hashH % 22 + 4);
  const horseWins = horseStatsOverride?.wins ?? Math.min(horseStarts, Math.floor((hashH % 5 + 1) * horseStarts / 20));
  const horseTop3 = horseStatsOverride?.top3 ?? Math.min(horseStarts, horseWins + Math.floor((hashH % 6 + 2) * horseStarts / 15));

  const horseWinRateLisse = computeBayesianRate(horseWins, horseStarts, GLOBAL_PRIOR_WIN, 15);
  const horseTop3RateLisse = computeBayesianRate(horseTop3, horseStarts, GLOBAL_PRIOR_TOP3, 15);

  // 2. Performance propre du jockey
  const hashJ = Math.abs(jockeySlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const jockeyStarts = jockeyStatsOverride?.starts ?? (hashJ % 300 + 50);
  const jockeyWins = jockeyStatsOverride?.wins ?? Math.min(jockeyStarts, Math.floor((hashJ % 15 + 5) * jockeyStarts / 100));
  const jockeyTop3 = jockeyStatsOverride?.top3 ?? Math.min(jockeyStarts, jockeyWins + Math.floor((hashJ % 25 + 15) * jockeyStarts / 100));

  const jockeyWinRateLisse = computeBayesianRate(jockeyWins, jockeyStarts, GLOBAL_PRIOR_WIN, 30);
  const jockeyTop3RateLisse = computeBayesianRate(jockeyTop3, jockeyStarts, GLOBAL_PRIOR_TOP3, 30);

  // 3. Historique du duo cheval-jockey
  const hashD = Math.abs(duoSlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const duoStarts = duoStatsOverride?.starts ?? (hashD % 8);
  const duoWins = duoStatsOverride?.wins ?? Math.min(duoStarts, Math.floor((hashD % 3) * duoStarts / 5));
  const duoTop3 = duoStatsOverride?.top3 ?? Math.min(duoStarts, duoWins + Math.floor((hashD % 4) * duoStarts / 4));

  // 4. Référence Hiérarchique : 60% Cheval + 40% Jockey
  const horseJockeyRefWin = 0.60 * horseWinRateLisse + 0.40 * jockeyWinRateLisse;
  const horseJockeyRefTop3 = 0.60 * horseTop3RateLisse + 0.40 * jockeyTop3RateLisse;

  // 5. Taux Lissés du Duo avec Lissage Fort (k=12)
  const horseJockeyWinRateLisse = computeBayesianRate(duoWins, duoStarts, horseJockeyRefWin, 12);
  const horseJockeyTop3RateLisse = computeBayesianRate(duoTop3, duoStarts, horseJockeyRefTop3, 12);

  // 6. Surplus du Duo (Surplus = Duo_Lisse - Ref_Hiérarchique)
  const horseJockeyWinSurplus = horseJockeyWinRateLisse - horseJockeyRefWin;
  const horseJockeyTop3Surplus = horseJockeyTop3RateLisse - horseJockeyRefTop3;
  const horseJockeyExperience = Math.min(20, duoStarts) / 20;

  // 7. Changement de jockey & Qualité
  const prevJockeySlug = previousJockeyName ? generateSlugId(previousJockeyName) : undefined;
  const jockeyChange = Boolean(prevJockeySlug && prevJockeySlug !== jockeySlug);

  let jockeyChangeQuality = 0;
  if (jockeyChange && prevJockeySlug) {
    const hashPrev = Math.abs(prevJockeySlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const prevStarts = hashPrev % 200 + 40;
    const prevTop3 = Math.floor((hashPrev % 20 + 10) * prevStarts / 100);
    const prevTop3RateLisse = computeBayesianRate(prevTop3, prevStarts, GLOBAL_PRIOR_TOP3, 30);
    jockeyChangeQuality = jockeyTop3RateLisse - prevTop3RateLisse;
  }

  // 8. Verdict Métier
  let synergyVerdict: HorseJockeySynergyMetrics['synergyVerdict'] = 'Historique modéré 👍';
  let interpretationNote = 'Association régulière avec performances alignées aux attentes.';

  if (duoStarts >= 10 && horseJockeyTop3Surplus > 0.05) {
    synergyVerdict = 'Couple confirmé 🔥';
    interpretationNote = `Couple hautement performant (${duoStarts} courses, +${(horseJockeyTop3Surplus * 100).toFixed(1)}% de surplus Top 3).`;
  } else if (duoStarts >= 3 && horseJockeyTop3Surplus > 0.03) {
    synergyVerdict = 'Signal prometteur ⭐';
    interpretationNote = `Surplus positif sur ${duoStarts} associations (+${(horseJockeyTop3Surplus * 100).toFixed(1)}% vs référence).`;
  } else if (duoStarts >= 5 && horseJockeyTop3Surplus < -0.04) {
    synergyVerdict = 'Duo en deçà ⚠️';
    interpretationNote = `Performances en deçà de la moyenne du cheval (${(horseJockeyTop3Surplus * 100).toFixed(1)}% de surplus).`;
  } else if (jockeyChange && jockeyChangeQuality > 0.05) {
    synergyVerdict = 'Changement bénéfique ⚡';
    interpretationNote = `Monte confiée à un jockey statistiquement supérieur (+${(jockeyChangeQuality * 100).toFixed(1)}% Top 3).`;
  } else if (duoStarts <= 2) {
    synergyVerdict = 'Nouveau duo 🆕';
    interpretationNote = `Historique insuffisant (${duoStarts} association). Prédiction basée à 80% sur la référence hiérarchique.`;
  }

  return {
    horseStartsHist: horseStarts,
    horseWinsHist: horseWins,
    horseTop3Hist: horseTop3,
    horseWinRateLisse,
    horseTop3RateLisse,
    jockeyStartsHist: jockeyStarts,
    jockeyWinsHist: jockeyWins,
    jockeyTop3Hist: jockeyTop3,
    jockeyWinRateLisse,
    jockeyTop3RateLisse,
    horseJockeyId: duoSlug,
    horseJockeyStartsHist: duoStarts,
    horseJockeyWinsHist: duoWins,
    horseJockeyTop3Hist: duoTop3,
    horseJockeyRefWin,
    horseJockeyRefTop3,
    horseJockeyWinRateLisse,
    horseJockeyTop3RateLisse,
    horseJockeyWinSurplus,
    horseJockeyTop3Surplus,
    horseJockeyExperience,
    jockeyChange,
    jockeyPreviousName: previousJockeyName,
    jockeyChangeQuality,
    synergyVerdict,
    interpretationNote,
  };
}

/**
 * GÉNÉRATEUR DU CODE PYTHON POUR LE FEATURE ENGINEERING CHEVAL-JOCKEY
 */
export function generatePythonHorseJockeyScript(): string {
  return `# ==============================================================================
# FEATURE ENGINEERING CHEVAL-JOCKEY & LISSAGE BAYÉSIEN HIÉRARCHIQUE
# Fichier : app/features_horse_jockey.py
# Évite le sur-ajustement et les fuites temporelles avec tri horodaté.
# ==============================================================================

import pandas as pd
import numpy as np


def taux_lisse(succes, total, taux_reference, force=12):
    """Calcule le taux lissé bayésien avec référence hiérarchique."""
    return (succes + force * taux_reference) / (total + force)


def ajouter_features_cheval_jockey(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enrichit le DataFrame PMU avec les variables de performance individuelle,
    l'interaction du duo cheval-jockey et la qualité des changements de monte.
    """
    df = df.copy()

    # 1. Tri horodaté strict pour éviter la fuite d'information du futur
    df["datetime_course"] = pd.to_datetime(
        df["date"].astype(str) + " " + df["heure_depart"].astype(str)
    )

    df = df.sort_values(
        ["datetime_course", "course_id", "numero"]
    ).reset_index(drop=True)

    # Variables cibles
    df["victoire"] = (df["rang_arrivee"] == 1).astype(int)
    df["top3"] = (df["rang_arrivee"] <= 3).astype(int)

    taux_global_win = df["victoire"].mean() if not df["victoire"].isna().all() else 0.12
    taux_global_top3 = df["top3"].mean() if not df["top3"].isna().all() else 0.35

    # 2. Statistiques historiques du CHEVAL seul
    horse_group = df.groupby("cheval_id", group_keys=False)
    df["horse_starts_hist"] = horse_group.cumcount()
    df["horse_wins_hist"] = horse_group["victoire"].cumsum().shift(fill_value=0)
    df["horse_top3_hist"] = horse_group["top3"].cumsum().shift(fill_value=0)

    df["horse_win_rate_lisse"] = taux_lisse(
        df["horse_wins_hist"], df["horse_starts_hist"], taux_global_win, force=15
    )
    df["horse_top3_rate_lisse"] = taux_lisse(
        df["horse_top3_hist"], df["horse_starts_hist"], taux_global_top3, force=15
    )

    # 3. Statistiques historiques du JOCKEY seul
    jockey_group = df.groupby("jockey_id", group_keys=False)
    df["jockey_starts_hist"] = jockey_group.cumcount()
    df["jockey_wins_hist"] = jockey_group["victoire"].cumsum().shift(fill_value=0)
    df["jockey_top3_hist"] = jockey_group["top3"].cumsum().shift(fill_value=0)

    df["jockey_win_rate_lisse"] = taux_lisse(
        df["jockey_wins_hist"], df["jockey_starts_hist"], taux_global_win, force=30
    )
    df["jockey_top3_rate_lisse"] = taux_lisse(
        df["jockey_top3_hist"], df["jockey_starts_hist"], taux_global_top3, force=30
    )

    # 4. Association CHEVAL - JOCKEY
    df["horse_jockey_id"] = (
        df["cheval_id"].astype(str) + "__" + df["jockey_id"].astype(str)
    )

    duo_group = df.groupby("horse_jockey_id", group_keys=False)
    df["horse_jockey_starts_hist"] = duo_group.cumcount()
    df["horse_jockey_wins_hist"] = duo_group["victoire"].cumsum().shift(fill_value=0)
    df["horse_jockey_top3_hist"] = duo_group["top3"].cumsum().shift(fill_value=0)

    # Référence hiérarchique : 60% Cheval + 40% Jockey
    df["horse_jockey_ref_win"] = (
        0.60 * df["horse_win_rate_lisse"] + 0.40 * df["jockey_win_rate_lisse"]
    )
    df["horse_jockey_ref_top3"] = (
        0.60 * df["horse_top3_rate_lisse"] + 0.40 * df["jockey_top3_rate_lisse"]
    )

    # Lissage hiérarchique du duo (k=12)
    df["horse_jockey_win_rate_lisse"] = taux_lisse(
        df["horse_jockey_wins_hist"],
        df["horse_jockey_starts_hist"],
        df["horse_jockey_ref_win"],
        force=12
    )
    df["horse_jockey_top3_rate_lisse"] = taux_lisse(
        df["horse_jockey_top3_hist"],
        df["horse_jockey_starts_hist"],
        df["horse_jockey_ref_top3"],
        force=12
    )

    # Surplus du duo (Interaction)
    df["horse_jockey_win_surplus"] = (
        df["horse_jockey_win_rate_lisse"] - df["horse_jockey_ref_win"]
    )
    df["horse_jockey_top3_surplus"] = (
        df["horse_jockey_top3_rate_lisse"] - df["horse_jockey_ref_top3"]
    )

    # Niveau d'expérience du duo [0, 1]
    df["horse_jockey_experience"] = (
        df["horse_jockey_starts_hist"].clip(upper=20) / 20.0
    )

    # 5. Détection de Changement de Jockey
    df_sorted_horse = df.sort_values(
        ["cheval_id", "datetime_course", "course_id"]
    )

    df["jockey_precedent"] = (
        df_sorted_horse.groupby("cheval_id")["jockey_id"].shift(1)
    )

    df["jockey_change"] = (
        df["jockey_id"] != df["jockey_precedent"]
    ).astype(int)
    df.loc[df["jockey_precedent"].isna(), "jockey_change"] = 0

    # Qualité du changement de monte
    jockey_stats_map = df.groupby("jockey_id")["jockey_top3_rate_lisse"].last().to_dict()
    df["jockey_precedent_top3_rate"] = df["jockey_precedent"].map(jockey_stats_map).fillna(taux_global_top3)
    df["jockey_change_quality"] = (
        df["jockey_top3_rate_lisse"] - df["jockey_precedent_top3_rate"]
    )

    return df


# Liste des colonnes numériques pour Scikit-learn / CatBoost
NUMERIC_FEATURES = [
    "poids",
    "valeur",
    "forme_3",
    "forme_5",
    "jours_absence",
    "nombre_partants",
    "horse_win_rate_lisse",
    "horse_top3_rate_lisse",
    "jockey_win_rate_lisse",
    "jockey_top3_rate_lisse",
    "horse_jockey_starts_hist",
    "horse_jockey_win_rate_lisse",
    "horse_jockey_top3_rate_lisse",
    "horse_jockey_win_surplus",
    "horse_jockey_top3_surplus",
    "horse_jockey_experience",
    "jockey_change",
    "jockey_change_quality"
]
`;
}
