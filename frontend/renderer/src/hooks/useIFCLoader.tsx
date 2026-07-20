import { useCallback, useEffect, useState } from 'react';
import * as OBC from '@thatopen/components';
import type { FragmentsModel } from '@thatopen/fragments';
import type { ViewerWorld } from '../services/renderer';

export interface LoadedModel {
  id: string;
  model: FragmentsModel;
}

const WASM_PATH = '/wasm/';

/**
 * Chargement de modèles avec le moteur fragments v3.
 * - `loadIFC`/`loadIFCBuffer` : import IFC → fragments (via IfcLoader).
 * - `loadFragments` : chargement direct d'un `.frag` pré-converti.
 * Tout modèle ajouté au moteur est automatiquement monté dans la scène.
 */
export const useIFCLoader = (
  components: OBC.Components | null,
  world: ViewerWorld | null,
  setIsLoading: (loading: boolean) => void,
) => {
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([]);

  useEffect(() => {
    if (!components || !world) return;
    const fragments = components.get(OBC.FragmentsManager);

    const onItemSet = ({ key, value }: { key: string; value: FragmentsModel }) => {
      value.useCamera(world.camera.three);
      world.scene.three.add(value.object);
      void fragments.core.update(true);
      setLoadedModels((prev) =>
        prev.some((m) => m.id === key) ? prev : [...prev, { id: key, model: value }],
      );
    };

    fragments.list.onItemSet.add(onItemSet);
    return () => {
      fragments.list.onItemSet.remove(onItemSet);
    };
  }, [components, world]);

  const loadIFCBuffer = useCallback(
    async (buffer: Uint8Array, id: string) => {
      if (!components) return null;
      setIsLoading(true);
      try {
        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({ autoSetWasm: false, wasm: { path: WASM_PATH, absolute: true } });
        return await ifcLoader.load(buffer, true, id);
      } finally {
        setIsLoading(false);
      }
    },
    [components, setIsLoading],
  );

  const loadIFC = useCallback(
    async (file: File) => {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const id = file.name.replace(/\.ifc$/i, '') || 'model';
      return loadIFCBuffer(buffer, id);
    },
    [loadIFCBuffer],
  );

  const loadFragments = useCallback(
    async (buffer: ArrayBuffer, id: string) => {
      if (!components) return null;
      setIsLoading(true);
      try {
        const fragments = components.get(OBC.FragmentsManager);
        return await fragments.core.load(buffer, { modelId: id, camera: world?.camera.three });
      } finally {
        setIsLoading(false);
      }
    },
    [components, world, setIsLoading],
  );

  const removeModel = useCallback(
    async (id: string) => {
      if (!components || !world) return;
      const fragments = components.get(OBC.FragmentsManager);
      const entry = loadedModels.find((m) => m.id === id);
      if (entry) world.scene.three.remove(entry.model.object);
      await fragments.core.disposeModel(id);
      setLoadedModels((prev) => prev.filter((m) => m.id !== id));
    },
    [components, world, loadedModels],
  );

  return { loadIFC, loadIFCBuffer, loadFragments, removeModel, loadedModels };
};
