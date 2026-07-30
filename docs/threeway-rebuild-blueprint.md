# Three-way MEH Studio ground-up rebuild blueprint

Status: architecture and migration plan only
Prepared: 2026-07-30
Inputs: `threeway-core.js`, `threeway-research-manifest.md`,
`threeway-build-visual-ledger.md`, and the legacy three-way paths in
`engine.js` / `shell.html`

## Executive decision

The current three-way implementation is not a base to extend. It is an
analysis preview assembled from a flat, mutable state and several one-/two-way
geometry shortcuts. Keep it contained for the current release, then replace it
behind a new state schema and module boundary.

The replacement must model four different architectures without pretending
that they are interchangeable:

| Stable ID | Product label | Physical architecture | Manufacturing intent |
|---|---|---|---|
| `T3` | three-station shared horn | Separate HF throat source, MF wall entries, and LF wall entries in one horn | Eventual, topology-specific |
| `CX3` | coax-throat three-band shared horn | A dual-diaphragm/coaxial throat module supplies electrical MF and HF at one physical throat interface; cone LF enters downstream | Eventual, topology-specific |
| `H3` | hybrid three-way system | MF/HF share a horn; LF is direct-radiating or enters another acoustic structure outside that shared horn | Analysis and cabinet integration; never represented as a full three-band MEH |
| `COMPOUND_RESEARCH` | compound research topology | Tapped LF, layered/parallel HF combiner, multiple throat modules, or another graph not expressible as `T3`, `CX3`, or `H3` | Research only until a separately validated solver and solid system exists |

These identifiers describe source/station graphs, not brands. CoSyne is a
documented `T3` reference. The Hinson/DCX464 arrangement is a documented
`CX3` reference. Yorkville U15 and Small Syns are `H3` references. A
Jericho-class system is `COMPOUND_RESEARCH`. Commercial photographs and
envelopes remain reference evidence and never become hidden geometry.

**Manufacturing and STL export remain unavailable for every new three-way
topology until a connected, watertight Boolean topology has passed the
topology-specific gates in this document.** A convincing preview, a manifold
edge count on an uncut shell, or a set of decorative tubes is not sufficient.

## Why the existing path must be replaced

`threeway-core.js` is the correct seed boundary: it is pure, immutable,
provenance-aware, and explicitly refuses manufacturing. It currently
normalizes a generic shared-horn input and evaluates path, phase,
quarter-wave-null, and explicit aperture/local-area ratios. It is not yet
assembled into the application and does not own UI, placement, mounts,
passages, rendering, solids, or export.

The live three-way implementation still resides in the monolithic `MEH2`
engine:

- `layout()` mutates `S.dialectM`, `S.dialectW`, and `S.fxDerived`.
- Driver frames are placed first at the earliest station that fits, then both
  crossovers are derived from those seat coordinates.
- `xM`, `xW`, `nM`, `nW`, `npM`, and `npW` are implicit conventions rather
  than an explicit source/station graph.
- `acoustics()` creates LF and MF aperture records from different historical
  assumptions, including archived reference areas and a velocity heuristic.
- `evaluate()` combines evidence, acoustic diagnostics, fit, package,
  rendering assumptions, and grow-the-mouth behavior into one mutable loop.
- `response()` is a normalized preview ladder, not a validated three-band
  electroacoustic solver.
- `shellMesh()` / `tapCutters()` are legacy split exports, not a Boolean-union
  of horn, solid mounts, chambers, and connected negative acoustic lumens.
- The Three.js path in `shell.html` constructs a throat annulus, dark bore
  disc, tap skirts/caps, seats, boards, and driver bodies independently from
  the export solid. That is why visual continuity has not implied physical
  continuity.
- STL refusal currently begins in the button handler. The deeper
  manufacturing API is still `MEH2` and is not topology-capability based.

The rebuild therefore treats the legacy path as an input reference and
regression corpus, not as the new implementation.

## Exact legacy containment and removal map

### `engine.js`

