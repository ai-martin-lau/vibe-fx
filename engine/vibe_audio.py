"""Vibe 片音频库：自己合成的配乐 + 音效（不用任何采样、不扒原片 BGM）。

用法（片子的 audio.py）：
    from vibe_audio import *
    R = film(__file__)                 # 读同目录 rhythm.json（和画面同一份节奏表），初始化时长/种子
    mus, drm = score(R)                # 配乐：速度/调式/和声/鼓型/拨弦/尾声都来自 rhythm.json 的 music，段落强弱来自 sections
    sfx = z()
    transitions(sfx, R)                # 每个镜头交界按转场类型放瞬态（正好落在切点）
    climax_hits(sfx, R)                # 每个 hit 按类型（slam/snap/drop）放声音
    add(sfx, ding(84), R.sec('mark:q1'), .4)   # 自己的音效事件：时间用 R.sec('18b' / 'mark:x' / 'hit:x')
    finish(mus, drm, sfx, out_path(__file__))
输出目录：环境变量 VIBE_OUT（make.sh 设置：试片 out/test/，正式 out/work/），没有就是 FILM/out/。
响度在 engine/master.sh 里统一做（限幅 + 两遍 loudnorm 到 -14 LUFS）。
运行：PYTHONPATH=engine python3 <film>/audio.py   （engine/make.sh 会自动设置）
"""
import os, pathlib
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100; BEAT = 0.5; BAR = 2.0          # 只给旧接口 music_bed() 用；新片的节拍全部来自 rhythm.json
DUR = 60.0; N = int(SR * DUR); rng = np.random.default_rng(0)
EVENTS = []                                # score(R) 放下的每个音符/鼓点：{'layer','t','energy'}（tests/ 用来核对时序）


def init(dur, seed):
    global DUR, N, rng
    DUR = float(dur); N = int(SR * DUR); rng = np.random.default_rng(seed)


def out_path(film_file, name='audio_raw.wav'):
    o = pathlib.Path(os.environ.get('VIBE_OUT') or pathlib.Path(film_file).resolve().parent / 'out'); o.mkdir(parents=True, exist_ok=True); return o / name


def z(): return np.zeros((N,))
def add(dst, sig, t, g=1.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    s = sig[:N - i]; dst[i:i + len(s)] += g * s
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)

# ---------- 乐器 ----------
def pad(notes, d):
    t = tt(d); s = np.zeros_like(t)
    for m in notes:
        for det in (-0.12, 0, 0.12):
            f = hz(m) * 2 ** (det / 12); s += np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.3 * t)) * 0.5 + 0.18 * np.sin(4 * np.pi * f * t)
    a = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6); return lp(s * a, 1800) / len(notes) / 3
def pluck(m, d=0.45):
    t = tt(d); f = hz(m); s = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t / 0.12)
    return s * np.minimum(1, t / 0.003)
def piano(m, d=1.8):
    t = tt(d); f = hz(m); s = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / dd) for k, a, dd in [(1, 1, .9), (2, .45, .5), (3, .2, .3), (4, .1, .2)])
    return s * np.minimum(1, t / 0.004)
def bass(m, d=0.45):
    t = tt(d); f = hz(m); return np.tanh(1.5 * np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.25) * np.minimum(1, t / 0.005)
def kick():
    t = tt(.4); f = 42 + 120 * np.exp(-t / .035); return np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .16))
def hat(): t = tt(.08); return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t / .018) * .5

# ---------- 音效 ----------
def boom():   # 高潮砸字的冲击
    t = tt(2.2); return (np.sin(2 * np.pi * np.cumsum(32 + 90 * np.exp(-t / .07)) / SR) * np.exp(-t / .6) * 1.2
                        + lp(rng.standard_normal(len(t)), 300) * np.exp(-t / .25) * 1.4 + hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / .08) * .5)
def gong():
    t = tt(4); s = sum(a * np.sin(2 * np.pi * f * t * (1 + 0.002 * np.sin(2 * np.pi * 3 * t))) * np.exp(-t / d) for f, a, d in [(110, 1, 2), (165.4, .6, 1.5), (233, .45, 1.1), (331, .3, .8), (467, .2, .6)])
    return s * .5 * np.minimum(1, t / .004)
