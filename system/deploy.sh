#!/bin/bash
# THE HARD RULE: nothing reaches outputs without a full VERIFY PASS
set -e
node verify.js
python3 verify_visual.py
node meh_suite.js > /tmp/suite.log 2>&1 || { echo "SUITE FAIL"; tail -5 /tmp/suite.log; exit 1; }
node sweep_gate.js > /tmp/sweep.log 2>&1 || { echo "SWEEP FAIL"; tail -12 /tmp/sweep.log; exit 1; }
node t_controls.js > /tmp/ctl.log 2>&1 || { echo "DEAD CONTROLS"; tail -8 /tmp/ctl.log; exit 1; }
node scene_audit.js > /tmp/scene.log 2>&1 || { echo "SCENE AUDIT FAIL"; tail -8 /tmp/scene.log; exit 1; }
node meh_livetest3.js > /tmp/lt.log 2>&1 || { echo "LIVETEST FAIL"; tail -3 /tmp/lt.log; exit 1; }
node meh_inspect.js || exit 1                                # gate 8: INSPECT - tap-scale invariants, evidence-framed
node orbit_viewer.js && python3 build_viewer.py || exit 1   # gate 9: the ORBIT VIEWER - 70 frames, reviewed before any bless
cp meh_studio_v4.html /mnt/user-data/outputs/meh_studio.html
cp meh_viewer.html /mnt/user-data/outputs/meh_viewer.html
echo "VERIFIED DEPLOY $(wc -c < /mnt/user-data/outputs/meh_studio.html)"
