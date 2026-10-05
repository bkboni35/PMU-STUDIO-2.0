/**
 * Utilitaire de Parsing Certifié des Cordes & Stalles (Geny / Paris-Turf / PMU)
 * Extraction robuste via expressions régulières et conversion sécurisée avec logging de débogage.
 */

export interface CordeParsingResult {
  cordeNumber: number;
  sourceField: string;
  rawMatchedValue: string;
  isFallback: boolean;
}

/**
 * Extrait avec précision le numéro de corde / stalle d'un partant depuis divers formats
 * (Objets Geny, Paris-Turf, PMU, JSON ou texte brut HTML).
 */
export function parseHorseCordeNumber(partant: any, rawHtmlOrText?: string): CordeParsingResult {
  if (!partant && !rawHtmlOrText) {
    return { cordeNumber: 1, sourceField: 'default', rawMatchedValue: '1', isFallback: true };
  }

  // 1. Inspection des champs nommés sur l'objet partant (Geny, Paris-Turf, PMU)
  const candidateFields: Array<{ name: string; val: any }> = [
    { name: 'partant.corde', val: partant?.corde },
    { name: 'partant.numCorde', val: partant?.numCorde },
    { name: 'partant.num_corde', val: partant?.num_corde },
    { name: 'partant.stalle', val: partant?.stalle },
    { name: 'partant.numStalle', val: partant?.numStalle },
    { name: 'partant.num_stalle', val: partant?.num_stalle },
    { name: 'partant.placeStalle', val: partant?.placeStalle },
    { name: 'partant.place_stalle', val: partant?.place_stalle },
    { name: 'partant.placeCorde', val: partant?.placeCorde },
    { name: 'partant.place_corde', val: partant?.place_corde },
    { name: 'partant.place', val: partant?.place },
    { name: 'partant.numPlace', val: partant?.numPlace },
    { name: 'partant.num_place', val: partant?.num_place },
    { name: 'partant.draw', val: partant?.draw },
    { name: 'partant.stall', val: partant?.stall },
    { name: 'partant.postPosition', val: partant?.postPosition },
    { name: 'partant.cheval.corde', val: partant?.cheval?.corde },
    { name: 'partant.cheval.numCorde', val: partant?.cheval?.numCorde },
    { name: 'partant.cheval.stalle', val: partant?.cheval?.stalle },
    { name: 'partant.cheval.numStalle', val: partant?.cheval?.numStalle },
    { name: 'partant.cheval.place', val: partant?.cheval?.place },
    { name: 'partant.cheval.placeStalle', val: partant?.cheval?.placeStalle },
    { name: 'partant.cheval.placeCorde', val: partant?.cheval?.placeCorde },
  ];

  for (const field of candidateFields) {
    const rawVal = field.val;
    if (typeof rawVal === 'number' && !isNaN(rawVal) && rawVal > 0 && rawVal <= 30) {
      console.log(`[CORDE-EXTRACTOR-LOG] ✓ Match direct numérique [${field.name}] = ${rawVal} pour N°${partant?.numero || '?'} "${partant?.nom || 'Cheval'}"`);
      return { cordeNumber: rawVal, sourceField: field.name, rawMatchedValue: String(rawVal), isFallback: false };
    }
    if (typeof rawVal === 'string' && rawVal.trim().length > 0) {
      const lower = rawVal.trim().toLowerCase();
      // Ignorer les directions de piste 'gauche' ou 'droite' qui ne sont pas des numéros de corde/stalle de cheval
      if (lower === 'gauche' || lower === 'droite') {
        continue;
      }
      const parsed = parseInt(rawVal.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 30) {
        console.log(`[CORDE-EXTRACTOR-LOG] ✓ Match direct chaîne [${field.name}] = "${rawVal}" -> ${parsed} pour N°${partant?.numero || '?'} "${partant?.nom || 'Cheval'}"`);
        return { cordeNumber: parsed, sourceField: field.name, rawMatchedValue: rawVal, isFallback: false };
      }
    }
  }

  // 2. Extraction par Regex sur la représentation JSON du partant
  const horseJson = typeof partant === 'object' ? JSON.stringify(partant) : String(partant);

  // Modèles de Regex optimisés pour Geny / Paris-Turf / PMU HTML/JSON
  const cordeRegexes: Array<{ label: string; pattern: RegExp }> = [
    { label: 'JSON corde/stalle key', pattern: /"(?:corde|stalle|numCorde|num_corde|numStalle|num_stalle|placeStalle|place_stalle|placeCorde|place_corde|place|numPlace|draw|stall)":\s*"?(\d+)"?/i },
    { label: 'Geny C.N / (C.N)', pattern: /\(?\bC\s*\.\s*(\d+)\)?/i },
    { label: 'Geny (C4) / (C 12)', pattern: /\(\s*C\s*(\d+)\s*\)/i },
    { label: 'Label Corde avec deux-points/N°', pattern: /(?:corde|stalle|place|box)\s*(?::|n°|°)?\s*(\d+)/i },
    { label: 'Label Corde avec parenthèses', pattern: /\((?:corde|stalle|box)\s*(\d+)\)/i },
    { label: 'Label Corde avec crochets', pattern: /\[(?:corde|stalle|box)\s*(\d+)\]/i },
    { label: 'Format Geny Corde (N)', pattern: /corde\s*\(\s*(\d+)\s*\)/i },
    { label: 'Format Paris-Turf St. N', pattern: /\bSt\s*\.\s*(\d+)\b/i },
    { label: 'Format Paris-Turf Stalle N', pattern: /\bstalle\s*(\d+)\b/i },
    { label: 'HTML Table Cell Corde', pattern: /<td[^>]*class="[^"]*(?:corde|stalle)[^"]*"[^>]*>\s*(\d+)\s*<\/td>/i },
    { label: 'HTML Span Class Corde', pattern: /<span[^>]*class="[^"]*(?:corde|stalle)[^"]*"[^>]*>\s*(\d+)\s*<\/span>/i },
  ];

  for (const item of cordeRegexes) {
    const match = horseJson.match(item.pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num <= 30) {
        console.log(`[CORDE-EXTRACTOR-LOG] ✓ Match Regex [${item.label}] -> Corde = ${num} pour N°${partant?.numero || '?'} "${partant?.nom || 'Cheval'}"`);
        return { cordeNumber: num, sourceField: `regex:${item.label}`, rawMatchedValue: match[0], isFallback: false };
      }
    }
  }

  // 2b. Si du texte HTML global a été fourni, chercher UNIQUEMENT dans le bloc contextuel de ce cheval précis
  if (rawHtmlOrText && partant?.nom && typeof rawHtmlOrText === 'string') {
    const horseNameEscaped = partant.nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const horseBlockRegex = new RegExp(`(?:${horseNameEscaped}|\\bN°?\\s*${partant.numero}\\b)[\\s\\S]{0,350}?(?:corde|stalle|\\(C\\.?\\s*)\\s*:?\\s*(\\d+)`, 'i');
    const blockMatch = rawHtmlOrText.match(horseBlockRegex);
    if (blockMatch && blockMatch[1]) {
      const num = parseInt(blockMatch[1], 10);
      if (!isNaN(num) && num > 0 && num <= 30) {
        console.log(`[CORDE-EXTRACTOR-LOG] ✓ Match Bloc Cheval HTML -> Corde = ${num} pour N°${partant?.numero} "${partant.nom}"`);
        return { cordeNumber: num, sourceField: 'html:horse_block', rawMatchedValue: blockMatch[0], isFallback: false };
      }
    }
  }

  // 3. Fallback sécurité : dossard/numéro s'il existe, sinon 1
  const horseNum = typeof partant?.numero === 'number' && partant.numero > 0 ? partant.numero : 1;
  console.log(`[CORDE-EXTRACTOR-LOG] ⚠️ Aucune corde détectée -> Fallback attribué : Corde ${horseNum} pour N°${horseNum} "${partant?.nom || 'Cheval'}"`);
  return { cordeNumber: horseNum, sourceField: 'fallback:numero', rawMatchedValue: String(horseNum), isFallback: true };
}
