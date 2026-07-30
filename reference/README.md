# Known-build reference library

This library is a visual and construction QA source for MEH Studio. It does not
turn dimensions inferred from photographs into published facts.

Each entry records:

- the mechanical family and supported layout seen in the reference;
- driver-axis, mounting, chamber, and tap-placement traits;
- visibly impossible traits the renderer and assembly audit must reject;
- local copies of the source images used during comparison.

`reference_gate.js` checks generated plans against the applicable traits.
`reference_visual_gate.js` verifies the fixed-view image matrix, expected
families/counts/mount systems, complete-frame clearance, and external mounting
contact. `comparison.html` is the browser review board: it places every known
construction source beside the matching Full, Ghost, Taps, Mount, and Section
renders.

Use the local server, never `file://`:

```text
http://127.0.0.1:8520/reference/comparison.html
```

The normal application supports deterministic clean captures through
`?capture=1&view=<mode>`. Capture mode changes only the presentation frame; it
uses the production geometry, renderer, solver, and camera presets.
