import {
  annotationElement,
  isAnnotation,
  loadAnnotations,
  persistAnnotations,
  type Annotation,
} from '../components/Viewer/annotations';

const annot: Annotation = { id: 'a1', text: 'Fissure mur nord', position: [1, 2, 3] };

describe('annotations 3D', () => {
  beforeEach(() => localStorage.clear());

  test('isAnnotation valide / rejette selon la forme', () => {
    expect(isAnnotation(annot)).toBe(true);
    expect(isAnnotation(null)).toBe(false);
    expect(isAnnotation({ ...annot, position: [1, 2] })).toBe(false);
    expect(isAnnotation({ ...annot, position: [1, 2, Infinity] })).toBe(false);
    expect(isAnnotation({ ...annot, text: 42 })).toBe(false);
  });

  test('persist puis load restitue les annotations', () => {
    persistAnnotations([annot]);
    expect(loadAnnotations()).toEqual([annot]);
  });

  test('load filtre les entrées corrompues et tolère un JSON invalide', () => {
    localStorage.setItem('techdata-viewer-annotations', JSON.stringify([annot, { nope: 1 }]));
    expect(loadAnnotations()).toEqual([annot]);
    localStorage.setItem('techdata-viewer-annotations', '{{');
    expect(loadAnnotations()).toEqual([]);
  });

  test('annotationElement rend le texte sans interpréter de HTML (pas d’injection)', () => {
    const el = annotationElement('<img src=x onerror=alert(1)>');
    expect(el.className).toBe('viewer-annot');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
