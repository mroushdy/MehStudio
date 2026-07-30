# Three-way family and driver catalog

Status: source-bounded application contract
Catalog module: `threeway-family-catalog.js`
Driver-record boundary: `threeway-driver-db.js`

## Purpose

This catalog gives the application a stable, truthful set of three-band
families without promoting a photograph, product name, nominal driver size, or
reference topology into printable geometry.

It keeps four decisions separate:

1. the source/interface graph documented by a source;
2. the physical source count and named driver identities, when documented;
3. whether complete explicit driver records are compatible with that graph;
4. whether an independently generated exact solid passed manufacturing gates.

The first three can succeed while the fourth remains false. Every family and
driver selection in this catalog therefore has
`manufacturingReadiness: false` and `exactGeometryPassed: false`.

## Selectable families

| Family ID | UI label | Topology and physical sources | Station intent | Default acoustic target | Evidence treatment |
|---|---|---|---|---|---|
| `t3-conventional-two-wall` | Conventional T3 | 1 HF compression source, 4 MF cones, 4 LF cones; 9 physical drivers | HF throat, MF wall station, LF wall station | 90 x 60 degrees; calculated 300/1200 Hz starting targets; 385 Hz documented CoSyne horizontal pattern-control reference; 80 Hz author-recommended sub handoff | Patent-proven T3 graph plus Waslo's documented CoSyne count/workflow. It is a calculated adaptation, not a CoSyne clone. |
| `cx3-dual-diaphragm-tapped-lf` | Coax-assisted CX3 | 1 dual-diaphragm MF/HF throat driver, 2 LF cones; 3 physical drivers | Shared coaxial throat, one LF wall station | 90 x 60 degree build context; 500 Hz LF handoff starting target inside the author's 400-600 Hz range; 3.5 kHz author-reported nominal HF handoff | Hinson's documented DCX464 plus 2 x 10NW76 build. Coupling and unused-diaphragm termination are required driver-record evidence. |
| `h3-external-lf-shared-mid-high` | External-LF H3 | 1 external LF, 3 MF horn sources, 1 HF throat source; 5 physical drivers | HF throat and MF wall entry belong to the shared horn; LF is explicitly outside it | Published product-envelope references of 60 x 60 degrees and 300/1250 Hz | Yorkville U15 adjacent hybrid reference. No replacement model IDs or commercial geometry are copied. |

`compound-combiner-research` is present for discovery but has
`selectable: false`. Parallel/layered combiner patents support research into
branch types, not a generic complete source graph. The entry has no source
count, driver defaults, crossover defaults, or solid input.

## Topology vocabulary conflict

The source ledger and the current executable schema use different short names
for one hybrid:

- `docs/threeway-primary-source-ledger.md` calls a dual-diaphragm throat plus
  tapped LF topology `H3`.
- The current schema-2 reference cards and analysis presets call that topology
  `CX3`, and use `H3` for the external-LF plus shared-MF/HF family.

The catalog follows the executable schema so applying a family cannot silently
change state topology. Each family retains a `topologyVocabulary` record that
preserves the ledger alias or classification difference. This is an explicit
vocabulary mapping, not a claim that the architectures are interchangeable.

## Driver identity records

### Fixed documented sets

| Selection ID | Documented identities | Catalog status |
|---|---|---|
| `cosyne-archived-original` | 1 x Celestion CDX1-1445 HF; 4 x Gento SP99023A MF; 4 x Aurasound NS6-255-8A LF | Archived original identities. The MF/LF devices are limited or obsolete. Records are not bundled, and replacement is a new design. |
| `hinson-documented-dcx464-10nw76` | 1 x B&C DCX464 dual-diaphragm MF/HF; 2 x B&C 10NW76 LF | Documented build identities. Complete current records, coupling/termination evidence, and a fresh derivative solve are still required. |

The fixed selections have `selectable: false` and
`recordAvailability: "not-bundled; explicit verified records required"`.
A model name is not a physical envelope or mount drawing.

### Waslo author-listed candidates

The CoSyne guide lists the following screening candidates:

- MF: FaitalPRO 3FE25-8 and Visaton FRS5-8.
- LF: Dayton Audio DC130AS-8, Visaton W130S-8, and FaitalPRO 6FE100.

The guide explicitly identifies the 6FE100 as untried and states that
substitute drivers require port, enclosure, crossover, and prototype work.
The catalog exposes these under `driverOptions` with `selectable: false` and a
qualified status. It does not construct a supposedly validated mix-and-match
system from the list.

