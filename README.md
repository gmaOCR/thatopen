# TechData · IFC Viewer

Visualiseur IFC (BIM) web basé sur **ThatOpen Engine v3** et **Three.js**, déployé sur
**https://viewer.techdata.solutions**.

## Fonctionnalités

- Chargement de fichiers **IFC** (conversion en *fragments* v3) + **maquette de démo** au démarrage.
- Layout applicatif : topbar + menus, sidebar (arbre spatial + liste des modèles), panneau propriétés, toolbar.
- **Sélection** au clic (propriétés) et **survol** ; arbre spatial synchronisé.
- **Outils** : plan de coupe, mesures (longueur / surface / angle / volume).
- **Visibilité** : isoler / masquer la sélection / tout afficher.
- **Vue** : ajuster, recentrer, vue de dessus, projection ortho/perspective, rendu avancé (postproduction), plein écran.
- **Export** : capture PNG, modèle `.frag`, propriétés de la sélection (JSON).
- **Raccourcis clavier** : `F` ajuster · `R` recentrer · `P` projection · `C` coupe · `M` mesure · `I` isoler · `Échap` annuler.

## Stack

React 19 · Vite 7 · TypeScript · `@thatopen/{components,components-front,ui,ui-obc,fragments}` 3.4.x · three 0.185 · web-ifc 0.0.77.
Servi par Caddy (image ARM64), déployé en GitOps (Flux) sur le homelab.

⚠️ **Versions figées** : l'API `@thatopen/*` casse entre mineures — ne pas mettre à jour sans revalider. Voir [`CLAUDE.md`](CLAUDE.md).

## Développement

```bash
cd frontend/renderer
npm install
npm run dev        # http://localhost:3000 (Vite) — la maquette de démo se charge automatiquement
npm run build      # build de prod -> dist/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --write
npm test           # tests unitaires (Vitest)
```

## Structure

```
frontend/renderer/
  src/
    App.tsx                          point d'entrée (ErrorBoundary + IFCViewer en lazy)
    components/Viewer/IFCViewer.tsx  layout + orchestration (menus, outils, panneaux)
    components/ErrorBoundary.tsx
    hooks/                           useRenderer, useIFCLoader
    services/renderer.tsx            monde 3D v3 (fragments worker, postproduction)
  public/wasm/                       web-ifc.wasm
  public/models/                     demo.ifc (+ ATTRIBUTION.txt)
  Dockerfile                         build Vite -> Caddy
```

## Licence

Code sous [MIT](LICENSE). Maquette de démo « Medical-Dental Clinic » © buildingSMART, **CC-BY 4.0**
(cf. `frontend/renderer/public/models/ATTRIBUTION.txt`).
