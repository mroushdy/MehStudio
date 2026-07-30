import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const modulePath = path.join(appRoot, "threeway-controller.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const controllerModule = require(modulePath);
const stateContract = require(path.join(
  appRoot, "threeway-state-contract.js"));
const referenceCards = require(path.join(
  appRoot, "threeway-reference-cards.js"));

function successfulSolver() {
  return {
    async solveCandidate(request) {
      return {
        ok: true,
        schemaVersion: 2,
        requestId: request.requestId,
        revision: request.revision,
        inputHash: request.inputHash,
        analysisInputHash: request.analysisInputHash,
        solutionHash: `solution:${request.inputHash}`,
        readiness: {
          analysis: true,
          preview: false,
          manufacturing: false,
        },
        diagnostics: [],
        manufacturing: false,
        stl: false,
      };
    },
  };
}

function api(solver = successfulSolver()) {
  return controllerModule.createController({
    stateContract,
    referenceCards,
    solver,
  });
}

function start(controllerApi, cardId = "cosyne-t3-documented-topology") {
  const initial = controllerApi.createInitialState();
  const result = controllerApi.reduceController(initial, {
    type: controllerApi.actions.START_FROM_REFERENCE_CARD,
    cardId,
  });
  assert.equal(result.ok, true);
  return result.state;
}

function begin(
  controllerApi,
  state,
  requestId = "solve-001",
  analysisInput = {},
) {
  const result = controllerApi.reduceController(state, {
    type: controllerApi.actions.BEGIN_SOLVE,
    requestId,
    analysisInput,
  });
  assert.equal(result.ok, true);
  assert.ok(result.solveRequest);
  return result;
}

function resultFor(request, overrides = {}) {
  return {
    ok: true,
    schemaVersion: 2,
    requestId: request.requestId,
    revision: request.revision,
    inputHash: request.inputHash,
    analysisInputHash: request.analysisInputHash,
    solutionHash: `solution:${request.inputHash}`,
    diagnostics: [],
    manufacturing: false,
    stl: false,
    ...overrides,
  };
}

function receiveAction(controllerApi, request, resultOverrides = {},
  envelopeOverrides = {}) {
  return {
    type: controllerApi.actions.RECEIVE_SOLVE_RESULT,
    requestId: request.requestId,
    revision: request.revision,
    inputHash: request.inputHash,
    analysisInputHash: request.analysisInputHash,
    result: resultFor(request, resultOverrides),
    ...envelopeOverrides,
  };
}

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value))
    assertDeepFrozen(child, `${label}.${key}`);
}

function keysDeep(value, result = []) {
  if (Array.isArray(value)) {
    for (const item of value) keysDeep(item, result);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      result.push(key);
      keysDeep(child, result);
    }
  }
  return result;
}

