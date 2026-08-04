import type * as THREE from 'three';
import { boxesByGuid, diffGuids, findMoved, MOVE_EPSILON } from '../components/Viewer/compare';

// Boîte minimale : findMoved ne lit que min/max (pas de méthode THREE).
const box = (x: number, y = 0, z = 0, size = 1) =>
  ({
    min: { x, y, z },
    max: { x: x + size, y: y + size, z: z + size },
  }) as THREE.Box3;

describe('comparaison de versions', () => {
  test('diffGuids classe ajoutés / supprimés / communs', () => {
    const d = diffGuids(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(d.added).toEqual(['d']);
    expect(d.removed).toEqual(['a']);
    expect(d.common.sort()).toEqual(['b', 'c']);
  });

  test('diffGuids gère les listes vides', () => {
    expect(diffGuids([], ['a'])).toEqual({ added: ['a'], removed: [], common: [] });
    expect(diffGuids(['a'], [])).toEqual({ added: [], removed: ['a'], common: [] });
  });

  test('findMoved détecte un déplacement au-delà de la tolérance', () => {
    const base = new Map([['g', box(0)]]);
    const next = new Map([['g', box(1)]]);
    expect(findMoved(['g'], base, next)).toEqual(['g']);
  });

  test('findMoved ignore le bruit sous la tolérance', () => {
    const base = new Map([['g', box(0)]]);
    const next = new Map([['g', box(MOVE_EPSILON / 2)]]);
    expect(findMoved(['g'], base, next)).toEqual([]);
  });

  test('findMoved détecte un changement de taille à position égale', () => {
    const base = new Map([['g', box(0, 0, 0, 1)]]);
    const next = new Map([['g', box(0, 0, 0, 3)]]);
    expect(findMoved(['g'], base, next)).toEqual(['g']);
  });

  test('findMoved ignore un GUID sans boîte des deux côtés', () => {
    expect(findMoved(['g'], new Map([['g', box(0)]]), new Map())).toEqual([]);
  });

  test('boxesByGuid saute les localIds nuls et garde l’alignement', () => {
    // 'b' n'a pas de localId → getBoxes ne renvoie que les boîtes de 'a' et 'c'.
    const map = boxesByGuid(['a', 'b', 'c'], [1, null, 3], [box(10), box(30)]);
    expect([...map.keys()]).toEqual(['a', 'c']);
    expect(map.get('c')?.min.x).toBe(30);
  });
});
