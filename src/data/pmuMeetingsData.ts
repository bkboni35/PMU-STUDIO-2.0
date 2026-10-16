import { PmuMeeting } from '../types/turf';
import { getSunday11Meetings, PMU_SUNDAY_11_MEETINGS, getMeetingsForDate, MULTI_DATE_MEETINGS_MAP, PMU_TOULOUSE_R5_MEETINGS, getToulouseR5Courses } from './pmuSunday11Data';
import { getFriday02Meetings, PLR_FRIDAY_02_MEETINGS } from './plrFriday02Data';

/**
 * Programme officiel des réunions PMU / Geny / LONACI du Dimanche 11 Octobre 2026 :
 * - Hippodrome d'Auteuil (R1) : Quinté+ Prix Montgomery (Groupe III)
 * - Nancy (R3) : Trot attelé & Plat
 * - Toulouse (R5) : Plat (6 Courses : C1, C2, C4, C5, C6, C8)
 * - Lyon-La Soie (R6) : Trot attelé
 */
export function getCuratedPmuMeetings(): PmuMeeting[] {
  return getSunday11Meetings();
}

export { 
  PMU_SUNDAY_11_MEETINGS, 
  getSunday11Meetings,
  getMeetingsForDate,
  MULTI_DATE_MEETINGS_MAP,
  PMU_TOULOUSE_R5_MEETINGS,
  getToulouseR5Courses,
  PLR_FRIDAY_02_MEETINGS,
  getFriday02Meetings 
};


