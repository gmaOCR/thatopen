import { isSavedView, loadSavedViews, persistSavedViews, type SavedView } from '../components/Viewer/views';

const view: SavedView = {
  id: 'a',
  name: 'Entrée',
  position: [1, 2, 3],
  target: [0, 0, 0],
  projection: 'Perspective',
};

describe('views (vues sauvegardées)', () => {
  beforeEach(() => localStorage.clear());

  test('isSavedView valide une vue bien formée', () => {
    expect(isSavedView(view)).toBe(true);
  });

  test('isSavedView rejette les formes invalides', () => {
    expect(isSavedView(null)).toBe(false);
    expect(isSavedView({ ...view, position: [1, 2] })).toBe(false); // vec3 incomplet
    expect(isSavedView({ ...view, projection: 'Iso' })).toBe(false); // projection inconnue
    expect(isSavedView({ ...view, position: [1, 2, NaN] })).toBe(false); // non fini
  });

  test('persist puis load restitue les vues', () => {
    persistSavedViews([view]);
    expect(loadSavedViews()).toEqual([view]);
  });

  test('load filtre les entrées corrompues et tolère un JSON invalide', () => {
    localStorage.setItem('techdata-viewer-saved-views', JSON.stringify([view, { junk: true }]));
    expect(loadSavedViews()).toEqual([view]);
    localStorage.setItem('techdata-viewer-saved-views', 'pas du json');
    expect(loadSavedViews()).toEqual([]);
  });
});
