import { test, expect, type Page } from '@playwright/test';

// Sélecteurs stables (classes de l'app).
const VIEWPORT = '.viewer-canvas'; // le conteneur (présent même sans WebGL)
const CANVAS = '.viewer-canvas canvas'; // le canvas WebGL (absent si pas de GPU)
const STATUS = '.viewer-status';

/** WebGL disponible ? (headless sans GPU → false : les tests 3D sont skippés). */
const hasWebGL = (page: Page) =>
  page.evaluate(() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Coquille de l'app (indépendante du WebGL) : garantit que l'app a monté.
  await expect(page.locator('.viewer-topbar')).toBeVisible();
});

// --- Tests DOM / layout : ne dépendent pas du rendu 3D ---

test('mobile : le bouton Menu ouvre les commandes puis se ferme au tap dans la scène', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Bouton « Menu » visible uniquement en mobile');
  await page.locator('.menu-toggle').tap();
  await expect(page.locator('.viewer-menus.open')).toBeVisible();
  // Tap dans la zone scène (le conteneur, hors menu) → fermeture auto.
  await page.locator(VIEWPORT).tap({ position: { x: 30, y: 500 } });
  await expect(page.locator('.viewer-menus.open')).toHaveCount(0);
});

test('mobile : les boutons du footer restent dans le viewport (safe-area)', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Régression safe-area spécifique mobile');
  const vp = page.viewportSize();
  expect(vp).not.toBeNull();
  const btn = page.locator('.viewer-footer .tool-btn').last();
  await expect(btn).toBeVisible();
  const box = await btn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp!.height + 1);
});

// --- Tests 3D : nécessitent WebGL (skippés en headless sans GPU) ---

test('charge la maquette de démo au démarrage', async ({ page }) => {
  test.skip(!(await hasWebGL(page)), 'WebGL indisponible (headless sans GPU)');
  await expect(page.locator(CANVAS)).toBeVisible();
  await expect(page.locator(STATUS)).toContainText('modèle', { timeout: 40_000 });
});

test('un tap sélectionne un élément → le panneau propriétés se remplit', async ({
  page,
}, testInfo) => {
  test.skip(!(await hasWebGL(page)), 'WebGL indisponible (headless sans GPU)');
  await expect(page.locator(STATUS)).toContainText('modèle', { timeout: 40_000 });
  await page.waitForTimeout(2000); // stabilise le rendu/culling (fitToBox)

  const rightBody = page.locator('.viewer-right .panel-body');
  const before = (await rightBody.innerText().catch(() => '')).length;

  const vp = page.viewportSize()!;
  await page.locator(CANVAS).tap({ position: { x: vp.width / 2, y: vp.height / 2 } });
  if (testInfo.project.name === 'mobile') {
    await page.locator('button[aria-label="Panneau propriétés"]').tap();
  }
  await expect
    .poll(async () => (await rightBody.innerText().catch(() => '')).length, { timeout: 15_000 })
    .toBeGreaterThan(before + 5);
});

test('une vue sauvegardée apparaît dans la liste et persiste au rechargement', async ({ page }) => {
  test.skip(!(await hasWebGL(page)), 'WebGL indisponible (caméra requise pour capturer la vue)');
  await expect(page.locator(STATUS)).toContainText('modèle', { timeout: 40_000 });
  page.once('dialog', (d) => d.accept('Vue test')); // window.prompt du nom
  await page.locator('.views-save').click();
  await expect(page.locator('.views-list')).toContainText('Vue test');
  await page.reload();
  await expect(page.locator('.views-list')).toContainText('Vue test');
});
