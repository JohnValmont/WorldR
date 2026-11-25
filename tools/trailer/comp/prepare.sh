#!/bin/bash
# Prepares the compositor after filming: vendored GSAP, the world map, the clips link and index.
set -e
cd "$(dirname "$0")"
cp ../../../frontend/public/landing/vendor/gsap.min.js assets/
cp ../../../frontend/public/worldr-map.png assets/
ln -sfn ../clips clips
python3 - <<'PY'
import os, json
d = '../clips'; out = {n: len([f for f in os.listdir(os.path.join(d, n)) if f.endswith('.jpg')]) for n in sorted(os.listdir(d)) if os.path.isdir(os.path.join(d, n))}
json.dump(out, open('clips.json', 'w'), indent=0); print(out)
PY
