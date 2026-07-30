import assert from "node:assert/strict";
// Current Build 654 delivery identity and source-assembly contract.
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shellPath = path.join(appRoot, "shell.html");

const threeWayModules = [
  "threeway-state-contract.js",
  "threeway-reference-cards.js",
  "threeway-driver-db.js",
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
];

test("assembled application exactly matches the ordered Build 654 source modules", async () => {
  const [shell, profileLaws, engine, twoWay, assembled, ...threeWaySources] = await Promise.all([
    readFile(shellPath, "utf8"),
    readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
    readFile(path.join(appRoot, "engine.js"), "utf8"),
    readFile(path.join(appRoot, "twoway-core.js"), "utf8"),
    readFile(path.join(appRoot, "meh5.html"), "utf8"),
    ...threeWayModules.map(filename =>
      readFile(path.join(appRoot, filename), "utf8")),
  ]);
  const threeWay = threeWaySources.join("\n\n");
  const expected = shell
    .replace("/*__PROFILE_LAWS__*/", () => profileLaws)
    .replace("/*__ENGINE__*/", () => engine)
    .replace("/*__TWOWAY__*/", () => twoWay)
    .replace("/*__THREEWAY__*/", () => threeWay)
    .replace("/*__CAD__*/", "/* parametric */");
  assert.equal(
    assembled,
    expected,
    "meh5.html is stale; run node assemble.js after the final source edit",
  );
});

test("ordered three-way stack captures every browser dependency before the controller loads", async () => {
  const [profileLaws, ...threeWaySources] = await Promise.all([
    readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
    ...threeWayModules.map(filename =>
      readFile(path.join(appRoot, filename), "utf8")),
  ]);
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(profileLaws, context, { filename: "profile-laws.js" });
  for (let index = 0; index < threeWayModules.length; index += 1) {
    vm.runInContext(threeWaySources[index], context, {
      filename: threeWayModules[index],
    });
  }

  for (const globalName of [
    "MEH3StateContract",
    "MEH3ReferenceCards",
    "MEH3DriverDB",
    "MEH3AnalysisPresets",
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
  ]) {
    assert.ok(context[globalName], `${globalName} was not installed`);
  }
  const refused = context.MEH3ThreewaySolver.solveThreeWay({});
  assert.equal(refused.ok, false);
  assert.equal(
    refused.diagnostics.some(item =>
      item.code === "THREEWAY_SOLVER_DEPENDENCY_UNAVAILABLE"),
    false,
    "threeway-solver captured a missing browser dependency",
  );
  assert.equal(context.MEH3Controller.storageKey, "meh5_threeway_state_v2");
  assert.equal(context.MEH3, undefined, "retired schema-1 core was wired");
});

test("Build 654 boot identity is decided before saved geometry is read", async () => {
  const shell = await readFile(shellPath, "utf8");
  const queryIndex = shell.indexOf(
    "const BOOT_Q=new URLSearchParams(location.search)",
  );
  const savedStateIndex = shell.indexOf(
    "localStorage.getItem('meh5_state')",
  );

  assert.match(shell, /window\.MEH_BUILD=654;/);
  assert.match(
    shell,
    /meh5\.html\?build=654&source=file-redirect/,
  );
  assert.ok(queryIndex >= 0, "boot query contract is missing");
  assert.ok(savedStateIndex >= 0, "saved-state read is missing");
  assert.ok(
    queryIndex < savedStateIndex,
    "build/reset policy must be known before saved geometry is read",
  );
  assert.match(
    shell,
    /BOOT_BUILD_MISMATCH\|\|BOOT_RESET_APPLIED\)\?\{\}/,
    "a refused or reset boot must not consume saved geometry",
  );
  assert.match(
    shell,
    /localStorage\.removeItem\('meh5_state'\)/,
    "reset=1 must remove the saved geometry record",
  );
});

test("Build 654 preserves the frozen Build 653 corner-plate mesh namespace", async () => {
  const twoWay = await readFile(path.join(appRoot, "twoway-core.js"), "utf8");
  assert.match(
    twoWay,
    /const MESH_POLICY_VERSION='b653-differential-cell-terminal-grid-v3';/,
  );
  assert.match(
    twoWay,
    /return 'b653-'\+hash\.toString\(36\)/,
  );
});

test("Build mismatch fails closed and publishes one runtime sentinel", async () => {
  const shell = await readFile(shellPath, "utf8");

  assert.match(shell, /id="runtimeSentinel"/);
  assert.match(shell, /if\(BOOT_BUILD_MISMATCH\)\{/);
  assert.match(shell, /paintRuntimeSentinel\('refused',detail\)/);
  assert.match(shell, /window\.MEH_RUNTIME_SENTINEL=snapshot/);
  assert.match(shell, /root\.dataset\.runtimeBuild=String\(snapshot\.build\)/);
  assert.match(shell, /root\.dataset\.runtimeStateHash=snapshot\.stateHash/);
  assert.match(shell, /root\.dataset\.runtimeRevision=String\(snapshot\.revision\)/);
  assert.match(shell, /root\.dataset\.runtimeView=snapshot\.view/);

  const mismatchIndex = shell.lastIndexOf("if(BOOT_BUILD_MISMATCH){");
  const initIndex = shell.lastIndexOf("init3d();");
  assert.ok(mismatchIndex >= 0 && initIndex > mismatchIndex);
  const boot = shell.slice(mismatchIndex);
  assert.match(
    boot,
    /if\(BOOT_BUILD_MISMATCH\)\{[\s\S]*?\}else\{[\s\S]*?init3d\(\);/,
    "3D initialization must be confined to the accepted-build branch",
  );
});

test("explicit view is re-applied after wiring and before the first rebuild", async () => {
  const shell = await readFile(shellPath, "utf8");
  const acceptedBoot = shell.slice(shell.lastIndexOf("}else{"));
  const wireIndex = acceptedBoot.indexOf("wire();");
  const viewIndex = acceptedBoot.indexOf("applyBootInspectionState();", wireIndex);
  const rebuildIndex = acceptedBoot.indexOf("rebuild();", wireIndex);

  assert.ok(wireIndex >= 0, "accepted boot does not wire controls");
  assert.ok(viewIndex > wireIndex, "boot view is not restored after wiring");
  assert.ok(
    rebuildIndex > viewIndex,
    "boot view must be restored before the first solved render",
  );
});

test("mouth-width control and live value badge share the generic binding contract", async () => {
  const shell = await readFile(shellPath, "utf8");

  assert.match(shell, /id="mouthW"/);
  assert.match(shell, /id="vMouthW"/);
  assert.doesNotMatch(shell, /id="vMouth"/);
  assert.match(shell, /bind\('mouthW','mouthW',v=>v\+'″'\)/);
});
