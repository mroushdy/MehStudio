import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

test("one-way profile options are preflighted by the canonical station solver", () => {
  assert.match(
    shell,
    /function profileLawCandidateStatus\(family,changes=\{\},state=S\)/,
  );
  assert.match(
    shell,
    /const candidate=\{\.\.\.state,\.\.\.changes,profileLaw:family\},\s*st=MEH2\.stations\(candidate\)/,
  );
  assert.match(
    shell,
    /option\.disabled=state\.topo==='1way'&&!status\.ok/,
  );
  assert.match(
    shell,
    /unavailable for this coax/,
  );
});

test("an incompatible profile selection rolls back visibly before state mutation", () => {
  const profileBlock = shell.slice(
    shell.indexOf("{ const selector=document.getElementById('profileLaw')"),
  );
  const selectorHandler = profileBlock.match(
    /selector\.onchange=\(\)=>\{([\s\S]*?)\n\s*\};/,
  );
  assert.ok(selectorHandler, "profile-law selector handler");
  const body = selectorHandler[1];
  assert.match(body, /const status=profileLawCandidateStatus\(family\)/);
  assert.match(
    body,
    /if\(!status\.ok\)\{\s*exposeProfileLawRefusal\(status,selector\);\s*return;/,
  );
  assert.ok(
    body.indexOf("profileLawCandidateStatus") < body.indexOf("commit("),
    "canonical preflight must occur before committing profileLaw",
  );
  assert.match(
    shell,
    /if\(selector\)selector\.value=S\.profileLaw\|\|'conical'/,
  );
  assert.match(shell, /PROFILE OPTION REFUSED/);
  assert.match(shell, /lastRefusal:/);
});

test("one-way continuous law controls use the same preflight and restore old values", () => {
  assert.match(
    shell,
    /profileLawCandidateStatus\(\s*S\.profileLaw\|\|'conical',\{\[id\]:value\}\)/,
  );
  assert.match(
    shell,
    /if\(!status\.ok\)\{\s*setPairedNumericState\(id,S\[id\],false\);\s*exposeProfileLawRefusal\(status,selector\);\s*return;/,
  );
});

test("two-way profile choices remain available and unsupported identifiers fail closed", () => {
  assert.match(
    shell,
    /if\(state\.topo!=='1way'\)return \{ok:true,family,code:null,reason:null\}/,
  );
  assert.match(
    shell,
    /PROFILE_LAW_UNSUPPORTED/,
  );
  assert.doesNotMatch(
    shell,
    /profileLawCandidateStatus[\s\S]{0,1200}(?:fallback|substitut)/i,
  );
});
