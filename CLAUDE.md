# Viewer IFC TechData — guide projet

Viewer IFC web (BIM) basé sur **ThatOpen Engine v3** + **React 19** + **Vite 7**.
Code : `frontend/renderer/`. Publié sur **https://viewer.techdata.solutions** (homelab mercure-rpi5, GitOps Flux).

## Commandes (dans `frontend/renderer/`)
```bash
npm install
npm run dev        # serveur de dev (Vite, :3000)
npm run build      # build de prod -> dist/
npm run typecheck  # tsc --noEmit -p tsconfig.app.json
npm run lint       # eslint (dont jsx-a11y)
npm run format     # prettier --write
npm test           # jest
```
Avant tout commit/déploiement : `npm run typecheck && npm run lint && npm test && npm run build` (skill `release-check`).

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
- Renderer : **`OBF.PostproductionRenderer`** (PAS `SimpleRenderer`) — couche CSS2D indispensable aux mesures + `preserveDrawingBuffer:true` pour la capture PNG ; postproduction (contours/AO) en option (menu Vue, défaut OFF car peut masquer des meshes instanciés selon le GPU).
- Sélection : `OBF.Highlighter` (`setup({world})`, `events[selectName].onHighlight/onClear` → `ModelIdMap`) ; survol `OBF.Hoverer` ; visibilité `OBC.Hider` ; mesures `OBF.{Length,Area,Angle,Volume}Measurement`.
- Panneaux prêts : `CUI.tables.spatialTree`, `tables.modelsList`, `tables.itemsData` ; `BUI.Manager.init()` + `CUI.Manager.init()` requis.

## Maquette par défaut
`public/models/demo.frag` (pré-converti depuis `demo.ifc` via `scripts/convert-ifc.mjs`) = buildingSMART **Clinique médicale/dentaire** (Clinic_Architectural), licence **CC-BY 4.0** (cf `public/models/ATTRIBUTION.txt`). Créditer. Chargé au démarrage en `.frag` (instantané), fallback `.ifc`.

## Déploiement (homelab GitOps, modèle app `cv`)
1. Build+push : `frontend/renderer/scripts/deploy-local.sh` → `registry.gregorymariani.com/viewer:main-<UTC-ts>`.
2. GitOps : repo **gmaOCR/kubernetes**, dossier `yaml_conf/viewer/` (deployment/service/ingress/caddy-config) + `yaml_conf/flux-system/kustomizations/viewer-app-kustomization.yaml` **listé dans** `yaml_conf/flux-system/kustomization.yaml` (sinon Flux l'ignore). Épingler le tag image (pas d'ImagePolicy → évite le wedge image-reflector).
3. Réseau (sudo) : bloc `hostname: viewer.techdata.solutions` dans `/etc/cloudflared/config.yml` + `sudo systemctl restart cloudflared`, puis `cloudflared tunnel route dns k8s-mercure viewer.techdata.solutions`.
4. TLS auto via cert-manager (`letsencrypt-prod`, HTTP-01).

Voir `.claude/skills/deploy-viewer/`.

## Source Flux (infra) — HTTPS
La `GitRepository` flux-system est en **HTTPS** (`https://github.com/gmaOCR/kubernetes`, secret `flux-system-https`, `timeout: 180s`) : le clone **SSH** depuis le pod source-controller timeoutait (`context deadline exceeded`). **Ne pas revenir à SSH.** Détails : mémoire `flux-gitrepository-timeout`.

## Backlog durcissement (audit 2026-07-21 — différé, non bloquant)
- **Tests** : migrer Jest → **Vitest** (natif Vite) + élargir la couverture (recentrage, raccourcis, toasts, `ErrorBoundary`).
- **tsconfig strict+** : activer `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (corriger la cascade d'erreurs).
- **CSP** : le Caddyfile pose `Content-Security-Policy-Report-Only` → passer en enforce après validation navigateur ; **répliquer les en-têtes de sécurité dans le ConfigMap k8s `viewer-caddy-config`** (le Caddyfile de l'image n'est qu'un défaut, remplacé en cluster).
- **Docker** : épingler `node`/`caddy` par digest (Renovate) + `USER` non-root (vérifier l'accès `/data` de caddy).
- **Perf gros modèles** : pré-convertir `demo.ifc` → `demo.frag` (serializer offline) et charger via `loadFragments` (démarrage instantané + streaming/LOD). L'IFC brut est chargé intégralement en mémoire → non viable au-delà de ~centaines de Mo.
- **COOP/COEP** : requis pour le web-ifc multithread (SharedArrayBuffer) ; sinon le mono-thread suffit (`web-ifc-mt.wasm` retiré).
- **Pre-commit** : `simple-git-hooks` + `lint-staged` (typecheck+lint sur le staged).
