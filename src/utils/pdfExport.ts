import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CourseHippique } from '../types/turf';
import { convertToUTC } from './timeConversion';
import { computePartantHippoScore, computeQuinteOrdres } from './geminiMultiModelEngine';
import { computeV38Hierarchy, computeDisciplineGrid } from './v38Helper';
import { downloadPdfDocument } from './exportUtils';

/**
 * Exporte l'analyse complète de la course au format PDF structuré et soigné.
 */
export function exportCourseToPdf(course: CourseHippique): void {
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
    const { poolG1, poolG2, poolG3, selection12, selection11, basesSolides, chancesSerieuses, tocardsSpeculatifs, surprises, delaisses } = computeV38Hierarchy(course);

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
      if (idx <= 1) {
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.setDrawColor(6, 95, 70);
      } else if (idx <= 5) {
        doc.setFillColor(14, 165, 233); // sky-500
        doc.setDrawColor(3, 105, 161);
      } else if (idx <= 8) {
        doc.setFillColor(249, 115, 22); // orange-500
        doc.setDrawColor(194, 65, 12);
      } else {
        doc.setFillColor(168, 85, 247); // purple-500
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
      { title: '1. BASES SOLIDES', desc: '1er - 2e N°', content: basesSolides.map(p => p.numero).join(' · ') || '—' },
      { title: '2. CHANCES SÉRIEUSES', desc: '3e - 4e - 5e N°', content: chancesSerieuses.map(p => p.numero).join(' · ') || '—' },
      { title: '3. TOCARDS SPÉCULATIFS', desc: '6e - 7e - 8e - 9e N°', content: tocardsSpeculatifs.map(p => p.numero).join(' · ') || '—' },
      { title: '4. SURPRISES', desc: '11e - 12e N°', content: surprises.map(p => p.numero).join(' · ') || '—' },
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

    const tableHeaders = [
      'Rang', 'N°', 'Cheval', 'Driver / Jockey', 'Entraîneur', 'Ferr.', 'Musique', 'Cote', 'Score', 'Catégorie V38', 'Avis Synthèse'
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
        p.nom || '',
        p.driver || '—',
        p.entraineur || '—',
        p.ferrure || '—',
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
        fontSize: 7,
        cellPadding: 1.5,
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
  } catch (err) {
    console.error('Erreur génération PDF:', err);
  }
}

/**
 * Exporte UNIQUEMENT les pronostics du Quinté+ et la sélection de valeur (9 meilleurs chevaux)
 * vers un PDF optimisé pour l'impression A4 Portrait (Fiche de Jeu d'un seul coup d'oeil).
 */
export function exportQuinteOnlyToPdf(course: CourseHippique): void {
  try {
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
    const { selection11, basesSolides, chancesSerieuses, tocardsSpeculatifs, surprises, delaisses } = computeV38Hierarchy(course);

    // Box Header Bar (Navy #0b1329)
    doc.setFillColor(11, 19, 41);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 7, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('PRONOSTIC OFFICIEL QUINTÉ+ V38 (SÉLECTION PAR COTE)', margin + 4, yPos + 4.8);

    // Right Badge: 🔒 COTES SCELLÉES SANS VARIATION
    doc.setFillColor(6, 78, 59); // emerald-950
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(pageWidth - margin - 58, yPos + 1, 54, 5, 1, 1, 'FD');
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.setFontSize(6.5);
    doc.text('🔒 COTES SCELLÉES SANS VARIATION', pageWidth - margin - 31, yPos + 4.2, { align: 'center' });

    yPos += 9;

    // Container box for categories (Dark Navy #0b1329 for premium look)
    const boxWidth = pageWidth - margin * 2;
    const boxHeight = 28;
    doc.setFillColor(11, 19, 41); // #0b1329
    doc.setDrawColor(30, 41, 59); // slate-800
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'FD');

    // Row 1: BASES SOLIDES, CHANCES SÉRIEUSES, TOCARDS SPÉCULATIFS
    const colW3 = (boxWidth - 8) / 3;

    const formatCategoryText = (list: typeof basesSolides) =>
      list.length > 0
        ? list.map(p => `N°${p.numero} (${p.coteProbable || p.genyOdds || '—'}/1)`).join('   ')
        : '—';

    // 1. BASES SOLIDES
    const xCol1 = margin + 4;
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BASES SOLIDES :', xCol1, yPos + 5);
    doc.setTextColor(236, 253, 245); // emerald-50
    doc.setFontSize(8);
    doc.text(formatCategoryText(basesSolides), xCol1, yPos + 10);

    // 2. CHANCES SÉRIEUSES
    const xCol2 = margin + 4 + colW3 + 2;
    doc.setTextColor(56, 189, 248); // sky-400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CHANCES SÉRIEUSES :', xCol2, yPos + 5);
    doc.setTextColor(240, 249, 255); // sky-50
    doc.setFontSize(8);
    doc.text(formatCategoryText(chancesSerieuses), xCol2, yPos + 10);

    // 3. TOCARDS SPÉCULATIFS
    const xCol3 = margin + 4 + (colW3 * 2) + 4;
    doc.setTextColor(251, 113, 133); // rose-400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOCARDS SPÉCULATIFS :', xCol3, yPos + 5);
    doc.setTextColor(255, 241, 242); // rose-50
    doc.setFontSize(8);
    doc.text(formatCategoryText(tocardsSpeculatifs), xCol3, yPos + 10);

    // Separator line
    doc.setDrawColor(30, 41, 59); // slate-800
    doc.setLineWidth(0.2);
    doc.line(margin + 4, yPos + 14, margin + boxWidth - 4, yPos + 14);

    // Row 2: SURPRISES & DÉLAISSÉS
    const colW2 = (boxWidth - 8) / 2;

    // 4. SURPRISES
    const xRow2Col1 = margin + 4;
    doc.setTextColor(192, 132, 252); // purple-400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SURPRISES :', xRow2Col1, yPos + 19);
    doc.setTextColor(250, 245, 255); // purple-50
    doc.setFontSize(8);
    doc.text(formatCategoryText(surprises), xRow2Col1, yPos + 24);

    // 5. DÉLAISSÉS
    const xRow2Col2 = margin + 4 + colW2 + 2;
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DÉLAISSÉS :', xRow2Col2, yPos + 19);
    doc.setTextColor(241, 245, 249); // slate-100
    doc.setFontSize(8);
    doc.text(formatCategoryText(delaisses), xRow2Col2, yPos + 24);

    yPos += boxHeight + 6;

    // --- TABLEAU DÉTAILLÉ DES 11 CHEVAUX & DÉLAISSÉS ---
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('CLASSEMENT OFFICIEL DES 11 CHEVAUX EN 3 GROUPES & PAR COTE DU SITE GENY', margin, yPos);

    yPos += 3;

    const tableHeaders = [
      ['N°', 'Cheval', 'Driver / Jockey', 'MUSIQUE', 'Cote', 'Score IA', 'Rôle V38']
    ];

    const allOrderedTable = [...selection11, ...delaisses];

    const tableRows = allOrderedTable.map((p, idx) => {
      const position = idx + 1;
      let roleText = 'Délaissé';
      if (position === 1) roleText = 'Base';
      else if (position === 2) roleText = '2nd Base';
      else if (position <= 5) roleText = 'Chance';
      else if (position === 6) roleText = 'Tocards';
      else if (position <= 9) roleText = 'Tocard';
      else if (position <= 12) roleText = 'Faible chance';

      const rawMusique = p.musique || '';
      const musiqueMatches = rawMusique.match(/\d+[apmshd]|D[apmshd]/gi);
      const displayMusique = musiqueMatches && musiqueMatches.length > 0
        ? musiqueMatches.slice(0, 3).join(' ') 
        : rawMusique.trim().split(/\s+/).filter(x => x.trim()).slice(0, 3).join(' ') || '—';

      const coteStr = p.coteProbable ? `${p.coteProbable}/1` : (p.genyOdds ? `${p.genyOdds}/1` : '—');
      const scoreStr = p.hippoScore ? `${p.hippoScore}/100` : '—';

      return [
        `${p.numero}`,
        p.nom || '',
        p.driver || '—',
        displayMusique,
        coteStr,
        scoreStr,
        roleText
      ];
    });

    autoTable(doc, {
      startY: yPos,
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
        0: { halign: 'center', cellWidth: 14, fontStyle: 'bold', fontSize: 16, textColor: [0, 0, 0] },
        1: { halign: 'left', fontStyle: 'bold', cellWidth: 42, textColor: [0, 0, 0] },
        2: { halign: 'left', cellWidth: 34, fontStyle: 'bold', textColor: [0, 0, 0] },
        3: { halign: 'left', cellWidth: 22, fontStyle: 'bold', textColor: [0, 0, 0] },
        4: { halign: 'left', cellWidth: 20, fontStyle: 'bold', textColor: [0, 0, 0] },
        5: { halign: 'left', cellWidth: 20, fontStyle: 'bold', textColor: [0, 0, 0] },
        6: { halign: 'left', cellWidth: 32, fontStyle: 'bold', textColor: [0, 0, 0] },
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
            // Colonne des N° (#v38-table-container) : Identité visuelle Web/PDF (Police 16px, centrée, texte noir sur fond blanc)
            data.cell.styles.fontSize = 16;
            data.cell.styles.halign = 'center';
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [0, 0, 0];
            data.cell.styles.fillColor = [255, 255, 255]; // Fond blanc contrasté
          } else {
            // Reste des colonnes : Texte aligné à gauche et en noir
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

/**
 * Exporte la hiérarchie V38 au format PDF avec une orientation portrait forcée,
 * incluant uniquement le tableau hiérarchique V38 propre et le Concepteur : Ghislain BONI.
 */
export function exportV38PortraitPdf(course: CourseHippique): void {
  exportQuinteOnlyToPdf(course);
}
