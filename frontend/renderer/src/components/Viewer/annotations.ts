// Annotations 3D : notes ancrées à un point de la maquette, persistées localement.
// Rendu via OBF.Marker (labels CSS2D fournis par PostproductionRenderer).

export interface Annotation {
  id: string;
  text: string;
  position: [number, number, number];
}

const KEY = 'techdata-viewer-annotations';

const isVec3 = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

/** Garde de type : valide une annotation désérialisée (données externes). */
export const isAnnotation = (v: unknown): v is Annotation => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.text === 'string' && isVec3(o.position);
};

/** Charge les annotations (JSON invalide / stockage indisponible → []). */
export const loadAnnotations = (): Annotation[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAnnotation) : [];
  } catch {
    return [];
  }
};

/** Persiste les annotations (échec silencieux : quota / mode privé). */
export const persistAnnotations = (items: Annotation[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* la session reste fonctionnelle sans persistance */
  }
};

/** Élément DOM d'un marqueur (CSS2D). Le style vit dans App.css (.viewer-annot). */
export const annotationElement = (text: string): HTMLElement => {
  const el = document.createElement('div');
  el.className = 'viewer-annot';
  el.textContent = text;
  el.title = text;
  return el;
};
