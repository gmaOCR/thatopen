import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, ChangeEvent } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as CUI from '@thatopen/ui-obc';
import { useRenderer } from '../../hooks/useRenderer';
import { useIFCLoader } from '../../hooks/useIFCLoader';

// ponytail: IFC brut au démarrage ; pré-conversion .frag = optimisation ultérieure.
const DEFAULT_MODEL_URL = '/models/demo.ifc';
const DEFAULT_MODEL_ID = 'Clinique médicale (démo)';
const DEFAULT_FRAG_URL = '/models/demo.frag';

type ItemsUpdate = ReturnType<typeof CUI.tables.itemsData>[1];
type SpatialUpdate = ReturnType<typeof CUI.tables.spatialTree>[1];

interface MenuDef {
  label: string;
  items: { label: string; onClick: () => void; disabled?: boolean; title?: string }[];
}

type MeasureMode = 'none' | 'length' | 'area' | 'angle' | 'volume';

const MEASURE_TOOLS = {
  length: OBF.LengthMeasurement,
  area: OBF.AreaMeasurement,
  angle: OBF.AngleMeasurement,
  volume: OBF.VolumeMeasurement,
} as const;

const MEASURE_LABELS: Record<Exclude<MeasureMode, 'none'>, string> = {
  length: 'Mesure longueur',
  area: 'Mesure surface',
  angle: 'Mesure angle',
  volume: 'Mesure volume',
};

const hasSelection = (map: OBC.ModelIdMap) => Object.keys(map).length > 0;

const download = (href: string, name: string) => {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
};

