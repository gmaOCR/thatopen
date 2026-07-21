import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  build: {
    // Vendor chunks séparés : cache long-terme (les libs changent moins que l'app)
    // et chargement parallèle. Le moteur BIM reste lourd (3D + wasm) par nature.
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
