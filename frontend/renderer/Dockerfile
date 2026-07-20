# Dockerfile multi-stage — viewer IFC (Vite/React) servi par Caddy, ARM64 pour K8s.

# Stage 1 : build de la SPA
FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app

# Dépendances (couche cache)
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit && npm cache clean --force

# Build
COPY . .
RUN npm run build && rm -rf node_modules

# Stage 2 : service statique avec Caddy (léger, sans npm)
FROM --platform=linux/arm64 caddy:2-alpine

WORKDIR /srv
COPY --from=builder /app/dist /srv

# Caddyfile par défaut — SPA : fallback vers index.html + MIME wasm (web-ifc).
# En cluster, ce fichier est remplacé par le ConfigMap viewer-caddy-config.
RUN printf '%s\n' \
    '{' \
    '    auto_https off' \
    '}' \
    '' \
    ':3000 {' \
    '    root * /srv' \
    '    encode gzip' \
    '' \
    '    @wasm path *.wasm' \
    '    header @wasm Content-Type application/wasm' \
    '' \
    '    @assets path /assets/*' \
    '    header @assets Cache-Control "public, max-age=31536000, immutable"' \
    '    @html path *.html /' \
    '    header @html Cache-Control "no-cache"' \
    '' \
    '    try_files {path} /index.html' \
    '    file_server' \
    '}' > /etc/caddy/Caddyfile

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
