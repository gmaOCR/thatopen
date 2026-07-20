#!/usr/bin/env bash
# Déploiement local sur mercure-rpi5 (voie standard) : build arm64 natif,
# push vers le registry local, puis affiche le tag à épingler dans le
# Deployment GitOps (yaml_conf/viewer/viewer-deployment.yaml).
#
# Prérequis : docker connecté au registry (docker login registry.gregorymariani.com).
# Usage : ./scripts/deploy-local.sh
set -euo pipefail

REGISTRY="${REGISTRY:-registry.gregorymariani.com}"
IMAGE="${REGISTRY}/viewer"
TAG="main-$(date -u +'%Y%m%d-%H%M%S')"   # UTC : tags monotones pour l'ImagePolicy Flux

cd "$(dirname "$0")/.."

echo "==> Build ${IMAGE}:${TAG} (+ latest)"
docker build --platform=linux/arm64 -t "${IMAGE}:${TAG}" -t "${IMAGE}:latest" .

echo "==> Push"
docker push "${IMAGE}:${TAG}"
docker push "${IMAGE}:latest"

cat <<EOF

==> Image poussée : ${IMAGE}:${TAG}
    Épingle ce tag dans le repo GitOps :
      yaml_conf/viewer/viewer-deployment.yaml  ->  image: ${IMAGE}:${TAG}
    puis commit/push ; Flux réconciliera (kubectl get kustomization viewer-app -n flux-system).
EOF
