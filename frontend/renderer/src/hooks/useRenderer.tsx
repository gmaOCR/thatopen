import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import * as OBC from '@thatopen/components';
import { initRenderer, disposeRenderer, initManagers } from '../services/renderer';
import type { ViewerWorld } from '../services/renderer';

interface RendererState {
  components: OBC.Components | null;
  world: ViewerWorld | null;
  isInitialized: boolean;
}

/** Monte le monde 3D dans le conteneur référencé et expose components/world. */
export const useRenderer = (containerRef: RefObject<HTMLElement | null>): RendererState => {
  const [state, setState] = useState<RendererState>({
    components: null,
    world: null,
    isInitialized: false,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    initManagers();

    let created: OBC.Components | null = null;
    let cancelled = false;

    initRenderer(el)
      .then(({ components, world }) => {
        created = components;
        if (cancelled) {
          disposeRenderer(components);
          return;
        }
        setState({ components, world, isInitialized: true });
      })
      .catch((e) => console.error("Échec de l'initialisation du renderer :", e));

    return () => {
      cancelled = true;
      if (created) disposeRenderer(created);
    };
  }, [containerRef]);

  return state;
};
