#!/usr/bin/env bash
# 母带 + 编码：限幅 → 两遍 loudnorm（纯音乐 -14 LUFS，TP -1.5）→ 音频补齐/裁到视频长度 → H.264/AAC
# 用法：engine/master.sh WORK DEST MODE
#   WORK = 有 frames/（含 meta.json）和 audio_raw.wav 的工作目录
#   DEST = 成片目录；MODE=final 时写 final.mp4 + final-upload.mp4，且 DEST 里已有同名文件就报错（不盲目覆盖）
#          MODE=test 时写 test.mp4（试片目录，可覆盖）
# 规则：编码前核对帧数 = meta.json；不用 -shortest，音频按视频时长精确 pad/trim，编码后再核对音画时长差 < 1 帧。
set -euo pipefail
WORK="$(cd "$1" && pwd)"; mkdir -p "$2"; DEST="$(cd "$2" && pwd)"; MODE="${3:-final}"
cd "$WORK"
N_META=$(python3 -c "import json;print(json.load(open('frames/meta.json'))['frames'])")
N=$(ls frames/f*.jpg | wc -l | tr -d ' ')   # macOS 的 wc 输出带前导空格
[ "$N" = "$N_META" ] || { echo "✗ 帧数不对：meta 说 ${N_META}，目录里 ${N}" >&2; exit 2; }
VDUR=$(python3 -c "print(f'{$N/30:.6f}')")
echo "  帧数 ${N}（${VDUR}s）核对通过"
ffmpeg -y -hide_banner -loglevel error -i audio_raw.wav -af "aresample=192000,alimiter=limit=0.5:attack=1:release=60:level=false,aresample=48000" audio_lim.wav
M=$(ffmpeg -hide_banner -i audio_lim.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -c "import sys,json;s=sys.stdin.read();a=s.rindex('{');b=s.index('}',a);d=json.loads(s[a:b+1]);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
# AAC 编码后的真峰值很不规律（实测同一段混音：限幅 0.66 → +1.4 dBTP，0.58 → −2.4，0.5 → −2.8），整体压音量又会让响度掉到
# −16 LUFS。做法：loudnorm 后依次试几档限幅上限，每档先量响度补回 −14 LUFS 再限幅，
# 编一遍 AAC 实测，取第一档「真峰值 ≤ −1.2 dBTP」的。
tp_of() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/True peak:/{f=1} f&&/Peak:/{print $2; exit}'; }
i_of() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | awk '/^ *I:/{i=$2} END{print i}'; }
ffmpeg -y -hide_banner -loglevel error -i audio_lim.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:$M:linear=true" audio_n.wav
TP0=""
for LIM in 0.66 0.58 0.5 0.45 0.4 0.35; do
  ffmpeg -y -hide_banner -loglevel error -i audio_n.wav -af "aresample=192000,alimiter=limit=${LIM}:attack=1:release=60:level=false,aresample=48000" audio_m.wav
  G=$(python3 -c "print(f'{min(3.0,max(0.0,-14-($(i_of audio_m.wav)))):.2f}')")   # 限幅吃掉的响度补回来
  ffmpeg -y -hide_banner -loglevel error -i audio_n.wav -af "volume=${G}dB,aresample=192000,alimiter=limit=${LIM}:attack=1:release=60:level=false,aresample=48000" audio_m.wav
  # 单独一遍：音频精确补齐/裁到视频长度（限幅器 lookahead 会吃掉尾部几十毫秒，所以不能和上面合在一起）
  ffmpeg -y -hide_banner -loglevel error -i audio_m.wav -af "apad=whole_dur=$VDUR,atrim=end=$VDUR" audio.wav
  ffmpeg -y -hide_banner -loglevel error -i audio.wav -c:a aac -b:a 192k audio.m4a
  TP=$(tp_of audio.m4a); [ -n "$TP0" ] || TP0=$TP
  python3 -c "import sys;sys.exit(0 if $TP > -1.2 else 1)" || break
done
if [ "$LIM" != 0.66 ]; then echo "  AAC 后真峰值 ${TP0} dBTP → 限幅上限 ${LIM}（补 +${G} dB）→ ${TP} dBTP，响度 $(i_of audio.m4a) LUFS"
else echo "  AAC 后真峰值 ${TP} dBTP，响度 $(i_of audio.m4a) LUFS"; fi
python3 -c "import sys;sys.exit(0 if $TP <= -1.0 else f'✗ AAC 真峰值 $TP dBTP 压不到 −1 以下')"
ADUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio.wav)
python3 -c "import sys;a,v=$ADUR,$VDUR;sys.exit(0 if abs(a-v)<1/30 else f'✗ 音频 {a}s 与视频 {v}s 对不上')"
dur_check() {   # 文件 → 核对视频帧数与音画时长
  python3 - "$1" "$N" <<'PY'
import json, subprocess, sys
f, n = sys.argv[1], int(sys.argv[2])
j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,duration,nb_read_frames', '-of', 'json', f], capture_output=True, text=True).stdout)
v = [s for s in j['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in j['streams'] if s['codec_type'] == 'audio'][0]
vf, vd, ad = int(v['nb_read_frames']), float(v['duration']), float(a['duration'])
ok = vf == n and abs(vd - ad) < 1 / 30 + 0.025   # AAC 帧粒度约 21ms
print(f"  {f.split('/')[-1]}: 视频 {vf} 帧 {vd:.3f}s，音频 {ad:.3f}s {'✓' if ok else '✗'}")
sys.exit(0 if ok else 3)
PY
}
ENC="-c:v libx264 -pix_fmt yuv420p -movflags +faststart"
if [ "$MODE" = test ]; then
  ffmpeg -y -hide_banner -loglevel error -framerate 30 -i frames/f%05d.jpg -i audio.m4a $ENC -preset veryfast -crf 23 -c:a copy -t $VDUR "$DEST/test.mp4"
  dur_check "$DEST/test.mp4"; echo "master(test) ok -> $DEST/test.mp4"; exit 0
fi
for f in final.mp4 final-upload.mp4; do [ ! -e "$DEST/$f" ] || { echo "✗ $DEST/$f 已存在，成片不覆盖（新版本请用新目录）" >&2; exit 4; }; done
ffmpeg -n -hide_banner -loglevel error -framerate 30 -i frames/f%05d.jpg -i audio.m4a $ENC -preset slow -crf 17 -profile:v high -c:a copy -t $VDUR "$DEST/final.mp4"
ffmpeg -n -hide_banner -loglevel error -i "$DEST/final.mp4" -c:v libx264 -preset slow -crf 24 -maxrate 5M -bufsize 10M -pix_fmt yuv420p -movflags +faststart -c:a copy "$DEST/final-upload.mp4"
dur_check "$DEST/final.mp4"; dur_check "$DEST/final-upload.mp4"
echo "master ok -> $DEST/final.mp4, $DEST/final-upload.mp4"
