import { CourseHippique } from '../types/turf';
import { computeV38Hierarchy } from './v38Helper';

/**
 * Exporte tout le programme hippique, l'analyse et la programmation technique de l'application au format Word (.doc)
 */
export const exportProgramAndCodeToWord = (course?: CourseHippique | null, allCourses: CourseHippique[] = []) => {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hierarchy = course ? computeV38Hierarchy(course) : null;
  const { basesSolides = [], chancesSerieuses = [], tocardsSpeculatifs = [], surprises = [], delaisses = [] } = hierarchy || {};
  const activeSelection = hierarchy?.selection12 || hierarchy?.selection11 || [...basesSolides, ...chancesSerieuses, ...tocardsSpeculatifs, ...surprises];
  const allOrdered = course ? [...activeSelection, ...delaisses] : [];

  const htmlContent = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Export Programme et Programmation - HippoAnalyse V38</title>
    <style>
      body {
        font-family: 'Calibri', 'Arial', sans-serif;
        line-height: 1.6;
        color: #1e293b;
        margin: 40px;
        background-color: #ffffff;
      }
      h1 {
        color: #0f172a;
        font-size: 24px;
        border-bottom: 3px solid #f59e0b;
        padding-bottom: 10px;
        margin-bottom: 20px;
        text-transform: uppercase;
      }
      h2 {
        color: #1e3a8a;
        font-size: 18px;
        border-bottom: 1.5px solid #3b82f6;
        padding-bottom: 6px;
        margin-top: 35px;
        margin-bottom: 15px;
        text-transform: uppercase;
      }
      h3 {
        color: #1d4ed8;
        font-size: 14px;
        margin-top: 20px;
        margin-bottom: 10px;
      }
      p, li {
        font-size: 12px;
        margin-bottom: 8px;
      }
      ul {
        margin-top: 5px;
        margin-bottom: 15px;
        padding-left: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        margin-bottom: 25px;
      }
      th, td {
        border: 1px solid #cbd5e1;
        padding: 8px 10px;
        text-align: left;
        font-size: 11px;
      }
      th {
        background-color: #0f172a;
        color: #f8fafc;
        font-weight: bold;
        text-transform: uppercase;
      }
      tr:nth-child(even) {
        background-color: #f8fafc;
      }
      .badge {
        display: inline-block;
        background-color: #dbeafe;
        color: #1e40af;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
      }
      .meta-box {
        background-color: #f1f5f9;
        border-left: 4px solid #f59e0b;
        padding: 12px 15px;
        margin-bottom: 25px;
        border-radius: 0 8px 8px 0;
      }
      .code-block {
        font-family: 'Courier New', Courier, monospace;
        background-color: #0f172a;
        color: #e2e8f0;
        padding: 12px;
        border-radius: 6px;
        font-size: 10px;
        white-space: pre-wrap;
        margin-top: 10px;
        margin-bottom: 15px;
      }
      .footer {
        margin-top: 50px;
        text-align: center;
        font-size: 10px;
        color: #64748b;
        border-top: 1px solid #cbd5e1;
        padding-top: 15px;
      }
    </style>
  </head>
  <body>
    <h1>RAPPORT INTÉGRAL : PROGRAMME HIPPIQUE & PROGRAMMATION DE L'APPLICATION</h1>
    
    <div class="meta-box">
      <p><strong>Application :</strong> HippoAnalyse V38 & Studio Turf Pro</p>
      <p><strong>Concepteur :</strong> Ghislain BONI</p>
      <p><strong>Date d'exportation :</strong> ${currentDate}</p>
      <p><strong>Statut :</strong> Export Word Officiel (.doc / .docx compatible)</p>
    </div>

    <h2>1. PROGRAMME HIPPIQUE DU JOUR ET ANALYSE QUINTÉ+</h2>
    ${course ? `
      <p><strong>Course sélectionnée :</strong> ${course.prixNom || course.titre || 'Grand Prix'} (${course.estQuinte ? 'Quinté+' : 'Course Standard'})</p>
      <p><strong>Réunion / Course :</strong> Réunion ${course.reunion || 'R1'} - Course ${course.course || 'C1'}</p>
      <p><strong>Hippodrome :</strong> ${(course.hippodrome || 'PARIS-VINCENNES').toUpperCase()} | <strong>Corde :</strong> ${(course.corde || 'GAUCHE').toUpperCase()} | <strong>Distance :</strong> ${course.distance ? course.distance + 'm' : '2700m'}</p>
      <p><strong>Allocation :</strong> ${course.allocation || '50 000 €'} | <strong>Discipline :</strong> ${course.discipline || 'Attelé'}</p>

      <h3>Hiérarchie Officielle V38 & Pronostic de Jeu</h3>
      <table>
        <tr>
          <th>Rôle / Catégorie</th>
          <th>Numéros</th>
          <th>Cotes Probables</th>
          <th>Détails & Analyse</th>
        </tr>
        <tr>
          <td><strong>Bases Solides (2-3 N°)</strong></td>
          <td>${basesSolides.map(p => p.numero).join(', ') || '—'}</td>
          <td>${basesSolides.map(p => p.coteProbable || p.genyOdds || '—').join(', ')}</td>
          <td>Chevaux les plus réguliers et fiables de l'épreuve.</td>
        </tr>
        <tr>
          <td><strong>Chances Sérieuses (3-4 N°)</strong></td>
          <td>${chancesSerieuses.map(p => p.numero).join(', ') || '—'}</td>
          <td>${chancesSerieuses.map(p => p.coteProbable || p.genyOdds || '—').join(', ')}</td>
          <td>Solides prétendants pour les places d'honneur.</td>
        </tr>
        <tr>
          <td><strong>Tocards Spéculatifs (2-3 N°)</strong></td>
          <td>${tocardsSpeculatifs.map(p => p.numero).join(', ') || '—'}</td>
          <td>${tocardsSpeculatifs.map(p => p.coteProbable || p.genyOdds || '—').join(', ')}</td>
          <td>Outsiders à belle cote capables de pimenter les rapports.</td>
        </tr>
        <tr>
          <td><strong>Surprises / Coups de Poker (1-2 N°)</strong></td>
          <td>${surprises.map(p => p.numero).join(', ') || '—'}</td>
          <td>${surprises.map(p => p.coteProbable || p.genyOdds || '—').join(', ')}</td>
          <td>Trouble-fêtes potentiels en cas de course sélective.</td>
        </tr>
      </table>

      <h3>Tableau Complet des Partants & Cotes SCELLÉES</h3>
      <table>
        <tr>
          <th>N°</th>
          <th>Cheval</th>
          <th>Cote Geny</th>
          <th>Driver / Jocker</th>
          <th>Entraîneur</th>
          <th>Musique</th>
          <th>Gains (€)</th>
          <th>HippoScore</th>
        </tr>
        ${allOrdered.map((p, idx) => `
          <tr>
            <td><strong>${p.numero}</strong></td>
            <td>${p.nom}</td>
            <td><strong>${p.coteProbable || p.genyOdds || '—'}/1</strong></td>
            <td>${p.driver || '—'}</td>
            <td>${p.entraineur || '—'}</td>
            <td>${p.musique || '—'}</td>
            <td>${p.gains ? p.gains.toLocaleString() + ' €' : '—'}</td>
            <td>${p.hippoScore ? p.hippoScore + '/100' : '—'}</td>
          </tr>
        `).join('')}
      </table>
    ` : `
      <p>Aucune course active sélectionnée pour le moment. Le programme général comporte ${allCourses.length} réunions chargées.</p>
    `}

    <h2>2. PROGRAMMATION TECHNIQUE ET ARCHITECTURE DE L'APPLICATION</h2>
    <p>La plateforme <strong>HippoAnalyse V38 Studio</strong> repose sur une architecture moderne, modulaire et hautement performante orientée SPAs React 19 et TypeScript.</p>

    <h3>Stack Technique & Dépendances Principales</h3>
    <ul>
      <li><strong>Frontend :</strong> React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (Icônes).</li>
      <li><strong>Visualisation & Graphiques :</strong> Recharts, D3.js pour les radars de performance et histogrammes comparatifs V38.</li>
      <li><strong>Gestion des Données & API :</strong> Firebase Firestore & Auth pour la persistance temps réel et la synchronisation multi-utilisateurs.</li>
      <li><strong>Intelligence Artificielle :</strong> Google GenAI SDK (@google/genai) pour l'analyse experte et les recommandations de paris IA.</li>
      <li><strong>Exportation & Rapports :</strong> jsPDF, html2canvas, PapaParse (CSV), et export Word natif (.doc / .docx).</li>
    </ul>

    <h3>Structure et Composants Majeurs du Code Source</h3>
    <ul>
      <li><code>src/App.tsx</code> : Composant racine orchestrant l'application, les onglets principaux, le calendrier PMU et la barre de navigation.</li>
      <li><code>src/components/PartantsTable.tsx</code> : Tableau interactif des partants avec gestion des musiques, cotes, info-bulles et symboles hippiques (a, m, da, etc.).</li>
      <li><code>src/components/PronosticsDeJeuView.tsx</code> : Vue centrale du « Pronostic de Jeu » et des piliers V38 (Bases, Chances, Tocards, Surprises).</li>
      <li><code>src/components/FicheImpressionPdfV38View.tsx</code> : Générateur de fiches d'impression officielles et d'exports (PDF, CSV, Word).</li>
      <li><code>src/components/StudioV38Pipeline.tsx</code> : Moteur de calcul algorithmique V38 évaluant les probabilités de réussite des chevaux.</li>
      <li><code>src/utils/v38Helper.ts</code> : Fonctions mathématiques et logiques pour le classement et la hiérarchie des partants.</li>
      <li><code>src/utils/wordExport.ts</code> : Module d'exportation complet du programme et de la programmation au format Word.</li>
    </ul>

    <h3>Flux de Traitement et Sécurité</h3>
    <p>L'application garantit une intégrité absolue des cotes (cotes scellées sans variation intempestive), une actualisation en direct basée sur la date courante, ainsi qu'un système d'audit permanent pour éviter toute invention d'arrivée.</p>

    <div class="footer">
      <p>HippoAnalyse V38 & Studio Turf Pro • Document généré automatiquement depuis l'application officielle.</p>
    </div>
  </body>
  </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanTitle = course ? (course.prixNom || course.hippodrome || 'course').replace(/[^a-zA-Z0-9]/g, '_') : 'programme_complet';
  a.download = `Programme_et_Programmation_HippoAnalyse_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
