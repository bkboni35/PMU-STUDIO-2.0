import { useState, useEffect } from 'react';
import { CourseHippique } from '../types/turf';
import { isCourseArrivalOfficiallyConfirmed } from '../utils/raceCountdown';

/**
 * Hook personnalisé réactif qui suit l'état de confirmation officielle de l'arrivée d'une course.
 * Garantit que les transitions de statut de course réévaluent réactivement le délai de polling.
 */
export function useArrivalConfirmationState(course: CourseHippique | null | undefined): boolean {
  const [isOfficiallyConfirmed, setIsOfficiallyConfirmed] = useState<boolean>(() =>
    isCourseArrivalOfficiallyConfirmed(course)
  );

  useEffect(() => {
    const freshStatus = isCourseArrivalOfficiallyConfirmed(course);
    setIsOfficiallyConfirmed(freshStatus);
  }, [
    course?.id,
    course?.statutCourse,
    (course as any)?.statutArrivee,
    course?.arriveeOfficielle,
    course?.arrivalAuditCompleted,
  ]);

  return isOfficiallyConfirmed;
}
