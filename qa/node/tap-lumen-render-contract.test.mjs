#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./case-loader.mjs";

const shell = fs.readFileSync(path.join(projectRoot, "shell.html"), "utf8");
const built = fs.readFileSync(path.join(projectRoot, "meh5.html"), "utf8");
const failures = [];
let assertions = 0;
const sources = [
  ["shell", shell],
  ...(process.env.MEH_SOURCE_ONLY === "1"
    ? []
    : [["assembled HTML", built]]),
];

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

for (const [name, source] of sources) {
  const clipStart = source.indexOf("function applyTapBooleanClip(");
  const clipEnd = source.indexOf("function meshObject(", clipStart);
  const clipSource = clipStart >= 0 && clipEnd > clipStart
    ? source.slice(clipStart, clipEnd)
    : "";
  const fastStart = source.indexOf("if(src.length===1){");
  const fastEnd = source.indexOf(
    "const pos=[],idx=[],ranges=[];",
    fastStart,
  );
  const fastSource = fastStart >= 0 && fastEnd > fastStart
    ? source.slice(fastStart, fastEnd)
    : "";
  check(/function sweptTapPassageVisual\(/.test(source),
    `${name}: swept-lumen renderer is missing`);
  check(/straightShortest=sections\.length===1/.test(clipSource)
      && /tool\.geometryMode==='straight-cone-normal'/.test(clipSource)
      && /\(straightShortest\?sections:\[\]\)/.test(clipSource),
    `${name}: horn Boolean drops the sole shortest cone-normal section`);
  check(!/function apertureSegmentSurface\(/.test(source),
    `${name}: obsolete per-segment tube renderer remains`);
  check(/singleContinuousSurface=true/.test(source),
    `${name}: swept lumen does not declare one continuous wall`);
  check(/wallMeshCount=1/.test(source),
    `${name}: swept lumen can render multiple overlapping wall meshes`);
  check(/sameSection=true/.test(source),
    `${name}: swept lumen does not preserve one canonical section`);
  check(/lipBackoff=Math\.max\([^;]+-Math\.min\(\.\.\.ringAxial\)/s.test(source),
    `${name}: tilted first ring is not kept behind the acoustic face`);
  check(/canonicalUnionBoundary=true/.test(source)
      && /canonicalUnionMethod='collinear-equivalent section surfaces GPU-trimmed by other exact sections'/.test(source),
    `${name}: swept preview is not identified as the exact finite-prism union boundary`);
  check(/exactCollinear=prior\.stage===section\.stage&&sameAperture/.test(source)
      && /prior\.canonicalSourceSections\+=section\.canonicalSourceSections/.test(source)
      && /canonicalUnionCoalescedSectionCount=/.test(source),
    `${name}: equivalent collinear cutter intervals are not coalesced exactly`);
  check(/otherSections=src\.filter\(\(item,index\)=>index!==owner\)/.test(source)
      && /applyTapBooleanClip\(material,fakePlan,'tap-union-boundary',\s*fakeTools,false,0\)/.test(source),
    `${name}: owner prism surfaces are not trimmed by every other canonical section`);
  check(/ranges\.forEach\(\(range,index\)=>bg\.addGroup\(range\.start,range\.count,index\)\)/.test(source)
      && /canonicalUnionMaterialCount=materials\.length/.test(source),
    `${name}: exact union owners do not retain deterministic geometry/material groups`);
  check(/frameCorrespondenceRequired=false/.test(source)
      && /globalOpenBoundaryCount=2/.test(source),
    `${name}: preview still claims a false ring correspondence or loses its two global openings`);
  check(/if\(src\.length===1\)\{/.test(source)
      && /singleSectionFastPath=true/.test(fastSource),
    `${name}: one-section shortest tools do not take their surgical render path`);
  check(/new THREE\.Mesh\(bg,sideMat\)/.test(fastSource)
      && /canonicalUnionShaderCount=0/.test(fastSource)
      && /canonicalUnionBooleanClipCount=0/.test(fastSource)
      && !/applyTapBooleanClip\(/.test(fastSource),
    `${name}: one-section shortest walls still clone/compile a Boolean owner material`);
  check(/internalCapCount=0/.test(fastSource)
      && /globalOpenBoundaryCount=2/.test(fastSource),
    `${name}: one-section shortest wall acquired an internal or global cap`);
  check(/canonicalCutterEndpoints=/.test(fastSource)
      && /renderEndpoints=/.test(fastSource)
      && /global acoustic-lip\/chamber-join visual trim only/.test(fastSource),
    `${name}: cutter overtravel is not distinguished from physical render endpoints`);
  check(/acousticProtrusionMm=0/.test(source),
    `${name}: renderer no longer certifies zero helper protrusion`);
  check(/noDriverPhysicalWall=view==='nodrv'/.test(source),
    `${name}: no-driver view does not distinguish its physical passage wall`);
  check(/tapWallMat=new THREE\.MeshPhongMaterial\(\{[^}]*transparent:false,[^}]*depthWrite:true,[^}]*side:THREE\.FrontSide/s.test(source),
    `${name}: no-driver passage boundary is translucent, non-depth-writing, or two-sided`);
  check(/physicalPassageBoundary=true/.test(source)
      && /productionAuthority='twoway-core solidField\.tapTools'/.test(source),
    `${name}: no-driver passage wall lacks exact-tool authority`);
  check(/noDriverPhysicalWall\|\|inspect\|\|view==='taps'\|\|focusedCell/.test(source)
      && !/inspect\|\|view==='taps'\|\|view==='full'/.test(source),
    `${name}: passage visibility no longer separates physical no-driver walls from diagnostic helpers`);
  check(!/P\.family==='radial'&&exactTap&&exactTap\.kind==='swept-aperture'/.test(source),
    `${name}: swept panel cutters still fall back to a fictitious straight tunnel`);
  check(/tapDepthMat=new THREE\.MeshPhongMaterial\(\{[^}]*transparent:true,[^}]*opacity:0\.46,[^}]*depthWrite:false/s.test(source),
    `${name}: lumen cue is opaque or writes a false internal surface`);
  check(/tapPassageVisual\(q,lumenInset,lumenRear,[\s\S]{0,200}null,'tap-interface'\)/.test(source),
    `${name}: straight lumen acquired a misleading terminal cap`);
  check(/tapPassageVisual\(q,lumenInset,lumenRear,tapWallMat,[\s\S]{0,80}null,'tap-passage-wall'\)/.test(source),
    `${name}: no-driver straight passage wall is missing or capped`);
  check(/tapPassageWallCount===panelMountQA\.expectedTapCount/.test(source)
      && /visibleTapPassageWallCount===\s*panelMountQA\.expectedTapCount/.test(source),
    `${name}: no-driver passage walls are not counted against every solved tap`);
  check(/function emptyCellTechnicalMaterial\(d\)/.test(source)
      && /new THREE\.MeshBasicMaterial\(\{[\s\S]{0,100}color:0x89928F/.test(source),
    `${name}: empty chamber is not isolated from facet-producing scene lights`);
  check(/twoSidedStructuralExteriorCount=2/.test(source)
      && /exteriorMat\.side=THREE\.DoubleSide/.test(source),
    `${name}: closed cell exterior can disappear from an underside camera`);
  check(/emptyCellDepthCueAuthority=\s*'twoway-core driverFace→cavInner cone-relief datums'/.test(source),
    `${name}: empty chamber depth cue lacks canonical datum ownership`);
  check(/mehCellDepth=clamp\(-dot\(/.test(source)
      && /diffuseColor\.rgb\*=mehCellShade/.test(source),
    `${name}: empty chamber has no smooth axial recess shading`);
  check(/replace\(\s*'#include <color_fragment>',\s*\[\s*'#include <color_fragment>'[\s\S]*?'diffuseColor\.rgb\*=mehCellShade;'/m.test(clipSource)
      && clipSource.indexOf("replace(\n      '#include <color_fragment>'")
        < clipSource.indexOf("'diffuseColor.rgb*=mehCellShade;'"),
    `${name}: empty-cell shading is not injected after diffuseColor is declared`);
  check(/emptyPanelCellsDepthCued/.test(source)
      && /root\.emptyCellDepthCue===true/.test(source),
    `${name}: no-driver QA does not require one depth-cued empty cell per driver`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log(`TAP LUMEN RENDER CONTRACT PASS - ${assertions} ${
  sources.length === 1 ? "source" : "source/assembled"
} assertions`);
