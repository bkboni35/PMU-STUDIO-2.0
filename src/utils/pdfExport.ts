import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CourseHippique, Partant } from '../types/turf';
import { convertToUTC } from './timeConversion';
import { computePartantHippoScore, computeQuinteOrdres } from './geminiMultiModelEngine';
import { computeV38Hierarchy, computeDisciplineGrid, computeHorseSuccessProbabilities } from './v38Helper';
import { classerChevauxFormeEtPoints } from './turfCalculations';
import { downloadPdfDocument } from './exportUtils';
import { generateFicheV38PdfFromDom } from './ficheV38PdfGenerator';

/**
 * Exporte l'analyse complète de la course au format PDF structuré et soigné.
 */
export function exportCourseToPdf(course: CourseHippique): void {
  try {
    if (typeof document !== 'undefined') {
      generateFicheV38PdfFromDom(course, 'download').catch((err) => {
        console.warn('DOM PDF export failed, fallback to jsPDF:', err);
        fallbackCourseExport();
      });
      return;
    }
  } catch {}

  fallbackCourseExport();

  function fallbackCourseExport() {
    try {
      const doc = buildCoursePdfDoc(course);
      const cleanHippodrome = (course.hippodrome || 'Course')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      const cleanDate = (course.date || 'date').replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `PRONOS_PMU_STUDIO_2_0_HIERARCHIE_V38_${course.reunion || 'R1'}${course.course || 'C1'}_${cleanHippodrome}_${cleanDate}.pdf`;

      downloadPdfDocument(doc, filename);
    } catch (err) {
      console.error('Erreur génération PDF Course V38:', err);
    }
  }
}

