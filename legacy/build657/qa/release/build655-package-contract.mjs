#!/usr/bin/env node
/*
 * Final Build 655 archive integrity and exclusion gate.
 *
 * Run only after source QA, browser QA, assembly, the per-file hash manifest,
 * and the private ZIP have been frozen. This script never creates a package.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const applicationRoot = path.dirname(appRoot);
const build = 655;
const archiveName = `MEH-Studio-build${build}-private.zip`;
const archivePath = path.join(applicationRoot, archiveName);
const archiveHashPath = `${archivePath}.sha256`;
const sourceManifestName = `BUILD${build}-FILES.sha256`;
const sourceManifestPath = path.join(appRoot, sourceManifestName);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readRequired(file, label, encoding) {
  try {
    return await readFile(file, encoding);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`${label} is missing: ${file}`);
    }
    throw error;
  }
}

function normalizeManifestPath(value) {
  assert(value.startsWith("./"), `manifest path is not relative: ${value}`);
  const relative = value.slice(2);
  assert(relative && !relative.startsWith("/"), `invalid path: ${value}`);
  assert(!relative.includes("\\"), `backslash path is forbidden: ${value}`);
  const components = relative.split("/");
  assert(
    components.every(component => component && component !== "." &&
      component !== ".."),
    `unsafe path: ${value}`,
  );
  return components.join("/");
}

function forbiddenRelativePath(relative) {
  return (
    /(^|\/)(node_modules|artifacts|tmp|\.git)(\/|$)/.test(relative) ||
    /(^|\/)\.DS_Store$/.test(relative) ||
    /(^|\/)pins\.json$/.test(relative) ||
    /(^|\/)(?:\.env|\.npmrc|\.netrc)$/.test(relative) ||
    /\.zip(?:\.sha256)?$/i.test(relative)
  );
}

async function walk(root, relative = "") {
  const directory = path.join(root, relative);
  const names = await readdir(directory);
  const files = [];
  for (const name of names.sort()) {
    const childRelative = relative ? `${relative}/${name}` : name;
    const child = path.join(root, childRelative);
    const metadata = await lstat(child);
    assert(!metadata.isSymbolicLink(), `package contains symlink: ${childRelative}`);
    if (metadata.isDirectory()) {
      files.push(...await walk(root, childRelative));
    } else if (metadata.isFile()) {
      files.push(childRelative);
    } else {
      throw new Error(`package contains unsupported entry: ${childRelative}`);
    }
  }
  return files;
}

function looksText(buffer, relative) {
  if (buffer.length > 5_000_000) return false;
  if (buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0)) return false;
  return /\.(?:html?|m?js|cjs|json|md|txt|css|svg|csv|sha256|gitignore)$/i
    .test(relative);
}

const manifestText = await readRequired(
  sourceManifestPath,
  "Build 655 source hash manifest",
  "utf8",
);
const manifestRows = manifestText.split(/\r?\n/).filter(Boolean);
assert(manifestRows.length >= 100, "Build 655 source manifest is implausibly short");
const entries = new Map();
for (const [index, line] of manifestRows.entries()) {
  const match = line.match(/^([0-9a-f]{64})  (\.\/.+)$/);
  assert(match, `invalid source-manifest row ${index + 1}`);
  const relative = normalizeManifestPath(match[2]);
  assert(!entries.has(relative), `duplicate manifest path: ${relative}`);
  assert(
    relative !== sourceManifestName,
    `${sourceManifestName} must not hash itself`,
  );
  assert(
    !forbiddenRelativePath(relative),
    `forbidden source-manifest path: ${relative}`,
  );
  entries.set(relative, match[1]);
}

for (const required of [
  "shell.html",
  "profile-laws.js",
  "engine.js",
  "twoway-core.js",
  "assemble.js",
  "meh5.html",
  "SOURCE-MANIFEST.md",
  "BUILD655-HANDOFF.md",
  "threeway-family-catalog.js",
  "threeway-solid-geometry.js",
  "threeway-solid-intent.js",
  "threeway-solid-plan.js",
  "threeway-ui.js",
  "qa/BUILD655-QA-CHECKLIST.md",
  "qa/package.json",
  "qa/node/run.mjs",
  "qa/node/build655-source-contract.test.mjs",
  "qa/browser/build655-delivery-contract.mjs",
  "qa/release/build655-package-contract.mjs",
]) {
  assert(entries.has(required), `required source is absent from manifest: ${required}`);
}

for (const [relative, expectedHash] of entries) {
  const source = path.join(appRoot, relative);
  const metadata = await lstat(source);
  assert(metadata.isFile(), `manifest path is not a regular file: ${relative}`);
  assert(!metadata.isSymbolicLink(), `manifest path is a symlink: ${relative}`);
  const actualHash = sha256(await readFile(source));
  assert(
    actualHash === expectedHash,
    `source hash mismatch: ${relative}`,
  );
}

const archiveBuffer = await readRequired(
  archivePath,
  "Build 655 private archive",
);
const archiveHash = sha256(archiveBuffer);
const sidecar = (await readRequired(
  archiveHashPath,
  "Build 655 private archive hash sidecar",
  "utf8",
)).trim();
const sidecarMatch = sidecar.match(/^([0-9a-f]{64})  ([^\s]+)$/);
assert(sidecarMatch, "archive hash sidecar has an invalid format");
assert(sidecarMatch[2] === archiveName, "archive sidecar names the wrong file");
assert(sidecarMatch[1] === archiveHash, "archive SHA-256 does not match sidecar");

const listResult = spawnSync("unzip", ["-Z1", archivePath], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
assert(listResult.status === 0, listResult.stderr || "unzip list failed");
const archiveRows = listResult.stdout.split(/\r?\n/).filter(Boolean);
const archiveNames = new Set();
for (const entry of archiveRows) {
  assert(!archiveNames.has(entry), `archive has duplicate entry: ${entry}`);
  archiveNames.add(entry);
  assert(!entry.startsWith("/"), `archive has absolute path: ${entry}`);
  assert(!entry.includes("\\"), `archive has backslash path: ${entry}`);
  const normalizedEntry = entry.endsWith("/") ? entry.slice(0, -1) : entry;
  assert(
    normalizedEntry.split("/").every(component =>
      component && component !== "." && component !== ".."),
    `archive has unsafe path: ${entry}`,
  );
  assert(
    entry === "v5/" || entry.startsWith("v5/"),
    `archive entry escaped the v5 root: ${entry}`,
  );
  const relative = entry.slice(3).replace(/\/$/, "");
  if (relative) {
    assert(
      !forbiddenRelativePath(relative),
      `archive contains forbidden path: ${entry}`,
    );
  }
}
assert(
  archiveNames.has(`v5/${sourceManifestName}`),
  `archive omits ${sourceManifestName}`,
);

const temporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), "meh-build655-package-"),
);
try {
  const extractResult = spawnSync(
    "unzip",
    ["-qq", archivePath, "-d", temporaryRoot],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  assert(extractResult.status === 0, extractResult.stderr || "unzip failed");
  const extractedRoot = path.join(temporaryRoot, "v5");
  const packagedFiles = await walk(extractedRoot);
  const expectedPackagedFiles = new Set([
    ...entries.keys(),
    sourceManifestName,
  ]);
  assert(
    JSON.stringify([...packagedFiles].sort()) ===
      JSON.stringify([...expectedPackagedFiles].sort()),
    "private ZIP file set differs from the frozen source manifest domain",
  );
  const packagedManifest = await readFile(
    path.join(extractedRoot, sourceManifestName),
    "utf8",
  );
  assert(
    packagedManifest === manifestText,
    "ZIP contains a different source hash manifest",
  );
  for (const [relative, expectedHash] of entries) {
    const buffer = await readFile(path.join(extractedRoot, relative));
    assert(
      sha256(buffer) === expectedHash,
      `packaged file hash mismatch: ${relative}`,
    );
    if (looksText(buffer, relative)) {
      const text = buffer.toString("utf8");
      assert(
        !/\bghp_[A-Za-z0-9]{20,}\b/.test(text) &&
          !/\bgithub_pat_[A-Za-z0-9_]{20,}\b/.test(text),
        `GitHub credential pattern found in packaged text: ${relative}`,
      );
    }
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log(
  `BUILD-655 PACKAGE CONTRACT PASS — ${entries.size} source hashes, `
    + `${archiveRows.length} ZIP entries, ${archiveHash}`,
);
