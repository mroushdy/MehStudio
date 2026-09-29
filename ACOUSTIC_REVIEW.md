# Acoustic sizing review

This isolated prototype starts at experimental Build 11, commit `52efe6ad23a8aa4de97099b752c34becafc1cc49`. It is not a public-main or Site release.

Open `index.html` and import `examples/user-saved-study.json`; choose **Analyze sound path**. The separately built `MEH_Acoustic_Review.html` loads that design automatically. Acoustic sizing provides mid-only pressure, electrical/acoustic impedance, phase, excursion and entry-speed curves; area, tube-setting, actual-cavity-volume and axial-position sweeps; editable targets/loss/junction/mass assumptions; candidate application; and JSON export. Matched FEM dots always belong to the **current** geometry. They do not validate a previewed candidate.

`acoustics/broadband-engine.cjs` is an explicit reduced passage/network model. `acoustics/spatial-study.cjs` retains the qualified local FEM path. `acoustics/spatial-motor-network.cjs` is a tested contract for future full front/horn/exterior operators; no authentic full-system operator is included. Four discrete azimuthal fields, rolled-lip diffraction, HF driver loading/crossover and physical measurements are pending.

- [Physical model and API](docs/broadband-model.md)
- [Independent conventions audit and primary sources](docs/acoustic-audit.md)
- [Authentic Hornresp benchmarks, scope and capture instructions](docs/hornresp-benchmark.md)
- [Native front-passage reproduction](native-front-fem/README.md)
- `acoustics/geometry/mesh-export-manifest-v1.json`: frozen sibling geometry contract; `handshake-report.json` records its validation. The native cap is at station 239; it must couple to the remaining horn/roll/exterior. It is not the reduced network's maximum-Z termination.

No external JS dependencies or network connection are needed for the editor or numerical network tests.

```sh
node acoustics/embed.cjs
node --test --test-concurrency=1 tests/*.cjs benchmarks/benchmark.test.cjs
node benchmarks/run.cjs
node scripts/reproduce-acoustics.cjs examples/user-saved-study.json study-results
python3 scripts/plot-acoustics.py study-results figures
node scripts/build-review.cjs examples/user-saved-study.json MEH_Acoustic_Review.html
```

Plotting requires NumPy and Matplotlib. Native FEM needs the complex DOLFINx/PETSc environment documented in `native-front-fem`. `scripts/expand-native-reference.py --help` describes a fresh 100–1000 Hz, 50 Hz-step, three-mesh solve using explicitly supplied read-only environment/mesh inputs and a separate output/cache directory. Recreate the three meshes from the frozen geometry if they are unavailable. Only numerically qualified frequencies may be imported:

```sh
node acoustics/import-native.cjs <qualified-result.json> acoustics/data/current-insert.json
node acoustics/embed.cjs
```

The source geometry kernel is hash-locked by the embedder. Geometry regression tests are preserved. Browser-rendered QA is unavailable under the administrator policy; that restriction was not bypassed.
