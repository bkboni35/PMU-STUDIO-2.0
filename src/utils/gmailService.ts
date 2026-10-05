import { getAccessToken } from '../firebase';
import { CourseHippique } from '../types/turf';

/**
 * Utility to send race analysis via Gmail API
 */
export async function sendRaceAnalysisEmail(course: CourseHippique, recipientEmail: string) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentification Google requise. Veuillez vous reconnecter.");
  }

  const subject = `📊 Analyse PMU-STUDIO 2.0 : ${course.prixNom} - ${course.reunion} ${course.course}`;
  
  const selection8 = course.synthese?.selection8?.join(' - ') || 'Non disponible';
  const base1 = course.synthese?.baseIncontournable || '?';
  const base2 = course.synthese?.secondeBase || '?';
  
  const body = `
Bonjour,

Voici votre analyse certifiée HippoAnalyse pour l'épreuve suivante :

🏆 ÉPREUVE : ${course.prixNom}
📍 HIPPODROME : ${course.hippodrome}
📅 DATE : ${course.date}
⏰ HEURE : ${course.heure}
🏁 DISCIPLINE : ${course.discipline} (${course.distance}m)

--------------------------------------------------
🎯 PRONOSTIC QUINTÉ+ (SÉLECTION 8) :
${selection8}

💎 BASES INCONTOURNABLES :
Base 1 : ${base1}
Base 2 : ${base2}

📊 INDICE DE CONFIANCE : ${course.synthese?.indiceConfiance || 8}/10
--------------------------------------------------

💡 CONSEIL DE JEU :
${course.synthese?.conseilPari || 'Jeu combiné conseillé.'}

📝 SYNTHÈSE DES EXPERTS :
${course.synthese?.selectionJustification || 'Analyse basée sur les algorithmes V38.'}

Retrouvez l'intégralité de l'analyse sur votre application PMU-STUDIO 2.0.

Bonne chance !
L'équipe HippoAnalyse
  `.trim();

  // Gmail API requires the email to be base64url encoded
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailContent = [
    `To: ${recipientEmail}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');

  const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64EncodedEmail,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erreur Gmail API : ${errorData.error?.message || 'Inconnue'}`);
  }

  return await response.json();
}
