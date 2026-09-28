import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
export const qaRoot = path.resolve(here, "..");
export const projectRoot = path.resolve(qaRoot, "..");
export const engine = require(path.join(projectRoot, "engine.js"));

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(qaRoot, relativePath), "utf8"));
}

function sourceState(source) {
  if (!source) return {};
  if (source.type === "family") {
    const family = engine.TWO_ARCH[source.key];
    if (!family) throw new Error(`unknown two-way family: ${source.key}`);
    return {
      ...family.defaults,
      topo: "2way",
      twoArch: source.key,
      twoFamily: source.key,
      twoDesign: `arch:${source.key}`
    };
  }
  if (source.type === "build") {
    const build = (engine.BUILDS["2way"] || []).find((item) => item.key === source.key);
    if (!build) throw new Error(`unknown two-way build: ${source.key}`);
    return { ...build.s };
  }
  throw new Error(`unknown case source type: ${source.type}`);
}

export function resolveCase(document, testCase) {
  return {
    ...(document.baseState || {}),
    ...sourceState(testCase.source),
    ...(testCase.overrides || {})
  };
}

export function loadCaseDocuments() {
  return [
    {
      name: "canonical",
      document: readJson("cases/canonical.json")
    },
    {
      name: "expected-refusals",
      document: readJson("cases/expected-refusals.json")
    }
  ];
}

export function loadCases() {
  return loadCaseDocuments().flatMap(({ name, document }) =>
    document.cases.map((testCase) => ({
      ...testCase,
      documentName: name,
      state: resolveCase(document, testCase)
    }))
  );
}

export function finiteTree(value, pathName = "root", failures = []) {
  if (typeof value === "number" && !Number.isFinite(value)) {
    failures.push(`${pathName} is not finite`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => finiteTree(item, `${pathName}[${index}]`, failures));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (typeof item !== "function") finiteTree(item, `${pathName}.${key}`, failures);
    }
  }
  return failures;
}

export function stableValue(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    return Number(value.toPrecision(13));
  }
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => typeof value[key] !== "function")
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

export function planSignature(result) {
  const plan = result.ev.plan;
  const state = { ...result.S };
  /*
   * Solver-emitted pass diagnostics are not geometric plan identity.  The
   * exact-retention phase can grow the mouth after the mount envelope has
   * already been admitted, so this explanatory value may be recomputed from
   * the settled mouth on a second solve without changing any manufactured
   * surface.
   */
  delete state.mountEnvelopeMinMouthW;
  return stableValue({
    state,
    infeasible: result.infeasible,
    failures: (result.ev.rows || [])
      .filter((row) => row.st === "fail")
      .map((row) => ({ section: row.sec, name: row.name, value: row.val })),
    plan: {
      family: plan.family,
      nW: plan.S.nW,
      npW: plan.np,
      station: plan.station,
      totalArea: plan.totalArea,
      passage: plan.passage,
      chamberV: plan.chamberV,
      throatR: plan.throatR,
      mouthW: plan.S.mouthW,
      drivers: plan.drivers.map((driver) => ({
        phi: driver.phi,
        surface: driver.surface,
        mountN: driver.mountN,
        driverFace: driver.driverFace,
        adapterReach: driver.adapterReach,
        ports: driver.ports.map((port) => ({
          center: port.center,
          normal: port.normal,
          sa: port.sa,
          sb: port.sb,
          shape: port.shape,
          area: port.area
        }))
      }))
    }
  });
}
