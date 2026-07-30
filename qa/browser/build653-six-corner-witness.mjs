#!/usr/bin/env node
// Current Build 653 six-corner visual/topology witness.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import { PNG } from "pngjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const qaRoot = path.resolve(here, "..");
const appRoot = path.resolve(qaRoot, "..");
const output = path.resolve(
  process.env.MEH_BUILD653_SIX_CORNER_OUTPUT
    || path.join(qaRoot, "artifacts/build653-six-corner"),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [shell, profileLaws, engine, twoWay] = await Promise.all([
  readFile(path.join(appRoot, "shell.html"), "utf8"),
  readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
  readFile(path.join(appRoot, "engine.js"), "utf8"),
  readFile(path.join(appRoot, "twoway-core.js"), "utf8"),
]);
const runtime = shell
  .replace("/*__PROFILE_LAWS__*/", profileLaws)
  .replace("/*__ENGINE__*/", engine)
  .replace("/*__TWOWAY__*/", twoWay)
  .replace("/*__CAD__*/", "/* Build 653 six-corner browser witness */");
assert(
  /window\.MEH_BUILD=653;/.test(runtime),
  "source runtime is not Build 653",
);
assert(
  !/\/\*__(?:PROFILE_LAWS|ENGINE|TWOWAY|CAD)__\*\//.test(runtime),
  "source runtime contains an unfulfilled placeholder",
);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/shell.html") {
      response.writeHead(200, {
        "Content-Type": mime[".html"],
        "Cache-Control": "no-store",
      });
      response.end(runtime);
      return;
    }
    if (url.pathname === "/pins") {
      if (request.method === "POST") request.resume();
      response.writeHead(200, {
        "Content-Type": mime[".json"],
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify({ ok: true, pins: [] }));
      return;
    }
    if (!["GET", "HEAD"].includes(request.method || "")) {
      response.writeHead(405);
      response.end("method not allowed");
      return;
    }
    const file = path.resolve(
      appRoot,
      `.${decodeURIComponent(url.pathname)}`,
    );
    if (file !== appRoot && !file.startsWith(`${appRoot}${path.sep}`)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
assert(address && typeof address !== "string", "QA server did not bind");
const target = `http://127.0.0.1:${address.port}/shell.html`
  + "?build=653&reset=1&view=nodrv&mountFocus=0"
  + "&capture=1&qa=build653-six-corner";

function imageRecord(bytes) {
  const png = PNG.sync.read(bytes);
  let foreground = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const r = png.data[offset];
      const g = png.data[offset + 1];
      const b = png.data[offset + 2];
      const a = png.data[offset + 3];
      const distanceFromCanvas = Math.hypot(r - 250, g - 250, b - 250);
      if (a > 8 && distanceFromCanvas > 12) {
        foreground += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const pixels = png.width * png.height;
  return {
    width: png.width,
    height: png.height,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    foregroundFraction: foreground / pixels,
    bounds: foreground
      ? { minX, minY, maxX, maxY }
      : null,
    edgeClipped: foreground > 0
      && (minX <= 1 || minY <= 1
        || maxX >= png.width - 2 || maxY >= png.height - 2),
  };
}

async function settle(page, view) {
  await page.waitForFunction((expectedView) => (
    window.MEH_RUNTIME_SENTINEL?.status === "ready"
    && window.__solved
    && window.__twoWayGeometry?.plan
    && window.__panelMountQA?.view === expectedView
    && window.__stateIdentity?.hash
    && window.__twoMeshRuntime?.active !== true
  ), view, { timeout: 60_000 });
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
}

async function selectView(page, view) {
  await page.locator("#viewSel").evaluate((selector, nextView) => {
    selector.value = nextView;
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  }, view);
  await settle(page, view);
}

async function frameView(page, view) {
  /* Use deterministic QA review orbits without changing product source.
     NODRV/FULL share a near-square rear assembly view so all six driver
     stations can be compared directly. CELL adds an oblique offset so the
     focused dihedral plate's two wings do not collapse behind its bearing. */
  await page.evaluate((activeView) => {
    const plan = window.__twoWayGeometry.plan;
    if (activeView === "nodrv" || activeView === "full") {
      V3D.yaw = 3.02;
      V3D.pitch = 0.10;
      V3D.dist = activeView === "nodrv" ? 1.58 : 1.22;
      V3D.tgt.set(plan.station, 0, 0);
    } else if (activeView === "cell") {
      V3D.yaw += 0.10;
      V3D.pitch += 0.06;
      V3D.dist = 1.48;
    }
    render3d();
  }, view);
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
}

async function sceneSnapshot(page) {
  return page.evaluate(() => {
    const root = V3D.group;
    root.updateMatrixWorld(true);
    V3D.camera.updateMatrixWorld(true);
    const plan = window.__twoWayGeometry.plan;
    const qa = window.__panelMountQA;
    const visible = (object) => {
      for (let current = object; current; current = current.parent) {
        if (current.visible === false) return false;
        if (current === root) return true;
      }
      return false;
    };
    const taggedDriverNodes = [];
    const mountRoots = [];
    const passageWalls = [];
    const bearingObjects = [];
    let cdFlangeObject = null;
    let cdThroatObject = null;
    root.traverse((object) => {
      const tag = object.userData?.tag;
      if (
        object.userData?.partOwnership
          === "compression-driver flange"
      ) {
        cdFlangeObject = object;
      }
      if (tag === "compression-throat-bore") {
        cdThroatObject = object;
      }
      if (tag === "driver") {
        taggedDriverNodes.push({
          driverIndex: object.userData.driverIndex ?? null,
          visible: visible(object),
        });
      }
      if (
        tag === "mount-land"
        && object.parent?.userData?.tag !== "mount-land"
      ) {
        const bearings = [];
        const wings = [];
        const rootSpines = [];
        const structuralExterior = [];
        object.traverse((child) => {
          const childTag = child.userData?.tag;
          if (["outer-support", "structural-root-closure"].includes(
            child.userData?.surfaceRole,
          )) {
            structuralExterior.push({
              role: child.userData.surfaceRole,
              visible: visible(child),
              twoSided:
                child.userData.twoSidedStructuralExterior === true
                && child.material?.side === THREE.DoubleSide,
            });
          }
          if (["mount-bearing", "corner-mount-bearing"].includes(childTag)) {
            bearingObjects.push({
              driverIndex: object.userData.driverIndex,
              object: child,
            });
            bearings.push({
              tag: childTag,
              visible: visible(child),
              structuralPlate: child.userData.structuralPlate === true,
              tapClipProtected: child.userData.tapClipProtected === true,
              bearingFaceOwnerCount:
                child.userData.bearingFaceOwnerCount || 0,
            });
          }
          if (childTag === "corner-mount-wing") {
            wings.push({
              visible: visible(child),
              canonicalRootLoop:
                child.userData.canonicalRootLoop === true,
              canonicalAnchorLoop:
                child.userData.canonicalAnchorLoop === true,
              closedStructuralWing:
                child.userData.closedStructuralWing === true,
              buriedBooleanHelper:
                child.userData.buriedBooleanHelper === true,
              rootPointCount: child.userData.rootPointCount || 0,
            });
          }
          if (childTag === "corner-mount-root-spine") {
            rootSpines.push({
              visible: visible(child),
              closedStructuralRootSpine:
                child.userData.closedStructuralRootSpine === true,
              buriedBooleanHelper:
                child.userData.buriedBooleanHelper === true,
            });
          }
        });
        mountRoots.push({
          driverIndex: object.userData.driverIndex,
          visible: visible(object),
          cornerPlateActive:
            object.userData.cornerPlateActive === true,
          cornerPlateComplete:
            object.userData.cornerPlateComplete === true,
          structuralPlate: object.userData.structuralPlate === true,
          tapClipProtected: object.userData.tapClipProtected === true,
          bearingFaceOwnerCount:
            object.userData.bearingFaceOwnerCount || 0,
          wingCount: object.userData.wingCount || 0,
          closedWingCount: object.userData.closedWingCount || 0,
          rootSpineCount: object.userData.rootSpineCount || 0,
          buriedBooleanHelpersHidden:
            object.userData.buriedBooleanHelpersHidden === true,
          visibleExteriorBodyCount:
            object.userData.visibleExteriorBodyCount || 0,
          rootPatchCount: object.userData.rootPatchCount || 0,
          profileConformal: object.userData.profileConformal === true,
          minimumForbiddenDistance:
            object.userData.minimumForbiddenDistance ?? null,
          bearings,
          wings,
          rootSpines,
          structuralExterior,
        });
      }
      if (tag === "tap-passage-wall") {
        const driver = plan.drivers[object.userData.driverIndex];
        const port = driver?.ports?.[object.userData.tapIndex];
        let minimumAcousticAxial = Infinity;
        let wallSurfaceCount = 0;
        let capLikeChildCount = 0;
        object.traverse((child) => {
          if (!child.isMesh) return;
          if (child.userData?.tag === "tap-passage-wall-surface") {
            wallSurfaceCount += 1;
            const positions = child.geometry?.attributes?.position;
            if (positions && port) {
              for (let index = 0; index < positions.count; index += 1) {
                const point = new THREE.Vector3().fromBufferAttribute(
                  positions,
                  index,
                );
                child.localToWorld(point);
                const model = [point.x, point.z, point.y];
                const axial = (
                  (model[0] - port.center[0]) * port.normal[0]
                  + (model[1] - port.center[1]) * port.normal[1]
                  + (model[2] - port.center[2]) * port.normal[2]
                );
                minimumAcousticAxial = Math.min(
                  minimumAcousticAxial,
                  axial,
                );
              }
            }
          } else {
            capLikeChildCount += 1;
          }
        });
        passageWalls.push({
          driverIndex: object.userData.driverIndex,
          tapIndex: object.userData.tapIndex,
          visible: visible(object),
          physicalPassageBoundary:
            object.userData.physicalPassageBoundary === true,
          wallMeshCount: object.userData.wallMeshCount || 0,
          acousticProtrusionMm:
            object.userData.acousticProtrusionMm,
          pathKind: object.userData.pathKind,
          minimumAcousticAxial,
          wallSurfaceCount,
          capLikeChildCount,
          materialOpaqueDepthWriting: object.children.every((child) => (
            !child.isMesh
            || (Array.isArray(child.material)
              ? child.material
              : [child.material]).every((material) => (
              material?.transparent === false
              && material?.depthWrite === true
            ))
          )),
        });
      }
    });
    const add = (a, b) => a.map(
      (value, index) => value + b[index],
    );
    const subtract = (a, b) => a.map(
      (value, index) => value - b[index],
    );
    const multiply = (a, scalar) => a.map(
      (value) => value * scalar,
    );
    const dot = (a, b) => a.reduce(
      (sum, value, index) => sum + value * b[index],
      0,
    );
    const length = (a) => Math.hypot(...a);
    const unit = (a) => {
      const magnitude = length(a) || 1;
      return a.map((value) => value / magnitude);
    };
    const cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const finiteCylinderField = (point, start, end, radius) => {
      const axis = subtract(end, start);
      const span = length(axis) || 1e-9;
      const normal = multiply(axis, 1 / span);
      const delta = subtract(point, start);
      const axial = dot(delta, normal);
      const radial = length(subtract(
        delta,
        multiply(normal, axial),
      )) - radius;
      return Math.max(radial, -axial, axial - span);
    };
    const denseClearances = plan.drivers.map((driver) => {
      const normal = unit(driver.mountN);
      const rawU = subtract(
        driver.flow,
        multiply(normal, dot(driver.flow, normal)),
      );
      const u = unit(rawU);
      let v = unit(cross(normal, u));
      if (dot(v, driver.cross) < 0) v = multiply(v, -1);
      const stations =
        driver.cell?.coneProfile?.relief?.cavityStations ?? [];
      const reliefOpening = stations.length
        ? Math.max(0, Number(stations.at(-1).radiusM) || 0)
        : 0;
      const innerRadius = Math.min(
        driver.outerR - 1e-6,
        Math.max(reliefOpening, driver.frame.activeR + 0.002),
      );
      const rearDepth = Math.max(0.001, driver.flangeT || 0);
      const gasketDepth = Math.max(
        0.0008,
        driver.frame.gasketT || 0.0016,
      );
      let clearance = Infinity;
      for (let axialIndex = 0; axialIndex <= 4; axialIndex += 1) {
        const axial = -rearDepth
          + ((rearDepth + gasketDepth) * axialIndex) / 4;
        const center = add(
          driver.driverFace,
          multiply(normal, axial),
        );
        for (let radialIndex = 0; radialIndex <= 8; radialIndex += 1) {
          const radius = innerRadius
            + ((driver.outerR - innerRadius) * radialIndex) / 8;
          for (let angularIndex = 0; angularIndex < 180;
            angularIndex += 1) {
            const angle = angularIndex * 2 * Math.PI / 180;
            const point = add(
              center,
              add(
                multiply(u, Math.cos(angle) * radius),
                multiply(v, Math.sin(angle) * radius),
              ),
            );
            clearance = Math.min(
              clearance,
              finiteCylinderField(
                point,
                [-0.014, 0, 0],
                [0.006, 0, 0],
                plan.cdFlangeR,
              ),
            );
          }
        }
      }
      return {
        driverIndex: driver.index,
        placement: driver.panelPlacement.kind,
        clearance,
      };
    });
    const canvas = V3D.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const objectScreenBounds = (object) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let projectedVertexCount = 0;
      object.traverse((child) => {
        const positions = child.geometry?.attributes?.position;
        if (!positions) return;
        for (let index = 0; index < positions.count; index += 1) {
          const point = new THREE.Vector3().fromBufferAttribute(
            positions,
            index,
          );
          child.localToWorld(point);
          point.project(V3D.camera);
          if (
            !Number.isFinite(point.x)
            || !Number.isFinite(point.y)
            || !Number.isFinite(point.z)
            || point.z < -1
            || point.z > 1
          ) continue;
          const x = (point.x + 1) * width / 2;
          const y = (1 - point.y) * height / 2;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          projectedVertexCount += 1;
        }
      });
      return projectedVertexCount
        ? { minX, minY, maxX, maxY, projectedVertexCount }
        : null;
    };
    const rectangleOverlap = (a, b) => {
      if (!a || !b) return null;
      const minX = Math.max(a.minX, b.minX);
      const minY = Math.max(a.minY, b.minY);
      const maxX = Math.min(a.maxX, b.maxX);
      const maxY = Math.min(a.maxY, b.maxY);
      if (maxX <= minX || maxY <= minY) return null;
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        area: (maxX - minX) * (maxY - minY),
      };
    };
    const cdVisible = Boolean(
      cdFlangeObject && visible(cdFlangeObject),
    );
    const cdBounds = cdVisible
      ? objectScreenBounds(cdFlangeObject)
      : null;
    const axialBounds = (object) => {
      if (!object) return null;
      const box = new THREE.Box3().setFromObject(object);
      return Number.isFinite(box.min.x) && Number.isFinite(box.max.x)
        ? { minX: box.min.x, maxX: box.max.x }
        : null;
    };
    const raycaster = new THREE.Raycaster();
    const projectionOverlaps = [];
    if (cdVisible && cdBounds) {
      for (const bearing of bearingObjects) {
        if (!visible(bearing.object)) continue;
        const bearingBounds = objectScreenBounds(bearing.object);
        const overlap = rectangleOverlap(cdBounds, bearingBounds);
        if (!overlap) continue;
        let commonRaySamples = 0;
        let minimumRayDepthSeparation = Infinity;
        const grid = 32;
        for (let row = 0; row < grid; row += 1) {
          const y = overlap.minY
            + overlap.height * (row + 0.5) / grid;
          for (let column = 0; column < grid; column += 1) {
            const x = overlap.minX
              + overlap.width * (column + 0.5) / grid;
            raycaster.setFromCamera(
              new THREE.Vector2(
                x / width * 2 - 1,
                1 - y / height * 2,
              ),
              V3D.camera,
            );
            const cdHit = raycaster.intersectObject(
              cdFlangeObject,
              false,
            )[0];
            const bearingHit = raycaster.intersectObject(
              bearing.object,
              false,
            )[0];
            if (!cdHit || !bearingHit) continue;
            commonRaySamples += 1;
            minimumRayDepthSeparation = Math.min(
              minimumRayDepthSeparation,
              Math.abs(cdHit.distance - bearingHit.distance),
            );
          }
        }
        projectionOverlaps.push({
          driverIndex: bearing.driverIndex,
          boundsOverlapAreaPx: overlap.area,
          commonRaySamples,
          minimumRayDepthSeparation:
            Number.isFinite(minimumRayDepthSeparation)
              ? minimumRayDepthSeparation
              : null,
        });
      }
    }
    mountRoots.sort((a, b) => a.driverIndex - b.driverIndex);
    passageWalls.sort((a, b) => (
      a.driverIndex - b.driverIndex || a.tapIndex - b.tapIndex
    ));
    return {
      build: window.MEH_BUILD,
      stateHash: window.__stateIdentity.hash,
      view: V3D.view,
      infeasible: window.__solved.infeasible,
      failCount: window.__solved.ev.fails,
      placementKinds: plan.drivers.map(
        (driver) => driver.panelPlacement.kind,
      ),
      driverCount: plan.drivers.length,
      portCount: plan.allPorts.length,
      cornerPlateComplete: plan.cornerPlateComplete,
      cornerPlateMultiSeamOverlap:
        plan.cornerPlateMultiSeamOverlap,
      mountEnvelopeComplete: plan.mountEnvelopeComplete,
      physicalCdClearance: {
        reported: plan.driverCdFlangeClearance,
        required: plan.driverCdFlangeRequired,
        coverage: plan.driverCdFlangeCoverage,
        samples: plan.driverCdFlangeSamples,
        basis: plan.driverCdFlangeBasis,
        witness: structuredClone(plan.driverCdFlangeWitness),
        denseByDriver: denseClearances,
        denseMinimum: Math.min(
          ...denseClearances.map((item) => item.clearance),
        ),
      },
      cdFlange: {
        present: Boolean(cdFlangeObject),
        visible: cdVisible,
        separateFromDriverBearings:
          cdFlangeObject?.userData
            ?.separateFromDriverBearings === true,
        declaredClearance:
          cdFlangeObject?.userData?.driverBearingClearance ?? null,
        declaredRequired:
          cdFlangeObject?.userData
            ?.driverBearingClearanceRequired ?? null,
        depthCue: cdFlangeObject?.userData?.depthCue || null,
        opaqueDepthOwned: Boolean(
          cdFlangeObject
          && cdFlangeObject.material?.transparent === false
          && cdFlangeObject.material?.depthTest === true
          && cdFlangeObject.material?.depthWrite === true
        ),
        screenBounds: cdBounds,
        axialBounds: axialBounds(cdFlangeObject),
      },
      cdThroat: {
        present: Boolean(cdThroatObject),
        visible: Boolean(cdThroatObject && visible(cdThroatObject)),
        openEnded: cdThroatObject?.userData?.openEnded === true,
        fakeCap: cdThroatObject?.userData?.fakeCap === true,
        recessedWithinFlange:
          cdThroatObject?.userData?.recessedWithinFlange === true,
        rearProtrusionM:
          cdThroatObject?.userData?.rearProtrusionM ?? null,
        axialBounds: axialBounds(cdThroatObject),
      },
      projectionOverlaps,
      integratedPlateAudits: (
        window.__integratedPlatePreviewQA?.audits || []
      ).map((audit) => ({
        driverIndex: audit.driverIndex,
        connected: audit.connected,
        overlapWitnessCount: audit.overlapWitnessCount,
        gasketSupported: audit.gasketSupported,
        gasketCoverage: audit.gasketCoverage,
        subtractorWhitelistPass: audit.subtractorWhitelistPass,
      })),
      mountRoots,
      passageWalls,
      taggedDriverNodes,
      visibleTaggedDriverCount: taggedDriverNodes.filter(
        (item) => item.visible,
      ).length,
      qa: {
        mountLandCount: qa.mountLandCount,
        visibleMountLandCount: qa.visibleMountLandCount,
        driverBodyCount: qa.driverBodyCount,
        tapPassageWallCount: qa.tapPassageWallCount,
        visibleTapPassageWallCount:
          qa.visibleTapPassageWallCount,
        expectedTapCount: qa.expectedTapCount,
        canonicalVisualToolsComplete:
          qa.canonicalVisualToolsComplete,
        canonicalIntegratedPlateToolsComplete:
          qa.canonicalIntegratedPlateToolsComplete,
        invariants: structuredClone(qa.invariants),
      },
    };
  });
}

function assertCommon(snapshot, label) {
  assert(snapshot.build === 653, `${label}: runtime build drift`);
  assert(snapshot.stateHash.startsWith("b653-"), `${label}: state hash drift`);
  assert(!snapshot.infeasible && snapshot.failCount === 0,
    `${label}: solver refused the six-W5 fixture`);
  assert(snapshot.driverCount === 6, `${label}: ${snapshot.driverCount}/6 drivers`);
  assert(snapshot.portCount === 12, `${label}: ${snapshot.portCount}/12 ports`);
  assert(
    JSON.stringify(snapshot.placementKinds)
      === JSON.stringify([
        "corner",
        "face",
        "corner",
        "corner",
        "face",
        "corner",
      ]),
    `${label}: face/corner ownership drifted: ${snapshot.placementKinds.join(",")}`,
  );
  assert(snapshot.cornerPlateComplete === true,
    `${label}: a corner plate is incomplete`);
  assert(snapshot.cornerPlateMultiSeamOverlap === false,
    `${label}: corner plates overlap multiple seams`);
  assert(snapshot.mountEnvelopeComplete === true,
    `${label}: mount envelope is incomplete`);
  assert(snapshot.qa.canonicalVisualToolsComplete === true,
    `${label}: canonical visual tools are incomplete`);
  assert(snapshot.qa.canonicalIntegratedPlateToolsComplete === true,
    `${label}: integrated plate tools are incomplete`);
  assert(snapshot.qa.mountLandCount === 6,
    `${label}: ${snapshot.qa.mountLandCount}/6 scene mount roots`);
  assert(snapshot.mountRoots.length === 6,
    `${label}: ${snapshot.mountRoots.length}/6 inspectable mount roots`);
  assert(snapshot.integratedPlateAudits.length === 6,
    `${label}: integrated plate audit count`);
  for (const audit of snapshot.integratedPlateAudits) {
    assert(audit.connected === true,
      `${label}/driver-${audit.driverIndex}: plate root is disconnected`);
    assert(audit.overlapWitnessCount > 0,
      `${label}/driver-${audit.driverIndex}: no plate/horn overlap witness`);
    assert(audit.gasketSupported === true,
      `${label}/driver-${audit.driverIndex}: gasket unsupported`);
    assert(audit.gasketCoverage >= 1 - 1e-12,
      `${label}/driver-${audit.driverIndex}: incomplete gasket coverage`);
    assert(audit.subtractorWhitelistPass === true,
      `${label}/driver-${audit.driverIndex}: subtractor ownership drift`);
  }
  snapshot.mountRoots.forEach((root, index) => {
    const corner = snapshot.placementKinds[index] === "corner";
    assert(root.driverIndex === index,
      `${label}: mount root order/index drift`);
    assert(root.profileConformal === true,
      `${label}/driver-${index}: root is not profile-conformal`);
    assert(root.structuralPlate === true,
      `${label}/driver-${index}: structural plate missing`);
    assert(root.tapClipProtected === true,
      `${label}/driver-${index}: bearing face is tap-clipped`);
    assert(root.bearingFaceOwnerCount === 1 && root.bearings.length === 1,
      `${label}/driver-${index}: bearing owner count`);
    assert(
      root.structuralExterior.length === 2
        && root.structuralExterior.every((surface) => surface.twoSided)
        && (!root.visible
          || root.structuralExterior.every((surface) => surface.visible)),
      `${label}/driver-${index}: closed exterior is not visible from below`,
    );
    assert(
      root.bearings[0].structuralPlate
        && root.bearings[0].tapClipProtected
        && root.bearings[0].bearingFaceOwnerCount === 1,
      `${label}/driver-${index}: incomplete bearing face`,
    );
    assert(
      Number.isFinite(root.minimumForbiddenDistance)
        && root.minimumForbiddenDistance >= -0.000005,
      `${label}/driver-${index}: root clips horn air `
        + `(${root.minimumForbiddenDistance} m)`,
    );
    if (corner) {
      assert(root.cornerPlateActive && root.cornerPlateComplete,
        `${label}/driver-${index}: corner plate is not complete`);
      assert(root.wingCount === 2 && root.rootPatchCount === 2,
        `${label}/driver-${index}: corner plate lacks two complete roots`);
      assert(root.wings.length === 2,
        `${label}/driver-${index}: corner wing scene count`);
      assert(
        root.closedWingCount === 2
          && root.rootSpineCount === 2
          && root.rootSpines.length === 2,
        `${label}/driver-${index}: closed wing/root-spine witnesses incomplete`,
      );
      assert(
        root.buriedBooleanHelpersHidden
          && root.visibleExteriorBodyCount === 1,
        `${label}/driver-${index}: buried CSG helpers leaked into review`,
      );
      assert(root.bearings[0].tag === "corner-mount-bearing",
        `${label}/driver-${index}: corner bearing type drift`);
      assert(root.wings.every((wing) => (
        wing.canonicalRootLoop
        && wing.canonicalAnchorLoop
        && wing.closedStructuralWing
        && wing.buriedBooleanHelper
        && !wing.visible
        && wing.rootPointCount >= 3
      )), `${label}/driver-${index}: non-canonical corner wing`);
      assert(root.rootSpines.every((spine) => (
        spine.closedStructuralRootSpine
        && spine.buriedBooleanHelper
        && !spine.visible
      )), `${label}/driver-${index}: exposed/incomplete root spine`);
    } else {
      assert(!root.cornerPlateActive && root.wings.length === 0,
        `${label}/driver-${index}: face mount gained corner wings`);
      assert(root.bearings[0].tag === "mount-bearing",
        `${label}/driver-${index}: face bearing type drift`);
    }
  });
  assert(snapshot.qa.invariants.allMountsPresent === true,
    `${label}: not all mounts are present`);
  assert(snapshot.qa.invariants.mountsOutsideForbiddenVolume === true,
    `${label}: a mount enters horn air`);
  assert(snapshot.qa.invariants.sealsContinuous === true,
    `${label}: mount seal continuity failed`);
  assert(snapshot.qa.invariants.driverBearingsClearCdFlange === true,
    `${label}: a bearing intersects the compression-driver flange`);
  assert(snapshot.qa.invariants.noDriverOverlap === true,
    `${label}: driver envelopes overlap`);
  assert(snapshot.physicalCdClearance.coverage === 1,
    `${label}: CD/bearing clearance coverage is incomplete`);
  assert(
    snapshot.physicalCdClearance.reported
      >= snapshot.physicalCdClearance.required,
    `${label}: reported CD/bearing clearance is insufficient`,
  );
  assert(snapshot.physicalCdClearance.denseByDriver.length === 6,
    `${label}: dense CD/bearing oracle missed a driver`);
  snapshot.physicalCdClearance.denseByDriver.forEach((item) => {
    assert(
      item.clearance >= snapshot.physicalCdClearance.required,
      `${label}/driver-${item.driverIndex}: ${item.placement} bearing `
        + `clears the CD flange by only `
        + `${(item.clearance * 1000).toFixed(3)} mm`,
    );
  });
  assert(snapshot.physicalCdClearance.denseMinimum > 0.015,
    `${label}: six-W5 dense CD/bearing clearance is below 15 mm`);
  assert(
    Math.abs(
      snapshot.physicalCdClearance.denseMinimum
        - snapshot.physicalCdClearance.reported,
    ) <= 0.001,
    `${label}: reported and independent dense CD clearances disagree`,
  );
  assert(snapshot.cdFlange.present === true,
    `${label}: the compression-driver plate is absent`);
  assert(snapshot.cdFlange.separateFromDriverBearings === true,
    `${label}: CD plate/bearing ownership metadata is absent`);
  assert(
    Math.abs(
      snapshot.cdFlange.declaredClearance
        - snapshot.physicalCdClearance.reported,
    ) <= 1e-12,
    `${label}: CD plate declared clearance drifted`,
  );
  assert(
    Math.abs(
      snapshot.cdFlange.declaredRequired
        - snapshot.physicalCdClearance.required,
    ) <= 1e-12,
    `${label}: CD plate declared required clearance drifted`,
  );
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1500, height: 1050 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
  colorScheme: "light",
});
const page = await context.newPage();
const browserErrors = [];
page.on("pageerror", (error) => {
  browserErrors.push(`pageerror: ${error.stack || error.message || error}`);
});
page.on("console", (message) => {
  if (message.type() === "error") {
    browserErrors.push(`console: ${message.text()}`);
  }
});
page.on("requestfailed", (request) => {
  browserErrors.push(
    `requestfailed: ${request.url()} · ${request.failure()?.errorText || ""}`,
  );
});

