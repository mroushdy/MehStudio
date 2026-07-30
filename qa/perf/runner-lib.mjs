import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

export const qaRoot = path.resolve(here, "..");
export const projectRoot = path.resolve(qaRoot, "..");
export const runnerVersion = "meh-parametric-runner-poc-v1";
export const engine = require(path.join(projectRoot, "engine.js"));

export function canonicalValue(value, seen = new Set()) {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "string") return `s:${JSON.stringify(value)}`;
  if (type === "boolean") return value ? "b:1" : "b:0";
  if (type === "undefined") return "u:";
  if (type === "number") {
    if (Number.isNaN(value)) return "n:NaN";
    if (value === Infinity) return "n:+Infinity";
    if (value === -Infinity) return "n:-Infinity";
    if (Object.is(value, -0)) return "n:-0";
    return `n:${String(value)}`;
  }
  if (type === "bigint") return `i:${String(value)}`;
  if (type !== "object") return `${type}:${JSON.stringify(String(value))}`;
  if (seen.has(value)) throw new Error("runner state cannot contain cycles");
  seen.add(value);
  const body = Array.isArray(value)
    ? value.map((item) => canonicalValue(item, seen)).join(",")
    : Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key], seen)}`)
      .join(",");
  seen.delete(value);
  return Array.isArray(value) ? `a:[${body}]` : `o:{${body}}`;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sourceDigest() {
  const hash = createHash("sha256");
  for (const name of ["profile-laws.js", "engine.js", "twoway-core.js"]) {
    const file = path.join(projectRoot, name);
    hash.update(name);
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function cacheKey({
  sourceHash,
  stage,
  preview,
  previewAxial,
  previewRadial,
  state,
}) {
  return sha256(canonicalValue({
    runnerVersion,
    sourceHash,
    stage,
    preview: Boolean(preview),
    previewAxial: Number(previewAxial),
    previewRadial: Number(previewRadial),
    state,
  }));
}

export function normalizeScenario(value, index) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`scenario ${index} must be an object`);
  }
  const state = value.state && typeof value.state === "object"
    ? value.state
    : value;
  const id = String(value.id ?? value.key ?? `scenario-${index + 1}`);
  const label = String(value.label ?? value.title ?? id);
  return { id, label, state };
}

export async function readScenarioFile(file) {
  const source = await fs.promises.readFile(file, "utf8");
  if (path.extname(file).toLowerCase() === ".jsonl") {
    return source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => normalizeScenario(JSON.parse(line), index));
  }
  const parsed = JSON.parse(source);
  const rows = Array.isArray(parsed) ? parsed : parsed.scenarios;
  if (!Array.isArray(rows)) {
    throw new Error("JSON input must be an array or contain a scenarios array");
  }
  return rows.map(normalizeScenario);
}

function sixWooferBase() {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "osse",
    sectionFamily: "superellipse",
    sectionLameN: 6,
    seN: 6,
    covH: 90,
    covV: 60,
    mouthW: 32,
    requestedMouthW: 32,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    nW: 6,
    npW: 2,
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
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
    twoXO: 430,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    adapterReach: 35,
    adapterReachMode: "auto",
    osseThroatAngle: 7.5,
    osseK: 1.8,
    osseS: 0.7,
    osseTerminationN: 4,
    osseQ: 0.995,
  };
}

export function builtInScenarios(limit = Infinity) {
  const base = sixWooferBase();
  const rows = [];
  for (const nW of [2, 4, 6]) {
    for (const style of ["smooth", "angular"]) {
      for (const profileLaw of ["conical", "osse"]) {
        rows.push({
          id: `panel-${nW}-${style}-${profileLaw}`,
          label: `${nW} panel woofers · ${style} · ${profileLaw}`,
          state: {
            ...base,
            nW,
            style,
            profileLaw,
            sectionLameN: style === "angular" ? 12 : 6,
            seN: style === "angular" ? 12 : 6,
            mouthW: nW === 6 ? 32 : 28,
            requestedMouthW: nW === 6 ? 32 : 28,
          },
        });
      }
    }
  }
  return rows.slice(0, Math.max(0, Number(limit) || 0));
}

function pushQuad(indices, a, b, c, d) {
  indices.push(a, b, c, c, b, d);
}

export function analyticPreview(plan, options = {}) {
  const radial = Math.max(12, Math.min(256, options.radial | 0 || 48));
  const axial = Math.max(4, Math.min(256, options.axial | 0 || 24));
  const wall = Math.max(0.001, Number(plan.S.wallT) || 0.012);
  const xs = [];
  for (let index = 0; index <= axial; index += 1) {
    xs.push(plan.st.depth * index / axial);
  }
  if (Number.isFinite(plan.throatMorphL) && plan.throatMorphL > 0) {
    for (let index = 0; index <= 8; index += 1) {
      xs.push(plan.throatMorphL * index / 8);
    }
    xs.push(plan.throatMorphL);
  }
  for (const station of plan.st.pts || []) xs.push(station.x);
  xs.sort((left, right) => left - right);
  const stations = xs.filter(
    (value, index) => !index || Math.abs(value - xs[index - 1]) > 1e-8,
  );
  const vertexCount = stations.length * radial * 2;
  const positions = new Float32Array(vertexCount * 3);
  let vertex = 0;
  const ringIndex = (layer, station, angle) => (
    layer * stations.length * radial + station * radial + angle
  );
  for (const offset of [0, wall]) {
    for (const x of stations) {
      for (let index = 0; index < radial; index += 1) {
        const angle = index / radial * Math.PI * 2;
        const point = engine.twoWaySectionPoint(
          plan,
          x,
          angle,
          offset,
          offset,
          offset,
        );
        positions[vertex++] = x;
        positions[vertex++] = point[0];
        positions[vertex++] = point[1];
      }
    }
  }
  const indexValues = [];
  for (let station = 0; station < stations.length - 1; station += 1) {
    for (let angle = 0; angle < radial; angle += 1) {
      const next = (angle + 1) % radial;
      pushQuad(
        indexValues,
        ringIndex(0, station, angle),
        ringIndex(0, station, next),
        ringIndex(0, station + 1, angle),
        ringIndex(0, station + 1, next),
      );
      pushQuad(
        indexValues,
        ringIndex(1, station, next),
        ringIndex(1, station, angle),
        ringIndex(1, station + 1, next),
        ringIndex(1, station + 1, angle),
      );
    }
  }
  for (const station of [0, stations.length - 1]) {
    for (let angle = 0; angle < radial; angle += 1) {
      const next = (angle + 1) % radial;
      if (station === 0) {
        pushQuad(
          indexValues,
          ringIndex(0, station, next),
          ringIndex(0, station, angle),
          ringIndex(1, station, next),
          ringIndex(1, station, angle),
        );
      } else {
        pushQuad(
          indexValues,
          ringIndex(0, station, angle),
          ringIndex(0, station, next),
          ringIndex(1, station, angle),
          ringIndex(1, station, next),
        );
      }
    }
  }
  return {
    positions,
    indices: Uint32Array.from(indexValues),
    descriptor: {
      representation: "canonical analytic horn shell",
      manufacturingEvidence: false,
      source: "engine.twoWaySectionPoint",
      axialRequested: axial,
      radial,
      stations: stations.length,
      vertices: positions.length / 3,
      triangles: indexValues.length / 3,
      units: "metres",
    },
  };
}

export function packedPreviewToObj(positions, indices, header = {}) {
  const lines = [
    "# MEH Studio browser-independent analytic preview",
    `# manufacturing-evidence: false`,
    `# state-hash: ${header.stateHash || "unknown"}`,
    `# source-hash: ${header.sourceHash || "unknown"}`,
  ];
  for (let index = 0; index < positions.length; index += 3) {
    lines.push(
      `v ${positions[index].toPrecision(9)} `
      + `${positions[index + 1].toPrecision(9)} `
      + `${positions[index + 2].toPrecision(9)}`,
    );
  }
  for (let index = 0; index < indices.length; index += 3) {
    lines.push(
      `f ${indices[index] + 1} ${indices[index + 1] + 1} `
      + `${indices[index + 2] + 1}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function safeFileStem(value) {
  const stem = String(value)
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
  return stem || "scenario";
}

export async function atomicWrite(file, data) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(temporary, data);
  await fs.promises.rename(temporary, file);
}

export function float32FromBuffer(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const copy = Uint8Array.from(bytes);
  return new Float32Array(copy.buffer);
}

export function uint32FromBuffer(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const copy = Uint8Array.from(bytes);
  return new Uint32Array(copy.buffer);
}
