/* MEH Studio v5 - source-bounded three-way family and driver catalog.

   The catalog separates:
   - a topology documented by a source,
   - a documented driver identity/count,
   - a driver record that is complete enough for analysis or mount planning,
   - and a solid that has actually passed exact/manufacturing gates.

   A family or driver match never grants manufacturing authority. Product
   photographs, nominal diameters, and model names are not dimensional input.
   Records use SI units and are validated through threeway-driver-db.js. */
(function attachThreeWayFamilyCatalog(root, factory) {
  "use strict";
  const driverDb = typeof module === "object" && module.exports
    ? require("./threeway-driver-db.js")
    : root && root.MEH3DriverDB;
  const api = factory(driverDb);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3FamilyCatalog = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createApi(
  defaultDriverDb,
) {
  "use strict";

  const CATALOG_VERSION = 1;
  const SERIALIZATION_VERSION = "meh3-family-catalog-v1";
  const FAMILY_IDS = Object.freeze([
    "t3-conventional-two-wall",
    "cx3-dual-diaphragm-tapped-lf",
    "h3-external-lf-shared-mid-high",
    "compound-combiner-research",
  ]);
  const SELECTABLE_FAMILY_IDS = Object.freeze(FAMILY_IDS.slice(0, 3));
  const PRESET_IDS = Object.freeze([
    "t3-calculated-111",
    "cosyne-t3-archived-144",
    "sh50-official-142",
    "hinson-cx3-documented",
    "jmod-cx3-documented",
    "u15-h3-envelope",
  ]);
  const DRIVER_SELECTION_IDS = Object.freeze([
    "cosyne-archived-original",
    "hinson-documented-dcx464-10nw76",
  ]);
  const BAND_IDS = Object.freeze(["low", "mid", "high"]);

  const FAILURE_CODES = deepFreeze({
    FAMILY_UNKNOWN: "THREEWAY_FAMILY_UNKNOWN",
    FAMILY_NOT_SELECTABLE: "THREEWAY_FAMILY_NOT_SELECTABLE",
    BINDINGS_INVALID: "THREEWAY_FAMILY_BINDINGS_INVALID",
    BINDING_REQUIRED: "THREEWAY_FAMILY_DRIVER_BINDING_REQUIRED",
    BINDING_UNKNOWN: "THREEWAY_FAMILY_DRIVER_BINDING_UNKNOWN",
    COUNT_MISMATCH: "THREEWAY_FAMILY_DRIVER_COUNT_MISMATCH",
    RECORD_INVALID: "THREEWAY_FAMILY_DRIVER_RECORD_INVALID",
    KIND_UNSUPPORTED: "THREEWAY_FAMILY_DRIVER_KIND_UNSUPPORTED",
    BAND_UNSUPPORTED: "THREEWAY_FAMILY_DRIVER_BAND_UNSUPPORTED",
    OUTPUT_UNSUPPORTED: "THREEWAY_FAMILY_DRIVER_OUTPUT_UNSUPPORTED",
    ACOUSTIC_EVIDENCE_INCOMPLETE:
      "THREEWAY_FAMILY_ACOUSTIC_EVIDENCE_INCOMPLETE",
    COUPLING_EVIDENCE_INCOMPLETE:
      "THREEWAY_FAMILY_COUPLING_EVIDENCE_INCOMPLETE",
    MOUNT_EVIDENCE_INCOMPLETE:
      "THREEWAY_FAMILY_MOUNT_EVIDENCE_INCOMPLETE",
    SELECTION_UNKNOWN: "THREEWAY_DRIVER_SELECTION_UNKNOWN",
    SELECTION_FAMILY_MISMATCH:
      "THREEWAY_DRIVER_SELECTION_FAMILY_MISMATCH",
    SELECTION_IDENTITY_MISMATCH:
      "THREEWAY_DRIVER_SELECTION_IDENTITY_MISMATCH",
  });

  const CAPABILITIES = deepFreeze({
    status: "source-bounded-family-and-driver-compatibility",
    immutableCatalog: true,
    deterministicSerialization: true,
    selectableTopologyFamilies: true,
    documentedDriverIdentities: true,
    explicitDriverRecordCompatibility: true,
    topologyCompatibility: true,
    acousticInputReadiness: true,
    mountInputReadiness: true,
    productGeometryInference: false,
    nominalDiameterInference: false,
    imageGeometryInference: false,
    driverSubstitutionCertification: false,
    exactSolidCertification: false,
    manufacturingReadiness: false,
    manufacturing: false,
    stl: false,
    reason:
      "A family and compatible records are design inputs. Exact connected " +
      "geometry, tolerances, material/process checks, and physical validation " +
      "remain separate required gates.",
  });

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (isObject(value)) {
      const result = {};
      for (const key of Object.keys(value).sort()) result[key] = clone(value[key]);
      return result;
    }
    return typeof value === "number" && Object.is(value, -0) ? 0 : value;
  }

  function stableStringify(value) {
    return JSON.stringify(clone(value));
  }

  function cleanString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function normalizedIdentity(value) {
    return cleanString(value)
      ? value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ")
      : null;
  }

  function uniqueStrings(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function sourceRecord({
    id,
    classification,
    evidenceTier,
    title,
    sourceUrl = null,
    localRefs = [],
    sourcePages = [],
    supports = [],
    doesNotSupport = [],
  }) {
    return {
      id,
      classification,
      evidenceTier,
      title,
      sourceUrl,
      localRefs,
      sourcePages,
      supports,
      doesNotSupport,
    };
  }

  const PROVENANCE = deepFreeze({
    "prov-unity-patent-t3": sourceRecord({
      id: "prov-unity-patent-t3",
      classification: "documented",
      evidenceTier: "A2",
      title: "Unity Summation Aperture - US 6,411,718 B1",
      sourceUrl: "https://patents.google.com/patent/US6411718B1/en",
      localRefs: [
        "research/threeway-sources/primary/US6411718B1-unity-summation.pdf",
        "docs/threeway-primary-source-ledger.md#5-foundational-patent-records",
        "docs/threeway-research-manifest.md#foundational-patents",
      ],
      supports: [
        "HF throat followed by MF and LF wall-entry stations",
        "MF station preceding LF station",
        "connected chamber/passage/horn acoustic topology",
      ],
      doesNotSupport: [
        "one universal source count",
        "one universal station coordinate",
        "a manufacturing-ready derivative",
      ],
    }),
    "prov-waslo-cosyne": sourceRecord({
      id: "prov-waslo-cosyne",
      classification: "documented",
      evidenceTier: "B2",
      title: "Bill Waslo - Synergy Calc V5 / CoSyne guide",
      sourceUrl:
        "https://www.libinst.com/SynergyCalc/Synergy%20Calc%20V5.pdf",
      localRefs: [
        "research/threeway-sources/author/Synergy-Calc-V5-guide.pdf",
        "tmp/pdfs/threeway-research-text/Synergy-Calc-V5-guide.txt",
        "docs/threeway-primary-source-ledger.md#81-bill-waslo--synergy-calc-v5--cosyne",
      ],
      sourcePages: [3, 4, 5],
      supports: [
        "one HF, four MF, and four LF sources",
        "90 by 60 degree reference coverage",
        "archived original driver identities",
        "author-listed replacement screening candidates",
        "new port and crossover work after substitution",
      ],
      doesNotSupport: [
        "drop-in equivalence of replacement drivers",
        "manufacturing readiness of a new adaptation",
      ],
    }),
    "prov-hinson-meh-guide": sourceRecord({
      id: "prov-hinson-meh-guide",
      classification: "documented",
      evidenceTier: "B2",
      title: "Scott Hinson - Multiple Entry Horns / MEH guide (2022)",
      sourceUrl:
        "https://device.report/m/" +
        "303b9e618394104d6a72e34bc18bfe61e7e118d97ecfd6db8b563819530e533b.pdf",
      localRefs: [
        "../../research-sources/Scott Hinson MEH reference.pdf",
        "docs/threeway-primary-source-ledger.md#82-scott-hinson--dual-diaphragm-throat-plus-tapped-lf",
        "tmp/pdfs/hinson/page-14.png",
        "tmp/pdfs/hinson/page-15.png",
      ],
      sourcePages: [14, 15],
      supports: [
        "B&C DCX464 dual-diaphragm MF/HF throat source",
        "two B&C 10NW76 LF sources through horn-wall slots",
        "approximately 400-600 Hz LF-to-throat-module target range",
        "inter-diaphragm coupling and termination sensitivity",
      ],
      doesNotSupport: [
        "universal replacement drivers",
        "universal LF slot geometry after substitution",
        "automatic manufacturing readiness",
      ],
    }),
    "prov-danley-sh50-official": sourceRecord({
      id: "prov-danley-sh50-official",
      classification: "documented-product-envelope",
      evidenceTier: "C",
      title: "Danley Sound Labs SH50 official product, specification, and CAD package",
      sourceUrl: "https://www.danleysoundlabs.com/products/sh50/",
      localRefs: [
        "../../../../../Downloads/M-Danley-SH50-2D-3D/3D Files/SH50I.fbx",
        "../../../../../Downloads/M-Danley-SH50-2D-3D/2D Files/SH50I Rev3.pdf",
        "docs/threeway-research-manifest.md#manufacturer-documents",
      ],
      supports: [
        "one HF, four MF, and two LF sources",
        "50 by 50 degree published coverage",
        "published external package envelope",
        "external CAD silhouette and source arrangement",
      ],
      doesNotSupport: [
        "hidden internal passages or chambers",
        "generic replacement driver dimensions",
        "a manufacturing-ready parametric clone",
      ],
    }),
    "prov-jw-jmod-v2026": sourceRecord({
      id: "prov-jw-jmod-v2026",
      classification: "documented-build",
      evidenceTier: "B2",
      title: "JW Sound JMOD Multiple Entry Horn plans, revision 2.02",
      sourceUrl: "https://www.jwsound.live/designs/jmod",
      localRefs: [
        "../../../../../Downloads/JMOD Multiple Entry Horn.pdf",
        "docs/threeway-primary-source-ledger.md",
        "docs/threeway-research-manifest.md",
      ],
      sourcePages: [1, 2],
      supports: [
        "one B&C DCX464 coaxial MF/HF throat module",
        "two B&C 12NDL88 LF sources",
        "90 by 60 degree documented coverage",
        "published external package and build context",
      ],
      doesNotSupport: [
        "universal port or chamber dimensions",
        "automatic transfer to substitute drivers",
        "manufacturing validation of a parametric derivative",
      ],
    }),
    "prov-yorkville-u15": sourceRecord({
      id: "prov-yorkville-u15",
      classification: "documented-product-envelope",
      evidenceTier: "C",
      title: "Yorkville Unity U15 legacy product and specification",
      sourceUrl: "https://www.yorkville.com/legacy/product/u15",
      localRefs: [
        "docs/threeway-research-manifest.md#manufacturer-documents",
        "docs/threeway-primary-source-ledger.md#9-manufacturer-envelope-records",
      ],
      supports: [
        "one external 15-inch LF source",
        "three 5-inch MF sources entering a 60 by 60 degree horn",
        "one 1-inch-throat HF source",
        "published 300 Hz and 1.25 kHz system crossovers",
      ],
      doesNotSupport: [
        "a three-band shared-horn MEH",
        "replacement driver model selection",
        "hidden commercial horn or cabinet geometry",
      ],
    }),
    "prov-parallel-line-source-patent": sourceRecord({
      id: "prov-parallel-line-source-patent",
      classification: "adjacent-research",
      evidenceTier: "A2",
      title: "Horn-loaded acoustic line source - US 2009/0323997 A1",
      sourceUrl: "https://patents.google.com/patent/US20090323997A1/en",
      localRefs: [
        "research/threeway-sources/primary/US20090323997A1-paraline.pdf",
        "docs/threeway-primary-source-ledger.md#55-layered-and-parallel-path-combiner-families",
      ],
      supports: ["parallel-path and curved-wavefront combiner research"],
      doesNotSupport: [
        "a complete generic three-way graph",
        "ordinary wall-tap solver reuse",
        "manufacturing-ready geometry",
      ],
    }),
    "prov-horn-combiner-patent": sourceRecord({
      id: "prov-horn-combiner-patent",
      classification: "adjacent-research",
      evidenceTier: "A2",
      title: "Horn enclosure for combining sound output - US 8,488,826 B2",
      sourceUrl: "https://patents.google.com/patent/US8488826B2/en",
      localRefs: [
        "research/threeway-sources/primary/US8488826B2-horn-combiner.pdf",
        "docs/threeway-primary-source-ledger.md#55-layered-and-parallel-path-combiner-families",
      ],
      supports: ["layered acoustic-combiner research"],
      doesNotSupport: [
        "a complete ordinary T3/CX3/H3 source graph",
        "manufacturing-ready derivative geometry",
      ],
    }),
    "prov-meh3-calculated-t3-solid-v1": sourceRecord({
      id: "prov-meh3-calculated-t3-solid-v1",
      classification: "calculated-design-intent",
      evidenceTier: "internal",
      title: "MEH Studio calculated T3 integrated-solid intent v1",
      localRefs: [
        "threeway-family-catalog.js",
        "docs/threeway-family-catalog.md#calculated-t3-solid-input",
      ],
      supports: [
        "explicit ownership of bounded solid-input defaults",
        "repeatable analysis and exact-kernel input",
      ],
      doesNotSupport: [
        "historical product geometry",
        "successful exact Boolean construction",
        "manufacturing readiness",
      ],
    }),
  });

  function recordRequirements({
    allowedKinds,
    requiredBands,
    allowedOutputKinds,
    requireThieleSmall = false,
    requireLumpedTerms = false,
    requireExcursion = false,
    requireCouplingEvidence = false,
  }) {
    return {
      schemaVersion: 1,
      allowedKinds,
      requiredBands,
      allowedOutputKinds,
      requireThieleSmall,
      requireLumpedTerms,
      requireExcursion,
      requireCouplingEvidence,
      requireExplicitFrame: true,
      requireExplicitAcousticDatum: true,
      mountPlanningFields: [
        "mounting.datum",
        "mounting.cutout",
        "mounting.boltCircle or mounting.fasteners[]",
        "mounting.gasket",
      ],
      geometryInferenceAllowed: false,
    };
  }

  const CONE_REQUIREMENTS = recordRequirements({
    allowedKinds: ["cone"],
    requiredBands: [],
    allowedOutputKinds: ["front-diaphragm"],
    requireThieleSmall: true,
    requireLumpedTerms: true,
    requireExcursion: true,
  });

  const HIGH_REQUIREMENTS = recordRequirements({
    allowedKinds: ["compression"],
    requiredBands: ["high"],
    allowedOutputKinds: ["throat", "compression-throat"],
  });

  const DUAL_DIAPHRAGM_REQUIREMENTS = recordRequirements({
    allowedKinds: ["dual-diaphragm"],
    requiredBands: ["mid", "high"],
    allowedOutputKinds: ["coaxial-throat"],
    requireCouplingEvidence: true,
  });

  function sourceGroup({
    id,
    bandIds,
    count,
    role,
    interfaceKind,
    requirements,
  }) {
    return {
      id,
      bandIds,
      count,
      role,
      interfaceKind,
      recordRequirements: {
        ...requirements,
        requiredBands: bandIds,
      },
    };
  }

  function option({
    id,
    label,
    sourceId,
    bandIds,
    count,
    manufacturer,
    model,
    status,
    compatibility,
    selectable = false,
    evidenceRefs,
    notes = [],
  }) {
    return {
      id,
      label,
      sourceId,
      bandIds,
      count,
      recordIdentity: { manufacturer, model },
      status,
      compatibility,
      selectable,
      evidenceRefs,
      notes,
    };
  }

  const COSYNE_HIGH = option({
    id: "celestion-cdx1-1445",
    label: "Celestion CDX1-1445 (archived original)",
    sourceId: "source-high",
    bandIds: ["high"],
    count: 1,
    manufacturer: "Celestion",
    model: "CDX1-1445",
    status: "documented-original",
    compatibility: "fixed-documented-build; exact record still required",
    evidenceRefs: ["prov-waslo-cosyne"],
  });
  const COSYNE_MID = option({
    id: "gento-sp99023a",
    label: "Gento SP99023A x4 (archived original)",
    sourceId: "source-mid",
    bandIds: ["mid"],
    count: 4,
    manufacturer: "Gento",
    model: "SP99023A",
    status: "documented-original-limited-or-obsolete",
    compatibility: "fixed-documented-build; exact record still required",
    evidenceRefs: ["prov-waslo-cosyne"],
  });
  const COSYNE_LOW = option({
    id: "aurasound-ns6-255-8a",
    label: "Aurasound NS6-255-8A x4 (archived original)",
    sourceId: "source-low",
    bandIds: ["low"],
    count: 4,
    manufacturer: "Aurasound",
    model: "NS6-255-8A",
    status: "documented-original-obsolete",
    compatibility: "fixed-documented-build; exact record still required",
    evidenceRefs: ["prov-waslo-cosyne"],
  });
  const COSYNE_MID_CANDIDATES = [
    option({
      id: "faitalpro-3fe25-8-candidate",
      label: "FaitalPRO 3FE25-8 (author-listed candidate)",
      sourceId: "source-mid",
      bandIds: ["mid"],
      count: 4,
      manufacturer: "FaitalPRO",
      model: "3FE25-8",
      status: "author-listed-candidate",
      compatibility: "requires complete records and a new port/crossover solve",
      evidenceRefs: ["prov-waslo-cosyne"],
      notes: ["Harder to pack closely according to the author guide."],
    }),
    option({
      id: "visaton-frs5-8-candidate",
      label: "Visaton FRS5-8 (author-listed candidate)",
      sourceId: "source-mid",
      bandIds: ["mid"],
      count: 4,
      manufacturer: "Visaton",
      model: "FRS 5 8 Ohm",
      status: "author-listed-candidate",
      compatibility: "requires complete records and a new port/crossover solve",
      evidenceRefs: ["prov-waslo-cosyne"],
    }),
  ];
  const COSYNE_LOW_CANDIDATES = [
    option({
      id: "dayton-dc130as-8-candidate",
      label: "Dayton Audio DC130AS-8 (author-listed candidate)",
      sourceId: "source-low",
      bandIds: ["low"],
      count: 4,
      manufacturer: "Dayton Audio",
      model: "DC130AS-8",
      status: "author-listed-candidate",
      compatibility: "requires complete records and a new box/port/crossover solve",
      evidenceRefs: ["prov-waslo-cosyne"],
    }),
    option({
      id: "visaton-w130s-8-candidate",
      label: "Visaton W130S-8 (author-listed candidate)",
      sourceId: "source-low",
      bandIds: ["low"],
      count: 4,
      manufacturer: "Visaton",
      model: "W 130 S 8 Ohm",
      status: "author-listed-candidate",
      compatibility: "requires complete records and a new box/port/crossover solve",
      evidenceRefs: ["prov-waslo-cosyne"],
    }),
    option({
      id: "faitalpro-6fe100-candidate-untried",
      label: "FaitalPRO 6FE100 (author-listed, explicitly untried)",
      sourceId: "source-low",
      bandIds: ["low"],
      count: 4,
      manufacturer: "FaitalPRO",
      model: "6FE100",
      status: "author-listed-untried-candidate",
      compatibility: "research screening only; full new design required",
      evidenceRefs: ["prov-waslo-cosyne"],
    }),
  ];

  const HINSON_DCX = option({
    id: "bc-dcx464",
    label: "B&C DCX464 dual-diaphragm throat",
    sourceId: "source-coax-mid-high",
    bandIds: ["mid", "high"],
    count: 1,
    manufacturer: "B&C Speakers",
    model: "DCX464",
    status: "documented-build",
    compatibility:
      "fixed documented identity; coupling/termination record required",
    evidenceRefs: ["prov-hinson-meh-guide"],
  });
  const HINSON_LOW = option({
    id: "bc-10nw76",
    label: "B&C 10NW76 x2 tapped LF",
    sourceId: "source-low",
    bandIds: ["low"],
    count: 2,
    manufacturer: "B&C Speakers",
    model: "10NW76",
    status: "documented-build",
    compatibility:
      "fixed documented identity; exact dimensions/T-S/mount record required",
    evidenceRefs: ["prov-hinson-meh-guide"],
  });
  const JMOD_DCX = option({
    id: "bc-dcx464-jmod",
    label: "B&C DCX464 dual-diaphragm throat (JMOD plans)",
    sourceId: "source-coax-mid-high",
    bandIds: ["mid", "high"],
    count: 1,
    manufacturer: "B&C Speakers",
    model: "DCX464",
    status: "documented-build",
    compatibility:
      "documented identity only; coupling/termination record required",
    evidenceRefs: ["prov-jw-jmod-v2026"],
  });
  const JMOD_LOW = option({
    id: "bc-12ndl88-jmod",
    label: "B&C 12NDL88 x2 (JMOD plans)",
    sourceId: "source-low",
    bandIds: ["low"],
    count: 2,
    manufacturer: "B&C Speakers",
    model: "12NDL88",
    status: "documented-build",
    compatibility:
      "documented identity only; exact dimensions/T-S/mount record required",
    evidenceRefs: ["prov-jw-jmod-v2026"],
  });

  const T3_SOLID_GEOMETRY = deepFreeze({
    schemaVersion: 1,
    constructionId: "t3-calculated-two-wall-v1",
    mode: "integrated-solid",
    wallThicknessM: 0.012,
    throatCollarLengthM: 0.025,
    lumenWallOvershootM: 0.003,
    lumenChamberOverlapM: 0.004,
    minimumPrintableWebM: 0.004,
    meshClearanceM: 0.0004,
    booleanToleranceM: 0.00001,
    inspection: {
      perimeterSegments: 96,
    },
    provenance: {
      classification: "calculated-design-intent",
      evidenceRefs: ["prov-meh3-calculated-t3-solid-v1"],
    },
  });

  const RAW_FAMILIES = {
    "t3-conventional-two-wall": {
      id: "t3-conventional-two-wall",
      label: "Calculated T3 - separate MF and LF wall stations",
      shortLabel: "Conventional T3",
      topology: "T3",
      topologyVocabulary: {
        catalog: "T3",
        executableReferenceCards: "T3",
        primarySourceLedger2026: "T3",
        conflictStatus: "none",
      },
      classification: "calculated-adaptation",
      selectable: true,
      referenceCardId: "cosyne-t3-documented-topology",
      analysisPresetId: "cosyne-t3",
      bandIds: ["low", "mid", "high"],
      physicalSourceCount: 9,
      sourceGroups: [
        sourceGroup({
          id: "source-high",
          bandIds: ["high"],
          count: 1,
          role: "throat-source",
          interfaceKind: "throat",
          requirements: HIGH_REQUIREMENTS,
        }),
        sourceGroup({
          id: "source-mid",
          bandIds: ["mid"],
          count: 4,
          role: "wall-source",
          interfaceKind: "wall-entry",
          requirements: CONE_REQUIREMENTS,
        }),
        sourceGroup({
          id: "source-low",
          bandIds: ["low"],
          count: 4,
          role: "wall-source",
          interfaceKind: "wall-entry",
          requirements: CONE_REQUIREMENTS,
        }),
      ],
      stationIntent: [
        {
          id: "station-high-throat",
          kind: "throat",
          order: 0,
          sourceIds: ["source-high"],
          bandIds: ["high"],
          scope: "shared-horn",
        },
        {
          id: "station-mid-wall",
          kind: "wall-entry",
          order: 1,
          sourceIds: ["source-mid"],
          bandIds: ["mid"],
          scope: "shared-horn",
        },
        {
          id: "station-low-wall",
          kind: "wall-entry",
          order: 2,
          sourceIds: ["source-low"],
          bandIds: ["low"],
          scope: "shared-horn",
        },
      ],
      defaultAcousticTargets: {
        classification: "calculated-starting-target",
        coverageDeg: {
          horizontal: 90,
          vertical: 60,
          status: "documented-reference-target",
        },
        crossoversHz: {
          lowMid: 300,
          midHigh: 1200,
          status: "calculated-adaptation-starting-target; coupled re-solve required",
        },
        lowFrequencyPatternControlHz: {
          value: 385,
          status: "documented-CoSyne-horizontal-reference",
        },
        subwooferHandoffHz: {
          value: 80,
          status: "author-recommended-CoSyne-system-target",
        },
      },
      driverControlKeys: {
        low: "lowDriverRef",
        mid: "midDriverRef",
        high: "highDriverRef",
      },
      driverSelectionMode: "fixed-documented-set-with-research-candidates",
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: "cosyne-archived-original",
      driverOptions: {
        low: [COSYNE_LOW, ...COSYNE_LOW_CANDIDATES],
        mid: [COSYNE_MID, ...COSYNE_MID_CANDIDATES],
        high: [COSYNE_HIGH],
      },
      presetIds: [
        "t3-calculated-111",
        "cosyne-t3-archived-144",
        "sh50-official-142",
      ],
      analysisInput: null,
      analysisInputStatus:
        "preset-owned; family records do not inherit solid defaults",
      provenanceRefs: [
        "prov-unity-patent-t3",
        "prov-waslo-cosyne",
        "prov-meh3-calculated-t3-solid-v1",
      ],
      limitations: [
        "The archived CoSyne driver set is not silently replaced.",
        "Author-listed candidates are not prevalidated combinations.",
        "Station, chamber, aperture, passage, mount, and crossover must be solved for selected records.",
        "Integrated-solid defaults are internal bounded inputs, not source geometry.",
      ],
      manufacturingReadiness: false,
      exactGeometryPassed: false,
    },

    "cx3-dual-diaphragm-tapped-lf": {
      id: "cx3-dual-diaphragm-tapped-lf",
      label: "CX3 - dual-diaphragm MF/HF throat plus tapped LF",
      shortLabel: "Coax-assisted CX3",
      topology: "CX3",
      topologyVocabulary: {
        catalog: "CX3",
        executableReferenceCards: "CX3",
        primarySourceLedger2026: "H3",
        conflictStatus:
          "preserved alias conflict; catalog follows the executable schema",
      },
      classification: "documented-hybrid-topology",
      selectable: true,
      referenceCardId: "hinson-cx3-documented-topology",
      analysisPresetId: "hinson-cx3",
      bandIds: ["low", "mid", "high"],
      physicalSourceCount: 3,
      sourceGroups: [
        sourceGroup({
          id: "source-coax-mid-high",
          bandIds: ["mid", "high"],
          count: 1,
          role: "dual-diaphragm-throat-module",
          interfaceKind: "coaxial-throat",
          requirements: DUAL_DIAPHRAGM_REQUIREMENTS,
        }),
        sourceGroup({
          id: "source-low",
          bandIds: ["low"],
          count: 2,
          role: "wall-source",
          interfaceKind: "wall-entry",
          requirements: CONE_REQUIREMENTS,
        }),
      ],
      stationIntent: [
        {
          id: "station-coaxial-throat",
          kind: "coaxial-throat",
          order: 0,
          sourceIds: ["source-coax-mid-high"],
          bandIds: ["mid", "high"],
          scope: "shared-horn",
        },
        {
          id: "station-low-wall",
          kind: "wall-entry",
          order: 1,
          sourceIds: ["source-low"],
          bandIds: ["low"],
          scope: "shared-horn",
        },
      ],
      defaultAcousticTargets: {
        classification: "documented-build-starting-target",
        coverageDeg: {
          horizontal: 90,
          vertical: 60,
          status: "documented-build-context",
        },
        crossoversHz: {
          lowMid: 500,
          midHigh: 3500,
          status: "starting targets only; acoustic/coupled verification required",
        },
        lowMidTargetRangeHz: {
          minimum: 400,
          maximum: 600,
          status: "author-described coverage-dependent range",
        },
      },
      driverControlKeys: {
        low: "lowDriverRef",
        mid: "midHighDriverRef",
        high: "midHighDriverRef",
      },
      linkedDriverBands: [["mid", "high"]],
      driverSelectionMode: "fixed-documented-set",
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: "hinson-documented-dcx464-10nw76",
      driverOptions: {
        low: [HINSON_LOW],
        mid: [HINSON_DCX],
        high: [HINSON_DCX],
      },
      analysisInput: null,
      presetIds: ["hinson-cx3-documented", "jmod-cx3-documented"],
      analysisInputStatus:
        "analysis-only family; derivative solid inputs must be explicit",
      provenanceRefs: ["prov-hinson-meh-guide"],
      limitations: [
        "The two throat diaphragms are acoustically coupled.",
        "Unused-diaphragm electrical termination must be documented.",
        "LF geometry cannot be transplanted to a replacement cone driver.",
        "No integrated-solid defaults are inherited from T3.",
      ],
      manufacturingReadiness: false,
      exactGeometryPassed: false,
    },

    "h3-external-lf-shared-mid-high": {
      id: "h3-external-lf-shared-mid-high",
      label: "H3 - external direct LF plus shared MF/HF horn",
      shortLabel: "External-LF H3",
      topology: "H3",
      topologyVocabulary: {
        catalog: "H3",
        executableReferenceCards: "H3",
        primarySourceLedger2026:
          "A2 shared-horn section / adjacent complete-system hybrid",
        conflictStatus:
          "preserved classification difference; not a three-band shared horn",
      },
      classification: "adjacent-hybrid-reference",
      selectable: true,
      referenceCardId: "u15-h3-documented-topology",
      analysisPresetId: "u15-h3",
      bandIds: ["low", "mid", "high"],
      physicalSourceCount: 5,
      sourceGroups: [
        sourceGroup({
          id: "source-low-external",
          bandIds: ["low"],
          count: 1,
          role: "external-direct-radiator",
          interfaceKind: "external",
          requirements: CONE_REQUIREMENTS,
        }),
        sourceGroup({
          id: "source-mid",
          bandIds: ["mid"],
          count: 3,
          role: "shared-horn-wall-source",
          interfaceKind: "wall-entry",
          requirements: CONE_REQUIREMENTS,
        }),
        sourceGroup({
          id: "source-high",
          bandIds: ["high"],
          count: 1,
          role: "throat-source",
          interfaceKind: "throat",
          requirements: HIGH_REQUIREMENTS,
        }),
      ],
      stationIntent: [
        {
          id: "station-high-throat",
          kind: "throat",
          order: 0,
          sourceIds: ["source-high"],
          bandIds: ["high"],
          scope: "shared-mid-high-horn",
        },
        {
          id: "station-mid-wall",
          kind: "wall-entry",
          order: 1,
          sourceIds: ["source-mid"],
          bandIds: ["mid"],
          scope: "shared-mid-high-horn",
        },
        {
          id: "interface-low-external",
          kind: "external-direct-radiator",
          order: null,
          sourceIds: ["source-low-external"],
          bandIds: ["low"],
          scope: "outside-shared-horn",
        },
      ],
      defaultAcousticTargets: {
        classification: "manufacturer-envelope-reference",
        coverageDeg: {
          horizontal: 60,
          vertical: 60,
          status: "published-product-reference",
        },
        crossoversHz: {
          lowMid: 300,
          midHigh: 1250,
          status: "published-product-reference; derivative re-solve required",
        },
      },
      driverControlKeys: {
        low: "lowDriverRef",
        mid: "midDriverRef",
        high: "highDriverRef",
      },
      driverSelectionMode: "explicit-user-records-required",
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: null,
      driverOptions: {
        low: [],
        mid: [],
        high: [],
      },
      analysisInput: null,
      presetIds: ["u15-h3-envelope"],
      analysisInputStatus:
        "topology/envelope study only; no commercial geometry or model IDs copied",
      provenanceRefs: ["prov-yorkville-u15"],
      limitations: [
        "The LF source is not part of the shared horn.",
        "Public nominal sizes are not converted into driver dimensions.",
        "The source does not establish replacement model IDs.",
        "No integrated-solid defaults are inherited from T3.",
      ],
      manufacturingReadiness: false,
      exactGeometryPassed: false,
    },

    "compound-combiner-research": {
      id: "compound-combiner-research",
      label: "Compound/layered combiner - research architecture",
      shortLabel: "Compound research",
      topology: "COMPOUND_RESEARCH",
      topologyVocabulary: {
        catalog: "COMPOUND_RESEARCH",
        executableReferenceCards: "COMPOUND_RESEARCH",
        primarySourceLedger2026: "C3",
        conflictStatus:
          "research alias only; a named directed graph is still required",
      },
      classification: "research-only",
      selectable: false,
      referenceCardId: "compound-research-generic",
      analysisPresetId: null,
      bandIds: ["low", "mid", "high"],
      physicalSourceCount: null,
      sourceGroups: [],
      stationIntent: [],
      graphRequirement: {
        required: true,
        nodes: "explicit",
        edges: "explicit",
        branchSolvers: "graph-specific",
      },
      defaultAcousticTargets: {
        classification: "none-until-graph-exists",
        coverageDeg: null,
        crossoversHz: null,
      },
      driverControlKeys: {},
      driverSelectionMode: "unavailable-research-graph-required",
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: null,
      driverOptions: { low: [], mid: [], high: [] },
      analysisInput: null,
      presetIds: [],
      analysisInputStatus:
        "unavailable until a named directed acoustic graph and solvers exist",
      provenanceRefs: [
        "prov-parallel-line-source-patent",
        "prov-horn-combiner-patent",
      ],
      limitations: [
        "No branded product graph is inferred.",
        "Ordinary direct wall-tap geometry is not reused.",
        "No source counts, drivers, targets, or geometry are invented.",
      ],
      manufacturingReadiness: false,
      exactGeometryPassed: false,
    },
  };

  const FAMILIES = deepFreeze(Object.fromEntries(
    FAMILY_IDS.map((id) => [id, RAW_FAMILIES[id]]),
  ));

  function groupWithCount(group, count, id = group.id) {
    return {
      ...clone(group),
      id,
      count,
    };
  }

  const CALCULATED_DRIVER_OPTIONS = deepFreeze({
    low: [{
      id: "driver-low-t3-study",
      label: "Calculated LF study record (not a product driver)",
      sourceId: "src-low",
      bandIds: ["low"],
      count: 1,
      recordIdentity: { manufacturer: null, model: null },
      status: "calculated-driver-assumption",
      compatibility: "fixed to calculated T3 study input",
      selectable: false,
      evidenceRefs: ["prov-meh3-calculated-t3-solid-v1"],
      notes: ["Not a purchasable or manufacturing-authoritative driver record."],
    }],
    mid: [{
      id: "driver-mid-t3-study",
      label: "Calculated MF study record (not a product driver)",
      sourceId: "src-mid",
      bandIds: ["mid"],
      count: 1,
      recordIdentity: { manufacturer: null, model: null },
      status: "calculated-driver-assumption",
      compatibility: "fixed to calculated T3 study input",
      selectable: false,
      evidenceRefs: ["prov-meh3-calculated-t3-solid-v1"],
      notes: ["Not a purchasable or manufacturing-authoritative driver record."],
    }],
    high: [{
      id: "driver-high-t3-study",
      label: "Calculated HF study record (not a product driver)",
      sourceId: "src-high",
      bandIds: ["high"],
      count: 1,
      recordIdentity: { manufacturer: null, model: null },
      status: "calculated-driver-assumption",
      compatibility: "fixed to calculated T3 study input",
      selectable: false,
      evidenceRefs: ["prov-meh3-calculated-t3-solid-v1"],
      notes: ["Not a purchasable or manufacturing-authoritative driver record."],
    }],
  });

  const PRESETS = deepFreeze({
    "t3-calculated-111": {
      id: "t3-calculated-111",
      familyId: "t3-conventional-two-wall",
      quickStartId: "calculated-t3-study",
      label: "Calculated T3 array - 1 HF + 4 MF + 4 LF",
      classification: "calculated-adaptation",
      selectable: true,
      certificationScope:
        "explicit analysis and integrated-solid input contract only",
      sourceGroups: [
        groupWithCount(
          FAMILIES["t3-conventional-two-wall"].sourceGroups[0],
          1,
          "src-high",
        ),
        groupWithCount(
          FAMILIES["t3-conventional-two-wall"].sourceGroups[1],
          4,
          "src-mid",
        ),
        groupWithCount(
          FAMILIES["t3-conventional-two-wall"].sourceGroups[2],
          4,
          "src-low",
        ),
      ],
      physicalSourceCount: 9,
      stationIntent: clone(
        FAMILIES["t3-conventional-two-wall"].stationIntent,
      ),
      defaultAcousticTargets: {
        classification: "calculated-starting-target",
        coverageDeg: {
          horizontal: 90,
          vertical: 90,
          status: "MEH Studio calculated-study default",
        },
        crossoversHz: {
          lowMid: 300,
          midHigh: 1200,
          status: "calculated starting targets; coupled verification required",
        },
      },
      driverOptions: CALCULATED_DRIVER_OPTIONS,
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: null,
      analysisInput: {
        solidGeometry: T3_SOLID_GEOMETRY,
      },
      provenanceRefs: ["prov-meh3-calculated-t3-solid-v1"],
      limitations: [
        "The 1+4+4 records are calculated assumptions, not named product drivers.",
        "This preset uses a recalculated 1+4+4 topology and does not inherit undocumented commercial internal dimensions or driver identities.",
        "Exact/manufacturing gates and physical validation remain required.",
      ],
      exactGeometryPassed: false,
      manufacturingReadiness: false,
    },
    "cosyne-t3-archived-144": {
      id: "cosyne-t3-archived-144",
      familyId: "t3-conventional-two-wall",
      quickStartId: null,
      label: "CoSyne archived topology - 1 HF + 4 MF + 4 LF",
      classification: "documented-topology-analysis-only",
      selectable: true,
      certificationScope: "documented identity/count reference only",
      sourceGroups: clone(
        FAMILIES["t3-conventional-two-wall"].sourceGroups,
      ),
      physicalSourceCount: 9,
      stationIntent: clone(
        FAMILIES["t3-conventional-two-wall"].stationIntent,
      ),
      defaultAcousticTargets: clone(
        FAMILIES["t3-conventional-two-wall"].defaultAcousticTargets,
      ),
      driverOptions: clone(
        FAMILIES["t3-conventional-two-wall"].driverOptions,
      ),
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: "cosyne-archived-original",
      analysisInput: null,
      provenanceRefs: ["prov-unity-patent-t3", "prov-waslo-cosyne"],
      limitations: [
        "No integrated-solid input is promoted from the documented build.",
        "Substitute drivers require a completely new solve.",
      ],
      exactGeometryPassed: false,
      manufacturingReadiness: false,
    },
    "sh50-official-142": {
      id: "sh50-official-142",
      familyId: "t3-conventional-two-wall",
      quickStartId: null,
      referenceCardId: "sh50-official-documented-topology",
      label: "Danley SH50 official reference - 1 HF + 4 MF + 2 LF",
      classification: "documented-product-envelope-analysis-only",
      selectable: true,
      certificationScope:
        "published source counts, coverage, and external package only",
      sourceGroups: [
        groupWithCount(
          FAMILIES["t3-conventional-two-wall"].sourceGroups[0],
          1,
          "source-high",
        ),
        groupWithCount(
          FAMILIES["t3-conventional-two-wall"].sourceGroups[1],
          4,
          "source-mid",
        ),
        groupWithCount(
          FAMILIES["t3-conventional-two-wall"].sourceGroups[2],
          2,
          "source-low",
        ),
      ],
      physicalSourceCount: 7,
      stationIntent: clone(
        FAMILIES["t3-conventional-two-wall"].stationIntent,
      ),
      defaultAcousticTargets: {
        classification: "published-product-reference",
        coverageDeg: {
          horizontal: 50,
          vertical: 50,
          status: "official-published-coverage",
        },
        crossoversHz: null,
      },
      driverOptions: { low: [], mid: [], high: [] },
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: null,
      analysisInput: null,
      provenanceRefs: ["prov-danley-sh50-official"],
      limitations: [
        "Official CAD establishes the external package, not hidden acoustic passages.",
        "No commercial internal geometry or unnamed driver dimensions are inferred.",
        "A derivative requires explicit driver records and a new coupled solve.",
      ],
      exactGeometryPassed: false,
      manufacturingReadiness: false,
    },
    "hinson-cx3-documented": {
      id: "hinson-cx3-documented",
      familyId: "cx3-dual-diaphragm-tapped-lf",
      quickStartId: null,
      label: "Hinson documented CX3 topology",
      classification: "documented-topology-analysis-only",
      selectable: true,
      certificationScope: "driver identity/count and topology reference only",
      sourceGroups: clone(
        FAMILIES["cx3-dual-diaphragm-tapped-lf"].sourceGroups,
      ),
      physicalSourceCount: 3,
      stationIntent: clone(
        FAMILIES["cx3-dual-diaphragm-tapped-lf"].stationIntent,
      ),
      defaultAcousticTargets: clone(
        FAMILIES["cx3-dual-diaphragm-tapped-lf"].defaultAcousticTargets,
      ),
      driverOptions: clone(
        FAMILIES["cx3-dual-diaphragm-tapped-lf"].driverOptions,
      ),
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: "hinson-documented-dcx464-10nw76",
      analysisInput: null,
      provenanceRefs: ["prov-hinson-meh-guide"],
      limitations: clone(
        FAMILIES["cx3-dual-diaphragm-tapped-lf"].limitations,
      ),
      exactGeometryPassed: false,
      manufacturingReadiness: false,
    },
    "jmod-cx3-documented": {
      id: "jmod-cx3-documented",
      familyId: "cx3-dual-diaphragm-tapped-lf",
      quickStartId: null,
      referenceCardId: "jmod-cx3-documented-topology",
      label: "JW Sound JMOD documented topology - DCX464 + 2×12NDL88",
      classification: "documented-topology-analysis-only",
      selectable: true,
      certificationScope:
        "documented driver identities, counts, coverage, and package only",
      sourceGroups: clone(
        FAMILIES["cx3-dual-diaphragm-tapped-lf"].sourceGroups,
      ),
      physicalSourceCount: 3,
      stationIntent: clone(
        FAMILIES["cx3-dual-diaphragm-tapped-lf"].stationIntent,
      ),
      defaultAcousticTargets: {
        classification: "documented-build-reference",
        coverageDeg: {
          horizontal: 90,
          vertical: 60,
          status: "documented-build-context",
        },
        crossoversHz: null,
      },
      driverOptions: {
        low: [JMOD_LOW],
        mid: [JMOD_DCX],
        high: [JMOD_DCX],
      },
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: null,
      analysisInput: null,
      provenanceRefs: ["prov-jw-jmod-v2026"],
      limitations: [
        "Published plans are a reference build, not universal parametric geometry.",
        "Port, chamber, and crossover values must be re-solved after substitution.",
        "No exact/manufacturing authority is granted to a derivative.",
      ],
      exactGeometryPassed: false,
      manufacturingReadiness: false,
    },
    "u15-h3-envelope": {
      id: "u15-h3-envelope",
      familyId: "h3-external-lf-shared-mid-high",
      quickStartId: null,
      label: "External-LF H3 manufacturer envelope",
      classification: "adjacent-envelope-analysis-only",
      selectable: true,
      certificationScope: "source counts and acoustic envelope only",
      sourceGroups: clone(
        FAMILIES["h3-external-lf-shared-mid-high"].sourceGroups,
      ),
      physicalSourceCount: 5,
      stationIntent: clone(
        FAMILIES["h3-external-lf-shared-mid-high"].stationIntent,
      ),
      defaultAcousticTargets: clone(
        FAMILIES["h3-external-lf-shared-mid-high"].defaultAcousticTargets,
      ),
      driverOptions: { low: [], mid: [], high: [] },
      driverSwitchingSupported: false,
      resolvedDriverSelectionId: null,
      analysisInput: null,
      provenanceRefs: ["prov-yorkville-u15"],
      limitations: clone(
        FAMILIES["h3-external-lf-shared-mid-high"].limitations,
      ),
      exactGeometryPassed: false,
      manufacturingReadiness: false,
    },
  });

  const DRIVER_SELECTIONS = deepFreeze({
    "cosyne-archived-original": {
      id: "cosyne-archived-original",
      familyId: "t3-conventional-two-wall",
      label: "CoSyne archived original driver identities",
      classification: "documented-original",
      recordAvailability: "not-bundled; explicit verified records required",
      selectable: false,
      bindings: [
        COSYNE_HIGH,
        COSYNE_MID,
        COSYNE_LOW,
      ],
      evidenceRefs: ["prov-waslo-cosyne"],
      substitutionPolicy:
        "Any replacement is a new calculated adaptation with new ports and crossover.",
      manufacturingReadiness: false,
    },
    "hinson-documented-dcx464-10nw76": {
      id: "hinson-documented-dcx464-10nw76",
      familyId: "cx3-dual-diaphragm-tapped-lf",
      label: "Hinson documented DCX464 + 2 x 10NW76 identities",
      classification: "documented-build",
      recordAvailability: "not-bundled; explicit verified records required",
      selectable: false,
      bindings: [
        HINSON_DCX,
        HINSON_LOW,
      ],
      evidenceRefs: ["prov-hinson-meh-guide"],
      substitutionPolicy:
        "Changing either model requires a new coupled driver, chamber, passage, station, and crossover solve.",
      manufacturingReadiness: false,
    },
  });

  function listFamilies(options = {}) {
    const includeResearch = options.includeResearch === true;
    return deepFreeze(FAMILY_IDS
      .map((id) => FAMILIES[id])
      .filter((family) => includeResearch || family.selectable));
  }

  function listSelectableFamilies() {
    return deepFreeze(SELECTABLE_FAMILY_IDS.map((id) => FAMILIES[id]));
  }

  function getFamily(familyId) {
    const id = cleanString(familyId);
    return id && Object.prototype.hasOwnProperty.call(FAMILIES, id)
      ? FAMILIES[id]
      : null;
  }

  function listPresets(familyId = null) {
    const id = cleanString(familyId);
    return deepFreeze(PRESET_IDS
      .map((presetId) => PRESETS[presetId])
      .filter((preset) => !id || preset.familyId === id));
  }

  function getPreset(presetId) {
    const id = cleanString(presetId);
    return id && Object.prototype.hasOwnProperty.call(PRESETS, id)
      ? PRESETS[id]
      : null;
  }

  function listDriverSelections(familyId = null) {
    const id = cleanString(familyId);
    return deepFreeze(DRIVER_SELECTION_IDS
      .map((selectionId) => DRIVER_SELECTIONS[selectionId])
      .filter((selection) => !id || selection.familyId === id));
  }

  function getDriverSelection(selectionId) {
    const id = cleanString(selectionId);
    return id && Object.prototype.hasOwnProperty.call(DRIVER_SELECTIONS, id)
      ? DRIVER_SELECTIONS[id]
      : null;
  }

  function diagnostic(code, severity, paths, message, details = {}) {
    return {
      code,
      severity,
      phase: "family-driver-compatibility",
      paths: uniqueStrings(paths),
      message,
      details: clone(details),
      blocksCapabilities: severity === "error"
        ? ["analysis", "preview", "mount", "manufacturing"]
        : severity === "warning"
          ? ["analysis-ready", "mount-ready", "manufacturing"]
          : [],
    };
  }

  function orderedDiagnostics(diagnostics) {
    return diagnostics.slice().sort((left, right) =>
      [
        left.severity,
        left.code,
        left.paths.join("\u0000"),
        left.message,
      ].join("\u0001").localeCompare([
        right.severity,
        right.code,
        right.paths.join("\u0000"),
        right.message,
      ].join("\u0001")));
  }

  function normalizeBindings(bindings) {
    if (Array.isArray(bindings)) return bindings;
    if (isObject(bindings)) {
      return Object.keys(bindings).sort().map((sourceId) => {
        const value = bindings[sourceId];
        if (isObject(value) && Object.prototype.hasOwnProperty.call(
          value,
          "record",
        )) {
          return { sourceId, ...value };
        }
        return { sourceId, record: value };
      });
    }
    return null;
  }

  function usableRecordInput(value) {
    if (isObject(value) && isObject(value.record) &&
        Object.prototype.hasOwnProperty.call(value, "ok")) {
      return value.record;
    }
    return value;
  }

  function completeShape(record) {
    if (!isObject(record) || !cleanString(record.shape)) return false;
    if (record.shape === "round") {
      return Number.isFinite(record.diameterM) && record.diameterM > 0;
    }
    if (["square", "rectangle", "rounded-rectangle"].includes(record.shape)) {
      return Number.isFinite(record.widthM) && record.widthM > 0 &&
        Number.isFinite(record.heightM) && record.heightM > 0;
    }
    return false;
  }

  function completeBoltCircle(record) {
    return isObject(record) &&
      Number.isInteger(record.count) && record.count > 0 &&
      Number.isFinite(record.diameterM) && record.diameterM > 0 &&
      Number.isFinite(record.holeDiameterM) && record.holeDiameterM > 0;
  }

  function mountEvidenceReady(record) {
    const mounting = isObject(record.mounting) ? record.mounting : {};
    return !!cleanString(mounting.datum) &&
      completeShape(mounting.cutout) &&
      (completeBoltCircle(mounting.boltCircle) ||
        (Array.isArray(mounting.fasteners) && mounting.fasteners.length > 0)) &&
      completeShape(mounting.gasket);
  }

  function outputSupportsContract(record, contract) {
    const outputs = Array.isArray(record.outputs) ? record.outputs : [];
    return outputs.some((output) =>
      contract.requiredBands.every((band) =>
        Array.isArray(output.bandIds) && output.bandIds.includes(band)) &&
      contract.allowedOutputKinds.includes(output.kind));
  }

  function couplingEvidenceReady(record) {
    const coupling = isObject(record.limits) &&
      isObject(record.limits.coupling)
      ? record.limits.coupling
      : null;
    return !!coupling &&
      coupling.documented === true &&
      coupling.terminationModesDocumented === true &&
      uniqueStrings(coupling.provenanceRefs).length > 0;
  }

  function selectionIdentityDiagnostics(
    selection,
    bindingResults,
    diagnostics,
  ) {
    if (!selection) return false;
    let matches = true;
    for (const expected of selection.bindings) {
      const actual = bindingResults.find((item) =>
        item.sourceId === expected.sourceId);
      const identity = actual && actual.record
        ? {
          manufacturer: normalizedIdentity(actual.record.manufacturer),
          model: normalizedIdentity(actual.record.model),
        }
        : {};
      if (!actual ||
          identity.manufacturer !== normalizedIdentity(
            expected.recordIdentity.manufacturer,
          ) ||
          identity.model !== normalizedIdentity(
            expected.recordIdentity.model,
          )) {
        matches = false;
        diagnostics.push(diagnostic(
          FAILURE_CODES.SELECTION_IDENTITY_MISMATCH,
          "error",
          [`bindings.${expected.sourceId}.record`],
          `Driver identity does not match documented selection ${selection.id}.`,
          {
            expected: expected.recordIdentity,
            actual: actual && actual.record
              ? {
                manufacturer: actual.record.manufacturer,
                model: actual.record.model,
              }
              : null,
          },
        ));
      }
    }
    return matches;
  }

  function evaluateDriverBindings(
    familyId,
    bindings,
    options = {},
    dependencyOverride = null,
  ) {
    const family = getFamily(familyId);
    if (!family) {
      return deepFreeze({
        ok: false,
        code: FAILURE_CODES.FAMILY_UNKNOWN,
        familyId: cleanString(familyId),
        topologyCompatible: false,
        acousticInputReady: false,
        mountInputReady: false,
        manufacturingReadiness: false,
        diagnostics: [diagnostic(
          FAILURE_CODES.FAMILY_UNKNOWN,
          "error",
          ["familyId"],
          "Unknown three-way family; no fallback family was applied.",
          { availableFamilyIds: FAMILY_IDS },
        )],
        capabilities: CAPABILITIES,
      });
    }
    if (!family.selectable) {
      return deepFreeze({
        ok: false,
        code: FAILURE_CODES.FAMILY_NOT_SELECTABLE,
        familyId: family.id,
        topologyCompatible: false,
        acousticInputReady: false,
        mountInputReady: false,
        manufacturingReadiness: false,
        diagnostics: [diagnostic(
          FAILURE_CODES.FAMILY_NOT_SELECTABLE,
          "error",
          ["familyId"],
          "Research architectures require an explicit graph and cannot accept ordinary family bindings.",
        )],
        capabilities: CAPABILITIES,
      });
    }

    const supplied = normalizeBindings(bindings);
    const diagnostics = [];
    if (!supplied) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.BINDINGS_INVALID,
        "error",
        ["bindings"],
        "Bindings must be an array or an object keyed by source-group ID.",
      ));
    }
    const rows = supplied || [];
    const bySource = new Map();
    for (let index = 0; index < rows.length; index += 1) {
      const row = isObject(rows[index]) ? rows[index] : {};
      const sourceId = cleanString(row.sourceId);
      if (!sourceId || bySource.has(sourceId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.BINDINGS_INVALID,
          "error",
          [`bindings[${index}].sourceId`],
          "Every binding needs one unique source-group ID.",
        ));
        continue;
      }
      bySource.set(sourceId, { row, index });
    }

    for (const [sourceId, item] of bySource) {
      if (!family.sourceGroups.some((group) => group.id === sourceId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.BINDING_UNKNOWN,
          "error",
          [`bindings[${item.index}].sourceId`],
          `Source group ${sourceId} is not part of family ${family.id}.`,
        ));
      }
    }

    const db = dependencyOverride || defaultDriverDb;
    const canValidate = db && typeof db.validateDriverRecord === "function";
    const bindingResults = [];
    let acousticInputReady = true;
    let mountInputReady = true;

    for (const group of family.sourceGroups) {
      const item = bySource.get(group.id);
      if (!item) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.BINDING_REQUIRED,
          "error",
          [`bindings.${group.id}`],
          `Family ${family.id} requires a driver binding for ${group.id}.`,
        ));
        acousticInputReady = false;
        mountInputReady = false;
        continue;
      }
      const row = item.row;
      const count = Number(row.count);
      if (!Number.isInteger(count) || count !== group.count) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.COUNT_MISMATCH,
          "error",
          [`bindings.${group.id}.count`],
          `${group.id} requires exactly ${group.count} physical source(s).`,
          { expected: group.count, actual: Number.isFinite(count) ? count : null },
        ));
      }

      const inputRecord = usableRecordInput(row.record);
      const validation = canValidate
        ? db.validateDriverRecord(inputRecord)
        : null;
      const valid = validation && validation.ok === true;
      const record = validation ? validation.record : null;
      if (!valid) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.RECORD_INVALID,
          "error",
          [`bindings.${group.id}.record`],
          "A complete valid threeway-driver-db record is required.",
          {
            driverDiagnostics: validation ? validation.diagnostics : [],
            dependencyAvailable: !!canValidate,
          },
        ));
        acousticInputReady = false;
        mountInputReady = false;
        bindingResults.push({
          sourceId: group.id,
          count: Number.isFinite(count) ? count : null,
          record,
          recordValid: false,
          topologyCompatible: false,
          acousticInputReady: false,
          mountInputReady: false,
        });
        continue;
      }

      const contract = group.recordRequirements;
      let topologyCompatible = true;
      if (!contract.allowedKinds.includes(record.kind)) {
        topologyCompatible = false;
        diagnostics.push(diagnostic(
          FAILURE_CODES.KIND_UNSUPPORTED,
          "error",
          [`bindings.${group.id}.record.kind`],
          `${record.kind} is not a supported driver kind for ${group.id}.`,
          { allowedKinds: contract.allowedKinds },
        ));
      }
      const missingBands = contract.requiredBands.filter((band) =>
        !record.bandIds.includes(band));
      if (missingBands.length > 0) {
        topologyCompatible = false;
        diagnostics.push(diagnostic(
          FAILURE_CODES.BAND_UNSUPPORTED,
          "error",
          [`bindings.${group.id}.record.bandIds`],
          `${group.id} record is missing required bands: ${missingBands.join(", ")}.`,
        ));
      }
      if (!outputSupportsContract(record, contract)) {
        topologyCompatible = false;
        diagnostics.push(diagnostic(
          FAILURE_CODES.OUTPUT_UNSUPPORTED,
          "error",
          [`bindings.${group.id}.record.outputs`],
          `${group.id} needs one explicit compatible acoustic output owning all required bands.`,
          {
            requiredBands: contract.requiredBands,
            allowedOutputKinds: contract.allowedOutputKinds,
          },
        ));
      }

      const acousticEvidence = topologyCompatible &&
        (!contract.requireThieleSmall ||
          validation.readiness.thieleSmall === true) &&
        (!contract.requireLumpedTerms ||
          validation.readiness.lumpedDriverTerms === true) &&
        (!contract.requireExcursion ||
          validation.readiness.excursion === true);
      if (topologyCompatible && !acousticEvidence) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.ACOUSTIC_EVIDENCE_INCOMPLETE,
          "warning",
          [`bindings.${group.id}.record.ts`],
          `${group.id} has topology compatibility but lacks required explicit driver terms for coupled analysis.`,
          {
            readiness: validation.readiness,
            requirements: {
              thieleSmall: contract.requireThieleSmall,
              lumpedDriverTerms: contract.requireLumpedTerms,
              excursion: contract.requireExcursion,
            },
          },
        ));
      }
      const couplingEvidence = !contract.requireCouplingEvidence ||
        couplingEvidenceReady(record);
      if (topologyCompatible && !couplingEvidence) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.COUPLING_EVIDENCE_INCOMPLETE,
          "warning",
          [`bindings.${group.id}.record.limits.coupling`],
          `${group.id} needs documented inter-diaphragm coupling and termination modes.`,
        ));
      }
      const mounting = mountEvidenceReady(record);
      if (topologyCompatible && !mounting) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_EVIDENCE_INCOMPLETE,
          "warning",
          [`bindings.${group.id}.record.mounting`],
          `${group.id} lacks complete cutout, fastener/bolt-circle, and gasket evidence for a driver plate.`,
          { requiredFields: contract.mountPlanningFields },
        ));
      }

      const rowAcousticReady = acousticEvidence && couplingEvidence;
      acousticInputReady = acousticInputReady && rowAcousticReady;
      mountInputReady = mountInputReady && topologyCompatible && mounting;
      bindingResults.push({
        sourceId: group.id,
        count,
        record,
        recordValid: true,
        topologyCompatible,
        acousticInputReady: rowAcousticReady,
        mountInputReady: topologyCompatible && mounting,
      });
    }

    const selectionId = cleanString(options.selectionId);
    const selection = selectionId ? getDriverSelection(selectionId) : null;
    let selectionMatched = null;
    if (selectionId && !selection) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SELECTION_UNKNOWN,
        "error",
        ["options.selectionId"],
        "Unknown documented driver selection.",
        { availableSelectionIds: DRIVER_SELECTION_IDS },
      ));
      selectionMatched = false;
    } else if (selection && selection.familyId !== family.id) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SELECTION_FAMILY_MISMATCH,
        "error",
        ["options.selectionId", "familyId"],
        `Selection ${selection.id} belongs to ${selection.familyId}, not ${family.id}.`,
      ));
      selectionMatched = false;
    } else if (selection) {
      selectionMatched = selectionIdentityDiagnostics(
        selection,
        bindingResults,
        diagnostics,
      );
    }

    const ordered = orderedDiagnostics(diagnostics);
    const topologyCompatible = !ordered.some((item) =>
      item.severity === "error");
    return deepFreeze({
      ok: topologyCompatible,
      code: topologyCompatible ? null : FAILURE_CODES.BINDINGS_INVALID,
      familyId: family.id,
      topology: family.topology,
      selectionId,
      selectionMatched,
      bindings: bindingResults.sort((left, right) =>
        left.sourceId.localeCompare(right.sourceId)),
      topologyCompatible,
      acousticInputReady: topologyCompatible && acousticInputReady,
      mountInputReady: topologyCompatible && mountInputReady,
      exactGeometryPassed: false,
      manufacturingReadiness: false,
      manufacturing: false,
      stl: false,
      diagnostics: ordered,
      capabilities: CAPABILITIES,
    });
  }

  function serializeFamily(familyId) {
    const family = getFamily(familyId);
    return family
      ? `${SERIALIZATION_VERSION}\n${stableStringify(family)}`
      : null;
  }

  function serializeCatalog() {
    return `${SERIALIZATION_VERSION}\n${stableStringify({
      families: FAMILY_IDS.map((id) => FAMILIES[id]),
      presets: PRESET_IDS.map((id) => PRESETS[id]),
      selections: DRIVER_SELECTION_IDS.map((id) => DRIVER_SELECTIONS[id]),
      provenance: PROVENANCE,
    })}`;
  }

  return deepFreeze({
    catalogVersion: CATALOG_VERSION,
    serializationVersion: SERIALIZATION_VERSION,
    familyIds: FAMILY_IDS,
    selectableFamilyIds: SELECTABLE_FAMILY_IDS,
    presetIds: PRESET_IDS,
    driverSelectionIds: DRIVER_SELECTION_IDS,
    bandIds: BAND_IDS,
    failureCodes: FAILURE_CODES,
    capabilities: CAPABILITIES,
    provenance: PROVENANCE,
    families: FAMILIES,
    presets: PRESETS,
    driverSelections: DRIVER_SELECTIONS,
    listFamilies,
    listSelectableFamilies,
    getFamily,
    listPresets,
    getPreset,
    listDriverSelections,
    getDriverSelection,
    evaluateDriverBindings,
    serializeFamily,
    serializeCatalog,
    stableStringify,
  });
}));
