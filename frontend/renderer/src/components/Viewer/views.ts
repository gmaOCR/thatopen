// Vues sauvegardées (bookmarks caméra) : position + cible + projection, persistées
// en localStorage. ThatOpen n'a pas de composant « bookmark caméra » — on stocke
// l'état de camera-controls et on le restaure via setLookAt().

export type Projection = 'Perspective' | 'Orthographic';

export interface SavedView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  projection: Projection;
}

const KEY = 'techdata-viewer-saved-views';

const isVec3 = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

/** Garde de type : valide la forme d'une vue désérialisée (données externes). */
export const isSavedView = (v: unknown): v is SavedView => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    isVec3(o.position) &&
    isVec3(o.target) &&
    (o.projection === 'Perspective' || o.projection === 'Orthographic')
  );
};

/** Charge les vues depuis localStorage (robuste : JSON invalide / mode privé → []). */
export const loadSavedViews = (): SavedView[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedView) : [];
  } catch {
    return [];
  }
};

/** Persiste les vues (échec silencieux si quota dépassé / stockage indisponible). */
export const persistSavedViews = (views: SavedView[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(views));
  } catch {
    /* quota / mode privé : la session reste fonctionnelle sans persistance */
  }
};
