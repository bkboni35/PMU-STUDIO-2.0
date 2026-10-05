import { jsPDF } from 'jspdf';

export const exportUserManualToPDF = () => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    precision: 2,
  });
  
  doc.setFontSize(18);
  doc.text('Mode de Fonctionnement - HippoAnalyse Studio', 10, 20);
  
  doc.setFontSize(12);
  const text = `
Bienvenue sur HippoAnalyse Studio, votre assistant expert pour le Quinté+.

1. Analyse en temps réel :
   Saisissez une URL de course (Geny.com ou Paris-Turf.com). L'IA extrait automatiquement les partants, les cotes et les conditions de course.

2. Audit de fiabilité (Fact-Checker) :
   Notre système valide instantanément les données extraites contre les sources officielles du PMU. Si une donnée est incohérente, une alerte s'affiche dans le bloc "DataIntegrityGuard".

3. Tri et Analyse :
   - Utilisez le bouton "Classer" dans l'en-tête "HippoScore" pour trier les chevaux par pertinence.
   - Consultez la colonne "Forme Globale" pour visualiser la régularité des chevaux sur leurs 5 dernières sorties.

4. Exportation :
   - Exportez vos analyses au format PDF ou CSV pour conserver ou partager vos pronostics.

5. Aide à la décision :
   - Consultez les propositions de jeux générées par le Collège d'IA.
   - Utilisez le décodeur de musique pour interpréter les performances passées.
  `;
  
  doc.text(text, 10, 30, { maxWidth: 180 });

  doc.save('Mode_de_Fonctionnement_HippoAnalyse.pdf');
};
