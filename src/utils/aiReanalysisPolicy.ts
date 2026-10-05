/**
 * POLITIQUE DE DÉCLENCHEMENT INTELLIGENT DE L'ANALYSE IA
 * 
 * L'analyse IA n'est actualisée QUE SI l'une des 5 conditions majeures est remplie :
 * 1. Un non-partant apparaît (nouveau forfait détecté) ;
 * 2. Le marché change fortement (variation de cote significative |Δ%| >= seuil) ;
 * 3. Une information sportive importante est modifiée (driver, ferrure, terrain, équipement) ;
 * 4. L'arrivée officielle est publiée (déclenchement de l'audit post-course) ;
 * 5. Le dernier rapport date de plus de X minutes (expiration du TTL de fraîcheur).
 */

export interface HorseSportingData {
  driver?: string;
  ferrure?: string;
  equipement?: string;
  poids?: number;
}

export interface CourseStateSnapshot {
  courseId: string;
  timestampIso: string;
  nonPartants: number[];
  cotes: Record<number, number>; // numero -> cote numérique
  drivers: Record<number, string>; // numero -> driver/jockey
  ferrures: Record<number, string>; // numero -> ferrure (D4, DP, DA, etc.)
  equipements?: Record<number, string>; // numero -> oeillères, etc.
  terrain?: string;
  statutCourse?: string;
  arriveeOfficielle?: string;
  isOfficialArrivalPublished?: boolean;
  rapportDerniereAnalyseIso?: string;
}

export interface ReanalysisDecision {
  shouldReanalyze: boolean;
  reasons: string[];
  matchedTriggers: {
    nonPartantApparu: boolean;
    marcheChangeFortement: boolean;
    informationSportiveModifiee: boolean;
    arriveeOfficiellePubliee: boolean;
    ttlExpire: boolean;
  };
  details: {
    nouveauxNonPartants: number[];
    variationsSignificatives: Array<{
      numero: number;
      ancienneCote: number;
      nouvelleCote: number;
      deltaPercent: number;
    }>;
    modificationsSportives: string[];
    minutesDepuisDernierRapport: number | null;
    seuilTtlMinutes: number;
    seuilMarchePercent: number;
  };
}

export interface PolicyOptions {
  maxTtlMinutes?: number; // Défaut : 120 minutes (matinée) ou 30 minutes (approche du départ)
  strongMarketDeltaPercent?: number; // Défaut : 25% de variation de cote
  nowIso?: string;
}

/**
 * Évalue si une nouvelle analyse IA doit être déclenchée
 */
