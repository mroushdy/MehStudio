#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { PNG } from 'pngjs';

import { readJson, resolveCase } from '../node/case-loader.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const qaRoot = path.resolve(here, '..');
const defaultAppRoot = path.resolve(qaRoot, '..');
const defaultOutput = path.resolve(qaRoot, 'artifacts', 'render-inspection');
const defaultThroatMorphOutput = path.resolve(
  qaRoot,
  'artifacts',
  'throat-morph-inspection',
);
const defaultTapLumenOutput = path.resolve(
  qaRoot,
  'artifacts',
  'tap-lumen-inspection',
);
const defaultProfileLawsOutput = path.resolve(
  qaRoot,
  'artifacts',
  'profile-laws-inspection',
);
const defaultWallTopologiesOutput = path.resolve(
  qaRoot,
  'artifacts',
  'wall-topologies-inspection',
);
const viewport = Object.freeze({ width: 1600, height: 1000 });
const captureSpecs = Object.freeze([
  Object.freeze({
    id: 'mount-plate-1',
    label: 'isolated mounting plate 1',
    view: 'mount',
    mountFocus: '0',
  }),
  Object.freeze({
    id: 'complete-driver-cell-1',
    label: 'complete isolated driver cell 1',
    view: 'cell',
    mountFocus: '0',
  }),
  Object.freeze({
    id: 'mount-assembly',
    label: 'mount assembly overview',
    view: 'mount',
    mountFocus: 'assembly',
  }),
  Object.freeze({
    id: 'no-driver-assembly',
    label: 'no driver mount assembly',
    view: 'nodrv',
  }),
  Object.freeze({
    id: 'front-full',
    label: 'front full assembly',
    view: 'full',
  }),
  Object.freeze({
    id: 'literal-taps',
    label: 'literal tap openings',
    view: 'taps',
  }),
]);
const throatMorphCaptureSpecs = Object.freeze([
  Object.freeze({
    id: 'throat-morph-closeup',
    label: 'throat morph closeup',
    view: 'section',
    cameraPreset: 'throat-morph',
  }),
  Object.freeze({
    id: 'throat-profile-side-section',
    label: 'throat profile side section',
    view: 'section',
    cameraPreset: 'throat-profile-side',
  }),
]);
const tapLumenCaptureSpecs = Object.freeze([
  Object.freeze({
    id: 'tap-lumen-section-closeup',
    label: 'tap lumen section closeup',
    view: 'section',
    cameraPreset: 'tap-lumen',
    driverIndex: 0,
    portIndex: 0,
  }),
  Object.freeze({
    id: 'tap-lumen-taps-closeup',
    label: 'tap lumen taps closeup',
    view: 'taps',
    cameraPreset: 'tap-lumen',
    driverIndex: 0,
    portIndex: 0,
  }),
  Object.freeze({
    id: 'tap-lumen-no-drivers-closeup',
    label: 'tap lumen no drivers closeup',
    view: 'nodrv',
    cameraPreset: 'tap-lumen',
    driverIndex: 0,
    portIndex: 0,
  }),
]);
const profileLawCaptureSpecs = Object.freeze([
  Object.freeze({
    id: 'profile-law-conical',
    label: 'conical',
    view: 'section',
    cameraPreset: 'profile-law-side',
    profileLaw: 'conical',
  }),
  Object.freeze({
    id: 'profile-law-classic-os',
    label: 'classic os',
    view: 'section',
    cameraPreset: 'profile-law-side',
    profileLaw: 'classicOS',
  }),
  Object.freeze({
    id: 'profile-law-osse',
    label: 'osse',
    view: 'section',
    cameraPreset: 'profile-law-side',
    profileLaw: 'osse',
  }),
]);
const wallTopologyCaptureSpecs = Object.freeze([
  Object.freeze({
    id: 'wall-topology-smooth',
    label: 'smooth Lame',
    view: 'section',
    cameraPreset: 'wall-topology-fixed',
    wallStyle: 'smooth',
  }),
  Object.freeze({
    id: 'wall-topology-angular',
    label: 'classic angular',
    view: 'section',
    cameraPreset: 'wall-topology-fixed',
    wallStyle: 'angular',
  }),
  Object.freeze({
    id: 'wall-topology-curved-facets',
    label: 'curved facets',
    view: 'section',
    cameraPreset: 'wall-topology-fixed',
    wallStyle: 'curvedFacets',
  }),
]);

