// Thème clair / sombre : le CSS est piloté par data-theme sur <html> (cf. index.css).
// Choix explicite persisté ; sinon on suit la préférence système.

export type Theme = 'dark' | 'light';

const KEY = 'techdata-viewer-theme';

/** Thème initial : choix persisté, sinon sombre.
 *  ponytail: on NE suit PAS prefers-color-scheme — le viewer est une vitrine dont
 *  l'identité TechData est sombre ; le clair (extérieur/plein soleil) est un choix
 *  explicite de l'utilisateur, pas le réglage OS d'un visiteur de passage. */
export const initialTheme = (): Theme => {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

/** Applique le thème au document et le persiste (échec de stockage non bloquant). */
export const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* mode privé / quota : la session reste fonctionnelle sans persistance */
  }
};

/** Couleur de fond de la scène 3D lue depuis les tokens CSS (--td-scene-bg). */
export const sceneBackground = (): string =>
  getComputedStyle(document.documentElement).getPropertyValue('--td-scene-bg').trim() || '#0b1220';
