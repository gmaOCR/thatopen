# Viewer IFC TechData — guide projet

Viewer IFC web (BIM) basé sur **ThatOpen Engine v3** + **React 18/19** + **Vite**.
Code : `frontend/renderer/`. Publié sur **https://viewer.techdata.solutions** (homelab mercure-rpi5, GitOps Flux).

## Commandes (dans `frontend/renderer/`)
```bash
npm install
npm run dev        # serveur de dev (Vite, :3000)
npm run build      # build de prod -> dist/
npm run typecheck  # tsc --noEmit -p tsconfig.app.json
npm run lint       # eslint
npm test           # jest
```

## Stack — FIGÉE (ne pas bumper à la légère)
`@thatopen/components|components-front|ui|ui-obc|fragments` **3.4.x**, `three` 0.185,
`web-ifc` 0.0.77, `camera-controls` 3.1.2, React 19, Vite 7.
⚠️ L'API `@thatopen/*` change **entre mineures** : ne pas mettre à jour sans relire les
types installés (`node_modules/@thatopen/*/dist/index.d.ts`) et revalider `build+typecheck+test`.

## Pièges ThatOpen v3 (≠ v2)
- Moteur *fragments* réécrit : **plus de** `FragmentsGroup`, `IfcStreamer`, `IfcGeometryTiler`,
  `Classifier.byEntity/byPredefinedType`, `fragments.groups`, `onFragmentsLoaded` (v2 → supprimés).
- Worker fragments **auto-hébergé** via `import url from "@thatopen/fragments/worker?url"` puis
  `fragments.init(url)` (évite le fetch unpkg au runtime). Alternative : `OBC.FragmentsManager.getWorker()`.
- WASM web-ifc servi localement depuis `public/wasm/` → `ifcLoader.setup({ autoSetWasm:false, wasm:{ path:"/wasm/", absolute:true } })`.
- Chargement : `ifcLoader.load(buffer, coordinate, name)` (IFC→fragments) ou `fragments.core.load(buffer,{modelId,camera})` (.frag).
  Les modèles se **montent dans la scène** via l'event `fragments.list.onItemSet` (`model.useCamera`, `scene.three.add(model.object)`, `fragments.core.update(true)`).
- Sélection : `OBF.Highlighter` (`setup({world})`, `events[selectName].onHighlight/onClear` → `ModelIdMap`).
- Panneaux prêts : `CUI.tables.spatialTree`, `tables.modelsList`, `tables.itemsData` ; `BUI.Manager.init()` + `CUI.Manager.init()` requis.

## Maquette par défaut
`public/models/demo.ifc` = buildingSMART **Duplex Apartment**, licence **CC-BY 4.0** (cf `public/models/ATTRIBUTION.txt`). Créditer.

## Déploiement (homelab GitOps, modèle app `cv`)
1. Build+push : `frontend/renderer/scripts/deploy-local.sh` → `registry.gregorymariani.com/viewer:main-<UTC-ts>`.
2. GitOps : repo **gmaOCR/kubernetes**, dossier `yaml_conf/viewer/` (deployment/service/ingress/caddy-config) + `yaml_conf/flux-system/kustomizations/viewer-app-kustomization.yaml` **listé dans** `yaml_conf/flux-system/kustomization.yaml` (sinon Flux l'ignore). Épingler le tag image (pas d'ImagePolicy → évite le wedge image-reflector).
3. Réseau (sudo) : bloc `hostname: viewer.techdata.solutions` dans `/etc/cloudflared/config.yml` + `sudo systemctl restart cloudflared`, puis `cloudflared tunnel route dns k8s-mercure viewer.techdata.solutions`.
4. TLS auto via cert-manager (`letsencrypt-prod`, HTTP-01).

Voir `.claude/skills/deploy-viewer/`.