| Current symbol/path | Three-way behavior to isolate | Replacement / final disposition |
|---|---|---|
| `profile()` and `stations()` | Shared horn surface is generated from flat `S`; topology-specific assumptions leak through `S.topo` and style branches | Extract/read through `horn-surface-core.js`. The new three-way solver consumes an immutable `HornSurface` value. No three-way state mutation is permitted in this layer. |
| `dimsAt()`, `surfPt()`, `surfN()`, `areaAt()`, section/facet helpers | Useful canonical surface math, but currently obtained through a mutable legacy station object | Retain as shared math after extraction and wrap with a versioned `HornSurfaceAdapter`. |
| `ringSeats()`, `pairSeats()`, `ringSeatsAngular()`, `seatsFor()`, `xForSeats()` | Implicit placement dialect and first-fit station search | Do not call from new three-way code. Replace with topology-aware station interval and source packing solvers. General low-level packing primitives may be extracted only after tests prove they are topology-neutral. |
| `layout()` at its `S.topo==='3way'` branches | Invents MF mode, MF/LF order, positions, pair rotation, mount normals, and derived crossovers; mutates the caller | Freeze for legacy preview, then delete all three-way branches. Replace with `solveEntryStations()` and `solveSourceMounts()` returning immutable results. |
| `acoustics()` three-way `kinds` records and slot mutation | Adds `d.slot` to layout objects and mixes documented, archived, and heuristic area laws | Freeze, then remove three-way use. Replace with explicit `ApertureNetwork` and `FrontChamberNetwork` calculations whose law and source are recorded per output. |
| `boxCalc()` three-way use | Infers package from simplified cylinders and the same layout | Retain only as a legacy estimate. New package solver consumes complete per-driver envelope records and solved mount frames. |
| `evaluate()` three-way rows | Mixed truth levels; grows mouth using flags on report rows; relies on mutable `fxDerived` | Freeze, then stop routing three-way states through it. New diagnostics are typed outputs of named solver phases; mouth growth is an explicit candidate transaction. |
| `response()` with `hasM` | Normalized ladder with geometry-derived crossover values | Mark `legacy-preview`; do not show it in the rebuilt UI. Replace with a separately versioned analysis model, and label simulation fidelity explicitly. |
| `adapt()` / `solve()` for `topo:'3way'` | Repeated mutation and mouth growth around the monolithic evaluator | New three-way state never enters these functions. Use pure `solveThreeWay(input, options)`. |
| `shellMesh()` / `shellMeshCore()` | Can emit a shell and cut report but not the required integrated three-way assembly | Never authorize new three-way manufacturing. A future solid-field module must build host solids first and subtract canonical lumens. |
| `tapCutters()` | Produces separate negative tools with no proof of union through chamber, mount, wall, and horn surface | Keep only for legacy diagnostics. It cannot satisfy a manufacturing gate. |
| `hornrespME()` | Reads legacy layout/state directly and is now known to disagree with the audited King 2026 records: the source maps LF to `ME2`, MF to `ME1`, and the real HF driver to `Nd`, while the legacy routine reverses the entry records and uses a dummy `Nd`; horn direction, units, and `Vtc`/`Atc`/`Ap`/`Lrc` ownership also differ | Quarantine it in Build 653. Move the replacement behind `threeway-analysis-export.js`; dispatch by topology. Permit `T3` only after complete inputs and a source-pinned round-trip fixture proves record ownership, direction, units, and every field mapping. `CX3`, `H3`, and compound topologies require different records/graphs and must refuse until implemented. |
| `BUILDS['3way']` | Mixes house archetypes, documented topology, commercial envelopes, stand-ins, and inferred geometry in executable presets | Remove from `MEH2.BUILDS`. Split into provenance-bearing `referenceCards` and solver-checked `calculatedStarts`. Commercial envelopes may seed intent only, never internal dimensions. |
| public `MEH2` exports | Makes legacy three-way functions look like a supported common engine | New UI must import `MEH3`; do not add manufacturing functions to `MEH3` until their gates pass. |

### `shell.html`

| Current path | Problem | Replacement / final disposition |
|---|---|---|
| `S.topo='3way'` plus flat fields (`mPre`, `nM`, `odM`, `dpM`, `fxHi`, `fxLo`, `npM`, `shM`, and shared LF/CD fields) | Field names encode one implicit `T3`; derived and user-owned values coexist | New storage key and immutable schema. The legacy flat fields are accepted only by an explicit, lossy import wizard. |
| `#segTopo` three-way button | Selects only the ambiguous string `3way` | Open a topology chooser for `T3`, `CX3`, `H3`, or research mode. |
| `#midCtl` | Shows one driver/count/shape group for every three-way architecture | Replace with topology-generated source and entry-station editors. `CX3` has no separate cone-MF station; `H3` has no LF shared-horn station. |
| `buildTbl()`, `matchBuild()`, `syncBuilds()`, `applyBuild()` | Treats legacy three-way builds as executable geometry bundles | New reference-card and calculated-start registries. Applying a card creates an unsolved candidate and never promotes envelope evidence to geometry. |
| generic `wire()` / `applyAdaptiveState()` bindings | Sends three-way changes into the two-way/legacy adaptation loop | Add a dedicated `threeway-controller.js` with reducer actions and transactional solve requests. |
| `rebuild()` calling `MEH2.solve(S)` | Every three-way preview begins in the legacy solver | Dispatch new states exclusively to `MEH3.solveThreeWay()`. During migration, the old route remains visibly `LEGACY ANALYSIS PREVIEW`. |
| manual three-way throat annulus/bore branch near the current `S.topo==='3way'` render block | Creates non-authoritative geometry independently of any solid model | Delete after a topology-neutral render DTO exists. |
| generic non-two-way driver/tap/seat loop | Draws dark caps, skirts, boards, seats, and drivers from separate objects; it can depict disconnected parts | Do not use for rebuilt three-way. Renderer consumes only `ThreeWayRenderModel`; inspection volumes are labeled and never masquerade as solids. |
| `drawReports()` and `drawResponse()` | Read legacy `ev.layout`, `S.fxDerived`, and normalized response | Replace with topology-aware report sections and explicit simulation fidelity. |
| `save()` to `meh5_state` | Allows a flat three-way state to persist beside two-way schema fields | New key `meh5_threeway_state_v2`. Never auto-translate a legacy three-way state into manufacturing-capable state. |
| `threeWayHornrespPreflight()` | Calls the conventional legacy exporter for every value named `3way` | Replace with topology-dispatched analysis-export capability checks. |
| `paintThreeWayContainment()` | Correct UI containment, but not the authoritative lower-level gate | Retain during migration. Final UI reads capability tokens returned by the core; it does not invent capability. |
| `#bStl` handler refusal | UI-only early return | Keep as defense in depth. The authoritative export facade and every worker must also reject absent capability tokens. |
| `#bHrn` handler | Assumes all three-way systems export `ME1`, `ME2`, `Nd` in one ordering | Dispatch by topology and record format; fail closed for unimplemented mappings. |

