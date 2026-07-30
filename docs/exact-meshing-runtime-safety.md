# Exact meshing runtime safety

Build 642 made the two-way implicit manufacturing mesh an explicit operation
and replaced the former whole-lattice/object-topology path with bounded
streaming and packed numeric storage. Build 653 retains that runtime contract
under mesh policy `b653-differential-cell-terminal-grid-v3`.
Opening the application, changing a design, and using the analytic assembly
views do not construct a `Worker` or allocate an exact lattice.

## Browser contract

- `GENERATE EXACT MESH` is the explicit raw-print inspection action.
- `EXPORT STL` is the explicit manufacturing/export action.
- Only one preview or export coordinator may exist at a time.
- The active action becomes a cancel control.
- A design or topology change cancels stale work.
- Mesh identity fingerprints the complete migrated state, so present and future
  manufacturing inputs cannot be omitted from stale-result cancellation.
- Leaving raw-print inspection cancels its preview job.
- Each fresh preview phase has a 10-minute watchdog; each fresh export phase has
  a 15-minute watchdog.
- Closing the page terminates the active worker.
- A cancelled, refused, timed-out, or failed job leaves the analytic review
  model usable and cannot replace it with a late worker response.

`Worker.terminate()` is authoritative. A posted cancel message cannot interrupt
a synchronous sampling or audit loop promptly.

The build-642 worker contract separates each exact request into three
transfer-and-terminate phases:

1. the mesh phase performs preflight, streams the implicit field, and transfers
   packed printable parts;
2. the audit phase receives those parts, performs topology and optional deep
   intersection checks, and transfers the same buffers with a content-bound
   passing certificate; and
3. the output phase accepts only that certificate and produces preview buffers
   or binary STL.

The coordinator terminates each phase worker before starting the next one, so
the memory envelope does not assume that garbage collection promptly releases a
large previous phase. Focused source/VM gates verify transfer ownership,
termination order, provenance, certificate validation, and the rule that an
audit failure cannot create an output worker. The focused Chromium
panel-interface regression has also completed audited exact preview through the
real phased workers for slot, oval, and round entries while preserving the
analytic rear assembly. That is not a cross-browser performance guarantee.

## Manufacturing budget

Manufacturing intent uses a fixed 2.5 mm lattice. It never silently lowers
resolution to fit memory. Display intent retains its separate 12,000,000-point
aggregate cap.

Before sampling the scalar field, preflight enforces:

- at most 320 samples on any axis;
- at most 10,040,000 grid points in one active part;
- at most 10,040,000 grid points across a complete manufacturing job;
- a 1.5 GiB conservative allocation-accounting ceiling;
- finite, positive, safely multipliable bounds;
- a safely representable numeric lattice-edge key space; and
- sealed bounds after no more than eight growth passes.

Generation additionally enforces:

- at most 1,000,000 vertices;
- at most 2,000,000 triangles;
- at most 128 MiB of preview transfer buffers;
- at most 128 MiB of STL output;
- at most 40,000,000 deep-audit CSR bin references;
- at most 16,384 triangles in one audit bin;
- at most 250,000,000 raw audit pair visits; and
- at most 100,000,000 geometric intersection-pair tests.

Detachable horn and adapter parts share the 10,040,000-point aggregate job
budget, while every individual part remains under the same 10,040,000-point
cap.
Parts are generated sequentially. Exact geometry cache capacity is one result.

The Build 653 six-W5 mixed corner/face release state occupies one
`159 × 302 × 209` manufacturing grid: 10,035,762 points at the unchanged
2.5 mm step. Its conservative peak allocation estimate is 521,831,536 bytes,
below the unchanged 1.5 GiB ceiling. The explicit 10,040,000-point ceiling
admits that certified lattice but refuses the immediately larger
`159 × 303 × 209` tier (10,068,993 points). This is a bounded release-case
allowance, not automatic coarsening or a general memory-limit expansion.

The mesher stores only the current and next X-normal scalar planes as
`Float32Array`s. Total grid points remain a hard work limit, but scalar working
memory is proportional to `2 × ny × nz`, not `nx × ny × nz`. Surface vertices
are stored as packed `Float64Array` coordinates and faces as packed
`Uint32Array` indices.

Packed topology has a strict shared-index contract: every shared lattice-edge
vertex has one index reused by all incident triangles. Duplicate coordinates
with different vertex IDs are malformed packed input and are intentionally not
coordinate-welded during the packed audit. The compatibility gate proves that
valid shared-index packed fixtures match the legacy topology, orientation,
intersection, and STL results while malformed input fails visibly.

The deep audit uses bounded compressed-sparse-row spatial bins. It selects 42,
64, or 128 bins per axis by triangle count; the certified P03 production mesh
uses the 128-axis form. Bin references, peak occupancy, raw pair visits, and
actual geometric pair tests all have independent hard limits.

The accounting envelope reserves 192 MiB of fixed/runtime overhead and computes
the mesh, audit, and output phase envelopes separately. Admission uses the
maximum of those mutually exclusive phases, rather than pretending that all
three allocations coexist. This value is conservative allocation accounting,
not an operating-system RSS guarantee: JavaScript runtime overhead and process
high-water behavior vary by engine, operating system, and hardware.