def whoosh(d=.5, up=True):   # 转场呼啸
    n = int(d * SR); x = rng.standard_normal(n); k = np.linspace(0, 1, n); out = np.zeros(n); seg = n // 10
    for i in range(10):
        f = 300 * (12 ** ((i / 9) if up else 1 - i / 9)); y = bp(x, f * .7, min(f * 1.5, 18000)); out[i * seg:(i + 1) * seg] = y[i * seg:(i + 1) * seg]
    return out * np.sin(np.pi * k) ** 2 * .7
def riser(d):   # 高潮前的上升音
    t = tt(d); f = 200 * 2 ** (t / d * 3); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .25 + hp(rng.standard_normal(len(t)), 2000) * .25) * (t / d) ** 2
def ding(m=88): t = tt(1.2); f = hz(m); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / .35) * .5
def tick(): t = tt(.03); return np.sin(2 * np.pi * 2400 * t) * np.exp(-t / .006) * .5   # 计数器
def scratch(): t = tt(.25); return bp(rng.standard_normal(len(t)), 900, 5000) * np.exp(-t / .08) * .6   # 划线


def _climax_hits_legacy(sfx, climaxes, riser_len=None, gong_on_last=True):
    """每个高潮下拍：上升音（收）→ 静音 → boom（放）；最后一个高潮可加锣。"""
    for i, D in enumerate(climaxes):
        last = i == len(climaxes) - 1
        rl = (riser_len or {}).get(D, 2.5 if last else 1.5)
        add(sfx, riser(rl), D - 0.75 - rl, 0.5); add(sfx, boom(), D, 1.25 if last else 1.0)
    if gong_on_last and climaxes:
        add(sfx, gong(), climaxes[-1], 0.8)


# ---------- 旧接口：固定 120 BPM Am F C G 底乐（只为兼容老片，新片用下面的 score(R)） ----------
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]
ARP = [0, 1, 2, 1, 2, 1, 0, 2]
OUTRO_MEL = [[76, 74, 72], [72, 69, 72], [67, 72, 76], [74, 71, 67]]


def music_bed(climaxes, pluck_from=4, bass_from=14, drums_from=18, full_from=None, drop=None, outro=None, prog=PROG):
    """返回 (mus, drm)。drop = 拨弦/贝斯/鼓停下的时刻（一般是主高潮）；outro = 钢琴尾声开始。
    full_from = 鼓变满、拨弦变亮的时刻（默认第一个高潮）。高潮下拍前 0.75s 音乐压低到 8%。"""
    full_from = full_from if full_from is not None else (climaxes[0] if climaxes else DUR)
    drop = drop if drop is not None else (climaxes[-1] if climaxes else DUR - 2)
    outro = outro if outro is not None else drop + 2
    mus = z(); drm = z()
    for bar in range(int(DUR / BAR) + 1):
        t0 = bar * BAR; root, ch = prog[bar % len(prog)]
        if t0 >= DUR - 2: break
        add(mus, pad([n - 12 for n in ch] + [ch[0]], BAR + 0.6), t0, 0.55 if t0 < outro else 0.7)
        if pluck_from <= t0 < drop:
            for i in range(8): add(mus, pluck(ch[ARP[i]] + 12), t0 + i * 0.25, 0.22 if t0 < full_from else 0.3)
        if bass_from <= t0 < drop:
            for b in range(4): add(mus, bass(root - 24), t0 + b * BEAT, 0.35)
        if drums_from <= t0 < drop:
            for b in range(4):
                if b in (0, 2) or t0 >= full_from: add(drm, kick(), t0 + b * BEAT, 0.7 if b in (0, 2) else 0.45)
                add(drm, hat(), t0 + b * BEAT + 0.25, 0.5 if t0 >= full_from else 0.3)
        if t0 >= outro:
            for i, m in enumerate(OUTRO_MEL[bar % 4]): add(mus, piano(m), t0 + i * 0.66, 0.28)
    env = np.ones(N)                     # 收：高潮下拍前 0.75s 把音乐压下去
    for D in climaxes:
        a, b = int((D - 0.75) * SR), int(D * SR); env[a:b] = np.linspace(1, 0.08, b - a)
    return mus * env, drm * env


# ======================= 节奏表驱动的配乐（每片自己的速度、和声、鼓型、尾声） =======================
# 用法见文件头。所有时间来自 rhythm.json（engine/rhythm.py），与画面同一份。