test("controller exposes only the dedicated schema-2 storage channel", () => {
  assert.equal(controllerModule.version, 1);
  assert.equal(
    controllerModule.storageKey,
    "meh5_threeway_state_v2",
  );
  assert.equal(controllerModule.capabilities.twoWayStateImport, false);
  assert.equal(controllerModule.capabilities.domAccess, false);
  assert.equal(
    controllerModule.capabilities.implicitStorageGlobal,
    false,
  );
  assert.doesNotMatch(moduleSource, /\blocalStorage\b/);
  assert.doesNotMatch(moduleSource, /\bmeh5_state\b/);
  assert.deepEqual(
    [...moduleSource.matchAll(/require\('([^']+)'\)/g)]
      .map(match => match[1]),
    [
      "./threeway-state-contract.js",
      "./threeway-reference-cards.js",
    ],
  );
  assertDeepFrozen(controllerModule);
});

test("initial controller state is immutable, empty, and nonmanufacturing", () => {
  const initial = api().createInitialState();
  assert.equal(initial.storageKey, "meh5_threeway_state_v2");
  assert.equal(initial.candidate, null);
  assert.equal(initial.solve.status, "idle");
  assert.equal(initial.solve.analysisInputHash, null);
  assert.equal(initial.committed, null);
  assert.equal(initial.manufacturing, false);
  assert.equal(initial.stl, false);
  assertDeepFrozen(initial);
});

test("every reference card can start a new unsolved canonical candidate", () => {
  const controllerApi = api();
  for (const cardId of referenceCards.cardIds) {
    const result = controllerApi.reduceController(
      controllerApi.createInitialState(),
      {
        type: controllerApi.actions.START_FROM_REFERENCE_CARD,
        cardId,
      },
    );
    assert.equal(result.ok, true, cardId);
    assert.equal(result.state.candidate.state.schemaVersion, 2);
    assert.match(
      result.state.candidate.inputHash,
      /^meh3-state-v2\.topology-v1\n/,
    );
    assert.equal(result.state.solve.status, "unsolved");
    assert.equal(result.state.committed, null);
    assert.equal(result.state.manufacturing, false);
    assert.ok(Array.isArray(result.state.candidate.diagnostics));
    assertDeepFrozen(result);
  }
});

test("candidate replacement canonicalizes keyed arrays without mutating input", () => {
  const controllerApi = api();
  const original = start(controllerApi);
  const replacement = structuredClone(original.candidate.state);
  replacement.sources.reverse();
  replacement.entryStations.reverse();
  replacement.provenance.records.reverse();
  const before = structuredClone(replacement);
  const result = controllerApi.reduceController(original, {
    type: controllerApi.actions.REPLACE_CANDIDATE_STATE,
    state: replacement,
  });

  assert.deepEqual(replacement, before);
  assert.equal(result.ok, true);
  assert.equal(
    result.state.candidate.inputHash,
    original.candidate.inputHash,
  );
  assert.equal(
    result.state.candidateRevision,
    original.candidateRevision + 1,
  );
  assert.equal(result.state.solve.status, "unsolved");
  assertDeepFrozen(result);
});

test("allowlisted SI user intent is topology-aware and invalidates old solve state", () => {
  const controllerApi = api();
  let state = start(controllerApi);
  const first = controllerApi.reduceController(state, {
    type: controllerApi.actions.UPDATE_USER_INTENT,
    path: "intent.crossoversHz.lowMid",
    value: 320,
  });
  assert.equal(first.ok, true);
  state = first.state;
  const second = controllerApi.reduceController(state, {
    type: controllerApi.actions.UPDATE_USER_INTENT,
    path: "intent.crossoversHz.midHigh",
    value: 1250,
  });
  assert.equal(second.ok, true);
  assert.equal(
    second.state.candidate.state.intent.crossoversHz.lowMid,
    320,
  );
  assert.equal(
    second.state.candidate.state.intent.crossoversHz.midHigh,
    1250,
  );
  assert.notEqual(
    second.state.candidate.inputHash,
    state.candidate.inputHash,
  );
  assert.equal(second.state.solve.status, "unsolved");
  assert.equal(second.state.committed, null);

  const unitRefusal = controllerApi.reduceController(second.state, {
    type: controllerApi.actions.UPDATE_USER_INTENT,
    path: "intent.mouthLimitM.width",
    value: 0,
  });
  assert.equal(unitRefusal.ok, false);
  assert.equal(
    unitRefusal.code,
    controllerApi.failureCodes.USER_INTENT_INVALID,
  );
  const coercionRefusal = controllerApi.reduceController(second.state, {
    type: controllerApi.actions.UPDATE_USER_INTENT,
    path: "intent.mouthLimitM.width",
    value: "0.9",
  });
  assert.equal(coercionRefusal.ok, false);
  assert.equal(
    coercionRefusal.code,
    controllerApi.failureCodes.USER_INTENT_INVALID,
  );

  const orderRefusal = controllerApi.reduceController(second.state, {
    type: controllerApi.actions.UPDATE_USER_INTENT,
    path: "intent.crossoversHz.lowMid",
    value: 2000,
  });
  assert.equal(orderRefusal.ok, false);
  assert.equal(
    orderRefusal.code,
    controllerApi.failureCodes.USER_INTENT_INVALID,
  );
});

test("topology cannot be field-mutated and switching cards starts a clean unsolved graph", () => {
  const controllerApi = api();
  const t3 = start(controllerApi);
  const mutation = controllerApi.reduceController(t3, {
    type: controllerApi.actions.UPDATE_USER_INTENT,
    path: "topology.kind",
    value: "H3",
  });
  assert.equal(mutation.ok, false);
  assert.equal(
    mutation.code,
    controllerApi.failureCodes.USER_INTENT_NOT_ALLOWED,
  );
  assert.equal(mutation.state, t3);

  const switched = controllerApi.reduceController(t3, {
    type: controllerApi.actions.SWITCH_TOPOLOGY_CARD,
    cardId: "u15-h3-documented-topology",
  });
  assert.equal(switched.ok, true);
  assert.equal(switched.state.candidate.state.topology.kind, "H3");
  assert.equal(switched.state.candidate.source.cardId,
    "u15-h3-documented-topology");
  assert.equal(switched.state.solve.status, "unsolved");
  assert.equal(switched.state.committed, null);
  assert.notEqual(
    switched.state.candidate.inputHash,
    t3.candidate.inputHash,
  );
});

test("begin-solve emits a frozen request bound to request, revision, and normalized hash", () => {
  const controllerApi = api();
  const state = start(controllerApi);
  const started = begin(controllerApi, state);
  assert.equal(started.state.solve.status, "pending");
  assert.equal(started.solveRequest.requestId, "solve-001");
  assert.equal(
    started.solveRequest.revision,
    state.candidateRevision,
  );
  assert.equal(
    started.solveRequest.inputHash,
    state.candidate.inputHash,
  );
  assert.match(
    started.solveRequest.analysisInputHash,
    /^meh3-analysis-input-v1\n/,
  );
  assert.equal(
    started.state.solve.analysisInputHash,
    started.solveRequest.analysisInputHash,
  );
  assert.deepEqual(started.solveRequest.analysisInput, {});
  assert.deepEqual(
    started.solveRequest.state,
    state.candidate.state,
  );
  assert.equal("solution" in started.solveRequest, false);
  assertDeepFrozen(started.solveRequest);
});

test("begin-solve requires explicit finite plain-JSON physical analysis input", () => {
  const controllerApi = api();
  const state = start(controllerApi);
  const missing = controllerApi.reduceController(state, {
    type: controllerApi.actions.BEGIN_SOLVE,
    requestId: "missing-analysis",
  });
  assert.equal(missing.ok, false);
  assert.equal(
    missing.code,
    controllerApi.failureCodes.ANALYSIS_INPUT_INVALID,
  );

  const cycle = {};
  cycle.self = cycle;
  const sparse = [];
  sparse[1] = 1;
  const invalidValues = [
    { nested: Number.NaN },
    { nested: Number.POSITIVE_INFINITY },
    { nested: undefined },
    { nested: () => 1 },
    { nested: 1n },
    { nested: new Date(0) },
    { nested: cycle },
    { nested: sparse },
  ];
  for (const [index, analysisInput] of invalidValues.entries()) {
    const result = controllerApi.reduceController(state, {
      type: controllerApi.actions.BEGIN_SOLVE,
      requestId: `invalid-analysis-${index}`,
      analysisInput,
    });
    assert.equal(result.ok, false, `invalid fixture ${index}`);
    assert.equal(
      result.code,
      controllerApi.failureCodes.ANALYSIS_INPUT_INVALID,
      `invalid fixture ${index}`,
    );
    assert.equal(result.state, state);
  }
});

test("analysis input is cloned, deeply frozen, and hashed with canonical key ordering", () => {
  const controllerApi = api();
  const state = start(controllerApi);
  const supplied = {
    stations: [{ zM: 0.125, id: "ME1" }],
    driverRecords: {
      mid: { sdM2: 0.0132, count: 2 },
    },
    signedZero: -0,
  };
  const started = begin(
    controllerApi,
    state,
    "canonical-analysis",
    supplied,
  );
  const reordered = begin(
    controllerApi,
    state,
    "canonical-analysis-reordered",
    {
      signedZero: 0,
      driverRecords: {
        mid: { count: 2, sdM2: 0.0132 },
      },
      stations: [{ id: "ME1", zM: 0.125 }],
    },
  );
  assert.equal(
    started.solveRequest.analysisInputHash,
    reordered.solveRequest.analysisInputHash,
  );
  supplied.stations[0].zM = 99;
  supplied.driverRecords.mid.count = 99;
  assert.equal(started.solveRequest.analysisInput.stations[0].zM, 0.125);
  assert.equal(
    started.solveRequest.analysisInput.driverRecords.mid.count,
    2,
  );
  assert.equal(started.solveRequest.analysisInput.signedZero, 0);
  assertDeepFrozen(started.solveRequest.analysisInput);
});

test("analysis hash independently rejects stale physical intent under unchanged candidate state", () => {
  const controllerApi = api();
  const state = start(controllerApi);
  const first = begin(controllerApi, state, "physical-analysis", {
    driverRecords: [{ id: "LF-1", frameDiameterM: 0.3 }],
  });
  const second = begin(controllerApi, state, "physical-analysis", {
    driverRecords: [{ id: "LF-1", frameDiameterM: 0.31 }],
  });
  assert.equal(
    first.solveRequest.inputHash,
    second.solveRequest.inputHash,
  );
  assert.equal(
    first.solveRequest.revision,
    second.solveRequest.revision,
  );
  assert.notEqual(
    first.solveRequest.analysisInputHash,
    second.solveRequest.analysisInputHash,
  );
  const stale = controllerApi.reduceController(
    second.state,
    receiveAction(controllerApi, first.solveRequest),
  );
  assert.equal(stale.ok, false);
  assert.equal(
    stale.code,
    controllerApi.failureCodes.STALE_SOLVE_RESULT,
  );
});

test("injected asynchronous solver can move a matching transaction to ready", async () => {
  const controllerApi = api();
  const started = begin(controllerApi, start(controllerApi), "async-1");
  const action = await controllerApi.executeSolveRequest(
    started.solveRequest);
  const ready = controllerApi.reduceController(started.state, action);

  assert.equal(action.type,
    controllerApi.actions.RECEIVE_SOLVE_RESULT);
  assert.equal(ready.ok, true);
  assert.equal(ready.state.solve.status, "ready");
  assert.equal(
    ready.state.solve.result.inputHash,
    started.solveRequest.inputHash,
  );
  assert.equal(ready.state.committed, null);
  assert.equal(ready.state.manufacturing, false);
  assertDeepFrozen(ready);
});

test("request id, revision, candidate hash, and analysis hash each independently reject stale results", () => {
  const controllerApi = api();
  const started = begin(controllerApi, start(controllerApi));
  const cases = [
    receiveAction(
      controllerApi,
      started.solveRequest,
      { requestId: "old-request" },
      { requestId: "old-request" },
    ),
    receiveAction(
      controllerApi,
      started.solveRequest,
      { revision: started.solveRequest.revision - 1 },
      { revision: started.solveRequest.revision - 1 },
    ),
    receiveAction(
      controllerApi,
      started.solveRequest,
      { inputHash: "old-hash" },
      { inputHash: "old-hash" },
    ),
    receiveAction(
      controllerApi,
      started.solveRequest,
      { analysisInputHash: "old-analysis-hash" },
      { analysisInputHash: "old-analysis-hash" },
    ),
  ];
  for (const action of cases) {
    const result = controllerApi.reduceController(
      started.state, action);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      controllerApi.failureCodes.STALE_SOLVE_RESULT,
    );
    assert.equal(result.state, started.state);
  }
});

