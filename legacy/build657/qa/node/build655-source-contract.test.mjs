import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shellPath = path.join(appRoot, "shell.html");

/*
 * This is deliberately independent of assemble.js. A module cannot enter the
 * delivered browser merely by adding itself to the assembler: the release
 * contract has to acknowledge its position and browser global as well.
 */
const THREEWAY_MODULES = Object.freeze([
  "threeway-state-contract.js",
  "threeway-reference-cards.js",
  "threeway-driver-db.js",
  "threeway-family-catalog.js",
  "threeway-analysis-presets.js",
  "threeway-quick-starts.js",
  "threeway-acoustics.js",
  "threeway-chamber-solver.js",
  "threeway-coupled-network.js",
  "threeway-horn-surface.js",
  "threeway-aperture-solver.js",
  "threeway-station-solver.js",
  "threeway-interface-planner.js",
  "threeway-lumen-geometry.js",
  "threeway-passage-solver.js",
  "threeway-mount-host.js",
  "threeway-mount-solver.js",
  "threeway-package-input.js",
  "threeway-package-solver.js",
  "threeway-preview-geometry.js",
  "threeway-solid-geometry.js",
  "threeway-solid-intent.js",
  "threeway-render-assembly.js",
  "threeway-render-model.js",
  "threeway-analysis-export.js",
  "threeway-solver.js",
  "threeway-renderer.js",
  "threeway-solid-plan.js",
  "threeway-exact-kernel.js",
  "threeway-fabrication-gate.js",
  "threeway-controller.js",
  "threeway-ui.js",
]);

const THREEWAY_GLOBALS = Object.freeze([
  "MEH3StateContract",
  "MEH3ReferenceCards",
  "MEH3DriverDB",
  "MEH3FamilyCatalog",
  "MEH3AnalysisPresets",
  "MEH3QuickStarts",
  "MEH3Acoustics",
  "MEH3ChamberSolver",
  "MEH3CoupledNetwork",
  "MEH3HornSurface",
  "MEH3ApertureSolver",
  "MEH3StationSolver",
  "MEH3InterfacePlanner",
  "MEH3LumenGeometry",
  "MEH3PassageSolver",
  "MEH3MountHost",
  "MEH3MountSolver",
  "MEH3PackageInput",
  "MEH3PackageSolver",
  "MEH3PreviewGeometry",
  "MEH3SolidGeometry",
  "MEH3SolidIntent",
  "MEH3RenderAssembly",
  "MEH3RenderModel",
  "MEH3AnalysisExport",
  "MEH3ThreewaySolver",
  "MEH3Renderer",
  "MEH3SolidPlan",
  "MEH3ExactKernel",
  "MEH3FabricationGate",
  "MEH3Controller",
  "MEH3UI",
]);

function assemblerModuleList(source) {
  const match = source.match(
    /const THREEWAY_MODULES=Object\.freeze\(\[([\s\S]*?)\]\);/,
  );
  assert.ok(match, "assemble.js has no frozen THREEWAY_MODULES list");
  return [...match[1].matchAll(/['"]([^'"]+\.js)['"]/g)]
    .map(item => item[1]);
}

test("release assembler uses the audited schema-2 dependency order", async () => {
  const assemble = await readFile(path.join(appRoot, "assemble.js"), "utf8");
  assert.deepEqual(
    assemblerModuleList(assemble),
    [...THREEWAY_MODULES],
    "assemble.js must be updated deliberately when the browser module graph changes",
  );
});

test("assembled application exactly matches the ordered release sources", async () => {
  const [shell, profileLaws, engine, twoWay, assembled, ...threeWaySources] =
    await Promise.all([
      readFile(shellPath, "utf8"),
      readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
      readFile(path.join(appRoot, "engine.js"), "utf8"),
      readFile(path.join(appRoot, "twoway-core.js"), "utf8"),
      readFile(path.join(appRoot, "meh5.html"), "utf8"),
      ...THREEWAY_MODULES.map(filename =>
        readFile(path.join(appRoot, filename), "utf8")),
    ]);
  const expected = shell
    .replace("/*__PROFILE_LAWS__*/", () => profileLaws)
    .replace("/*__ENGINE__*/", () => engine)
    .replace("/*__TWOWAY__*/", () => twoWay)
    .replace("/*__THREEWAY__*/", () => threeWaySources.join("\n\n"))
    .replace("/*__CAD__*/", "/* parametric */");
  assert.equal(
    assembled,
    expected,
    "meh5.html is stale; run node assemble.js after the final source edit",
  );
});

