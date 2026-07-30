#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { engine, projectRoot } from "./case-loader.mjs";

const shell = fs.readFileSync(path.join(projectRoot, "shell.html"), "utf8");
const failures = [];
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

function between(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`source boundary missing: ${start}`);
  return source.slice(a, b);
}

const state = {
  ...engine.TWO_ARCH.panel.defaults,
  topo: "2way",
  twoArch: "panel",
  twoFamily: "panel",
  twoDesign: "arch:panel",
  style: "smooth",
  profileLaw: "classicOS",
  sectionFamily: "superellipse",
  seN: 6,
  nW: 2,
  npW: 2,
  panelAxis: "horizontal",
  tapBasis: "model",
  shW: "slot",
  tapShapeW: "slot",
  mouthW: 32,
  mouthCap: 64,
  covH: 90,
  covV: 60,
  wallT: 0.018,
  td: 1.4,
  throat: 1.4,
  cdSel: "dcx464",
  wPre: "nw10",
  odW: 26.1,
  dpW: 11.9,
  sdW: 320,
  vtcW: 1400,
  xmW: 6.8,
  twoXO: 430,
  tapCRW: 9,
  tapStationW: 143.3,
  tapSlotL: 101.6,
  tapSlotW: 19.1,
  adapterReach: 35,
  adapterReachMode: "auto",
};

const supportSource = between(
  shell,
  "function relievedSupportVisual(",
  "function annularPlate(",
);
const integratedSource = between(
  shell,
  "function panelRelievedLand(",
  "function radialPreviewFrame(",
);
const cornerSource = between(
  shell,
  "function panelCornerRelievedLand(",
  "function panelRelievedLand(",
);
const cartridgeSource = between(
  shell,
  "function panelCartridgeVisual(",
  "function radialModuleVisual(",
);