const results = [];
try {
  await page.goto(target, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page, "nodrv");
  await page.evaluate(() => {
    const next = MEH2.migrateTwoWayState({
      ...MEH2.TWO_ARCH.panel.defaults,
      topo: "2way",
      _smart2waySchema: 3,
      twoArch: "panel",
      twoFamily: "panel",
      twoDesign: "arch:panel",
      tapBasis: "model",
      style: "angular",
      profileLaw: "conical",
      sectionFamily: "superellipse",
      sectionLameN: 12,
      sectionCornerRatio: 0.25,
      seN: 12,
      covH: 90,
      covV: 60,
      mouthW: 26,
      requestedMouthW: 26,
      mouthCap: 64,
      wallT: 0.018,
      td: 1.4,
      throat: 1.4,
      cdSel: "dcx464",
      cdFloor: 300,
      cdDepth: 2.4,
      wPre: "w5",
      odW: 13.76,
      dpW: 6.95,
      sdW: 91.6,
      vtcW: 35,
      xmW: 2.5,
      frameW: "round",
      boltNW: 4,
      boltDW: 5,
      gasketW: 1.6,
      nW: 6,
      npW: 2,
      driverArrayMode: "auto",
      driverArrayRotationDeg: 0,
      shW: "slot",
      tapShapeW: "slot",
      tapPairMode: "auto",
      twoXO: 500,
      tapCRW: 6,
      driverMountMode: "shortest",
      driverMountExtraMm: 0,
      driverAxisBlend: 0,
      driverCellConstruction: "integrated",
      coneProfileMode: "flat",
      coneDepthMm: 0,
      coneDepthKnown: false,
      coneAxialClearanceMm: 0,
      coneRadialClearanceMm: 0,
    });
    for (const key of Object.keys(S)) delete S[key];
    Object.assign(S, next, { _smart2waySchema: 3 });
    V3D.view = "nodrv";
    V3D.mountFocus = "0";
    V3D.nodrvCameraDirty = true;
    const selector = document.getElementById("viewSel");
    if (selector) selector.value = "nodrv";
    rebuild();
  });
  await settle(page, "nodrv");

  for (const view of ["nodrv", "cell", "full"]) {
    if (view !== "nodrv") await selectView(page, view);
    await frameView(page, view);
    const snapshot = await sceneSnapshot(page);
    assert(snapshot.view === view, `${view}: view state drift`);
    assertCommon(snapshot, view.toUpperCase());
    if (view === "nodrv") {
      assert(snapshot.qa.driverBodyCount === 0,
        "NODRV: LF driver bodies were constructed");
      assert(snapshot.visibleTaggedDriverCount === 0,
        "NODRV: a visible LF/CD driver node leaked into the scene");
      assert(snapshot.qa.visibleMountLandCount === 6,
        `NODRV: ${snapshot.qa.visibleMountLandCount}/6 visible mount roots`);
      assert(snapshot.mountRoots.every((root) => root.visible),
        "NODRV: a complete mount root is hidden");
      assert(snapshot.qa.tapPassageWallCount === 12,
        `NODRV: ${snapshot.qa.tapPassageWallCount}/12 passage walls`);
      assert(snapshot.qa.visibleTapPassageWallCount === 12,
        `NODRV: ${snapshot.qa.visibleTapPassageWallCount}/12 visible passage walls`);
      assert(snapshot.passageWalls.length === 12,
        `NODRV: ${snapshot.passageWalls.length}/12 scene passage roots`);
      assert(snapshot.qa.invariants.noDriverAssemblyHasNoDrivers === true,
        "NODRV: no-driver invariant failed");
      assert(snapshot.qa.invariants.allTapsPresent === true,
        "NODRV: physical tap wall invariant failed");
      snapshot.passageWalls.forEach((wall) => {
        const id = `NODRV/driver-${wall.driverIndex}/tap-${wall.tapIndex}`;
        assert(wall.visible, `${id}: passage wall hidden`);
        assert(wall.physicalPassageBoundary,
          `${id}: wall is not physical print boundary`);
        assert(wall.wallMeshCount === 1 && wall.wallSurfaceCount === 1,
          `${id}: passage is layered instead of one continuous wall`);
        assert(wall.capLikeChildCount === 0,
          `${id}: terminal cap closes the passage`);
        assert(wall.materialOpaqueDepthWriting,
          `${id}: wall is a transparent helper`);
        assert(wall.acousticProtrusionMm === 0,
          `${id}: reports ${wall.acousticProtrusionMm} mm protrusion`);
        assert(
          Number.isFinite(wall.minimumAcousticAxial)
            && wall.minimumAcousticAxial >= 0.000095,
          `${id}: wall protrudes ahead of acoustic face by `
            + `${(-wall.minimumAcousticAxial * 1000).toFixed(3)} mm`,
        );
      });
      assert(snapshot.cdFlange.visible === true,
        "NODRV: the compression-driver plate is hidden");
      assert(snapshot.cdFlange.opaqueDepthOwned === true,
        "NODRV: the compression-driver plate does not own depth");
      assert(
        snapshot.cdThroat.present
          && snapshot.cdThroat.visible
          && snapshot.cdThroat.openEnded
          && !snapshot.cdThroat.fakeCap,
        "NODRV: recessed open compression throat cue is absent/closed",
      );
      assert(
        snapshot.cdThroat.recessedWithinFlange
          && snapshot.cdThroat.rearProtrusionM === 0
          && snapshot.cdThroat.axialBounds
          && snapshot.cdFlange.axialBounds
          && snapshot.cdThroat.axialBounds.minX
            >= snapshot.cdFlange.axialBounds.minX - 1e-9
          && snapshot.cdThroat.axialBounds.maxX
            <= snapshot.cdFlange.axialBounds.maxX + 1e-9,
        "NODRV: compression throat cue protrudes outside its flange",
      );
      assert(
        /screen overlap is perspective only/.test(
          snapshot.cdFlange.depthCue || "",
        ),
        "NODRV: screen-overlap depth cue is absent",
      );
      const sameRayOverlaps = snapshot.projectionOverlaps.filter(
        (overlap) => overlap.commonRaySamples > 0,
      );
      assert(sameRayOverlaps.length > 0,
        "NODRV: fixture no longer witnesses a screen-space CD/bearing overlap");
      sameRayOverlaps.forEach((overlap) => {
        assert(
          Number.isFinite(overlap.minimumRayDepthSeparation)
            && overlap.minimumRayDepthSeparation > 0.0001,
          `NODRV/driver-${overlap.driverIndex}: overlapping projection `
            + "does not retain distinct ray depth",
        );
        const physical = snapshot.physicalCdClearance.denseByDriver.find(
          (item) => item.driverIndex === overlap.driverIndex,
        );
        assert(
          physical
            && physical.clearance
              >= snapshot.physicalCdClearance.required,
          `NODRV/driver-${overlap.driverIndex}: screen overlap is a real `
            + "3-D collision",
        );
      });
    } else {
      assert(snapshot.passageWalls.length === 0,
        `${view.toUpperCase()}: NODRV physical wall leaked across view modes`);
    }
    if (view === "cell") {
      assert(snapshot.qa.driverBodyCount === 0,
        "CELL: driver body was constructed");
      assert(snapshot.qa.visibleMountLandCount === 1,
        `CELL: ${snapshot.qa.visibleMountLandCount}/1 focused mount roots`);
      assert(snapshot.mountRoots.filter((root) => root.visible).length === 1,
        "CELL: isolated corner view does not own exactly one visible root");
      assert(snapshot.mountRoots[0].visible,
        "CELL: focused driver 0 corner plate is hidden");
      assert(snapshot.qa.invariants.completeCellHasNoDriver === true,
        "CELL: no-driver invariant failed");
      assert(snapshot.qa.invariants.completeCellHasMount === true,
        "CELL: complete corner cell mount is absent");
      assert(snapshot.qa.invariants.completeCellHasBearingFace === true,
        "CELL: complete corner bearing is absent");
      assert(snapshot.qa.invariants.completeCellHasTapPaths === true,
        "CELL: canonical corner tap paths are absent");
      assert(snapshot.cdFlange.visible === false,
        "CELL: compression-driver plate obscures isolated mount inspection");
      assert(snapshot.projectionOverlaps.length === 0,
        "CELL: hidden CD plate still participates in overlap witness");
      assert(snapshot.mountRoots[0].bearings[0].visible === true,
        "CELL: focused corner bearing is hidden");
      assert(
        snapshot.mountRoots[0].wings.length === 2
          && snapshot.mountRoots[0].wings.every((wing) => (
            !wing.visible && wing.buriedBooleanHelper
          )),
        "CELL: focused corner plate exposed buried wing CSG helpers",
      );
    }
    if (view === "full") {
      assert(snapshot.qa.driverBodyCount === 6,
        `FULL: ${snapshot.qa.driverBodyCount}/6 LF driver bodies`);
      assert(snapshot.qa.invariants.allDriversPresent === true,
        "FULL: driver assembly is incomplete");
      assert(snapshot.qa.invariants.fullDriversOccludedFromHornSide === true,
        "FULL: horn-side driver occlusion contract failed");
    }

    const file = path.join(output, `six-w5-angular-${view}.png`);
    const bytes = await page.locator("#v3d canvas").screenshot({
      path: file,
      animations: "disabled",
      caret: "hide",
    });
    const image = imageRecord(bytes);
    assert(image.foregroundFraction > 0.01,
      `${view.toUpperCase()}: screenshot foreground is empty`);
    assert(image.bounds && image.edgeClipped === false,
      `${view.toUpperCase()}: screenshot is clipped at the canvas edge`);
    results.push({
      view,
      file,
      stateHash: snapshot.stateHash,
      placementKinds: snapshot.placementKinds,
      visibleMountRoots: snapshot.mountRoots.filter(
        (root) => root.visible,
      ).length,
      physicalPassageWalls: snapshot.passageWalls.length,
      visibleTaggedDriverCount: snapshot.visibleTaggedDriverCount,
      physicalCdClearance: snapshot.physicalCdClearance,
      cdFlange: snapshot.cdFlange,
      projectionOverlaps: snapshot.projectionOverlaps,
      image,
    });
    if (view === "nodrv") {
      /* Regression camera for the user's failure view: below and slightly
         around the rear of the six-cell array.  This is where FrontSide-only
         support skins vanished and made a closed plate look like a hollow
         hoop on one narrow fin. */
      await page.evaluate(() => {
        const plan = window.__twoWayGeometry.plan;
        V3D.yaw = 2.58;
        V3D.pitch = -0.62;
        V3D.dist = 1.82;
        V3D.tgt.set(plan.station, 0, 0);
        render3d();
      });
      await page.evaluate(() => new Promise((resolve) => (
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )));
      const undersideSnapshot = await sceneSnapshot(page);
      assert(
        undersideSnapshot.mountRoots.every((root) => (
          !root.visible
          || (root.structuralExterior.length === 2
            && root.structuralExterior.every((surface) => (
              surface.visible && surface.twoSided
            )))
        )),
        "NODRV UNDERSIDE: a closed structural exterior disappeared",
      );
      const undersideFile = path.join(
        output,
        "six-w5-angular-nodrv-underside.png",
      );
      const undersideBytes = await page.locator("#v3d canvas").screenshot({
        path: undersideFile,
        animations: "disabled",
        caret: "hide",
      });
      const undersideImage = imageRecord(undersideBytes);
      assert(undersideImage.foregroundFraction > 0.01,
        "NODRV UNDERSIDE: screenshot foreground is empty");
      assert(undersideImage.bounds && undersideImage.edgeClipped === false,
        "NODRV UNDERSIDE: screenshot is clipped at the canvas edge");
      results.push({
        view: "nodrv-underside",
        file: undersideFile,
        stateHash: undersideSnapshot.stateHash,
        placementKinds: undersideSnapshot.placementKinds,
        visibleMountRoots: undersideSnapshot.mountRoots.filter(
          (root) => root.visible,
        ).length,
        physicalPassageWalls: undersideSnapshot.passageWalls.length,
        visibleTaggedDriverCount:
          undersideSnapshot.visibleTaggedDriverCount,
        physicalCdClearance: undersideSnapshot.physicalCdClearance,
        cdFlange: undersideSnapshot.cdFlange,
        cdThroat: undersideSnapshot.cdThroat,
        projectionOverlaps: undersideSnapshot.projectionOverlaps,
        image: undersideImage,
      });
      await frameView(page, "nodrv");
    }
  }

  assert(new Set(results.map((result) => result.image.sha256)).size === 4,
    "NODRV, underside, CELL, and FULL screenshots are not visually distinct");
  assert(browserErrors.length === 0,
    `browser errors:\n${browserErrors.join("\n")}`);
  const manifest = {
    build: 653,
    fixture: "six-W5 angular 90×60 panel; AUTO seam placement",
    pass: true,
    generatedAt: new Date().toISOString(),
    results,
  };
  await writeFile(
    path.join(output, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(
    "BUILD 653 SIX-CORNER BROWSER PASS"
      + " · 4 corner + 2 face"
      + " · 6 complete roots/bearings"
      + " · 8 corner wings"
      + " · 12 NODRV physical passage walls"
      + " · screen-only CD overlap classified",
  );
  for (const result of results) {
    console.log(
      `  ${result.view.toUpperCase()}: ${result.file}`
        + ` · ${result.image.width}×${result.image.height}`
        + ` · ${result.image.sha256.slice(0, 12)}`,
    );
  }
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
