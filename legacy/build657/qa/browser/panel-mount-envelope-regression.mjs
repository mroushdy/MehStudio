#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const TARGET = process.env.MEH_PANEL_QA_URL
  || 'http://127.0.0.1:8520/shell.html?qa=panel-mount-envelope';
const SOURCE_ROOT = new URL('../../', import.meta.url);
const SHAPES = ['slot', 'oval', 'round'];
const EPSILON = 1e-5;
const EXACT_TIMEOUT_MS = Number(process.env.MEH_PANEL_EXACT_TIMEOUT_MS || 600_000);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function close(actual, expected, tolerance = EPSILON) {
  return Number.isFinite(actual)
    && Number.isFinite(expected)
    && Math.abs(actual - expected) <= tolerance;
}

function validate(snapshot, phase, shape) {
  assert(snapshot, `${shape}/${phase}: panel diagnostics are missing`);
  assert(snapshot.family === 'panel', `${shape}/${phase}: expected panel family`);
  assert(snapshot.view === 'full', `${shape}/${phase}: FULL ASSEMBLY was not retained`);
  assert(snapshot.shape === shape, `${shape}/${phase}: expected ${shape}, got ${snapshot.shape}`);
  assert(
    snapshot.mountLandCount === snapshot.driverCount,
    `${shape}/${phase}: ${snapshot.mountLandCount}/${snapshot.driverCount} mounting lands`
  );
  assert(
    snapshot.gasketCount === snapshot.driverCount,
    `${shape}/${phase}: ${snapshot.gasketCount}/${snapshot.driverCount} gaskets`
  );
  assert(
    snapshot.driverBodyCount === snapshot.driverCount,
    `${shape}/${phase}: ${snapshot.driverBodyCount}/${snapshot.driverCount} woofer bodies`
  );
  assert(
    snapshot.scene.mountLandRoots === snapshot.driverCount,
    `${shape}/${phase}: scene has ${snapshot.scene.mountLandRoots} mounting-land roots`
  );
  assert(
    snapshot.scene.gaskets === snapshot.driverCount,
    `${shape}/${phase}: scene has ${snapshot.scene.gaskets} gasket meshes`
  );
  assert(
    snapshot.scene.wooferBodies === snapshot.driverCount,
    `${shape}/${phase}: scene has ${snapshot.scene.wooferBodies} woofer roots`
  );
  for (const driver of snapshot.drivers) {
    const prefix = `${shape}/${phase}/driver-${driver.index}`;
    assert(
      close(driver.seatDistance, driver.panelThickness),
      `${prefix}: driver face is ${driver.seatDistance} m behind a ${driver.panelThickness} m panel`
    );
    assert(
      driver.frameDiameter > driver.gasketOuterDiameter,
      `${prefix}: gasket OD must remain inside the full frame OD`
    );
    assert(
      driver.gasketOuterDiameter > driver.gasketInnerDiameter,
      `${prefix}: gasket annulus has inverted diameters`
    );
    assert(
      driver.gasketInnerDiameter > driver.activeDiameter,
      `${prefix}: gasket overlaps the active cone`
    );
    assert(
      close(driver.bodyFaceOffset, driver.gasketThickness, 1e-7),
      `${prefix}: body does not begin behind the complete gasket`
    );
    assert(
      driver.bodyLocalAxialMin >= -EPSILON,
      `${prefix}: driver protrudes ${driver.bodyLocalAxialMin} m through the panel`
    );
    assert(
      driver.bodyLocalRadialDiameter >= driver.frameDiameter * 0.995,
      `${prefix}: frame envelope is smaller than its declared full diameter`
    );
  }
}

async function snapshot(page) {
  return page.evaluate(() => {
    const qa = structuredClone(window.__panelMountQA || null);
    const scene = { mountLandRoots: 0, gaskets: 0, wooferBodies: 0 };
    const root = V3D.group;
    root?.traverse?.((object) => {
      if (object.userData?.tag === 'mount-land'
          && object.parent?.userData?.tag !== 'mount-land') scene.mountLandRoots += 1;
      if (object.userData?.tag === 'gasket') scene.gaskets += 1;
      if (object.userData?.tag === 'driver'
          && Number.isInteger(object.userData?.driverIndex)
          && object.parent?.userData?.tag !== 'driver') scene.wooferBodies += 1;
    });
    if (qa) qa.scene = scene;
    return qa;
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error.stack || error)));

