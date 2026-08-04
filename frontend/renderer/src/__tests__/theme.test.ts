import { applyTheme, initialTheme } from '../services/theme';

describe('theme (clair / sombre)', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  test('applyTheme pose data-theme sur <html> et persiste le choix', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(initialTheme()).toBe('light');
  });

  test('sombre par défaut (identité TechData) sans choix explicite', () => {
    expect(initialTheme()).toBe('dark');
  });

  test('le clair reste un choix explicite, non imposé par le réglage OS', () => {
    // prefers-color-scheme: light ne doit PAS basculer une vitrine sombre.
    window.matchMedia = ((q: string) => ({ matches: true, media: q })) as typeof window.matchMedia;
    expect(initialTheme()).toBe('dark');
  });

  test('une valeur de stockage invalide est ignorée', () => {
    localStorage.setItem('techdata-viewer-theme', 'fluo');
    expect(initialTheme()).toBe('dark');
  });
});