function buildCoursePdfDoc(course: CourseHippique): jsPDF {
  try {
    const partantsCount = course.partants?.length || 0;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true,
      precision: 2,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let yPos = 12;

    // ==========================================
    // --- PAGE 1 : EN-TÊTE, INFOS & SYNTHÈSE ---
    // ==========================================

    // --- EN-TÊTE / HEADER ---
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 3, 3, 'F');

    // Écusson Logo Vectoriel PMU-STUDIO 2.0
    const logoX = margin + 5;
    const logoY = yPos + 3;
    
    // Double cercle concentrique Or/Sable
    doc.setDrawColor(245, 158, 11); // Or (amber-500)
    doc.setLineWidth(0.6);
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(logoX, logoY, 16, 16, 3, 3, 'FD');
    
    doc.setDrawColor(251, 191, 36); // Or brillant (amber-400)
    doc.setLineWidth(0.3);
    doc.circle(logoX + 8, logoY + 8, 5.5, 'S');
    
    // Symbole central Or 'P'
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('P', logoX + 8, logoY + 11.5, { align: 'center' });

    // Titre officiel de l'application : PMU-STUDIO 2.0
    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PMU-STUDIO 2.0', margin + 24, yPos + 9);

    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      'SYNTHÈSE EXCLUSIVE DU QUINTÉ+ & INDEX DE VALEUR',
      margin + 24,
      yPos + 15
    );

    // Date de génération à droite
    const now = new Date();
    const dateGen = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`Fiche imprimable - Générée le ${dateGen}`, pageWidth - margin - 4, yPos + 12, {
      align: 'right',
    });

    yPos += 25;

    // --- BANDEAU DATE DE LA COURSE & PARTANTS / NP (CENTRÉ EN GRAS) ---
    const dateCourseAffichee = (course.date && course.date.trim()) ? course.date.trim().toUpperCase() : dateGen.toUpperCase();
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`COURSE DU : ${dateCourseAffichee}`, pageWidth / 2, yPos + 2, { align: 'center' });

    // Ligne Partants et NP sur la même ligne en gras 12px
    const nonPartantsPage1 = (course.partants || []).filter(p => p.estNonPartant || p.statut === 'Non-partant').map(p => p.numero);
    const partantsTotalCount = course.partants?.length || 0;
    const partantsEtNpText = nonPartantsPage1.length > 0 
      ? `Partants : ${partantsTotalCount}   NP : ${nonPartantsPage1.join(', ')}` 
      : `Partants : ${partantsTotalCount}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(partantsEtNpText, pageWidth / 2, yPos + 7.5, { align: 'center' });

    yPos += 10;

    // --- CARTOUCHE DE LA COURSE ---
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 2, 2, 'FD');

    // Titre de l'épreuve
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const titreCourse = `${course.reunion} ${course.course} - ${course.titre}`;
    doc.text(titreCourse.slice(0, 65), margin + 4, yPos + 5.5);

    // Arrivée Officielle si disponible
    if (course.arriveeOfficielle) {
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.roundedRect(pageWidth - margin - 65, yPos + 1.5, 60, 6, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.text(`ARRIVÉE OFFICIELLE : ${course.arriveeOfficielle}`, pageWidth - margin - 35, yPos + 5.5, { align: 'center' });
    }

    // Caractéristiques de la course
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const infoLigne = `Hippodrome : ${course.hippodrome} | Discipline : ${course.discipline} | Distance : ${course.distance}m | Corde : ${course.corde} | Terrain : ${course.terrain || 'Bon terrain'}`;
    doc.text(infoLigne, margin + 4, yPos + 12.5);

    if (course.estQuinte) {
      doc.setFillColor(220, 38, 38); // red-600
      doc.roundedRect(pageWidth - margin - 30, yPos + 13, 26, 4.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('SUPPORT QUINTÉ+', pageWidth - margin - 17, yPos + 16, {
        align: 'center',
      });
    }

    yPos += 23;

    // --- SÉLECTION OFFICIELLE EN 12 CHEVAUX (3 GROUPES & COTE DU SITE GENY) ---
    const { poolG1, poolG2, poolG3, selection12, selection11, basesSolides, chancesSerieuses, favoris = basesSolides, outsiders = chancesSerieuses, tocardsSpeculatifs, surprises, delaisses } = computeV38Hierarchy(course);

    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 21, 2, 2, 'FD');

    doc.setTextColor(180, 83, 9); // amber-700
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('SÉLECTION OFFICIELLE DES 12 CHEVAUX (PAR COTE GENY) :', margin + 4, yPos + 5.5);

    doc.setFontSize(7.5);
    doc.text(`12 numéros uniques classés par cote croissante`, pageWidth - margin - 4, yPos + 5.5, {
      align: 'right',
    });

    // Affichage des numéros des 12 chevaux sous forme de badges
    const activeSel = selection12 || selection11;
    const selection = activeSel.map(p => p.numero);
    let startX = margin + 4;
    const badgeW = (pageWidth - margin * 2 - 8) / selection.length;
    selection.forEach((num, idx) => {
      if (idx <= 2) {
        doc.setFillColor(16, 185, 129); // emerald-500 (FAVORIS)
        doc.setDrawColor(6, 95, 70);
      } else if (idx <= 5) {
        doc.setFillColor(245, 158, 11); // amber-500 (OUTSIDERS)
        doc.setDrawColor(180, 83, 9);
      } else if (idx <= 8) {
        doc.setFillColor(249, 115, 22); // orange-500 (TOCARDS)
        doc.setDrawColor(194, 65, 12);
      } else {
        doc.setFillColor(168, 85, 247); // purple-500 (SURPRISES)
        doc.setDrawColor(126, 34, 206);
      }
      doc.roundedRect(startX, yPos + 8, badgeW - 1.5, 10, 1.5, 1.5, 'FD');

      // Numéro
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${num}`, startX + (badgeW - 1.5) / 2, yPos + 15, { align: 'center' });

      startX += badgeW;
    });

    yPos += 24;

    // --- DÉDUCTION DE L'ORDRE PROBABLE ET POSSIBLE DU QUINTÉ+ (MULTI-IA GEMINI) ---
    const ordresData = computeQuinteOrdres(course);
    const pdfProbable = course.synthese?.ordreProbable || ordresData.ordreProbable;
    const pdfPossible = course.synthese?.ordrePossible || ordresData.ordrePossible;

    const ordresY = yPos;
    const halfWidth = (pageWidth - margin * 2 - 3) / 2;

    // Titre de section Ordres
    doc.setFillColor(15, 23, 42); // slate-900
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, ordresY, pageWidth - margin * 2, 8, 2, 2, 'FD');
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DÉDUCTION DE L\'ORDRE DU QUINTÉ+ PAR CONSENSUS MULTI-IA GEMINI', margin + 4, ordresY + 5.5);

    // Bloc 1 : ORDRE PROBABLE (Top Consensus Sécurisé)
    const cardY = ordresY + 10;
    const cardH = 25;
    doc.setFillColor(6, 78, 59); // emerald-950/60
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, cardY, halfWidth, cardH, 2, 2, 'FD');

    doc.setTextColor(110, 231, 183); // emerald-300
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ORDRE PROBABLE (Top Consensus) : 1er-5e', margin + 3, cardY + 5);

    let capX = margin + 3;
    const capWidth = (halfWidth - 6) / 5;
    pdfProbable.forEach((num, idx) => {
      const p = course.partants?.find((pt) => pt.numero === num);
      const posText = idx === 0 ? '1er' : `${idx + 1}e`;
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.roundedRect(capX, cardY + 7, capWidth - 1, 13, 1.5, 1.5, 'F');
      
      doc.setTextColor(2, 44, 34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`${posText}`, capX + (capWidth - 1) / 2, cardY + 10, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${num}`, capX + (capWidth - 1) / 2, cardY + 16, { align: 'center' });
      
      doc.setTextColor(209, 250, 229);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(p ? p.nom.slice(0, 9) : `${num}`, capX + (capWidth - 1) / 2, cardY + 22, { align: 'center' });
      capX += capWidth;
    });

    // Bloc 2 : ORDRE POSSIBLE (Alternative Spéculative Gros Rapports)
    const card2X = margin + halfWidth + 3;
    doc.setFillColor(124, 45, 18); // orange-950/60
    doc.setDrawColor(249, 115, 22); // orange-500
    doc.setLineWidth(0.4);
    doc.roundedRect(card2X, cardY, halfWidth, cardH, 2, 2, 'FD');

    doc.setTextColor(253, 186, 116); // orange-300
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ORDRE POSSIBLE (Spéculatif) : 1er-5e', card2X + 3, cardY + 5);

    let cap2X = card2X + 3;
    pdfPossible.forEach((num, idx) => {
      const p = course.partants?.find((pt) => pt.numero === num);
      const posText = idx === 0 ? '1er' : `${idx + 1}e`;
      doc.setFillColor(249, 115, 22); // orange-500
      doc.roundedRect(cap2X, cardY + 7, capWidth - 1, 13, 1.5, 1.5, 'F');
      
      doc.setTextColor(67, 20, 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`${posText}`, cap2X + (capWidth - 1) / 2, cardY + 10, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${num}`, cap2X + (capWidth - 1) / 2, cardY + 16, { align: 'center' });
      
      doc.setTextColor(255, 237, 213);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(p ? p.nom.slice(0, 9) : `${num}`, cap2X + (capWidth - 1) / 2, cardY + 22, { align: 'center' });
      cap2X += capWidth;
    });

    yPos += 37;

    // --- PRONOSTICS OFFICIELS EN 4 CATÉGORIES (11 CHEVAUX CLASSÉS PAR COTE GENY) ---
    const pronosticsY = yPos;
    const pColWidth = (pageWidth - margin * 2) / 4;

    const pronosticsList = [
      { title: '1. FAVORIS', desc: '1er - 2e - 3e N°', content: favoris.map(p => p.numero).join(' · ') || '—' },
      { title: '2. OUTSIDERS', desc: '4e - 5e - 6e N°', content: outsiders.map(p => p.numero).join(' · ') || '—' },
      { title: '3. TOCARDS', desc: '7e - 8e - 9e N°', content: tocardsSpeculatifs.map(p => p.numero).join(' · ') || '—' },
      { title: '4. SURPRISES', desc: `${surprises.length} N° (10e-11e + délaissés)`, content: surprises.map(p => p.numero).join(' · ') || '—' },
    ];

    pronosticsList.forEach((pro, idx) => {
      const colX = margin + idx * pColWidth;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.roundedRect(colX + 1, pronosticsY, pColWidth - 2, 18, 2, 2, 'FD');
      
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(pro.title, colX + pColWidth / 2, pronosticsY + 4.5, { align: 'center' });
      
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(pro.desc, colX + pColWidth / 2, pronosticsY + 8, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(idx === 0 ? 16 : idx === 1 ? 14 : idx === 2 ? 194 : 126, idx === 0 ? 185 : idx === 1 ? 165 : idx === 2 ? 65 : 34, idx === 0 ? 129 : idx === 1 ? 233 : idx === 2 ? 12 : 206);
      doc.text(pro.content, colX + pColWidth / 2, pronosticsY + 14.5, { align: 'center' });
    });

    yPos += 22;

    // --- TABLEAU OFFICIEL DES PARTANTS PAGE 2 ---
    doc.addPage();
    let page2Y = 12;

    // En-tête Page 2
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, page2Y, pageWidth - margin * 2, 15, 2, 2, 'F');

    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TABLEAU OFFICIEL DES 11 CHEVAUX & DÉLAISSÉS CLASSÉS PAR COTE GENY`, margin + 4, page2Y + 6);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${course.reunion || 'R1'} ${course.course || 'C1'} - ${course.titre || course.prixNom || 'PRIX'} | ${course.hippodrome || ''} | ${partantsCount} partants | Distance : ${course.distance || ''}m`, margin + 4, page2Y + 11);

    const isPlat = (course.discipline || '').toLowerCase().includes('plat');
    const tableHeaders = [
      'Rang', 'N°', isPlat ? 'Cheval (Corde)' : 'Cheval', 'Driver / Jockey', 'Entraîneur', isPlat ? 'Corde' : 'Ferr.', 'Musique', 'Cote', 'Score', 'Catégorie V38', 'Avis Synthèse'
    ];

    const allOrderedPage2 = [...selection11, ...delaisses];

    const tableData = allOrderedPage2.map((p, idx) => {
      const position = idx + 1;
      let statut = 'Délaissé';
      if (position <= 2) statut = 'Base Solide (1er-2e)';
      else if (position <= 5) statut = 'Chance Sérieuse';
      else if (position <= 9) statut = 'Tocard Spéculatif';
      else if (position <= 11) statut = 'Surprise';

      const rawMusique = p.musique || '';
      const musiqueMatches = rawMusique.match(/\d+[apmsh]|D[apmsh]/g);
      const displayMusique = musiqueMatches 
        ? musiqueMatches.slice(0, 5).join(' ') 
        : rawMusique.split(' ').filter(x => x.trim()).slice(0, 5).join(' ') || '—';

      const coteStr = p.coteProbable ? `${p.coteProbable}/1` : (p.genyOdds ? `${p.genyOdds}/1` : '—');

      return [
        `${position}`,
        p.numero.toString(),
        isPlat && p.corde ? `${p.nom || ''} (C.${p.corde})` : (p.nom || ''),
        p.driver || '—',
        p.entraineur || '—',
        isPlat ? (p.corde ? `Corde ${p.corde}` : '—') : (p.ferrure || '—'),
        displayMusique,
        coteStr,
        p.hippoScore ? `${p.hippoScore} pts` : '—',
        statut,
        p.avisExpert || (position <= 11 ? 'Retenu dans les 11 par cote Geny.' : 'Partant délaissé.'),
      ];
    });

    autoTable(doc, {
      startY: page2Y + 18,
      margin: { left: margin, right: margin },
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 13,
        cellPadding: 3,
        textColor: [15, 23, 42],
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [248, 250, 252],
        fontStyle: 'bold',
        halign: 'left',
        lineColor: [15, 23, 42],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 8 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 10, fontSize: 10 },
        2: { fontStyle: 'bold', cellWidth: 32 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { halign: 'center', cellWidth: 10 },
        6: { cellWidth: 18, fontStyle: 'italic' },
        7: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 14 },
        9: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        10: { cellWidth: 18, fontSize: 6.5, textColor: [30, 41, 59] },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const rank = data.row.index + 1;
          
          if (rank <= 2) {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else if (rank <= 5) {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [146, 64, 14];
            data.cell.styles.fontStyle = 'bold';
          } else if (rank <= 9) {
            data.cell.styles.fillColor = [255, 237, 213];
            data.cell.styles.textColor = [124, 45, 18];
            data.cell.styles.fontStyle = 'bold';
          } else if (rank <= 11) {
            data.cell.styles.fillColor = [243, 232, 255];
            data.cell.styles.textColor = [107, 33, 168];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.fillColor = [248, 250, 252];
            data.cell.styles.textColor = [100, 116, 139];
          }

          if (data.column.index === 1) {
            data.cell.styles.fontSize = 10;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Grille V38 Discipline avec colonnes 2 cm (20 mm)
    const gridStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 155;
    if (gridStartY < 235) {
      const disciplineGrid = computeDisciplineGrid(course);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`GRILLE V38 DISCIPLINE (${disciplineGrid.title}) - COLONNES 2 CM`, margin, gridStartY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const ruleText = `${disciplineGrid.rows[0]?.label || 'A'}: ${disciplineGrid.rows[0]?.description} | ${disciplineGrid.rows[1]?.label || 'B'}: ${disciplineGrid.rows[1]?.description} | ${disciplineGrid.rows[2]?.label || 'C'}: ${disciplineGrid.rows[2]?.description}`;
      doc.text(ruleText, margin, gridStartY + 4);

      const gridHeaders = [['CATEGORIE', 'FAVORIS', 'OUTSIDERS', 'TOCARDS', 'SURPRISES']];
      const allGridRowsList = [
        ...disciplineGrid.rows,
        ...(disciplineGrid.formRows || []),
      ];
      const gridRows = allGridRowsList.map(r => [
        r.label || r.key,
        r.bases.length > 0 ? r.bases.join(' - ') : '—',
        r.chances.length > 0 ? r.chances.join(' - ') : '—',
        r.tocards.length > 0 ? r.tocards.join(' - ') : '—',
        r.surprises.length > 0 ? r.surprises.join(' - ') : '—',
      ]);

      autoTable(doc, {
        startY: gridStartY + 6,
        margin: { left: margin },
        head: gridHeaders,
        body: gridRows,
        theme: 'grid',
        styles: {
          fontSize: 13,
          cellPadding: 3,
          halign: 'center',
          valign: 'middle',
          lineColor: [203, 213, 225],
          lineWidth: 0.25,
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        headStyles: {
          fillColor: [56, 189, 248],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          lineColor: [56, 189, 248],
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] },
          1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 40, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] },
        },
      });
    }

    // --- PIED DE PAGE ET NUMÉROTATION ---
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `PMU-STUDIO 2.0 - Synthèse de Performance Certifiée pour l'Impression`,
        margin,
        pageHeight - 5
      );

      doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 5, {
        align: 'right',
      });
    }

    const cleanHippodrome = (course.hippodrome || 'Course')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const cleanDate = (course.date || 'date').replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `PRONOS -PMU -STUDIO 2.0 - ${course.reunion || 'R1'}${course.course || 'C1'}_${cleanHippodrome}_${cleanDate}.pdf`;

    downloadPdfDocument(doc, filename);
    return doc;
  } catch (err) {
    console.error('Erreur génération PDF:', err);
    return new jsPDF();
  }
}