try {
  /* shell.html is a source template by contract. Exercise that exact source
     without writing/assembling meh5.html by completing its placeholders only
     inside this page response. Workers and all other resources still come
     from the real localhost v5 server. */
  const [shellSource, profileLawsSource, engineSource, twoWaySource] = await Promise.all([
    readFile(new URL('shell.html', SOURCE_ROOT), 'utf8'),
    readFile(new URL('profile-laws.js', SOURCE_ROOT), 'utf8'),
    readFile(new URL('engine.js', SOURCE_ROOT), 'utf8'),
    readFile(new URL('twoway-core.js', SOURCE_ROOT), 'utf8')
  ]);
  const runtimeSource = shellSource
    .replace('/*__PROFILE_LAWS__*/', profileLawsSource)
    .replace('/*__ENGINE__*/', engineSource)
    .replace('/*__TWOWAY__*/', twoWaySource)
    .replace('/*__CAD__*/', '/* parametric QA runtime */');
  await page.route('**/shell.html?*', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: runtimeSource
  }));
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() => (
    typeof S !== 'undefined'
    && typeof V3D !== 'undefined'
    && V3D.group
    && typeof MEH2 !== 'undefined'
  ), null, {
    timeout: 30_000
  });
  await page.evaluate(() => {
    Object.assign(S, {
      topo: '2way',
      twoArch: 'panel',
      twoFamily: 'panel',
      twoDesign: 'arch:panel',
      style: 'angular',
      seN: 12,
      nW: 2,
      npW: 1,
      panelAxis: 'vertical',
      mountRing: 'integrated',
      tapBasis: 'model',
      tapShapeW: 'slot',
      mouthW: 24,
      mouthCap: 64,
      covH: 90,
      covV: 60,
      wallT: 0.018,
      rollR: 2,
      td: 1.4,
      throat: 1.4,
      cdSel: 'dcx464',
      cdFloor: 300,
      cdDepth: 2.4,
      wPre: 'w5',
      frameW: 'round',
      odW: 13.76,
      dpW: 6.95,
      sdW: 91.6,
      vtcW: 35,
      xmW: 2.5,
      twoXO: 500,
      phaseMargin: 1.2,
      adapterReach: 35,
      adapterReachMode: 'auto',
      rearAlign: 'external',
      tapCRW: 6
    });
    V3D.view = 'full';
    const selector = document.querySelector('#viewSel');
    if (selector) selector.value = 'full';
  });

  const summaries = [];
  for (const shape of SHAPES) {
    await page.evaluate((nextShape) => {
      cancelTwoWayMesh('QA state reset', true);
      twoPreviewReady = null;
      twoPreviewPending = '';
      S.shW = nextShape;
      S.tapShapeW = nextShape;
      applyAdaptiveState('shW');
      V3D.view = 'full';
      const selector = document.querySelector('#viewSel');
      if (selector) selector.value = 'full';
      rebuild();
    }, shape);

    const before = await snapshot(page);
    assert(before.exactReady === false, `${shape}/before: exact state unexpectedly active`);
    validate(before, 'before-worker', shape);

    /* Exact manufacturing work is deliberately opt-in. Build 642 certifies
       this bounded P03-size panel job, so exercise the public action and prove
       that a completed phased worker cannot erase or move the analytic rear
       mounting assembly. */
    await page.evaluate(() => {
      const solved = window.__solved || MEH2.solve(S);
      startTwoWayPreview(
        solved,
        MEH2.twoWayMeshKey(solved.S, 'manufacturing-preview')
      );
    });
    console.log(`  ${shape}: phased exact worker started`);

    try {
      await page.waitForFunction(() => (
        document.documentElement.dataset.meshActive === '0'
      ), null, { timeout: EXACT_TIMEOUT_MS });
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        runtime: structuredClone(window.__twoMeshRuntime || null),
        note: document.querySelector('#note')?.textContent || '',
        exactReady: Boolean(window.__panelMountQA?.exactReady)
      }));
      throw new Error(
        `${shape}: exact worker did not settle within ${EXACT_TIMEOUT_MS} ms · `
        + `${JSON.stringify(diagnostic)}`,
        { cause: error }
      );
    }
    const completion = await page.evaluate(() => ({
      runtime: structuredClone(window.__twoMeshRuntime || null),
      note: document.querySelector('#note')?.textContent || '',
      exactReady: Boolean(window.__panelMountQA?.exactReady),
      view: window.__panelMountQA?.view || null
    }));
    assert(
      completion.exactReady
        && completion.view === 'full'
        && /MANUFACTURING MESH AUDITED/.test(completion.note),
      `${shape}: exact worker settled without an accepted mesh · ${JSON.stringify(completion)}`
    );

    const after = await snapshot(page);
    assert(after.exactReady === true, `${shape}/after: certified exact mesh did not become ready`);
    validate(after, 'after-worker', shape);
    summaries.push({
      shape,
      drivers: after.driverCount,
      lands: after.mountLandCount,
      gaskets: after.gasketCount,
      exactReady: after.exactReady
    });
  }

  assert(consoleErrors.length === 0, `browser errors:\n${consoleErrors.join('\n')}`);
  console.log(`PANEL MOUNT ENVELOPE PASS — ${summaries.length} shapes preserved through phased exact completion`);
  for (const item of summaries) {
    console.log(
      `  ${item.shape}: ${item.drivers} drivers · ${item.lands} lands · `
      + `${item.gaskets} gaskets · exact ${item.exactReady ? 'audited' : 'missing'}`
    );
  }
} catch (error) {
  if (consoleErrors.length) {
    console.error(`BROWSER ERRORS\n${consoleErrors.join('\n')}`);
  }
  throw error;
} finally {
  await browser.close();
}
