import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

test("generated scene subtrees release unique GPU resources before replacement", () => {
  assert.match(shell, /function disposeSceneSubtree\(root,reason\)/);
  assert.match(
    shell,
    /const geometries=new Set\(\),materials=new Set\(\),textures=new Set\(\)/,
  );
  assert.match(shell, /Array\.isArray\(object\.material\)/);
  assert.match(shell, /Object\.values\(material\.uniforms\|\|\{\}\)/);
  assert.match(shell, /for\(const texture of textures\)[\s\S]*texture\.dispose\(\)/);
  assert.match(shell, /for\(const material of materials\)[\s\S]*material\.dispose\(\)/);
  assert.match(shell, /for\(const geometry of geometries\)geometry\.dispose\(\)/);
  assert.match(shell, /root&&typeof root\.clear===['"]function['"]\)root\.clear\(\)/);
  assert.match(
    shell,
    /V3D\.scene\.remove\(oldGroup\)[\s\S]*disposeSceneSubtree\(oldGroup,['"]rebuild['"]\)/,
  );
  assert.match(shell, /disposeSceneSubtree\(oldGroup,['"]bug-pin-redraw['"]\)/);
  assert.match(
    shell,
    /disposeSceneSubtree\(oldProvisional,['"]bug-pin-provisional['"]\)/,
  );
});

test("renderer avoids retained framebuffers and context recovery stays diagnostic-only", () => {
  assert.match(
    shell,
    /new THREE\.WebGLRenderer\(\{\s*antialias:true,preserveDrawingBuffer:false\}\)/,
  );
  assert.doesNotMatch(shell, /preserveDrawingBuffer\s*:\s*true/);
  assert.match(shell, /addEventListener\(['"]webglcontextlost['"]/);
  assert.match(shell, /addEventListener\(['"]webglcontextrestored['"]/);
  assert.match(shell, /recovery:['"]diagnostic-only['"]/);

  const lostStart = shell.indexOf("cv.addEventListener('webglcontextlost'");
  const restoredStart = shell.indexOf("cv.addEventListener('webglcontextrestored'");
  const handlers = shell.slice(lostStart, shell.indexOf("let drag=null", restoredStart));
  assert.ok(lostStart >= 0 && restoredStart > lostStart);
  assert.doesNotMatch(handlers, /\brebuild\s*\(/);
  assert.doesNotMatch(handlers, /location\.reload|new THREE\.WebGLRenderer/);
});

test("streamed controls coalesce expensive geometry replacements", () => {
  assert.match(shell, /const GEOMETRY_REBUILD_DEBOUNCE_MS=110/);
  assert.match(shell, /function requestGeometryRebuild\(reason\)/);
  assert.match(
    shell,
    /geometryRebuildScheduler\.coalesced\+\+[\s\S]*setTimeout\(\(\)=>\{[\s\S]*rebuild\(\)/,
  );
  assert.match(shell, /const change=\(streamed=false\)=>/);
  assert.match(shell, /el\.oninput=\(\)=>change\(true\)/);
  assert.match(shell, /el\.onchange=\(\)=>change\(false\)/);
  assert.match(shell, /requestGeometryRebuild\('range '\+key\)/);
  assert.match(
    shell,
    /requestGeometryRebuild\('range wall thickness'\)/,
  );
  assert.match(
    shell,
    /requestGeometryRebuild\('custom driver '\+key\)/,
  );
});

test("closed tabs release their complete scene and WebGL context", () => {
  assert.match(shell, /function releaseRendererResources\(reason\)/);
  assert.match(
    shell,
    /disposeSceneSubtree\(oldGroup,reason\|\|['"]renderer-release['"]\)/,
  );
  assert.match(shell, /renderer\.dispose\(\)/);
  assert.match(shell, /renderer\.forceContextLoss\(\)/);
  assert.match(shell, /renderer\.renderLists\.dispose\(\)/);
  assert.match(shell, /twoPreviewReady=null/);
  assert.match(shell, /canvas\.parentNode\.removeChild\(canvas\)/);
  assert.match(
    shell,
    /addEventListener\(['"]pagehide['"],event=>\{[\s\S]*if\(!event\.persisted\)releaseRendererResources\(['"]pagehide['"]\)/,
  );
});

test("view materials are cached and orphaned originals are disposed", () => {
  assert.match(shell, /const viewMaterialReplacements=new Map\(\)/);
  assert.match(shell, /viewMaterialReplacements\.has\(source\)/);
  assert.match(shell, /const stillReferenced=new Set\(\)/);
  assert.match(
    shell,
    /if\(!stillReferenced\.has\(source\)&&typeof source\.dispose===['"]function['"]\)[\s\S]*source\.dispose\(\)/,
  );
});