### Assembly and workers

`assemble.js` currently inlines profile laws, `engine.js`, `twoway-core.js`, and
CAD. Add a dedicated `/*__THREEWAY__*/` marker and inline the three-way bundle
after the shared horn math and before UI code. Do not merge the new code into
the `MEH2` object. Any future exact-solid work runs in a dedicated
`threeway-solid-worker.js`; it must not share the two-way worker cache or
manufacturing capability.

## Immutable state contract

All persisted values use SI units. Display units are a UI concern. The input
state contains user intent and evidence; derived values exist only in a
solution. Every input and output is deeply frozen in development/test builds.

```js
{
  schemaVersion: 2,
  designId: "uuid",
  revision: 17,
  topology: {
    kind: "T3", // T3 | CX3 | H3 | COMPOUND_RESEARCH
    schemaVersion: 1
  },
  intent: {
    crossoversHz: { lowMid: 320, midHigh: 1250 },
    systemLowEdgeHz: 70,
    coverageDeg: { horizontal: 90, vertical: 60 },
    mouthLimitM: { width: 0.80, height: 0.60 },
    packageLimitM: { width: null, height: null, depth: null },
    optimization: "balanced" // compact | balanced | low-distortion
  },
  horn: {
    surfaceLaw: {
      family: "conical", // shared profile-law ID
      parameters: {}
    },
    crossSection: {
      family: "superellipse",
      parameters: { exponent: 6 }
    },
    throatInterfaceId: "if-hf-1",
    mouth: { widthM: 0.72, heightM: 0.48 },
    wall: { nominalThicknessM: 0.008 },
    termination: { kind: "flat-baffle" }
  },
  sources: [
    {
      id: "src-hf",
      bandIds: ["high"],
      role: "throat-source",
      driverRef: "driver-db-id",
      count: 1,
      electrical: { polarity: 1 },
      acousticDatum: { kind: "diaphragm", offsetM: 0.061 },
      envelopeRef: "envelope-id",
      tsRef: "ts-id",
      provenanceRefs: ["prov-driver-sheet"]
    }
  ],
  interfaces: [
    {
      id: "if-hf-1",
      kind: "throat",
      sourceIds: ["src-hf"],
      bandIds: ["high"],
      geometry: { shape: "round", areaM2: 0.00096 },
      provenanceRefs: ["prov-driver-sheet"]
    }
  ],
  entryStations: [
    {
      id: "station-mf",
      role: "wall-entry",
      sourceIds: ["src-mf"],
      bandIds: ["mid"],
      order: 1,
      axial: {
        mode: "solve", // solve | bounded-override | documented-lock
        requestedM: null,
        boundsM: null
      },
      distribution: {
        symmetry: "rotational",
        placementFamily: "panel-pairs",
        rotationRad: null
      },
      apertures: {
        countPerSource: 2,
        shape: "racetrack",
        summedAreaMode: "solve",
        summedAreaM2: null,
        spacingMode: "solve"
      },
      frontChamber: {
        mode: "solve",
        volumeM3: null
      },
      passages: {
        pathFamily: "short-swept",
        lengthMode: "solve",
        targetLengthM: null
      },
      mountPolicy: {
        axis: "wall-normal",
        construction: "integrated-solid"
      },
      provenanceRefs: []
    }
  ],
  rearSystems: [],
  provenance: {
    records: [
      {
        id: "prov-driver-sheet",
        classification: "documented",
        sourceUrl: "...",
        title: "...",
        publicationRevision: "...",
        accessedAt: "2026-07-30",
        sha256: "...",
        valuePaths: ["sources[src-hf].driverRef"],
        license: { redistribution: "unknown" }
      }
    ]
  },
  research: {
    notes: [],
    referenceCardIds: []
  }
}
```

### Topology invariants

The topology registry validates the source graph before any geometry solve.

- `T3`: exactly one HF throat interface; at least one MF wall-entry station;
  at least one LF wall-entry station; station order is throat, MF, LF; all
  three bands radiate through the same horn mouth.
- `CX3`: one coaxial throat interface carries distinct `mid` and `high`
  electrical bands; one or more LF wall-entry stations follow it; there is no
  fabricated cone-MF wall station.