check(
  /function relievedSupportVisual\(P,/.test(supportSource)
    && /clippedPreviewSurface\(P,triangles,profileOffset/.test(supportSource),
  "panel relieved support is not clipped against the solved horn profile",
);
check(
  /includeBearingFace=true/.test(supportSource)
    && /bearingFaceOwnerCount=includeBearingFace\?1:0/.test(supportSource),
  "relieved support cannot hand bearing-face ownership to a protected plate",
);
check(
  /structural-root-closure/.test(supportSource)
    && /structuralRootClosureCount=1/.test(supportSource)
    && /twoSidedStructuralExteriorCount=2/.test(supportSource)
    && /exteriorMat\.side=THREE\.DoubleSide/.test(supportSource)
    && /solidContinuousPreview=\s*rootClosureTriangles\.length===N\*2/.test(
      supportSource,
    ),
  "integrated panel support can still disappear/open when inspected below",
);
check(
  /closedStructuralWing=true/.test(cornerSource)
    && /corner-mount-root-spine/.test(cornerSource)
    && /closedStructuralRootSpine=true/.test(cornerSource)
    && /rootSpineMeshes\.length===2/.test(cornerSource)
    && /buriedBooleanHelper=true/.test(cornerSource)
    && /buriedBooleanHelpersHidden=/.test(cornerSource)
    && /visibleExteriorBodyCount=1/.test(cornerSource),
  "corner plate preview still uses open wing sheets without its exact root spines",
);
check(
  /relievedSupportVisual\([\s\S]*previewInset,false,reliefRings\)/.test(
    integratedSource,
  )
    && /axisAnnularPlate\(bearingCenter,spec\.n,[\s\S]*bearingMat\|\|mat/.test(
      integratedSource,
    )
    && /structuralPlate=true/.test(integratedSource)
    && /tapClipProtected=true/.test(integratedSource),
  "integrated panel preview does not transfer its bearing face to one protected structural plate",
);
check(
  /tapEnabled=role!=='driver-gasket'/.test(shell)
    && /applyTapBooleanClip\(bearingMat,P,'driver-bearing-face',[\s\S]*true,di\)/
      .test(shell)
    && /panelRelievedLand\(P,d,landMat,mountSpecs\[di\],bearingMat\)/
      .test(shell),
  "bearing preview does not consume the canonical exact tap-tool manifest",
);
check(
  /reliefEnabled=role==='corner-structural-preboolean'/.test(shell)
    && /cavityStations/.test(shell)
    && /mehReliefRadius=mix\(/.test(shell)
    && /coneReliefClipCount:reliefCount/.test(shell),
  "pre-Boolean corner wing/spine preview does not subtract the canonical cone relief",
);
check(
  /wingMat=mat\.clone\(\)/.test(cornerSource)
    && /applyTapBooleanClip\(wingMat,P,'corner-structural-preboolean'/.test(
      cornerSource,
    )
    && /clippedPreviewSurface\(P,triangles,0,wingMat/.test(cornerSource)
    && /clippedPreviewSurface\(P,spineTriangles,0,wingMat/.test(cornerSource),
  "cone-relief clipping is not isolated to the pre-Boolean corner primitives",
);
check(
  /conformalProfileDisc\(/.test(cartridgeSource)
    && /rootCapCount=2/.test(cartridgeSource)
    && /frontChamberClosed=true/.test(cartridgeSource),
  "panel cartridge preview is still an open hollow ring",
);
check(
  /panelCartridgeVisual\(P,d,spec,wall,adapterMat/.test(shell),
  "panel cartridge renderer does not use the closed registered cell",
);
check(
  /conformalJointGasketVisual\(P,d,spec/.test(shell),
  "panel cartridge joint is not represented by the conformal gasket",
);

const add = (a, b, scale = 1) => (
  a.map((value, index) => value + b[index] * scale)
);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const mix = (a, b, amount) => add(a, sub(b, a), amount);

for (const construction of ["integrated", "cartridge"]) {
  const plan = engine.twoWayPlan({
    ...state,
    driverCellConstruction: construction,
  });
  const field = engine.twoWaySolidField(plan, construction === "cartridge");
  const audit = engine.assemblyAudit(plan, field);
  const prefix = `${construction} user-state`;

  check(
    plan.st.profileLaw.family === "classicOS",
    `${prefix}: Classic OS profile was not solved`,
  );
  check(
    audit.rows.find((row) => (
      row.name === "tap cutters connect horn air to front chambers"
    ))?.pass === true,
    `${prefix}: exact tap cutter does not connect horn air to the chamber`,
  );

  if (construction === "integrated") {
    const driver = plan.drivers[0];
    const normal = driver.mountN;
    const root = add(
      driver.surface,
      normal,
      -Math.min(0.002, driver.panelT * 0.20),
    );
    let minimum = Infinity;
    for (let index = 0; index < 720; index += 1) {
      const angle = index / 720 * Math.PI * 2;
      const point = add(
        add(root, driver.flow, Math.cos(angle) * driver.outerR),
        driver.cross,
        Math.sin(angle) * driver.outerR,
      );
      minimum = Math.min(minimum, engine.twoWaySdCross(plan, ...point, 0));
      if (engine.twoWaySdCross(plan, ...point, 0) < -0.003) {
        check(
          field(point) > -1e-8,
          `${prefix}: exact plate was not clipped out of acoustic horn air`,
        );
        break;
      }
    }
    check(
      minimum < -0.003,
      `${prefix}: regression state no longer exercises the curved-profile leak`,
    );
  } else {
    check(
      plan.retention?.active === true
        && plan.retention?.pass === true
        && plan.retention?.totalScrews === plan.drivers.length * 2,
      `${prefix}: two owned M4 clamps per cartridge are not retained`,
    );
    for (const driver of plan.drivers) {
      const wallContact = add(driver.surface, driver.wallN, plan.S.wallT);
      const jointGap = dot(sub(driver.cartridgeStart, wallContact), driver.mountN);
      check(
        Math.abs(jointGap - plan.gasketGap) < 1e-9,
        `${prefix}/driver-${driver.index}: cartridge is not registered across its gasket`,
      );
      check(
        field(mix(driver.cartridgeStart, driver.cavInner, 0.5)) < -0.001,
        `${prefix}/driver-${driver.index}: chamber root is not sealed material`,
      );
      for (const port of driver.ports) {
        const tool = field.tapTools?.[driver.index]?.[port.index];
        const sections = tool?.kind === "swept-aperture"
          ? tool.sections : tool ? [tool] : [];
        check(
          sections.length > 0,
          `${prefix}/driver-${driver.index}/tap-${port.index}: cutter missing`,
        );
        for (const section of sections) {
          for (const amount of [0.08, 0.25, 0.5, 0.75, 0.92]) {
            check(
              field(mix(section.a, section.b, amount)) > -1e-8,
              `${prefix}/driver-${driver.index}/tap-${port.index}: lumen blocked`,
            );
          }
        }
      }
    }
    check(
      plan.retention.drivers.every((driver) => driver.tools.every((tool) => (
        tool.ownership?.horn?.includes("hornPocket")
        && tool.ownership?.module?.includes("boss")
        && tool.ownership?.module?.includes("moduleBore")
        && tool.ownership?.module?.includes("counterbore")
      ))),
      `${prefix}: M4 retention ownership is incomplete`,
    );
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log(
  `PANEL PROFILE MOUNT PREVIEW PASS - ${assertions} assertions across `
    + "the integrated and cartridge NW10 Classic OS user state",
);
