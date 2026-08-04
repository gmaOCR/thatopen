// Comparaison de versions : diff entre deux modèles par GUID IFC (identifiant
// stable d'une révision à l'autre). ThatOpen v3 n'offre aucune API de comparaison,
// d'où ce moteur maison — volontairement en fonctions pures (testables sans moteur 3D).

import type * as THREE from 'three';

export interface GuidDiff {
  /** Présents seulement dans la nouvelle version. */
  added: string[];
  /** Présents seulement dans l'ancienne version. */
  removed: string[];
  /** Présents dans les deux. */
  common: string[];
}

/** Diff ensembliste sur les GUID. */
export const diffGuids = (baseGuids: string[], newGuids: string[]): GuidDiff => {
  const base = new Set(baseGuids);
  const next = new Set(newGuids);
  return {
    added: [...next].filter((g) => !base.has(g)),
    removed: [...base].filter((g) => !next.has(g)),
    common: [...next].filter((g) => base.has(g)),
  };
};

/** Tolérance par défaut (m) : sous ce seuil, un écart n'est pas un déplacement. */
export const MOVE_EPSILON = 0.01;

/**
 * Parmi les GUID communs, ceux dont la géométrie a bougé ou changé de taille.
 * Comparaison sur min/max de la boîte englobante — équivalent à centre+dimensions,
 * mais en simples lectures de propriétés (pas d'appel de méthode THREE), ce qui
 * garde la fonction pure et testable avec de simples objets. Une seule requête
 * batch par modèle (getBoxes), pas d'analyse par élément.
 * Les GUID sans boîte des deux côtés sont ignorés (aucune conclusion possible).
 */
export const findMoved = (
  commonGuids: string[],
  baseBoxes: Map<string, THREE.Box3>,
  newBoxes: Map<string, THREE.Box3>,
  epsilon = MOVE_EPSILON,
): string[] =>
  commonGuids.filter((guid) => {
    const a = baseBoxes.get(guid);
    const b = newBoxes.get(guid);
    if (!a || !b) return false;
    return (
      Math.abs(a.min.x - b.min.x) > epsilon ||
      Math.abs(a.min.y - b.min.y) > epsilon ||
      Math.abs(a.min.z - b.min.z) > epsilon ||
      Math.abs(a.max.x - b.max.x) > epsilon ||
      Math.abs(a.max.y - b.max.y) > epsilon ||
      Math.abs(a.max.z - b.max.z) > epsilon
    );
  });

/** Associe chaque GUID à sa boîte (indices alignés, entrées nulles ignorées). */
export const boxesByGuid = (
  guids: string[],
  localIds: (number | null)[],
  boxes: THREE.Box3[],
): Map<string, THREE.Box3> => {
  const out = new Map<string, THREE.Box3>();
  // getBoxes ne renvoie de boîte que pour les localIds valides, dans le même ordre.
  let cursor = 0;
  for (let i = 0; i < guids.length; i += 1) {
    if (localIds[i] == null) continue;
    const box = boxes[cursor];
    cursor += 1;
    const guid = guids[i];
    if (box && guid) out.set(guid, box);
  }
  return out;
};
