#!/usr/bin/env bash
# Render the Gallery reel (all demos back to back) and build a contact sheet from it.
set -euo pipefail
cd "$(dirname "$0")"
SCALE=${SCALE:-0.5}
mkdir -p out
npx remotion render src/index.ts Gallery out/gallery.mp4 --scale="$SCALE" --log=error
node -e "
const s=require('fs').readFileSync('src/Root.tsx','utf8');const re=/\['(\w+)', '[^']*', \(\) => .*?, (\d+)\],/g;let m,t=0,o=[];
while((m=re.exec(s))){const d=+m[2];o.push(m[1]+' '+((t+d*0.72)/30).toFixed(2));t+=d}require('fs').writeFileSync('out/marks.txt',o.join('\n')+'\n')"
rm -rf out/tiles && mkdir -p out/tiles
i=0; while read -r id ts; do i=$((i+1)); ffmpeg -loglevel error -y -ss "$ts" -i out/gallery.mp4 -frames:v 1 -vf scale=270:480 "out/tiles/$(printf %02d $i)-$id.jpg"; done < out/marks.txt
python3 overview.py
echo done
