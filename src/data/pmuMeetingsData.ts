import { PmuMeeting } from '../types/turf';
import { getFriday02Meetings, PLR_FRIDAY_02_MEETINGS } from './plrFriday02Data';

/**
 * Programme des réunions PMU / Geny officielles du Vendredi 02 Octobre 2026 :
 * - Total : Réunions certifiées (Paris-Vincennes R1, Toulouse R2, Saint-Cloud R3)
 */
export function getCuratedPmuMeetings(): PmuMeeting[] {
  return getFriday02Meetings();
}

export { PLR_FRIDAY_02_MEETINGS };


