import { Partant, CourseHippique } from '../types/turf';
import { getHorseGenyOdds } from './v38Helper';

export type HorseBadgeCategory = 'favoris' | 'outsiders' | 'tocards' | 'surprises';

export interface HorseBadgeStyle {
  category: HorseBadgeCategory;
  scoreX: number;
  cote: number;
  scoreFactor: number; // 0 (faible X) à 1 (fort X)
  background: string;
  borderColor: string;
  boxShadow: string;
  textColor: string;
  glowColor: string;
  badgeLabel: string;
}

// Convertisseur hex to RGB et interpolation linéaire de couleurs
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lerpColor(hexA: string, hexB: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const cA = hexToRgb(hexA);
  const cB = hexToRgb(hexB);
  return rgbToHex(
    cA.r + (cB.r - cA.r) * clampedT,
    cA.g + (cB.g - cA.g) * clampedT,
    cA.b + (cB.b - cA.b) * clampedT
  );
}

/**
 * Calcule dynamiquement le style de badge pour un cheval avec :
 * - Dégradés progressifs linéaires (linear-gradient) modulés par Score X
 * - Contour net, relief 3D biseauté et ombres précises (sans flou baveux autour des numéros)
 */
export function getHorseBadgeTheme(
  num: number,
  course?: CourseHippique,
  groupHint: string = '',
  customScoreX?: number,
  customCote?: number
): HorseBadgeStyle {
  const p = course?.partants?.find((partant) => Number(partant.numero) === num);
  const cote = customCote !== undefined ? customCote : (p ? getHorseGenyOdds(p) : 15);
  const scoreX = customScoreX !== undefined ? customScoreX : ((73 + num) - cote);

  // Détermination de la plage de Score X dans la course pour un contraste relatif net
  let minRaceScoreX = 25;
  let maxRaceScoreX = 80;

  if (course?.partants && course.partants.length > 0) {
    const validScores = course.partants
      .filter((partant) => !partant.estNonPartant && partant.statut !== 'Non-partant')
      .map((partant) => {
        const n = Number(partant.numero);
        const c = getHorseGenyOdds(partant);
        return (73 + n) - c;
      });
    if (validScores.length > 0) {
      minRaceScoreX = Math.min(...validScores);
      maxRaceScoreX = Math.max(...validScores);
    }
  }

  // Calcul du facteur normalisé t entre 0.0 (X très faible) et 1.0 (X très élevé)
  const scoreSpan = Math.max(10, maxRaceScoreX - minRaceScoreX);
  const relativeFactor = Math.max(0, Math.min(1, (scoreX - minRaceScoreX) / scoreSpan));
  const absoluteFactor = Math.max(0, Math.min(1, (scoreX - 25) / 55));
  
  const t = Math.max(0, Math.min(1, relativeFactor * 0.65 + absoluteFactor * 0.35));

  // Détermination de la catégorie
  const lowerHint = (groupHint || '').toLowerCase();
  let category: HorseBadgeCategory = 'outsiders';

  if (lowerHint.includes('favori') || lowerHint.includes('059669')) {
    category = 'favoris';
  } else if (lowerHint.includes('outsider') || lowerHint.includes('f59e0b')) {
    category = 'outsiders';
  } else if (lowerHint.includes('tocard') || lowerHint.includes('ea580c')) {
    category = 'tocards';
  } else if (lowerHint.includes('surprise') || lowerHint.includes('dc2626')) {
    category = 'surprises';
  } else if (cote <= 5.5) {
    category = 'favoris';
  } else if (cote <= 15.0) {
    category = 'outsiders';
  } else if (cote <= 32.0) {
    category = 'tocards';
  } else {
    category = 'surprises';
  }

  let background = '';
  let borderColor = '';
  let boxShadow = '';
  let textColor = 'text-white';
  let glowColor = '';
  let badgeLabel = 'OUTSIDER';

  switch (category) {
    // 🥇 Favoris : Dégradé émeraude intense (#059669)
    case 'favoris': {
      badgeLabel = 'FAVORI';
      const c1 = lerpColor('#022c22', '#064e3b', t);
      const c2 = lerpColor('#064e3b', '#059669', t);
      const c3 = lerpColor('#059669', '#10b981', t);
      const c4 = lerpColor('#10b981', '#34d399', t);
      const c5 = lerpColor('#34d399', '#6ee7b7', t);

      background = `linear-gradient(135deg, ${c1} 0%, ${c2} 24%, ${c3} 52%, ${c4} 82%, ${c5} 100%)`;
      borderColor = lerpColor('#059669', '#6ee7b7', Math.pow(t, 0.8));
      
      const bevelAlpha = (0.35 + 0.4 * t).toFixed(2);
      boxShadow = `inset 0 1px 0.5px rgba(255, 255, 255, ${bevelAlpha}), inset 0 -1px 1px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)`;
      glowColor = '#34d399';
      textColor = 'text-white';
      break;
    }

    // 🥈 Outsiders : Dégradé ambre progressif (#f59e0b)
    case 'outsiders': {
      badgeLabel = 'OUTSIDER';
      const c1 = lerpColor('#451a03', '#78350f', t);
      const c2 = lerpColor('#78350f', '#b45309', t);
      const c3 = lerpColor('#b45309', '#f59e0b', t);
      const c4 = lerpColor('#f59e0b', '#fbbf24', t);
      const c5 = lerpColor('#fbbf24', '#fde047', t);

      background = `linear-gradient(135deg, ${c1} 0%, ${c2} 22%, ${c3} 50%, ${c4} 80%, ${c5} 100%)`;
      borderColor = lerpColor('#b45309', '#fef08a', Math.pow(t, 0.8));

      const bevelAlpha = (0.35 + 0.4 * t).toFixed(2);
      boxShadow = `inset 0 1px 0.5px rgba(255, 255, 255, ${bevelAlpha}), inset 0 -1px 1px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)`;
      glowColor = '#f59e0b';
      textColor = t > 0.65 ? 'text-slate-950 font-black' : 'text-white';
      break;
    }

    // 🥉 Tocards : Dégradé orange nuancé (#ea580c)
    case 'tocards': {
      badgeLabel = 'TOCARD';
      const c1 = lerpColor('#431407', '#7c2d12', t);
      const c2 = lerpColor('#7c2d12', '#c2410c', t);
      const c3 = lerpColor('#9a3412', '#ea580c', t);
      const c4 = lerpColor('#ea580c', '#f97316', t);
      const c5 = lerpColor('#f97316', '#fdba74', t);

      background = `linear-gradient(135deg, ${c1} 0%, ${c2} 22%, ${c3} 50%, ${c4} 80%, ${c5} 100%)`;
      borderColor = lerpColor('#9a3412', '#fed7aa', Math.pow(t, 0.8));

      const bevelAlpha = (0.35 + 0.4 * t).toFixed(2);
      boxShadow = `inset 0 1px 0.5px rgba(255, 255, 255, ${bevelAlpha}), inset 0 -1px 1px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)`;
      glowColor = '#ea580c';
      textColor = 'text-white';
      break;
    }

    // ⚡ Surprises : Dégradé rouge vif (#dc2626)
    case 'surprises': {
      badgeLabel = 'SURPRISE';
      const coteFactor = Math.max(0, Math.min(1, (cote - 8) / 40));
      const surpriseFactor = Math.max(0, Math.min(1, coteFactor * 0.5 + t * 0.5));

      const c1 = lerpColor('#450a0a', '#7f1d1d', surpriseFactor);
      const c2 = lerpColor('#7f1d1d', '#991b1b', surpriseFactor);
      const c3 = lerpColor('#991b1b', '#dc2626', surpriseFactor);
      const c4 = lerpColor('#dc2626', '#ef4444', surpriseFactor);
      const c5 = lerpColor('#ef4444', '#fca5a5', surpriseFactor);

      background = `linear-gradient(135deg, ${c1} 0%, ${c2} 20%, ${c3} 48%, ${c4} 78%, ${c5} 100%)`;
      borderColor = lerpColor('#991b1b', '#fee2e2', Math.pow(surpriseFactor, 0.75));

      const bevelAlpha = (0.35 + 0.4 * surpriseFactor).toFixed(2);
      boxShadow = `inset 0 1px 0.5px rgba(255, 255, 255, ${bevelAlpha}), inset 0 -1px 1px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)`;
      glowColor = '#dc2626';
      textColor = 'text-white';
      break;
    }
  }

  return {
    category,
    scoreX,
    cote,
    scoreFactor: t,
    background,
    borderColor,
    boxShadow,
    textColor,
    glowColor,
    badgeLabel,
  };
}