test("ordered browser stack installs catalog and closed-solid dependencies", async () => {
  const [profileLaws, ...sources] = await Promise.all([
    readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
    ...THREEWAY_MODULES.map(filename =>
      readFile(path.join(appRoot, filename), "utf8")),
  ]);
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(profileLaws, context, { filename: "profile-laws.js" });
  for (let index = 0; index < THREEWAY_MODULES.length; index += 1) {
    vm.runInContext(sources[index], context, {
      filename: THREEWAY_MODULES[index],
    });
  }
  for (const globalName of THREEWAY_GLOBALS) {
    assert.ok(context[globalName], `${globalName} was not installed`);
  }
  assert.equal(context.MEH3, undefined, "retired schema-1 core was wired");

  const families = context.MEH3FamilyCatalog.listSelectableFamilies();
  assert.ok(Array.isArray(families) && families.length >= 3);
  assert.deepEqual(
    [...families.map(item => item.topology).sort()],
    ["CX3", "H3", "T3"],
    "the source-bounded T3/CX3/H3 catalog is incomplete",
  );
  assert.equal(
    context.MEH3FamilyCatalog.capabilities.manufacturingReadiness,
    false,
    "a catalog selection must not masquerade as manufacturing evidence",
  );

  const calculated = context.MEH3FamilyCatalog.getPreset("t3-calculated-111");
  assert.ok(calculated, "the calculated integrated-solid T3 preset is missing");
  assert.ok(
    calculated.analysisInput?.solidGeometry,
    "the calculated T3 preset has no explicit solid-geometry construction input",
  );
  assert.equal(
    context.MEH3SolidGeometry.capabilities.closedHornShell,
    true,
  );
  assert.equal(
    context.MEH3SolidGeometry.capabilities.fullFrameDriverPlates,
    true,
  );
  assert.equal(
    context.MEH3SolidGeometry.capabilities.continuousExtendedLumenNegatives,
    true,
  );
  assert.equal(
    context.MEH3SolidGeometry.capabilities.booleanExecution,
    false,
    "closed operands are not proof that a Boolean was executed",
  );
});

test("release boot identity is decided before either saved state is read", async () => {
  const shell = await readFile(shellPath, "utf8");
  const queryIndex = shell.indexOf(
    "const BOOT_Q=new URLSearchParams(location.search)",
  );
  const legacyReadIndex = shell.indexOf(
    "localStorage.getItem('meh5_state')",
  );

  assert.match(shell, /window\.MEH_BUILD=657;/);
  assert.match(shell, /meh5\.html\?build=657&source=file-redirect/);
  assert.ok(queryIndex >= 0, "boot query contract is missing");
  assert.ok(legacyReadIndex >= 0, "saved-state read is missing");
  assert.ok(
    queryIndex < legacyReadIndex,
    "build/reset policy must be known before saved geometry is read",
  );
  assert.match(
    shell,
    /BOOT_BUILD_MISMATCH\|\|BOOT_RESET_APPLIED\)\?\{\}/,
    "a refused or reset boot must not consume saved legacy geometry",
  );
  assert.match(shell, /localStorage\.removeItem\('meh5_state'\)/);
  assert.match(
    shell,
    /localStorage\.removeItem\('meh5_threeway_state_v2'\)/,
    "reset=1 must clear the current schema-2 intent as well",
  );
});

test("release manifest names the browser modules and current QA boundary", async () => {
  const manifest = await readFile(
    path.join(appRoot, "SOURCE-MANIFEST.md"),
    "utf8",
  );
  assert.match(manifest, /^# Build 657 source manifest$/m);
  for (const filename of [
    "threeway-family-catalog.js",
    "threeway-solid-geometry.js",
    "qa/node/build655-source-contract.test.mjs",
    "qa/browser/build655-delivery-contract.mjs",
    "qa/release/build655-package-contract.mjs",
  ]) {
    assert.match(
      manifest,
      new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${filename} is absent from SOURCE-MANIFEST.md`,
    );
  }
});

export { THREEWAY_GLOBALS, THREEWAY_MODULES };
