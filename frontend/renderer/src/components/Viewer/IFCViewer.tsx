import { useEffect, useRef, useState } from 'react';
import type { FC, ChangeEvent } from 'react';
import { useRenderer } from '../../hooks/useRenderer';
import { useIFCLoader } from '../../hooks/useIFCLoader';

// ponytail: IFC brut chargé au démarrage ; pré-conversion en .frag prévue en Phase A
// pour un chargement instantané. Absence de fichier => démarrage sans maquette (pas d'erreur).
const DEFAULT_MODEL_URL = '/models/demo.ifc';
const DEFAULT_MODEL_ID = 'demo';

/**
 * Viewer v3 minimal (socle de la refonte UX Phase A) : monde 3D plein écran,
 * chargement de la maquette de démo au démarrage + ouverture d'un IFC utilisateur.
 */
const IFCViewer: FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { components, world, isInitialized } = useRenderer(containerRef);
  const { loadIFC, loadIFCBuffer, loadedModels } = useIFCLoader(components, world, setIsLoading);
  const defaultLoaded = useRef(false);

  // Chargement de la maquette de démo au démarrage (si le fichier est présent).
  useEffect(() => {
    if (!isInitialized || !components || defaultLoaded.current) return;
    defaultLoaded.current = true;
    void (async () => {
      try {
        const res = await fetch(DEFAULT_MODEL_URL);
        if (!res.ok) return; // aucune maquette par défaut fournie
        const buffer = new Uint8Array(await res.arrayBuffer());
        await loadIFCBuffer(buffer, DEFAULT_MODEL_ID);
      } catch (e) {
        console.warn('Maquette de démo indisponible :', e);
      }
    })();
  }, [isInitialized, components, loadIFCBuffer]);

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

  return (
    <div className="app-container">
      <div ref={containerRef} className="viewer-canvas" />

      {/* Barre d'outils minimale — remplacée par le layout BUI complet en Phase A. */}
      <div className="viewer-topbar">
        <span className="viewer-brand">TechData · IFC Viewer</span>
        <label className="viewer-btn">
          Ouvrir un IFC
          <input
            ref={fileInputRef}
            type="file"
            accept=".ifc"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
        <span className="viewer-status">
          {isLoading ? 'Chargement…' : `${loadedModels.length} modèle(s)`}
        </span>
        {error && <span className="viewer-error">{error}</span>}
      </div>
    </div>
  );
};

export default IFCViewer;
