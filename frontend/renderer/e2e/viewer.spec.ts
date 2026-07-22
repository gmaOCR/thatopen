import { test, expect, type Page } from '@playwright/test';

// Sélecteurs stables (classes de l'app).
const VIEWPORT = '.viewer-canvas'; // conteneur (présent même sans WebGL)
const CANVAS = '.viewer-canvas canvas'; // canvas WebGL (absent si pas de GPU)
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

/** Longueur du texte du panneau propriétés en TRAVERSANT le Shadow DOM (CUI). */
const propsLen = (page: Page) =>
  page.evaluate(() => {
    const walk = (root: ParentNode): string => {
      let t = '';
      for (const el of root.querySelectorAll('*')) if (el.shadowRoot) t += walk(el.shadowRoot);
      return (root.textContent || '') + t;
    };
    const p = document.querySelector('.viewer-right .panel-body');
    return p ? walk(p).replace(/\s+/g, ' ').trim().length : 0;
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.viewer-topbar')).toBeVisible();
});

// --- DOM / layout : indépendants du rendu 3D ---

test('mobile : le bouton Menu ouvre les commandes puis se ferme au tap dans la scène', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Bouton « Menu » visible uniquement en mobile');
  await page.locator('.menu-toggle').tap();
  await expect(page.locator('.viewer-menus.open')).toBeVisible();
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

// --- 3D : nécessitent WebGL (skippés en headless sans GPU) ---

test('charge la maquette de démo au démarrage', async ({ page }) => {
  test.skip(!(await hasWebGL(page)), 'WebGL indisponible (headless sans GPU)');
  await expect(page.locator(CANVAS)).toBeVisible();
  await expect(page.locator(STATUS)).toContainText('modèle', { timeout: 40_000 });
});

test('mobile : un tap sélectionne un élément (régression hidpi/tactile)', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Sélection tactile = mobile (DSF > 1)');
  test.skip(!(await hasWebGL(page)), 'WebGL indisponible (headless sans GPU)');
  await expect(page.locator(STATUS)).toContainText('modèle', { timeout: 40_000 });
  await page.waitForTimeout(2500); // stabilise rendu/culling (fitToBox)
  const before = await propsLen(page);
  const vp = page.viewportSize()!;
  // Tap au centre : la maquette est cadrée (fitToBox) → touche de la géométrie.
  await page.locator(CANVAS).tap({ position: { x: vp.width / 2, y: vp.height / 2 } });
  await expect.poll(() => propsLen(page), { timeout: 15_000 }).toBeGreaterThan(before);
});

test('une vue sauvegardée persiste au rechargement', async ({ page }, testInfo) => {
  test.skip(!(await hasWebGL(page)), 'WebGL requis (capture de la caméra)');
  await expect(page.locator(STATUS)).toContainText('modèle', { timeout: 40_000 });
  const openLeft = async () => {
    if (testInfo.project.name === 'mobile')
      await page.locator('button[aria-label="Panneaux structure et modèles"]').tap();
  };
  await openLeft(); // sur mobile le panneau « Vues » est dans le drawer gauche
  page.once('dialog', (d) => d.accept('Vue test')); // window.prompt du nom
  await page.locator('.views-save').click();
  await expect(page.locator('.views-list')).toContainText('Vue test');
  await page.reload();
  await expect(page.locator('.viewer-topbar')).toBeVisible();
  await openLeft();
  await expect(page.locator('.views-list')).toContainText('Vue test');
});
