import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shellPath = path.join(appRoot, "shell.html");

test("assembled application exactly matches the four current source modules", async () => {
  const [shell, profileLaws, engine, twoWay, assembled] = await Promise.all([
    readFile(shellPath, "utf8"),
    readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
    readFile(path.join(appRoot, "engine.js"), "utf8"),
    readFile(path.join(appRoot, "twoway-core.js"), "utf8"),
    readFile(path.join(appRoot, "meh5.html"), "utf8"),
  ]);
  const expected = shell
    .replace("/*__PROFILE_LAWS__*/", profileLaws)
    .replace("/*__ENGINE__*/", engine)
    .replace("/*__TWOWAY__*/", twoWay)
    .replace("/*__CAD__*/", "/* parametric */");
  assert.equal(
    assembled,
    expected,
    "meh5.html is stale; run node assemble.js after the final source edit",
  );
});

test("Build 651 boot identity is decided before saved geometry is read", async () => {
  const shell = await readFile(shellPath, "utf8");
  const queryIndex = shell.indexOf(
    "const BOOT_Q=new URLSearchParams(location.search)",
  );
  const savedStateIndex = shell.indexOf(
    "localStorage.getItem('meh5_state')",
  );

  assert.match(shell, /window\.MEH_BUILD=651;/);
  assert.match(
    shell,
    /meh5\.html\?build=651&source=file-redirect/,
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

test("Build 651 owns the corner-plate swept-tap mesh namespace", async () => {
  const twoWay = await readFile(path.join(appRoot, "twoway-core.js"), "utf8");
  assert.match(
    twoWay,
    /const MESH_POLICY_VERSION='b651-differential-cell-terminal-grid-v3';/,
  );
  assert.match(
    twoWay,
    /return 'b651-'\+hash\.toString\(36\)/,
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
