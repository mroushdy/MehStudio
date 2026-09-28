# Reference-geometry regression gate

This package turns the supplied known-build references into geometry contracts
without comparing pixels and without claiming dimensions from photographs.

The manifest labels every source as one of:

- `observed-photograph`: topology, orientation, and continuity only;
- `published-dimension`: numeric geometry explicitly recorded by a source;
- `derived-engineering-invariant`: normalized manufacturing constraints;
- `runtime-descriptor`: renderer data evaluated when supplied.

The planner gate covers:

- four genuinely planar Hinson wall facets;
- two-woofer Hinson slots in all four quadrants, biased toward wall
  intersections, X-oriented, web-safe, and contained under active cones;
- circular HF throats;
- rear-only driver faces;
- continuous integrated bearing plates;
- non-overlapping driver packages and tap webs;
- normalized frame, active-cone, and gasket proportions;
- exact equal-sector radial spacing for counts 2 through 8.

Run the planner gate:

```sh
node qa/reference-geometry/gate.mjs
```

Emit machine-readable output:

```sh
node qa/reference-geometry/gate.mjs --json
```

The existing renderer publishes a `window.__panelMountQA` descriptor. Save that
object as JSON and add it to the same gate without changing production code:

```sh
node qa/reference-geometry/gate.mjs \
  --render-descriptor /absolute/path/to/panel-mount-descriptor.json
```

The render adapter checks mount/gasket/driver/tap counts, continuous seals,
rear-only body envelopes, frame-to-gasket-to-cone ordering, and pair clearance.
When no descriptor is supplied, that contract is explicitly reported as
`SKIP`; planner contracts still run.