- `H3`: MF and HF share a horn interface/volume; LF is explicitly marked
  `external-to-shared-horn`. LF must not appear in `entryStations` for that
  horn.
- `COMPOUND_RESEARCH`: supplies an explicit directed acoustic graph. No
  assumed station order, Hornresp mapping, renderer, solid, or export exists
  unless a named compound subtype provides it.

The term “three-way” always refers to three electrical bands. The source count,
physical driver count, interface count, and entry-station count are separate
fields. This prevents a dual-diaphragm compression driver from being
misrepresented as a separate cone-mid station.

### `entryStations` model

`entryStations` is the authoritative relationship between acoustic sources
and the shared horn. It replaces `xM`, `xW`, `dialectM`, `dialectW`, and
per-band fields scattered across `S`.

Each solved station contains:

- `stationId`, `sourceIds`, `bandIds`, and topology role;
- legal axial interval and the reason for every bound;
- selected wall coordinates on the canonical horn surface;
- canonical local frame `(normal, axialTangent, crossTangent)`;
- aperture instances and a summed area;
- one connected centerline/path per aperture from chamber to horn surface;
- chamber volume, passage inertance inputs, and predicted first resonances;
- per-source acoustic path to a declared common datum;
- driver face, active-cone region, gasket, fastener, and full body envelope;
- evidence classification for every locked value;
- a stable hash used by the renderer, solver report, and eventual solid plan.

MF and LF may never be inferred merely from array order. All consumers key by
station/source/band IDs.

## Solution contract

`solveThreeWay(input, options)` returns a frozen `ThreeWaySolution` and never
mutates `input`:

```js
{
  schemaVersion: 2,
  inputHash: "...",
  topologyGraph: {},
  hornSurface: {},
  solvedSources: [],
  solvedEntryStations: [],
  acousticNetwork: {},
  package: {},
  renderModel: null,
  manufacturingPlan: null,
  diagnostics: [],
  phaseResults: [],
  capabilities: {
    analysis: true,
    responsePreview: false,
    hornrespExport: false,
    renderPreview: false,
    manufacturingPlan: false,
    exactSolid: false,
    stlExport: false
  }
}
```

Capabilities are outputs, not UI flags. A capability can only transition to
true when its phase and topology-specific gates pass. The UI, renderer,
workers, reports, and exporters all consume the same solution hash and
capability record.

## Module boundaries

1. **`threeway-core.js`**
   Public facade, schemas, deep-freeze helpers, normalization, equation
   catalog, diagnostics, and capability refusal. Extend the current Stage 1
   module; do not import `engine.js`, Three.js, DOM code, or solid code.

2. **`threeway-topologies.js`**
   Registry for `T3`, `CX3`, `H3`, and `COMPOUND_RESEARCH`; validates source,
   interface, band, and station graphs. It contains no brand presets.

3. **`threeway-provenance.js`**
   Value-level evidence records, source hashes, conflict preservation, and
   promotion rules. An envelope study can seed package intent but cannot
   become a documented aperture.

4. **`horn-surface-core.js` / `threeway-horn-adapter.js`**
   Versioned, topology-neutral horn station/surface API. It may reuse proven
   profile/section laws after extraction, but returns immutable surface
   records and canonical frames.

5. **`threeway-driver-db.js`**
   Driver geometry, full body envelopes, diaphragm datums, T/S, limits, and
   source provenance. Missing fields remain unavailable.

6. **`threeway-acoustics.js`**
   Wavelength, local flare/load constraints, aperture ratios, chamber/passage
   lumped model, reflection notches, source spacing, acoustic path/phase, and
   topology-aware crossover checks.

7. **`threeway-station-solver.js`**
   Produces legal station intervals, solves order and packing, and returns
   explicit refusal causes. It never changes crossover intent to fit drivers.

8. **`threeway-aperture-solver.js`**
   Solves aperture count/area/shape/spacing within acoustic and structural
   bounds. A visual shape is never created without a matching acoustic record.

9. **`threeway-passage-solver.js`**
   Creates canonical lumen centerlines and sections from cone-side chamber to
   horn-side aperture; evaluates effective length, area progression,
   inertance, resonance, and path spread.

10. **`threeway-mount-solver.js`**
    Solid-host intent, driver face/axis, active-cone coverage, gasket,
    fasteners, clearances, and complete driver envelope packing. It returns
    geometry intent, not Three.js nodes.

11. **`threeway-package-solver.js`**
    Horn, mount, driver, rear-volume, access, and enclosure bounds.

12. **`threeway-solver.js`**
    Orchestrates pure phases and candidate search. It is the only public solve
    entry point.

13. **`threeway-analysis-export.js`**
    Provenance-bearing JSON report and topology-specific Hornresp mappings.
    Analysis export is independent from manufacturing export.

14. **`threeway-render-model.js`**
    Converts a solved analysis record into a topology-neutral render DTO. It
    may emit labeled inspection volumes, axes, and bounds. It cannot invent
    dimensions or declare material.

