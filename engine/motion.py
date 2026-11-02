"""动效能量检查（只提示）。用法：python3 engine/motion.py VIDEO [rhythm.json]
方法：10fps、96x96 灰度，算相邻帧平均绝对差。阈值是经验值，参考了几条节奏好的竖屏短视频：
- 每秒运动中位数 < MEDIAN_MIN（0.4）→ 提示
- 完全不动（单帧差 < DEAD_EPS 0.05）连续 > DEAD_MAX 2.5s → 提示
- 蒙太奇段以外切镜 > CUTS_MAX 4 次/10s → 提示（单帧差 > 30 算切）
蒙太奇段写在 rhythm.json 的 "montage": [[起秒, 止秒], ...]。"""
import subprocess, sys, json, numpy as np
MEDIAN_MIN, DEAD_EPS, DEAD_MAX, CUT_DIFF, CUTS_MAX = 0.4, 0.05, 2.5, 30, 4.0
def measure(video, montage=()):
    raw = subprocess.run(['ffmpeg', '-v', '0', '-i', video, '-vf', 'fps=10,scale=96:96,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, 96, 96).astype(np.float32)
    d = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2)); dur = len(a) / 10
    n = max(1, len(d) // 10); med = float(np.median(d[:n * 10].reshape(n, -1).mean(1)))
    runs = []; st = None
    for i, x in enumerate(list(d) + [99]):
        if x < DEAD_EPS and st is None: st = i
        elif x >= DEAD_EPS and st is not None:
            if (i - st) / 10 > DEAD_MAX: runs.append((st / 10, i / 10))
            st = None
    inm = lambda t: any(a_ <= t <= b_ for a_, b_ in montage)
    cuts = [(i + 1) / 10 for i, x in enumerate(d) if x > CUT_DIFF]
    outside = [t for t in cuts if not inm(t)]
    mlen = sum(max(0, min(b_, dur) - a_) for a_, b_ in montage)
    cp10 = len(outside) / max(1e-6, (dur - mlen) / 10)
    warn = []
    if med < MEDIAN_MIN: warn.append((0, f'每秒运动中位数 {med:.2f} < {MEDIAN_MIN}：静止时画面完全不动，加底层慢推/漂移/微粒'))
    for a_, b_ in runs: warn.append((a_, f'完全不动 {a_:.1f}–{b_:.1f}s（{b_-a_:.1f}s > {DEAD_MAX}s）'))
    if cp10 > CUTS_MAX: warn.append((0, f'蒙太奇外切镜 {cp10:.1f} 次/10s > {CUTS_MAX}（火视频 0–2.7）：太碎，合并镜头或标 montage'))
    return dict(median=round(med, 2), dead=runs, cuts=len(cuts), cuts_per10=round(cp10, 2), warn=warn)
if __name__ == '__main__':
    m = json.load(open(sys.argv[2])).get('montage', []) if len(sys.argv) > 2 else []
    r = measure(sys.argv[1], m); print(json.dumps({k: v for k, v in r.items() if k != 'warn'}, ensure_ascii=False))
    for t, w in r['warn']: print('WARN', f'{t:.1f}s', w)
    if not r['warn']: print('PASS')