/**
 * Construit le document jsPDF officiel « PRONOS - PMU - STUDIO 2.0 » (Hiérarchie V38 A4 Portrait).
 * Ce modèle unique est la référence absolue pour le téléchargement et l'impression.
 */
export function buildQuinteOnlyPdfDoc(course: CourseHippique): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    precision: 2,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let yPos = 12;

  // --- EN-TÊTE / HEADER (Format Portrait) ---
  doc.setFillColor(11, 19, 41); // #0b1329
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 3, 3, 'F');

  // Logo Écusson vectoriel
  const logoX = margin + 5;
  const logoY = yPos + 3;
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.6);
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(logoX, logoY, 16, 16, 3, 3, 'FD');
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('P', logoX + 8, logoY + 11.5, { align: 'center' });

  // Titre principal du modèle
  doc.setTextColor(245, 158, 11); // amber-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PRONOS - PMU - STUDIO 2.0', margin + 25, yPos + 9);

  // Sous-titre officiel mis à jour
  doc.setTextColor(226, 232, 240); // slate-200
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    'Concepteur : Ghislain BONI • Extraction certifiée Geny.com',
    margin + 25,
    yPos + 15
  );

  // Metadata & Badge à droite
  const dateCourseAffichee = course.date || 'Mercredi 30 Septembre 2026';
  doc.setFillColor(245, 158, 11); // amber-500 badge
  doc.roundedRect(pageWidth - margin - 48, yPos + 3, 44, 5, 1, 1, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Fiche Officielle PMU-STUDIO 2.0', pageWidth - margin - 26, yPos + 6.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Date officielle : ${dateCourseAffichee}`, pageWidth - margin - 4, yPos + 12, { align: 'right' });

  yPos += 25;

  // --- CARTOUCHE DE LA COURSE ---
  doc.setFillColor(11, 19, 41); // #0b1329 Dark Navy
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 11, 2, 2, 'FD');

  doc.setTextColor(252, 211, 77); // Luminous Amber #fcd34d
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const rawTitle = course.prixNom || course.titre || 'Grand Prix Anjou-Maine';
  const cleanTitle = rawTitle.replace(/\s*\(Quinté\+\)/gi, '').trim();
  const typeStr = course.estQuinte ? 'Quinté+' : 'V38';
  const lineCourseDetails = `RÉUNION ${course.reunion || 'R1'} - COURSE ${course.course || 'C1'} | ${cleanTitle} (${typeStr}) | Hippodrome : ${course.hippodrome || 'Laval'} | Corde : ${course.corde || 'Gauche'} | Distance : ${course.distance || 2850}m`;
  doc.text(lineCourseDetails, margin + 4, yPos + 7.5);

  yPos += 14;

  // --- PRONOSTIC OFFICIEL QUINTÉ+ V38 (SÉLECTION PAR COTE) ---
  const v38Data = computeV38Hierarchy(course);
  const { selection11, basesSolides, chancesSerieuses, favoris = basesSolides, outsiders = chancesSerieuses, tocardsSpeculatifs, surprises, delaisses, isPlat } = v38Data;
  const formClassification = classerChevauxFormeEtPoints(course.partants || []);
  const disciplineGrid = computeDisciplineGrid(course);

  // Box Header Bar (Navy #0b1329)
  doc.setFillColor(11, 19, 41);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 7, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PRONOSTIC OFFICIEL QUINTÉ+ V38 (SÉLECTION PAR COTE)', margin + 4, yPos + 4.8);

  // Right Badge: COTES SCELLÉES SANS VARIATION (avec cadenas vectoriel propre, zéro artefact emoji)
  const badgeW = 55;
  const badgeH = 5.2;
  const badgeX = pageWidth - margin - badgeW - 2;
  const badgeY = yPos + 0.9;
  doc.setFillColor(6, 78, 59); // emerald-950
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.35);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD');

  // Cadenas vectoriel soigné
  const lockX = badgeX + 3.2;
  const lockY = badgeY + 1.2;
  doc.setDrawColor(52, 211, 153);
  doc.setLineWidth(0.35);
  doc.roundedRect(lockX + 0.5, lockY, 1.6, 1.6, 0.8, 0.8, 'S'); // arceau
  doc.setFillColor(52, 211, 153);
  doc.roundedRect(lockX, lockY + 1.2, 2.6, 2.0, 0.3, 0.3, 'F'); // corps

  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('COTES SCELLÉES SANS VARIATION', badgeX + 7.5, badgeY + 3.8);

  yPos += 7.5;

  // Container box for categories (Dark Navy #0b1329 matching Image 2)
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = 36.5;
  doc.setFillColor(11, 19, 41); // #0b1329
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'FD');

  // Helper pour dessiner un badge avec numéro en rectangle arrondi et cote dessous
  const drawHorseBadgeWithCote = (
    num: number | string,
    coteVal: any,
    x: number,
    y: number,
    bgRgb: [number, number, number],
    borderRgb: [number, number, number],
    textRgb: [number, number, number] = [255, 255, 255],
    coteRgb: [number, number, number] = [255, 255, 255]
  ) => {
    const w = 9.2;
    const h = 7.8;
    const r = 1.6;

    // Rectangle arrondi plein
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, r, r, 'FD');

    // Numéro centré en blanc gras
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(String(num), x + w / 2, y + 5.3, { align: 'center' });

    // Cote en dessous, centrée
    const rawCote = typeof coteVal === 'number' ? coteVal.toString() : (coteVal || '—');
    const coteStr = rawCote === '—' ? '—' : `${rawCote}/1`;
    doc.setTextColor(coteRgb[0], coteRgb[1], coteRgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(coteStr, x + w / 2, y + h + 3.2, { align: 'center' });
  };

  // Row 1: FAVORIS, OUTSIDERS, TOCARDS
  const colW3 = (boxWidth - 8) / 3;
  const innerY = yPos + 3.5;

  // 1. FAVORIS (3 N°)
  const col1X = margin + 4;
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FAVORIS (3 N°) :', col1X, innerY + 1.5);
  favoris.slice(0, 3).forEach((p, idx) => {
    drawHorseBadgeWithCote(
      p.numero,
      p.coteProbable || p.genyOdds,
      col1X + idx * 11.5,
      innerY + 3.2,
      [5, 150, 105], // #059669
      [16, 185, 129],
      [255, 255, 255],
      [255, 255, 255]
    );
  });

  // 2. OUTSIDERS (3 N°)
  const col2X = margin + 4 + colW3 + 2;
  doc.setTextColor(56, 189, 248); // sky-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OUTSIDERS (3 N°) :', col2X, innerY + 1.5);
  outsiders.slice(0, 3).forEach((p, idx) => {
    drawHorseBadgeWithCote(
      p.numero,
      p.coteProbable || p.genyOdds,
      col2X + idx * 11.5,
      innerY + 3.2,
      [2, 132, 199], // #0284c7
      [56, 189, 248],
      [255, 255, 255],
      [255, 255, 255]
    );
  });

  // 3. TOCARDS (3 N°)
  const col3X = margin + 4 + (colW3 * 2) + 4;
  doc.setTextColor(251, 113, 133); // rose-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOCARDS (3 N°) :', col3X, innerY + 1.5);
  tocardsSpeculatifs.slice(0, 3).forEach((p, idx) => {
    drawHorseBadgeWithCote(
      p.numero,
      p.coteProbable || p.genyOdds,
      col3X + idx * 11.5,
      innerY + 3.2,
      [225, 29, 72], // #e11d48
      [251, 113, 133],
      [255, 255, 255],
      [255, 255, 255]
    );
  });

  // Separator line
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(0.2);
  doc.line(margin + 4, innerY + 16.5, margin + boxWidth - 4, innerY + 16.5);

  // Row 2: SURPRISES & DÉLAISSÉS
  const colW2 = (boxWidth - 8) / 2;
  const row2Y = innerY + 18.5;

  // 4. SURPRISES
  doc.setTextColor(192, 132, 252); // purple-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`SURPRISES (${surprises.length} N°) :`, col1X, row2Y + 1.5);
  surprises.slice(0, 4).forEach((p, idx) => {
    drawHorseBadgeWithCote(
      p.numero,
      p.coteProbable || p.genyOdds,
      col1X + idx * 11.5,
      row2Y + 3.2,
      [190, 18, 60], // #be123c
      [244, 63, 94],
      [255, 255, 255],
      [255, 255, 255]
    );
  });

  // 5. DÉLAISSÉS
  const colDelaisseX = margin + 4 + colW2 + 2;
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DÉLAISSÉS (↓ N°) :', colDelaisseX, row2Y + 1.5);
  if (!delaisses || delaisses.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('—', colDelaisseX + 2, row2Y + 8);
  } else {
    delaisses.slice(0, 6).forEach((p, idx) => {
      drawHorseBadgeWithCote(
        p.numero,
        p.coteProbable || p.genyOdds,
        colDelaisseX + idx * 11.5,
        row2Y + 3.2,
        [51, 65, 85], // #334155
        [71, 85, 105],
        [255, 255, 255],
        [203, 213, 225]
      );
    });
  }

  yPos += boxHeight + 4;

  // --- 4. GRILLE V38 DISCIPLINE (TABLEAU DE RÉPARTITION) ---
  doc.setFillColor(11, 19, 41);
  doc.roundedRect(margin, yPos, boxWidth, 6, 1.2, 1.2, 'F');
  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`CRITÈRES D'ATTRIBUTION DES LIGNES (${disciplineGrid.title}) :`, margin + 3, yPos + 4.2);

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const critDesc = `${disciplineGrid.rows[0]?.label || 'A'} : ${disciplineGrid.rows[0]?.description} | ${disciplineGrid.rows[1]?.label || 'B'} : ${disciplineGrid.rows[1]?.description} | ${disciplineGrid.rows[2]?.label || 'C'} : ${disciplineGrid.rows[2]?.description}`;
  doc.text(critDesc, pageWidth - margin - 3, yPos + 4.2, { align: 'right' });

  yPos += 7;

  // En-tête de la grille de répartition (Sky blue #38bdf8, colonnes 4 cm)
  const colCatW = 26;
  const colGroupW = 40;
  doc.setFillColor(56, 189, 248); // #38bdf8
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);

  doc.rect(margin, yPos, colCatW, 6.2, 'FD');
  doc.rect(margin + colCatW, yPos, colGroupW, 6.2, 'FD');
  doc.rect(margin + colCatW + colGroupW, yPos, colGroupW, 6.2, 'FD');
  doc.rect(margin + colCatW + colGroupW * 2, yPos, colGroupW, 6.2, 'FD');
  doc.rect(margin + colCatW + colGroupW * 3, yPos, colGroupW, 6.2, 'FD');

  doc.setTextColor(15, 23, 42); // Black/Navy
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CATEGORIE', margin + colCatW / 2, yPos + 4.2, { align: 'center' });
  doc.text('FAVORIS', margin + colCatW + colGroupW / 2, yPos + 4.2, { align: 'center' });
  doc.text('OUTSIDERS', margin + colCatW + colGroupW + colGroupW / 2, yPos + 4.2, { align: 'center' });
  doc.text('TOCARDS', margin + colCatW + colGroupW * 2 + colGroupW / 2, yPos + 4.2, { align: 'center' });
  doc.text('SURPRISES', margin + colCatW + colGroupW * 3 + colGroupW / 2, yPos + 4.2, { align: 'center' });

  yPos += 6.2;

  // Lignes A, B, C de la Grille de Répartition avec rectangles arrondis de numéros
  const drawGridMiniBadges = (
    nums: number[],
    cellStartX: number,
    cellW: number,
    rowY: number,
    bgRgb: [number, number, number],
    borderRgb: [number, number, number],
    txtRgb: [number, number, number] = [255, 255, 255]
  ) => {
    if (!nums || nums.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('—', cellStartX + cellW / 2, rowY + 6.2, { align: 'center' });
      return;
    }

    const bW = 7.5;
    const bH = 6.6;
    const bGap = 2.0;
    const totalW = nums.length * bW + (nums.length - 1) * bGap;
    const startX = cellStartX + (cellW - totalW) / 2;

    nums.forEach((n, idx) => {
      const curX = startX + idx * (bW + bGap);
      doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
      doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      doc.setLineWidth(0.25);
      doc.roundedRect(curX, rowY + 1.8, bW, bH, 1.4, 1.4, 'FD');

      doc.setTextColor(txtRgb[0], txtRgb[1], txtRgb[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.text(String(n), curX + bW / 2, rowY + 6.2, { align: 'center' });
    });
  };

  const gridRowH = 10.2;
  disciplineGrid.rows.forEach((r) => {
    doc.setFillColor(15, 23, 42); // #0f172a Dark
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.35);

    doc.rect(margin, yPos, colCatW, gridRowH, 'FD');
    doc.rect(margin + colCatW, yPos, colGroupW, gridRowH, 'FD');
    doc.rect(margin + colCatW + colGroupW, yPos, colGroupW, gridRowH, 'FD');
    doc.rect(margin + colCatW + colGroupW * 2, yPos, colGroupW, gridRowH, 'FD');
    doc.rect(margin + colCatW + colGroupW * 3, yPos, colGroupW, gridRowH, 'FD');

    // Catégorie Badge (A / B / C)
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin + colCatW / 2 - 3.8, yPos + 1.2, 7.6, 5.0, 1.2, 1.2, 'F');
    doc.setTextColor(251, 191, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text(r.label || r.key, margin + colCatW / 2, yPos + 4.7, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.text(r.description || '', margin + colCatW / 2, yPos + 8.6, { align: 'center' });

    // Colonnes FAVORIS (Vert), OUTSIDERS (Jaune/Ambre), TOCARDS (Orange), SURPRISES (Violet)
    drawGridMiniBadges(r.bases, margin + colCatW, colGroupW, yPos, [5, 150, 105], [16, 185, 129], [255, 255, 255]);
    drawGridMiniBadges(r.chances, margin + colCatW + colGroupW, colGroupW, yPos, [245, 158, 11], [252, 211, 77], [15, 23, 42]);
    drawGridMiniBadges(r.tocards, margin + colCatW + colGroupW * 2, colGroupW, yPos, [249, 115, 22], [251, 146, 60], [255, 255, 255]);
    drawGridMiniBadges(r.surprises, margin + colCatW + colGroupW * 3, colGroupW, yPos, [147, 51, 234], [192, 132, 252], [255, 255, 255]);

    yPos += gridRowH;
  });

  // --- 5. BANDE ORANGE DE SÉPARATION (0,70 CM) AVEC BORDURES BLANCHES NETTES ---
  yPos += 2.5;
  const bandeH = 6.4;
  doc.setFillColor(245, 158, 11); // Amber-500
  doc.rect(margin, yPos, boxWidth, bandeH, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + boxWidth, yPos);
  doc.line(margin, yPos + bandeH, margin + boxWidth, yPos + bandeH);

  doc.setTextColor(15, 23, 42); // Black
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('—— ETAT DE FORME DU CHEVAL ——', margin + boxWidth / 2, yPos + 4.3, { align: 'center' });

  yPos += bandeH + 1.5;

  // --- 6. TABLEAU DE L'ETAT DE FORME DU CHEVAL (GRILLE 5 COLONNES) ---
  const formRowsData = disciplineGrid.formRows || [];
  const formRowH = 10.2;

  formRowsData.forEach((r) => {
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.35);

    doc.rect(margin, yPos, colCatW, formRowH, 'FD');
    doc.rect(margin + colCatW, yPos, colGroupW, formRowH, 'FD');
    doc.rect(margin + colCatW + colGroupW, yPos, colGroupW, formRowH, 'FD');
    doc.rect(margin + colCatW + colGroupW * 2, yPos, colGroupW, formRowH, 'FD');
    doc.rect(margin + colCatW + colGroupW * 3, yPos, colGroupW, formRowH, 'FD');

    // Catégorie Badge text
    let catTitle = r.label;
    let catSub = r.description;
    let titleRgb: [number, number, number] = [251, 191, 36];

    if (r.key === 'EN_FORME') {
      titleRgb = [52, 211, 153];
      catTitle = '🟢 CHEVAUX EN FORME';
    } else if (r.key === 'FORME_MOYENNE') {
      titleRgb = [251, 191, 36];
      catTitle = '🟡 FORME MOYENNE';
    } else if (r.key === 'CAPABLE_EXPLOIT') {
      titleRgb = [34, 211, 238];
      catTitle = "⚡ CAPABLE D'EXPLOIT";
    } else if (r.key === 'MEFORME') {
      titleRgb = [251, 113, 133];
      catTitle = '🔴 MÉFORME';
    }

    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(catTitle, margin + colCatW / 2, yPos + 4.2, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.text(`(${catSub})`, margin + colCatW / 2, yPos + 8.0, { align: 'center' });

    // Colonne 2: FAVORIS (Vert)
    drawGridMiniBadges(r.bases, margin + colCatW, colGroupW, yPos, [5, 150, 105], [16, 185, 129], [255, 255, 255]);
    // Colonne 3: OUTSIDERS (Ambre/Or)
    drawGridMiniBadges(r.chances, margin + colCatW + colGroupW, colGroupW, yPos, [217, 119, 6], [252, 211, 77], [255, 255, 255]);
    // Colonne 4: TOCARDS (Orange)
    drawGridMiniBadges(r.tocards, margin + colCatW + colGroupW * 2, colGroupW, yPos, [249, 115, 22], [251, 146, 60], [255, 255, 255]);
    // Colonne 5: SURPRISES (Violet)
    drawGridMiniBadges(r.surprises, margin + colCatW + colGroupW * 3, colGroupW, yPos, [147, 51, 234], [192, 132, 252], [255, 255, 255]);

    yPos += formRowH;
  });

  // =========================================================================
  // PAGE 2 : TABLEAU DÉTAILLÉ DU CLASSEMENT OFFICIEL DES PARTANTS
  // =========================================================================
  doc.addPage();
  let page2Y = 12;

  // Header Page 2
  doc.setFillColor(11, 19, 41);
  doc.roundedRect(margin, page2Y, pageWidth - margin * 2, 18, 3, 3, 'F');

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin + 4, page2Y + 2.5, 13, 13, 2.5, 2.5, 'FD');
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('P', margin + 10.5, page2Y + 11.5, { align: 'center' });

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PRONOS - PMU - STUDIO 2.0', margin + 20, page2Y + 8);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Tableau Détaillé des Partants & Méthodologie • Page 2 / 2', margin + 20, page2Y + 13.5);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(7.5);
  doc.text(`RÉUNION ${course.reunion || 'R1'} - COURSE ${course.course || 'C1'} | ${cleanTitle}`, pageWidth - margin - 4, page2Y + 11, { align: 'right' });

  page2Y += 23;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('CLASSEMENT OFFICIEL DES PARTANTS PAR PROBABILITÉ DE SUCCÈS', margin, page2Y);

  page2Y += 3;

  const tableHeaders = [
    ['N°', isPlat ? 'Cheval (Corde)' : 'Cheval', 'Driver / Jockey', 'MUSIQUE', 'Cote', 'Score IA', 'Prob. Succès']
  ];

  const successProbMap = computeHorseSuccessProbabilities(course.partants, course);
  const allOrderedTable = [...selection11, ...delaisses].sort((a, b) => {
    const probA = successProbMap.get(Number(a.numero))?.percent || 0;
    const probB = successProbMap.get(Number(b.numero))?.percent || 0;
    if (probB !== probA) return probB - probA;
    const coteA = parseFloat((a.coteProbable || a.genyOdds || '99').toString().replace(',', '.'));
    const coteB = parseFloat((b.coteProbable || b.genyOdds || '99').toString().replace(',', '.'));
    return coteA - coteB;
  });

  const tableRows = allOrderedTable.map((p) => {
    const rawMusique = p.musique || '';
    const musiqueMatches = rawMusique.match(/\d+[apmshd]|D[apmshd]/gi);
    const displayMusique = musiqueMatches && musiqueMatches.length > 0
      ? musiqueMatches.slice(0, 3).join(' ') 
      : rawMusique.trim().split(/\s+/).filter(x => x.trim()).slice(0, 3).join(' ') || '—';

    const coteStr = p.coteProbable ? `${p.coteProbable}/1` : (p.genyOdds ? `${p.genyOdds}/1` : '—');
    const scoreStr = p.hippoScore ? `${p.hippoScore}/100` : '—';
    const probInfo = successProbMap.get(Number(p.numero));
    const probStr = probInfo ? `${probInfo.percent}%` : '—';
    const horseName = isPlat && p.corde ? `${p.nom || ''} (C.${p.corde})` : (p.nom || '');

    return [
      `${p.numero}`,
      horseName,
      p.driver || '—',
      displayMusique,
      coteStr,
      scoreStr,
      probStr
    ];
  });

  autoTable(doc, {
    startY: page2Y,
    margin: { left: margin, right: margin },
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      textColor: [0, 0, 0], // Texte en noir
    },
    headStyles: {
      fillColor: [11, 19, 41], // #0b1329
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: [11, 19, 41],
      lineWidth: 0.3,
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.4,
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontStyle: 'bold', fontSize: 13, textColor: [0, 0, 0] },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 42, textColor: [0, 0, 0] },
      2: { halign: 'left', cellWidth: 32, fontStyle: 'bold', textColor: [0, 0, 0] },
      3: { halign: 'left', cellWidth: 24, fontStyle: 'bold', textColor: [0, 0, 0] },
      4: { halign: 'left', cellWidth: 20, fontStyle: 'bold', textColor: [0, 0, 0] },
      5: { halign: 'left', cellWidth: 20, fontStyle: 'bold', textColor: [0, 0, 0] },
      6: { halign: 'center', cellWidth: 24, fontStyle: 'bold', textColor: [0, 0, 0] },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const rank = data.row.index + 1;

        if (rank <= 2) {
          data.cell.styles.fillColor = [236, 253, 245]; // #ecfdf5
        } else if (rank <= 5) {
          data.cell.styles.fillColor = [240, 249, 255]; // #f0f9ff
        } else if (rank <= 9) {
          data.cell.styles.fillColor = [255, 247, 237]; // #fff7ed
        } else if (rank <= 11) {
          data.cell.styles.fillColor = [250, 245, 255]; // #faf5ff
        } else {
          data.cell.styles.fillColor = [248, 250, 252]; // #f8fafc
        }

        // Écriture strictly en noir pour tous les textes
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = 'bold';

        if (data.column.index === 0) {
          data.cell.styles.fontSize = 13;
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fillColor = [255, 255, 255];
        } else if (data.column.index === 6) {
          data.cell.styles.halign = 'center';
          data.cell.styles.textColor = [0, 0, 0];
        } else {
          data.cell.styles.halign = 'left';
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    },
  });

  // --- PIED DE PAGE ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "PRONOS - PMU - STUDIO 2.0 • Concepteur : Ghislain BONI",
      margin,
      pageHeight - 5
    );
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 5, {
      align: 'right',
    });
  }

  return doc;
}