KEYS = {'C': 48, 'C#': 49, 'Db': 49, 'D': 50, 'D#': 51, 'Eb': 51, 'E': 52, 'F': 53, 'F#': 54, 'Gb': 54, 'G': 55, 'G#': 56, 'Ab': 56, 'A': 57, 'A#': 58, 'Bb': 58, 'B': 59}
DEG = {'i': 0, 'ii': 2, 'iii': 4, 'iv': 5, 'v': 7, 'vi': 9, 'vii': 11}
MINOR_OFF = {'iii': 3, 'vi': 8, 'vii': 10}   # 小调里大写 III VI VII 指降音级
PROGS = {
    'minor': ['i-VI-III-VII', 'i-iv-VI-V', 'i-VII-VI-VII', 'i-iv-i-V', 'i-VI-iv-V', 'i-III-VII-iv'],
    'major': ['I-V-vi-IV', 'vi-IV-I-V', 'I-iii-IV-V', 'IV-I-V-vi', 'I-IV-vi-V', 'I-vi-IV-V'],
}
DRUMS = {   # 每小节 16 格（4/4）。K 底鼓 S 军鼓/拍手 H 踩镲
    'four':   {'K': 'x...x...x...x...', 'S': '....x.......x...', 'H': '..x...x...x...x.'},
    'half':   {'K': 'x.......x.......', 'S': '........x.......', 'H': 'x.x.x.x.x.x.x.x.'},
    'broken': {'K': 'x.....x...x.....', 'S': '....x.......x..x', 'H': '..x..x..x.x..x..'},
    'heart':  {'K': 'x..x............', 'S': '................', 'H': '................'},
    'march':  {'K': 'x...x...x...x...', 'S': '..x...x...x.xx..', 'H': '................'},
    'none':   {'K': '................', 'S': '................', 'H': '................'},
}
ARPS = {'up8': [0, 1, 2, 1, 2, 1, 0, 2], 'up4': [0, 1, 2, 1], 'broken': [0, 2, 1, 2, 0, 2, 1, 2], 'pulse': [0] * 8,
        'wave': [0, 1, 2, 3, 2, 1, 0, 1], 'sparse': [0, None, 2, None, 1, None, None, None], 'none': []}
LEADS = ['pluck', 'bell', 'marimba', 'piano']
OUTROS = ['piano', 'bell', 'pad', 'none']


def bell(m, d=1.6):
    t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / .3) + .25 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / .15)) * np.exp(-t / .7) * np.minimum(1, t / .002) * .6
def marimba(m, d=.5):
    t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .03)) * np.exp(-t / .16) * np.minimum(1, t / .002)
def snare():
    t = tt(.25); return (hp(rng.standard_normal(len(t)), 1500) * np.exp(-t / .06) * .6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / .05) * .5)
def thump():   # 硬切的瞬态：短促低频 + 一点点噪声，给观众「切了」的身体感
    t = tt(.18); return np.sin(2 * np.pi * np.cumsum(60 + 140 * np.exp(-t / .02)) / SR) * np.exp(-t / .06) + hp(rng.standard_normal(len(t)), 4000) * np.exp(-t / .01) * .3


def chord_of(sym, root, mode):
    s = sym.strip(); low = s.lower(); base = low.rstrip('°')
    off = DEG[base]
    if mode == 'minor' and s[0].isupper() and base in MINOR_OFF: off = MINOR_OFF[base]
    if mode == 'minor' and base == 'iv' and s[0].islower(): off = 5
    r = root + off; minor = s[0].islower()
    return r, [r, r + (3 if minor else 4), r + 7]


class _Pick:
    def __init__(self, seed): self.r = np.random.default_rng(seed + 7)
    def __call__(self, lst): return lst[int(self.r.integers(len(lst)))]


def film(film_file, seed=None):
    """读同目录 rhythm.json，初始化时长和随机种子，返回 Rhythm。"""
    import rhythm as _rh
    R = _rh.load(pathlib.Path(film_file).resolve().parent)
    if R is None: raise SystemExit('缺 rhythm.json：画面和声音必须读同一份节奏表')
    lim = os.environ.get('VIBE_SECONDS')
    dur = min(R.duration, float(lim)) if lim else R.duration
    init(dur, seed if seed is not None else int(R.music.get('seed', R.raw.get('seed', 1))))
    R.audio_dur = dur
    return R


