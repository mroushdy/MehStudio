#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const qaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { tier: "quick" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--tier") options.tier = argv[++index];
    else if (argv[index] === "--help") options.help = true;
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  return options;
}

function run(script, args = []) {
  console.log(`\n==> node ${script} ${args.join(" ")}`.trim());
  const result = spawnSync(process.execPath, [path.join(qaRoot, script), ...args], {
    cwd: qaRoot,
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  return result.status || 0;
}

function printHelp() {
  console.log(`Usage: node node/run.mjs --tier TIER

  quick       Resource-safe plan, mount, policy, adaptation, and pairwise checks
  plan        Canonical/refusal/pairwise plan sweep only
  geometry    QA-only sub-UI exact mesh plus deep audit and STL
  certificate  Historical Build 649 production-certificate replay
  release     Current quick gates, six-woofer exact topology, and browser admission
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const tiers = {
  quick: [
    ["mount-interface-universal.test.js", []],
    ["node/ui-regression-contracts.test.mjs", []],
    ["node/driver-mount-record-controls.test.mjs", []],
    ["node/build652-delivery-contract.test.mjs", []],
    ["node/build649-user-state-regression.test.mjs", []],
    ["node/build649-state-depth-contract.test.mjs", []],
    ["node/build649-source-family-contract.test.mjs", []],
    ["node/curved-facets-contract.test.mjs", []],
    ["node/angular-square-endpoint-regression.test.mjs", []],
    ["node/analytic-preview-topology-regression.test.mjs", []],
    ["node/swept-tap-frame-continuity.test.mjs", []],
    ["node/bounded-panel-fillet.test.mjs", []],
    ["node/driver-cd-flange-clearance.test.mjs", []],
    ["node/corner-driver-plate-regression.test.mjs", []],
    ["node/build650-osse-panel-connectivity.test.mjs", []],
    ["node/generalized-array-placement-regression.test.mjs", []],
    ["node/webgl-resource-lifecycle-contract.test.mjs", []],
    ["node/subxo-semantics-regression.test.mjs", []],
    ["node/cartridge-retention-regression.test.mjs", []],
    ["node/radial-profile-foundation.test.mjs", []],
    ["node/ath-source-math.test.mjs", []],
    ["node/profile-laws-regression.test.mjs", []],
    ["node/profile-law-integration.test.mjs", []],
    ["node/mount-envelope-regression.test.mjs", []],
    ["node/panel-profile-mount-preview.test.mjs", []],
    ["node/section-family-control.test.mjs", []],
    ["node/rounded-rectangle-section.test.mjs", []],
    ["node/profile-control-parity.test.mjs", []],
    ["node/profile-paired-controls.test.mjs", []],
    ["node/coverage-control-regression.test.mjs", []],
    ["node/driver-geometry-hierarchy.test.mjs", []],
    ["node/driver-array-controls.test.mjs", []],
    ["node/driver-manifold-controls.test.mjs", []],
    ["node/driver-manifold-regression.test.mjs", []],
    ["node/export-cavity-ownership.test.mjs", []],
    ["node/rosse-monotone-profile.test.mjs", []],
    ["node/oneway-coax-apex-regression.test.mjs", []],
    ["node/oneway-profile-law-integration.test.mjs", []],
    ["node/oneway-profile-selector-failclosed.test.mjs", []],
    ["node/cone-relief-generatrix.test.mjs", []],
    ["node/driver-cell-inspection-contract.test.mjs", []],
    ["node/full-driver-occlusion-contract.test.mjs", []],
    ["node/smart-adapt-bounded-search.test.mjs", []],
    ["node/throat-morph-regression.test.mjs", []],
    ["node/tap-pair-spacing-regression.test.mjs", []],
    ["node/tap-station-diagnostics.test.mjs", []],
    ["node/tap-lumen-continuity.test.mjs", []],
    ["node/tap-lumen-render-contract.test.mjs", []],
    ["node/exact-mesh-diagnostics.test.mjs", []],
    ["node/packed-mesh-compatibility.test.mjs", []],
    ["node/twoway-mesh-budget.test.mjs", []],
    ["node/radial-adaptation-regression.mjs", []],
    ["node/pairwise-geometry-regression.mjs", []],
    ["node/plan-sweep.mjs", ["--canonical-only"]]
  ],
  plan: [
    ["node/ui-regression-contracts.test.mjs", []],
    ["node/driver-mount-record-controls.test.mjs", []],
    ["node/build652-delivery-contract.test.mjs", []],
    ["node/build649-user-state-regression.test.mjs", []],
    ["node/build649-state-depth-contract.test.mjs", []],
    ["node/build649-source-family-contract.test.mjs", []],
    ["node/curved-facets-contract.test.mjs", []],
    ["node/angular-square-endpoint-regression.test.mjs", []],
    ["node/analytic-preview-topology-regression.test.mjs", []],
    ["node/swept-tap-frame-continuity.test.mjs", []],
    ["node/bounded-panel-fillet.test.mjs", []],
    ["node/driver-cd-flange-clearance.test.mjs", []],
    ["node/corner-driver-plate-regression.test.mjs", []],
    ["node/build650-osse-panel-connectivity.test.mjs", []],
    ["node/generalized-array-placement-regression.test.mjs", []],
    ["node/webgl-resource-lifecycle-contract.test.mjs", []],
    ["node/subxo-semantics-regression.test.mjs", []],
    ["node/cartridge-retention-regression.test.mjs", []],
    ["node/radial-profile-foundation.test.mjs", []],
    ["node/ath-source-math.test.mjs", []],
    ["node/profile-laws-regression.test.mjs", []],
    ["node/profile-law-integration.test.mjs", []],
    ["node/mount-envelope-regression.test.mjs", []],
    ["node/panel-profile-mount-preview.test.mjs", []],
    ["node/section-family-control.test.mjs", []],
    ["node/rounded-rectangle-section.test.mjs", []],
    ["node/profile-control-parity.test.mjs", []],
    ["node/profile-paired-controls.test.mjs", []],
    ["node/coverage-control-regression.test.mjs", []],
    ["node/driver-geometry-hierarchy.test.mjs", []],
    ["node/driver-array-controls.test.mjs", []],
    ["node/driver-manifold-controls.test.mjs", []],
    ["node/driver-manifold-regression.test.mjs", []],
    ["node/export-cavity-ownership.test.mjs", []],
    ["node/oneway-coax-apex-regression.test.mjs", []],
    ["node/oneway-profile-law-integration.test.mjs", []],
    ["node/oneway-profile-selector-failclosed.test.mjs", []],
    ["node/throat-morph-regression.test.mjs", []],
    ["node/tap-pair-spacing-regression.test.mjs", []],
    ["node/tap-station-diagnostics.test.mjs", []],
    ["node/tap-lumen-continuity.test.mjs", []],
    ["node/tap-lumen-render-contract.test.mjs", []],
    ["node/exact-mesh-diagnostics.test.mjs", []],
    ["node/twoway-mesh-budget.test.mjs", []],
    ["node/radial-adaptation-regression.mjs", []],
    ["node/pairwise-geometry-regression.mjs", []],
    ["node/plan-sweep.mjs", []]
  ],
  geometry: [
    ["node/bounded-exact-witness.mjs", []]
  ],
  certificate: [
    ["node/production-exact-certificate.mjs", []]
  ],
  release: [
    ["mount-interface-universal.test.js", []],
    ["node/ui-regression-contracts.test.mjs", []],
    ["node/driver-mount-record-controls.test.mjs", []],
    ["node/saved-mount-persistence.test.mjs", []],
    ["node/build652-delivery-contract.test.mjs", []],
    ["node/build649-user-state-regression.test.mjs", []],
    ["node/build649-state-depth-contract.test.mjs", []],
    ["node/build649-source-family-contract.test.mjs", []],
    ["node/curved-facets-contract.test.mjs", []],
    ["node/angular-square-endpoint-regression.test.mjs", []],
    ["node/analytic-preview-topology-regression.test.mjs", []],
    ["node/swept-tap-frame-continuity.test.mjs", []],
    ["node/bounded-panel-fillet.test.mjs", []],
    ["node/driver-cd-flange-clearance.test.mjs", []],
    ["node/corner-driver-plate-regression.test.mjs", []],
    ["node/build650-osse-panel-connectivity.test.mjs", []],
    ["node/generalized-array-placement-regression.test.mjs", []],
    ["node/webgl-resource-lifecycle-contract.test.mjs", []],
    ["node/subxo-semantics-regression.test.mjs", []],
    ["node/cartridge-retention-regression.test.mjs", []],
    ["node/radial-profile-foundation.test.mjs", []],
    ["node/ath-source-math.test.mjs", []],
    ["node/profile-laws-regression.test.mjs", []],
    ["node/profile-law-integration.test.mjs", []],
    ["node/mount-envelope-regression.test.mjs", []],
    ["node/panel-profile-mount-preview.test.mjs", []],
    ["node/section-family-control.test.mjs", []],
    ["node/rounded-rectangle-section.test.mjs", []],
    ["node/profile-control-parity.test.mjs", []],
    ["node/profile-paired-controls.test.mjs", []],
    ["node/coverage-control-regression.test.mjs", []],
    ["node/driver-geometry-hierarchy.test.mjs", []],
    ["node/driver-array-controls.test.mjs", []],
    ["node/driver-manifold-controls.test.mjs", []],
    ["node/driver-manifold-regression.test.mjs", []],
    ["node/export-cavity-ownership.test.mjs", []],
    ["node/oneway-coax-apex-regression.test.mjs", []],
    ["node/oneway-profile-law-integration.test.mjs", []],
    ["node/oneway-profile-selector-failclosed.test.mjs", []],
    ["node/throat-morph-regression.test.mjs", []],
    ["node/tap-pair-spacing-regression.test.mjs", []],
    ["node/tap-station-diagnostics.test.mjs", []],
    ["node/tap-lumen-continuity.test.mjs", []],
    ["node/tap-lumen-render-contract.test.mjs", []],
    ["node/exact-mesh-diagnostics.test.mjs", []],
    ["node/packed-mesh-compatibility.test.mjs", []],
    ["node/twoway-mesh-budget.test.mjs", []],
    ["node/radial-adaptation-regression.mjs", []],
    ["node/pairwise-geometry-regression.mjs", []],
    ["node/plan-sweep.mjs", ["--canonical-only"]],
    ["node/rosse-monotone-profile.test.mjs", []],
    ["node/cone-relief-generatrix.test.mjs", []],
    ["node/driver-cell-inspection-contract.test.mjs", []],
    ["node/full-driver-occlusion-contract.test.mjs", []],
    ["node/smart-adapt-bounded-search.test.mjs", []],
    ["node/build650-six-woofer-exact.test.mjs", []],
    ["browser/build652-delivery-contract.mjs", []],
    ["browser/build652-six-woofer-ui.mjs", []],
    ["browser/build652-six-corner-witness.mjs", []],
    ["browser/rosse-profile-controls.mjs", []],
    ["browser/oneway-profile-selector-failclosed.mjs", []],
    ["browser/driver-array-controls.mjs", []],
    ["browser/driver-manifold-controls.mjs", []],
    ["browser/driver-mount-record-controls.mjs", []],
    ["browser/build649-state-mutation-contract.mjs", []],
    /*
     * These are real rendered-pixel matrices, not source-only contracts.
     * Keep them serialized inside the release runner so a green release
     * cannot omit the views where tap walls, profile changes, throat morphs,
     * and wall topology regressions have historically appeared.
     */
    ["browser/render-inspection.mjs", ["--tap-lumen"]],
    ["browser/render-inspection.mjs", ["--wall-topologies"]],
    ["browser/render-inspection.mjs", ["--profile-laws"]],
    ["browser/render-inspection.mjs", ["--throat-morph"]]
  ]
};

if (!tiers[options.tier]) throw new Error(`unknown tier: ${options.tier}`);
let failed = 0;
for (const [script, args] of tiers[options.tier]) {
  if (run(script, args) !== 0) failed += 1;
}
if (failed) {
  console.error(`\nQA ${options.tier.toUpperCase()} FAILED — ${failed} command(s) failed`);
  process.exit(1);
}
console.log(`\nQA ${options.tier.toUpperCase()} PASS`);