const IFCViewer: FC = () => {
  const appRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bcfInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'error' | 'info' }[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [clipActive, setClipActive] = useState(false);
  const [measureMode, setMeasureMode] = useState<MeasureMode>('none');
  const [advancedRender, setAdvancedRender] = useState(false);
  const [floorViews, setFloorViews] = useState<string[]>([]);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const { components, world, isInitialized } = useRenderer(containerRef);
  const { loadIFC, loadIFCBuffer, loadFragments, loadedModels } = useIFCLoader(
    components,
    world,
    setIsLoading,
    setProgress,
  );
  const defaultLoaded = useRef(false);
  const fittedOnce = useRef(false);
  const selectionRef = useRef<OBC.ModelIdMap>({});
  const itemsUpdate = useRef<ItemsUpdate | null>(null);
  const spatialUpdate = useRef<SpatialUpdate | null>(null);
  const toastId = useRef(0);

  const pushToast = useCallback((msg: string, type: 'error' | 'info' = 'info') => {
    const id = (toastId.current += 1);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // --- Panneaux CUI + sélection + survol ---
  useEffect(() => {
    if (!isInitialized || !components || !world) return;
    const fragments = components.get(OBC.FragmentsManager);

    const highlighter = components.get(OBF.Highlighter);
    highlighter.setup({ world });
    const selectName = highlighter.config.selectName;

    const hoverer = components.get(OBF.Hoverer);
    hoverer.world = world;
    hoverer.enabled = true;

    const [modelsListEl] = CUI.tables.modelsList(
      { components, actions: { visibility: true, dispose: true } },
      true,
    );
    const [spatialEl, updateSpatial] = CUI.tables.spatialTree(
      { components, models: [...fragments.list.values()], selectHighlighterName: selectName },
      true,
    );
    const [itemsEl, updateItems] = CUI.tables.itemsData({ components, modelIdMap: {} });
    spatialUpdate.current = updateSpatial;
    itemsUpdate.current = updateItems;

    // BCF (collaboration) : topics + points de vue capturés depuis la caméra.
    components.get(OBC.BCFTopics).setup();
    components.get(OBC.Viewpoints).world = world;
    const [topicsEl] = CUI.tables.topicsList({ components }, true);

    leftPanelRef.current?.replaceChildren(spatialEl, modelsListEl, topicsEl);
    rightPanelRef.current?.replaceChildren(itemsEl);

    const events = highlighter.events[selectName];
    const onHighlight = (map: OBC.ModelIdMap) => {
      selectionRef.current = map;
      updateItems({ components, modelIdMap: map });
    };
    const onClear = () => {
      selectionRef.current = {};
      updateItems({ components, modelIdMap: {} });
    };
    events?.onHighlight.add(onHighlight);
    events?.onClear.add(onClear);

    const refreshTree = () =>
      updateSpatial({
        components,
        models: [...fragments.list.values()],
        selectHighlighterName: selectName,
      });
    fragments.list.onItemSet.add(refreshTree);

    return () => {
      hoverer.enabled = false;
      events?.onHighlight.remove(onHighlight);
      events?.onClear.remove(onClear);
      fragments.list.onItemSet.remove(refreshTree);
    };
  }, [isInitialized, components, world]);

  // Charge la maquette de démo : .frag pré-converti (instantané) si présent,
  // sinon l'IFC brut (parsé au runtime).
  const loadDemo = useCallback(async () => {
    try {
      const frag = await fetch(DEFAULT_FRAG_URL);
      if (frag.ok) {
        await loadFragments(await frag.arrayBuffer(), DEFAULT_MODEL_ID);
        return;
      }
      const ifc = await fetch(DEFAULT_MODEL_URL);
      if (ifc.ok) await loadIFCBuffer(new Uint8Array(await ifc.arrayBuffer()), DEFAULT_MODEL_ID);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Maquette de démo indisponible', 'error');
    }
  }, [loadFragments, loadIFCBuffer, pushToast]);

  // --- Maquette de démo au démarrage ---
  useEffect(() => {
    if (!isInitialized || !components || defaultLoaded.current) return;
    defaultLoaded.current = true;
    void loadDemo();
  }, [isInitialized, components, loadDemo]);

  const fitView = useCallback(() => {
    if (!world || loadedModels.length === 0) return;
    const box = new THREE.Box3();
    for (const { model } of loadedModels) box.expandByObject(model.object);
    if (!box.isEmpty()) void world.camera.controls.fitToBox(box, true);
  }, [world, loadedModels]);

  // --- Chargement complet (force toutes les tuiles) puis, sur le 1er modèle :
  //     aligne sa base sur la grille (y=0), le centre en x/z, et cadre la vue.
  //     `update(true)` résout quand toute la géométrie est chargée -> bbox fiable. ---
  useEffect(() => {
    if (!components || !world || loadedModels.length === 0) return;
    const fragments = components.get(OBC.FragmentsManager);
    let cancelled = false;
    void fragments.core.update(true).then(async () => {
      if (cancelled || fittedOnce.current) return;
      fittedOnce.current = true;
      const first = loadedModels[0]?.model;
      if (first) {
        // Box du moteur fragments (fiable) — setFromObject sous-évalue min.y sur des
        // meshes instanciés streamés, d'où la base qui passait un peu sous la grille.
        const box = first.box;
        if (box && !box.isEmpty()) {
          const c = box.getCenter(new THREE.Vector3());
          first.object.position.x -= c.x; // centré sur l'origine
          first.object.position.z -= c.z;
          first.object.position.y -= box.min.y; // base posée sur la grille (y=0)
          first.object.updateMatrixWorld(true);
        }
      }
      fitView();
      // Génère un plan 2D par IfcBuildingStorey (navigation par étage).
      try {
        const views = components.get(OBC.Views);
        views.world = world;
        const created = await views.createFromIfcStoreys();
        if (!cancelled) setFloorViews(created.map((v) => v.id));
      } catch (e) {
        console.warn("Plans d'étage indisponibles :", e);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadedModels, components, world, fitView]);

  // --- Outil coupe (Clipper) ---
  useEffect(() => {
    if (!components || !world) return;
    const container = containerRef.current;
    if (!container) return;
    const clipper = components.get(OBC.Clipper);
    clipper.setup();
    clipper.enabled = clipActive;
    if (!clipActive) return;
    const onDblClick = () => void clipper.create(world);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Delete' || e.code === 'Backspace') void clipper.delete(world);
    };
    container.addEventListener('dblclick', onDblClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [components, world, clipActive]);

  // --- Outils mesure (longueur / surface / angle / volume) ---
  //     Double-clic = pose un point / valide ; Suppr = efface sous le curseur.
  useEffect(() => {
    if (!components || !world || measureMode === 'none') return;
    const container = containerRef.current;
    if (!container) return;
    // get() renvoie le singleton correspondant à la classe passée ; le cast
    // unifie juste le type (world/enabled/create/delete sont communs à toutes).
    const tool = components.get(MEASURE_TOOLS[measureMode] as typeof OBF.LengthMeasurement);
    tool.world = world;
    tool.enabled = true;
    const onDblClick = () => void tool.create();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Delete' || e.code === 'Backspace') void tool.delete();
    };
    container.addEventListener('dblclick', onDblClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKeyDown);
      tool.enabled = false;
    };
  }, [components, world, measureMode]);

  // --- Interaction tactile (mobile) : un tap = sélection, ou pose un point si un
  //     outil (coupe/mesure) est actif. Le desktop garde le clic/double-clic natif.
  //     (camera-controls gère déjà pan/zoom/rotate tactile ; le raycast lit la
  //     position du tap — seul le déclencheur souris manque au tactile.) ---
  useEffect(() => {
    if (!components || !world) return;
    const el = world.renderer?.three.domElement;
    if (!el) return;
    const highlighter = components.get(OBF.Highlighter);
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8) return; // déplacement (pan), pas un tap
      if (clipActive) {
        void components.get(OBC.Clipper).create(world);
      } else if (measureMode !== 'none') {
        void components.get(MEASURE_TOOLS[measureMode] as typeof OBF.LengthMeasurement).create();
      } else {
        void highlighter.highlight(highlighter.config.selectName);
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [components, world, clipActive, measureMode]);

  const toggleMeasure = useCallback(
    (m: Exclude<MeasureMode, 'none'>) => setMeasureMode((cur) => (cur === m ? 'none' : m)),
    [],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadIFC(file);
      pushToast('Modèle chargé', 'info');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erreur de chargement', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Contrôles de vue ---
  const recenter = useCallback(() => {
    void world?.camera.controls.setLookAt(15, 15, 15, 0, 0, 0, true);
  }, [world]);

  const topView = useCallback(() => {
    void world?.camera.controls.setLookAt(0, 30, 0, 0, 0, 0, true);
  }, [world]);

  const toggleProjection = useCallback(() => {
    if (!world) return;
    const next = world.camera.projection.current === 'Perspective' ? 'Orthographic' : 'Perspective';
    void world.camera.projection.set(next);
  }, [world]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) void appRef.current?.requestFullscreen();
    else void document.exitFullscreen();
  }, []);

  const toggleAdvancedRender = useCallback(() => {
    const renderer = world?.renderer;
    if (!renderer) return;
    try {
      const on = !advancedRender;
      renderer.postproduction.enabled = on;
      setAdvancedRender(on);
    } catch (e) {
      console.warn('Rendu avancé indisponible :', e);
    }
  }, [world, advancedRender]);

  // --- Visibilité (Hider) ---
  const hideSelection = useCallback(() => {
    if (!components || !hasSelection(selectionRef.current)) return;
    void components.get(OBC.Hider).set(false, selectionRef.current);
  }, [components]);

  const isolateSelection = useCallback(() => {
    if (!components || !hasSelection(selectionRef.current)) return;
    void components.get(OBC.Hider).isolate(selectionRef.current);
  }, [components]);

  const showAll = useCallback(() => {
    if (!components) return;
    void components.get(OBC.Hider).set(true);
  }, [components]);

  // --- Export ---
  const screenshot = useCallback(() => {
    const canvas = world?.renderer?.three.domElement;
    if (!canvas) return;
    download(canvas.toDataURL('image/png'), 'techdata-viewer.png');
    pushToast('Capture enregistrée', 'info');
  }, [world, pushToast]);

  const exportModel = useCallback(async () => {
    const entry = loadedModels[0];
    if (!entry) return;
    const buffer = await entry.model.getBuffer(false);
    const url = URL.createObjectURL(new Blob([buffer]));
    download(url, `${entry.id}.frag`);
    URL.revokeObjectURL(url);
    pushToast('Modèle exporté (.frag)', 'info');
  }, [loadedModels, pushToast]);

  const exportProperties = useCallback(async () => {
    if (!components || !hasSelection(selectionRef.current)) return;
    try {
      const data = await components.get(OBC.FragmentsManager).getData(selectionRef.current);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      download(url, 'proprietes.json');
      URL.revokeObjectURL(url);
      pushToast('Propriétés exportées', 'info');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Export des propriétés impossible', 'error');
    }
  }, [components, pushToast]);

  // --- BCF (topics / points de vue / commentaires) ---
  const newTopic = useCallback(() => {
    if (!components || !world) return;
    const title = window.prompt('Titre du topic BCF :');
    if (!title) return;
    const viewpoints = components.get(OBC.Viewpoints);
    viewpoints.world = world;
    const vp = viewpoints.create(); // capture la vue (caméra) courante
    const topic = components.get(OBC.BCFTopics).create({ title });
    topic.viewpoints.add(vp.guid);
    const comment = window.prompt('Commentaire (optionnel) :');
    if (comment) topic.createComment(comment, vp.guid);
    pushToast('Topic BCF créé', 'info');
  }, [components, world, pushToast]);

  const exportBCF = useCallback(async () => {
    if (!components) return;
    const bcf = components.get(OBC.BCFTopics);
    if ([...bcf.list.values()].length === 0) {
      pushToast('Aucun topic BCF à exporter', 'error');
      return;
    }
    const blob = await bcf.export();
    const url = URL.createObjectURL(blob);
    download(url, 'topics.bcf');
    URL.revokeObjectURL(url);
    pushToast('BCF exporté', 'info');
  }, [components, pushToast]);

  const importBCF = useCallback(
    async (file: File) => {
      if (!components) return;
      try {
        const buffer = new Uint8Array(await file.arrayBuffer());
        await components.get(OBC.BCFTopics).load(buffer);
        pushToast('BCF importé', 'info');
      } catch (e) {
        pushToast(e instanceof Error ? e.message : 'Import BCF impossible', 'error');
      }
    },
    [components, pushToast],
  );

  const reloadDemo = useCallback(() => {
    fittedOnce.current = false;
    void loadDemo();
  }, [loadDemo]);

  // --- Raccourcis clavier (ignorés quand on tape dans un champ) ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      switch (e.key.toLowerCase()) {
        case 'f': fitView(); break;
        case 'r': recenter(); break;
        case 'p': toggleProjection(); break;
        case 'c': setClipActive((v) => !v); break;
        case 'm': toggleMeasure('length'); break;
        case 'i': isolateSelection(); break;
        case 'escape': setOpenMenu(null); setClipActive(false); setMeasureMode('none'); setHelpOpen(false); break;
        default: return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitView, recenter, toggleProjection, toggleMeasure, isolateSelection]);

  // Ferme le menu ouvert au clic en dehors (a11y : pas de handler sur un div statique).
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.viewer-menus')) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);

  const menus: MenuDef[] = [
    {
      label: 'Fichier',
      items: [
        {
          label: 'Ouvrir un IFC…',
          onClick: () => fileInputRef.current?.click(),
          title: 'Charger un fichier .ifc depuis votre ordinateur',
        },
        {
          label: 'Recharger la maquette de démo',
          onClick: reloadDemo,
          title: 'Recharge la clinique médicale de démonstration',
        },
      ],
    },
    {
      label: 'Vue',
      items: [
        { label: 'Ajuster à la vue', onClick: fitView, title: 'Cadre la caméra sur tout le modèle (F)' },
        { label: 'Recentrer (iso)', onClick: recenter, title: 'Replace la caméra en vue isométrique (R)' },
        { label: 'Vue de dessus', onClick: topView, title: 'Vue en plan, depuis le dessus' },
        {
          label: 'Projection ortho / perspective',
          onClick: toggleProjection,
          title: 'Bascule perspective ↔ orthographique (P)',
        },
        {
          label: `${advancedRender ? '✓ ' : ''}Rendu avancé (contours/AO)`,
          onClick: toggleAdvancedRender,
          title: 'Contours + occlusion ambiante (peut masquer des meshes selon le GPU)',
        },
        { label: 'Plein écran', onClick: toggleFullscreen, title: 'Bascule en plein écran' },
      ],
    },
    {
      label: 'Étages',
      items:
        floorViews.length > 0
          ? [
              ...floorViews.map((id) => ({
                label: id,
                onClick: () => components?.get(OBC.Views).open(id),
              })),
              { label: '↩ Retour vue 3D', onClick: () => components?.get(OBC.Views).close() },
            ]
          : [{ label: 'Aucun étage détecté', onClick: () => {}, disabled: true }],
    },
    {
      label: 'Visibilité',
      items: [
        {
          label: 'Isoler la sélection',
          onClick: isolateSelection,
          title: 'N’afficher que les éléments sélectionnés (I)',
        },
        {
          label: 'Masquer la sélection',
          onClick: hideSelection,
          title: 'Masquer les éléments sélectionnés',
        },
        { label: 'Tout afficher', onClick: showAll, title: 'Réafficher tous les éléments masqués' },
      ],
    },
    {
      label: 'Export',
      items: [
        {
          label: "Capture d'écran (PNG)",
          onClick: screenshot,
          title: 'Enregistrer la vue courante en image PNG',
        },
        {
          label: 'Exporter le modèle (.frag)',
          onClick: () => void exportModel(),
          title: 'Télécharger le modèle au format fragments (.frag)',
        },
        {
          label: 'Exporter les propriétés (JSON)',
          onClick: () => void exportProperties(),
          title: 'Télécharger les propriétés de la sélection en JSON',
        },
      ],
    },
    {
      label: 'BCF',
      items: [
        {
          label: 'Nouveau topic (vue courante)',
          onClick: newTopic,
          title: 'Créer un topic BCF avec un point de vue capturé depuis la caméra',
        },
        {
          label: 'Importer .bcf…',
          onClick: () => bcfInputRef.current?.click(),
          title: 'Charger un fichier d’échange BCF',
        },
        {
          label: 'Exporter .bcf',
          onClick: () => void exportBCF(),
          title: 'Télécharger tous les topics au format BCF',
        },
      ],
    },
    {
      label: 'Outils',
      items: [
        {
          label: `${clipActive ? '✓ ' : ''}Plan de coupe`,
          onClick: () => setClipActive((v) => !v),
          title: 'Active la coupe, puis double-clic (ou tap) sur le modèle pour poser un plan ; Suppr pour l’effacer (C)',
        },
        ...(Object.keys(MEASURE_LABELS) as Exclude<MeasureMode, 'none'>[]).map((m) => ({
          label: `${measureMode === m ? '✓ ' : ''}${MEASURE_LABELS[m]}`,
          onClick: () => toggleMeasure(m),
          title: 'Active l’outil, puis double-clic (ou tap) pour poser des points ; Suppr pour effacer',
        })),
      ],
    },
  ];

  return (
    <div
      className={`app-container${leftOpen ? ' left-open' : ''}${rightOpen ? ' right-open' : ''}`}
      ref={appRef}
    >
      <header className="viewer-topbar">
        <span className="viewer-brand">TechData · IFC Viewer</span>
        <button
          className="drawer-btn"
          aria-label="Panneaux structure et modèles"
          title="Structure & modèles"
          onClick={() => {
            setRightOpen(false);
            setLeftOpen((v) => !v);
          }}
        >
          ☰
        </button>
        <button
          className="drawer-btn"
          aria-label="Panneau propriétés"
          title="Propriétés de la sélection"
          onClick={() => {
            setLeftOpen(false);
            setRightOpen((v) => !v);
          }}
        >
          ⓘ
        </button>
        <nav className="viewer-menus">
          {menus.map((menu) => (
            <div className="menu" key={menu.label}>
              <button
                className={`menu-btn ${openMenu === menu.label ? 'open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={openMenu === menu.label}
                onClick={() => setOpenMenu((m) => (m === menu.label ? null : menu.label))}
              >
                {menu.label}
              </button>
              {openMenu === menu.label && (
                <ul className="menu-dropdown" role="menu">
                  {menu.items.map((item) => (
                    <li key={item.label} role="none">
                      <button
                        role="menuitem"
                        title={item.title}
                        onClick={() => {
                          item.onClick();
                          setOpenMenu(null);
                        }}
                        disabled={item.disabled}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
        <button
          className="help-btn"
          aria-label="Aide : navigation 3D"
          title="Aide : comment naviguer et utiliser les outils"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((v) => !v)}
        >
          ?
        </button>
        <span className="viewer-status">
          {isLoading
            ? `Chargement…${progress > 0 ? ` ${Math.round(progress * 100)}%` : ''}`
            : `${loadedModels.length} modèle(s)`}
        </span>
        <input ref={fileInputRef} type="file" accept=".ifc" onChange={handleFileChange} style={{ display: 'none' }} />
        <input
          ref={bcfInputRef}
          type="file"
          accept=".bcf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importBCF(f);
            if (bcfInputRef.current) bcfInputRef.current.value = '';
          }}
          style={{ display: 'none' }}
        />
      </header>

      {isLoading && (
        <div
          className="viewer-loading"
          role="progressbar"
          aria-label="Chargement du modèle"
          aria-valuenow={Math.round(progress * 100)}
        >
          <span
            className="viewer-loading-bar"
            style={progress > 0 ? { width: `${Math.round(progress * 100)}%` } : undefined}
          />
        </div>
      )}

      <aside className="viewer-left">
        <div className="panel-title">Structure &amp; modèles</div>
        <div ref={leftPanelRef} className="panel-body" />
      </aside>

      <div ref={containerRef} className="viewer-canvas" />

      <aside className="viewer-right">
        <div className="panel-title">Propriétés</div>
        <div ref={rightPanelRef} className="panel-body" />
      </aside>

      <footer className="viewer-footer">
        <button className="tool-btn" title="Cadrer la caméra sur tout le modèle (F)" onClick={fitView}>Ajuster</button>
        <button className="tool-btn" title="Vue isométrique (R)" onClick={recenter}>Recentrer</button>
        <button className={`tool-btn ${clipActive ? 'active' : ''}`} aria-pressed={clipActive} title="Plan de coupe : double-clic (tap) sur le modèle, Suppr pour effacer (C)" onClick={() => setClipActive((v) => !v)}>Coupe</button>
        <button className={`tool-btn ${measureMode === 'length' ? 'active' : ''}`} aria-pressed={measureMode === 'length'} title="Mesure de distance : double-clic (tap) pour poser deux points (M)" onClick={() => toggleMeasure('length')}>Mesure</button>
        <button className="tool-btn" title="N’afficher que la sélection (I)" onClick={isolateSelection}>Isoler</button>
        <button className="tool-btn" title="Réafficher tous les éléments masqués" onClick={showAll}>Tout afficher</button>
        <span className="footer-hint">
          {clipActive || measureMode !== 'none'
            ? 'Double-clic / tap sur la vue'
            : 'Clinique médicale © buildingSMART · CC-BY 4.0'}
        </span>
      </footer>

      {helpOpen && (
        <>
          <button
            className="help-backdrop"
            aria-label="Fermer l’aide"
            onClick={() => setHelpOpen(false)}
          />
          <div className="viewer-help" role="dialog" aria-modal="true" aria-label="Aide navigation 3D">
            <div className="help-head">
              <span>Naviguer &amp; interagir</span>
              <button className="help-close" aria-label="Fermer l’aide" onClick={() => setHelpOpen(false)}>
                ✕
              </button>
            </div>
            <dl className="help-list">
              <div>
                <dt>Rotation</dt>
                <dd>Clic gauche + glisser · 1 doigt</dd>
              </div>
              <div>
                <dt>Panoramique</dt>
                <dd>Clic droit + glisser · 2 doigts</dd>
              </div>
              <div>
                <dt>Zoom</dt>
                <dd>Molette · pincer</dd>
              </div>
              <div>
                <dt>Sélectionner</dt>
                <dd>Clic sur un élément · tap</dd>
              </div>
              <div>
                <dt>Coupe / Mesure</dt>
                <dd>Activer l’outil, puis double-clic (tap) pour poser un point · Suppr pour effacer</dd>
              </div>
            </dl>
            <div className="help-keys">
              <span><kbd>F</kbd> ajuster</span>
              <span><kbd>R</kbd> recentrer</span>
              <span><kbd>P</kbd> projection</span>
              <span><kbd>C</kbd> coupe</span>
              <span><kbd>M</kbd> mesure</span>
              <span><kbd>I</kbd> isoler</span>
              <span><kbd>Échap</kbd> annuler</span>
            </div>
          </div>
        </>
      )}

      {toasts.length > 0 && (
        <div className="viewer-toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
          ))}
        </div>
      )}

      {(leftOpen || rightOpen) && (
        <button
          className="drawer-backdrop"
          aria-label="Fermer les panneaux"
          onClick={() => {
            setLeftOpen(false);
            setRightOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default IFCViewer;