15. **`threeway-renderer.js`**
    Three.js-only adapter. It consumes the render DTO and owns no acoustic or
    manufacturing math.

16. **`threeway-solid-field.js`** *(future, capability false initially)*
    Builds exact positive host solids and canonical negative volumes from one
    `ManufacturingPlan`. It has no UI or Three.js dependency.

17. **`threeway-solid-worker.js`** *(future)*
    Runs exact Boolean construction under explicit memory/time budgets.

18. **`threeway-fabrication-audit.js`** *(future)*
    Connectivity, two-manifoldness, watertightness, components, orientation,
    self-intersection, minimum web, trapped volumes, and assembly contact.

19. **`threeway-manufacturing-export.js`** *(future)*
    Requires a signed-in-memory capability token containing solution hash,
    solid hash, topology implementation revision, and passing audit hash.
    Without it, all export calls return
    `THREEWAY_MANUFACTURING_UNAVAILABLE`.

20. **`threeway-controller.js` / `threeway-panel.html`**
    Reducer-driven UI. A change creates a candidate state, solves it, and
    atomically commits only the new input state—not derived solution fields.

## Solver phases

Each phase is pure and emits typed diagnostics. A later phase cannot erase or
soften an earlier failure.

1. **Schema and provenance normalization**
   Validate SI values, IDs, revisions, evidence classes, driver records, and
   source conflicts. No defaults derived from photographs or product names.

2. **Topology graph validation**
   Construct bands → sources → interfaces → entry stations → radiation
   volumes. Enforce `T3` / `CX3` / `H3` invariants before geometry.

3. **Horn surface solve**
   Resolve profile and cross-section into one canonical station/surface API.
   Verify monotonic area, endpoint contracts, section continuity, and mouth
   bounds.

4. **Driver and interface feasibility**
   Validate operating bands, throat/interface dimensions, full body
   envelopes, active cone areas, acoustic datums, T/S completeness, and
   declared limits.

5. **Per-band acoustic bounds**
   For each intended crossover, calculate wavelength, quarter-wave/reflection
   bounds, local one-wavelength circumference/area bound, local expansion
   lower-edge bound, source-spacing limits, and preliminary aperture-area
   range. The result is a reasoned axial interval, not one point.

6. **Coupled entry-station solve**
   Search legal intervals while enforcing topology order, frame/body packing,
   aperture footprint, wall/seam/web constraints, and station-to-station
   clearance. Search is deterministic and bounded. It returns candidates
   ranked by the explicit optimization intent.

7. **Aperture/chamber/passage solve**
   Jointly solve summed aperture area, count, shape, spacing, chamber
   compliance, passage mass, area progression, effective length, and
   predicted low-pass/resonance. Long passages are penalized and reported, not
   treated as free connectors.

8. **Mount and package solve**
   Create solid-host intent around each driver, subtractive ownership, mount
   axes, cone clearance, gasket/fasteners, complete body collisions, rear
   systems, service access, and enclosure growth requirements.

9. **Acoustic path and phase solve**
   Calculate every source path to a common datum, within-source spread,
   adjacent-band phase, first reflection notch, passage delay, and required
   DSP delay/polarity. Geometry and electrical crossover are solved together;
   neither is silently overwritten by the other.

10. **Analysis network and export readiness**
    Build the topology-specific lumped/Hornresp graph only when its inputs are
    complete. Simulation outputs retain model version and fidelity.

11. **Render DTO**
    Produce horn surface, source envelopes, host-body intent, lumen inspection
    volumes, datums, and warnings from the solved hash. Analysis preview may
    become available here.

12. **Manufacturing plan** *(future)*
    Available only for a topology whose exact-positive and exact-negative
    construction is implemented. A plan is still not a solid or export.

13. **Exact Boolean and fabrication audit** *(future)*
    Construct and audit. Only this phase can mint exact-solid and STL
    capabilities.

## Positive solids and canonical negative volumes

The eventual solid system must use one source of truth:

1. Build horn wall, throat interface, structural driver hosts, chambers,
   mounting lands, reinforcement, and declared joints as positive solids.
2. Build driver clearances, cone reliefs, canonical acoustic lumens,
   fasteners, gasket grooves, and service clearances as typed negative
   volumes.
3. Each acoustic lumen is one connected negative volume derived from the same
   passage record used by the acoustic solver.
4. Subtract each lumen through chamber boundary, mount, horn wall, and inner
   acoustic surface.
5. Union positive hosts to the horn where the construction contract requires
   one printed body.
6. Audit the result and separately audit every acoustic void.

The renderer can display the same lumen as an inspection volume, but a render
volume is never production authority. Production authority is the audited
solid field.

## Stable failure codes

Diagnostics have `{code, severity, phase, paths, message, evidenceRefs,
blocksCapabilities}`. UI text may change; codes do not.

### Schema, topology, and provenance

