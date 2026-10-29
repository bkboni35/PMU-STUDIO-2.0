/**
 * MODULE D'ENGAGEMENT ET RÉFÉRENTIEL DES JOCKEYS & DRIVERS GENY
 * Répertorie et déduplique les professionnels du jour et multi-jours (Geny.com)
 * Structure canonique : actor_id_geny, nom_affiche, nom_normalise, type_actor, discipline, url_source, first_seen, last_seen
 */

export interface GenyActorRecord {
  actor_id_geny: string;
  nom_affiche: string;
  nom_normalise: string;
  type_actor: 'jockey' | 'driver';
  discipline: 'attele' | 'monte' | 'plat' | 'obstacle' | string;
  meeting?: string;
  url_source: string;
  first_seen: string; // YYYY-MM-DD
  last_seen: string; // YYYY-MM-DD
}

/**
 * Normalise un nom d'acteur selon la convention NFKD Upper case
 */
export function normalizeGenyActorName(value: string): string {
  if (!value) return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Base de démonstration canonique d'acteurs Geny du jour et récents
 */
export const SAMPLE_GENY_ACTORS_REGISTRY: GenyActorRecord[] = [
  {
    actor_id_geny: 'GENY_1008703_ERIC_RAFFIN',
    nom_affiche: 'Éric Raffin',
    nom_normalise: 'ERIC RAFFIN',
    type_actor: 'driver',
    discipline: 'attele',
    meeting: 'R1',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-01',
    last_seen: '2026-10-18',
  },
  {
    actor_id_geny: 'GENY_1009102_ALEXANDRE_ABRIVARD',
    nom_affiche: 'Alexandre Abrivard',
    nom_normalise: 'ALEXANDRE ABRIVARD',
    type_actor: 'driver',
    discipline: 'attele',
    meeting: 'R3',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-01',
    last_seen: '2026-10-18',
  },
  {
    actor_id_geny: 'GENY_1007821_ANTHONY_BARRIER',
    nom_affiche: 'Anthony Barrier',
    nom_normalise: 'ANTHONY BARRIER',
    type_actor: 'driver',
    discipline: 'attele',
    meeting: 'R3',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-02',
    last_seen: '2026-10-18',
  },
  {
    actor_id_geny: 'GENY_1005510_THEO_BACHELOT',
    nom_affiche: 'Théo Bachelot',
    nom_normalise: 'THEO BACHELOT',
    type_actor: 'jockey',
    discipline: 'plat',
    meeting: 'R1',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-01',
    last_seen: '2026-10-18',
  },
  {
    actor_id_geny: 'GENY_1004419_MAXIME_GUYON',
    nom_affiche: 'Maxime Guyon',
    nom_normalise: 'MAXIME GUYON',
    type_actor: 'jockey',
    discipline: 'plat',
    meeting: 'R1',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-01',
    last_seen: '2026-10-18',
  },
  {
    actor_id_geny: 'GENY_1003322_CHRISTOPHE_SOUMILLON',
    nom_affiche: 'Christophe Soumillon',
    nom_normalise: 'CHRISTOPHE SOUMILLON',
    type_actor: 'jockey',
    discipline: 'plat',
    meeting: 'R2',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-01',
    last_seen: '2026-10-18',
  },
  {
    actor_id_geny: 'GENY_1002211_ANTOINE_ORANI',
    nom_affiche: 'A. Orani',
    nom_normalise: 'A ORANI',
    type_actor: 'jockey',
    discipline: 'plat',
    meeting: 'R6',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-05',
    last_seen: '2026-10-18',
  },
  {
    actor_id_geny: 'GENY_1001100_JEAN_MICHEL_BAZIRE',
    nom_affiche: 'Jean-Michel Bazire',
    nom_normalise: 'JEAN MICHEL BAZIRE',
    type_actor: 'driver',
    discipline: 'attele',
    meeting: 'R3',
    url_source: 'https://www.geny.com/jockeys/2026-10-18',
    first_seen: '2026-10-01',
    last_seen: '2026-10-18',
  },
];

/**
 * Déduplique une liste brute de paires { name, meeting, discipline, date }
 */
export function deduplicateGenyActors(
  records: Array<{ name: string; meeting?: string; discipline: string; date: string }>
): GenyActorRecord[] {
  const map = new Map<string, GenyActorRecord>();

  for (const r of records) {
    const norm = normalizeGenyActorName(r.name);
    const key = `${norm}|${r.discipline.toLowerCase()}`;
    const type_actor = ['attele', 'monte', 'trot'].includes(r.discipline.toLowerCase())
      ? 'driver'
      : 'jockey';
    const actor_id_geny = `GENY_${norm.replace(/\s+/g, '_')}_${r.discipline.toUpperCase()}`;
    const url_source = `https://www.geny.com/jockeys/${r.date}`;

    if (!map.has(key)) {
      map.set(key, {
        actor_id_geny,
        nom_affiche: r.name,
        nom_normalise: norm,
        type_actor,
        discipline: r.discipline,
        meeting: r.meeting,
        url_source,
        first_seen: r.date,
        last_seen: r.date,
      });
    } else {
      const existing = map.get(key)!;
      existing.last_seen = r.date > existing.last_seen ? r.date : existing.last_seen;
      existing.first_seen = r.date < existing.first_seen ? r.date : existing.first_seen;
      if (r.meeting) existing.meeting = r.meeting;
    }
  }

  return Array.from(map.values());
}

/**
 * Génère le contenu CSV complet du référentiel dédupliqué
 */
export function generateGenyActorsCsv(actors: GenyActorRecord[]): string {
  const headers = [
    'actor_id_geny',
    'nom_affiche',
    'nom_normalise',
    'type_actor',
    'discipline',
    'url_source',
    'first_seen',
    'last_seen',
  ];

  const lines = [headers.join(',')];
  for (const a of actors) {
    lines.push(
      [
        a.actor_id_geny,
        `"${a.nom_affiche.replace(/"/g, '""')}"`,
        `"${a.nom_normalise}"`,
        a.type_actor,
        a.discipline,
        a.url_source,
        a.first_seen,
        a.last_seen,
      ].join(',')
    );
  }

  return lines.join('\n');
}