def score(R):
    """按节奏表出配乐：返回 (mus, drm)。参数都在 rhythm.json 的 music 里，没写的按 seed 选，所以每片都不一样。
    music: key, mode(minor|major), prog('i-VI-III-VII' 或列表), chord_beats(每个和弦几拍，默认一小节),
           drums(four|half|broken|heart|march|none), arp(up8|up4|broken|pulse|wave|sparse|none),
           lead(pluck|bell|marimba|piano), outro(piano|bell|pad|none), outro_at, pad_cut(Hz), swing(0–0.3)"""
    m = R.music; pick = _Pick(int(m.get('seed', R.raw.get('seed', 1))))
    mode = m.get('mode') or pick(['minor', 'minor', 'major'])
    root = KEYS[m.get('key') or pick(['A', 'D', 'E', 'C', 'F', 'G', 'B'])]
    prog = m.get('prog') or pick(PROGS[mode]); prog = prog.split('-') if isinstance(prog, str) else prog
    chords = [chord_of(s, root, mode) for s in prog]
    drums = DRUMS[m.get('drums') or pick(['four', 'half', 'broken', 'heart'])]
    arp = ARPS[m.get('arp') or pick(['up8', 'broken', 'wave', 'sparse', 'up4'])]
    lead = {'pluck': pluck, 'bell': bell, 'marimba': marimba, 'piano': piano}[m.get('lead') or pick(LEADS)]
    outro = m.get('outro') or pick(OUTROS)
    cut = float(m.get('pad_cut', pick([1200, 1800, 2600])))
    swing = float(m.get('swing', 0))
    cb = float(m.get('chord_beats', R.bpb))
    main = [h for h in R.hits if h['main']]
    outro_t = m.get('outro_t', (main[0]['t'] + R.beat_to_sec(R.sec_to_beat(main[0]['t']) + R.bpb) - main[0]['t']) if main else DUR)
    mus = z(); drm = z(); EVENTS.clear()
    # 时间一律按「拍号 → 速度表 → 秒」精确换算（R.beat_to_sec），半拍处变速、跨变速都准；
    # 段落强弱按每个音符/鼓点自己的发声时刻读（R.energy_at(tk)），不再只在和弦开头读一次。
    def ev(layer, t, g, sig, dst):
        add(dst, sig, t, g); EVENTS.append({'layer': layer, 't': t, 'energy': R.energy_at(t)})
    b = 0.0; ci = 0
    while True:
        t0 = R.beat_to_sec(b)
        if t0 >= DUR: break
        t1 = R.beat_to_sec(b + cb); bl = t1 - t0
        r_, ch = chords[ci % len(chords)]
        ev('pad', t0, 0.5 if t0 < outro_t else 0.7,
           lp(pad([n - 12 for n in ch] + [ch[0]], bl + 0.6), cut) if cut < 1800 else pad([n - 12 for n in ch] + [ch[0]], bl + 0.6), mus)
        for k in range(int(round(cb * 2))):            # 八分音符
            bk = b + k / 2
            tk = R.beat_to_sec(bk + (swing / 2 if k % 2 else 0))
            if tk >= outro_t or tk >= DUR: break
            e = R.energy_at(tk)
            if e >= 1 and arp:
                n = arp[k % len(arp)]
                if n is not None: ev('lead', tk, 0.2 if e < 3 else 0.28, lead(ch[n % 3] + 12 + (12 if n >= 3 else 0)), mus)
            if e >= 2 and k % 2 == 0: ev('bass', tk, 0.33, bass(r_ - 24), mus)
        for st in range(int(round(cb * 4))):            # 十六分音符鼓格
            bk = b + st / 4
            tk = R.beat_to_sec(bk + (swing / 4 if st % 2 else 0))
            if tk >= outro_t or tk >= DUR: break
            e = R.energy_at(tk)
            pos = int(round((bk % R.bpb) * 4)) % 16              # 小节内位置按绝对拍号算
            if e >= 3:
                if drums['K'][pos] == 'x': ev('kick', tk, 0.7, kick(), drm)
                if drums['S'][pos] == 'x': ev('snare', tk, 0.35, snare(), drm)
                if drums['H'][pos] == 'x': ev('hat', tk, 0.35, hat(), drm)
            elif e == 2 and pos == 0: ev('kick', tk, 0.5, kick(), drm)
        if t1 > outro_t and outro in ('piano', 'bell'):       # 尾声旋律：落在 outro_t 之后的三连音位置
            inst = piano if outro == 'piano' else bell
            mel = [ch[2] + 12, ch[1] + 12, ch[0] + 12] if ci % 2 else [ch[0] + 12, ch[2] + 12, ch[1] + 12]
            for i, nn in enumerate(mel):
                tk = R.beat_to_sec(b + i * cb / 3)
                if outro_t - 1e-6 <= tk < DUR: ev('outro', tk, 0.26, inst(nn), mus)
        b += cb; ci += 1
    env = np.ones(N)
    for h in R.hits:
        a_, b_ = int((h['t'] - (h['pre'] if h['type'] != 'snap' else 0.12)) * SR), int(h['t'] * SR)
        a_ = max(0, min(a_, N)); b_ = max(0, min(b_, N))
        if b_ > a_: env[a_:b_] = np.linspace(1, 0.08 if h['type'] != 'snap' else 0.4, b_ - a_)
    print(f'score: {mode} {m.get("key") or "?"} prog={"-".join(prog)} lead={lead.__name__} outro={outro} bpm={R.bpm}')
    return mus * env, drm * env