- `THREEWAY_SCHEMA_UNSUPPORTED`
- `THREEWAY_TOPOLOGY_REQUIRED`
- `THREEWAY_TOPOLOGY_UNSUPPORTED`
- `THREEWAY_TOPOLOGY_GRAPH_INVALID`
- `THREEWAY_BAND_SOURCE_MISSING`
- `THREEWAY_SOURCE_ROLE_INVALID`
- `THREEWAY_INTERFACE_CONFLICT`
- `THREEWAY_PROVENANCE_REQUIRED`
- `THREEWAY_PROVENANCE_CLASS_UNKNOWN`
- `THREEWAY_PROVENANCE_CONFLICT`
- `THREEWAY_ENVELOPE_PROMOTION_REFUSED`

### Crossovers, drivers, and horn

- `THREEWAY_CROSSOVER_REQUIRED`
- `THREEWAY_CROSSOVER_ORDER_INVALID`
- `THREEWAY_DRIVER_RECORD_INCOMPLETE`
- `THREEWAY_DRIVER_BAND_UNSUPPORTED`
- `THREEWAY_DRIVER_ENVELOPE_INCOMPLETE`
- `THREEWAY_THROAT_INTERFACE_MISMATCH`
- `THREEWAY_HORN_PROFILE_REFUSED`
- `THREEWAY_HORN_AREA_NONMONOTONIC`
- `THREEWAY_MOUTH_LIMIT_EXCEEDED`

### Stations, apertures, and passages

- `THREEWAY_ENTRY_STATION_REQUIRED`
- `THREEWAY_ENTRY_STATION_ORDER_INVALID`
- `THREEWAY_ENTRY_STATION_INTERVAL_EMPTY`
- `THREEWAY_LOCAL_FLARE_BOUND_FAILED`
- `THREEWAY_LOCAL_WAVELENGTH_AREA_BOUND_FAILED`
- `THREEWAY_APERTURE_AREA_UNSOLVABLE`
- `THREEWAY_APERTURE_SPACING_EXCEEDED`
- `THREEWAY_APERTURE_FOOTPRINT_OUTSIDE_HOST`
- `THREEWAY_STRUCTURAL_WEB_INSUFFICIENT`
- `THREEWAY_PASSAGE_DISCONNECTED`
- `THREEWAY_PASSAGE_AREA_NONMONOTONIC`
- `THREEWAY_PASSAGE_TOO_LONG`
- `THREEWAY_PASSAGE_RESONANCE_IN_BAND`
- `THREEWAY_CHAMBER_NETWORK_UNSOLVABLE`

### Mount, package, path, and analysis

- `THREEWAY_MOUNT_HOST_UNSOLVABLE`
- `THREEWAY_ACTIVE_CONE_COVERAGE_FAILED`
- `THREEWAY_DRIVER_COLLISION`
- `THREEWAY_DRIVER_OUTSIDE_PACKAGE`
- `THREEWAY_REAR_SYSTEM_INCOMPLETE`
- `THREEWAY_PATH_SPREAD_EXCEEDED`
- `THREEWAY_ADJACENT_PHASE_EXCEEDED`
- `THREEWAY_REFLECTION_NULL_MARGIN_FAILED`
- `THREEWAY_ANALYSIS_MODEL_UNAVAILABLE`
- `THREEWAY_HORNRESP_MAPPING_UNAVAILABLE`
- `THREEWAY_HORNRESP_INPUT_INCOMPLETE`

### Rendering and manufacturing

- `THREEWAY_RENDER_MODEL_UNAVAILABLE`
- `THREEWAY_RENDER_HASH_MISMATCH`
- `THREEWAY_MANUFACTURING_UNAVAILABLE`
- `THREEWAY_MANUFACTURING_PLAN_UNAVAILABLE`
- `THREEWAY_BOOLEAN_ENGINE_UNAVAILABLE`
- `THREEWAY_BOOLEAN_OPERATION_FAILED`
- `THREEWAY_SOLID_HASH_MISMATCH`
- `THREEWAY_SOLID_NOT_CONNECTED`
- `THREEWAY_SOLID_NOT_WATERTIGHT`
- `THREEWAY_SOLID_NONMANIFOLD`
- `THREEWAY_SOLID_SELF_INTERSECTION`
- `THREEWAY_SOLID_MIN_WEB_FAILED`
- `THREEWAY_LUMEN_NOT_THROUGH_ALL_LAYERS`
- `THREEWAY_LUMEN_WRONG_TERMINATION`
- `THREEWAY_LUMEN_COMPONENT_COUNT_FAILED`
- `THREEWAY_ASSEMBLY_CONTACT_FAILED`
- `THREEWAY_STL_CAPABILITY_REQUIRED`

## Provenance contract

The rules in the research manifest and visual ledger are executable policy:

- Every locked value has one or more provenance records.
- `documented`, `calculated-adaptation`, `envelope-study`, and `adjacent`
  remain distinct.
- Values inferred from images are research notes, not solver inputs.
- Conflicting source revisions are stored side by side and surfaced.
- A calculated substitution creates a new calculated design. It does not
  inherit a documented build's name or validation.
- Reference cards contain links and observations; they are not geometry
  bundles.
- Source title, author/organization, URL, access date, revision, file hash,
  units, value paths, classification, and redistribution status are retained.
