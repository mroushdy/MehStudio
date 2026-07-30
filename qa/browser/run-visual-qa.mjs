import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TARGET_URL,
  VIEW_MATRIX,
  VIEWPORT,
  loadCanonicalPresetMatrix,
} from './matrix.mjs';
import { PNG } from 'pngjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = resolve(HERE, '..', 'artifacts', 'browser');
const MANIFEST_PATH = resolve(ARTIFACT_DIR, 'manifest.json');
const SEMANTIC_BASELINE_PATH = resolve(HERE, 'semantic-baselines.json');
const EXACT_ADMISSION_PATH = resolve(
  HERE,
  '..',
  'cases',
  'exact-production-admission.json',
);
const THREE_RUNTIME_PATH = resolve(
  HERE,
  '..',
  'node_modules',
  'three',
  'build',
  'three.min.js',
);
const APP_READY_TIMEOUT_MS = 30_000;
const CAMERA_EPSILON = 1e-4;
const ALLOWED_ARGS = new Set(['--headed']);

const unknownArgs = process.argv.slice(2).filter((arg) => !ALLOWED_ARGS.has(arg));
if (unknownArgs.length) {
  throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}. Only --headed is supported.`);
}

const headed = process.argv.includes('--headed');
const runStartedAt = new Date().toISOString();
const events = [];
const failures = [];
let browser;
let context;
let eventCursor = 0;

const manifest = {
  schemaVersion: 2,
  kind: 'meh-studio-canonical-2way-visual-qa',
  targetUrl: TARGET_URL,
  startedAt: runStartedAt,
  finishedAt: null,
  deterministicInputs: {
    viewport: VIEWPORT,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
    presetSource: 'qa/cases/canonical.json (valid build cases plus tagged browser regressions)',
    semanticBaseline: 'qa/browser/semantic-baselines.json',
    viewOrder: VIEW_MATRIX,
  },
  runtime: {
    node: process.version,
    headed,
    browserVersion: null,
  },
  releaseIdentity: null,
  presets: [],
  captures: [],
  events,
  failures,
  summary: {
    passed: false,
    expectedCaptures: 0,
    completedCaptures: 0,
    consoleErrors: 0,
    pageErrors: 0,
    requestFailures: 0,
    refusalFailures: 0,
    cameraFailures: 0,
    browserDriverFailures: 0,
    releaseIdentityFailures: 0,
    tapOverlayProtrusionFailures: 0,
    tapOverlayRearOverrunFailures: 0,
    tapOverlayPathFailures: 0,
    noDriverAssemblyFailures: 0,
    mountInspectionFailures: 0,
    semanticBaselineFailures: 0,
  },
};

function recordEvent(kind, detail = {}) {
  const event = {
    sequence: events.length + 1,
    kind,
    ...detail,
  };
  events.push(event);
  return event;
}

function recordFailure(code, message, detail = {}) {
  const failure = {
    sequence: failures.length + 1,
    code,
    message,
    ...detail,
  };
  failures.push(failure);
  return failure;
}

function compactError(error) {
  if (!error) return 'Unknown error';
  return String(error.stack || error.message || error).split('\n').slice(0, 8).join('\n');
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nearlyEqual(a, b, epsilon = CAMERA_EPSILON) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= epsilon;
}

function compareVectors(label, before, after, differences) {
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) {
    differences.push(`${label}: missing or incompatible vectors`);
    return;
  }
  before.forEach((value, index) => {
    if (!nearlyEqual(value, after[index])) {
      differences.push(`${label}[${index}]: ${value} -> ${after[index]}`);
    }
  });
}

function compareCamera(before, after) {
  const differences = [];
  if (!before || !after) {
    differences.push('camera snapshot unavailable');
    return { preserved: false, differences };
  }

  for (const field of ['view', 'xray']) {
    if (before[field] !== after[field]) {
      differences.push(`${field}: ${before[field]} -> ${after[field]}`);
    }
  }
  for (const field of ['yaw', 'pitch', 'orbit']) {
    if (!nearlyEqual(before[field], after[field])) {
      differences.push(`${field}: ${before[field]} -> ${after[field]}`);
    }
  }
  compareVectors('eye', before.eye, after.eye, differences);
  compareVectors('target', before.target, after.target, differences);

  return {
    preserved: differences.length === 0,
    differences,
  };
}

function compareExpectedState(actual, expected) {
  const mismatches = [];
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    const bothNumeric = typeof expectedValue === 'number' && typeof actualValue === 'number';
    const matches = bothNumeric
      ? nearlyEqual(actualValue, expectedValue, 1e-6)
      : actualValue === expectedValue;
    if (!matches) mismatches.push(`${key}: expected ${expectedValue}, got ${actualValue}`);
  }
  return mismatches;
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function readSemanticBaselines() {
  const document = JSON.parse(await readFile(SEMANTIC_BASELINE_PATH, 'utf8'));
  if (document.schemaVersion !== 1 || !document.captures) {
    throw new Error('qa/browser/semantic-baselines.json has an unsupported schema.');
  }
  return document;
}

async function analyzePixels(path) {
  const png = PNG.sync.read(await readFile(path));
  let foreground = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const alpha = png.data[offset + 3];
      const isForeground = alpha > 16 && Math.min(red, green, blue) < 242;
      if (!isForeground) continue;
      foreground += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const pixels = png.width * png.height;
  const bounds = foreground > 0 ? {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  } : null;
  return {
    width: png.width,
    height: png.height,
    foregroundPixels: foreground,
    foregroundFraction: pixels ? foreground / pixels : 0,
    foregroundBounds: bounds,
    foregroundWidthFraction: bounds ? bounds.width / png.width : 0,
    foregroundHeightFraction: bounds ? bounds.height / png.height : 0,
  };
}

function compareSemanticBaseline(rule, runtime, pixels) {
  const mismatches = [];
  const scene = runtime.scene || {};
  const checkEqual = (field, actual) => {
    if (rule[field] !== undefined && actual !== rule[field]) {
      mismatches.push(`${field}: expected ${rule[field]}, got ${actual}`);
    }
  };
  const checkMaximum = (field, actual) => {
    if (rule[field] !== undefined && !(Number.isFinite(actual) && actual <= rule[field])) {
      mismatches.push(`${field}: expected <= ${rule[field]}, got ${actual}`);
    }
  };
  const checkMinimum = (field, actual) => {
    if (rule[field] !== undefined && !(Number.isFinite(actual) && actual >= rule[field])) {
      mismatches.push(`${field}: expected >= ${rule[field]}, got ${actual}`);
    }
  };

  checkEqual('expectedWooferDriverCount', runtime.plan?.driverCount);
  checkEqual('expectedCompressionDriverRoots', scene.compressionDriverRootCount);
  checkEqual('expectedMountLandRoots', scene.mountLandRootCount);
  checkEqual('expectedGasketRoots', scene.gasketRootCount);
  checkEqual('expectedTapInterfaceRoots', scene.tapInterfaceRootCount);
  checkMaximum('maxTapCapMeshes', scene.tapCapMeshCount);
  checkMaximum('maxTapOverlayProtrusionMm', scene.tapOverlayProtrusionMm);
  checkMaximum('maxTapOverlayRearOverrunMm', scene.tapOverlayRearOverrunMm);
  const datumErrors = (scene.wooferMatches || []).map(
    (entry) => entry.nearestDistanceMm,
  );
  const maximumDatumError = datumErrors.length
    && datumErrors.every(Number.isFinite)
    ? Math.max(...datumErrors)
    : Infinity;
  checkMaximum('maxWooferDatumErrorMm', maximumDatumError);
  checkMinimum('minimumForegroundFraction', pixels.foregroundFraction);
  if (
    rule.maximumForegroundFraction !== undefined
    && !(pixels.foregroundFraction <= rule.maximumForegroundFraction)
  ) {
    mismatches.push(
      `maximumForegroundFraction: expected <= ${rule.maximumForegroundFraction}, `
      + `got ${pixels.foregroundFraction}`,
    );
  }
  checkMinimum('minimumForegroundWidthFraction', pixels.foregroundWidthFraction);
  checkMinimum('minimumForegroundHeightFraction', pixels.foregroundHeightFraction);
  return {
    passed: mismatches.length === 0,
    mismatches,
    maximumWooferDatumErrorMm: maximumDatumError,
  };
}

async function writeManifest() {
  manifest.finishedAt = new Date().toISOString();
  manifest.summary.completedCaptures = manifest.captures.length;
  manifest.summary.consoleErrors = events.filter(
    (event) => event.kind === 'console' && event.level === 'error',
  ).length;
  manifest.summary.pageErrors = events.filter((event) => event.kind === 'pageerror').length;
  manifest.summary.requestFailures = events.filter(
    (event) => event.kind === 'requestfailed' || event.kind === 'http-error',
  ).length;
  manifest.summary.refusalFailures = failures.filter(
    (failure) => failure.code === 'canonical-refused',
  ).length;
  manifest.summary.cameraFailures = failures.filter(
    (failure) => failure.code === 'camera-not-preserved',
  ).length;
  manifest.summary.browserDriverFailures = failures.filter(
    (failure) => (
      failure.code === 'full-assembly-missing-drivers'
      || failure.code === 'full-assembly-duplicate-compression-driver'
    ),
  ).length;
  manifest.summary.releaseIdentityFailures = failures.filter(
    (failure) => failure.code === 'release-identity-mismatch',
  ).length;
  manifest.summary.tapOverlayProtrusionFailures = failures.filter(
    (failure) => failure.code === 'full-assembly-tap-overlay-protrusion',
  ).length;
  manifest.summary.tapOverlayRearOverrunFailures = failures.filter(
    (failure) => failure.code === 'full-assembly-tap-overlay-rear-overrun',
  ).length;
  manifest.summary.tapOverlayPathFailures = failures.filter(
    (failure) => failure.code === 'full-assembly-tap-overlay-path-invalid',
  ).length;
  manifest.summary.tapInspectionFailures = failures.filter(
    (failure) => failure.code === 'tap-inspection-interface-failed',
  ).length;
  manifest.summary.noDriverAssemblyFailures = failures.filter(
    (failure) => failure.code === 'no-driver-assembly-contents-failed',
  ).length;
  manifest.summary.mountInspectionFailures = failures.filter(
    (failure) => failure.code === 'mount-inspection-contents-failed',
  ).length;
  manifest.summary.semanticBaselineFailures = failures.filter(
    (failure) => failure.code === 'semantic-baseline-failed',
  ).length;
  manifest.summary.passed = failures.length === 0;
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function loadPlaywright() {
  try {
    return await import('@playwright/test');
  } catch (error) {
    throw new Error(
      'Playwright is not installed for v5/qa. From v5/qa run `npm install`, '
      + 'then `npx playwright install chromium`.\n'
      + compactError(error),
    );
  }
}

function attachDiagnostics(page) {
  page.on('console', (message) => {
    const location = message.location();
    recordEvent('console', {
      level: message.type(),
      text: message.text(),
      source: location?.url || null,
      line: location?.lineNumber ?? null,
      column: location?.columnNumber ?? null,
    });
  });
  page.on('pageerror', (error) => {
    recordEvent('pageerror', { error: compactError(error) });
  });
  page.on('requestfailed', (request) => {
    recordEvent('requestfailed', {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText || 'unknown request failure',
    });
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    recordEvent('http-error', {
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      resourceType: response.request().resourceType(),
    });
  });
}

async function installNavigationGuard(browserContext) {
  const threeRuntime = await readFile(THREE_RUNTIME_PATH, 'utf8');
  await browserContext.route('**/*', async (route) => {
    const request = route.request();
    if (/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/.test(
      request.url(),
    )) {
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: threeRuntime,
      });
      return;
    }
    const isDocumentNavigation = request.isNavigationRequest()
      && request.resourceType() === 'document';
    if (isDocumentNavigation && request.url() !== TARGET_URL) {
      recordEvent('blocked-navigation', {
        url: request.url(),
        expected: TARGET_URL,
      });
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
}

async function waitForFrames(page) {
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function waitForApp(page) {
  await page.waitForSelector('#v3d canvas', {
    state: 'visible',
    timeout: APP_READY_TIMEOUT_MS,
  });
  await page.waitForFunction(() => (
    document.querySelectorAll('#buildSel option').length >= 2
    && document.querySelectorAll('#viewSel option').length >= 7
    && window.__state?.topo === '2way'
    && window.__solved?.ev?.plan
  ), undefined, { timeout: APP_READY_TIMEOUT_MS });
  await waitForFrames(page);
}

async function waitForPreset(page, presetKey, expectedState = {}) {
  await page.waitForFunction(({ key, state }) => {
    const stateMatches = Object.entries(state).every(([field, expected]) => {
      const actual = window.__state?.[field];
      return typeof actual === 'number' && typeof expected === 'number'
        ? Math.abs(actual - expected) <= 1e-6
        : actual === expected;
    });
    return (
      document.querySelector('#buildSel')?.value === key
      && window.__state?.twoDesign === key
      && window.__solved?.ev?.plan
      && stateMatches
    );
  }, {
    key: presetKey,
    state: expectedState,
  }, { timeout: APP_READY_TIMEOUT_MS });
  await waitForFrames(page);
  return page.evaluate(() => ({
    active: document.documentElement.dataset.meshActive === '1',
    kind: document.documentElement.dataset.meshKind || '',
    exactReady: document.documentElement.dataset.meshExactReady === '1',
  }));
}

async function applyPreset(page, preset) {
  if (preset.sourceType === 'family') {
    /* Selecting a calculated family dispatches the production UI's queued
       solve. A retained radial cartridge performs a deterministic phase
       search, so immediately mutating S behind that pending callback races
       with applyTwoDesign and can restore the family's defaults 1–3 seconds
       later. Set the selector without dispatching change, then apply the
       canonical fixture exactly once in the same page task. */
    await page.evaluate(({ key, expectedState }) => {
      if (typeof cancelTwoWayMesh === 'function') {
        cancelTwoWayMesh('Browser regression state change', true);
      }
      const selector = document.querySelector('#buildSel');
      if (selector) selector.value = key;
      Object.assign(S, structuredClone(expectedState));
      if (typeof wireTwoWay === 'function') wireTwoWay(true);
      if (typeof save === 'function') save();
      rebuild();
    }, {
      key: preset.presetKey,
      expectedState: preset.expectedState,
    });
  } else {
    await page.locator('#buildSel').selectOption(preset.presetKey);
  }
  return waitForPreset(page, preset.presetKey, preset.expectedState);
}

async function setMountInspectionFocus(page, focus) {
  const expectedFocus = String(focus);
  await page.waitForFunction((value) => {
    const selector = document.querySelector('#mountFocusSel');
    return Boolean(
      selector
      && [...selector.options].some((option) => option.value === value),
    );
  }, expectedFocus, { timeout: APP_READY_TIMEOUT_MS });
  await page.evaluate((value) => {
    const selector = document.querySelector('#mountFocusSel');
    selector.value = value;
    selector.dispatchEvent(new Event('change', { bubbles: true }));
  }, expectedFocus);
  await page.waitForFunction((value) => {
    const qa = window.__panelMountQA;
    return (
      document.querySelector('#mountFocusSel')?.value === value
      && String(V3D.mountFocus) === value
      && String(qa?.mountFocus) === value
      && (
        value === 'assembly'
          ? qa?.isolatedInspection === false
          : (
            qa?.isolatedInspection === true
            && Number(qa?.focusedDriverIndex) === Number(value)
            && qa?.focusedFaceOverlayCount === 1
          )
      )
    );
  }, expectedFocus, { timeout: APP_READY_TIMEOUT_MS });
  await waitForFrames(page);
}

async function setVisualMode(page, view) {
  await page.locator('#viewSel').selectOption(view.viewValue);
  await page.waitForFunction((expectedView) => {
    try {
      return document.querySelector('#viewSel')?.value === expectedView
        && V3D.view === expectedView;
    } catch {
      return false;
    }
  }, view.viewValue, { timeout: APP_READY_TIMEOUT_MS });

  const xrayEnabled = await page.evaluate(() => {
    try {
      return Boolean(V3D.xray);
    } catch {
      return null;
    }
  });
  if (xrayEnabled !== view.xray) {
    await page.locator('#bXray').click();
    await page.waitForFunction((expectedXray) => {
      try {
        return Boolean(V3D.xray) === expectedXray;
      } catch {
        return false;
      }
    }, view.xray, { timeout: APP_READY_TIMEOUT_MS });
  }
  if (view.viewValue === 'mount' && view.mountFocus != null) {
    await setMountInspectionFocus(page, view.mountFocus);
  }
  if (view.camera) {
    await page.evaluate((camera) => {
      V3D.yaw = Number(camera.yaw);
      V3D.pitch = Number(camera.pitch);
      V3D.dist = Number(camera.dist);
      V3D.cameraFitted = true;
      render3d();
    }, view.camera);
  }
  await waitForFrames(page);
}

async function readRuntimeState(page, expectedKeys = []) {
  return page.evaluate((stateKeys) => {
    const state = {};
    for (const key of stateKeys) state[key] = window.__state?.[key];

    let camera = null;
    try {
      const bound = Number(V3D.bnd || 0.6);
      camera = {
        view: V3D.view,
        selectorView: document.querySelector('#viewSel')?.value || null,
        xray: Boolean(V3D.xray),
        yaw: Number(V3D.yaw),
        pitch: Number(V3D.pitch),
        dist: Number(V3D.dist),
        bound,
        orbit: bound * Number(V3D.dist) * 2.2,
        eye: V3D.camera?.position?.toArray?.().map(Number) || null,
        target: V3D.tgt?.toArray?.().map(Number) || null,
      };
    } catch {
      camera = null;
    }

    const canvas = document.querySelector('#v3d canvas');
    const rect = canvas?.getBoundingClientRect();
    const plan = window.__solved?.ev?.plan;
    let scene = null;
    try {
      const root = V3D.group;
      const driverRoots = [];
      const mountLandRoots = [];
      const gasketRoots = [];
      const driverPocketRoots = [];
      const retentionFeatureRoots = [];
      const tapInterfaceRoots = [];
      const focusedFaceRoots = [];
      const shellRoots = [];
      const detachableModuleRoots = [];
      const mountJointGasketRoots = [];
      const inspectionHelperRoots = [];
      const isEffectivelyVisible = (object) => {
        let current = object;
        while (current) {
          if (current.visible === false) return false;
          if (current === root) break;
          current = current.parent;
        }
        return true;
      };
      root?.traverse?.((object) => {
        const mountLandRoot = (
          object.userData?.tag === 'mount-land'
          || (
            object.userData?.tag === 'detachable-module'
            && Number.isInteger(Number(object.userData?.driverIndex))
          )
        );
        const parentIsMountLand = (
          object.parent?.userData?.tag === 'mount-land'
          || (
            object.parent?.userData?.tag === 'detachable-module'
            && Number.isInteger(Number(object.parent?.userData?.driverIndex))
          )
        );
        if (mountLandRoot && !parentIsMountLand) {
          mountLandRoots.push(object);
        }
        if (
          object.userData?.tag === 'mount-focus-face'
          && object.parent?.userData?.tag !== 'mount-focus-face'
        ) {
          focusedFaceRoots.push(object);
        }
        if (
          object.userData?.tag === 'shell'
          && object.parent?.userData?.tag !== 'shell'
        ) {
          shellRoots.push(object);
        }
        if (
          object.userData?.tag === 'detachable-module'
          && object.parent?.userData?.tag !== 'detachable-module'
        ) {
          detachableModuleRoots.push(object);
        }
        if (
          object.userData?.tag === 'mount-joint-gasket'
          && object.parent?.userData?.tag !== 'mount-joint-gasket'
        ) {
          mountJointGasketRoots.push(object);
        }
        if (
          object.userData?.tag === 'inspect'
          && object.parent?.userData?.tag !== 'inspect'
        ) {
          inspectionHelperRoots.push(object);
        }
        if (
          object.userData?.tag === 'gasket'
          && object.parent?.userData?.tag !== 'gasket'
        ) {
          gasketRoots.push(object);
        }
        if (
          object.userData?.tag === 'driver-pocket'
          && object.parent?.userData?.tag !== 'driver-pocket'
        ) {
          driverPocketRoots.push(object);
        }
        if (
          object.userData?.tag === 'retention-feature'
          && object.parent?.userData?.tag !== 'retention-feature'
        ) {
          retentionFeatureRoots.push(object);
        }
        if (
          object.userData?.tag === 'tap-interface'
          && object.parent?.userData?.tag !== 'tap-interface'
        ) {
          tapInterfaceRoots.push(object);
        }
        if (object.userData?.tag !== 'driver') return;
        if (object.parent?.userData?.tag === 'driver') return;
        let visibleMeshCount = 0;
        object.traverse?.((descendant) => {
          if (descendant.isMesh && isEffectivelyVisible(descendant)) visibleMeshCount += 1;
        });
        const position = object.getWorldPosition(new THREE.Vector3()).toArray().map(Number);
        driverRoots.push({
          type: object.type || object.constructor?.name || 'Object3D',
          visible: isEffectivelyVisible(object),
          visibleMeshCount,
          position,
          finitePosition: position.every(Number.isFinite),
        });
      });
      const visibleRoots = driverRoots.filter(
        (entry) => entry.visible && entry.visibleMeshCount > 0 && entry.finitePosition,
      );
      const unusedRootIndexes = new Set(visibleRoots.map((_, index) => index));
      const wooferMatches = (plan?.drivers || []).map((driver, driverIndex) => {
        const planTarget = driver.driverFace?.map(Number) || [];
        // The solver uses [depth, lateral, vertical]; THREE renders
        // [depth, vertical, lateral].
        const target = planTarget.length === 3
          ? [planTarget[0], planTarget[2], planTarget[1]]
          : [];
        let nearest = null;
        for (const rootIndex of unusedRootIndexes) {
          const candidate = visibleRoots[rootIndex];
          const distance = target.length === 3
            ? Math.hypot(...candidate.position.map((value, axis) => value - target[axis]))
            : Infinity;
          if (!nearest || distance < nearest.distance) {
            nearest = { rootIndex, distance, position: candidate.position };
          }
        }
        const matched = Boolean(nearest && nearest.distance <= 0.005);
        if (matched) unusedRootIndexes.delete(nearest.rootIndex);
        return {
          driverIndex,
          planTarget,
          target,
          matched,
          nearestDistanceMm: Number.isFinite(nearest?.distance)
            ? nearest.distance * 1000
            : null,
          position: nearest?.position || null,
        };
      });
      const compressionRoots = [...unusedRootIndexes]
        .map((index) => visibleRoots[index])
        .filter((entry) => Math.hypot(entry.position[1], entry.position[2]) <= 0.01);
      const tapInterfaces = tapInterfaceRoots.map((entry) => {
        let meshCount = 0;
        let capMeshCount = 0;
        let minimumAxialOffsetMm = Infinity;
        let maximumAxialOffsetMm = -Infinity;
        const driverIndex = Number(entry.userData?.driverIndex);
        const reportedTapIndex = Number(entry.userData?.tapIndex);
        const driverPorts = Number.isInteger(driverIndex)
          ? plan?.drivers?.[driverIndex]?.ports
          : null;
        const precedingTapCount = Number.isInteger(driverIndex)
          ? (plan?.drivers || []).slice(0, driverIndex).reduce(
            (total, driver) => total + (driver.ports?.length || 0),
            0,
          )
          : 0;
        // Older renderer diagnostics exposed one global sequential tap index;
        // newer diagnostics may expose the per-driver index directly.
        const tapIndex = (
          Number.isInteger(reportedTapIndex)
          && Array.isArray(driverPorts)
          && reportedTapIndex >= 0
          && reportedTapIndex < driverPorts.length
        )
          ? reportedTapIndex
          : reportedTapIndex - precedingTapCount;
        const port = Number.isInteger(driverIndex) && Number.isInteger(tapIndex)
          ? driverPorts?.[tapIndex]
          : null;
        const driver = Number.isInteger(driverIndex)
          ? plan?.drivers?.[driverIndex]
          : null;
        const center = Array.isArray(port?.center) && port.center.length === 3
          ? new THREE.Vector3(
            Number(port.center[0]),
            Number(port.center[2]),
            Number(port.center[1]),
          )
          : null;
        const normal = Array.isArray(port?.normal) && port.normal.length === 3
          ? new THREE.Vector3(
            Number(port.normal[0]),
            Number(port.normal[2]),
            Number(port.normal[1]),
          ).normalize()
          : null;
        const chamberProjectionM = (
          Array.isArray(driver?.cavInner)
          && driver.cavInner.length === 3
          && Array.isArray(port?.center)
          && port.center.length === 3
          && Array.isArray(port?.normal)
          && port.normal.length === 3
        )
          ? (
            (Number(driver.cavInner[0]) - Number(port.center[0])) * Number(port.normal[0])
            + (Number(driver.cavInner[1]) - Number(port.center[1])) * Number(port.normal[1])
            + (Number(driver.cavInner[2]) - Number(port.center[2])) * Number(port.normal[2])
          )
          : null;
        const wallM = Math.max(0.004, Number(window.__state?.wallT) || 0.012);
        const lumenInsetM = Math.max(0.0002, Math.min(0.0008, wallM * 0.04));
        const expectedRearBoundaryMm = Number.isFinite(chamberProjectionM)
          ? Math.max(
            lumenInsetM + 0.0005,
            chamberProjectionM > lumenInsetM ? chamberProjectionM : wallM,
          ) * 1000
          : null;
        /* Radial passages may expose their canonical swept centreline as
           either points or segments. Keep this optional for older renderers,
           but when metadata is present verify it is finite, continuous, and
           really connects the acoustic face to the front chamber. */
        const rawPath = (
          entry.userData?.pathPoints
          || entry.userData?.tapPathPoints
          || entry.userData?.path?.points
          || null
        );
        const rawSegments = (
          entry.userData?.pathSegments
          || entry.userData?.tapPathSegments
          || entry.userData?.path?.segments
          || null
        );
        const modelPoint = (value) => (
          Array.isArray(value) && value.length === 3
            ? value.map(Number)
            : null
        );
        let pathPoints = Array.isArray(rawPath)
          ? rawPath.map(modelPoint).filter(Boolean)
          : [];
        if (!pathPoints.length && Array.isArray(rawSegments)) {
          for (const segment of rawSegments) {
            const a = modelPoint(segment?.a);
            const b = modelPoint(segment?.b);
            if (!a || !b) continue;
            if (!pathPoints.length) pathPoints.push(a);
            pathPoints.push(b);
          }
        }
        const pathMetadataPresent = Boolean(
          Array.isArray(rawPath) || Array.isArray(rawSegments)
        );
        const pathFinite = (
          !pathMetadataPresent
          || (
            pathPoints.length >= 2
            && pathPoints.every((point) => point.every(Number.isFinite))
          )
        );
        let pathMaximumJoinErrorMm = null;
        if (Array.isArray(rawSegments) && rawSegments.length > 1) {
          const joins = [];
          for (let index = 1; index < rawSegments.length; index += 1) {
            const previous = modelPoint(rawSegments[index - 1]?.b);
            const next = modelPoint(rawSegments[index]?.a);
            if (!previous || !next) continue;
            joins.push(Math.hypot(...previous.map(
              (value, axis) => value - next[axis],
            )) * 1000);
          }
          pathMaximumJoinErrorMm = joins.length ? Math.max(...joins) : null;
        }
        const pathFrontErrorMm = (
          pathPoints.length
          && Array.isArray(port?.center)
          && port.center.length === 3
        )
          ? Math.hypot(...pathPoints[0].map(
            (value, axis) => value - Number(port.center[axis]),
          )) * 1000
          : null;
        const pathRearErrorMm = (
          pathPoints.length
          && Array.isArray(driver?.cavInner)
          && driver.cavInner.length === 3
        )
          ? Math.hypot(...pathPoints.at(-1).map(
            (value, axis) => value - Number(driver.cavInner[axis]),
          )) * 1000
          : null;
        const pathFrontAxialMm = (
          pathPoints.length
          && Array.isArray(port?.center)
          && port.center.length === 3
          && Array.isArray(port?.normal)
          && port.normal.length === 3
        )
          ? pathPoints.map((point) => point.reduce(
            (sum, value, axis) => (
              sum
              + (value - Number(port.center[axis])) * Number(port.normal[axis])
            ),
            0,
          ) * 1000)
          : [];
        const pathRearMountProjectionMm = (
          pathPoints.length
          && Array.isArray(driver?.cavInner)
          && driver.cavInner.length === 3
          && Array.isArray(driver?.mountN)
          && driver.mountN.length === 3
        )
          ? pathPoints.map((point) => point.reduce(
            (sum, value, axis) => (
              sum
              + (value - Number(driver.cavInner[axis])) * Number(driver.mountN[axis])
            ),
            0,
          ) * 1000)
          : [];
        entry.updateWorldMatrix?.(true, true);
        entry.traverse?.((descendant) => {
          if (!descendant.isMesh || !isEffectivelyVisible(descendant)) return;
          meshCount += 1;
          if (descendant.geometry?.type === 'ShapeGeometry') capMeshCount += 1;
          const positions = descendant.geometry?.getAttribute?.('position');
          if (!positions || !center || !normal) return;
          descendant.updateWorldMatrix?.(true, false);
          const vertex = new THREE.Vector3();
          for (let vertexIndex = 0; vertexIndex < positions.count; vertexIndex += 1) {
            vertex.fromBufferAttribute(positions, vertexIndex)
              .applyMatrix4(descendant.matrixWorld);
            const axialOffsetMm = vertex.clone().sub(center).dot(normal) * 1000;
            minimumAxialOffsetMm = Math.min(minimumAxialOffsetMm, axialOffsetMm);
            maximumAxialOffsetMm = Math.max(maximumAxialOffsetMm, axialOffsetMm);
          }
        });
        return {
          driverIndex: Number.isInteger(driverIndex) ? driverIndex : null,
          tapIndex: Number.isInteger(tapIndex) ? tapIndex : null,
          reportedTapIndex: Number.isInteger(reportedTapIndex)
            ? reportedTapIndex
            : null,
          shape: entry.userData?.shape || null,
          visible: isEffectivelyVisible(entry),
          meshCount,
          capMeshCount,
          minimumAxialOffsetMm: Number.isFinite(minimumAxialOffsetMm)
            ? minimumAxialOffsetMm
            : null,
          maximumAxialOffsetMm: Number.isFinite(maximumAxialOffsetMm)
            ? maximumAxialOffsetMm
            : null,
          chamberProjectionMm: Number.isFinite(chamberProjectionM)
            ? chamberProjectionM * 1000
            : null,
          expectedRearBoundaryMm,
          overlayProtrusionMm: Number.isFinite(minimumAxialOffsetMm)
            ? Math.max(0, -minimumAxialOffsetMm)
            : null,
          overlayRearOverrunMm: (
            Number.isFinite(maximumAxialOffsetMm)
            && Number.isFinite(expectedRearBoundaryMm)
          )
            ? Math.max(0, maximumAxialOffsetMm - expectedRearBoundaryMm)
            : null,
          pathMetadataPresent,
          pathPointCount: pathPoints.length,
          pathFinite,
          pathMaximumJoinErrorMm,
          pathFrontErrorMm,
          pathRearErrorMm,
          pathFrontMinimumAxialMm: pathFrontAxialMm.length
            ? Math.min(...pathFrontAxialMm)
            : null,
          pathFrontMaximumAxialMm: pathFrontAxialMm.length
            ? Math.max(...pathFrontAxialMm)
            : null,
          pathRearMaximumMountProjectionMm: pathRearMountProjectionMm.length
            ? Math.max(...pathRearMountProjectionMm)
            : null,
        };
      });
      const tapOverlayProtrusions = tapInterfaces
        .map((entry) => entry.overlayProtrusionMm)
        .filter(Number.isFinite);
      const tapOverlayRearOverruns = tapInterfaces
        .map((entry) => entry.overlayRearOverrunMm)
        .filter(Number.isFinite);
      scene = {
        driverRootCount: driverRoots.length,
        visibleDriverRootCount: driverRoots.filter((entry) => entry.visible).length,
        visibleDriverRootsWithMeshes: visibleRoots.length,
        matchedWooferDriverCount: wooferMatches.filter((entry) => entry.matched).length,
        compressionDriverRootCount: compressionRoots.length,
        mountLandRootCount: mountLandRoots.filter(isEffectivelyVisible).length,
        focusedFaceRootCount: focusedFaceRoots.filter(isEffectivelyVisible).length,
        shellRootCount: shellRoots.filter(isEffectivelyVisible).length,
        detachableModuleRootCount:
          detachableModuleRoots.filter(isEffectivelyVisible).length,
        mountJointGasketRootCount:
          mountJointGasketRoots.filter(isEffectivelyVisible).length,
        inspectionHelperRootCount:
          inspectionHelperRoots.filter(isEffectivelyVisible).length,
        gasketRootCount: gasketRoots.filter(isEffectivelyVisible).length,
        driverPocketRootCount: driverPocketRoots.filter(isEffectivelyVisible).length,
        retentionFeatureRootCount:
          retentionFeatureRoots.filter(isEffectivelyVisible).length,
        tapInterfaceRootCount: tapInterfaces.filter((entry) => entry.visible).length,
        tapCapMeshCount: tapInterfaces.reduce(
          (total, entry) => total + entry.capMeshCount,
          0,
        ),
        tapOverlayProtrusionMm: tapOverlayProtrusions.length
          ? Math.max(...tapOverlayProtrusions)
          : null,
        tapOverlayRearOverrunMm: tapOverlayRearOverruns.length
          ? Math.max(...tapOverlayRearOverruns)
          : null,
        tapInterfaces,
        wooferMatches,
        driverRoots,
      };
    } catch (error) {
      scene = {
        error: String(error?.message || error),
        driverRootCount: 0,
        visibleDriverRootCount: 0,
        visibleDriverRootsWithMeshes: 0,
        matchedWooferDriverCount: 0,
        compressionDriverRootCount: 0,
        mountLandRootCount: 0,
        focusedFaceRootCount: 0,
        shellRootCount: 0,
        detachableModuleRootCount: 0,
        mountJointGasketRootCount: 0,
        inspectionHelperRootCount: 0,
        gasketRootCount: 0,
        driverPocketRootCount: 0,
        retentionFeatureRootCount: 0,
        tapInterfaceRootCount: 0,
        tapCapMeshCount: 0,
        tapOverlayProtrusionMm: null,
        tapOverlayRearOverrunMm: null,
        tapInterfaces: [],
        wooferMatches: [],
        driverRoots: [],
      };
    }
    return {
      releaseIdentity: {
        build: Number(window.MEH_BUILD),
        meshPolicyVersion: String(
          typeof MEH2 !== 'undefined' ? MEH2.twoWayMeshPolicyVersion || '' : '',
        ),
      },
      state,
      camera,
      selectedPreset: document.querySelector('#buildSel')?.value || null,
      selectedView: document.querySelector('#viewSel')?.value || null,
      selectedMountFocus:
        document.querySelector('#mountFocusSel')?.value || null,
      canvas: canvas && rect ? {
        bitmapWidth: canvas.width,
        bitmapHeight: canvas.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
      } : null,
      plan: plan ? {
        family: plan.family,
        driverCount: plan.drivers?.length ?? null,
        stationMm: Number.isFinite(plan.station) ? plan.station * 1000 : null,
        portCount: plan.allPorts?.length ?? null,
        architecture: plan.arch?.name || null,
        driverCellConstruction: plan.S?.driverCellConstruction || null,
        retentionActive: Boolean(plan.retention?.active),
        retentionFeatureCount: Array.isArray(plan.retention?.drivers)
          ? plan.retention.drivers.reduce(
            (total, driver) => total + (driver.tools?.length || 0),
            0,
          )
          : 0,
      } : null,
      mountInspection: window.__panelMountQA ? {
        view: window.__panelMountQA.view || null,
        mountFocus: String(window.__panelMountQA.mountFocus),
        isolatedInspection: Boolean(window.__panelMountQA.isolatedInspection),
        focusedDriverIndex:
          Number.isInteger(window.__panelMountQA.focusedDriverIndex)
            ? window.__panelMountQA.focusedDriverIndex
            : null,
        focusedPlateVisible: Boolean(window.__panelMountQA.focusedPlateVisible),
        focusedFaceOverlayCount:
          Number(window.__panelMountQA.focusedFaceOverlayCount || 0),
        focusedFacePresent:
          Boolean(window.__panelMountQA.invariants?.focusedFacePresent),
        mountViewHasNoDrivers:
          Boolean(window.__panelMountQA.invariants?.mountViewHasNoDrivers),
        driverCount: Number(window.__panelMountQA.driverCount || 0),
        expectedTapCount: Number(window.__panelMountQA.expectedTapCount || 0),
        tapInterfaceCount: Number(window.__panelMountQA.tapInterfaceCount || 0),
        tapBooleanClipApplied:
          Boolean(window.__panelMountQA.tapBooleanClipApplied),
        tapBooleanClipCount:
          Number(window.__panelMountQA.tapBooleanClipCount || 0),
        allTapsPresent:
          Boolean(window.__panelMountQA.invariants?.allTapsPresent),
      } : null,
      scene,
      fabrication: {
        badge: document.querySelector('#fabBadge')?.textContent?.trim() || '',
        badgeClass: document.querySelector('#fabBadge')?.className || '',
        note: document.querySelector('#note')?.textContent?.trim() || '',
      },
      meshRuntime: {
        active: document.documentElement.dataset.meshActive === '1',
        kind: document.documentElement.dataset.meshKind || '',
        exactReady: document.documentElement.dataset.meshExactReady === '1',
      },
    };
  }, expectedKeys);
}

async function readRefusalState(page) {
  return page.evaluate(() => {
    const banner = document.querySelector('#refuseBanner');
    const style = banner ? getComputedStyle(banner) : null;
    const text = banner?.textContent?.trim() || '';
    const rect = banner?.getBoundingClientRect();
    const visible = Boolean(
      banner
      && style
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || 1) > 0
      && rect
      && rect.width > 0
      && rect.height > 0
    );
    const rgb = style?.backgroundColor?.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
    const redBackground = rgb.length >= 3 && rgb[0] >= 140 && rgb[1] <= 110 && rgb[2] <= 110;
    const lawFailures = [...document.querySelectorAll('#rows .fail')]
      .map((element) => element.textContent?.trim() || '')
      .filter(Boolean);
    const solverError = /(?:SOLVER ERROR|REFUSED|CANNOT WORK|INFEASIBLE)/i.test(
      document.querySelector('#adaptStrip')?.textContent || '',
    );
    const solvedRefusal = Boolean(
      window.__solved?.infeasible
      || window.__solved?.ev?.rows?.some?.((row) => row.st === 'fail')
    );
    return {
      banner: {
        visible,
        text,
        backgroundColor: style?.backgroundColor || null,
        redBackground,
      },
      lawFailures,
      solverError,
      solvedRefusal,
      refused: (
        (visible && (redBackground || /REFUSED|CANNOT WORK|INFEASIBLE/i.test(text)))
        || lawFailures.length > 0
        || solverError
        || solvedRefusal
      ),
    };
  });
}

async function captureCanvas(page, outputPath) {
  await page.evaluate(() => {
    document.body.classList.add('capture-mode');
    window.dispatchEvent(new Event('resize'));
  });
  try {
    await page.waitForFunction(({ width, height }) => {
      const canvas = document.querySelector('#v3d canvas');
      const rect = canvas?.getBoundingClientRect();
      return Boolean(
        canvas
        && rect
        && rect.width >= width - 1
        && rect.height >= height - 1
        && canvas.width >= width
        && canvas.height >= height
      );
    }, VIEWPORT, { timeout: APP_READY_TIMEOUT_MS });
    await waitForFrames(page);
    await page.locator('#v3d canvas').screenshot({
      path: outputPath,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    });
  } finally {
    await page.evaluate(() => {
      document.body.classList.remove('capture-mode');
      window.dispatchEvent(new Event('resize'));
    });
    await waitForFrames(page);
  }
}

function registerFatalBrowserEvents() {
  const fatalEvents = events.filter((event) => (
    event.kind === 'pageerror'
    || (event.kind === 'console' && event.level === 'error')
    || event.kind === 'blocked-navigation'
    || (
      (event.kind === 'requestfailed' || event.kind === 'http-error')
      && ['document', 'script', 'worker'].includes(event.resourceType)
    )
  ));
  for (const event of fatalEvents) {
    recordFailure(
      'browser-runtime-error',
      `${event.kind}: ${event.text || event.error || event.failure || event.url || 'unknown error'}`,
      { eventSequence: event.sequence },
    );
  }
}

async function run() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const presets = await loadCanonicalPresetMatrix();
  const semanticBaselines = await readSemanticBaselines();
  const exactAdmission = JSON.parse(
    await readFile(EXACT_ADMISSION_PATH, 'utf8'),
  );
  const expectedPolicyVersion = String(
    exactAdmission.expectedPolicyVersion || '',
  );
  const expectedBuildMatch = /^b(\d+)-/.exec(expectedPolicyVersion);
  const expectedReleaseIdentity = {
    build: Number.isInteger(exactAdmission.expectedBuild)
      ? exactAdmission.expectedBuild
      : (expectedBuildMatch ? Number(expectedBuildMatch[1]) : null),
    meshPolicyVersion: expectedPolicyVersion,
  };
  manifest.presets = presets;
  manifest.semanticBaselineIds = Object.keys(semanticBaselines.captures).sort();
  manifest.summary.expectedCaptures = presets.length * VIEW_MATRIX.length;

  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: !headed });
  manifest.runtime.browserVersion = browser.version();
  context = await browser.newContext({
    viewport: {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
    },
    deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  });

  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // An isolated QA context may deny storage before the target origin exists.
    }
  });
  await installNavigationGuard(context);

  const page = await context.newPage();
  attachDiagnostics(page);
  await page.goto(TARGET_URL, {
    waitUntil: 'domcontentloaded',
    timeout: APP_READY_TIMEOUT_MS,
  });
  if (page.url() !== TARGET_URL) {
    throw new Error(`Unexpected application URL: ${page.url()} (expected ${TARGET_URL}).`);
  }
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: [
      '*,*::before,*::after{',
      'animation:none!important;',
      'transition:none!important;',
      'caret-color:transparent!important;',
      '}',
    ].join(''),
  });
  await waitForApp(page);
  manifest.releaseIdentity = await page.evaluate(() => ({
    build: Number(window.MEH_BUILD),
    meshPolicyVersion: String(
      typeof MEH2 !== 'undefined' ? MEH2.twoWayMeshPolicyVersion || '' : '',
    ),
  }));
  if (
    manifest.releaseIdentity.build !== expectedReleaseIdentity.build
    || manifest.releaseIdentity.meshPolicyVersion
      !== expectedReleaseIdentity.meshPolicyVersion
  ) {
    recordFailure(
      'release-identity-mismatch',
      `Runtime identity ${JSON.stringify(manifest.releaseIdentity)} does not `
        + `match admission identity ${JSON.stringify(expectedReleaseIdentity)}.`,
      { expectedReleaseIdentity },
    );
  }

  const presetValues = await page.locator('#buildSel option').evaluateAll(
    (options) => options.map((option) => option.value),
  );
  const viewValues = await page.locator('#viewSel option').evaluateAll(
    (options) => options.filter((option) => !option.disabled).map((option) => option.value),
  );

  for (const preset of presets) {
    if (!presetValues.includes(preset.presetKey)) {
      recordFailure(
        'missing-canonical-preset',
        `Preset ${preset.id} (${preset.presetKey}) is absent from #buildSel.`,
        { presetId: preset.id, presetKey: preset.presetKey },
      );
    }
  }
  for (const view of VIEW_MATRIX) {
    if (!viewValues.includes(view.viewValue)) {
      recordFailure(
        'missing-canonical-view',
        `View ${view.label} (${view.viewValue}) is unavailable in #viewSel.`,
        { viewId: view.id, viewValue: view.viewValue },
      );
    }
  }
  if (failures.length) return;

  for (const view of VIEW_MATRIX) {
    await setVisualMode(page, view);

    for (const preset of presets) {
      const expectedKeys = Object.keys(preset.expectedState);
      const beforeSwitch = await readRuntimeState(page, expectedKeys);
      const settle = await applyPreset(page, preset);
      if (view.viewValue === 'mount' && view.mountFocus != null) {
        /* A focused plate camera is solved from that preset's driver normal,
           so reselecting the same focus after a preset switch intentionally
           refits the view to the new bearing face. */
        await setMountInspectionFocus(page, view.mountFocus);
      }
      const afterSwitch = await readRuntimeState(page, expectedKeys);
      const cameraCheck = compareCamera(beforeSwitch.camera, afterSwitch.camera);
      const intentionalMountCameraRefit = (
        view.viewValue === 'mount'
        && view.mountFocus != null
      );
      const stateMismatches = compareExpectedState(
        afterSwitch.state,
        preset.expectedState,
      );
      const refusal = await readRefusalState(page);

      if (afterSwitch.meshRuntime.active || afterSwitch.meshRuntime.exactReady) {
        recordFailure(
          'unexpected-exact-mesh-work',
          `${preset.id} started or retained exact mesh work without explicit user intent in ${view.label}.`,
          {
            presetId: preset.id,
            viewId: view.id,
            meshRuntime: afterSwitch.meshRuntime,
          },
        );
      }
      if (!cameraCheck.preserved && !intentionalMountCameraRefit) {
        recordFailure(
          'camera-not-preserved',
          `${preset.id} changed the ${view.label} camera during its preset switch.`,
          {
            presetId: preset.id,
            viewId: view.id,
            differences: cameraCheck.differences,
          },
        );
      }
      if (stateMismatches.length) {
        recordFailure(
          'canonical-state-mismatch',
          `${preset.id} did not load its canonical fixture state.`,
          {
            presetId: preset.id,
            viewId: view.id,
            mismatches: stateMismatches,
          },
        );
      }
      if (refusal.refused) {
        recordFailure(
          'canonical-refused',
          `${preset.id} produced a red/refused state in ${view.label}.`,
          {
            presetId: preset.id,
            viewId: view.id,
            refusal,
          },
        );
      }
      if (
        String(afterSwitch.fabrication?.badgeClass || '').split(/\s+/).includes('fail')
        || String(afterSwitch.fabrication?.badge || '').includes('PRINT TOPOLOGY ✗')
      ) {
        recordFailure(
          'fabrication-badge-failed',
          `${preset.id} failed its exact fabrication badge in ${view.label}.`,
          {
            presetId: preset.id,
            viewId: view.id,
            fabrication: afterSwitch.fabrication,
          },
        );
      }
      if (view.viewValue === 'full') {
        const expectedWooferDrivers = Number(afterSwitch.plan?.driverCount || 0);
        const matchedWooferDrivers = Number(
          afterSwitch.scene?.matchedWooferDriverCount || 0,
        );
        const compressionDriverRoots = Number(
          afterSwitch.scene?.compressionDriverRootCount || 0,
        );
        if (
          matchedWooferDrivers < expectedWooferDrivers
          || compressionDriverRoots < 1
        ) {
          recordFailure(
            'full-assembly-missing-drivers',
            `${preset.id} FULL ASSEMBLY matches ${matchedWooferDrivers}/${expectedWooferDrivers} woofer drivers and ${compressionDriverRoots} compression-driver roots.`,
            {
              presetId: preset.id,
              viewId: view.id,
              expectedWooferDrivers,
              scene: afterSwitch.scene,
            },
          );
        }
        if (compressionDriverRoots > 1) {
          recordFailure(
            'full-assembly-duplicate-compression-driver',
            `${preset.id} FULL ASSEMBLY has ${compressionDriverRoots} compression-driver roots.`,
            {
              presetId: preset.id,
              viewId: view.id,
              scene: afterSwitch.scene,
            },
          );
        }
        const tapInterfaceRoots = Number(
          afterSwitch.scene?.tapInterfaceRootCount || 0,
        );
        const tapCapMeshes = Number(afterSwitch.scene?.tapCapMeshCount || 0);
        const expectedTapInterfaces = Number(afterSwitch.plan?.portCount || 0);
        const analyticTapInterfaces = Number(
          afterSwitch.mountInspection?.tapInterfaceCount || 0,
        );
        const booleanTapCuts = Number(
          afterSwitch.mountInspection?.tapBooleanClipCount || 0,
        );
        if (
          tapInterfaceRoots !== 0
          || tapCapMeshes !== 0
          || analyticTapInterfaces !== expectedTapInterfaces
          || booleanTapCuts !== expectedTapInterfaces
          || afterSwitch.mountInspection?.tapBooleanClipApplied !== true
        ) {
          recordFailure(
            'full-assembly-tap-interface-failed',
            `${preset.id} FULL ASSEMBLY has ${booleanTapCuts}/${expectedTapInterfaces} `
              + `literal Boolean cuts, ${analyticTapInterfaces}/${expectedTapInterfaces} `
              + `canonical interfaces, ${tapInterfaceRoots} visible helper roots, `
              + `and ${tapCapMeshes} cap meshes.`,
            {
              presetId: preset.id,
              viewId: view.id,
              expectedTapInterfaces,
              mountInspection: afterSwitch.mountInspection,
              scene: afterSwitch.scene,
            },
          );
        }
      }
      if (view.viewValue === 'taps') {
        const expectedTapInterfaces = Number(afterSwitch.plan?.portCount || 0);
        const visibleTapInterfaces = Number(
          afterSwitch.scene?.tapInterfaceRootCount || 0,
        );
        const capMeshes = Number(afterSwitch.scene?.tapCapMeshCount || 0);
        const protrusionMm = afterSwitch.scene?.tapOverlayProtrusionMm;
        if (
          visibleTapInterfaces !== expectedTapInterfaces
          || capMeshes !== 0
          || !Number.isFinite(protrusionMm)
          || protrusionMm > 0.25
        ) {
          recordFailure(
            'tap-inspection-interface-failed',
            `${preset.id} TAP INSPECTION has ${visibleTapInterfaces}/`
              + `${expectedTapInterfaces} recessed passage roots, `
              + `${capMeshes} terminal caps, and ${
                Number.isFinite(protrusionMm)
                  ? `${protrusionMm.toFixed(3)} mm`
                  : 'unknown'
              } forward protrusion.`,
            {
              presetId: preset.id,
              viewId: view.id,
              expectedTapInterfaces,
              scene: afterSwitch.scene,
            },
          );
        }
      }
      if (view.viewValue === 'nodrv') {
        const scene = afterSwitch.scene || {};
        const expectedMounts = Number(afterSwitch.plan?.driverCount || 0);
        const detachable = (
          afterSwitch.plan?.driverCellConstruction === 'cartridge'
        );
        const expectedDetachableModules = detachable ? expectedMounts : 0;
        const expectedJointGaskets = detachable ? expectedMounts : 0;
        const expectedRetentionFeatures = afterSwitch.plan?.retentionActive
          ? Number(afterSwitch.plan?.retentionFeatureCount || 0)
          : 0;
        const yaw = Number(afterSwitch.camera?.yaw);
        const pitch = Number(afterSwitch.camera?.pitch);
        const rearObliqueCamera = (
          Number.isFinite(yaw)
          && Number.isFinite(pitch)
          && Math.cos(yaw) < -0.35
          && Math.abs(Math.sin(yaw)) > 0.25
          && Math.abs(pitch) > 0.12
        );
        const noDriverBodies = (
          scene.driverRootCount === 0
          && scene.visibleDriverRootCount === 0
          && scene.visibleDriverRootsWithMeshes === 0
          && scene.compressionDriverRootCount === 0
        );
        const completeMountAssembly = (
          scene.shellRootCount >= 1
          && scene.focusedFaceRootCount === 0
          && scene.mountLandRootCount === expectedMounts
          && scene.detachableModuleRootCount === expectedDetachableModules
          && scene.gasketRootCount === expectedMounts
          && scene.mountJointGasketRootCount === expectedJointGaskets
          && scene.driverPocketRootCount === expectedMounts
          && scene.retentionFeatureRootCount === expectedRetentionFeatures
          && scene.tapInterfaceRootCount === 0
        );
        if (!noDriverBodies || !completeMountAssembly || !rearObliqueCamera) {
          recordFailure(
            'no-driver-assembly-contents-failed',
            `${preset.id} NO DRIVERS must use a rear-oblique camera and show `
              + `${expectedMounts} mounting lands, gaskets, and pocket roots, `
              + `${expectedDetachableModules} detachable modules, `
              + `${expectedJointGaskets} joint gaskets, and `
              + `${expectedRetentionFeatures} retention roots with no LF or `
              + `compression-driver bodies.`,
            {
              presetId: preset.id,
              viewId: view.id,
              expectedMounts,
              expectedDetachableModules,
              expectedJointGaskets,
              expectedRetentionFeatures,
              noDriverBodies,
              completeMountAssembly,
              rearObliqueCamera,
              camera: afterSwitch.camera,
              mountInspection: afterSwitch.mountInspection,
              scene,
            },
          );
        }
      }
      if (view.viewValue === 'mount') {
        const expectedMounts = Number(afterSwitch.plan?.driverCount || 0);
        const expectedRetentionFeatures = afterSwitch.plan?.retentionActive
          ? Number(afterSwitch.plan?.retentionFeatureCount || 0)
          : 0;
        const scene = afterSwitch.scene || {};
        const mountInspection = afterSwitch.mountInspection || {};
        const expectedFocus = view.mountFocus == null
          ? 'assembly'
          : String(view.mountFocus);
        const noDrivers = (
          scene.driverRootCount === 0
          && scene.visibleDriverRootCount === 0
          && scene.visibleDriverRootsWithMeshes === 0
          && scene.compressionDriverRootCount === 0
          && mountInspection.mountViewHasNoDrivers === true
        );
        const focusedPlateOnly = expectedFocus !== 'assembly' && (
          noDrivers
          && afterSwitch.selectedMountFocus === expectedFocus
          && mountInspection.view === 'mount'
          && mountInspection.mountFocus === expectedFocus
          && mountInspection.isolatedInspection === true
          && mountInspection.focusedDriverIndex === Number(expectedFocus)
          && mountInspection.focusedPlateVisible === true
          && mountInspection.focusedFaceOverlayCount === 1
          && mountInspection.focusedFacePresent === true
          && scene.focusedFaceRootCount === 1
          && scene.shellRootCount === 0
          && scene.mountLandRootCount === 0
          && scene.detachableModuleRootCount === 0
          && scene.gasketRootCount === 0
          && scene.mountJointGasketRootCount === 0
          && scene.driverPocketRootCount === 0
          && scene.retentionFeatureRootCount === 0
          && scene.tapInterfaceRootCount === 0
          && scene.inspectionHelperRootCount === 0
        );
        const assemblyOverview = expectedFocus === 'assembly' && (
          noDrivers
          && afterSwitch.selectedMountFocus === 'assembly'
          && mountInspection.mountFocus === 'assembly'
          && mountInspection.isolatedInspection === false
          && scene.focusedFaceRootCount === 0
          && scene.mountLandRootCount === expectedMounts
          && scene.gasketRootCount === expectedMounts
          && scene.driverPocketRootCount === expectedMounts
          && scene.retentionFeatureRootCount === expectedRetentionFeatures
        );
        if (!focusedPlateOnly && !assemblyOverview) {
          recordFailure(
            'mount-inspection-contents-failed',
            expectedFocus === 'assembly'
              ? `${preset.id} MOUNTS assembly overview must show ${expectedMounts} `
                + `mounting lands and gaskets, ${expectedMounts} driver pockets, `
                + `and ${expectedRetentionFeatures} retention features with no drivers.`
              : `${preset.id} MOUNTS inspection must show only focused bearing `
                + `face ${expectedFocus}: one face, no horn, modules, helper `
                + `geometry, LF drivers, or compression driver.`,
            {
              presetId: preset.id,
              viewId: view.id,
              expectedFocus,
              expectedMounts,
              expectedRetentionFeatures,
              mountInspection,
              scene,
            },
          );
        }
      }
      if (page.url() !== TARGET_URL) {
        recordFailure(
          'unexpected-url',
          `Capture left the fixed QA URL: ${page.url()}.`,
          {
            presetId: preset.id,
            viewId: view.id,
            expected: TARGET_URL,
          },
        );
      }

      const filename = `${preset.id}-${slug(preset.presetKey)}__${view.id}.png`;
      const outputPath = resolve(ARTIFACT_DIR, filename);
      await captureCanvas(page, outputPath);
      const fileStats = await stat(outputPath);
      const pixelMetrics = await analyzePixels(outputPath);
      const captureId = `${preset.id}/${view.id}`;
      const semanticRule = semanticBaselines.captures[captureId] || null;
      const semantic = semanticRule
        ? compareSemanticBaseline(semanticRule, afterSwitch, pixelMetrics)
        : null;
      if (semantic && !semantic.passed) {
        recordFailure(
          'semantic-baseline-failed',
          `${captureId} missed its reviewed semantic baseline.`,
          {
            presetId: preset.id,
            viewId: view.id,
            mismatches: semantic.mismatches,
            pixelMetrics,
            scene: afterSwitch.scene,
          },
        );
      }
      const captureEvents = events.slice(eventCursor);
      eventCursor = events.length;

      manifest.captures.push({
        id: captureId,
        preset: {
          id: preset.id,
          key: preset.presetKey,
          title: preset.title,
        },
        view,
        file: `qa/artifacts/browser/${filename}`,
        bytes: fileStats.size,
        sha256: await sha256(outputPath),
        settled: !settle.active && !settle.exactReady,
        releaseIdentity: afterSwitch.releaseIdentity,
        meshRuntime: afterSwitch.meshRuntime,
        state: afterSwitch.state,
        plan: afterSwitch.plan,
        scene: afterSwitch.scene,
        selectedMountFocus: afterSwitch.selectedMountFocus,
        mountInspection: afterSwitch.mountInspection,
        canvas: afterSwitch.canvas,
        pixelMetrics,
        semanticBaseline: semanticRule ? {
          rule: semanticRule,
          ...semantic,
        } : null,
        fabrication: afterSwitch.fabrication,
        camera: {
          beforePresetSwitch: beforeSwitch.camera,
          afterPresetSwitch: afterSwitch.camera,
          preserved: cameraCheck.preserved,
          intentionalMountRefit: intentionalMountCameraRefit,
          differences: cameraCheck.differences,
        },
        canonicalState: {
          expected: preset.expectedState,
          mismatches: stateMismatches,
        },
        refusal,
        events: captureEvents,
      });
    }
  }

  registerFatalBrowserEvents();
}

try {
  await run();
} catch (error) {
  recordFailure('runner-error', compactError(error));
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  await writeManifest();
}

const relativeManifest = 'qa/artifacts/browser/manifest.json';
if (manifest.summary.passed) {
  console.log(
    `[visual-qa] PASS — ${manifest.summary.completedCaptures}/`
    + `${manifest.summary.expectedCaptures} captures · ${relativeManifest}`,
  );
} else {
  console.error(
    `[visual-qa] FAIL — ${failures.length} issue(s) · ${relativeManifest}`,
  );
  for (const failure of failures) {
    console.error(`  ${failure.code}: ${failure.message}`);
  }
  process.exitCode = 1;
}
