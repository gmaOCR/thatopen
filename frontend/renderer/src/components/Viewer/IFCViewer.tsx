import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, ChangeEvent } from 'react';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as CUI from '@thatopen/ui-obc';
import { useRenderer } from '../../hooks/useRenderer';
import { useIFCLoader } from '../../hooks/useIFCLoader';

// ponytail: IFC brut au démarrage ; pré-conversion .frag = optimisation Phase ultérieure.
const DEFAULT_MODEL_URL = '/models/demo.ifc';
const DEFAULT_MODEL_ID = 'Duplex Apartment';

type ItemsUpdate = ReturnType<typeof CUI.tables.itemsData>[1];
type SpatialUpdate = ReturnType<typeof CUI.tables.spatialTree>[1];

interface MenuDef {
  label: string;
  items: { label: string; onClick: () => void; disabled?: boolean }[];
}

const IFCViewer: FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [clipActive, setClipActive] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);

  const { components, world, isInitialized } = useRenderer(containerRef);
  const { loadIFC, loadIFCBuffer, loadedModels } = useIFCLoader(components, world, setIsLoading);
  const defaultLoaded = useRef(false);
  const itemsUpdate = useRef<ItemsUpdate | null>(null);
  const spatialUpdate = useRef<SpatialUpdate | null>(null);

  // --- Panneaux CUI + sélection (une fois le monde prêt) ---
  useEffect(() => {
    if (!isInitialized || !components || !world) return;
    const fragments = components.get(OBC.FragmentsManager);

    // Sélection au clic
    const highlighter = components.get(OBF.Highlighter);
    highlighter.setup({ world });
    const selectName = highlighter.config.selectName;

    // Panneaux prêts (ui-obc)
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

    leftPanelRef.current?.replaceChildren(spatialEl, modelsListEl);
    rightPanelRef.current?.replaceChildren(itemsEl);

    // Sélection -> panneau propriétés
    const events = highlighter.events[selectName];
    const onHighlight = (map: OBC.ModelIdMap) => updateItems({ components, modelIdMap: map });
    const onClear = () => updateItems({ components, modelIdMap: {} });
    events?.onHighlight.add(onHighlight);
    events?.onClear.add(onClear);

    // Rafraîchir l'arbre spatial quand un modèle est chargé
    const refreshTree = () =>
      updateSpatial({
        components,
        models: [...fragments.list.values()],
        selectHighlighterName: selectName,
      });
    fragments.list.onItemSet.add(refreshTree);

    return () => {
      events?.onHighlight.remove(onHighlight);
      events?.onClear.remove(onClear);
      fragments.list.onItemSet.remove(refreshTree);
    };
  }, [isInitialized, components, world]);

  // --- Maquette de démo au démarrage ---
  useEffect(() => {
    if (!isInitialized || !components || defaultLoaded.current) return;
    defaultLoaded.current = true;
    void (async () => {
      try {
        const res = await fetch(DEFAULT_MODEL_URL);
        if (!res.ok) return;
        const buffer = new Uint8Array(await res.arrayBuffer());
        await loadIFCBuffer(buffer, DEFAULT_MODEL_ID);
      } catch (e) {
        console.warn('Maquette de démo indisponible :', e);
      }
    })();
  }, [isInitialized, components, loadIFCBuffer]);

  // --- Outil coupe (Clipper) : double-clic crée, Suppr efface ---
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

  // --- Outil mesure (longueur) : double-clic pose un point ---
  useEffect(() => {
    if (!components || !world) return;
    const container = containerRef.current;
    if (!container) return;
    const dimensions = components.get(OBF.LengthMeasurement);
    dimensions.world = world;
    dimensions.enabled = measureActive;
    if (!measureActive) return;
    const onDblClick = () => void dimensions.create();
    container.addEventListener('dblclick', onDblClick);
    return () => container.removeEventListener('dblclick', onDblClick);
  }, [components, world, measureActive]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await loadIFC(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const recenter = useCallback(() => {
    void world?.camera.controls.setLookAt(15, 15, 15, 0, 0, 0, true);
  }, [world]);

  const topView = useCallback(() => {
    void world?.camera.controls.setLookAt(0, 30, 0, 0, 0, 0, true);
  }, [world]);

  const menus: MenuDef[] = [
    {
      label: 'Fichier',
      items: [
        { label: 'Ouvrir un IFC…', onClick: () => fileInputRef.current?.click() },
        {
          label: 'Recharger la maquette de démo',
          onClick: () => {
            defaultLoaded.current = false;
            setError(null);
            void (async () => {
              const res = await fetch(DEFAULT_MODEL_URL);
              if (res.ok) await loadIFCBuffer(new Uint8Array(await res.arrayBuffer()), DEFAULT_MODEL_ID);
            })();
          },
        },
      ],
    },
    {
      label: 'Vue',
      items: [
        { label: 'Recentrer (iso)', onClick: recenter },
        { label: 'Vue de dessus', onClick: topView },
      ],
    },
    {
      label: 'Outils',
      items: [
        { label: `${clipActive ? '✓ ' : ''}Plan de coupe`, onClick: () => setClipActive((v) => !v) },
        { label: `${measureActive ? '✓ ' : ''}Mesure de longueur`, onClick: () => setMeasureActive((v) => !v) },
      ],
    },
  ];

  return (
    <div className="app-container" onClick={() => openMenu && setOpenMenu(null)}>
      {/* Topbar + menus */}
      <header className="viewer-topbar">
        <span className="viewer-brand">TechData · IFC Viewer</span>
        <nav className="viewer-menus" onClick={(e) => e.stopPropagation()}>
          {menus.map((menu) => (
            <div className="menu" key={menu.label}>
              <button
                className={`menu-btn ${openMenu === menu.label ? 'open' : ''}`}
                onClick={() => setOpenMenu((m) => (m === menu.label ? null : menu.label))}
              >
                {menu.label}
              </button>
              {openMenu === menu.label && (
                <ul className="menu-dropdown">
                  {menu.items.map((item) => (
                    <li key={item.label}>
                      <button
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
        <span className="viewer-status">
          {isLoading ? 'Chargement…' : `${loadedModels.length} modèle(s)`}
        </span>
        {error && <span className="viewer-error">{error}</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ifc"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </header>

      {/* Sidebar gauche : arbre spatial + liste des modèles */}
      <aside className="viewer-left">
        <div className="panel-title">Structure &amp; modèles</div>
        <div ref={leftPanelRef} className="panel-body" />
      </aside>

      {/* Vue 3D */}
      <div ref={containerRef} className="viewer-canvas" />

      {/* Panneau droit : propriétés de la sélection */}
      <aside className="viewer-right">
        <div className="panel-title">Propriétés</div>
        <div ref={rightPanelRef} className="panel-body" />
      </aside>

      {/* Toolbar bas */}
      <footer className="viewer-footer">
        <button className="tool-btn" onClick={recenter}>Recentrer</button>
        <button className={`tool-btn ${clipActive ? 'active' : ''}`} onClick={() => setClipActive((v) => !v)}>
          Coupe
        </button>
        <button className={`tool-btn ${measureActive ? 'active' : ''}`} onClick={() => setMeasureActive((v) => !v)}>
          Mesure
        </button>
        <span className="footer-hint">
          {clipActive || measureActive ? 'Double-clic sur la vue' : 'Duplex Apartment © buildingSMART · CC-BY 4.0'}
        </span>
      </footer>
    </div>
  );
};

export default IFCViewer;
