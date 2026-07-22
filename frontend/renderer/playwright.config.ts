import { defineConfig, devices } from '@playwright/test';

// Tests E2E tactiles/mobiles : le seul moyen automatisé d'affirmer les interactions
// touch + WebGL (sélection, coupe, mesure) que Jest/jsdom ne peuvent pas couvrir.
// Serveur : `npm run dev` (Vite :3000), démarré automatiquement.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    // Port dédié + strict : 3000 est parfois squatté par d'autres services homelab.
    baseURL: 'http://localhost:4319',
    trace: 'on-first-retry',
    // WebGL headless via le GPU réel : ANGLE sur GLES/EGL pilote le VideoCore V3D
    // (RPi5) — SwiftShader et l'EGL direct échouent sur ARM, mais gl-egl passe.
    // Sur une machine sans GPU accessible → pas de contexte → les tests 3D se
    // skippent proprement (garde hasWebGL dans les specs).
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 4319 --strictPort',
    url: 'http://localhost:4319',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