function parseArguments(argv) {
  const options = {
    caseId: null,
    output: null,
    appRoot: defaultAppRoot,
    headed: false,
    throatMorph: false,
    tapLumen: false,
    profileLaws: false,
    wallTopologies: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--case') options.caseId = argv[++index];
    else if (argument === '--output') options.output = path.resolve(argv[++index]);
    else if (argument === '--app-root') options.appRoot = path.resolve(argv[++index]);
    else if (argument === '--headed') options.headed = true;
    else if (argument === '--throat-morph') options.throatMorph = true;
    else if (argument === '--tap-lumen') options.tapLumen = true;
    else if (argument === '--profile-laws') options.profileLaws = true;
    else if (argument === '--wall-topologies') options.wallTopologies = true;
    else if (argument === '--help') options.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  const focusedModes = [
    options.throatMorph,
    options.tapLumen,
    options.profileLaws,
    options.wallTopologies,
  ].filter(Boolean).length;
  if (focusedModes > 1) {
    throw new Error(
      '--throat-morph, --tap-lumen, --profile-laws, and --wall-topologies are mutually exclusive',
    );
  }
  if (!options.caseId) {
    options.caseId = options.throatMorph
      ? 'P01'
      : options.tapLumen ? 'P02'
        : options.profileLaws ? 'R02'
          : options.wallTopologies ? 'B649-USER-I' : 'R03';
  }
  if (!options.output) {
    options.output = options.throatMorph
      ? defaultThroatMorphOutput
      : options.tapLumen ? defaultTapLumenOutput
        : options.profileLaws ? defaultProfileLawsOutput
          : options.wallTopologies ? defaultWallTopologiesOutput : defaultOutput;
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node browser/render-inspection.mjs [options]

  --case ID       Canonical case to render (default R03)
  --output PATH   Artifact directory (mode-specific default)
  --app-root PATH Serve an alternate assembled v5 root (default current v5)
  --headed        Show Chromium while capturing
  --throat-morph  Capture the deterministic P01 throat-transition close-up
                  (an explicit --case may select another angular panel fixture)
  --tap-lumen     Capture deterministic P02 tap-lumen close-ups in SECTION,
                  TAP INSPECTION, and MOUNT ASSEMBLY — NO DRIVERS
  --profile-laws  Compare the three selectable smooth axial laws in the
                  deterministic R02 side-section camera (preview only).
                  The internal regression oracle remains node/core-only.
  --wall-topologies
                  Compare SMOOTH, CLASSIC ANGULAR and CURVED FACETS with one
                  fixed world-scale production camera and pixel mismatch gate.

The command self-hosts the assembled application on an ephemeral loopback
port, captures production WebGL views, measures framing/occupancy, and writes a
readable aspect-preserving contact sheet plus a machine-readable manifest.`);
}

function respondJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function createInspectionServer(appRoot) {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      if (url.pathname === '/pins') {
        if (request.method === 'GET') {
          respondJson(response, 200, { pins: [] });
          return;
        }
        if (request.method === 'POST') {
          request.resume();
          request.on('end', () => respondJson(response, 200, {
            ok: true,
            pins: [],
          }));
          return;
        }
        respondJson(response, 405, { ok: false, error: 'method' });
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method || '')) {
        response.writeHead(405);
        response.end('method not allowed');
        return;
      }
      const relative = decodeURIComponent(
        url.pathname === '/' ? '/meh5.html' : url.pathname,
      );
      const file = path.resolve(appRoot, `.${relative}`);
      if (file !== appRoot && !file.startsWith(`${appRoot}${path.sep}`)) {
        response.writeHead(403);
        response.end('forbidden');
        return;
      }
      const metadata = await stat(file);
      if (!metadata.isFile()) throw new Error('not a file');
      response.writeHead(200, {
        'Content-Type': mime[path.extname(file).toLowerCase()]
          || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      response.end('not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('inspection server did not expose a TCP address');
  }
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/meh5.html`,
  };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function pairwisePixelMismatch(captures, outputDirectory) {
  const decoded = new Map();
  for (const capture of captures) {
    decoded.set(
      capture.id,
      PNG.sync.read(await readFile(path.resolve(outputDirectory, capture.file))),
    );
  }
  const result = [];
  for (let left = 0; left < captures.length; left += 1) {
    for (let right = left + 1; right < captures.length; right += 1) {
      const a = decoded.get(captures[left].id);
      const b = decoded.get(captures[right].id);
      if (a.width !== b.width || a.height !== b.height) {
        throw new Error('wall-topology captures do not share one pixel frame');
      }
      let changed = 0;
      const pixels = a.width * a.height;
      for (let offset = 0; offset < a.data.length; offset += 4) {
        const delta = Math.max(
          Math.abs(a.data[offset] - b.data[offset]),
          Math.abs(a.data[offset + 1] - b.data[offset + 1]),
          Math.abs(a.data[offset + 2] - b.data[offset + 2]),
        );
        if (delta > 12) changed += 1;
      }
      result.push({
        left: captures[left].id,
        right: captures[right].id,
        changedPixels: changed,
        mismatchFraction: changed / pixels,
      });
    }
  }
  return result;
}

async function analyzePng(file) {
  const bytes = await readFile(file);
  const png = PNG.sync.read(bytes);
  let foreground = 0;
  let nearBlack = 0;
  let greenAccent = 0;
  let centerForeground = 0;
  let centerNearBlack = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  const centerBounds = {
    minX: Math.floor(png.width * 0.25),
    minY: Math.floor(png.height * 0.20),
    maxX: Math.ceil(png.width * 0.75) - 1,
    maxY: Math.ceil(png.height * 0.80) - 1,
  };
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const alpha = png.data[offset + 3];
      const difference = Math.max(
        Math.abs(red - 250),
        Math.abs(green - 250),
        Math.abs(blue - 250),
      );
      if (alpha > 16 && difference > 14) {
        foreground += 1;
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        if (luminance < 42) nearBlack += 1;
        if (
          x >= centerBounds.minX
          && x <= centerBounds.maxX
          && y >= centerBounds.minY
          && y <= centerBounds.maxY
        ) {
          centerForeground += 1;
          if (luminance < 42) centerNearBlack += 1;
        }
        if (
          green >= 70
          && green > red * 1.22
          && green > blue * 1.12
          && green - Math.max(red, blue) >= 24
        ) {
          greenAccent += 1;
        }
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const pixels = png.width * png.height;
  const centerPixels = (
    centerBounds.maxX - centerBounds.minX + 1
  ) * (
    centerBounds.maxY - centerBounds.minY + 1
  );
  const bounds = maxX >= 0 ? {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    widthFraction: (maxX - minX + 1) / png.width,
    heightFraction: (maxY - minY + 1) / png.height,
    touchesEdge: minX <= 1 || minY <= 1
      || maxX >= png.width - 2 || maxY >= png.height - 2,
  } : null;
  return {
    width: png.width,
    height: png.height,
    bytes: bytes.length,
    sha256: sha256(bytes),
    foregroundPixels: foreground,
    foregroundFraction: foreground / pixels,
    nearBlackPixels: nearBlack,
    nearBlackFraction: nearBlack / pixels,
    greenAccentPixels: greenAccent,
    greenAccentFraction: greenAccent / pixels,
    centerRegion: {
      ...centerBounds,
      pixels: centerPixels,
      foregroundPixels: centerForeground,
      foregroundFraction: centerForeground / centerPixels,
      nearBlackPixels: centerNearBlack,
      nearBlackFraction: centerNearBlack / centerPixels,
    },
    bounds,
  };
}

const contactGlyphs = Object.freeze({
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
});

function setPixel(image, x, y, red, green, blue, alpha = 255) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  image.data[offset] = red;
  image.data[offset + 1] = green;
  image.data[offset + 2] = blue;
  image.data[offset + 3] = alpha;
}

function drawContactLabel(image, x, y, text, maximumWidth) {
  const scale = 3;
  const value = String(text).toUpperCase();
  const textWidth = value.length * 6 * scale - scale;
  const barWidth = Math.min(textWidth + 24, maximumWidth - 20);
  const barHeight = 7 * scale + 16;
  for (let py = 0; py < barHeight; py += 1) {
    for (let px = 0; px < barWidth; px += 1) {
      const border = px === 0 || py === 0 || px === barWidth - 1 || py === barHeight - 1;
      setPixel(image, x + px, y + py, border ? 98 : 246, border ? 98 : 246,
        border ? 98 : 246);
    }
  }
  let cursor = x + 12;
  for (const character of value) {
    const glyph = contactGlyphs[character] || contactGlyphs[' '];
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel !== '1') return;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            setPixel(image, cursor + columnIndex * scale + sx,
              y + 8 + rowIndex * scale + sy, 42, 46, 45);
          }
        }
      });
    });
    cursor += 6 * scale;
  }
}

async function writeContactSheet(files, labels, output) {
  const images = await Promise.all(files.map(async (file) => (
    PNG.sync.read(await readFile(file))
  )));
  const columns = Math.min(2, Math.max(1, images.length));
  const rows = Math.max(1, Math.ceil(images.length / columns));
  const cellWidth = Math.floor(viewport.width / columns);
  const cellHeight = Math.round(cellWidth * viewport.height / viewport.width);
  const sheet = new PNG({
    width: cellWidth * columns,
    height: cellHeight * rows,
  });
  sheet.data.fill(250);
  images.forEach((source, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const startX = column * cellWidth;
    const startY = row * cellHeight;
    for (let y = 0; y < cellHeight; y += 1) {
      const sourceY = Math.min(
        source.height - 1,
        Math.floor(y * source.height / cellHeight),
      );
      for (let x = 0; x < cellWidth; x += 1) {
        const sourceX = Math.min(
          source.width - 1,
          Math.floor(x * source.width / cellWidth),
        );
        const from = (sourceY * source.width + sourceX) * 4;
        const to = ((startY + y) * sheet.width + startX + x) * 4;
        sheet.data[to] = source.data[from];
        sheet.data[to + 1] = source.data[from + 1];
        sheet.data[to + 2] = source.data[from + 2];
        sheet.data[to + 3] = source.data[from + 3];
      }
    }
    drawContactLabel(sheet, startX + 10, startY + 10, labels[index], cellWidth);
  });
  for (let divider = 1; divider < columns; divider += 1) {
    const center = divider * cellWidth;
    for (let y = 0; y < sheet.height; y += 1) {
      for (let x = center - 2; x <= center + 1; x += 1) {
        setPixel(sheet, x, y, 96, 96, 96);
      }
    }
  }
  for (let divider = 1; divider < rows; divider += 1) {
    const center = divider * cellHeight;
    for (let y = center - 2; y <= center + 1; y += 1) {
      for (let x = 0; x < sheet.width; x += 1) {
        setPixel(sheet, x, y, 96, 96, 96);
      }
    }
  }
  await writeFile(output, PNG.sync.write(sheet));
  return {
    columns,
    rows,
    cellWidth,
    cellHeight,
    width: sheet.width,
    height: sheet.height,
  };
}

