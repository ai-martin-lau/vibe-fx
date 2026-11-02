#!/usr/bin/env bash
# 新建一支片：复制模板，并把 scene.html 里引擎脚本的相对路径改对（不管新目录在哪一层）。
# 用法：engine/newfilm.sh DEST [模板，默认 templates/film]
#   DEST 的上级目录里如果有 engine/（目录或软链），就用它（比如生产目录 videos/vibe/engine → ../engine/）；
#   否则直接指向本引擎的真实路径。
set -euo pipefail
ENGINE="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:?用法：newfilm.sh DEST [模板目录]}"
TPL="${2:-$ENGINE/../templates/film}"
[ -e "$DEST" ] && { echo "✗ $DEST 已存在，不覆盖"; exit 1; }
mkdir -p "$(dirname "$DEST")"
cp -r "$TPL" "$DEST"; rm -rf "$DEST/out"
DEST="$(cd "$DEST" && pwd)"
REL=$(python3 - "$DEST" "$ENGINE" <<'P'
import os, sys
dest, engine = sys.argv[1], sys.argv[2]
d = os.path.dirname(dest)
while d and d != '/':
    if os.path.exists(os.path.join(d, 'engine', 'vibe.js')):
        print(os.path.relpath(os.path.join(d, 'engine'), dest)); break
    d = os.path.dirname(d)
else:
    print(os.path.realpath(engine))
P
)
# 不用 sed -i：GNU 和 macOS 的 sed -i 写法不一样
python3 - "$DEST/scene.html" "$REL" <<'P'
import pathlib, re, sys
p, rel = pathlib.Path(sys.argv[1]), sys.argv[2]
s = p.read_text(encoding='utf-8')
for js in ('vibe.js', 'mechanisms.js', 'anim.js', 'three3d.js', 'vendor/three.bundle.js'):
    s = re.sub(r'src="[^"]*engine/' + re.escape(js) + '"', f'src="{rel}/{js}"', s)
p.write_text(s, encoding='utf-8')
P
echo "新片：${DEST}（引擎脚本：${REL}/vibe.js）"
echo "下一步：改 rhythm.json → scene.html → audio.py，然后 $ENGINE/make.sh $DEST --test 15"
