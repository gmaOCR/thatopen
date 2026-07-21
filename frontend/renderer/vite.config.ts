import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'TechData · IFC Viewer',
        short_name: 'IFC Viewer',
        description: 'Visualiseur IFC (BIM) TechData',
        lang: 'fr',
        display: 'standalone',
        start_url: '/',
        background_color: '#060b16',
        theme_color: '#0b1220',
        // ponytail: icône SVG (une seule source). PNG 192/512 + maskable = polish
        // (nécessite un rasteriseur, absent ici) — à générer via @vite-pwa/assets-generator.
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // Précache l'app + le moteur 3D (three/@thatopen/web-ifc/worker/wasm) pour l'offline.
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // chunks 3D > défaut 2 MiB
        // Les modèles (.ifc/.frag) ne sont PAS précachés (trop gros) : cache au runtime.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\.(?:ifc|frag)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ifc-models',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          thatopen: [
            '@thatopen/components',
            '@thatopen/components-front',
            '@thatopen/ui',
            '@thatopen/ui-obc',
            '@thatopen/fragments',
          ],
          webifc: ['web-ifc'],
        },
      },
    },
    chunkSizeWarningLimit: 4000,
  },
})