function captureUrl(baseUrl, specification) {
  const url = new URL(baseUrl);
  url.searchParams.set('capture', '1');
  url.searchParams.set('view', specification.view);
  url.searchParams.set('inspection', specification.id);
  if (specification.mountFocus !== undefined) {
    url.searchParams.set('mountFocus', specification.mountFocus);
  }
  if (specification.profileLaw !== undefined) {
    url.searchParams.set('qaProfileLaw', specification.profileLaw);
  }
  if (specification.wallStyle !== undefined) {
    url.searchParams.set('qaWallStyle', specification.wallStyle);
  }
  return url.href;
}

async function settleRender(page) {
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
}

async function applyInspectionCamera(page, specification) {
  if (!specification.cameraPreset) return;
  await page.evaluate((cameraSpecification) => {
    const plan = window.__solved?.ev?.plan;
    if (!plan || typeof V3D === 'undefined' || typeof THREE === 'undefined') {
      throw new Error(
        `${cameraSpecification.cameraPreset} camera has no solved plan or viewer`,
      );
    }
    const scenePoint = (point) => new THREE.Vector3(
      point[0],
      point[2],
      point[1],
    );
    const hideNonShellLayers = () => {
      V3D.group?.traverse((object) => {
        const tag = object?.userData?.tag;
        if (tag && tag !== 'shell') object.visible = false;
      });
    };
    const publishCameraContract = (extra = {}) => {
      window.__renderInspectionCamera = {
        preset: cameraSpecification.cameraPreset,
        yaw: Number(V3D.yaw),
        pitch: Number(V3D.pitch),
        dist: Number(V3D.dist),
        bound: Number(V3D.bnd),
        target: V3D.tgt.toArray().map(Number),
        ...extra,
      };
    };

    if (cameraSpecification.cameraPreset === 'throat-morph') {
      /* A fixed sectioned, mouth-side oblique shows both axial smoothness and
         the round-to-panel cross-section. Keep only the production shell
         visible so driver translucency cannot disguise a pinch or lobe. */
      V3D.yaw = 0.42;
      V3D.pitch = 0.14;
      V3D.dist = 1.0;
      V3D.bnd = Math.max(
        0.05,
        plan.throatMorphL * 1.05,
        plan.throatR * 3.2,
      );
      V3D.tgt.set(plan.throatMorphL * 0.46, 0, 0);
      hideNonShellLayers();
      publishCameraContract();
    } else if (cameraSpecification.cameraPreset === 'throat-profile-side') {
      /* Look squarely into the clipped half from the discarded side. This
         keeps the throat, morph, and early flare in one readable axial
         profile instead of conflating the section with an exterior view. */
      V3D.yaw = Math.PI / 2;
      V3D.pitch = 0.055;
      V3D.dist = 1.02;
      V3D.bnd = Math.max(
        0.075,
        plan.throatMorphL * 2.05,
        plan.station * 0.78,
      );
      V3D.tgt.set(
        Math.min(plan.station * 0.52, plan.throatMorphL * 1.55),
        0,
        0,
      );
      hideNonShellLayers();
      publishCameraContract();
    } else if (cameraSpecification.cameraPreset === 'tap-lumen') {
      const driverIndex = cameraSpecification.driverIndex ?? 0;
      const portIndex = cameraSpecification.portIndex ?? 0;
      const driver = plan.drivers?.[driverIndex];
      const port = driver?.ports?.[portIndex];
      if (!driver || !port) {
        throw new Error(
          `tap-lumen camera cannot find driver ${driverIndex}, port ${portIndex}`,
        );
      }
      const normal = scenePoint(port.normal).normalize();
      const cross = scenePoint(port.cross).normalize();
      const sectionFaceOn = cameraSpecification.view === 'section';
      const eyeDirection = normal.clone()
        .addScaledVector(cross, sectionFaceOn ? 0 : -0.32)
        .normalize();
      V3D.yaw = Math.atan2(eyeDirection.z, eyeDirection.x);
      V3D.pitch = Math.asin(Math.max(-1, Math.min(1, eyeDirection.y)));
      V3D.dist = 1.06;
      V3D.bnd = Math.max(0.05, port.sa * 1.45, port.sb * 4.0);
      V3D.tgt.copy(
        scenePoint(port.center).addScaledVector(normal, 0.004),
      );
      /* SECTION constructs driver bodies before this QA-only camera is
         applied. Hide them in the witness so the same aperture and registered
         cell layers remain readable in all three production view modes. */
      V3D.group?.traverse((object) => {
        if (object?.userData?.tag === 'driver') object.visible = false;
        if (
          cameraSpecification.view === 'section'
          && [
            'mount-land',
            'gasket',
            'driver-pocket',
            'driver-pocket-wall',
            'driver-pocket-floor',
          ].includes(object?.userData?.tag)
        ) {
          object.visible = false;
        }
      });
      publishCameraContract({
        driverIndex,
        portIndex,
        view: cameraSpecification.view,
        sectionFaceOn,
      });
    } else if (cameraSpecification.cameraPreset === 'profile-law-side') {
      const points = plan.st?.pts || [];
      const mouth = points[points.length - 1];
      if (
        plan.S?.style !== 'smooth'
        || !plan.st?.profileLaw
        || !Number.isFinite(plan.st?.depth)
        || !mouth
      ) {
        throw new Error(
          'profile-law-side camera requires a solved smooth profile record',
        );
      }
      /* Square-on clipped-side framing keeps all four comparisons at their
         solved depth and mouth scale. Only the production shell remains, so
         driver, mount, and tap helpers cannot obscure the meridian. */
      V3D.yaw = Math.PI / 2;
      V3D.pitch = 0;
      V3D.dist = 1.14;
      V3D.bnd = Math.max(
        0.08,
        plan.st.depth * 0.68,
        Number(mouth.b || mouth.a) * 1.36,
      );
      V3D.tgt.set(plan.st.depth * 0.5, 0, 0);
      hideNonShellLayers();
      publishCameraContract({
        profileLaw: plan.st.profileLaw.family,
        profileHash: plan.st.profileHash,
        sampleCount: points.length,
      });
    } else if (cameraSpecification.cameraPreset === 'wall-topology-fixed') {
      const profileHash = plan.st?.profileHash || null;
      const curved = typeof MEH2?.curvedFacetDiagnostics === 'function'
        ? MEH2.curvedFacetDiagnostics(plan.st) : null;
      /* Intentionally fixed world frame: unlike the ordinary viewer, this
         camera does not refit when topology changes. */
      V3D.yaw = 0.64;
      V3D.pitch = 0.18;
      V3D.dist = 1.16;
      V3D.bnd = 0.56;
      V3D.tgt.set(0.20, 0, 0);
      hideNonShellLayers();
      publishCameraContract({
        wallStyle: plan.S?.style,
        profileHash,
        seamCount: curved?.seamCount || 0,
        fixedWorldScale: true,
      });
    } else {
      throw new Error(
        `unknown inspection camera preset: ${cameraSpecification.cameraPreset}`,
      );
    }
    render3d();
  }, {
    cameraPreset: specification.cameraPreset,
    view: specification.view,
    driverIndex: specification.driverIndex,
    portIndex: specification.portIndex,
    profileLaw: specification.profileLaw,
    wallStyle: specification.wallStyle,
  });
  await settleRender(page);
}