/**
 * Exporte UNIQUEMENT les pronostics du Quinté+ et la sélection de valeur (modèle officiel V38)
 * vers un fichier PDF téléchargé directement.
 */
export function exportQuinteOnlyToPdf(course: CourseHippique): void {
  try {
    if (typeof document !== 'undefined' && document.getElementById('fiche-v38-page-1')) {
      generateFicheV38PdfFromDom(course, 'download').catch(() => {
        fallbackExport();
      });
      return;
    }
  } catch {}

  fallbackExport();

  function fallbackExport() {
    try {
      const doc = buildQuinteOnlyPdfDoc(course);
      const cleanHippodrome = (course.hippodrome || 'Course')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      const cleanDate = (course.date || 'date').replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `PRONOS_PMU_STUDIO_2_0_HIERARCHIE_V38_${course.reunion || 'R1'}${course.course || 'C1'}_${cleanHippodrome}_${cleanDate}.pdf`;

      downloadPdfDocument(doc, filename);
    } catch (err) {
      console.error('Erreur génération PDF Quinté V38:', err);
    }
  }
}

/**
 * Lance l'impression directe du modèle de fichier PDF officiel « PRONOS - PMU - STUDIO 2.0 ».
 * Imprime ce modèle de fichier PDF uniquement, sans les barres ni les éléments d'interface.
 */
export function printQuinteOnlyPdf(course: CourseHippique): void {
  try {
    if (typeof document !== 'undefined' && document.getElementById('fiche-v38-page-1')) {
      generateFicheV38PdfFromDom(course, 'print').catch(() => {
        fallbackPrint();
      });
      return;
    }
  } catch {}

  fallbackPrint();

  function fallbackPrint() {
    try {
      const doc = buildQuinteOnlyPdfDoc(course);
      doc.autoPrint();
      const blob = doc.output('blob');
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
    } catch (err) {
      console.error('Erreur impression PDF Quinté V38:', err);
      // En cas d'erreur bloquante navigateur, déclenche le téléchargement du fichier PDF
      exportQuinteOnlyToPdf(course);
    }
  }
}

/**
 * Exporte la hiérarchie V38 au format PDF avec une orientation portrait forcée,
 * incluant uniquement le tableau hiérarchique V38 propre et le Concepteur : Ghislain BONI.
 */
export function exportV38PortraitPdf(course: CourseHippique): void {
  exportQuinteOnlyToPdf(course);
}
