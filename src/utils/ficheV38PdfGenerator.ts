import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CourseHippique } from '../types/turf';

/**
 * Génère le fichier PDF officiel « PRONOS - PMU - STUDIO 2.0 » à partir du rendu DOM exact,
 * garantissant que le design, les cartes sombres (#0b1329), les badges de couleurs et les données
 * sont 100% identiques au modèle affiché à l'écran.
 */
export async function generateFicheV38PdfFromDom(
  course: CourseHippique,
  action: 'download' | 'print' = 'download'
): Promise<void> {
  const page1El = document.getElementById('fiche-v38-page-1');
  const page2El = document.getElementById('fiche-v38-page-2');

  if (!page1El) {
    throw new Error("Conteneur fiche introuvable dans le DOM");
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = 210; // A4 mm
  const pdfHeight = 297; // A4 mm
  const margin = 8;
  const targetWidth = pdfWidth - margin * 2; // 194 mm

  // Capture Page 1 (Header + Cartouche + Sélection 5 groupes + Grille V38 Discipline)
  const canvas1 = await html2canvas(page1El, {
    scale: 2.2, // Résolution haute définition pour impression A4 nette
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
  const imgHeight1 = (canvas1.height * targetWidth) / canvas1.width;
  const clampedHeight1 = Math.min(imgHeight1, pdfHeight - margin * 2);

  pdf.addImage(imgData1, 'JPEG', margin, margin, targetWidth, clampedHeight1);

  // Capture Page 2 (Tableau Détaillé des Partants + Méthodologie) si présente
  if (page2El) {
    const canvas2 = await html2canvas(page2El, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });

    const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
    const imgHeight2 = (canvas2.height * targetWidth) / canvas2.width;
    const clampedHeight2 = Math.min(imgHeight2, pdfHeight - margin * 2);

    pdf.addPage();
    pdf.addImage(imgData2, 'JPEG', margin, margin, targetWidth, clampedHeight2);
  }

  const cleanHippodrome = (course.hippodrome || 'Course')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  const cleanDate = (course.date || 'date').replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `PRONOS_PMU_STUDIO_2_0_HIERARCHIE_V38_${course.reunion || 'R1'}${course.course || 'C1'}_${cleanHippodrome}_${cleanDate}.pdf`;

  if (action === 'print') {
    pdf.autoPrint();
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(blobUrl, '_blank');
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          } catch {}
        }, 60000);
      }, 300);
    };
  } else {
    pdf.save(filename);
  }
}
