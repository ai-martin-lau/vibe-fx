"""有证据的验收报告：python3 engine/qa.py FILM VIDEO [--out DIR] [--test --seconds S] [--expected-duration S]

模式必须显式给（不再按「比计划短」自动当试片）：
  正式片（默认）：帧数必须等于 rhythm.json 时长（或 --expected-duration）× 30，差 ≤ 1 帧，否则 FAIL。截短的正式片过不了。
  试片 --test --seconds S：预期时长 = min(S, rhythm.json 时长)，同样差 ≤ 1 帧。make.sh --test 会自动传。

自动做的（每项都有数字或图做证据）：
  1 规格：分辨率、帧率、帧数、音画时长差、帧数与预期时长一致（正式片 = rhythm.json 全长）
  2 低清审片代理 proxy.mp4（270×480，带声音）+ 逐帧扫描：
    - 接缝：每个镜头交界前后 ±0.5s 逐帧算「画面内容占比」和帧差，查死淡化（两边同时变空）、切点落帧偏差
    - 交界密采样图 cuts.jpg：每个交界 -1s…+1s 每 0.25s 一帧，外加切点前后各 1 帧
    - 全片扫描：空画面段、意外冻帧
    - 观看图 watch-N.jpg：全片每 0.5s 一帧（按时间码排）
    - 静帧联系表 stills.jpg：每个镜头中点 + 每个高潮后 0.3s，带安全区框
  3 声音：响度 I / 真峰值 TP / LRA；onset 检测，对每个切点和高潮查最近的声音瞬态；
    卡点按「实测画面切点 ↔ 实测声音瞬态」的真实音画差 av_ms 判（不是声音对计划切点）；
    画面切点测不准（帧差峰值不明显、淡化）的标「待核查」，不算通过；onset 落在半拍网格上的比例
    低频占比（20–120Hz 对其余频段，只提示）
  4 读字时间（engine/readcheck.py，只提示）：每段字停留够不够读完，有没有字从没完整进过画面
  4b 版面（engine/layoutcheck.py，只提示）：字压字、线穿字、框碰框、字出安全框
  5 留人节奏（rhythm.py，只提示）：第一个揭示几秒出现、两次揭示之间（含最后一个到片尾）最长隔多久
  6 开场第 1 帧（engine/opening.py，只提示）：主体占比、暗底空画面、第 1 秒动不动
自动做不了、必须有人（或代理）真看真听的项，报告里一律写「未验证」，看完把结论和问题时间码填进 qa-report.md。
退出码：有 FAIL 时为 1。
"""
import argparse, json, math, pathlib, subprocess, sys, datetime
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import rhythm as _rh
from vibe_env import label_font as font

FPS = 30; PW, PH = 270, 480; MW, MH = 135, 240     # 代理尺寸 / 指标尺寸
HOOK_ROWS = int(MH * 330 / 1920)                     # 顶部常驻钩子区不算内容（它一直在，会掩盖死淡化）


