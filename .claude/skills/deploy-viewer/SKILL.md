---
name: deploy-viewer
description: Déployer le viewer IFC sur le homelab (build image arm64 → registry → PR GitOps kubernetes → Flux → tunnel/DNS). À utiliser pour publier une nouvelle version sur viewer.techdata.solutions.
---

# Déployer le viewer (homelab GitOps)

## 1. Image
```bash
cd frontend/renderer
./scripts/deploy-local.sh      # build arm64 + push registry.gregorymariani.com/viewer:main-<UTC-ts>
```
Note le tag affiché.

## 2. GitOps (repo gmaOCR/kubernetes)
Dans un worktree de `~/kubernetes` :
- `yaml_conf/viewer/{viewer-deployment,viewer-service,viewer-ingress,viewer-caddy-config}.yaml` (modèle : app `cv`).
- Épingle l'image : `image: registry.gregorymariani.com/viewer:<tag>` (pas d'ImagePolicy → évite le wedge image-reflector).
- `yaml_conf/flux-system/kustomizations/viewer-app-kustomization.yaml` (path `./yaml_conf/viewer`) **et** ajoute-la à la liste `resources:` de `yaml_conf/flux-system/kustomization.yaml`.
- `kubectl apply --dry-run=client -f` pour valider, commit, push, `gh pr create --draft`.
- Merge → Flux reconcilie (`flux reconcile kustomization flux-system --with-source` pour forcer).

## 3. Réseau (sudo — utilisateur)
Dans `/etc/cloudflared/config.yml`, avant le catch-all 404 :
```yaml
  - hostname: viewer.techdata.solutions
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
```
puis :
```bash
sudo systemctl restart cloudflared
cloudflared tunnel route dns k8s-mercure viewer.techdata.solutions
```
TLS émis automatiquement par cert-manager (letsencrypt-prod, HTTP-01).

## Vérifier
```bash
kubectl -n default get deploy,svc,ingress -l app=viewer
kubectl get certificate viewer-techdata-solutions-tls
curl -sI https://viewer.techdata.solutions/     # attendu : HTTP 200 + TLS valide
```