test("editing a pending candidate makes its eventual async result stale", () => {
  const controllerApi = api();
  const started = begin(controllerApi, start(controllerApi));
  const edited = controllerApi.reduceController(started.state, {
    type: controllerApi.actions.UPDATE_USER_INTENT,
    path: "intent.mouthLimitM.width",
    value: 0.9,
  });
  assert.equal(edited.ok, true);
  assert.equal(edited.state.solve.status, "unsolved");

  const late = controllerApi.reduceController(
    edited.state,
    receiveAction(controllerApi, started.solveRequest),
  );
  assert.equal(late.ok, false);
  assert.equal(
    late.code,
    controllerApi.failureCodes.STALE_SOLVE_RESULT,
  );
});

test("commit requires a ready transaction and rechecks all identity fields", () => {
  const controllerApi = api();
  const started = begin(controllerApi, start(controllerApi));
  const premature = controllerApi.reduceController(started.state, {
    type: controllerApi.actions.COMMIT_SOLUTION,
    requestId: started.solveRequest.requestId,
    revision: started.solveRequest.revision,
    inputHash: started.solveRequest.inputHash,
    analysisInputHash: started.solveRequest.analysisInputHash,
  });
  assert.equal(premature.ok, false);
  assert.equal(
    premature.code,
    controllerApi.failureCodes.COMMIT_NOT_READY,
  );

  const ready = controllerApi.reduceController(
    started.state,
    receiveAction(controllerApi, started.solveRequest),
  );
  assert.equal(ready.ok, true);
  const wrong = controllerApi.reduceController(ready.state, {
    type: controllerApi.actions.COMMIT_SOLUTION,
    requestId: "not-the-ready-request",
    revision: started.solveRequest.revision,
    inputHash: started.solveRequest.inputHash,
    analysisInputHash: started.solveRequest.analysisInputHash,
  });
  assert.equal(wrong.ok, false);
  assert.equal(
    wrong.code,
    controllerApi.failureCodes.STALE_SOLVE_RESULT,
  );

  const committed = controllerApi.reduceController(ready.state, {
    type: controllerApi.actions.COMMIT_SOLUTION,
    requestId: started.solveRequest.requestId,
    revision: started.solveRequest.revision,
    inputHash: started.solveRequest.inputHash,
    analysisInputHash: started.solveRequest.analysisInputHash,
  });
  assert.equal(committed.ok, true);
  assert.equal(committed.state.solve.status, "committed");
  assert.equal(
    committed.state.committed.inputHash,
    committed.state.candidate.inputHash,
  );
  assert.equal(
    committed.state.committed.analysisInputHash,
    started.solveRequest.analysisInputHash,
  );
  assert.deepEqual(
    committed.state.committed.inputState,
    committed.state.candidate.state,
  );
  assert.equal(committed.state.manufacturing, false);
  assertDeepFrozen(committed);
});