- Patent publications are technical provenance, not a freedom-to-operate
  opinion.

## Migration sequence

### Stage 0 — ship and freeze the contained legacy release

- Keep `ANALYSIS PREVIEW — NOT MANUFACTURING GEOMETRY`.
- Keep STL refusal. Keep legacy Hornresp export disabled even with complete
  T/S until a topology-specific, source-pinned record mapping passes a
  round-trip fixture.
- Tag current screenshots, solver outputs, and known failures as a legacy
  regression corpus.
- Do not add new three-way geometry features to `engine.js`.

### Stage 1 — foundation

- Extend `threeway-core.js` to schema 2.
- Add the topology and provenance registries.
- Add the `/*__THREEWAY__*/` assembly marker.
- Continue returning manufacturing refusal unconditionally.

Gate: pure Node tests pass, input remains unmodified, no DOM/Three.js/MEH2
imports, and all four topology graphs classify correctly.

### Stage 2 — analysis-only solver

- Implement horn adapter, source validation, station intervals, coupled
  placement, apertures, chambers, passages, mounts, paths, and package.
- Start with `T3`; add `CX3`; add `H3`; keep compound explicit-graph research
  analysis separate.
- Export a provenance-bearing JSON design report.

Gate: no hidden legacy state access; every result is reproducible from input
hash; missing data remains unavailable; cross-topology fixtures cannot pass
under the wrong topology.

### Stage 3 — rebuilt UI and renderer

- Add topology chooser and topology-generated controls.
- Persist only `meh5_threeway_state_v2`.
- Build a render DTO and renderer with labeled analysis/inspection volumes.
- Do not display cosmetic materials as an exact solid.

Gate: state round-trip, UI/control relevance, render hash parity, camera
stability, no stale nodes/resources, and visual ledgers pass for all supported
topologies.

### Stage 4 — topology-specific analysis export

- Implement and verify `T3` Hornresp mapping.
- Implement `CX3` or `H3` mappings only if their actual model/record format is
  established.
- Compound research remains JSON/report only.

Gate: exported records round-trip against fixtures; missing T/S refuses;
source/station ordering is topology-derived rather than array-derived.

### Stage 5 — exact solid research, capability still false

- Implement positive hosts, canonical negative lumens, Boolean worker, and
  fabrication audit for one topology and one construction family at a time.
- Recommended first target: a simple integrated-solid `T3` with one MF and one
  LF station on a smooth or four-face horn. Do not start with corner boards,
  cartridges, multiple throat combiners, or compound systems.

Gate: solid fixtures pass, but STL remains disabled until Stage 6.

### Stage 6 — manufacturing certification per topology/construction

Enable a topology/construction pair only when every acceptance gate below
passes across its parameter matrix. Capability is granular, for example:

`T3 + smooth + integrated-solid = certified` does not imply
`T3 + angular + cartridge`, `CX3`, `H3`, or compound is certified.

### Stage 7 — remove legacy three-way code

- Delete legacy three-way branches from `layout()`, `acoustics()`,
  `evaluate()`, `response()`, and `hornrespME()`.
- Delete the manual throat/tap/seat renderer.
- Delete `BUILDS['3way']`.
- Retain a read-only legacy import and archived regression fixtures.

## Legacy state import

Never silently load a flat `topo:'3way'` state into schema 2.

The import wizard may map:

- `wPre`, `nW`, `odW`, `dpW`, `sdW`, `vtcW`, `xmW` → LF source candidate;
- `mPre`, `nM`, `odM`, `dpM`, `sdM`, `vtcM`, `xmM` → MF source candidate;
- `cdSel`, `td`, `cdDepth` → HF throat source candidate;
- `fxLo`, `fxHi` → user crossover intent, explicitly marked legacy;
- `npW`, `shW`, `npM`, `shM` → aperture preferences, not locked geometry;
- coverage, mouth, profile, section, and wall fields → horn intent;
- current derived `fxDerived`, dialects, slot dimensions, layout coordinates,
  private `_` fields, and preview meshes → discarded.

The import creates an unsolved `T3` candidate with
`calculated-adaptation/legacy-import` provenance. The user must explicitly
choose `CX3` or `H3` if the old state actually represented one of those
architectures. No imported state receives manufacturing capability.

## Test program

### Foundation unit tests

- Schema normalization, aliases, SI validation, deep immutability, stable
  hashing, and diagnostic stability.
- Source/interface/station graph fixtures for all four topology IDs.
- Tests that a `CX3` coax source does not create an MF wall station.
- Tests that an `H3` LF source cannot enter the shared horn.
- Tests that compound graphs never inherit conventional station ordering.
- Provenance conflict and anti-promotion tests.

### Equation and solver unit tests

- Wavelength, phase, reflection null, aperture/local-area ratio, local
  wavelength-area bound, flare bound, chamber compliance, passage inertance,
  resonance, and area progression.
- Legal station interval fixtures from patents/author documents, with source
  citation in the fixture.
- Deterministic packing, ordering, rotation, and path calculations.
- Explicit test that changing driver size/count recomputes legal intervals and
  package requirements rather than merely rescaling a picture.