Build 647 admits exactly three pinned fixtures under
`b646-radial-face-chamber-v1`: integrated P03, the derived three-part
`P03-CARTRIDGE`, and integrated radial R02. Each runs in an independent fresh
child process. Larger canonical cases remain refused at preflight by their
axis, per-part, or aggregate grid limit. A policy change that unexpectedly
admits one of those held cases fails the admission gate instead of silently
widening production scope.

Removing the old preview-only post-mouth roll made R02's deterministic bounds
truthful: 6,654,912 samples in one `137 × 276 × 176` part, below the unchanged
8,000,000-sample per-part ceiling. R02 was promoted only after a fresh exact
mesh, deep audit, STL hash, and bounded resource probe passed. R03 remains
refused at 12,755,852 samples across one horn and three cartridges. R04-D
remains refused at 30,336,386 samples across one horn and four cartridges, and
R08 remains refused at 33,060,580 samples. These measured preflights are pinned in
`qa/cases/exact-production-admission.json`.

Budget failures use stable `MESH_*` error codes and occur before the large
exact job whenever preflight can determine the refusal.

## QA contract

The default command is resource-safe and does not create an exact lattice:

```bash
cd qa
npm run qa
```

The production admission certificate is explicit and intentionally separate
from the normal quick tier. It is also required by the release tier:

```bash
npm run qa:production-certificate
# equivalent:
node node/run.mjs --tier certificate

# quick gates + bounded witness + production certificate
npm run qa:release
```

The integrated P03 certificate runs in a fresh child process and pins:

- fixed 2.5 mm sampling with dimensions `117 × 299 × 205`;
- 7,171,515 grid samples and 7,051,872 cells;
- a 521,816,952-byte conservative phase-accounting envelope;
- 589,864 vertices and 1,179,752 triangles;
- a 58,987,684-byte binary STL;
- STL SHA-256
  `a56d588bb48bd256279ea02909d72391ab6bb77627ba3ffcb59c86890b8d2ad2`;
- one closed, positively oriented component with no bad edges, reversed edges,
  orientation conflicts, degenerates, duplicate faces, non-finite faces, or
  self-intersections;
- 1,785,579 CSR bin references, peak bin occupancy 210, 80,874,610 raw
  pair visits, and 1,844,209 geometric pair tests on a 128-axis audit; and
- workstation release ceilings of 60 seconds and 512 MiB process maximum RSS.

The build-647 integrated re-certificate took 22,160 ms and reached
324,059,136 bytes maximum RSS.

The derived `P03-CARTRIDGE` certificate independently pins:

- three named and individually connected parts: `horn`, `cartridge-1`, and
  `cartridge-2`;
- fixed 2.5 mm part lattices of `117 × 299 × 205`, `99 × 85 × 110`, and
  `99 × 85 × 110`;
- 9,022,815 aggregate samples, 8,846,448 cells, and a 565,762,048-byte
  conservative phase-accounting envelope;
- 679,086 vertices, 1,358,252 triangles, and 67,912,852 aggregate STL bytes;
- aggregate SHA-256
  `7c6935e870e0d0a1840a8a0d30798563520b327c07c5ecfa9e36ed3be706c5cb`;
- per-file SHA-256 values
  `494806836c54462f0b18f3c00d38e7cd9b85a103355e5bb19e1a344acd1bddec`,
  `52592f63c90268388936b0fc1e4050b6a37e3037cef9e4a6dabe3d637178d252`,
  and
  `bf82b61aa733923c161eb5653d9c1645183613f78e705643a2be874f65624861`;
- exactly three expected components, no discarded components, no topology
  faults, and no self-intersections;
- four active/passing M4 retention tools with the horn owning four blind
  pockets and the two cartridges owning four bosses, bores, and counterbores;
  and
- workstation release ceilings of 90 seconds and 768 MiB process maximum RSS.

The build-647 retained re-certificate took 26,900 ms and reached 428,326,912
bytes maximum RSS.

The radial R02 certificate independently pins:

- one integrated `137 × 276 × 176` part on the fixed 2.5 mm lattice;
- 6,654,912 samples, 6,545,000 cells, and a 521,715,200-byte conservative
  phase-accounting envelope;
- 640,722 vertices, 1,281,460 triangles, and a 64,073,084-byte STL;
- STL SHA-256
  `b02caaff85f5dc2b7e35c79ea34dad0f70565e2e8f489bd386eac0166df02870`;
- one closed component with no topology faults or self-intersections;
- 2,032,681 CSR bin references, peak occupancy 205, 75,404,763 raw pair
  visits, and 1,058,101 geometric pair tests on a 128-axis audit; and
- workstation release ceilings of 60 seconds and 512 MiB process maximum RSS.

The build-647 R02 certificate took 28,093 ms and reached 371,703,808 bytes
maximum RSS. All timing and RSS observations are setup-machine regression
evidence, not portable performance promises. The certificate gate fails if
pinned geometry, policy, audit, hashes, time ceiling, or RSS ceiling changes.

The smaller one-inch QA-only resource witness remains available through
`npm run qa:geometry`. The production certificate retains its focused
standalone tier and is also part of `qa:release`. Focused phased-worker
source/VM and Chromium-preview checks have passed; wider browser, operating
system, and hardware coverage remains separate validation work.
