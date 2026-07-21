import { renderHook, act, waitFor } from '@testing-library/react';

// Mock léger de @thatopen/components : uniquement les clés utilisées par le hook.
// (les symboles sont créés dans la factory pour respecter le hoisting de jest.mock)
jest.mock('@thatopen/components', () => ({
  __esModule: true,
  FragmentsManager: Symbol('FragmentsManager'),
  IfcLoader: Symbol('IfcLoader'),
}));

import * as OBC from '@thatopen/components';
import { useIFCLoader } from '../hooks/useIFCLoader';
import type { ViewerWorld } from '../services/renderer';

type OnItemSet = (e: { key: string; value: unknown }) => void;

const makeEnv = () => {
  const handlers: OnItemSet[] = [];
  const fragments = {
    list: {
      onItemSet: {
        add: (h: OnItemSet) => handlers.push(h),
        remove: (h: OnItemSet) => {
          const i = handlers.indexOf(h);
          if (i >= 0) handlers.splice(i, 1);
        },
      },
    },
    core: {
      load: jest.fn().mockResolvedValue({ modelId: 'x' }),
      update: jest.fn().mockResolvedValue(undefined),
      disposeModel: jest.fn().mockResolvedValue(undefined),
    },
  };
  const ifcLoader = {
    setup: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue({ modelId: 'demo' }),
  };
  const components = {
    get: (key: unknown) => (key === OBC.FragmentsManager ? fragments : ifcLoader),
  } as unknown as OBC.Components;
  const world = {
    camera: { three: {} },
    scene: { three: { add: jest.fn(), remove: jest.fn() } },
  } as unknown as ViewerWorld;
  return { handlers, fragments, ifcLoader, components, world };
};

describe('useIFCLoader (v3)', () => {
  it('configure le wasm et importe le buffer IFC via IfcLoader', async () => {
    const { components, world, ifcLoader } = makeEnv();
    const onProgress = jest.fn();
    const { result } = renderHook(() => useIFCLoader(components, world, () => {}, onProgress));

    await act(async () => {
      await result.current.loadIFCBuffer(new Uint8Array([1, 2, 3]), 'demo');
    });

    expect(ifcLoader.setup).toHaveBeenCalledWith(
      expect.objectContaining({ autoSetWasm: false, wasm: { path: '/wasm/', absolute: true } }),
    );
    expect(ifcLoader.load).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      true,
      'demo',
      expect.any(Object),
    );
    expect(onProgress).toHaveBeenCalledWith(0);
    expect(onProgress).toHaveBeenCalledWith(1);
  });

  it('monte dans la scène et suit tout modèle ajouté au moteur', async () => {
    const { components, world, handlers } = makeEnv();
    const { result } = renderHook(() => useIFCLoader(components, world, () => {}));

    expect(handlers).toHaveLength(1); // l'effet a bien abonné onItemSet
    act(() => {
      handlers[0]({ key: 'demo', value: { useCamera: jest.fn(), object: {} } });
    });

    await waitFor(() => expect(result.current.loadedModels).toHaveLength(1));
    expect(result.current.loadedModels[0].id).toBe('demo');
    expect(world.scene.three.add).toHaveBeenCalled();
  });
});
