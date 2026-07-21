import type * as OBC from '@thatopen/components';

/** Union de plusieurs ModelIdMap (recherche « nom OU catégorie »). */
export const mergeMaps = (...maps: OBC.ModelIdMap[]): OBC.ModelIdMap => {
  const out: OBC.ModelIdMap = {};
  for (const m of maps)
    for (const [id, set] of Object.entries(m)) {
      const target = (out[id] ??= new Set<number>());
      for (const v of set) target.add(v);
    }
  return out;
};

/** Nombre total de localIds dans un ModelIdMap. */
export const countIds = (map: OBC.ModelIdMap) =>
  Object.values(map).reduce((n, set) => n + set.size, 0);

/** Échappe les métacaractères regex d'une saisie utilisateur libre. */
export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