### External-LF H3

The public U15 record supports source roles, counts, nominal classes, coverage,
and product crossover points. It does not establish replacement driver model
IDs. The H3 `driverOptions` arrays are intentionally empty; users must supply
complete explicit records.

## Stable UI metadata

Every selectable family exposes:

```text
family.driverControlKeys.{low,mid,high}
family.driverOptions.{low,mid,high}[]
family.driverSelectionMode
family.driverSwitchingSupported
family.resolvedDriverSelectionId
```

Each option contains:

```text
id
label
sourceId
bandIds[]
count
recordIdentity.{manufacturer,model}
status
compatibility
selectable
evidenceRefs[]
notes[]
```

The CX3 mid and high bands share one option and one control key,
`midHighDriverRef`; `linkedDriverBands` contains `["mid", "high"]`.
Independent MF/HF selectors would falsely imply two physical throat devices.

Options are provenance metadata, not complete `threeway-driver-db` records.
The current documented sets are fixed, so the UI should show a disabled real
selector/status. It must not enable switching until a candidate has complete
records and a new design solve.

## Driver compatibility contract

`evaluateDriverBindings(familyId, bindings, options)` accepts bindings keyed by
source-group ID:

```js
const result = catalog.evaluateDriverBindings(
  "cx3-dual-diaphragm-tapped-lf",
  {
    "source-coax-mid-high": { count: 1, record: explicitDcxRecord },
    "source-low": { count: 2, record: explicitLowRecord },
  },
  { selectionId: "hinson-documented-dcx464-10nw76" },
);
```

The validator checks:

- the exact source count;
- permitted record kind;
- all required electrical/acoustic bands;
- one compatible explicit acoustic output and datum;
- full T/S and lumped driver terms plus excursion for cone entries;
- explicit dual-diaphragm coupling and termination evidence for CX3;
- cutout, bolt-circle or fastener, gasket, and mount datum evidence;
- manufacturer/model identity when a documented selection is requested.

The result reports independent levels:

| Result field | Meaning |
|---|---|
| `topologyCompatible` / `ok` | Counts, kind, bands, and output interface match. |
| `acousticInputReady` | Required explicit driver terms and coupling evidence are present. |
| `mountInputReady` | Required driver plate/mount evidence is present. |
| `exactGeometryPassed` | Always false at this catalog boundary. |
| `manufacturingReadiness` | Always false at this catalog boundary. |

Missing acoustic or mount evidence produces typed warnings while a wrong
topology, count, band, output kind, or requested identity fails closed.

## Calculated T3 solid input

Only preset `t3-calculated-111` owns a bounded integrated-solid input. It is a
calculated 1 HF + 1 MF + 1 LF study and is distinct from the
`cosyne-t3-archived-144` 1 + 4 + 4 documented topology, which has
`analysisInput: null`:

```js
{
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
  inspection: { perimeterSegments: 96 },
  provenance: {
    classification: "calculated-design-intent",
    evidenceRefs: ["prov-meh3-calculated-t3-solid-v1"]
  }
}
```

These are explicit internal calculated-design inputs, not Waslo, patent, or
commercial-product dimensions. Plate thickness, minimum web, and minimum edge
remain canonical placement-plan properties and are not duplicated here. CX3
and H3 have `analysisInput: null`, so they cannot inherit hidden T3 solid
defaults.

## Source evidence used

- Unity Summation Aperture patent:
  `research/threeway-sources/primary/US6411718B1-unity-summation.pdf`.
- Waslo guide:
  `research/threeway-sources/author/Synergy-Calc-V5-guide.pdf`, especially
  pages 3-5; its local extracted record is
  `tmp/pdfs/threeway-research-text/Synergy-Calc-V5-guide.txt`.
- Hinson guide:
  `../../research-sources/Scott Hinson MEH reference.pdf`, especially pages
  14-15 for DCX464 topology and the author's 400-600 Hz discussion.
- Yorkville U15 official legacy page/specification, recorded in
  `docs/threeway-research-manifest.md` and the existing
  `threeway-reference-cards.js` provenance.
- Parallel/layered combiner patents:
  `research/threeway-sources/primary/US20090323997A1-paraline.pdf` and
  `research/threeway-sources/primary/US8488826B2-horn-combiner.pdf`.

The catalog does not derive dimensions from the PDF images. Page renders were
used only to verify the document text and page-level provenance.
