import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import { CourseHippique } from '../types/turf';
import { computeV38Hierarchy } from './v38Helper';
import { exportCourseToPdf } from './pdfExport';

export function downloadPdfDocument(doc: jsPDF, rawFilename: string) {
  // Sanitize filename to ASCII alphanumeric characters, dashes and spaces/underscores
  const cleanFilename = rawFilename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-\s.]/g, '_')
    .replace(/_+/g, '_')
    .trim();

  const filename = cleanFilename.endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

  // Always generate a clean binary Blob for standard browser download
  try {
    const blob = doc.output('blob');
    if (typeof window !== 'undefined' && window.document) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch {}
      }, 8000);
      return;
    }
  } catch (blobErr) {
    console.warn('Blob generation/download failed, falling back to doc.save:', blobErr);
  }

  // Fallback to standard doc.save
  try {
    doc.save(filename);
  } catch (saveErr) {
    console.error('doc.save failed:', saveErr);
  }
}

/**
 * Exporte les 12 chevaux et délaissés au format CSV
 */
export const exportToCSV = (course: CourseHippique) => {
  const { selection12, selection11, basesSolides, chancesSerieuses, tocardsSpeculatifs, surprises, delaisses } = computeV38Hierarchy(course);
  const activeSelection = selection12 || selection11;

  // Tous les partants ordonnés : 12 sélectionnés d'abord, puis tous les délaissés par cote
  const allOrdered = [...activeSelection, ...delaisses];

  const data = allOrdered.map((p, idx) => {
    let role = 'Délaissé';
    if (idx < 2) role = 'Base Solide';
    else if (idx < 6) role = 'Chance Sérieuse';
    else if (idx < 9) role = 'Tocard Spéculatif';
    else if (idx < 12) role = 'Surprise';

    const coteStr = p.coteProbable ? `${p.coteProbable}/1` : (p.genyOdds ? `${p.genyOdds}/1` : '—');

    return {
      'Classement': idx + 1,
      'Numero': p.numero,
      'Nom': p.nom,
      'Cote Geny': coteStr,
      'Groupe': (p as any).group || '—',
      'Catégorie': role,
      'HippoScore': p.hippoScore ? `${p.hippoScore}/100` : '—',
      'Driver': p.driver || '—',
      'Entraineur': p.entraineur || '—',
      'Gains': p.gains ? `${p.gains} €` : '—',
      'Avis': p.avisExpert || '—',
    };
  });

  const cleanPrix = (course.prixNom || course.hippodrome || 'analyse')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_');
  const csvFilename = `PRONOS -PMU -STUDIO 2.0 - ${course.reunion}${course.course}_${cleanPrix}.csv`;

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', csvFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export PDF Officiel PMU-STUDIO 2.0 (Analyse Complète)
 */
export const exportV38HierarchyPDF = (course: CourseHippique) => {
  exportCourseToPdf(course);
};



/**
 * Export complet PDF (Analyse Complète)
 */
export const exportToPDF = (course: CourseHippique) => {
  exportCourseToPdf(course);
};