export function shouldTriggerAiAnalysis(
  previousSnapshot: CourseStateSnapshot | null | undefined,
  currentSnapshot: CourseStateSnapshot,
  options: PolicyOptions = {}
): ReanalysisDecision {
  const maxTtlMinutes = options.maxTtlMinutes ?? 120;
  const strongMarketDeltaPercent = options.strongMarketDeltaPercent ?? 25;
  const now = options.nowIso ? new Date(options.nowIso) : new Date();

  // Initialisation du bilan
  const reasons: string[] = [];
  const nouveauxNonPartants: number[] = [];
  const variationsSignificatives: Array<{
    numero: number;
    ancienneCote: number;
    nouvelleCote: number;
    deltaPercent: number;
  }> = [];
  const modificationsSportives: string[] = [];

  const matched = {
    nonPartantApparu: false,
    marcheChangeFortement: false,
    informationSportiveModifiee: false,
    arriveeOfficiellePubliee: false,
    ttlExpire: false,
  };

  // Si aucun snapshot précédent n'existe, c'est l'analyse initiale obligatoire
  if (!previousSnapshot) {
    return {
      shouldReanalyze: true,
      reasons: ["Analyse initiale obligatoire (premier relevé de la course)."],
      matchedTriggers: {
        ...matched,
        ttlExpire: true,
      },
      details: {
        nouveauxNonPartants: [],
        variationsSignificatives: [],
        modificationsSportives: [],
        minutesDepuisDernierRapport: null,
        seuilTtlMinutes: maxTtlMinutes,
        seuilMarchePercent: strongMarketDeltaPercent,
      },
    };
  }

  // 1. DÉTECTION NON-PARTANT
  const prevNpSet = new Set(previousSnapshot.nonPartants || []);
  const currentNp = currentSnapshot.nonPartants || [];
  for (const num of currentNp) {
    if (!prevNpSet.has(num)) {
      nouveauxNonPartants.push(num);
    }
  }
  if (nouveauxNonPartants.length > 0) {
    matched.nonPartantApparu = true;
    reasons.push(
      `Nouveau(x) non-partant(s) détecté(s) : N°${nouveauxNonPartants.join(', N°')} (recalcul obligatoire des quotas).`
    );
  }

  // 2. VARIATION FORTE DU MARCHÉ (|Δ%| >= seuil)
  const prevCotes = previousSnapshot.cotes || {};
  const currentCotes = currentSnapshot.cotes || {};
  for (const [strNum, currVal] of Object.entries(currentCotes)) {
    const num = parseInt(strNum, 10);
    const prevVal = prevCotes[num];
    if (prevVal && currVal && prevVal > 0 && currVal > 0) {
      const deltaPercent = Number((((currVal - prevVal) / prevVal) * 100).toFixed(1));
      if (Math.abs(deltaPercent) >= strongMarketDeltaPercent) {
        variationsSignificatives.push({
          numero: num,
          ancienneCote: prevVal,
          nouvelleCote: currVal,
          deltaPercent,
        });
      }
    }
  }
  if (variationsSignificatives.length > 0) {
    matched.marcheChangeFortement = true;
    const desc = variationsSignificatives
      .map(
        (v) =>
          `N°${v.numero} (${v.ancienneCote}/1 → ${v.nouvelleCote}/1, ${v.deltaPercent > 0 ? '+' : ''}${v.deltaPercent}%)`
      )
      .join(', ');
    reasons.push(`Forte variation de marché détectée sur : ${desc}.`);
  }

  // 3. INFORMATION SPORTIVE IMPORTANTE MODIFIÉE
  // a) Drivers / Jockeys
  const prevDrivers = previousSnapshot.drivers || {};
  const currDrivers = currentSnapshot.drivers || {};
  for (const [strNum, currD] of Object.entries(currDrivers)) {
    const num = parseInt(strNum, 10);
    const prevD = prevDrivers[num];
    if (prevD && currD && prevD.trim().toLowerCase() !== currD.trim().toLowerCase()) {
      modificationsSportives.push(`Changement de pilote sur le N°${num} : ${prevD} → ${currD}`);
    }
  }

  // b) Ferrures (crucial en trot)
  const prevFerr = previousSnapshot.ferrures || {};
  const currFerr = currentSnapshot.ferrures || {};
  for (const [strNum, currF] of Object.entries(currFerr)) {
    const num = parseInt(strNum, 10);
    const prevF = prevFerr[num];
    if (prevF && currF && prevF.trim().toUpperCase() !== currF.trim().toUpperCase()) {
      modificationsSportives.push(`Modification de ferrure sur le N°${num} : ${prevF} → ${currF}`);
    }
  }

  // c) État du terrain
  if (
    previousSnapshot.terrain &&
    currentSnapshot.terrain &&
    previousSnapshot.terrain.trim().toLowerCase() !== currentSnapshot.terrain.trim().toLowerCase()
  ) {
    modificationsSportives.push(
      `Évolution de l'état du terrain : ${previousSnapshot.terrain} → ${currentSnapshot.terrain}`
    );
  }

  if (modificationsSportives.length > 0) {
    matched.informationSportiveModifiee = true;
    reasons.push(`Informations sportives majeures modifiées : ${modificationsSportives.join(' ; ')}.`);
  }

  // 4. PUBLICATION DE L'ARRIVÉE OFFICIELLE
  const prevOfficial =
    previousSnapshot.isOfficialArrivalPublished ||
    previousSnapshot.statutCourse?.toLowerCase().includes('officielle');
  const currentOfficial =
    currentSnapshot.isOfficialArrivalPublished ||
    currentSnapshot.statutCourse?.toLowerCase().includes('officielle') ||
    Boolean(currentSnapshot.arriveeOfficielle && !currentSnapshot.statutCourse?.toLowerCase().includes('provisoire'));

  if (!prevOfficial && currentOfficial) {
    matched.arriveeOfficiellePubliee = true;
    reasons.push(
      `L'arrivée officielle a été certifiée par les commissaires (Ordre : ${currentSnapshot.arriveeOfficielle || 'Disponible'}). Déclenchement de l'audit post-course.`
    );
  }

  // 5. EXPIRATION DU TTL DU DERNIER RAPPORT (Fraîcheur > X minutes)
  let minutesDepuisDernierRapport: number | null = null;
  const lastReportIso = currentSnapshot.rapportDerniereAnalyseIso || previousSnapshot.rapportDerniereAnalyseIso;
  if (lastReportIso) {
    const lastDate = new Date(lastReportIso);
    if (!isNaN(lastDate.getTime())) {
      const diffMs = now.getTime() - lastDate.getTime();
      minutesDepuisDernierRapport = Math.max(0, Math.floor(diffMs / (60 * 1000)));
      if (minutesDepuisDernierRapport >= maxTtlMinutes) {
        matched.ttlExpire = true;
        reasons.push(
          `Délai de fraîcheur expiré : le dernier rapport date de ${minutesDepuisDernierRapport} min (seuil maximal : ${maxTtlMinutes} min).`
        );
      }
    }
  } else {
    // Aucun horodatage de rapport trouvé
    matched.ttlExpire = true;
    reasons.push("Aucun rapport horodaté préalable : actualisation de routine requise.");
  }

  const shouldReanalyze =
    matched.nonPartantApparu ||
    matched.marcheChangeFortement ||
    matched.informationSportiveModifiee ||
    matched.arriveeOfficiellePubliee ||
    matched.ttlExpire;

  return {
    shouldReanalyze,
    reasons,
    matchedTriggers: matched,
    details: {
      nouveauxNonPartants,
      variationsSignificatives,
      modificationsSportives,
      minutesDepuisDernierRapport,
      seuilTtlMinutes: maxTtlMinutes,
      seuilMarchePercent: strongMarketDeltaPercent,
    },
  };
}