- Explicit test that crossover intent is not overwritten by frame placement.

### Property and metamorphic tests

- Rotation/reflection symmetry.
- Permuting source arrays does not change keyed results.
- Scaling geometry and frequency together preserves dimensionless ratios.
- Increasing passage length cannot reduce modeled delay/inertance.
- Increasing aperture area cannot increase compression ratio.
- Tightening a package bound cannot make an infeasible state feasible.
- Randomized inputs never produce NaN, mutation, unbounded search, or silent
  topology fallback.

### Integration tests

- State → solve → JSON → reload parity.
- Shared profile-law hash parity.
- UI candidate/commit/refusal behavior.
- Reference card application never locks undocumented geometry.
- Topology switch removes irrelevant controls and derived state.
- Analysis-export dispatch and complete-input refusal.
- Worker cancellation, stale-result rejection, memory budget, and hash parity.

### Renderer tests

- Renderer consumes only the render DTO.
- Every rendered station/source/lumen carries source IDs and solution hash.
- Horn-side apertures are flush; inspection volumes do not protrude.
- No duplicate throat plate, bore disc, seat, or driver geometry.
- `no drivers`, `mount`, `lumen`, `section`, and `horn-only` views have
  deterministic visibility contracts.
- Visual contact sheets cover small/large counts, square/rectangular coverage,
  smooth/angular surfaces, and every topology.

### Exact-solid and manufacturing tests

- Positive host is connected before subtraction.
- Every lumen is one connected negative component from its declared
  chamber/cone boundary to exactly one horn-side termination.
- After subtraction there is no membrane, unfilled sidewall, internal cap,
  duplicate layer, or protruding tube.
- Final positive solids have expected component count, zero open edges,
  consistent orientation, positive volume, no self-intersections, and
  minimum web.
- Driver host contacts the horn over the required structural area.
- Gasket, fastener, cone relief, and acoustic lumen ownership are disjoint and
  audited.
- Cross-sections at several points along every lumen match the acoustic
  solver's area progression.
- STL bytes are created only after the solution, solid, and audit hashes match.
- Deliberately disconnected, hollow-plate, short-cut, over-cut,
  coincident-surface, and wrong-termination fixtures all refuse.

### Performance gates

- Pure analysis solve has a fixed candidate budget and deterministic timeout.
- No topology/count option performs hidden full solves during paint.
- Renderer updates do not trigger exact Booleans.
- Exact-solid work is explicit, cancellable, worker-isolated, and memory
  bounded.
- Startup loads one persisted state and performs at most one committed solve.

## Acceptance gates

### Analysis-ready

- Correct topology graph.
- Complete required crossover and driver/interface inputs.
- Nonempty legal station intervals.
- Valid aperture/chamber/passage networks.
- Path/phase diagnostics available.
- Every value has a source class.
- No legacy flat-state reads or writes.

### Preview-ready

- Analysis-ready.
- Render DTO hash equals solution hash.
- Every visual item maps to a solved entity.
- No renderer-owned acoustic dimensions.
- Preview is labeled with fidelity and manufacturing status.

### Hornresp-ready

- Analysis-ready.
- The selected topology has a reviewed record mapping.
- Complete T/S and acoustic network inputs.
- Export fixture round-trips and preserves ordering/units.

### Manufacturing-plan-ready

- Preview-ready.
- The exact topology/construction implementation exists.
- All positive hosts and negative volumes have typed ownership.
- Every canonical lumen is continuous in the plan.
- This still does **not** enable STL.

### Exact-solid-ready

- Manufacturing-plan-ready.
- Boolean completes within budget.
- Solid hash matches plan/solution hashes.
- All topology, connectivity, geometry, and fabrication audits pass.

### STL-ready

- Exact-solid-ready.
- Deep self-intersection and assembly audits pass.
- Export facade receives a current capability token.
- Export metadata records topology implementation revision, source revision,
  solution hash, solid hash, audit hash, units, and known validation limits.

Until all STL-ready conditions pass, the only valid response is:

`THREEWAY_MANUFACTURING_UNAVAILABLE`

## Completion definition

The rebuild is complete only when:

1. `T3`, `CX3`, and `H3` are separately modeled and cannot be confused by
   state, UI, solver, report, or exporter.
2. Compound systems remain explicit research graphs unless a named subtype is
   independently implemented.
3. Research provenance survives from input through every report and preset.
4. Entry stations, apertures, chambers, passages, mounts, paths, and package
   are coupled solver outputs rather than renderer decorations.
5. The renderer and manufacturing system consume the same solved identities
   without sharing authority.
6. The legacy three-way branches are removed from the live path.
7. Manufacturing is still unavailable for any topology/construction pair that
   has not proven connected, watertight Boolean topology.

This architecture deliberately favors honest refusal over a plausible-looking
model. That is the necessary foundation for a three-way MEH tool whose most
critical geometry—the connection from each driver through its chamber,
mounting body, passage, and horn wall—is acoustically traceable and physically
printable.
