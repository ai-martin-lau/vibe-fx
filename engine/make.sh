#!/usr/bin/env bash
# 一键出片：音频 → 逐帧 → 母带编码 → 3:4 封面 → 总览图 → QA 报告。
# 用法：
#   engine/make.sh FILM --test 10      试片：只渲前 10 秒 → FILM/out/test/（可反复覆盖，永远不碰成片）
#   engine/make.sh FILM                正式：全片 → FILM/out/final-vN/（N 自动递增，已有版本绝不覆盖）
#                                      并写 manifest.json（时长、帧数、各文件 SHA256、引擎版本、qa_exit、status）
#                                      QA 通过：status=passed，out/latest → 这个版本，exit 0
#                                      QA 不通过：成片留在 final-vN/ 供检查，写 FAILED 标记和 status=failed，
#                                                 out/latest 不动（仍指向上一个通过的版本），exit = QA 退出码（非 0）
#   （兼容旧写法：engine/make.sh FILM 3 等同 --test 3）
# 退出码：0 = 出片且 QA 通过；非 0 = 渲染/编码出错或 QA 有 FAIL（试片同样返回 QA 退出码）。
# 发布只认 out/latest/final-upload.mp4，且上传前核对 manifest 里的 SHA256、qa_exit=0、status=passed。
# 环境变量：JOBS=并行渲染进程数（默认 6），CHROME=浏览器路径（可选）
# macOS：先 source ~/.venvs/vibe-video/bin/activate（装法见 README「macOS」）
set -euo pipefail
ENGINE="$(cd "$(dirname "$0")" && pwd)"
FILM="$(cd "$1" && pwd)"; shift
TEST=""
if [ "${1:-}" = "--test" ]; then TEST="${2:?--test 需要秒数}"; elif [ -n "${1:-}" ]; then TEST="$1"; fi
python3 -c "import playwright, numpy, scipy, soundfile, PIL" 2>/dev/null || {
  echo "✗ 缺 Python 依赖：pip install playwright numpy scipy soundfile pillow（macOS 装在 venv 里，见 README「macOS」）" >&2; exit 5; }
command -v ffmpeg >/dev/null || { echo "✗ 缺 ffmpeg" >&2; exit 5; }
[ -f "$FILM/rhythm.json" ] || echo "⚠ $FILM 没有 rhythm.json（旧片写法）：画面和声音不共享节奏表，QA 只能做部分检查"
if [ -n "$TEST" ]; then
  WORK="$FILM/out/test"; DEST="$WORK"; MODE=test
else
  V=1; while [ -e "$FILM/out/final-v$V" ]; do V=$((V+1)); done
  WORK="$FILM/out/work"; DEST="$FILM/out/final-v$V"; MODE=final
fi
mkdir -p "$WORK"; export VIBE_OUT="$WORK"; ${TEST:+export VIBE_SECONDS="$TEST"}
echo "[1/6] 合成音频 → $WORK";  PYTHONPATH="$ENGINE" python3 "$FILM/audio.py"
rm -rf "$WORK/frames"
echo "[2/6] 渲染帧";            python3 "$ENGINE/render.py" "$FILM" frames --out "$WORK/frames" --jobs "${JOBS:-6}" ${TEST:+--seconds "$TEST"}
echo "[3/6] 母带编码（${MODE}）";   bash "$ENGINE/master.sh" "$WORK" "$DEST" "$MODE"
if [ "$MODE" = final ]; then
  echo "[4/6] 封面";           python3 "$ENGINE/render.py" "$FILM" cover --out "$DEST"
  [ -f "$DEST/cover-4x3.jpg" ] || echo "⚠ 没有 4:3 横封面：scene.html 里给 VIBE_FILM 加 cover43(){…}（竖横两张封面）"
  VIDEO="$DEST/final-upload.mp4"
else
  echo "[4/6] 试片不出封面"; VIDEO="$DEST/test.mp4"
fi
echo "[5/6] 总览图";   N=$(ls "$WORK"/frames/f*.jpg | wc -l); STEP=$(( N / 24 > 0 ? N / 24 : 1 ))
rm -rf "$WORK/overview"; mkdir -p "$WORK/overview"
ls "$WORK"/frames/f*.jpg | awk -v s="$STEP" 'NR%s==1' | head -24 | xargs -I{} cp {} "$WORK/overview/"
python3 "$ENGINE/sheet.py" "$DEST/overview.jpg" 6 "$WORK"/overview/*.jpg >/dev/null
echo "[6/6] QA 报告"
if [ "$MODE" = test ]; then QA_ARGS=(--test --seconds "$TEST"); else QA_ARGS=(); fi   # 模式显式传给 QA，不让它猜
set +e; python3 "$ENGINE/qa.py" "$FILM" "$VIDEO" --out "$DEST/qa" ${QA_ARGS[@]+"${QA_ARGS[@]}"}; QA=$?; set -e
if [ "$MODE" = final ]; then
  python3 - "$FILM" "$DEST" "$ENGINE" "$QA" <<'PY'
import hashlib, json, pathlib, subprocess, sys, datetime
film, dest, engine, qa = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), int(sys.argv[4])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
meta = json.loads((film / 'out/work/frames/meta.json').read_text())
rev = subprocess.run(['git', '-C', str(engine), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip() or '?'
dirty = bool(subprocess.run(['git', '-C', str(engine), 'status', '--porcelain', '.'], capture_output=True, text=True).stdout.strip())
m = {'film': film.name, 'version': dest.name, 'built_at': datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
     'frames': meta['frames'], 'fps': meta['fps'], 'duration': meta['duration'],
     'engine': {'path': str(engine), 'realpath': str(engine.resolve()), 'git': rev + ('-dirty' if dirty else '')},
     'inputs': {f: sha(film / f) for f in ['scene.html', 'audio.py', 'rhythm.json'] if (film / f).exists()},
     'files': {p.name: {'sha256': sha(p), 'bytes': p.stat().st_size} for p in sorted(dest.glob('*')) if p.is_file() and p.suffix in ('.mp4', '.jpg')},
     'qa_exit': qa, 'status': 'passed' if qa == 0 else 'failed', 'upload_file': 'final-upload.mp4'}
(dest / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=2))
print(f"manifest -> {dest/'manifest.json'}  上传文件 SHA256 {m['files']['final-upload.mp4']['sha256'][:16]}…  status={m['status']}")
if qa == 0:
    latest = film / 'out/latest'
    tmp = film / 'out/.latest.tmp'
    if tmp.is_symlink() or tmp.exists(): tmp.unlink()
    tmp.symlink_to(dest.name); tmp.replace(latest)        # 原子替换：中途失败也不会留下坏指针
    print(f"out/latest -> {dest.name}")
else:
    (dest / 'FAILED').write_text(f"QA exit {qa}：这个版本没通过自动 QA，不能发布。看 qa/qa-report.md。\n", encoding='utf-8')
    cur = film / 'out/latest'
    print(f"out/latest 未更新（仍是 {cur.resolve().name if cur.exists() else '无'}）")
PY
fi
ls -la "$DEST"
if [ "$QA" = 0 ]; then
  echo "QA：自动检查全部通过（人工项见 $DEST/qa/qa-report.md）"
else
  echo "✗ QA 有 FAIL（exit ${QA}），看 ${DEST}/qa/qa-report.md；$( [ "$MODE" = final ] && echo '这个版本已标 FAILED，out/latest 没动' || echo '试片')" >&2
fi
exit "$QA"
