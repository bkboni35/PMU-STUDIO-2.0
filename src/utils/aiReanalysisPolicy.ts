/**
 * MODULES D'ANALYSE ET RÈGLE DE LA COTE DÉFINITIVE AU DÉPART
 * 
 * Conformément aux directives du protocole turfistique officiel :
 * Module                           | Cote utilisée pour la value
 * ---------------------------------|------------------------------
 * plat_speed_draw_v1               | Cote définitive au départ
 * trot_attele_rk_deferrage_v1        | Cote définitive au départ
 * trot_monte_weight_rk_jockey_v1   | Cote définitive au départ
 * obstacle_jump_stamina_going_v1   | Cote définitive au départ
 * 
 * Cette règle garantit que la détection de value repose sur le marché réel au moment
 * de la course, et non sur une cote obsolète publiée plusieurs heures plus tôt.
 */

export interface ModuleValueConfig {
  id: string;
  nom: string;
  discipline: 'PLAT' | 'TROT_ATTELE' | 'TROT_MONTE' | 'OBSTACLE';
  coteReference: 'Cote définitive au départ' | 'Cote live PMU finale';
  description: string;
  actif: boolean;
}

export const MODULES_VALUE_CONFIGURATIONS: ModuleValueConfig[] = [
  {
    id: 'plat_speed_draw_v1',
    nom: 'Plat Speed & Draw (Plat)',
    discipline: 'PLAT',
    coteReference: 'Cote définitive au départ',
    description: 'Modèle quantitatif plat combinant vitesse, corde, poids et cote définitive au départ.',
    actif: true,
  },
  {
    id: 'trot_attele_rk_deferrage_v1',
    nom: 'Trot Attelé RK & Déferrage (Trot Attelé)',
    discipline: 'TROT_ATTELE',
    coteReference: 'Cote définitive au départ',
    description: 'Modèle spécialisé trot attelé intégrant le classement RK, le déferrage et la cote définitive.',
    actif: true,
  },
  {
    id: 'trot_monte_weight_rk_jockey_v1',
    nom: 'Trot Monté Weight & Jockey (Trot Monté)',
    discipline: 'TROT_MONTE',
    coteReference: 'Cote définitive au départ',
    description: 'Modèle spécialisé trot monté évaluant la charge, le tandem jockey/cheval et la cote définitive.',
    actif: true,
  },
  {
    id: 'obstacle_jump_stamina_going_v1',
    nom: 'Obstacle Jump, Stamina & Going (Obstacle)',
    discipline: 'OBSTACLE',
    coteReference: 'Cote définitive au départ',
    description: 'Modèle haies, steeple et cross évaluant le saut, la tenue, le terrain et la cote définitive.',
    actif: true,
  },
];

/**
 * Valide qu'un module utilise bien la cote définitive au départ pour son calcul de Value Index.
 */
export function verifierCoteDefinitiveModule(moduleId: string): boolean {
  const mod = MODULES_VALUE_CONFIGURATIONS.find(m => m.id === moduleId);
  if (!mod) return false;
  return mod.coteReference === 'Cote définitive au départ';
}