test("a mutated candidate cannot commit under its earlier normalized hash", () => {
  const controllerApi = api();
  const started = begin(controllerApi, start(controllerApi));
  const ready = controllerApi.reduceController(
    started.state,
    receiveAction(controllerApi, started.solveRequest),
  );
  assert.equal(ready.ok, true);

  const tampered = structuredClone(ready.state);
  tampered.candidate.state.intent.mouthLimitM = {
    width: 9,
    height: 9,
  };
  const result = controllerApi.reduceController(tampered, {
    type: controllerApi.actions.COMMIT_SOLUTION,
    requestId: started.solveRequest.requestId,
    revision: started.solveRequest.revision,
    inputHash: started.solveRequest.inputHash,
    analysisInputHash: started.solveRequest.analysisInputHash,
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    controllerApi.failureCodes.INPUT_HASH_MISMATCH,
  );
});

test("positive manufacturing, exact-solid, or STL claims are refused", () => {
  const controllerApi = api();
  const started = begin(controllerApi, start(controllerApi));
  const result = controllerApi.reduceController(
    started.state,
    receiveAction(controllerApi, started.solveRequest, {
      capabilities: {
        exactSolid: true,
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    controllerApi.failureCodes.MANUFACTURING_CLAIM_FORBIDDEN,
  );
  assert.equal(result.state.solve.status, "pending");
});

test("persistence writes only canonical schema-2 input through the exact external key", () => {
  const controllerApi = api();
  const started = begin(controllerApi, start(controllerApi));
  const ready = controllerApi.reduceController(
    started.state,
    receiveAction(controllerApi, started.solveRequest),
  );
  const committed = controllerApi.reduceController(ready.state, {
    type: controllerApi.actions.COMMIT_SOLUTION,
    requestId: started.solveRequest.requestId,
    revision: started.solveRequest.revision,
    inputHash: started.solveRequest.inputHash,
    analysisInputHash: started.solveRequest.analysisInputHash,
  });
  assert.equal(committed.ok, true);

  const record = controllerApi.createPersistenceRecord(
    committed.state);
  assert.equal(record.ok, true);
  assert.equal(record.key, "meh5_threeway_state_v2");
  const parsed = JSON.parse(record.value);
  assert.equal(parsed.schemaVersion, 2);
  assert.equal(
    stateContract.stateHashInput(parsed),
    committed.state.candidate.inputHash,
  );
  const forbidden = new Set([
    "capabilities",
    "readiness",
    "solution",
    "solutions",
    "solveResult",
    "mesh",
    "meshes",
    "manufacturing",
    "manufacturingPlan",
    "manufacturingValidated",
    "exactSolid",
    "stl",
    "analysisInput",
    "analysisInputHash",
  ]);
  assert.deepEqual(
    keysDeep(parsed).filter(key => forbidden.has(key)),
    [],
  );

  const writes = [];
  const persisted = controllerApi.persistCanonicalState(
    committed.state,
    {
      write(key, value) {
        writes.push({ key, value });
      },
    },
  );
  assert.equal(persisted.ok, true);
  assert.deepEqual(writes, [{
    key: "meh5_threeway_state_v2",
    value: record.value,
  }]);
});

test("restore accepts the state itself and refuses controller/solution wrappers", () => {
  const controllerApi = api();
  const sourceState = start(controllerApi);
  const record = controllerApi.createPersistenceRecord(sourceState);
  assert.equal(record.ok, true);

  const restored = controllerApi.reduceController(
    controllerApi.createInitialState(),
    {
      type: controllerApi.actions.RESTORE_SERIALIZED_STATE,
      value: record.value,
    },
  );
  assert.equal(restored.ok, true);
  assert.equal(
    restored.state.candidate.inputHash,
    sourceState.candidate.inputHash,
  );
  assert.equal(restored.state.solve.status, "unsolved");
  assert.equal(restored.state.committed, null);

  const wrapper = controllerApi.reduceController(
    controllerApi.createInitialState(),
    {
      type: controllerApi.actions.RESTORE_SERIALIZED_STATE,
      value: JSON.stringify({
        state: sourceState.candidate.state,
        solution: { ok: true },
      }),
    },
  );
  assert.equal(wrapper.ok, false);
  assert.equal(
    wrapper.code,
    controllerApi.failureCodes.PERSISTENCE_INVALID,
  );
});

test("solver failure is contained and a missing solver never becomes a success", async () => {
  const throwingApi = api({
    solveCandidate() {
      throw new Error("fixture failure");
    },
  });
  const started = begin(throwingApi, start(throwingApi));
  const action = await throwingApi.executeSolveRequest(
    started.solveRequest);
  const failed = throwingApi.reduceController(started.state, action);
  assert.equal(failed.ok, true);
  assert.equal(failed.state.solve.status, "failed");
  assert.equal(failed.state.committed, null);

  const missingApi = controllerModule.createController({
    stateContract,
    referenceCards,
  });
  const missingStarted = begin(missingApi, start(missingApi));
  const missingAction = await missingApi.executeSolveRequest(
    missingStarted.solveRequest);
  const missing = missingApi.reduceController(
    missingStarted.state,
    missingAction,
  );
  assert.equal(missing.ok, true);
  assert.equal(missing.state.solve.status, "failed");
  assert.ok(missing.state.solve.diagnostics.some(item =>
    item.code === missingApi.failureCodes.SOLVER_UNAVAILABLE));
});

test("execute-solve retains analysis identity and rejects request or solver hash mismatch", async () => {
  let solverCalls = 0;
  const controllerApi = api({
    solveCandidate(request) {
      solverCalls += 1;
      return {
        ...resultFor(request),
        analysisInputHash: "different-physical-analysis",
      };
    },
  });
  const started = begin(
    controllerApi,
    start(controllerApi),
    "analysis-execution",
    { packageLimitM: { width: 0.8, height: 0.7 } },
  );
  const solverMismatch = await controllerApi.executeSolveRequest(
    started.solveRequest,
  );
  assert.equal(solverCalls, 1);
  assert.equal(solverMismatch.result.ok, false);
  assert.equal(
    solverMismatch.analysisInputHash,
    started.solveRequest.analysisInputHash,
  );
  assert.equal(
    solverMismatch.result.analysisInputHash,
    started.solveRequest.analysisInputHash,
  );
  assert.ok(solverMismatch.result.diagnostics.some(item =>
    item.code === controllerApi.failureCodes.INPUT_HASH_MISMATCH));
  const failed = controllerApi.reduceController(
    started.state,
    solverMismatch,
  );
  assert.equal(failed.ok, true);
  assert.equal(failed.state.solve.status, "failed");

  const forged = {
    ...structuredClone(started.solveRequest),
    analysisInput: {
      packageLimitM: { width: 9, height: 9 },
    },
  };
  const requestMismatch = await controllerApi.executeSolveRequest(
    forged,
  );
  assert.equal(solverCalls, 1);
  assert.equal(requestMismatch.result.ok, false);
  assert.ok(requestMismatch.result.diagnostics.some(item =>
    item.code === controllerApi.failureCodes.INPUT_HASH_MISMATCH));
});

test("execute-solve adds the trusted request analysis hash for a legacy solver result that omits it", async () => {
  let receivedRequest = null;
  const controllerApi = api({
    solveCandidate(request) {
      receivedRequest = request;
      const result = resultFor(request);
      delete result.analysisInputHash;
      return result;
    },
  });
  const started = begin(
    controllerApi,
    start(controllerApi),
    "legacy-result-envelope",
    { driverRecords: [{ id: "MF-1", sdM2: 0.0132 }] },
  );
  const action = await controllerApi.executeSolveRequest(
    started.solveRequest,
  );
  assert.deepEqual(
    receivedRequest.analysisInput,
    started.solveRequest.analysisInput,
  );
  assert.equal(
    action.result.analysisInputHash,
    started.solveRequest.analysisInputHash,
  );
  const ready = controllerApi.reduceController(started.state, action);
  assert.equal(ready.ok, true);
  assert.equal(ready.state.solve.status, "ready");
});

test("browser UMD consumes only explicit state/card/solver globals", async () => {
  const context = { globalThis: {} };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(appRoot, "threeway-state-contract.js"), "utf8"),
    context,
  );
  vm.runInNewContext(
    fs.readFileSync(
      path.join(appRoot, "threeway-reference-cards.js"), "utf8"),
    context,
  );
  context.globalThis.MEH3ThreewaySolver = {
    solveCandidate(request) {
      return resultFor(request);
    },
  };
  vm.runInNewContext(moduleSource, context);
  const browserApi = context.globalThis.MEH3Controller;
  assert.equal(typeof browserApi.reduceController, "function");
  assert.equal(browserApi.storageKey, "meh5_threeway_state_v2");

  let state = browserApi.createInitialState();
  const card = browserApi.reduceController(state, {
    type: browserApi.actions.START_FROM_REFERENCE_CARD,
    cardId: "hinson-cx3-documented-topology",
  });
  assert.equal(card.ok, true);
  const started = browserApi.reduceController(card.state, {
    type: browserApi.actions.BEGIN_SOLVE,
    requestId: "browser-solve",
    analysisInput: {},
  });
  const action = await browserApi.executeSolveRequest(
    started.solveRequest);
  const ready = browserApi.reduceController(started.state, action);
  assert.equal(ready.ok, true);
  assert.equal(ready.state.solve.status, "ready");
});

test("manufacturing preflight remains unavailable after commit", () => {
  const controllerApi = api();
  const preflight = controllerApi.manufacturingPreflight("export-stl");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.available, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.stl, false);
});
