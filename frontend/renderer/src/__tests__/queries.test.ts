import { mergeMaps, countIds, escapeRegExp } from '../components/Viewer/queries';

describe('queries (recherche / filtre)', () => {
  test('mergeMaps unionne les ModelIdMap par modèle (sans doublon)', () => {
    const a = { m1: new Set([1, 2]) };
    const b = { m1: new Set([2, 3]), m2: new Set([9]) };
    const r = mergeMaps(a, b);
    expect([...r.m1].sort((x, y) => x - y)).toEqual([1, 2, 3]);
    expect([...r.m2]).toEqual([9]);
    expect(countIds(r)).toBe(4);
  });

  test('countIds compte 0 sur une map vide', () => {
    expect(countIds({})).toBe(0);
  });

  test('escapeRegExp neutralise les métacaractères saisis', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
    expect(new RegExp(escapeRegExp('IfcWall(1)'), 'i').test('ifcwall(1)')).toBe(true);
  });
});