async function capture(page, baseUrl, outputDirectory, specification) {
  const url = captureUrl(baseUrl, specification);
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#v3d canvas');
    const runtime = window.__twoMeshRuntime;
    return Boolean(
      canvas
      && canvas.width >= 1500
      && canvas.height >= 900
      && window.__solved
      && (!runtime || runtime.active !== true),
    );
  }, null, { timeout: 45_000 });
  await settleRender(page);
  await page.waitForTimeout(180);
  await applyInspectionCamera(page, specification);

  const diagnostics = await page.evaluate((inspectionSpecification) => {
    const solved = window.__solved;
    const plan = solved?.ev?.plan;
    const mount = window.__panelMountQA || null;
    const driverIndex = Number.isInteger(inspectionSpecification.driverIndex)
      ? inspectionSpecification.driverIndex : 0;
    const portIndex = Number.isInteger(inspectionSpecification.portIndex)
      ? inspectionSpecification.portIndex : 0;
    const selectedDriver = plan?.drivers?.[driverIndex] || null;
    const selectedPort = selectedDriver?.ports?.[portIndex] || null;
    const selectedTool = window.__twoWayGeometry?.visualTools
      ?.tapTools?.[driverIndex]?.[portIndex] || null;
    const millimetres = (value) => Number((Number(value) * 1000).toFixed(6));
    const vectorMm = (vector) => (
      Array.isArray(vector) ? vector.map(millimetres) : null
    );
    const distanceMm = (a, b) => (
      Array.isArray(a) && Array.isArray(b)
        ? millimetres(Math.hypot(
          b[0] - a[0],
          b[1] - a[1],
          b[2] - a[2],
        ))
        : null
    );
    const toolSections = selectedTool
      ? (
        selectedTool.kind === 'swept-aperture'
          ? selectedTool.sections || []
          : [selectedTool]
      )
      : [];
    const normalizedSections = toolSections.map((section) => ({
      aMm: vectorMm(section.a),
      bMm: vectorMm(section.b),
      semiLengthMm: millimetres(section.sa),
      semiWidthMm: millimetres(section.sb),
      shape: section.shape || selectedTool?.shape || selectedPort?.shape || null,
      stage: section.stage || null,
    }));
    const tapWitness = selectedPort ? {
      driverIndex,
      portIndex,
      port: {
        centerMm: vectorMm(selectedPort.center),
        normal: selectedPort.normal?.map((value) => Number(value.toFixed(9))) || null,
        shape: selectedPort.shape || null,
        semiLengthMm: millimetres(selectedPort.sa),
        semiWidthMm: millimetres(selectedPort.sb),
      },
      cutter: selectedTool ? {
        kind: selectedTool.kind || 'straight',
        shape: selectedTool.shape || selectedPort.shape || null,
        sectionCount: toolSections.length,
        lengthMm: Number(toolSections.reduce(
          (sum, section) => sum + (distanceMm(section.a, section.b) || 0),
          0,
        ).toFixed(6)),
        sections: normalizedSections,
      } : null,
    } : null;
    if (tapWitness) {
      tapWitness.signature = JSON.stringify({
        port: tapWitness.port,
        cutter: tapWitness.cutter,
      });
    }
    const visibleTags = {};
    const visibleTagRoots = {};
    const totalTags = {};
    const root = typeof V3D !== 'undefined' ? V3D.group : null;
    const isEffectivelyVisible = (object) => {
      for (let node = object; node; node = node.parent) {
        if (node.visible === false) return false;
        if (node === root) return true;
      }
      return false;
    };
    root?.traverse((object) => {
      const tag = object?.userData?.tag;
      if (!tag) return;
      totalTags[tag] = (totalTags[tag] || 0) + 1;
      if (isEffectivelyVisible(object)) {
        visibleTags[tag] = (visibleTags[tag] || 0) + 1;
        if (object.parent?.userData?.tag !== tag) {
          visibleTagRoots[tag] = (visibleTagRoots[tag] || 0) + 1;
        }
      }
    });
    const emptyCellDepthShaders = [];
    const inspectedDepthMaterials = new Set();
    root?.traverse((object) => {
      if (!object?.isMesh || !isEffectivelyVisible(object)) return;
      const materials = Array.isArray(object.material)
        ? object.material : [object.material];
      for (const material of materials) {
        if (
          material?.userData?.emptyCellDepthCue !== true
          || inspectedDepthMaterials.has(material.uuid)
        ) continue;
        inspectedDepthMaterials.add(material.uuid);
        const shaderSource =
          material.userData.tapBooleanShader?.fragmentShader || '';
        const declarationIndex = shaderSource.indexOf('vec4 diffuseColor');
        const shadeIndex =
          shaderSource.indexOf('diffuseColor.rgb*=mehCellShade;');
        emptyCellDepthShaders.push({
          materialType: material.type || null,
          compiled: shaderSource.length > 0,
          declarationIndex,
          shadeIndex,
          declarationBeforeShade:
            declarationIndex >= 0 && shadeIndex > declarationIndex,
        });
      }
    });
    const failures = (solved?.ev?.rows || [])
      .filter((row) => row.st === 'fail')
      .map((row) => ({
        section: row.sec,
        name: row.name,
        value: row.val,
        code: row.code || null,
      }));
    return {
      build: window.MEH_BUILD,
      infeasible: Boolean(solved?.infeasible),
      failures,
      view: document.querySelector('#viewSel')?.value || null,
      viewLabel: document.querySelector('#viewSel option:checked')?.textContent?.trim() || null,
      mountFocus: document.querySelector('#mountFocusSel')?.value || null,
      mount,
      inspectionCamera: window.__renderInspectionCamera || null,
      tapWitness,
      exactMeshRuntime: window.__twoMeshRuntime || null,
      emptyCellDepthShaders,
      camera: typeof V3D !== 'undefined' ? {
        yaw: Number(V3D.yaw),
        pitch: Number(V3D.pitch),
        dist: Number(V3D.dist),
        bound: Number(V3D.bnd),
        target: V3D.tgt?.toArray?.().map(Number) || null,
      } : null,
      scene: {
        visibleTags,
        visibleTagRoots,
        totalTags,
      },
      plan: plan ? {
        family: plan.family,
        style: plan.S?.style || null,
        wallTopology: plan.st?.wallTopology || null,
        curvedFacets: typeof MEH2?.curvedFacetDiagnostics === 'function'
          ? MEH2.curvedFacetDiagnostics(plan.st) : null,
        driverCount: plan.drivers.length,
        throatRadiusMm: plan.throatR * 1000,
        throatMorphLengthMm: plan.throatMorphL * 1000,
        hornDepthMm: plan.st?.depth * 1000,
        stationMm: plan.station * 1000,
        adapterReachMm: plan.adapterReach * 1000,
        radialFaceClearanceMm: Number.isFinite(plan.radialFaceClearance)
          ? plan.radialFaceClearance * 1000 : null,
        radialFaceCoverage: Number.isFinite(plan.radialFaceCoverage)
          ? plan.radialFaceCoverage : null,
        radialChamberClearanceMm: Number.isFinite(plan.radialChamberClearance)
          ? plan.radialChamberClearance * 1000 : null,
        radialChamberCoverage: Number.isFinite(plan.radialChamberCoverage)
          ? plan.radialChamberCoverage : null,
        chamberTargetCm3: plan.chamberV * 1e6,
        generatedChamberCm3: Number.isFinite(plan.radialPhysicalChamberVolume)
          ? plan.radialPhysicalChamberVolume * 1e6 : null,
        profileLaw: plan.st?.profileLaw ? {
          family: plan.st.profileLaw.family,
          lawId: plan.st.profileLaw.lawId,
          label: plan.st.profileLaw.label,
          profileHash: plan.st.profileHash,
          sampleCount: plan.st.pts?.length || 0,
          endpoints: plan.st.profileLaw.endpoints,
          monotonic: plan.st.profileMonotonic,
          nativeTermination: plan.st.nativeTermination,
          buildTermination: plan.st.mouthTermination,
        } : null,
      } : null,
    };
  }, {
    driverIndex: specification.driverIndex,
    portIndex: specification.portIndex,
  });
  if (diagnostics.infeasible || diagnostics.failures.length) {
    throw new Error(
      `${specification.id} rendered a refused design: `
      + JSON.stringify(diagnostics.failures),
    );
  }
  if (diagnostics.view !== specification.view) {
    throw new Error(
      `${specification.id} selected ${diagnostics.view}, expected ${specification.view}`,
    );
  }
  if (
    specification.mountFocus !== undefined
    && diagnostics.mountFocus !== specification.mountFocus
  ) {
    throw new Error(
      `${specification.id} selected mount focus ${diagnostics.mountFocus}, `
      + `expected ${specification.mountFocus}`,
    );
  }
  if (!diagnostics.mount || !diagnostics.plan) {
    throw new Error(`${specification.id} did not publish render diagnostics`);
  }
  const { mount, plan, scene } = diagnostics;
  const failures = [];
  const require = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const requirePublishedCameraContract = (preset) => {
    const contract = diagnostics.inspectionCamera;
    require(contract?.preset === preset,
      `missing ${preset} camera contract`);
    for (const key of ['yaw', 'pitch', 'dist', 'bound']) {
      require(
        Number.isFinite(contract?.[key])
          && Number.isFinite(diagnostics.camera?.[key])
          && Math.abs(contract[key] - diagnostics.camera[key]) <= 1e-9,
        `${preset} camera ${key} drifted: `
          + `${contract?.[key]} != ${diagnostics.camera?.[key]}`,
      );
    }
    require(
      Array.isArray(contract?.target)
        && Array.isArray(diagnostics.camera?.target)
        && contract.target.length === diagnostics.camera.target.length
        && contract.target.every(
          (value, index) => Math.abs(
            value - diagnostics.camera.target[index],
          ) <= 1e-9,
        ),
      `${preset} camera target drifted`,
    );
  };
  const expectedTapHelperCount = specification.view === 'nodrv'
    ? 0
    : mount.expectedTapCount;
  require(
    mount.tapInterfaceCount === expectedTapHelperCount,
    `tap interfaces ${mount.tapInterfaceCount}/${expectedTapHelperCount}`,
  );
  const expectedDriverBodyCount = ['full', 'ghost', 'section']
    .includes(specification.view) ? mount.driverCount : 0;
  require(
    mount.driverBodyCount === expectedDriverBodyCount,
    `driver bodies ${mount.driverBodyCount}; expected ${expectedDriverBodyCount}`,
  );
  if (plan.family === 'radial') {
    require(plan.radialFaceCoverage >= 0.999999,
      `radial bearing-face coverage ${plan.radialFaceCoverage}`);
    require(plan.radialFaceClearanceMm >= -0.001,
      `radial bearing-face clearance ${plan.radialFaceClearanceMm} mm`);
    require(plan.radialChamberCoverage >= 0.999999,
      `radial chamber coverage ${plan.radialChamberCoverage}`);
    require(plan.radialChamberClearanceMm >= -0.001,
      `radial chamber clearance ${plan.radialChamberClearanceMm} mm`);
    require(
      Math.abs(plan.generatedChamberCm3 - plan.chamberTargetCm3) <= 0.01,
      `generated chamber ${plan.generatedChamberCm3} cm³; `
        + `target ${plan.chamberTargetCm3} cm³`,
    );
    require(mount.invariants?.mountsOutsideForbiddenVolume === true,
      'analytic radial mount enters the solved horn/profile volume');
    require(mount.invariants?.integratedRootsConnected === true,
      'integrated radial mount lacks a conformal root bridge');
    require(mount.invariants?.detachableGasketsComplete === true,
      'detachable radial seam is not occupied by a conformal gasket');
    require(mount.invariants?.sealsContinuous === true,
      'radial mount/interface seal is geometrically discontinuous');
  }
  if (specification.id === 'mount-plate-1') {
    require(mount.isolatedInspection === true,
      'focused mount mode is not isolated');
    require(mount.focusedFaceOverlayCount === 1,
      `focused face overlays ${mount.focusedFaceOverlayCount}/1`);
    require((scene.visibleTags['mount-focus-face'] || 0) === 1,
      `visible focused faces ${scene.visibleTags['mount-focus-face'] || 0}/1`);
    require((scene.visibleTags.shell || 0) === 0,
      `focused view exposes ${scene.visibleTags.shell || 0} horn shells`);
    require((scene.visibleTags['detachable-module'] || 0) === 0,
      'focused view exposes a detachable module loft');
    require((scene.visibleTags['mount-joint-gasket'] || 0) === 0,
      'focused view exposes a loose joint gasket');
    const expectedBcdHoles = mount.driverPocketHoleCount / mount.driverCount;
    require(
      mount.focusedDriverPocketHoleCount === expectedBcdHoles,
      `focused BCD holes ${mount.focusedDriverPocketHoleCount}/${expectedBcdHoles}`,
    );
    require(
      (scene.visibleTags['retention-feature'] || 0) === 0,
      'focused driver-bearing plate projects horn-root retention geometry',
    );
  } else if (specification.id === 'complete-driver-cell-1') {
    require(mount.completeCellInspection === true,
      'complete driver-cell mode did not enter isolated cell inspection');
    require(mount.isolatedInspection === true,
      'complete driver cell is not isolated');
    require(mount.invariants?.completeCellHasNoDriver === true,
      'complete driver cell contains a driver body');
    require(mount.invariants?.completeCellHasMount === true,
      'complete driver cell has no solved relief/module');
    require(mount.invariants?.completeCellHasBearingFace === true,
      'complete driver cell has no bearing face');
    require(mount.invariants?.completeCellHasGasket === true,
      'complete driver cell has no driver gasket');
    require(mount.invariants?.completeCellHasTapPaths === true,
      'complete driver cell lacks canonical tap paths');
    require(mount.invariants?.completeCellHasBoltDetails === true,
      'complete driver cell lacks canonical BCD pockets');
    require(mount.invariants?.completeCellHasOwnedRetention === true,
      'complete cartridge cell lacks its owned retention details');
    require((scene.visibleTags.shell || 0) === 0,
      `complete cell exposes ${scene.visibleTags.shell || 0} horn shells`);
    require((scene.visibleTags.driver || 0) === 0,
      `complete cell exposes ${scene.visibleTags.driver || 0} driver roots`);
    require((scene.visibleTags['driver-cell-bearing-face'] || 0) === 1,
      `complete cell bearing faces `
        + `${scene.visibleTags['driver-cell-bearing-face'] || 0}/1`);
    require(
      (scene.visibleTagRoots['driver-cell-tap-interface'] || 0)
        === mount.focusedExpectedTapCount,
      `complete cell tap roots `
        + `${scene.visibleTagRoots['driver-cell-tap-interface'] || 0}/`
        + `${mount.focusedExpectedTapCount}`,
    );
    require(mount.visibleMountLandCount === 1,
      `visible complete-cell lands ${mount.visibleMountLandCount}/1`);
    require(mount.visibleGasketCount === 1,
      `visible complete-cell gaskets ${mount.visibleGasketCount}/1`);
    require(mount.visibleDriverPocketRootCount === 1,
      `visible complete-cell BCD roots ${mount.visibleDriverPocketRootCount}/1`);
    require(
      mount.visibleRetentionFeatureCount
        === mount.focusedExpectedRetentionFeatureCount,
      `visible complete-cell retention ${mount.visibleRetentionFeatureCount}/`
        + `${mount.focusedExpectedRetentionFeatureCount}`,
    );
  } else if (specification.id === 'mount-assembly') {
    const expectedDetachableJoints = mount.mountMode === 'detachable'
      ? mount.driverCount : 0;
    require(mount.isolatedInspection === false,
      'assembly overview remained in focused mode');
    require(mount.mountLandCount === mount.driverCount,
      `mount lands ${mount.mountLandCount}/${mount.driverCount}`);
    require(mount.gasketCount === mount.driverCount,
      `driver gaskets ${mount.gasketCount}/${mount.driverCount}`);
    require(mount.detachableJointCount === expectedDetachableJoints,
      `detachable joints ${mount.detachableJointCount}/`
        + `${expectedDetachableJoints}`);
    require((scene.visibleTags.shell || 0) >= 1,
      'assembly overview has no visible horn/interface shell');
  } else if (specification.id === 'no-driver-assembly') {
    require(mount.isolatedInspection === false,
      'no-driver assembly incorrectly entered focused plate mode');
    require(mount.invariants?.noDriverAssemblyHasNoDrivers === true,
      'no-driver assembly reports a driver body');
    require((scene.visibleTags.driver || 0) === 0,
      `no-driver assembly exposes ${scene.visibleTags.driver || 0} driver roots`);
    require(mount.mountLandCount === mount.driverCount,
      `no-driver mount lands ${mount.mountLandCount}/${mount.driverCount}`);
    require(mount.gasketCount === mount.driverCount,
      `no-driver gaskets ${mount.gasketCount}/${mount.driverCount}`);
    require(mount.driverPocketRootCount === mount.driverCount,
      `no-driver pocket roots ${mount.driverPocketRootCount}/${mount.driverCount}`);
    require(mount.driverPocketHoleCount > 0,
      'no-driver assembly has no exact BCD pockets');
    require((scene.visibleTags.shell || 0) >= 1,
      'no-driver assembly has no visible horn/interface shell');
    require((scene.visibleTags['tap-interface'] || 0) === 0,
      'no-driver assembly exposes tap helper geometry');
    require(
      (scene.visibleTagRoots['tap-passage-wall'] || 0)
        === mount.expectedTapCount,
      `no-driver physical passage walls ${
        scene.visibleTagRoots['tap-passage-wall'] || 0
      }/${mount.expectedTapCount}`,
    );
    require(
      mount.tapPassageWallCount === mount.expectedTapCount
        && mount.visibleTapPassageWallCount === mount.expectedTapCount,
      `no-driver passage-wall diagnostics ${
        mount.visibleTapPassageWallCount
      }/${mount.expectedTapCount}`,
    );
    if (mount.family === 'panel') {
      require(mount.invariants?.emptyPanelCellsDepthCued === true,
        'no-driver panel chamber lacks the canonical recessed-depth cue');
      require(
        mount.mountRoots.every((root) => (
          root.emptyCellDepthCue === true
          && root.emptyCellDepthCueAuthority
            === 'twoway-core driverFace→cavInner cone-relief datums'
        )),
        'no-driver panel mount lost its cone-relief depth-cue ownership',
      );
      require(
        diagnostics.emptyCellDepthShaders?.length >= mount.driverCount
          && diagnostics.emptyCellDepthShaders.every((shader) => (
            shader.materialType === 'MeshBasicMaterial'
            && shader.compiled === true
            && shader.declarationBeforeShade === true
          )),
        'no-driver empty-cell GLSL shades diffuseColor before its declaration',
      );
    }
    if (mount.mountMode === 'detachable') {
      require(mount.detachableJointCount === mount.driverCount,
        `no-driver detachable joints ${mount.detachableJointCount}/${mount.driverCount}`);
      require((scene.visibleTagRoots['detachable-module'] || 0) === mount.driverCount,
        `visible module roots ${scene.visibleTagRoots['detachable-module'] || 0}/`
          + `${mount.driverCount}`);
      require((scene.visibleTagRoots['mount-joint-gasket'] || 0) === mount.driverCount,
        `visible joint gasket roots ${scene.visibleTagRoots['mount-joint-gasket'] || 0}/`
          + `${mount.driverCount}`);
      require(mount.retentionFeatureCount === mount.expectedRetentionFeatureCount,
        `retention features ${mount.retentionFeatureCount}/`
          + `${mount.expectedRetentionFeatureCount}`);
      require(
        (scene.visibleTags['retention-feature'] || 0)
          === mount.expectedRetentionFeatureCount,
        `visible retention roots ${scene.visibleTags['retention-feature'] || 0}/`
          + `${mount.expectedRetentionFeatureCount}`,
      );
    }
    require(/MOUNT ASSEMBLY/i.test(diagnostics.viewLabel || '')
      && /NO DRIVERS/i.test(diagnostics.viewLabel || ''),
    `ambiguous no-driver view label: ${diagnostics.viewLabel}`);
    require(Number.isFinite(diagnostics.camera?.yaw)
      && diagnostics.camera.yaw >= 2.2
      && diagnostics.camera.yaw <= 2.9,
    `no-driver camera yaw is not rear three-quarter: ${diagnostics.camera?.yaw}`);
    require(Number.isFinite(diagnostics.camera?.pitch)
      && diagnostics.camera.pitch >= 0.15
      && diagnostics.camera.pitch <= 0.65,
    `no-driver camera pitch is not oblique: ${diagnostics.camera?.pitch}`);
    require(Array.isArray(diagnostics.camera?.target)
      && Math.abs(diagnostics.camera.target[0] * 1000 - plan.stationMm) <= 0.01,
    'no-driver camera does not target the solved mount station');
  } else if (specification.id === 'front-full') {
    require(mount.mountLandCount === mount.driverCount,
      `full-view mount lands ${mount.mountLandCount}/${mount.driverCount}`);
    require(mount.invariants?.allDriversPresent === true,
      'full view does not contain every solved driver');
    for (const tag of [
      'detachable-module',
      'mount-joint-gasket',
      'driver-pocket',
      'retention-feature',
      'gasket',
    ]) {
      require(
        (scene.visibleTags[tag] || 0) === 0,
        `full view exposes ${scene.visibleTags[tag] || 0} ${tag} review helpers`,
      );
    }
  } else if (specification.id === 'literal-taps') {
    const visibleTapPathRoots = (
      scene.visibleTags['tap-interface-wall'] || 0
    ) + (
      scene.visibleTags['tap-interface'] || 0
    );
    require(mount.mountLandCount === 0,
      `tap-only view contains ${mount.mountLandCount} mount lands`);
    require((scene.visibleTags.shell || 0) >= 1,
      'tap view has no visible horn/interface shell');
    require(visibleTapPathRoots >= mount.expectedTapCount,
      `tap view exposes ${visibleTapPathRoots} `
        + `recessed path walls for ${mount.expectedTapCount} taps`);
  } else if (specification.id.startsWith('tap-lumen-')) {
    const witness = diagnostics.tapWitness;
    const visibleTapHelpers = (
      scene.visibleTags['tap-interface'] || 0
    ) + (
      scene.visibleTags['tap-interface-wall'] || 0
    );
    require(plan.family === 'panel',
      `tap-lumen close-up requires panel geometry, received ${plan.family}`);
    require(plan.style === 'angular',
      `tap-lumen close-up requires angular geometry, received ${plan.style}`);
    require(mount.tapBooleanClipApplied === true,
      'canonical tap Boolean clipping is not active');
    require(mount.tapBooleanClipCount === mount.expectedTapCount,
      `Boolean tap cuts ${mount.tapBooleanClipCount}/${mount.expectedTapCount}`);
    for (const target of [
      'horn-shell',
      'driver-cell',
    ]) {
      require(mount.tapBooleanTargets?.includes(target),
        `tap Boolean target is missing ${target}`);
    }
    require(witness?.driverIndex === specification.driverIndex
      && witness?.portIndex === specification.portIndex,
    `wrong tap witness: ${witness?.driverIndex}/${witness?.portIndex}`);
    require(witness?.port?.shape === witness?.cutter?.shape,
      `port/cutter shape mismatch: ${witness?.port?.shape}/`
        + `${witness?.cutter?.shape}`);
    require(['straight', 'swept-aperture'].includes(witness?.cutter?.kind),
      `unsupported canonical cutter ${witness?.cutter?.kind}`);
    require(witness?.cutter?.sectionCount >= 1,
      `canonical cutter has ${witness?.cutter?.sectionCount} sections`);
    require(witness?.cutter?.lengthMm > 0,
      `canonical cutter length is ${witness?.cutter?.lengthMm} mm`);
    require((scene.visibleTags.shell || 0) >= 1,
      'tap-lumen close-up has no visible production shell');
    require((scene.visibleTags.driver || 0) === 0,
      `tap-lumen close-up exposes ${scene.visibleTags.driver || 0} drivers`);
    requirePublishedCameraContract('tap-lumen');
    require(
      diagnostics.inspectionCamera?.driverIndex === specification.driverIndex
        && diagnostics.inspectionCamera?.portIndex === specification.portIndex,
      'tap-lumen camera is not locked to the selected canonical port',
    );
    if (specification.view === 'nodrv') {
      require(visibleTapHelpers === 0,
        `NO DRIVERS exposes ${visibleTapHelpers} tap helper layers`);
      require(
        (scene.visibleTagRoots['tap-passage-wall'] || 0)
          === mount.expectedTapCount,
        `NO DRIVERS exposes ${
          scene.visibleTagRoots['tap-passage-wall'] || 0
        }/${mount.expectedTapCount} physical passage walls`,
      );
      require(/NO DRIVERS/i.test(diagnostics.viewLabel || ''),
        `ambiguous no-driver close-up label: ${diagnostics.viewLabel}`);
    } else {
      require(visibleTapHelpers >= mount.expectedTapCount,
        `${specification.view} exposes ${visibleTapHelpers} helper layers `
          + `for ${mount.expectedTapCount} taps`);
    }
  } else if (
    specification.id === 'throat-morph-closeup'
    || specification.id === 'throat-profile-side-section'
  ) {
    require(plan.family === 'panel',
      `throat close-up requires panel geometry, received ${plan.family}`);
    require(plan.style === 'angular',
      `throat close-up requires angular geometry, received ${plan.style}`);
    require(plan.throatMorphLengthMm > 0,
      `invalid throat morph length ${plan.throatMorphLengthMm} mm`);
    require((scene.visibleTags.shell || 0) >= 1,
      'throat close-up has no visible production shell');
    require((scene.visibleTags.driver || 0) === 0,
      `throat close-up exposes ${scene.visibleTags.driver || 0} drivers`);
    requirePublishedCameraContract(specification.cameraPreset);
    if (specification.id === 'throat-morph-closeup') {
      require(
        Array.isArray(diagnostics.camera?.target)
          && Math.abs(
            diagnostics.camera.target[0] * 1000
            - plan.throatMorphLengthMm * 0.46
          ) <= 0.01,
        'throat close-up camera is not locked to the morph midpoint',
      );
      require(
        Math.abs(diagnostics.camera?.yaw - 0.42) <= 1e-9
          && Math.abs(diagnostics.camera?.pitch - 0.14) <= 1e-9
          && Math.abs(diagnostics.camera?.dist - 1.0) <= 1e-9,
        `throat close-up camera drifted: ${JSON.stringify(diagnostics.camera)}`,
      );
    } else {
      require(
        Math.abs(diagnostics.camera?.yaw - Math.PI / 2) <= 1e-9
          && Math.abs(diagnostics.camera?.pitch - 0.055) <= 1e-9
          && Math.abs(diagnostics.camera?.dist - 1.02) <= 1e-9,
        `throat side-profile camera drifted: `
          + `${JSON.stringify(diagnostics.camera)}`,
      );
    }
  } else if (specification.id.startsWith('profile-law-')) {
    const profile = plan.profileLaw;
    require(plan.style === 'smooth',
      `profile-law comparison requires smooth geometry, received ${plan.style}`);
    require(profile?.family === specification.profileLaw,
      `resolved profile ${profile?.family}, expected ${specification.profileLaw}`);
    require(profile?.lawId === specification.profileLaw,
      `resolved law ID ${profile?.lawId}, expected ${specification.profileLaw}`);
    require(/^pl1-[0-9a-f]{8}$/.test(profile?.profileHash || ''),
      `invalid profile hash ${profile?.profileHash}`);
    require(profile?.sampleCount === 49,
      `profile sample count ${profile?.sampleCount}/49`);
    require(
      profile?.monotonic?.axial === true
        && profile?.monotonic?.radial === true,
      `profile is not monotone: ${JSON.stringify(profile?.monotonic)}`,
    );
    require(
      profile?.buildTermination
        === 'flat printed baffle; no additional rollback',
      `unexpected build termination: ${profile?.buildTermination}`,
    );
    require((scene.visibleTags.shell || 0) >= 1,
      'profile-law side section has no visible production shell');
    require((scene.visibleTags.driver || 0) === 0,
      `profile-law side section exposes ${scene.visibleTags.driver || 0} drivers`);
    require(Boolean(diagnostics.exactMeshRuntime),
      'profile-law comparison did not publish exact-mesh runtime state');
    require(diagnostics.exactMeshRuntime?.active !== true,
      'profile-law comparison started exact mesh work');
    require(diagnostics.exactMeshRuntime?.exactReady !== true,
      'profile-law comparison reused an exact mesh instead of the preview shell');
    requirePublishedCameraContract('profile-law-side');
    require(
      diagnostics.inspectionCamera?.profileLaw === specification.profileLaw
        && diagnostics.inspectionCamera?.profileHash === profile?.profileHash
        && diagnostics.inspectionCamera?.sampleCount === 49,
      'profile-law camera contract does not match the solved meridian',
    );
    require(
      Math.abs(diagnostics.camera?.yaw - Math.PI / 2) <= 1e-9
        && Math.abs(diagnostics.camera?.pitch) <= 1e-9
        && Math.abs(diagnostics.camera?.dist - 1.14) <= 1e-9,
      `profile-law side camera drifted: ${JSON.stringify(diagnostics.camera)}`,
    );
  } else if (specification.id.startsWith('wall-topology-')) {
    require(plan.style === specification.wallStyle,
      `resolved wall style ${plan.style}, expected ${specification.wallStyle}`);
    require((scene.visibleTags.shell || 0) >= 1,
      'wall-topology witness has no visible production shell');
    require((scene.visibleTags.driver || 0) === 0,
      'wall-topology witness exposes a driver');
    requirePublishedCameraContract('wall-topology-fixed');
    require(diagnostics.inspectionCamera?.fixedWorldScale === true,
      'wall-topology camera was auto-fitted');
    if (specification.wallStyle === 'curvedFacets') {
      require(plan.wallTopology === 'curvedFacets',
        `curved-facet station topology is ${plan.wallTopology}`);
      require(plan.curvedFacets?.seamCount === 4,
        `curved-facet seams ${plan.curvedFacets?.seamCount}/4`);
      require(plan.curvedFacets?.developable === true,
        'curved-facet faces are not declared developable');
    }
  }
  if (failures.length) {
    throw new Error(
      `${specification.id} failed semantic inspection:\n- `
        + failures.join('\n- '),
    );
  }

  const file = path.resolve(outputDirectory, `${specification.id}.png`);
  await page.locator('#v3d canvas').screenshot({
    path: file,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
  const pixels = await analyzePng(file);
  const closeup = Boolean(specification.cameraPreset);
  if (
    pixels.foregroundFraction < (closeup ? 0.015 : 0.005)
    || !pixels.bounds
    || pixels.bounds.widthFraction < (closeup ? 0.28 : 0.12)
    || pixels.bounds.heightFraction < (closeup ? 0.25 : 0.12)
    || (closeup && pixels.centerRegion.foregroundFraction < 0.03)
    || (!closeup && pixels.bounds.touchesEdge)
  ) {
    throw new Error(
      `${specification.id} failed visual framing: ${JSON.stringify(pixels)}`,
    );
  }
  if (
    ['mount-assembly', 'no-driver-assembly', 'front-full'].includes(specification.id)
    && pixels.greenAccentFraction > 0.00025
  ) {
    throw new Error(
      `${specification.id} still contains a saturated green helper accent: `
      + `${(pixels.greenAccentFraction * 100).toFixed(4)}%`,
    );
  }
  if (
    specification.id.startsWith('profile-law-')
    && pixels.bounds?.touchesEdge
  ) {
    throw new Error(
      `${specification.id} profile witness is edge-clipped: `
        + JSON.stringify(pixels.bounds),
    );
  }
  return {
    id: specification.id,
    label: specification.label,
    view: specification.view,
    mountFocus: specification.mountFocus ?? null,
    cameraPreset: specification.cameraPreset ?? null,
    driverIndex: specification.driverIndex ?? null,
    portIndex: specification.portIndex ?? null,
    profileLaw: specification.profileLaw ?? null,
    wallStyle: specification.wallStyle ?? null,
    url,
    file: path.basename(file),
    diagnostics,
    pixels,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const canonical = readJson('cases/canonical.json');
  const fixture = canonical.cases.find((entry) => entry.id === options.caseId);
  if (!fixture) throw new Error(`canonical case ${options.caseId} is missing`);
  if (fixture.expected?.status !== 'valid') {
    throw new Error(`canonical case ${options.caseId} is not a valid render fixture`);
  }
  const state = {
    ...resolveCase(canonical, fixture),
    _smart2waySchema: 3,
  };
  const inspectionMode = options.throatMorph
    ? 'throat-morph'
    : options.tapLumen ? 'tap-lumen'
      : options.profileLaws ? 'profile-laws'
        : options.wallTopologies ? 'wall-topologies' : 'assembly';
  const specifications = options.throatMorph
    ? throatMorphCaptureSpecs
    : options.tapLumen ? tapLumenCaptureSpecs
      : options.profileLaws ? profileLawCaptureSpecs
        : options.wallTopologies ? wallTopologyCaptureSpecs : captureSpecs;
  await mkdir(options.output, { recursive: true });
  const { server, baseUrl } = await createInspectionServer(options.appRoot);
  const browser = await chromium.launch({ headless: !options.headed });
  const browserErrors = [];
  let context;
  try {
    context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
      locale: 'en-US',
      timezoneId: 'UTC',
    });
    await context.addInitScript((fixtureState) => {
      try {
        const profileLaw = new URL(window.location.href)
          .searchParams.get('qaProfileLaw');
        const wallStyle = new URL(window.location.href)
          .searchParams.get('qaWallStyle');
        const resolvedState = {
          ...fixtureState,
          ...(profileLaw ? { profileLaw } : {}),
          ...(wallStyle ? { style: wallStyle } : {}),
        };
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('meh5_state', JSON.stringify(resolvedState));
      } catch {
        // The init script also executes before the first origin is assigned.
      }
    }, state);
    const page = await context.newPage();
    page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
    });
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important;}',
    }).catch(() => {});

    const captures = [];
    for (const specification of specifications) {
      captures.push(await capture(page, baseUrl, options.output, specification));
    }
    if (options.tapLumen) {
      const tapSignatures = new Set(
        captures.map((entry) => entry.diagnostics.tapWitness?.signature),
      );
      if (tapSignatures.size !== 1 || tapSignatures.has(undefined)) {
        throw new Error(
          'tap-lumen views did not resolve to one canonical cutter: '
            + JSON.stringify([...tapSignatures]),
        );
      }
      const cameraSignature = (entry) => JSON.stringify({
        yaw: entry.diagnostics.camera?.yaw,
        pitch: entry.diagnostics.camera?.pitch,
        dist: entry.diagnostics.camera?.dist,
        bound: entry.diagnostics.camera?.bound,
        target: entry.diagnostics.camera?.target,
      });
      const sectionCapture = captures.find((entry) => entry.view === 'section');
      const exteriorCameraSignatures = new Set(
        captures.filter((entry) => entry.view !== 'section').map(cameraSignature),
      );
      if (
        !sectionCapture
        || exteriorCameraSignatures.size !== 1
        || exteriorCameraSignatures.has(cameraSignature(sectionCapture))
      ) {
        throw new Error(
          'tap-lumen views did not retain the deterministic section/exterior '
            + 'camera contract',
        );
      }
      const imageHashes = new Set(
        captures.map((entry) => entry.pixels.sha256),
      );
      if (imageHashes.size !== captures.length) {
        throw new Error(
          'tap-lumen production views did not produce distinct pixel witnesses',
        );
      }
    }
    if (options.profileLaws) {
      const resolvedLaws = new Set(
        captures.map((entry) => entry.diagnostics.plan?.profileLaw?.family),
      );
      const profileHashes = new Set(
        captures.map((entry) => entry.diagnostics.plan?.profileLaw?.profileHash),
      );
      const imageHashes = new Set(
        captures.map((entry) => entry.pixels.sha256),
      );
      if (
        resolvedLaws.size !== profileLawCaptureSpecs.length
        || profileHashes.size !== profileLawCaptureSpecs.length
        || imageHashes.size !== profileLawCaptureSpecs.length
      ) {
        throw new Error(
          'profile-law comparison did not produce three distinct solved and '
            + `rendered witnesses: ${JSON.stringify({
              resolvedLaws: [...resolvedLaws],
              profileHashes: [...profileHashes],
              imageHashes: [...imageHashes],
            })}`,
        );
      }
    }
    let wallTopologyPixelMismatch = null;
    if (options.wallTopologies) {
      const styles = new Set(
        captures.map((entry) => entry.diagnostics.plan?.style),
      );
      const imageHashes = new Set(
        captures.map((entry) => entry.pixels.sha256),
      );
      const smooth = captures.find((entry) => entry.wallStyle === 'smooth');
      const curved = captures.find(
        (entry) => entry.wallStyle === 'curvedFacets',
      );
      if (
        styles.size !== wallTopologyCaptureSpecs.length
        || imageHashes.size !== wallTopologyCaptureSpecs.length
        || !smooth?.diagnostics.plan?.profileLaw?.profileHash
        || smooth.diagnostics.plan.profileLaw.profileHash
          !== curved?.diagnostics.plan?.profileLaw?.profileHash
        || curved?.diagnostics.plan?.curvedFacets?.seamCount !== 4
      ) {
        throw new Error(
          'wall-topology comparison lost style, profile, seam, or image identity',
        );
      }
      wallTopologyPixelMismatch = await pairwisePixelMismatch(
        captures,
        options.output,
      );
      if (wallTopologyPixelMismatch.some(
        (pair) => pair.mismatchFraction <= 0.001,
      )) {
        throw new Error(
          'wall-topology fixed-camera witnesses are not visibly distinct: '
            + JSON.stringify(wallTopologyPixelMismatch),
        );
      }
    }
    if (browserErrors.length) {
      throw new Error(`browser runtime errors:\n${browserErrors.join('\n')}`);
    }
    const contactSheet = path.resolve(options.output, 'contact-sheet.png');
    const contactLayout = await writeContactSheet(
      captures.map((entry) => path.resolve(options.output, entry.file)),
      captures.map((entry) => entry.label),
      contactSheet,
    );
    const contactMetrics = await analyzePng(contactSheet);
    const manifest = {
      schemaVersion: 1,
      kind: 'meh-render-inspection',
      inspectionMode,
      generatedAt: new Date().toISOString(),
      case: {
        id: fixture.id,
        title: fixture.title,
      },
      viewport,
      browserVersion: browser.version(),
      captureOrder: specifications.map((entry) => ({
        id: entry.id,
        label: entry.label,
      })),
      captures,
      pairwisePixelMismatch: wallTopologyPixelMismatch,
      contactSheet: {
        file: path.basename(contactSheet),
        layout: contactLayout,
        pixels: contactMetrics,
      },
      browserErrors,
    };
    await writeFile(
      path.resolve(options.output, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    console.log(
      `RENDER INSPECTION PASS — ${fixture.id} · ${captures.length} views · `
      + `${path.relative(options.appRoot, contactSheet)}`,
    );
    for (const entry of captures) {
      console.log(
        `  ${entry.id}: ${(entry.pixels.foregroundFraction * 100).toFixed(1)}% `
        + `foreground · ${entry.pixels.bounds.width} × `
        + `${entry.pixels.bounds.height}px bounds`,
      );
    }
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

await main();
