import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

const smooth = {
  ...engine.TWO_ARCH.radial.defaults,
  topo: "2way",
  twoArch: "radial",
  twoFamily: "radial",
  style: "smooth",
  throat: 1.4,
  td: 1.4,
  covH: 90,
  covV: 60,
  mouthW: 36,
  profileLaw: "conical",
  placeW: "auto",
};

test("section-family registry exposes only end-to-end exact families as supported", () => {
  assert.equal(engine.SECTION_FAMILY_SCHEMAS.ellipse.supported, true);
  assert.equal(engine.SECTION_FAMILY_SCHEMAS.ellipse.parameter, null);
  assert.equal(engine.SECTION_FAMILY_SCHEMAS.superellipse.supported, true);
  assert.equal(engine.SECTION_FAMILY_SCHEMAS.superellipse.parameter, "seN");
  assert.equal(engine.SECTION_FAMILY_SCHEMAS.roundedRectangle.supported, true);
  assert.equal(
    engine.SECTION_FAMILY_SCHEMAS.roundedRectangle.parameter,
    "sectionCornerRatio",
  );
  assert.deepEqual(
    engine.SECTION_FAMILY_SCHEMAS.roundedRectangle.parameterBounds,
    [0.05, 1],
  );
  assert.match(
    engine.SECTION_FAMILY_SCHEMAS.roundedRectangle.description,
    /straight sides.*circular corner arcs.*monotonically/i,
  );
  assert.equal(engine.sectionFamilySchema("invented"), null);
});

test("ellipse and Lamé select the exact station exponent without changing the meridian", () => {
  const ellipse = engine.stations({
    ...smooth,
    sectionFamily: "ellipse",
    seN: 9,
  });
  const lame = engine.stations({
    ...smooth,
    sectionFamily: "superellipse",
    seN: 6,
  });

  assert.ok(ellipse.pts.every((point) => point.n === 2));
  assert.equal(lame.pts.at(-1).n, 6);
  assert.ok(lame.pts.some((point) => point.n > 2 && point.n < 6));
  assert.deepEqual(
    ellipse.pts.map(({ x, a, b }) => [x, a, b]),
    lame.pts.map(({ x, a, b }) => [x, a, b]),
    "cross-section family must remain independent from the meridional profile"
  );

  const endEllipse = engine.surfPt(
    ellipse,
    ellipse.depth,
    Math.PI / 4
  );
  const endLame = engine.surfPt(lame, lame.depth, Math.PI / 4);
  assert.notDeepEqual(endEllipse, endLame);
  assert.equal(
    engine.effectiveSectionExponent({
      style: "angular",
      sectionFamily: "ellipse",
      seN: 10,
    }),
    12,
    "four-face angular topology must remain fixed and independent from smooth families"
  );

  const normalized = engine.adapt({
    ...smooth,
    sectionFamily: "ellipse",
    seN: 11,
  }, "sectionFamily");
  assert.equal(normalized.S2.seN, 2);
  assert.ok(normalized.ledger.some((entry) =>
    entry.knob === "seN" && /ellipse.*n=2/i.test(entry.why)
  ));
  const plan = engine.twoWayPlan({
    ...smooth,
    sectionFamily: "ellipse",
    seN: 11,
  }, { deferRetention: true, coarseRadialDiagnostics: true });
  assert.ok(plan.st.pts.every((point) => point.n === 2));
  assert.equal(plan.st.profileLaw.family, "conical");
});

test("the UI defaults to Lamé and admits the exact filleted rectangle control", () => {
  assert.match(
    shell,
    /sectionFamily:'superellipse',sectionLameN:6,sectionCornerRatio:0\.25,seN:12/
  );
  assert.match(
    shell,
    /SECTION_FAMILY_PERSISTED=new Set\(\['ellipse','superellipse','roundedRectangle'\]\)/
  );
  assert.match(
    shell,
    /<option value="roundedRectangle">rounded rectangle · exact circular fillets<\/option>/
  );
  assert.match(
    shell,
    /if\(parameter\)parameter\.style\.display=\s*smooth&&family==='superellipse'\?'':'none'/
  );
  assert.match(shell, /id="sectionCornerRatio" min="0\.05" max="1"/);
  assert.match(shell, /ONE LAW OWNS STATIONS \/ NORMALS \/ OFFSETS \/ PREVIEW \/ EXACT SOLID \/ EXPORT/);
  assert.match(
    shell,
    /if\(state\.sectionFamily==='ellipse'\)state\.seN=2/
  );

  const controlStart = shell.indexOf('<div id="sectionFamilyCtl">');
  const controlEnd = shell.indexOf('<label>MOUTH WIDTH', controlStart);
  assert.ok(controlStart >= 0 && controlEnd > controlStart);
  const control = shell.slice(controlStart, controlEnd);
  assert.doesNotMatch(control, /legacy/i);
  assert.doesNotMatch(control, /Klangfilm|WN/);
  assert.doesNotMatch(control, /deferred|pending exact/i);
});
