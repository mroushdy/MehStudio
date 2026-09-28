#!/usr/bin/env node
import { engine } from "./case-loader.mjs";

const FIXTURES = [
  ["panel", "slot", "integrated"],
  ["panel", "slot", "cartridge"],
  ["panel", "oval", "integrated"],
  ["panel", "round", "integrated"],
  ["radial", "slot", "integrated"],
  ["radial", "slot", "cartridge"],
  ["radial", "oval", "integrated"],
  ["radial", "round", "integrated"],
];
const failures = [];
let assertions = 0;

const add = (a, b, scale = 1) => a.map((value, index) => value + b[index] * scale);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const length = (a) => Math.hypot(...a);
const mix = (a, b, t) => add(a, sub(b, a), t);

function check(condition, label) {
  assertions += 1;
  if (!condition) failures.push(label);
}

function stateFor(family, shape, construction) {
  const architecture = engine.TWO_ARCH[family];
  return {
    ...architecture.defaults,
    topo: "2way",
    twoArch: family,
    twoFamily: family,
    twoDesign: `arch:${family}`,
    tapBasis: "model",
    tapCRW: 10,
    nW: 2,
    npW: 2,
    shW: shape,
    driverCellConstruction: construction,
    mountRing: construction === "cartridge" ? "ring" : "integrated",
    mouthW: family === "panel" ? 32 : 34,
    mouthCap: 64,
    covH: 90,
    covV: 60,
    wallT: family === "panel" ? 0.018 : 0.012,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    wPre: family === "panel" ? "ndl88" : "w5",
    frameW: "round",
    odW: family === "panel" ? 31.5 : 13.76,
    dpW: family === "panel" ? 14 : 6.95,
    sdW: family === "panel" ? 522 : 91.6,
    vtcW: family === "panel" ? 180 : 35,
    xmW: family === "panel" ? 8 : 2.5,
    adapterReach: 35,
    adapterReachMode: "auto"
  };
}

function interiorOffsets(port) {
  const outline = engine.twoWayApertureOutline(port, 32);
  return [[0, 0], ...outline.filter((_, index) => index % 4 === 0)
    .map(([u, v]) => [u * 0.62, v * 0.62])];
}

for (const [family, shape, construction] of FIXTURES) {
      const id = `${family}/${shape}/${construction}`;
      /* Lumen topology does not depend on the expensive retained-cartridge
         fastener search. Build the same canonical plan with retention
         deferred, then interrogate the production exact field directly. */
      const plan = engine.twoWayPlan(stateFor(family, shape, construction), {
        deferRetention: true,
        coarseRadialDiagnostics: true,
      });
      const field = engine.twoWaySolidField(plan, construction === "cartridge");
      const audit = engine.assemblyAudit(plan, field);
      /* Boolean zero at a cutter's terminal plane is a valid shared boundary.
         The full-section probes below are the stronger connectivity witness. */
      check(audit.wallBesideCut, `${id}: no structural web beside a tap`);

      for (const driver of plan.drivers) {
        for (const port of driver.ports) {
          const tapId = `${id}/d${driver.index}/t${port.index}`;
          const tool = field.tapTools?.[driver.index]?.[port.index];
          check(Boolean(tool), `${tapId}: canonical exact cutter missing`);
          if (!tool) continue;
          const sections = tool.kind === "swept-aperture" ? tool.sections : [tool];
          check(sections.length > 0, `${tapId}: cutter has no path sections`);
          for (const [sectionIndex, section] of sections.entries()) {
            check(section.shape === port.shape,
              `${tapId}/s${sectionIndex}: shape drifted to ${section.shape}`);
            check(Math.abs(section.sa - port.sa) < 1e-12,
              `${tapId}/s${sectionIndex}: long semi-axis drift`);
            check(Math.abs(section.sb - port.sb) < 1e-12,
              `${tapId}/s${sectionIndex}: short semi-axis drift`);
            check(length(sub(section.b, section.a)) > 1e-5,
              `${tapId}/s${sectionIndex}: zero-length path`);
            for (const t of [0.08, 0.25, 0.5, 0.75, 0.92]) {
              const center = mix(section.a, section.b, t);
              for (const [u, v] of interiorOffsets(port)) {
                const point = add(add(center, section.u, u), section.v, v);
                check(field(point) > -1e-8,
                  `${tapId}/s${sectionIndex}: blocked section at t=${t}, u=${u}, v=${v}`);
              }
            }
          }

          const first = sections[0], last = sections.at(-1);
          check(field(mix(first.a, first.b, 0.15)) > -1e-8,
            `${tapId}: horn-side lumen is blocked`);
          check(field(mix(last.a, last.b, 0.85)) > -1e-8,
            `${tapId}: chamber-side lumen is blocked`);
          const chamberProbe = add(driver.cavInner, driver.mountN,
            Math.max(0.001, Math.min(0.004, plan.chamberDepth * 0.12)));
          check(field(chamberProbe) > -1e-8,
            `${tapId}: front chamber does not contain air`);
        }
      }
}

if (failures.length) {
  failures.slice(0, 80).forEach((failure) => console.error(`FAIL ${failure}`));
  if (failures.length > 80) console.error(`FAIL ... ${failures.length - 80} more`);
  process.exit(1);
}

console.log(`TAP LUMEN CONTINUITY PASS - ${assertions} assertions across `
  + `${FIXTURES.length} representative shape/construction fixtures`);
