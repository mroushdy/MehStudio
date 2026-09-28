import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, "../..");
export const engine = require(path.join(projectRoot, "engine.js"));

function sourceState(source) {
  if (source.type === "build") {
    const build = (engine.BUILDS["2way"] || []).find((item) => item.key === source.key);
    if (!build) throw new Error(`unknown two-way build: ${source.key}`);
    return { ...build.s };
  }
  if (source.type === "family") {
    const family = engine.TWO_ARCH[source.key];
    if (!family) throw new Error(`unknown two-way family: ${source.key}`);
    return {
      ...family.defaults,
      topo: "2way",
      twoArch: source.key,
      twoFamily: source.key,
      twoDesign: `arch:${source.key}`
    };
  }
  throw new Error(`unknown fixture source type: ${source.type}`);
}

export function solveFixture(fixture) {
  const requestedState = {
    ...sourceState(fixture.source),
    ...(fixture.overrides || {})
  };
  const result = engine.solve(requestedState);
  return {
    fixture,
    requestedState,
    result,
    state: result.S,
    plan: result.ev?.plan,
    infeasible: Boolean(result.infeasible),
    failures: (result.ev?.rows || [])
      .filter((row) => row.st === "fail")
      .map((row) => ({
        section: row.sec,
        name: row.name,
        value: row.val
      }))
  };
}

export function fixtureMatchesScope(fixture, scope = {}) {
  if (scope.descriptor) return false;
  const tags = new Set(fixture.tags || []);
  if (scope.fixtureIds && !scope.fixtureIds.includes(fixture.id)) return false;
  if (scope.tagsAll && !scope.tagsAll.every((tag) => tags.has(tag))) return false;
  if (scope.tagsAny && !scope.tagsAny.some((tag) => tags.has(tag))) return false;
  return true;
}
