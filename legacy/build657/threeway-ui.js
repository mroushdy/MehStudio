/*
 * MEH Studio v5 — schema-2 three-way browser workspace.
 *
 * This adapter is deliberately thin.  It presents provenance-bearing
 * reference intents, accepts explicit physical-analysis JSON, coordinates
 * the canonical controller transaction, and renders only a validated render
 * DTO.  It owns no acoustic, horn, station, aperture, chamber, passage,
 * mount, package, mesh, Boolean, or manufacturing math.
 */
(function attachThreeWayUi(root, factory) {
  "use strict";

  const api = factory(
    typeof module === "object" && module.exports
      ? {
          stateContract: require("./threeway-state-contract.js"),
          referenceCards: require("./threeway-reference-cards.js"),
          analysisPresets: require("./threeway-analysis-presets.js"),
          familyCatalog: require("./threeway-family-catalog.js"),
          quickStarts: require("./threeway-quick-starts.js"),
          controller: require("./threeway-controller.js"),
          renderModel: require("./threeway-render-model.js"),
          renderer: require("./threeway-renderer.js")
        }
      : {
          stateContract: root && root.MEH3StateContract,
          referenceCards: root && root.MEH3ReferenceCards,
          analysisPresets: root && root.MEH3AnalysisPresets,
          familyCatalog: root && root.MEH3FamilyCatalog,
          quickStarts: root && root.MEH3QuickStarts,
          controller: root && root.MEH3Controller,
          renderModel: root && root.MEH3RenderModel,
          renderer: root && root.MEH3Renderer
        }
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3UI = api;
}(typeof globalThis !== "undefined" ? globalThis : this,
function createThreeWayUiModule(DefaultDependencies) {
  "use strict";

  const VERSION = 1;
  const DEFAULT_CARD_ID = "cosyne-t3-documented-topology";
  const DEFAULT_QUICK_START_ID = "calculated-t3-study";
  const DEFAULT_FAMILY_PRESET_ID = "t3-calculated-111";
  const VIEW_IDS = Object.freeze([
    "full-assembly",
    "horn-only",
    "no-drivers-mount-assembly",
    "mounts-preview",
    "lumen-inspection",
    "section-cutaway",
    "package-bounds"
  ]);
  const VIEW_LABELS = Object.freeze({
    "full-assembly": "VIEW: FULL ASSEMBLY",
    "horn-only": "VIEW: HORN + TAP OPENINGS",
    "no-drivers-mount-assembly":
      "VIEW: PARTS / MOUNT HOSTS — NO DRIVERS (PREVIEW)",
    "mounts-preview": "VIEW: DRIVER MOUNTS + TAP BINDINGS",
    "lumen-inspection": "X-RAY: FLOW PATHS / ACOUSTIC LUMENS",
    "section-cutaway": "INSPECT: SECTION CUTAWAY",
    "package-bounds": "INSPECT: PACKAGE BOUNDS"
  });
  const VIEW_DESCRIPTIONS = deepFreeze({
    "full-assembly":
      "Complete analysis preview with LF/MF wall-driver assemblies, the HF " +
      "compression driver at the throat, adapters, flow paths, and horn. " +
      "Commercial driver CAD and fabrication authority are not claimed.",
    "horn-only":
      "Horn surface with canonical tap-opening overlays. Openings remain " +
      "inspection geometry until the exact Boolean kernel is admitted.",
    "no-drivers-mount-assembly":
      "Horn, full-face mount hosts, and tap bindings with drivers hidden. " +
      "This is a parts preview, not an exportable manufacturing mesh.",
    "mounts-preview":
      "Mount-host and tap-binding inspection with the horn retained for " +
      "orientation. Drivers are intentionally hidden.",
    "lumen-inspection":
      "Translucent canonical flow-path inspection meshes from each source " +
      "to its owned horn station.",
    "section-cutaway":
      "Technical section plane through the analysis assembly.",
    "package-bounds":
      "Solved package envelope only; it is a clearance diagnostic."
  });
  const REQUIRED_DEPENDENCIES = Object.freeze({
    stateContract: ["stableStringify"],
    referenceCards: [
      "listReferenceCards", "applyReferenceCard", "getReferenceCard"
    ],
    analysisPresets: ["buildAnalysisPreset"],
    familyCatalog: ["listPresets", "getPreset", "getFamily"],
    quickStarts: ["listQuickStarts", "buildQuickStart"],
    controller: [
      "createInitialState", "reduceController", "executeSolveRequest",
      "persistCanonicalState"
    ],
    renderModel: ["selectView"],
    renderer: ["createRenderer"]
  });
  const CAPABILITIES = deepFreeze({
    status: "schema-2-analysis-workspace",
    referenceIntents: true,
    guidedPhysicalControls: true,
    solverBackedQuickStarts: true,
    explicitPhysicalInput: true,
    canonicalSolveTransaction: true,
    deterministicAnalysisJson: true,
    validatedPreviewDto: true,
    legacyThreeWayStateRead: false,
    legacyThreeWayRenderer: false,
    hornresp: false,
    exactSolid: false,
    manufacturing: false,
    stl: false,
    reason:
      "The workspace exposes analysis and validated preview only; exact-solid export requires the separate kernel and fabrication gate."
  });
  const FAILURE_CODES = deepFreeze({
    DEPENDENCY_UNAVAILABLE: "THREEWAY_UI_DEPENDENCY_UNAVAILABLE",
    ENVIRONMENT_INVALID: "THREEWAY_UI_ENVIRONMENT_INVALID",
    DOM_UNAVAILABLE: "THREEWAY_UI_DOM_UNAVAILABLE",
    CARD_FAILED: "THREEWAY_UI_REFERENCE_CARD_FAILED",
    INPUT_JSON_INVALID: "THREEWAY_UI_INPUT_JSON_INVALID",
    INPUT_INCOMPLETE: "THREEWAY_UI_ANALYSIS_INPUT_INCOMPLETE",
    SOLVE_FAILED: "THREEWAY_UI_SOLVE_FAILED",
    COMMIT_FAILED: "THREEWAY_UI_COMMIT_FAILED",
    RENDER_UNAVAILABLE: "THREEWAY_UI_RENDER_UNAVAILABLE",
    DOWNLOAD_UNAVAILABLE: "THREEWAY_UI_DOWNLOAD_UNAVAILABLE"
  });
  const DEFAULT_EVIDENCE_INPUT = deepFreeze({
    driverRecords: [],
    sourceDriverRefs: {},
    analysisOverrides: {},
    requirePreview: true
  });
  const QUICK_START_CONTROLS = deepFreeze([
    {
      key: "mouthWidthM",
      id: "threewayMouthWidth",
      label: "Mouth width",
      unit: "mm",
      scale: 1000,
      minimum: 400,
      maximum: 1200,
      step: 5,
      value: 640,
      help: "Physical horizontal mouth size; the solver rebuilds the horn."
    },
    {
      key: "mouthHeightM",
      id: "threewayMouthHeight",
      label: "Mouth height",
      unit: "mm",
      scale: 1000,
      minimum: 400,
      maximum: 1200,
      step: 5,
      value: 640,
      help: "Physical vertical mouth size, independent of width."
    },
    {
      key: "depthM",
      id: "threewayDepth",
      label: "Horn depth",
      unit: "mm",
      scale: 1000,
      minimum: 300,
      maximum: 600,
      step: 5,
      value: 300,
      help: "Throat-to-mouth axial depth used by the profile solver."
    },
    {
      key: "coverageHorizontalDeg",
      id: "threewayCoverageH",
      label: "Coverage H",
      unit: "°",
      scale: 1,
      minimum: 40,
      maximum: 120,
      step: 1,
      value: 90,
      help: "Declared horizontal design target; not a verified polar claim."
    },
    {
      key: "coverageVerticalDeg",
      id: "threewayCoverageV",
      label: "Coverage V",
      unit: "°",
      scale: 1,
      minimum: 40,
      maximum: 120,
      step: 1,
      value: 90,
      help: "Declared vertical design target; not a verified polar claim."
    },
    {
      key: "lowMidHz",
      id: "threewayLowMid",
      label: "Low → mid crossover",
      unit: "Hz",
      scale: 1,
      minimum: 180,
      maximum: 700,
      step: 5,
      value: 300,
      help: "Design target used by station, aperture, and chamber checks."
    },
    {
      key: "midHighHz",
      id: "threewayMidHigh",
      label: "Mid → high crossover",
      unit: "Hz",
      scale: 1,
      minimum: 700,
      maximum: 2500,
      step: 10,
      value: 1200,
      help: "Design target used by the mid-band wall-entry checks."
    },
    {
      key: "crossSectionExponent",
      id: "threewaySectionExponent",
      label: "Section round ↔ square",
      unit: "n",
      scale: 1,
      minimum: 2,
      maximum: 12,
      step: 0.1,
      value: 2,
      help: "Lamé exponent: 2 is elliptical; larger values become squarer."
    }
  ]);

  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isRecord(value)) {
      const copy = {};
      for (const key of Object.keys(value)) copy[key] = cloneValue(value[key]);
      return copy;
    }
    if (typeof value === "number" && Object.is(value, -0)) return 0;
    return value;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function cleanString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function dependencyIssues(dependencies) {
    const issues = [];
    for (const [name, methods] of Object.entries(REQUIRED_DEPENDENCIES)) {
      const dependency = dependencies && dependencies[name];
      if (!dependency) {
        issues.push(name);
        continue;
      }
      for (const method of methods) {
        if (typeof dependency[method] !== "function") {
          issues.push(`${name}.${method}`);
        }
      }
    }
    return issues.sort();
  }

  function fail(code, message, details) {
    return deepFreeze({
      ok: false,
      code,
      message,
      details: isRecord(details) ? cloneValue(details) : {},
      manufacturing: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  function parseJsonObject(text) {
    let value;
    try {
      value = JSON.parse(String(text || ""));
    } catch (error) {
      return fail(
        FAILURE_CODES.INPUT_JSON_INVALID,
        "The explicit three-way input is not valid JSON.",
        { error: String(error && error.message || error) }
      );
    }
    if (!isRecord(value)) {
      return fail(
        FAILURE_CODES.INPUT_JSON_INVALID,
        "The explicit three-way input must be a JSON object.",
        {}
      );
    }
    return deepFreeze({
      ok: true,
      value: cloneValue(value),
      manufacturing: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  function summarizePresetResult(result) {
    if (!isRecord(result)) {
      return deepFreeze({
        tier: "fail",
        headline: "ANALYSIS INPUT NOT INSPECTED",
        lines: [],
        ready: false
      });
    }
    const missing = Array.isArray(result.missingInputs)
      ? result.missingInputs : [];
    if (result.ok === true && result.available === true &&
        isRecord(result.analysisInput)) {
      return deepFreeze({
        tier: "validated",
        headline: "EXPLICIT ANALYSIS PACKAGE READY",
        lines: [
          `${cleanString(result.topology) || "UNKNOWN"} · ${missing.length} missing inputs`,
          "Ready for the canonical schema-2 solver transaction."
        ],
        ready: true
      });
    }
    const lines = missing.slice(0, 18).map(item => {
      const path = cleanString(item && item.path) || "unresolved";
      const reason = cleanString(item && item.reason) ||
        "Explicit evidence is required.";
      return `${path} — ${reason}`;
    });
    if (missing.length > lines.length) {
      lines.push(`… ${missing.length - lines.length} more explicit inputs required`);
    }
    return deepFreeze({
      tier: result.ok === true ? "reference" : "fail",
      headline: result.ok === true
        ? `UNSOLVED REFERENCE INTENT · ${missing.length} INPUTS REQUIRED`
        : cleanString(result.code) || "ANALYSIS INPUT REFUSED",
      lines,
      ready: false
    });
  }

  function pairedControlMarkup(definition) {
    const id = definition.id;
    return [
      '<label class="paired-control" for="', id, 'Range">',
      definition.label,
      '<span class="val" id="', id, 'Readout">',
      definition.value, ' ', definition.unit, '</span>',
      '<span class="control-help">', definition.help, '</span>',
      '<span class="paired-inputs">',
      '<input type="range" id="', id, 'Range" min="',
      definition.minimum, '" max="', definition.maximum,
      '" step="', definition.step, '" value="', definition.value,
      '" aria-label="', definition.label, ' slider">',
      '<input type="number" id="', id, '" min="',
      definition.minimum, '" max="', definition.maximum,
      '" step="', definition.step, '" value="', definition.value,
      '" aria-label="', definition.label, ' exact value">',
      '</span></label>'
    ].join("");
  }

  function staticPanelMarkup() {
    return [
      '<div class="sect" style="margin-top:8px">THREE-WAY SCHEMA 2</div>',
      '<div class="evidence" data-tier="calculated">',
      '<b>CALCULATED STUDY — NOT A PRODUCT CLONE</b><br>',
      'Controls rebuild canonical physical input and run the actual station, ',
      'aperture, chamber, passage, mount, package, and preview pipeline.',
      '</div>',
      '<label for="threewayQuickStartSel">Three-way family / known architecture</label>',
      '<select id="threewayQuickStartSel"></select>',
      '<div class="compact-grid" id="threewayGuidedControls">',
      QUICK_START_CONTROLS.map(pairedControlMarkup).join(""),
      '<label for="threewayProfileFamily">Horn profile',
      '<span class="control-help">Axial expansion law; geometry is recalculated.</span>',
      '<select id="threewayProfileFamily">',
      '<option value="conical">Straight conical</option>',
      '<option value="classicOS">Classic oblate spheroidal (OS)</option>',
      '</select></label>',
      '<label for="threewaySectionFamily">Mouth section',
      '<span class="control-help">Ellipse or a squarer Lamé section.</span>',
      '<select id="threewaySectionFamily">',
      '<option value="ellipse">Ellipse / round</option>',
      '<option value="superellipse">Lamé superellipse</option>',
      '</select></label>',
      '</div>',
      '<div class="quick-start-grid" id="threewayPrimaryActions">',
      '<button id="threewaySolve" type="button"><b>UPDATE SOLVED PREVIEW</b>',
      '<span>Runs canonical physics and a hash-matched preview.</span></button>',
      '</div>',
      '<details class="advanced" id="threewayFamilyDetails">',
      '<summary>Family details and driver assumptions</summary>',
      '<div id="threewayQuickStartNote" class="evidence" ',
      'data-tier="calculated" style="white-space:pre-wrap"></div>',
      '<div class="sect">FAMILY DRIVER SET</div>',
      '<div class="threeway-driver-grid" id="threewayDriverSelection">',
      '<label for="threewayDriverLow">LOW-FREQUENCY DRIVER',
      '<select id="threewayDriverLow" disabled></select>',
      '<span id="threewayDriverLowStatus" class="control-help"></span>',
      '</label>',
      '<label for="threewayDriverMid">MID-FREQUENCY DRIVER',
      '<select id="threewayDriverMid" disabled></select>',
      '<span id="threewayDriverMidStatus" class="control-help"></span>',
      '</label>',
      '<label for="threewayDriverHigh">HIGH-FREQUENCY DRIVER',
      '<select id="threewayDriverHigh" disabled></select>',
      '<span id="threewayDriverHighStatus" class="control-help"></span>',
      '</label>',
      '</div>',
      '</details>',
      '<details class="advanced" id="threewayResearchDetails">',
      '<summary>Research reference / advanced input</summary>',
      '<label for="threewayCardSel">Research architecture card</label>',
      '<select id="threewayCardSel"></select>',
      '<div id="threewayCardNote" class="evidence" data-tier="reference"></div>',
      '<label for="threewayInputMode">Advanced input mode</label>',
      '<select id="threewayInputMode">',
      '<option value="quick-start">guided calculated quick start</option>',
      '<option value="preset-evidence">reference adapter · explicit evidence</option>',
      '<option value="canonical-analysis">direct canonical analysis input</option>',
      '</select>',
      '<details class="advanced" id="threewayInputDetails">',
      '<summary>Canonical physical input JSON</summary>',
      '<textarea id="threewayInputJson" spellcheck="false" ',
      'aria-label="Explicit three-way physical analysis input JSON" ',
      'style="width:100%;min-height:180px;margin-top:7px;resize:vertical;',
      'font:10px/1.45 var(--mono);border:1px solid var(--line);',
      'background:var(--paper);color:var(--ink);padding:7px"></textarea>',
      '</details>',
      '<div class="quick-start-grid" id="threewayActions">',
      '<button id="threewayInspect" type="button"><b>INSPECT INPUT</b>',
      '<span>List every unresolved physical field.</span></button>',
      '<button id="threewaySave" type="button"><b>SAVE SCHEMA-2 INTENT</b>',
      '<span>Writes only meh5_threeway_state_v2.</span></button>',
      '<button id="threewayDownloadState" type="button"><b>DOWNLOAD INPUT JSON</b>',
      '<span>Canonical state/evidence handoff.</span></button>',
      '<button id="threewayDownloadReport" type="button" disabled>',
      '<b>DOWNLOAD ANALYSIS REPORT</b>',
      '<span>Enabled only after a valid solve.</span></button>',
      '</div>',
      '</details>',
      '<div id="threewayV2Status" class="evidence" data-tier="reference" ',
      'role="status" aria-live="polite"></div>',
      '<div id="threewayViewNote" class="evidence" data-tier="derived"></div>',
      '<div id="threewayMissing" class="evidence" data-tier="derived" ',
      'style="white-space:pre-wrap;max-height:280px;overflow:auto"></div>',
      '<div class="evidence exact-refused">',
      'HORNRESP · EXACT MESH · STL ARE LOCKED FOR SCHEMA-2 THREE-WAY ',
      'UNTIL THEIR SEPARATE SOURCE-PINNED / EXACT-SOLID GATES PASS.</div>'
    ].join("");
  }

  function createRuntime(environment, dependencyOverrides) {
    const dependencies = Object.assign(
      {}, DefaultDependencies || {}, dependencyOverrides || {}
    );
    const issues = dependencyIssues(dependencies);
    if (issues.length) {
      return fail(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,
        "The schema-2 three-way UI dependency stack is incomplete.",
        { missing: issues }
      );
    }
    const env = isRecord(environment) ? environment : {};
    const documentRef = env.document;
    if (!documentRef ||
        typeof documentRef.getElementById !== "function" ||
        typeof documentRef.createElement !== "function") {
      return fail(
        FAILURE_CODES.DOM_UNAVAILABLE,
        "A DOM document must be injected into the three-way workspace.",
        {}
      );
    }
    const storage = env.storage || null;
    const controllerApi = dependencies.controller.createController
      ? dependencies.controller.createController()
      : dependencies.controller;
    let controllerState = controllerApi.createInitialState();
    let active = false;
    let mounted = false;
    let disposed = false;
    let lifecycleEpoch = 0;
    let requestCounter = 0;
    let lastInspection = null;
    let lastSolveResult = null;
    let rendererInstance = null;
    let selectedCardId = DEFAULT_CARD_ID;
    let selectedFamilyPresetId = DEFAULT_FAMILY_PRESET_ID;
    let selectedQuickStartId = DEFAULT_QUICK_START_ID;
    let selectedViewId = "full-assembly";
    let savedControls = null;
    let pendingWork = Promise.resolve(null);
    let autoSolveStarted = false;
    let inputChangeTimer = null;

    function element(id) {
      return documentRef.getElementById(id);
    }

    function setText(id, value) {
      const target = element(id);
      if (target) target.textContent = String(value == null ? "" : value);
    }

    function setStatus(tier, headline, lines) {
      const status = element("threewayV2Status");
      if (status) {
        status.className = tier === "fail"
          ? "evidence exact-refused" : "evidence";
        status.setAttribute(
          "data-tier",
          ["validated", "reference", "derived"].includes(tier)
            ? tier : "derived"
        );
        status.textContent = headline || "";
      }
      const missing = element("threewayMissing");
      if (missing) {
        const values = Array.isArray(lines) ? lines.filter(Boolean) : [];
        missing.style.display = values.length ? "" : "none";
        missing.textContent = values.join("\n");
      }
      const rows = element("rows");
      if (active && rows) {
        rows.replaceChildren();
        const title = documentRef.createElement("div");
        title.className = tier === "validated"
          ? "ok" : (tier === "fail" ? "fail" : "warn");
        title.textContent = headline || "";
        rows.appendChild(title);
        for (const line of (Array.isArray(lines) ? lines.slice(0, 12) : [])) {
          const row = documentRef.createElement("div");
          row.textContent = line;
          rows.appendChild(row);
        }
      }
    }

    function clearSolvedArtifacts() {
      lastSolveResult = null;
      const reportButton = element("threewayDownloadReport");
      if (reportButton) reportButton.disabled = true;
      if (rendererInstance && rendererInstance.ok === true) {
        rendererInstance.dispose();
        rendererInstance = null;
      }
    }

    function quickStartDefinitions() {
      const starts = dependencies.quickStarts.listQuickStarts();
      return Array.isArray(starts) ? starts : [];
    }

    function finiteControlValue(node, definition) {
      const numeric = Number(node && node.value);
      if (!Number.isFinite(numeric)) return definition.value;
      return Math.min(
        definition.maximum,
        Math.max(definition.minimum, numeric)
      );
    }

    function setControlValue(definition, physicalValue) {
      const displayed = Number.isFinite(physicalValue)
        ? physicalValue * definition.scale
        : definition.value;
      const value = Math.min(
        definition.maximum,
        Math.max(definition.minimum, displayed)
      );
      const range = element(`${definition.id}Range`);
      const number = element(definition.id);
      const readout = element(`${definition.id}Readout`);
      if (range) range.value = String(value);
      if (number) number.value = String(value);
      if (readout) {
        readout.textContent =
          `${Number(value.toFixed(4))} ${definition.unit}`;
      }
    }

    function guidedValues() {
      const values = {};
      for (const definition of QUICK_START_CONTROLS) {
        const displayed = finiteControlValue(
          element(definition.id), definition
        );
        values[definition.key] = displayed / definition.scale;
      }
      const profile = element("threewayProfileFamily");
      const section = element("threewaySectionFamily");
      values.surfaceLawFamily =
        cleanString(profile && profile.value) || "conical";
      values.crossSectionFamily =
        cleanString(section && section.value) || "ellipse";
      if (values.crossSectionFamily === "ellipse") {
        values.crossSectionExponent = 2;
      }
      return values;
    }

    function quickStartRecord(id) {
      return quickStartDefinitions().find(item =>
        item && item.id === id
      ) || null;
    }

    function familyPresetDefinitions() {
      const presets = dependencies.familyCatalog.listPresets();
      return Array.isArray(presets) ? presets : [];
    }

    function familyPresetRecord(id) {
      return dependencies.familyCatalog.getPreset(id) || null;
    }

    function familyForPreset(preset) {
      return preset && dependencies.familyCatalog.getFamily(
        preset.familyId
      ) || null;
    }

    function runnableFamilyPreset(preset) {
      return !!preset &&
        preset.id === DEFAULT_FAMILY_PRESET_ID &&
        preset.quickStartId === DEFAULT_QUICK_START_ID;
    }

    function catalogDriverLine(preset, band) {
      const values = isRecord(preset && preset.driverOptions) &&
        Array.isArray(preset.driverOptions[band])
        ? preset.driverOptions[band] : [];
      if (!values.length) {
        return `${band.toUpperCase()}: explicit verified driver record required`;
      }
      return `${band.toUpperCase()}: ${values.map(value =>
        `${Number.isInteger(value.count) ? value.count : "?"}× ` +
        `${cleanString(value.label) || cleanString(value.id) ||
          "documented identity"}`
      ).join(" / ")}`;
    }

    function updateQuickStartNote() {
      const preset = familyPresetRecord(selectedFamilyPresetId),
        family = familyForPreset(preset);
      const note = element("threewayQuickStartNote");
      if (!note) return;
      if (!preset || !family) {
        note.className = "evidence exact-refused";
        note.removeAttribute("data-tier");
        note.textContent = "THREE-WAY FAMILY PRESET UNAVAILABLE";
        return;
      }
      note.className = "evidence";
      note.setAttribute(
        "data-tier",
        runnableFamilyPreset(preset) ? "calculated" : "reference"
      );
      const groups = Array.isArray(preset.sourceGroups)
          ? preset.sourceGroups.map(group =>
              `${Number.isInteger(group.count) ? group.count : "?"}× ` +
              `${Array.isArray(group.bandIds)
                ? group.bandIds.join("+").toUpperCase() : "source"} ` +
              `${cleanString(group.role) || ""}`.trim()
            ).join(" · ")
          : "source groups unavailable",
        stations = Array.isArray(preset.stationIntent)
          ? preset.stationIntent.map(station =>
              `${station.order === null || station.order === undefined
                ? "external" : `#${station.order}`} ` +
              `${cleanString(station.kind) || "station"}`
            ).join(" · ")
          : "station intent unavailable",
        limitations = Array.isArray(preset.limitations)
          ? preset.limitations : [],
        mode = runnableFamilyPreset(preset)
          ? "RUNNABLE CALCULATED STUDY · guided solve/render available."
          : "REFERENCE ONLY · explicit verified driver records and complete " +
            "physical geometry are required before any solve/render.";
      note.textContent = [
        cleanString(preset.label) || preset.id,
        `TOPOLOGY ${cleanString(family.topology) || "unknown"} · ` +
          `${Number.isInteger(preset.physicalSourceCount)
            ? preset.physicalSourceCount : "unresolved"} physical sources · ` +
          `${cleanString(preset.classification) || "reference"}`,
        `SOURCE GROUPS: ${groups}`,
        `STATIONS: ${stations}`,
        catalogDriverLine(preset, "low"),
        catalogDriverLine(preset, "mid"),
        catalogDriverLine(preset, "high"),
        `PROVENANCE: ${(preset.provenanceRefs || []).join(" · ") ||
          "not declared"}`,
        `LIMITATIONS: ${limitations.length
          ? limitations.join(" · ") : "none declared"}`,
        mode,
        "EXACT SOLID / MANUFACTURING / STL: NOT AUTHORIZED"
      ].join("\n");
    }

    function populateCatalogDriverSelection(preset) {
      for (const band of ["low", "mid", "high"]) {
        const title = band[0].toUpperCase() + band.slice(1),
          selector = element(`threewayDriver${title}`),
          status = element(`threewayDriver${title}Status`),
          options = isRecord(preset && preset.driverOptions) &&
            Array.isArray(preset.driverOptions[band])
            ? preset.driverOptions[band] : [];
        if (!selector || !status) continue;
        selector.replaceChildren();
        for (const entry of options) {
          const option = documentRef.createElement("option");
          option.value = cleanString(entry.id) || "";
          option.textContent =
            cleanString(entry.label) || cleanString(entry.id) ||
            "documented identity";
          selector.appendChild(option);
        }
        selector.disabled = true;
        const fixed = options.find(entry =>
          /^documented-(original|build)/.test(
            cleanString(entry.status) || ""
          )
        ) || options[0] || null;
        if (!fixed) {
          const option = documentRef.createElement("option");
          option.value = "";
          option.textContent = "Explicit verified record required";
          selector.appendChild(option);
          selector.value = "";
          status.className = "control-help warn";
          status.textContent =
            "NO MODEL ID PROMOTED · supply a complete user-owned driver record.";
          continue;
        }
        selector.value = fixed.id;
        const identity = isRecord(fixed.recordIdentity)
          ? [fixed.recordIdentity.manufacturer, fixed.recordIdentity.model]
              .map(cleanString).filter(Boolean).join(" ")
          : "";
        status.className = runnableFamilyPreset(preset)
          ? "control-help ok" : "control-help warn";
        status.textContent = [
          cleanString(fixed.status) || "reference identity",
          Number.isInteger(fixed.count) ? `${fixed.count}×` : null,
          identity || cleanString(fixed.label),
          cleanString(fixed.compatibility),
          "fixed display only; no automatic substitution"
        ].filter(Boolean).join(" · ");
      }
    }

    function updateViewNote() {
      const note = element("threewayViewNote");
      if (!note) return;
      note.textContent =
        `${VIEW_LABELS[selectedViewId] || selectedViewId} · ` +
        (VIEW_DESCRIPTIONS[selectedViewId] ||
          "Validated analysis-preview view.");
    }

    function millimetres(value) {
      return Number.isFinite(value)
        ? `${Number((value * 1000).toFixed(1))} mm`
        : "dimension unavailable";
    }

    function populateDriverSelection(inspection) {
      const state = isRecord(inspection && inspection.state)
          ? inspection.state : null,
        analysisInput = isRecord(inspection && inspection.analysisInput)
          ? inspection.analysisInput : null,
        records = analysisInput && Array.isArray(
          analysisInput.driverRecords
        ) ? analysisInput.driverRecords : [],
        sources = state && Array.isArray(state.sources)
          ? state.sources : [];
      for (const band of ["low", "mid", "high"]) {
        const title = band[0].toUpperCase() + band.slice(1),
          selector = element(`threewayDriver${title}`),
          status = element(`threewayDriver${title}Status`);
        if (!selector || !status) continue;
        selector.replaceChildren();
        const source = sources.find(item =>
            isRecord(item) && Array.isArray(item.bandIds) &&
            item.bandIds.includes(band)
          ),
          compatible = records.filter(record =>
            isRecord(record) && Array.isArray(record.bandIds) &&
            record.bandIds.includes(band)
          ),
          selected = compatible.find(record =>
            source && record.id === source.driverRef
          ) || compatible[0] || null;
        for (const record of compatible) {
          const option = documentRef.createElement("option");
          option.value = cleanString(record.id) || "";
          option.textContent = [
            cleanString(record.id) || "unnamed record",
            cleanString(record.kind) || "unknown kind",
            millimetres(record.frame && record.frame.diameterM)
          ].join(" · ");
          selector.appendChild(option);
        }
        selector.disabled = true;
        if (!selected) {
          const option = documentRef.createElement("option");
          option.value = "";
          option.textContent = "No compatible resolved record";
          selector.appendChild(option);
          selector.value = "";
          status.textContent =
            "UNAVAILABLE · this family has no source-owned compatible record.";
          status.className = "control-help fail";
          continue;
        }
        selector.value = selected.id;
        const output = Array.isArray(selected.outputs)
          ? selected.outputs.find(item =>
              isRecord(item) && Array.isArray(item.bandIds) &&
              item.bandIds.includes(band)
            )
          : null;
        const sourceBound = !!source &&
          cleanString(source.driverRef) === cleanString(selected.id);
        status.className = sourceBound
          ? "control-help ok" : "control-help warn";
        status.textContent = [
          sourceBound ? "COMPATIBLE / FAMILY-BOUND" : "RECORD NOT SOURCE-BOUND",
          `${cleanString(selected.kind) || "driver"} frame ` +
            `${millimetres(selected.frame && selected.frame.diameterM)} Ø × ` +
            `${millimetres(selected.frame && selected.frame.depthM)} deep`,
          output
            ? `${cleanString(output.kind) || "output"} · ` +
              `${cleanString(output.id) || "unnamed output"}`
            : "no compatible declared output",
          "fixed by this family; advanced records require a new validated family"
        ].join(" · ");
      }
    }

    function applyQuickStartDefaults(record) {
      const defaults = isRecord(record && record.defaults)
        ? record.defaults
        : (isRecord(record && record.controls) ? record.controls : {});
      for (const definition of QUICK_START_CONTROLS) {
        setControlValue(definition, Number.isFinite(defaults[definition.key])
          ? defaults[definition.key] : definition.value / definition.scale);
      }
      const profile = element("threewayProfileFamily");
      if (profile) {
        profile.value = cleanString(defaults.surfaceLawFamily) || "conical";
      }
      const section = element("threewaySectionFamily");
      if (section) {
        section.value =
          cleanString(defaults.crossSectionFamily) || "ellipse";
      }
      updateSectionControls();
    }

    function setGuidedPresetAvailability(preset) {
      const enabled = runnableFamilyPreset(preset);
      for (const definition of QUICK_START_CONTROLS) {
        const range = element(`${definition.id}Range`);
        const number = element(definition.id);
        if (range) range.disabled = !enabled;
        if (number) number.disabled = !enabled;
      }
      for (const id of [
        "threewayProfileFamily", "threewaySectionFamily"
      ]) {
        const control = element(id);
        if (control) control.disabled = !enabled;
      }
      const solveButton = element("threewaySolve");
      if (solveButton) {
        solveButton.disabled = !enabled;
        solveButton.title = enabled
          ? "Run the canonical calculated-study solver."
          : "Reference families require complete explicit driver records " +
            "and physical geometry before a solver transaction exists.";
      }
      if (enabled) updateSectionControls();
    }

    function populateQuickStarts() {
      const selector = element("threewayQuickStartSel");
      if (!selector) return;
      selector.replaceChildren();
      for (const preset of familyPresetDefinitions()) {
        if (!preset || !cleanString(preset.id) ||
            preset.selectable !== true) continue;
        const option = documentRef.createElement("option");
        option.value = preset.id;
        option.textContent =
          cleanString(preset.label) || preset.id;
        selector.appendChild(option);
      }
      if ([...selector.options].some(option =>
        option.value === selectedFamilyPresetId
      )) {
        selector.value = selectedFamilyPresetId;
      } else if (selector.options.length) {
        selectedFamilyPresetId = selector.options[0].value;
        selector.value = selectedFamilyPresetId;
      }
      const preset = familyPresetRecord(selectedFamilyPresetId);
      selectedQuickStartId = runnableFamilyPreset(preset)
        ? preset.quickStartId : null;
      if (selectedQuickStartId) {
        applyQuickStartDefaults(quickStartRecord(selectedQuickStartId));
      }
      updateQuickStartNote();
      populateCatalogDriverSelection(preset);
      setGuidedPresetAvailability(preset);
      if (runnableFamilyPreset(preset)) {
        const preview = buildGuidedQuickStart();
        if (preview && preview.ok === true) populateDriverSelection(preview);
      }
    }

    function updateSectionControls() {
      const section = element("threewaySectionFamily");
      const enabled = runnableFamilyPreset(
        familyPresetRecord(selectedFamilyPresetId)
      ) && !!section && section.value === "superellipse";
      const definition = QUICK_START_CONTROLS.find(item =>
        item.key === "crossSectionExponent"
      );
      if (!definition) return;
      const range = element(`${definition.id}Range`);
      const number = element(definition.id);
      if (range) range.disabled = !enabled;
      if (number) number.disabled = !enabled;
      if (!enabled) setControlValue(definition, 2);
    }

    function buildGuidedQuickStart() {
      const preset = familyPresetRecord(selectedFamilyPresetId);
      if (!runnableFamilyPreset(preset) ||
          selectedQuickStartId !== preset.quickStartId) {
        return fail(
          FAILURE_CODES.INPUT_INCOMPLETE,
          "The selected family is a reference architecture, not a runnable calculated quick start.",
          {
            familyPresetId: selectedFamilyPresetId,
            explicitDriverRecordsRequired: true,
            explicitGeometryRequired: true
          }
        );
      }
      let built;
      try {
        built = dependencies.quickStarts.buildQuickStart(
          selectedQuickStartId,
          guidedValues()
        );
      } catch (error) {
        return fail(
          FAILURE_CODES.INPUT_INCOMPLETE,
          String(error && error.message ||
            "The calculated quick start could not build canonical physical input."),
          {
            quickStartId: selectedQuickStartId,
            diagnostics: []
          }
        );
      }
      if (!built || built.ok === false ||
          !isRecord(built.state) || !isRecord(built.analysisInput)) {
        return fail(
          FAILURE_CODES.INPUT_INCOMPLETE,
          cleanString(built && built.message) ||
            "The calculated quick start did not return canonical physical input.",
          {
            quickStartId: selectedQuickStartId,
            diagnostics: built && built.diagnostics || []
          }
        );
      }
      return deepFreeze({
        ok: true,
        available: true,
        code: "THREEWAY_UI_CALCULATED_QUICK_START_READY",
        quickStartId: selectedQuickStartId,
        topology: cleanString(
          built.state.topology && built.state.topology.kind
        ),
        state: cloneValue(built.state),
        analysisInput: cloneValue(built.analysisInput),
        analysisInputDraft: cloneValue(built.analysisInput),
        missingInputs: [],
        readiness: {
          solverInput: true,
          preview: isRecord(built.analysisInput.render)
        },
        provenance: cloneValue(built.provenance || {}),
        manufacturing: false,
        stl: false,
        capabilities: CAPABILITIES
      });
    }

    function cardDefinitions() {
      const cards = dependencies.referenceCards.listReferenceCards();
      return Array.isArray(cards) ? cards : [];
    }

    function populateCards() {
      const selector = element("threewayCardSel");
      if (!selector) return;
      selector.replaceChildren();
      for (const card of cardDefinitions()) {
        const option = documentRef.createElement("option");
        option.value = card.id;
        option.textContent =
          `${card.topologyFamily} · ${card.title}`;
        selector.appendChild(option);
      }
      if ([...selector.options].some(option =>
        option.value === selectedCardId
      )) {
        selector.value = selectedCardId;
      } else if (selector.options.length) {
        selectedCardId = selector.options[0].value;
        selector.value = selectedCardId;
      }
    }

    function defaultInputText() {
      return JSON.stringify(DEFAULT_EVIDENCE_INPUT, null, 2);
    }

    function updateCardNote() {
      const card = dependencies.referenceCards.getReferenceCard(
        selectedCardId
      );
      const note = element("threewayCardNote");
      if (!note) return;
      if (!card) {
        note.className = "evidence exact-refused";
        note.removeAttribute("data-tier");
        note.textContent = "UNKNOWN REFERENCE CARD";
        return;
      }
      note.className = "evidence";
      note.setAttribute("data-tier", "reference");
      note.textContent =
        `${card.topologyFamily} · ${card.summary} ` +
        "REFERENCE INTENT ONLY — NO UNDOCUMENTED DIMENSIONS PROMOTED.";
    }

    function startCard(cardId, isSwitch) {
      const nextId = cleanString(cardId) || DEFAULT_CARD_ID;
      const transition = controllerApi.reduceController(controllerState, {
        type: isSwitch
          ? controllerApi.actions.SWITCH_TOPOLOGY_CARD
          : controllerApi.actions.START_FROM_REFERENCE_CARD,
        cardId: nextId
      });
      if (!transition || transition.ok !== true) {
        const messages = transition && Array.isArray(transition.diagnostics)
          ? transition.diagnostics.map(item =>
              cleanString(item.message) || cleanString(item.code)
            ).filter(Boolean)
          : [];
        setStatus(
          "fail", FAILURE_CODES.CARD_FAILED,
          messages.length ? messages : ["Reference intent could not be normalized."]
        );
        return false;
      }
      controllerState = transition.state;
      selectedCardId = nextId;
      lastInspection = null;
      clearSolvedArtifacts();
      const selector = element("threewayCardSel");
      if (selector) selector.value = nextId;
      const editor = element("threewayInputJson");
      if (editor) editor.value = defaultInputText();
      const reportButton = element("threewayDownloadReport");
      if (reportButton) reportButton.disabled = true;
      updateCardNote();
      inspectInput();
      return true;
    }

    function restoreStoredCandidate() {
      if (!storage || typeof storage.getItem !== "function") return false;
      let serialized = null;
      try {
        serialized = storage.getItem(controllerApi.storageKey);
      } catch (ignore) {
        return false;
      }
      if (!cleanString(serialized)) return false;
      const transition = controllerApi.reduceController(controllerState, {
        type: controllerApi.actions.RESTORE_SERIALIZED_STATE,
        value: serialized
      });
      if (!transition || transition.ok !== true) {
        return false;
      }
      controllerState = transition.state;
      const refs = controllerState.candidate &&
        controllerState.candidate.state &&
        controllerState.candidate.state.research &&
        controllerState.candidate.state.research.referenceCardIds;
      const restoredCard = Array.isArray(refs)
        ? refs.find(id => dependencies.referenceCards.getReferenceCard(id))
        : null;
      if (restoredCard) selectedCardId = restoredCard;
      return true;
    }

    function evidencePayload() {
      const editor = element("threewayInputJson");
      return parseJsonObject(editor ? editor.value : "");
    }

    function inspectInput() {
      if (!controllerState.candidate) {
        const result = fail(
          FAILURE_CODES.CARD_FAILED,
          "A normalized schema-2 candidate is required.",
          {}
        );
        setStatus("fail", result.code, [result.message]);
        return result;
      }
      const mode = element("threewayInputMode");
      if (!mode || mode.value === "quick-start") {
        const result = buildGuidedQuickStart();
        lastInspection = result;
        if (result.ok === true) {
          populateDriverSelection(result);
          const values = guidedValues();
          setStatus("derived", "CALCULATED T3 INPUT READY", [
            `${result.topology} · ${Math.round(values.mouthWidthM * 1000)} × ` +
              `${Math.round(values.mouthHeightM * 1000)} mm mouth · ` +
              `${Math.round(values.depthM * 1000)} mm deep`,
            `${values.surfaceLawFamily} profile · ` +
              `${values.crossSectionFamily} section`,
            "Select UPDATE SOLVED PREVIEW to rerun physics, or wait for automatic update."
          ]);
        } else {
          const diagnostics = result.details &&
            Array.isArray(result.details.diagnostics)
            ? result.details.diagnostics : [];
          setStatus(
            "fail", result.code,
            diagnostics.length
              ? diagnostics.slice(0, 18).map(item =>
                  `${item.code || "input"} — ${item.message || ""}`
                )
              : [result.message]
          );
        }
        return result;
      }
      const parsed = evidencePayload();
      if (!parsed.ok) {
        setStatus("fail", parsed.code, [parsed.message]);
        lastInspection = parsed;
        return parsed;
      }
      if (mode && mode.value === "canonical-analysis") {
        const wrapped = isRecord(parsed.value.state) ||
          isRecord(parsed.value.analysisInput);
        if (wrapped && (!isRecord(parsed.value.state) ||
            !isRecord(parsed.value.analysisInput))) {
          const result = fail(
            FAILURE_CODES.INPUT_JSON_INVALID,
            "A direct candidate wrapper requires both state and analysisInput objects.",
            {}
          );
          lastInspection = result;
          setStatus("fail", result.code, [result.message]);
          return result;
        }
        const analysisInput = wrapped
          ? parsed.value.analysisInput : parsed.value;
        const result = deepFreeze({
          ok: true,
          available: true,
          code: "THREEWAY_UI_DIRECT_ANALYSIS_INPUT",
          topology: wrapped
            ? cleanString(parsed.value.state.topology &&
                parsed.value.state.topology.kind)
            : controllerState.candidate.state.topology.kind,
          state: wrapped ? cloneValue(parsed.value.state) : null,
          analysisInput: cloneValue(analysisInput),
          analysisInputDraft: cloneValue(analysisInput),
          missingInputs: [],
          readiness: {
            solverInput: false,
            preview: isRecord(parsed.value.render)
          },
          manufacturing: false,
          stl: false,
          capabilities: CAPABILITIES
        });
        lastInspection = result;
        setStatus("reference", "DIRECT CANONICAL INPUT LOADED", [
          "Shape, state identity, and physics are not accepted until the canonical solver transaction passes.",
          "Manufacturing, exact mesh, STL, and Hornresp remain locked."
        ]);
        return result;
      }
      const payload = parsed.value;
      const result = dependencies.analysisPresets.buildAnalysisPreset({
        state: controllerState.candidate.state,
        driverRecords: Array.isArray(payload.driverRecords)
          ? payload.driverRecords : [],
        sourceDriverRefs: isRecord(payload.sourceDriverRefs)
          ? payload.sourceDriverRefs : {},
        analysisOverrides: isRecord(payload.analysisOverrides)
          ? payload.analysisOverrides : {},
        requirePreview: payload.requirePreview === true
      });
      lastInspection = result;
      const summary = summarizePresetResult(result);
      setStatus(summary.tier, summary.headline, summary.lines);
      return result;
    }

    function controlSnapshot() {
      const view = element("viewSel");
      const controls = ["bExact", "bStl", "bHrn"].map(id => {
        const node = element(id);
        return node ? {
          id,
          disabled: node.disabled,
          text: node.textContent,
          title: node.title
        } : null;
      }).filter(Boolean);
      return {
        viewHtml: view ? view.innerHTML : "",
        viewValue: view ? view.value : null,
        viewOnchange: view ? view.onchange : null,
        controls,
        badge: (() => {
          const badge = element("fabBadge");
          return badge ? {
            className: badge.className,
            text: badge.textContent,
            title: badge.title
          } : null;
        })()
      };
    }

    function installThreeWayControls() {
      if (!savedControls) savedControls = controlSnapshot();
      const view = element("viewSel");
      if (view) {
        /* The legacy selector handler writes V3D.view and calls rebuild().
           Detach it while schema 2 owns these topology-neutral view IDs. */
        view.onchange = null;
        view.replaceChildren();
        for (const id of VIEW_IDS) {
          const option = documentRef.createElement("option");
          option.value = id;
          option.textContent = VIEW_LABELS[id];
          view.appendChild(option);
        }
        view.value = selectedViewId;
      }
      updateViewNote();
      const labels = {
        bExact: "EXACT MESH LOCKED",
        bStl: "EXPORT STL LOCKED",
        bHrn: "HORNRESP UNAVAILABLE"
      };
      for (const [id, label] of Object.entries(labels)) {
        const control = element(id);
        if (!control) continue;
        control.disabled = true;
        control.setAttribute("aria-disabled", "true");
        control.textContent = label;
        control.title =
          "Schema-2 three-way analysis does not yet hold the separate export capability token.";
      }
      const badge = element("fabBadge");
      if (badge) {
        badge.className = "fail";
        badge.textContent =
          "ANALYSIS ONLY · EXACT KERNEL / FABRICATION GATE NOT ADMITTED";
      }
    }

    function restoreLegacyControls() {
      if (!savedControls) return;
      const view = element("viewSel");
      if (view) {
        view.innerHTML = savedControls.viewHtml;
        view.onchange = savedControls.viewOnchange;
        if (savedControls.viewValue != null) {
          view.value = savedControls.viewValue;
        }
      }
      for (const snapshot of savedControls.controls) {
        const control = element(snapshot.id);
        if (!control) continue;
        control.disabled = snapshot.disabled;
        if (snapshot.disabled) {
          control.setAttribute("aria-disabled", "true");
        } else {
          control.removeAttribute("aria-disabled");
        }
        control.textContent = snapshot.text;
        control.title = snapshot.title;
      }
      if (savedControls.badge) {
        const badge = element("fabBadge");
        if (badge) {
          badge.className = savedControls.badge.className;
          badge.textContent = savedControls.badge.text;
          badge.title = savedControls.badge.title;
        }
      }
      savedControls = null;
    }

    function ensureRenderer() {
      if (rendererInstance && rendererInstance.ok === true) {
        return rendererInstance;
      }
      if (!env.THREE || !env.scene ||
          typeof env.groupFactory !== "function") {
        return fail(
          FAILURE_CODES.RENDER_UNAVAILABLE,
          "The Three.js scene adapter is unavailable.",
          {}
        );
      }
      rendererInstance = dependencies.renderer.createRenderer({
        THREE: env.THREE,
        scene: env.scene,
        groupFactory: env.groupFactory
      });
      return rendererInstance;
    }

    function renderCurrentView() {
      if (!lastSolveResult || !lastSolveResult.renderModel) {
        return fail(
          FAILURE_CODES.RENDER_UNAVAILABLE,
          "The physics result has no explicit validated preview geometry.",
          {}
        );
      }
      const selection = dependencies.renderModel.selectView(
        lastSolveResult.renderModel, selectedViewId
      );
      if (!selection || selection.ok !== true) {
        return fail(
          FAILURE_CODES.RENDER_UNAVAILABLE,
          "The selected validated preview view is unavailable.",
          { selection }
        );
      }
      const adapter = ensureRenderer();
      if (!adapter || adapter.ok !== true) return adapter;
      /* Renderer preflight requires the caller to repeat the immutable render
         hash.  This is an intentional stale-view guard, not an optional
         argument: omitting it made every otherwise valid browser preview
         fail with THREEWAY_RENDERER_HASH_MISMATCH. */
      const rendered = adapter.renderView(selection, selection.renderHash);
      if (rendered && rendered.ok === true &&
          typeof env.onRender === "function") {
        env.onRender(rendered, selection);
      }
      return rendered;
    }

    function renderInventoryLine() {
      const items = lastSolveResult &&
        lastSolveResult.renderModel &&
        Array.isArray(lastSolveResult.renderModel.items)
        ? lastSolveResult.renderModel.items : [];
      if (!items.length) return null;
      const count = category =>
        items.filter(item => item && item.category === category).length;
      const wallDriverCount = new Set(items.filter(item =>
        item && item.category === "driver-frame" && item.instanceId
      ).map(item => item.instanceId)).size;
      const highDriverCount = items.filter(item =>
        item && item.category === "throat-interface" &&
        item.highDriverVisualRequired === true
      ).length;
      return [
        `${wallDriverCount} wall-driver inspection assembl` +
        `${wallDriverCount === 1 ? "y" : "ies"}`,
        `${highDriverCount} HF compression-driver inspection bod` +
        `${highDriverCount === 1 ? "y" : "ies"}`,
        `${count("mount-host")} full-face mount host` +
          (count("mount-host") === 1 ? "" : "s"),
        `${count("aperture")} tap opening` +
          (count("aperture") === 1 ? "" : "s"),
        `${count("lumen-inspection")} canonical flow path` +
          (count("lumen-inspection") === 1 ? "" : "s")
      ].join(" · ");
    }

    async function solve() {
      if (!active || disposed) {
        return fail(
          FAILURE_CODES.ENVIRONMENT_INVALID,
          "Activate the schema-2 three-way workspace before solving.",
          {}
        );
      }
      const inspection = inspectInput();
      if (!inspection || inspection.ok !== true ||
          !isRecord(inspection.analysisInput)) {
        const missing = inspection &&
          Array.isArray(inspection.missingInputs)
          ? inspection.missingInputs.map(item =>
              `${item.path} — ${item.reason}`
            )
          : [];
        setStatus(
          "fail", FAILURE_CODES.INPUT_INCOMPLETE,
          missing.length ? missing : [
            "Complete every explicit physical input before solving."
          ]
        );
        return fail(
          FAILURE_CODES.INPUT_INCOMPLETE,
          "The canonical solver input is incomplete.",
          { missingInputs: inspection && inspection.missingInputs || [] }
        );
      }
      if (isRecord(inspection.state)) {
        const replaced = controllerApi.reduceController(controllerState, {
          type: controllerApi.actions.REPLACE_CANDIDATE_STATE,
          state: inspection.state
        });
        if (!replaced || replaced.ok !== true ||
            !replaced.state || !replaced.state.candidate) {
          const diagnostics = replaced &&
            Array.isArray(replaced.diagnostics)
            ? replaced.diagnostics : [];
          const lines = diagnostics.map(item =>
            cleanString(item.message) || cleanString(item.code)
          ).filter(Boolean);
          setStatus(
            "fail", FAILURE_CODES.INPUT_INCOMPLETE,
            lines.length ? lines : [
              "The explicit source bindings could not replace the reference-only candidate."
            ]
          );
          return fail(
            FAILURE_CODES.INPUT_INCOMPLETE,
            "The explicit schema-2 candidate state was refused.",
            { diagnostics }
          );
        }
        controllerState = replaced.state;
      }
      clearSolvedArtifacts();
      requestCounter += 1;
      const requestId =
        `meh3-ui-${Date.now().toString(36)}-${requestCounter}`;
      const solveEpoch = lifecycleEpoch;
      const begun = controllerApi.reduceController(controllerState, {
        type: controllerApi.actions.BEGIN_SOLVE,
        requestId,
        analysisInput: inspection.analysisInput
      });
      if (!begun || begun.ok !== true || !begun.solveRequest) {
        const messages = begun && Array.isArray(begun.diagnostics)
          ? begun.diagnostics.map(item => item.message || item.code)
          : [];
        setStatus("fail", FAILURE_CODES.SOLVE_FAILED, messages);
        return fail(
          FAILURE_CODES.SOLVE_FAILED,
          "The canonical solve transaction could not begin.",
          { diagnostics: begun && begun.diagnostics || [] }
        );
      }
      controllerState = begun.state;
      setStatus("derived", "SOLVING CANONICAL THREE-WAY ANALYSIS…", []);
      const receiveAction = await controllerApi.executeSolveRequest(
        begun.solveRequest
      );
      if (disposed || !active || lifecycleEpoch !== solveEpoch) {
        return fail(
          FAILURE_CODES.SOLVE_FAILED,
          "The solve result was discarded because the three-way workspace is no longer active.",
          { requestId }
        );
      }
      const received = controllerApi.reduceController(
        controllerState, receiveAction
      );
      if (!received || received.ok !== true ||
          !received.state || received.state.solve.status !== "ready") {
        if (received && received.state) controllerState = received.state;
        const diagnostics = received && received.state &&
          received.state.solve && received.state.solve.diagnostics;
        const lines = Array.isArray(diagnostics)
          ? diagnostics.slice(0, 24).map(item =>
              `${item.phase || "solver"} · ${item.code || ""} — ${item.message || ""}`
            )
          : [];
        setStatus(
          "fail", FAILURE_CODES.SOLVE_FAILED,
          lines.length ? lines : ["The canonical solver refused the input."]
        );
        return fail(
          FAILURE_CODES.SOLVE_FAILED,
          "The canonical solver refused the explicit input.",
          { diagnostics: diagnostics || [] }
        );
      }
      controllerState = received.state;
      const identity = controllerState.solve;
      const committed = controllerApi.reduceController(controllerState, {
        type: controllerApi.actions.COMMIT_SOLUTION,
        requestId: identity.requestId,
        revision: identity.revision,
        inputHash: identity.inputHash,
        analysisInputHash: identity.analysisInputHash
      });
      if (!committed || committed.ok !== true) {
        setStatus(
          "fail", FAILURE_CODES.COMMIT_FAILED,
          ["The solved result failed transaction identity at commit."]
        );
        return fail(
          FAILURE_CODES.COMMIT_FAILED,
          "The solved result could not be committed.",
          { diagnostics: committed && committed.diagnostics || [] }
        );
      }
      controllerState = committed.state;
      lastSolveResult = controllerState.committed.solveResult;
      const reportButton = element("threewayDownloadReport");
      if (reportButton) {
        reportButton.disabled = !(
          lastSolveResult.analysisReport &&
          lastSolveResult.analysisReport.ok === true
        );
      }
      const rendered = renderCurrentView();
      const lines = [
        `${controllerState.candidate.state.topology.kind} · input and analysis hashes committed`,
        lastSolveResult.renderModel
          ? (rendered && rendered.ok === true
              ? `Validated preview: ${selectedViewId}`
              : "Physics solved; preview renderer refused this view.")
          : "Physics solved; no preview intents were supplied.",
        "Manufacturing: locked · STL: locked · Hornresp: locked"
      ];
      const inventory = renderInventoryLine();
      if (inventory) lines.splice(2, 0, inventory);
      const persisted = persist({ silent: true });
      lines.push(persisted && persisted.ok === true
        ? `${persisted.key} · canonical schema-2 intent saved`
        : "Canonical analysis solved, but browser persistence was refused.");
      setStatus("validated", "CANONICAL THREE-WAY ANALYSIS SOLVED", lines);
      return deepFreeze({
        ok: true,
        result: lastSolveResult,
        rendered: rendered && rendered.ok === true,
        persisted: persisted && persisted.ok === true,
        manufacturing: false,
        stl: false,
        capabilities: CAPABILITIES
      });
    }

    function persist(options) {
      const silent = !!(options && options.silent);
      if (!storage || typeof storage.setItem !== "function") {
        const result = fail(
          FAILURE_CODES.ENVIRONMENT_INVALID,
          "No explicit storage adapter is available.",
          {}
        );
        if (!silent) setStatus("fail", result.code, [result.message]);
        return result;
      }
      const adapter = {
        write(key, value) {
          storage.setItem(key, value);
        }
      };
      let result;
      try {
        result = controllerApi.persistCanonicalState(
          controllerState, adapter
        );
      } catch (error) {
        result = fail(
          FAILURE_CODES.ENVIRONMENT_INVALID,
          "Schema-2 storage rejected the canonical state.",
          { error: String(error && error.message || error) }
        );
      }
      if (!result || result.ok !== true) {
        if (!silent) {
          setStatus(
            "fail",
            result && result.code || FAILURE_CODES.ENVIRONMENT_INVALID,
            ["Schema-2 persistence was refused."]
          );
        }
        return result;
      }
      if (!silent) {
        setStatus(
          "validated", "SCHEMA-2 INTENT SAVED",
          [`${result.key} · no legacy three-way state was written.`]
        );
      }
      return result;
    }

    function download(filename, text) {
      if (typeof env.downloadText === "function") {
        return env.downloadText(filename, text, "application/json");
      }
      const view = documentRef.defaultView;
      if (!view || typeof view.Blob !== "function" ||
          !view.URL || typeof view.URL.createObjectURL !== "function") {
        return fail(
          FAILURE_CODES.DOWNLOAD_UNAVAILABLE,
          "The browser download adapter is unavailable.",
          {}
        );
      }
      const blob = new view.Blob([text], { type: "application/json" });
      const href = view.URL.createObjectURL(blob);
      const anchor = documentRef.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      anchor.style.display = "none";
      documentRef.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      view.setTimeout(() => view.URL.revokeObjectURL(href), 1000);
      return deepFreeze({
        ok: true,
        filename,
        manufacturing: false,
        stl: false,
        capabilities: CAPABILITIES
      });
    }

    function downloadState() {
      if (!controllerState.candidate) {
        return fail(
          FAILURE_CODES.DOWNLOAD_UNAVAILABLE,
          "No canonical candidate is available.",
          {}
        );
      }
      const payload = {
        schema: "MEH Studio three-way analysis handoff v1",
        build: Number(env.build) || null,
        referenceCardId: selectedCardId,
        familyPresetId: selectedFamilyPresetId,
        quickStartId: (element("threewayInputMode") &&
          element("threewayInputMode").value === "quick-start")
          ? selectedQuickStartId : null,
        state: controllerState.candidate.state,
        guidedControls: (element("threewayInputMode") &&
          element("threewayInputMode").value === "quick-start")
          ? guidedValues() : null,
        explicitInput: (!element("threewayInputMode") ||
          element("threewayInputMode").value !== "quick-start") &&
          evidencePayload().ok
          ? evidencePayload().value : null,
        manufacturing: false,
        stl: false
      };
      return download(
        `MEH3-${controllerState.candidate.state.topology.kind}-input.json`,
        `${dependencies.stateContract.stableStringify(payload)}\n`
      );
    }

    function downloadReport() {
      const report = lastSolveResult && lastSolveResult.analysisReport;
      if (!report || report.ok !== true ||
          !cleanString(report.text) || !cleanString(report.filename)) {
        return fail(
          FAILURE_CODES.DOWNLOAD_UNAVAILABLE,
          "A valid deterministic analysis report is not available.",
          {}
        );
      }
      return download(report.filename, report.text);
    }

    function scheduleSolvedPreview(delayMs) {
      if (!active || disposed) return Promise.resolve(null);
      const delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 180;
      const schedule = typeof env.setTimeout === "function"
        ? env.setTimeout
        : (documentRef.defaultView &&
            typeof documentRef.defaultView.setTimeout === "function"
          ? documentRef.defaultView.setTimeout.bind(documentRef.defaultView)
          : setTimeout);
      const cancel = typeof env.clearTimeout === "function"
        ? env.clearTimeout
        : (documentRef.defaultView &&
            typeof documentRef.defaultView.clearTimeout === "function"
          ? documentRef.defaultView.clearTimeout.bind(documentRef.defaultView)
          : clearTimeout);
      if (inputChangeTimer !== null) cancel(inputChangeTimer);
      pendingWork = new Promise(resolve => {
        inputChangeTimer = schedule(() => {
          inputChangeTimer = null;
          Promise.resolve(solve()).then(resolve, error => resolve(fail(
            FAILURE_CODES.SOLVE_FAILED,
            "The automatic calculated-preview solve failed.",
            { error: String(error && error.message || error) }
          )));
        }, delay);
      });
      return pendingWork;
    }

    function guidedInputChanged(options) {
      lastInspection = null;
      clearSolvedArtifacts();
      updateSectionControls();
      const inspection = inspectInput();
      if (options && options.solve === false) return inspection;
      scheduleSolvedPreview(180);
      return inspection;
    }

    function cancelScheduledPreview() {
      if (inputChangeTimer === null) return;
      const cancel = typeof env.clearTimeout === "function"
        ? env.clearTimeout
        : (documentRef.defaultView &&
            typeof documentRef.defaultView.clearTimeout === "function"
          ? documentRef.defaultView.clearTimeout.bind(documentRef.defaultView)
          : clearTimeout);
      cancel(inputChangeTimer);
      inputChangeTimer = null;
      pendingWork = Promise.resolve(fail(
        FAILURE_CODES.INPUT_INCOMPLETE,
        "Automatic preview cancelled because a reference-only family was selected.",
        { familyPresetId: selectedFamilyPresetId }
      ));
    }

    function referencePresetStatus(preset, family) {
      const groups = Array.isArray(preset.sourceGroups)
        ? preset.sourceGroups.map(group =>
            `${Number.isInteger(group.count) ? group.count : "?"}× ` +
            `${(group.bandIds || []).join("+").toUpperCase()}`
          ).join(" · ")
        : "source counts unresolved";
      setStatus("reference", "REFERENCE FAMILY — EXPLICIT INPUT REQUIRED", [
        `${cleanString(preset.label) || preset.id} · topology ` +
          `${cleanString(family && family.topology) || "unknown"} · ${groups}`,
        `${Array.isArray(preset.stationIntent)
          ? preset.stationIntent.length : 0} declared interface/station intents`,
        `Provenance: ${(preset.provenanceRefs || []).join(" · ") ||
          "not declared"}`,
        "Driver names/counts are reference identity only; complete verified " +
          "records, dimensions, acoustic terms, and mount evidence are required.",
        "Complete physical horn, chamber, passage, mount, package, and render " +
          "geometry are required before solve/render.",
        "No preview was synthesized · exact solid locked · manufacturing locked · STL locked"
      ]);
    }

    function selectFamilyPreset(presetId) {
      const preset = familyPresetRecord(presetId);
      if (!preset || preset.selectable !== true) {
        setStatus("fail", FAILURE_CODES.INPUT_INCOMPLETE, [
          "The requested family preset is not selectable."
        ]);
        return false;
      }
      selectedFamilyPresetId = preset.id;
      selectedQuickStartId = runnableFamilyPreset(preset)
        ? preset.quickStartId : null;
      const selector = element("threewayQuickStartSel");
      if (selector) selector.value = preset.id;
      updateQuickStartNote();
      populateCatalogDriverSelection(preset);
      setGuidedPresetAvailability(preset);
      const mode = element("threewayInputMode");
      if (runnableFamilyPreset(preset)) {
        if (mode) mode.value = "quick-start";
        applyQuickStartDefaults(quickStartRecord(selectedQuickStartId));
        guidedInputChanged();
        return true;
      }
      cancelScheduledPreview();
      lastInspection = null;
      clearSolvedArtifacts();
      if (mode) mode.value = "preset-evidence";
      const family = familyForPreset(preset),
        cardId = cleanString(preset && preset.referenceCardId) ||
          cleanString(family && family.referenceCardId);
      if (cardId) startCard(cardId, true);
      updateQuickStartNote();
      populateCatalogDriverSelection(preset);
      setGuidedPresetAvailability(preset);
      referencePresetStatus(preset, family);
      return true;
    }

    function bindGuidedControl(definition) {
      const range = element(`${definition.id}Range`);
      const number = element(definition.id);
      const update = (source, solveNow) => {
        const value = finiteControlValue(source, definition);
        setControlValue(definition, value / definition.scale);
        guidedInputChanged({ solve: solveNow });
      };
      if (range) {
        range.addEventListener("input", event => {
          update(event.target, true);
        });
      }
      if (number) {
        number.addEventListener("change", event => {
          update(event.target, true);
        });
      }
    }

    function mount() {
      if (mounted) return true;
      const topology = element("segTopo");
      if (!topology || !topology.parentNode) return false;
      const panel = documentRef.createElement("div");
      panel.id = "threewayV2Ctl";
      panel.hidden = true;
      panel.innerHTML = staticPanelMarkup();
      topology.parentNode.insertBefore(panel, topology.nextSibling);
      mounted = true;
      populateCards();
      populateQuickStarts();
      const editor = element("threewayInputJson");
      if (editor) editor.value = defaultInputText();
      element("threewayQuickStartSel").addEventListener("change", event => {
        selectFamilyPreset(
          cleanString(event.target.value) || DEFAULT_FAMILY_PRESET_ID
        );
      });
      for (const definition of QUICK_START_CONTROLS) {
        bindGuidedControl(definition);
      }
      element("threewayProfileFamily").addEventListener(
        "change", () => guidedInputChanged()
      );
      element("threewaySectionFamily").addEventListener(
        "change", () => guidedInputChanged()
      );
      element("threewayCardSel").addEventListener("change", event => {
        const mode = element("threewayInputMode");
        if (mode) mode.value = "preset-evidence";
        startCard(event.target.value, true);
      });
      element("threewayInputMode").addEventListener("change", event => {
        lastInspection = null;
        clearSolvedArtifacts();
        const input = element("threewayInputJson");
        if (input && event.target.value === "preset-evidence") {
          input.value = defaultInputText();
        }
        inspectInput();
      });
      element("threewayInputJson").addEventListener("input", () => {
        lastInspection = null;
        clearSolvedArtifacts();
        setStatus(
          "reference", "PHYSICAL INPUT CHANGED — SOLVE REQUIRED",
          ["The previous analysis report and preview were invalidated."]
        );
      });
      element("threewayInspect").addEventListener("click", inspectInput);
      element("threewaySolve").addEventListener("click", () => {
        pendingWork = Promise.resolve(solve());
      });
      element("threewaySave").addEventListener("click", persist);
      element("threewayDownloadState").addEventListener(
        "click", downloadState
      );
      element("threewayDownloadReport").addEventListener(
        "click", downloadReport
      );
      const view = element("viewSel");
      if (view) {
        view.addEventListener("change", event => {
          if (!active || !VIEW_IDS.includes(event.target.value)) return;
          selectedViewId = event.target.value;
          updateViewNote();
          const rendered = renderCurrentView();
          if (lastSolveResult && rendered && rendered.ok !== true) {
            setStatus(
              "reference", FAILURE_CODES.RENDER_UNAVAILABLE,
              [rendered.message || "The selected preview view is unavailable."]
            );
          }
        });
      }
      return true;
    }

    function activate(options) {
      if (disposed) {
        return fail(
          FAILURE_CODES.ENVIRONMENT_INVALID,
          "The three-way workspace has been disposed.",
          {}
        );
      }
      if (!mount()) {
        return fail(
          FAILURE_CODES.DOM_UNAVAILABLE,
          "The topology control is unavailable.",
          {}
        );
      }
      active = true;
      lifecycleEpoch += 1;
      const requestedView = cleanString(options && options.viewId);
      if (VIEW_IDS.includes(requestedView)) selectedViewId = requestedView;
      if (documentRef.body) {
        documentRef.body.classList.add("threeway-v2-mode");
      }
      const panel = element("threewayV2Ctl");
      if (panel) panel.hidden = false;
      installThreeWayControls();
      if (typeof env.onActivate === "function") env.onActivate();
      const requested = cleanString(options && options.cardId);
      if (!controllerState.candidate) {
        if (!restoreStoredCandidate()) {
          startCard(requested || selectedCardId, false);
        } else {
          populateCards();
          updateCardNote();
          inspectInput();
        }
      } else if (requested && requested !== selectedCardId) {
        startCard(requested, true);
      } else {
        updateCardNote();
        inspectInput();
      }
      setText(
        "note",
        "SCHEMA-2 THREE-WAY · ANALYSIS/PREVIEW ONLY · LEGACY 3-WAY BYPASSED"
      );
      if (lastSolveResult && lastSolveResult.renderModel) {
        renderCurrentView();
      } else if (env.autoSolve !== false && !autoSolveStarted &&
          (!element("threewayInputMode") ||
            element("threewayInputMode").value === "quick-start")) {
        autoSolveStarted = true;
        scheduleSolvedPreview(0);
      }
      return deepFreeze({
        ok: true,
        active: true,
        selectedCardId,
        selectedFamilyPresetId,
        selectedQuickStartId,
        autoSolveScheduled: autoSolveStarted,
        manufacturing: false,
        stl: false,
        capabilities: CAPABILITIES
      });
    }

    function deactivate() {
      if (!active) return true;
      active = false;
      lifecycleEpoch += 1;
      if (documentRef.body) {
        documentRef.body.classList.remove("threeway-v2-mode");
      }
      const panel = element("threewayV2Ctl");
      if (panel) panel.hidden = true;
      if (rendererInstance && rendererInstance.ok === true) {
        rendererInstance.dispose();
        rendererInstance = null;
      }
      restoreLegacyControls();
      if (typeof env.onDeactivate === "function") env.onDeactivate();
      return true;
    }

    function dispose() {
      deactivate();
      disposed = true;
      const panel = element("threewayV2Ctl");
      if (panel) panel.remove();
      mounted = false;
      return true;
    }

    function state() {
      return deepFreeze({
        active,
        mounted,
        disposed,
        selectedCardId,
        selectedFamilyPresetId,
        selectedQuickStartId,
        selectedViewId,
        guidedValues: mounted ? guidedValues() : null,
        controllerState: cloneValue(controllerState),
        lastInspection: cloneValue(lastInspection),
        lastSolveResult: cloneValue(lastSolveResult),
        manufacturing: false,
        stl: false
      });
    }

    return Object.freeze({
      ok: true,
      mount,
      activate,
      deactivate,
      inspectInput,
      solve,
      persist,
      downloadState,
      downloadReport,
      renderCurrentView,
      whenIdle() {
        return pendingWork;
      },
      getState: state,
      dispose,
      manufacturing: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  return deepFreeze({
    version: VERSION,
    defaultCardId: DEFAULT_CARD_ID,
    defaultQuickStartId: DEFAULT_QUICK_START_ID,
    quickStartControls: QUICK_START_CONTROLS,
    viewIds: VIEW_IDS,
    viewLabels: VIEW_LABELS,
    failureCodes: FAILURE_CODES,
    capabilities: CAPABILITIES,
    defaultEvidenceInput: DEFAULT_EVIDENCE_INPUT,
    parseJsonObject,
    summarizePresetResult,
    createRuntime
  });
}));
