"""开场第 1 帧检查（只提示）。用法：python3 engine/opening.py VIDEO
思路：好的开场第 1 帧就是一个完整的大物件/人像，数字压在物件上，全屏在动；差的是暗底 + 小字 + 大片空白。
方法：解码 0s、0.5s、1.0s 三帧（270×480），背景色取四条边的中位色。
- 主体占比：与背景色差 > COV_DIFF 的像素占比 < COV_MIN（15%）→ 提示「第 1 帧太空」；15–40% 只在报告里写「可以更满」，目标 ≥ COV_GOAL（40%）
- 暗底：背景亮度 < DARK_BG 且主体占比 < COV_MIN → 提示「暗底空画面」（只有暗底不算问题）
- 开场动：0→0.5s、0.5→1.0s 两段平均帧差都 < MOTION_MIN → 提示「第 1 秒全屏不动」
阈值是经验值：<15% 提示；≥40% 算「目标」不算硬线。"""
import subprocess, sys, json, numpy as np
COV_DIFF, COV_MIN, COV_GOAL, DARK_BG, MOTION_MIN = 40.0, 0.15, 0.40, 40.0, 1.2
W, H = 270, 480
def frames(video, ts=(0, .5, 1.0)):
    out = []
    for t in ts:
        raw = subprocess.run(['ffmpeg', '-v', '0', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                             capture_output=True).stdout
        if len(raw) < W * H * 3: break
        out.append(np.frombuffer(raw[:W * H * 3], np.uint8).reshape(H, W, 3).astype(np.float32))
    return out
def measure(video):
    fr = frames(video)
    if not fr: return dict(ok=False, warn=[(0, '读不到开场帧')])
    f0 = fr[0]
    edge = np.concatenate([f0[:6].reshape(-1, 3), f0[-6:].reshape(-1, 3), f0[:, :6].reshape(-1, 3), f0[:, -6:].reshape(-1, 3)])
    bg = np.median(edge, 0); lum = float(bg @ [.299, .587, .114])
    cov = float((np.abs(f0 - bg).max(2) > COV_DIFF).mean())
    mot = [float(np.abs(b - a).mean()) for a, b in zip(fr, fr[1:])]
    warn = []
    if cov < COV_MIN: warn.append((0, f'第 1 帧主体只占 {cov*100:.0f}%（<{COV_MIN*100:.0f}%，目标 ≥{COV_GOAL*100:.0f}%）：让一个完整的大物件/人像占满画面，数字压在物件上'))
    if lum < DARK_BG and cov < COV_MIN: warn.append((0, f'第 1 帧是暗底空画面（背景亮度 {lum:.0f}）：换暖色/彩色底或铺满图'))
    if mot and max(mot) < MOTION_MIN: warn.append((0, f'第 1 秒几乎不动（帧差 {", ".join(f"{m:.1f}" for m in mot)} < {MOTION_MIN}）：加粒子、扫光或推镜'))
    return dict(ok=True, coverage=round(cov, 3), bg_luma=round(lum, 1), motion=[round(m, 2) for m in mot], warn=warn)
if __name__ == '__main__':
    r = measure(sys.argv[1]); print(json.dumps({k: v for k, v in r.items() if k != 'warn'}, ensure_ascii=False))
    for t, w in r['warn']: print('WARN', w)
    if not r['warn']: print('PASS')
