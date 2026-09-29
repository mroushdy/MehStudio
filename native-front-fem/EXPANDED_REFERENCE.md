# Expanded insert reference, 2026-09-29

Fresh frequency solves on the existing three independent frozen meshes: 19 exact frequencies, 100 through 1000 Hz at 50 Hz steps. All 19 passed the unchanged row-specific gates. Matrix medium-to-fine change range: 0.0010113%–0.1372522%.

The original MANIFEST.json and its 55 source/result files remain unchanged and describe the original five-frequency release. EXPANDED_MANIFEST.json pins these added results. No native environment or original mesh was modified. Results under results/expanded/ include all three raw runs, qualification and console log. The fine mesh is the same as the original 700 Hz pressure basis; no pointwise convergence claim is added.

Run scripts/expand-native-reference.py from the repository with explicit --python, --mesh-dir and --output arguments to reproduce the expanded solve. Recreate meshes using the unchanged README.md instructions if needed. Use the same geometry, medium and frequencies on every mesh. The local front domain includes its physical neck; add no second local front compliance or neck/end correction when coupling its matrix.

Every frequency is an explicit solve. Joining points is visual interpolation; the 50 Hz sampling does not rule out narrow features. These results qualify the local rigid/lossless surrogate on the fixed boundary, not the complete horn, real diaphragm, thermoviscous losses or measured loudspeaker.