def tc(t):
    t = max(0, t); m = int(t // 60); s = t - 60 * m; f = int(round((s - int(s)) * FPS))
    if f == FPS: f = 0; s = int(s) + 1
    return f'{m:02d}:{int(s):02d}.{f:02d}f'


def probe(video):
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries',
                                   'stream=codec_type,width,height,r_frame_rate,duration,nb_read_frames', '-of', 'json', video],
                                  capture_output=True, text=True, check=True).stdout)
    v = [s for s in j['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in j['streams'] if s['codec_type'] == 'audio']
    n, d = v['r_frame_rate'].split('/')
    return {'w': v['width'], 'h': v['height'], 'fps': int(n) / int(d), 'frames': int(v['nb_read_frames']),
            'vdur': float(v['duration']), 'adur': float(a[0]['duration']) if a else None}


def decode(video, keep):
    """逐帧解码：返回 ink[]、diff[]、以及 keep 集合里帧号的 RGB 缩略图。"""
    cmd = ['ffmpeg', '-v', 'error', '-i', video, '-vf', f'scale={PW}:{PH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE); sz = PW * PH * 3
    ink, diff, thumbs, prev, i = [], [], {}, None, 0
    while True:
        buf = p.stdout.read(sz)
        if len(buf) < sz: break
        rgb = np.frombuffer(buf, np.uint8).reshape(PH, PW, 3)
        gy = rgb.reshape(MH, 2, MW, 2, 3).mean(axis=(1, 3)) @ np.array([.299, .587, .114])
        body = gy[HOOK_ROWS:int(MH * .86)]
        ink.append(float((body > 110).mean()))
        diff.append(float(np.abs(gy - prev).mean()) if prev is not None else 0.0)
        prev = gy
        if i in keep: thumbs[i] = Image.fromarray(rgb.copy())
        i += 1
    p.wait(); return np.array(ink), np.array(diff), thumbs


def low_band(x, sr, n=8192):
    """20–120Hz 与 120Hz–16kHz 的能量比（dB）。"""
    if len(x) < n * 4: return None
    k = len(x) // n; seg = x[:k * n].reshape(k, n) * np.hanning(n)
    pw = (np.abs(np.fft.rfft(seg, axis=1)) ** 2).mean(axis=0); f = np.fft.rfftfreq(n, 1 / sr)
    lo = pw[(f >= 20) & (f < 120)].sum(); hi = pw[(f >= 120) & (f < 16000)].sum()
    return None if hi <= 0 or lo <= 0 else float(10 * np.log10(lo / hi))


def onsets(video, sr=48000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    if len(x) == 0: return np.array([]), x, sr
    hop, win = 240, 1024                                  # 5ms 一跳
    nfr = 1 + (len(x) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(nfr)[:, None]
    mag = np.log1p(30 * np.abs(np.fft.rfft(x[idx] * np.hanning(win), axis=1)))
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(axis=1); flux = np.concatenate([[0], flux])
    k = int(0.4 * sr / hop); out = []
    for i in range(1, len(flux) - 1):
        lo, hi = max(0, i - k), min(len(flux), i + k)
        seg = flux[lo:hi]; th = np.median(seg) + 2.5 * np.median(np.abs(seg - np.median(seg))) + 1e-6
        if flux[i] > th and flux[i] >= flux[i - 1] and flux[i] > flux[i + 1] and flux[i] > 0.15 * flux.max():
            out.append((i * hop + win / 2) / sr + 0.004)   # 窗中心 → 瞬态起点的经验补偿（用引擎自己的切点瞬态标定过）
    # 合并 30ms 内的重复
    res = []
    for t in out:
        if not res or t - res[-1] > 0.03: res.append(t)
    return np.array(res), x, sr


def loudness(video):
    s = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', video, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = s[s.rfind('Summary:'):]
    def grab(key):
        for line in tail.splitlines():
            if line.strip().startswith(key):
                try: return float(line.split(':')[1].split()[0])
                except Exception: pass
        return None
    return {'I': grab('I:'), 'LRA': grab('LRA:'), 'TP': grab('Peak:')}


def sync_verdict(av_ms):
    """真实音画差判定：±40ms PASS，±80ms WARN，更大 FAIL。"""
    return 'PASS' if abs(av_ms) <= 40 else ('WARN' if abs(av_ms) <= 80 else 'FAIL')


def fmt_ms(v):
    return '' if v is None else f'{v:+.0f}ms'


def safe_boxes(im):
    d = ImageDraw.Draw(im, 'RGBA'); w, h = im.size
    d.rectangle([0, int(h * .8), w, h], fill=(255, 0, 0, 40)); d.rectangle([int(w * .885), int(h * .45), w, int(h * .8)], fill=(0, 120, 255, 45))
    return im


def grid(items, cols, path, tw=180, th=320, label_h=26):
    rows = max(1, math.ceil(len(items) / cols)); f = font(18)
    S = Image.new('RGB', (cols * (tw + 8) + 8, rows * (th + label_h + 8) + 8), (18, 18, 18)); d = ImageDraw.Draw(S)
    for i, (im, lab, red) in enumerate(items):
        x = 8 + (i % cols) * (tw + 8); y = 8 + (i // cols) * (th + label_h + 8)
        S.paste(im.resize((tw, th)), (x, y))
        if red: d.rectangle([x - 3, y - 3, x + tw + 2, y + th + 2], outline=(255, 70, 70), width=3)
        d.text((x, y + th + 3), lab, fill=(230, 230, 230), font=f)
    S.save(path, quality=85); return path


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('film'); ap.add_argument('video'); ap.add_argument('--out')
    ap.add_argument('--test', action='store_true', help='试片模式（必须同时给 --seconds）')
    ap.add_argument('--seconds', type=float, help='试片渲染的秒数')
    ap.add_argument('--expected-duration', type=float, help='覆盖预期时长（秒）；默认用 rhythm.json 时长')
    a = ap.parse_args()
    if a.test and a.seconds is None: ap.error('--test 必须同时给 --seconds（试片预期时长）')
    film = pathlib.Path(a.film).resolve(); video = str(pathlib.Path(a.video).resolve())
    out = pathlib.Path(a.out or pathlib.Path(video).parent / 'qa'); out.mkdir(parents=True, exist_ok=True)
    R = _rh.load(film)
    P = probe(video); dur = P['frames'] / FPS
    checks = []; issues = []
    def check(name, status, evidence): checks.append({'item': name, 'status': status, 'evidence': evidence})
    def issue(t, sev, what): issues.append({'t': t, 'tc': tc(t), 'sev': sev, 'what': what})

    # ---------- 1 规格 ----------
    spec_ok = P['w'] == 1080 and P['h'] == 1920 and abs(P['fps'] - 30) < .01
    av = abs(P['vdur'] - P['adur']) if P['adur'] else 99
    plan = a.expected_duration if a.expected_duration is not None else (R.duration if R else None)
    exp = (min(a.seconds, plan) if plan is not None else a.seconds) if a.test else plan
    mode = '试片' if a.test else '正式'
    exp_frames = int(round(exp * FPS)) if exp is not None else None
    fr_ok = exp_frames is not None and abs(P['frames'] - exp_frames) <= 1
    adur = P['adur'] if P['adur'] is not None else float('nan')
    st = 'PASS' if spec_ok and av < 1 / FPS + .025 and fr_ok else 'FAIL'
    if exp_frames is None and spec_ok and av < 1 / FPS + .025: st = '未验证'
    check('规格', st, f"{mode}：{P['w']}×{P['h']} {P['fps']:.2f}fps，{P['frames']} 帧 = {dur:.3f}s，音频 {adur:.3f}s（差 {av*1000:.0f}ms）；" +
          (f"预期 {exp_frames} 帧 = {exp:.3f}s（{'试片前 %gs' % a.seconds if a.test else 'rhythm.json 全长' if a.expected_duration is None else '--expected-duration'}），"
           f"差 {P['frames'] - exp_frames:+d} 帧（允许 ±1）" if exp_frames is not None else '没有 rhythm.json 也没给 --expected-duration，时长无法核对'))
    if st == 'FAIL': issue(0, 'FAIL', f'规格/时长不符（{mode}）：实际 {P["frames"]} 帧，预期 {exp_frames} 帧，见第 1 项')

    cuts = [c for c in (R.cuts() if R else []) if c[0] < dur - 1 / FPS]
    hits = [h for h in (R.hits if R else []) if h['t'] < dur]
    shots = [s for s in (R.shots if R else []) if s['a'] < dur]
    # 需要的缩略图帧
    keep = set()
    for t, ty, sid in cuts:
        c = int(round(t * FPS))
        for k in list(np.arange(-1, 1.001, .25)): keep.add(int(round((t + k) * FPS)))
        keep.update([c - 1, c, c + 1])
    for s in shots: keep.add(int(round((s['a'] + min(s['b'], dur)) / 2 * FPS)))
    for h in hits: keep.add(int(round((h['t'] + .3) * FPS)))
    keep.update(range(0, P['frames'], 15))
    keep = {k for k in keep if 0 <= k < P['frames']}

    # 代理
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', video, '-vf', f'scale={PW}:{PH}', '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '96k', str(out / 'proxy.mp4')], check=True)
    ink, diff, th = decode(video, keep)
    n = len(ink)
    hit_win = [(h['t'] - h['pre'] - 1 / FPS, h['t'] + 2 / FPS) for h in hits]
    in_hit = lambda t: any(a <= t <= b for a, b in hit_win)
    freeze_frames = set()
    for h in hits:
        for k in range(h['freeze'] + 1): freeze_frames.add(int(round(h['t'] * FPS)) - k)

    # ---------- 2 接缝 ----------
    rows = []; seam_fail = 0; seam_warn = 0
    for t, ty, sid in cuts:
        c = int(round(t * FPS))
        lo, hi = max(1, c - 15), min(n - 1, c + 15)
        before = np.median(ink[max(0, c - 45):max(1, c - 15)]) if c > 15 else ink[0]
        after = np.median(ink[min(n - 1, c + 15):min(n, c + 45)]) if c + 15 < n else ink[-1]
        ref = max(1e-4, min(before, after))
        win = ink[lo:hi]; lowf = lambda i: 0 <= i < n and ink[i] < 0.25 * ref
        lb = 0
        while lb < 15 and lowf(c - 1 - lb): lb += 1          # 切点前连续变空的帧
        la = 0
        while la < 15 and lowf(c + la): la += 1              # 切点后连续空的帧
        run = lb + la
        dead = lb >= 2 and la >= 2 and run >= 4 and not in_hit(t) and ref > 0.002   # 两边同时到零 = 死淡化
        empty_in = (not dead) and la >= 6 and ref > 0.002                            # 切进来是空画面（≥0.2s）
        w3 = diff[max(1, c - 3):min(n, c + 4)]; pk = int(np.argmax(w3)) + max(1, c - 3); off = pk - c
        local = np.median(diff[max(1, c - 30):min(n, c + 30)]) + 1e-6
        spike = diff[pk] / local
        if ty == 'fade':
            dead = bool((win < 0.25 * ref).sum() >= 4) and not in_hit(t) and ref > 0.002
            verdict = 'FAIL' if dead else 'PASS'
            note = f'交叉淡化，过渡区最低内容 {win.min()/ref*100:.0f}%'
        else:
            if dead: verdict = 'FAIL'
            elif spike < 2.5 or empty_in: verdict = 'WARN'
            elif abs(off) > 1: verdict = 'FAIL'
            else: verdict = 'PASS'
            note = f'切点帧差峰值在 {off:+d} 帧，是周围的 {spike:.1f} 倍' + ('（变化小：两镜头太像或切点没切出来）' if spike < 2.5 else '')
        if dead: note += f'；死淡化：切点前 {lb} 帧 + 后 {la} 帧内容都 <25%'
        if empty_in: note += f'；切进来前 {la} 帧几乎是空画面（关键内容应在切点就出现）'
        rows.append({'t': t, 'tc': tc(t), 'type': ty, 'shot': sid, 'seam_offset_frames': off, 'spike': round(spike, 1),
                     'min_content_pct': round(float(win.min() / ref * 100), 0), 'dead_frames': int(run) if dead else 0, 'empty_in_frames': int(la), 'visual': verdict, 'note': note})
        if verdict == 'FAIL': seam_fail += 1; issue(t, 'FAIL', f'交界 → {sid}（{ty}）：{note}')
        elif verdict == 'WARN': seam_warn += 1; issue(t, 'WARN', f'交界 → {sid}（{ty}）：{note}')
    if cuts:
        check('接缝（自动）', 'FAIL' if seam_fail else ('WARN' if seam_warn else 'PASS'),
              f'{len(cuts)} 个交界：{len(cuts)-seam_fail-seam_warn} 通过，{seam_warn} 提醒，{seam_fail} 不通过；死淡化 {sum(r["dead_frames"]>0 for r in rows)} 处，切入空画面 {sum(r["empty_in_frames"]>=6 for r in rows)} 处；密采样图 cuts.jpg')
    else:
        check('接缝（自动）', '未验证', '没有 rhythm.json 或范围内没有交界')

    # 全片扫描：空画面 / 冻帧
    empty = []; cur = 0
    for i, v in enumerate(ink):
        if v < 0.0015 and not in_hit(i / FPS): cur += 1
        else:
            if cur >= 12: empty.append((i - cur, i))
            cur = 0
    if cur >= 12: empty.append((n - cur, n))
    frz = []; cur = 0
    for i in range(1, n):
        if diff[i] < 0.02 and i not in freeze_frames: cur += 1
        else:
            if cur >= 4: frz.append((i - cur, i))
            cur = 0
    for a_, b_ in empty: issue(a_ / FPS, 'WARN', f'空画面 {tc(a_/FPS)}–{tc(b_/FPS)}（{(b_-a_)/FPS:.2f}s 几乎没有内容）')
    for a_, b_ in frz: issue(a_ / FPS, 'WARN', f'意外冻帧 {tc(a_/FPS)}–{tc(b_/FPS)}（{b_-a_} 帧完全不动）')
    check('空画面 / 冻帧扫描', 'WARN' if empty or frz else 'PASS', f'空画面 {len(empty)} 段，意外冻帧 {len(frz)} 段（高潮收暗和设计好的静止帧已排除）')

    def visual_cut(t):
        """实测画面切点：计划切点 ±3 帧内帧差峰值的位置。返回 (偏移帧, 是否可靠, 说明)。
        峰值不到周围中位数的 2.5 倍 = 两镜头太像或这里根本没切，位置不可信。"""
        c = int(round(t * FPS))
        if c < 1 or c >= n: return 0, False, '切点不在片内'
        w3 = diff[max(1, c - 3):min(n, c + 4)]; pk = int(np.argmax(w3)) + max(1, c - 3)
        local = np.median(diff[max(1, c - 30):min(n, c + 30)]) + 1e-6; sp = diff[pk] / local
        if sp < 2.5: return pk - c, False, f'帧差峰值只有周围的 {sp:.1f} 倍'
        return pk - c, True, f'帧差峰值 {sp:.1f} 倍'

    # ---------- 3 声音 ----------
    L = loudness(video)
    lst = 'PASS' if L['I'] is not None and -15 <= L['I'] <= -13 and L['TP'] is not None and L['TP'] <= -1.0 else 'FAIL'
    check('响度 / 峰值', lst, f"I {L['I']} LUFS（目标 −14±1），真峰值 {L['TP']} dBTP（≤ −1，AAC 编码后实测），LRA {L['LRA']} LU")
    if lst == 'FAIL': issue(0, 'FAIL', f"响度或峰值不达标：{L}")
    ons, x, sr = onsets(video)
    lb = low_band(x, sr)
    if lb is None: check('低频占比（自动，只提示）', '未验证', '没有音轨或太短，没法算')
    else:
        lst2 = 'WARN' if lb > 3 or lb < -20 else 'PASS'
        check('低频占比（自动，只提示）', lst2, f'20–120Hz 能量比 120Hz–16kHz {lb:+.1f} dB（提示范围 −20…+3）。'
              '偏高：手机外放发闷、响度被低音吃掉，给贝斯加二三次谐波、垫音不要低于 C3；偏低：没有底，补一层低音')
        if lst2 == 'WARN': issue(0, 'WARN', f'低频占比 {lb:+.1f} dB，超出提示范围（−20…+3）')
    sync = []
    targets = [(t, f'交界→{sid}（{ty}）', ty) for t, ty, sid in cuts] + [(h['t'], f"高潮 {h['id']}（{h['type']}）", 'hit') for h in hits]
    for t, lab, ty in sorted(targets):
        if ty == 'fade':
            sync.append({'t': t, 'tc': tc(t), 'what': lab, 'onset_ms': None, 'av_ms': None, 'status': '—（淡化不要求瞬态）'}); continue
        d = (ons - t) if len(ons) else np.array([9.9])
        j = int(np.argmin(np.abs(d))); ms = d[j] * 1000            # 声音 ↔ 计划切点（只作参考）
        vis_off, vis_ok, vis_note = visual_cut(t)                    # 画面 ↔ 计划切点（实测，帧）
        av_ms = ms - vis_off * 1000 / FPS                            # 真实音画差 = 声音瞬态 − 实测画面切点
        if not vis_ok:
            stt = '待核查'
        else:
            stt = sync_verdict(av_ms)
        sync.append({'t': t, 'tc': tc(t), 'what': lab, 'onset_ms': round(ms, 1), 'visual_offset_frames': vis_off,
                     'av_ms': round(av_ms, 1), 'visual_reliable': vis_ok, 'status': stt})
        if stt in ('WARN', 'FAIL'): issue(t, stt, f'{lab}：音画差 {av_ms:+.0f}ms（声音对计划 {ms:+.0f}ms，画面切点 {vis_off:+d} 帧）')
        elif stt == '待核查': issue(t, 'WARN', f'{lab}：画面切点测不准（{vis_note}），音画差无法自动判定，待核查（声音对计划 {ms:+.0f}ms）')
    need = [s for s in sync if s['onset_ms'] is not None]
    bad = [s for s in need if s['status'] == 'FAIL']; warn = [s for s in need if s['status'] == 'WARN']
    unk = [s for s in need if s['status'] == '待核查']
    judged = [s for s in need if s['status'] != '待核查']
    if need:
        med = np.median([s['av_ms'] for s in judged]) if judged else float('nan')
        worst = max((abs(s['av_ms']) for s in judged), default=float('nan'))
        check('音画卡点（自动，按实测音画差 av_ms）', 'FAIL' if bad else ('WARN' if warn or unk else 'PASS'),
              f'{len(need)} 个切点/高潮：{len(judged)-len(bad)-len(warn)} 个音画差在 ±40ms 内，{len(warn)} 个 40–80ms，{len(bad)} 个 >80ms，'
              f'{len(unk)} 个画面切点测不准待核查；av_ms 中位 {med:+.0f}ms、最大 {worst:.0f}ms；检测到 onset {len(ons)} 个')
    else:
        check('音画卡点（自动）', '未验证', '没有可对的切点（无 rhythm.json）')
    if R and len(ons):
        bt = R.beats(dur + 2); grid_t = bt + [(x + y) / 2 for x, y in zip(bt, bt[1:])]
        grid_t = np.array(grid_t)
        on_grid = np.mean([np.min(np.abs(grid_t - o)) <= .04 for o in ons]) * 100
        check('onset 落在半拍网格', 'INFO', f'{on_grid:.0f}% 的声音瞬态落在 rhythm.json 半拍网格 ±40ms 内（{R.bpm:g} BPM）')

    # ---------- 图 ----------
    rows_img = []
    for t, ty, sid in cuts:
        c = int(round(t * FPS)); idxs = sorted({int(round((t + k) * FPS)) for k in np.arange(-1, 1.001, .25)} | {c - 1, c, c + 1})
        for i in idxs:
            if i in th: rows_img.append((th[i], f'{tc(i/FPS)} {"◀切" if i == c else ""}', i == c))
    if rows_img: grid(rows_img, 12, out / 'cuts.jpg', 150, 267)
    stills = []
    for s in shots:
        i = int(round((s['a'] + min(s['b'], dur)) / 2 * FPS))
        if i in th: stills.append((safe_boxes(th[i].copy()), f"{tc(i/FPS)} {s['id']}", False))
    for h in hits:
        i = int(round((h['t'] + .3) * FPS))
        if i in th: stills.append((safe_boxes(th[i].copy()), f"{tc(i/FPS)} 高潮 {h['id']}", False))
    if stills: grid(stills, 6, out / 'stills.jpg')
    w_items = [(th[i], tc(i / FPS), False) for i in range(0, n, 15) if i in th]
    pages = []
    for p in range(0, len(w_items), 40):
        pages.append(grid(w_items[p:p + 40], 10, out / f'watch-{p//40+1}.jpg', 135, 240).name)

    # ---------- 留人节奏（只提示，不判 FAIL；按 rhythm.json 计划算，和渲了多长无关） ----------
    if R:
        pc = R.pacing()
        for t, msg in pc['warn']: issue(t, 'WARN', f'留人节奏：{msg}')
        ev = '、'.join(f'{t:.1f}s' for t, _ in pc['events']) or '无'
        check('留人节奏（自动，只提示）', 'WARN' if pc['warn'] else 'PASS',
              f"揭示点 {len(pc['events'])} 个（hits + marks）：{ev}；第一个 {pc['first'] if pc['first'] is not None else '—'}s（≤{_rh.REVEAL_FIRST:g}），"
              f"最长间隔 {pc['max_gap']:.1f}s（≤{_rh.REVEAL_GAP:g}，含最后一个揭示到片尾 {pc['tail']:.1f}s）。"
              '超了就在空档里加一个「你猜」、转折或新数字，或者砍掉空档')
        ch = R.changes()
        for t, msg in ch['warn']: issue(t, 'WARN', f'变化密度：{msg}')
        check('变化密度（自动，只提示）', 'WARN' if ch['warn'] else 'PASS',
              f"新字/新画面 {len(ch['events'])} 次（镜头起点 + hits + marks），平均 {ch['avg_gap']:.1f}s 一次，最长 {ch['max_gap']:.1f}s（≤{_rh.CHANGE_GAP:g}）。"
              '每行字写成 mark；空档里加新字、贴纸或数字，或者砍掉空档')
    else:
        check('留人节奏（自动，只提示）', '未验证', '没有 rhythm.json')

    # ---------- 动效能量（只提示；阈值按火视频校准，见 engine/motion.py） ----------
    try:
        import motion as _mo
        mon = (R.raw.get('montage', []) if R and hasattr(R, 'raw') else []) or []
        mo = _mo.measure(video, mon)
        for t, msg in mo['warn']: issue(t, 'WARN', f'动效能量：{msg}')
        check('动效能量（自动，只提示）', 'WARN' if mo['warn'] else 'PASS',
              f"每秒运动中位数 {mo['median']}（≥{_mo.MEDIAN_MIN}），完全不动 >{_mo.DEAD_MAX}s 的段 {len(mo['dead'])} 个，蒙太奇外切镜 {mo['cuts_per10']}/10s（≤{_mo.CUTS_MAX}）")
    except Exception as e:
        check('动效能量（自动，只提示）', '未验证', f'测量失败：{e}')

    # ---------- 开场第 1 帧（只提示；engine/opening.py，10-31 开场 2 秒对比得出） ----------
    try:
        import opening as _op
        op = _op.measure(video)
        for t, msg in op['warn']: issue(t, 'WARN', f'开场：{msg}')
        if op.get('ok'):
            goal = '' if op['coverage'] >= _op.COV_GOAL else f"（目标 ≥{_op.COV_GOAL*100:.0f}%，可以更满）"
            check('开场第 1 帧（自动，只提示）', 'WARN' if op['warn'] else 'PASS',
                  f"主体占比 {op['coverage']*100:.0f}%{goal}，背景亮度 {op['bg_luma']:.0f}，0–1s 帧差 {op['motion']}（≥{_op.MOTION_MIN}）。"
                  '第 1 帧要一个完整的大物件/人像 + 压在上面的数字 + 全屏在动')
        else: check('开场第 1 帧（自动，只提示）', '未验证', '读不到开场帧')
    except Exception as e:
        check('开场第 1 帧（自动，只提示）', '未验证', f'测量失败：{e}')

    # ---------- 读字时间（只提示，不判 FAIL） ----------
    rj = out / 'readcheck.json'
    try:
        rc = subprocess.run([sys.executable, str(pathlib.Path(__file__).resolve().parent / 'readcheck.py'), str(film), '--json', str(rj)]
                            + (['--seconds', str(a.seconds)] if a.test else []), capture_output=True, text=True, timeout=600)
        if rc.returncode == 2 or not rj.exists(): raise RuntimeError((rc.stdout + rc.stderr).strip()[-200:])
        rows_rc = json.loads(rj.read_text(encoding='utf-8'))['rows']
        bad_rc = [r for r in rows_rc if r['status'] in ('SHORT', 'OFFSCREEN')]
        for r in bad_rc:
            issue(r['t0'], 'WARN', f"读字时间不够：「{r['text']}」停 {r['got']:.1f}s，按字数要 {r['need']}s" if r['status'] == 'SHORT'
                  else f"字没有完整进过画面：「{r['text']}」")
        check('读字时间（自动，只提示）', 'WARN' if bad_rc else 'PASS',
              f"{len(rows_rc)} 段字，{len(bad_rc)} 段停留太短或没完整进画面（规则：汉字 4.5 字/秒 + 1 秒，至少 1.2 秒，明细 readcheck.json）。"
              '快节奏靠每屏少写字，不靠没读完就切')
    except Exception as e:
        check('读字时间（自动，只提示）', '未验证', f'readcheck 没跑成：{e}')

    # ---------- 版面：压字 / 线穿字 / 出安全框 / 框碰框（只提示，见 engine/layoutcheck.py） ----------
    lj = out / 'layoutcheck.json'
    try:
        lc = subprocess.run([sys.executable, str(pathlib.Path(__file__).resolve().parent / 'layoutcheck.py'), str(film), '--json', str(lj)]
                            + (['--seconds', str(a.seconds)] if a.test else []), capture_output=True, text=True, timeout=900)
        if lc.returncode == 2 or not lj.exists(): raise RuntimeError((lc.stdout + lc.stderr).strip()[-200:])
        rows_lc = json.loads(lj.read_text(encoding='utf-8'))['rows']
        for r in rows_lc: issue(r['t0'], 'WARN', f"版面 {r['kind']}：{r['what']}（{r['t0']}–{r['t1']}s）")
        check('版面：压字/线穿字/出框（自动，只提示）', 'WARN' if rows_lc else 'PASS',
              f"{len(rows_lc)} 处（字×字、线×字、框×框、出安全框 40px；明细 layoutcheck.json）。线和框要用 glowLine()/logShape() 画才查得到，"
              '图片、粒子挡字查不到，看 watch-*.jpg')
    except Exception as e:
        check('版面：压字/线穿字/出框（自动，只提示）', '未验证', f'layoutcheck 没跑成：{e}')

    # ---------- 人工项 ----------
    check('静帧联系表（安全区、错字、曝光）', '未验证', '看 stills.jpg（红框=底部遮挡区，蓝框=右侧按钮栏），结论写进下方')
    check('抽帧总览图检查（每 0.5s 一帧）', '未验证', f'逐页看 {", ".join(pages)}：错字、空画面、构图、画面顺序；这一项查静态问题，不能代替正常速度观看')
    check('正常速度完整观看', '未验证', '用 proxy.mp4 或成片按 1× 速度、带声音从头到尾真看一遍，节奏拖沓/看不清/太快的地方记时间码。'
          '抽帧图、密采样图都不能代替这一项；没真看就保持未验证')
    check('实际听审（耳机）', '未验证', '听 proxy.mp4：音乐情绪、突兀的音效、削波、卡点手感；机器只测了数字')

    fails = [c for c in checks if c['status'] == 'FAIL']
    rep = [f"# QA 报告 · {film.name}", '', f"- 文件：`{video}`", f"- 生成：{datetime.datetime.now().astimezone().isoformat(timespec='seconds')}",
           f"- 代理：`proxy.mp4`（{PW}×{PH}）；交界密采样：`cuts.jpg`；静帧：`stills.jpg`；观看图：{', '.join('`'+p+'`' for p in pages)}", '',
           '## 检查项', '', '| 项 | 结果 | 证据 |', '|---|---|---|']
    rep += [f"| {c['item']} | **{c['status']}** | {c['evidence']} |" for c in checks]
    if rows:
        rep += ['', '## 交界明细（视觉）', '', '| 时间码 | 进入镜头 | 转场 | 帧差峰值偏差 | 过渡区最低内容 | 死淡化/切入空帧 | 结论 |', '|---|---|---|---|---|---|---|']
        rep += [f"| {r['tc']} | {r['shot']} | {r['type']} | {r['seam_offset_frames']:+d} 帧（×{r['spike']}） | {r['min_content_pct']:.0f}% | {r['dead_frames']} / {r['empty_in_frames']} | {r['visual']} |" for r in rows]
    if sync:
        rep += ['', '## 音画卡点明细', '', '判定只看「音画差」= 声音瞬态 − 实测画面切点；画面切点测不准的写「待核查」。', '',
                '| 时间码 | 事件 | 声音对计划 | 画面对计划 | 音画差 | 结论 |', '|---|---|---|---|---|---|']
        rep += [f"| {s['tc']} | {s['what']} | {fmt_ms(s['onset_ms'])} | "
                f"{'' if s.get('visual_offset_frames') is None else ('%+d 帧' % s['visual_offset_frames']) + ('' if s.get('visual_reliable') else '（测不准）')} | "
                f"{fmt_ms(s.get('av_ms'))} | {s['status']} |" for s in sync]
    rep += ['', '## 问题记录（时间码）', '', '| 时间码 | 级别 | 问题 | 处理 |', '|---|---|---|---|']
    rep += [f"| {i['tc']} | {i['sev']} | {i['what']} | 待处理 |" for i in sorted(issues, key=lambda i: i['t'])] or ['| — | — | 自动检查没有发现问题 | — |']
    rep += ['| | 人工 | （看片/听审发现的问题按时间码追加在这里） | |', '',
            '## 未验证', '', '下面这些项机器做不了。没真看、真听之前保持「未验证」，不要改成通过。'
            '「抽帧总览图检查」和「正常速度完整观看」是两项，分别勾，看了抽帧图不等于看过片：', '']
    rep += [f"- [ ] {c['item']}：{c['evidence']}" for c in checks if c['status'] == '未验证']
    (out / 'qa-report.md').write_text('\n'.join(rep) + '\n', encoding='utf-8')
    (out / 'qa.json').write_text(json.dumps({'checks': checks, 'cuts': rows, 'sync': sync, 'issues': issues, 'probe': P, 'loudness': L}, ensure_ascii=False, indent=1), encoding='utf-8')
    for c in checks: print(f"  [{c['status']}] {c['item']}：{c['evidence']}")
    print(f"QA -> {out/'qa-report.md'}")
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
