import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as THREE from "three";
// Worker fragments v3 auto-hébergé (bundlé par Vite → pas de fetch unpkg au runtime).
import fragmentsWorkerUrl from "@thatopen/fragments/worker?url";

/** Monde typé du viewer : scène + caméra ortho/perspective + renderer 2D/postpro.
 *  PostproductionRenderer fournit la couche CSS2D indispensable aux annotations
 *  (mesures, marqueurs) et permet les effets (contours/AO). */
export type ViewerWorld = OBC.SimpleWorld<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>;

export interface ViewerHandle {
  components: OBC.Components;
  world: ViewerWorld;
}

let managersReady = false;

/** Initialise les managers d'UI ThatOpen (idempotent). */
export const initManagers = (): void => {
  if (managersReady) return;
  BUI.Manager.init();
  CUI.Manager.init();
  managersReady = true;
};

/** Crée le monde 3D, initialise le moteur fragments v3 et sa grille. */
export const initRenderer = async (container: HTMLElement): Promise<ViewerHandle> => {
  const components = new OBC.Components();

  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBF.PostproductionRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  // preserveDrawingBuffer: permet la capture d'écran (canvas.toDataURL).
  world.renderer = new OBF.PostproductionRenderer(components, container, {
    preserveDrawingBuffer: true,
  });
  world.camera = new OBC.OrthoPerspectiveCamera(components);

  components.init();

  world.scene.setup();
  world.scene.three.background = new THREE.Color(0x0b1220); // navy TechData
  await world.camera.controls.setLookAt(15, 15, 15, 0, 0, 0);

  components.get(OBC.Grids).create(world);

  // ponytail: postproduction laissée OFF par défaut (le pipeline AO/contours peut
  // masquer une partie des meshes instanciés des fragments). Activable via l'UI
  // (menu Vue → « Rendu avancé »). PostproductionRenderer reste utilisé pour sa
  // couche CSS2D (annotations/mesures).

  // Moteur fragments v3 : charge et affiche les modèles via un worker dédié.
  const fragments = components.get(OBC.FragmentsManager);
  fragments.init(fragmentsWorkerUrl);

  // Recalcul du LOD/culling quand la caméra s'immobilise.
  world.camera.controls.addEventListener("rest", () => {
    void fragments.core.update(true);
  });

  container.style.position = "relative";
  return { components, world };
};

/** Libère toutes les ressources du viewer. */
export const disposeRenderer = (components: OBC.Components): void => {
  components.dispose();
};