def lerp_beats(beats, bi):
    """旧接口（只做整拍间线性插值，拍内变速会不准）。新代码用 R.beat_to_sec(拍号)。"""
    i = int(bi); f = bi - i
    if i + 1 >= len(beats): return beats[-1]
    return beats[i] + (beats[i + 1] - beats[i]) * f


def transitions(sfx, R, g=0.5):
    """每个镜头交界按转场类型放声音，瞬态正好落在切点（QA 会拿 onset 对表）。
    cut → thump；match → 短呼啸收在切点 + thump；carry → 呼啸从切点起，跟着对象飞；fade → 不加瞬态（柔）。"""
    hit_t = [h['t'] for h in R.hits]
    for t, ty, _ in R.cuts():
        if any(abs(t - h) < 0.05 for h in hit_t): continue   # 高潮点由 climax_hits 负责
        if ty == 'cut': add(sfx, thump(), t, g)
        elif ty == 'match': add(sfx, whoosh(.35), t - .3, g * .8); add(sfx, thump(), t, g * .8)
        elif ty == 'carry': add(sfx, whoosh(max(.3, R.shot(_)['carry']), up=True), t, g * .8); add(sfx, thump(), t, g * .5)


def climax_hits(sfx, R, gong_on_main=True, **kw):
    """按 hit 类型：slam = 上升音（收）→ 静 → boom；snap = 短促 ding + 轻 boom；drop = 静默后低频 + 锣。
    旧片传秒数列表时走旧逻辑（固定 0.75s 收）。"""
    if isinstance(R, (list, tuple)): return _climax_hits_legacy(sfx, R, **kw)
    for h in R.hits:
        D = h['t']
        if h['type'] == 'slam':
            rl = 2.5 if h['main'] else 1.5; r0 = D - h['pre'] - rl
            # 上升音不跨切点：越过切点的上升音会把切点 thump 盖掉，QA 找不到切点瞬态（+1400ms FAIL）。
            # 窗口里有切点就从切点后 80ms 起，长度相应缩短（最短 0.6s）。
            cs = [c for c, ty, _ in R.cuts() if ty != 'fade' and r0 - 0.05 < c < D - h['pre'] - 0.05]
            if cs and D - h['pre'] - (max(cs) + 0.08) >= 0.6: r0 = max(cs) + 0.08; rl = D - h['pre'] - r0
            elif cs: rl = 0
            if rl > 0: add(sfx, riser(rl), r0, 0.5)
            add(sfx, boom(), D, 1.25 if h['main'] else 1.0)
        elif h['type'] == 'snap':
            add(sfx, thump(), D, 0.8); add(sfx, ding(88), D, 0.5); add(sfx, boom(), D, 0.45)
        else:
            add(sfx, boom(), D, 0.9)
        if h['main'] and gong_on_main: add(sfx, gong(), D, 0.7)


def finish(mus, drm, sfx, path, fade=2.5):
    mix = 0.8 * mus + 0.7 * drm + 0.9 * sfx
    f = np.ones(N); a = int((DUR - fade) * SR); f[a:] = np.linspace(1, 0, N - a) ** 2; mix *= f
    mix = np.tanh(mix * 1.1) / 1.1                        # 软削波；真峰值在 master.sh 里限
    st = np.stack([mix, mix], 1)   # 双单声道：Haas 延迟会让 AAC 编码后单声道峰值多出 +5 dB
    sf.write(str(path), st / np.max(np.abs(st)) * 0.89, SR)
    print('audio ->', path)
