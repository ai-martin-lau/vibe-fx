"""节奏表（rhythm map）：一支片一个 rhythm.json，画面（render.py 注入 window.RHYTHM）和声音（vibe_audio）读同一份。
# rhythm.json 可选 "montage": [[起秒, 止秒], ...]：标明快切蒙太奇段，engine/motion.py 的切镜密度检查会跳过这些段。

时间写法（三种都行）：
  12.5        秒
  "18b"       第 18 拍（从 0 数），可写半拍 "18.5b"、四分之一拍 "18.25b"
  "4:2"       第 4 小节第 2 拍（都从 0 数）= 4*beats_per_bar + 2 拍
  "+6b"       只在 shots[].len 里用：镜头长度 6 拍

rhythm.json 结构（见 templates/film/rhythm.json）：
{
  "bpm": 92,                        # 本片速度，每片自己定
  "beats_per_bar": 4,
  "tempo": [{"at":"32b","bpm":104}],# 可选：变速（例如揭晓前提速）。at 写拍号 = 全片累计拍号（可写半拍 "10.5b"）；写秒数 = 按前面已生效的速度表换算成拍号
  "duration": "auto" | 秒 | 拍,     # auto = 最后一个镜头结束
  "shots": [                        # 按顺序，镜头首尾相接
    {"id":"hook","len":"8b","in":"cut"},
    {"id":"curve","len":"14b","in":"match"},          # in = 进入这个镜头的转场
    {"id":"q","len":"6b","in":"fade","fade":"1b"},     # fade 必须显式写（opt-in），fade = 交叉时长
    {"id":"carry","len":"8b","in":"carry","carry":"0.5b"}
  ],
  "hits": [                         # 高潮/揭晓点
    {"id":"reveal1","at":"40b","type":"slam","pre":"1.5b"}   # type: slam|snap|drop；pre = 收暗/压乐提前量
  ],
  "marks": {"q1":"22b"},            # 任意命名时间点，画面和音效都可引用
  "sections": [{"at":0,"energy":0},{"at":"8b","energy":2}],  # 0 只有铺底 1 +拨弦 2 +贝斯 3 +鼓
  "music": {"key":"A","mode":"minor","prog":"i-VI-III-VII","drums":"half","arp":"up8","outro":"piano","outro_at":"hit:main"}
}
留人节奏（pacing）：揭示点 = 所有 hits + 所有 marks。「你猜」、转折、新数字这类拉回注意力的时刻，不是高潮就写成 mark。
  第一个揭示最晚 REVEAL_FIRST 秒；任意两个揭示之间、最后一个揭示到片尾，最长 REVEAL_GAP 秒。超了 QA 记 WARN（不拦片）。
用法：python3 engine/rhythm.py FILM_DIR   打印解析后的秒数表和留人节奏（写完 rhythm.json 就跑，不用等渲染）
"""
import json, pathlib, re, sys

TRANSITIONS = {'cut', 'match', 'carry', 'fade'}
FPS = 30
q = lambda t: round(round(float(t) * FPS) / FPS, 6)   # 镜头交界、高潮、标记都吸附到帧格上：切点 = 某一整帧，音效也落在同一时刻
HIT_TYPES = {'slam', 'snap', 'drop'}
CHANGE_GAP = 2.5   # 画面变化密度（只提示）：镜头起点 + hits + marks 之间超过 2.5 秒就提醒（文字出得太慢，观众会等太久）
REVEAL_FIRST, REVEAL_GAP = 3.5, 15.0   # playbook §3：第 1 个揭示 3 秒左右；每 10–15 秒拉回一次（含结尾）


class Rhythm:
    def __init__(self, d):
        self.raw = d
        self.bpm = float(d.get('bpm', 120)); self.bpb = int(d.get('beats_per_bar', 4))
        # 变速段：[(起始拍, bpm)]
        # 拍号写法（"24b" / "6:0" / "24.5b"）直接是拍；秒数写法按「到这里为止已经建好的速度表」换算成拍，
        # 所以第二次变速写秒数也准（以前一律按原速度换算，第一次变速之后的秒数会偏）。
        self.segs = [(0.0, self.bpm)]
        tempo = d.get('tempo', [])
        for s in sorted(tempo, key=lambda s: (isinstance(s['at'], (int, float)), self._beats_noseg(s['at']))):
            b = self.sec_to_beat(float(s['at'])) if isinstance(s['at'], (int, float)) else self._parse_beats(s['at'])
            self.segs.append((b, float(s['bpm'])))
            self.segs.sort(key=lambda x: x[0])
        self._resolve()

    # ---- 时间换算 ----
    def _beats_noseg(self, x):
        if isinstance(x, (int, float)): return float(x) * self.bpm / 60.0
        return self._parse_beats(x)

    def _parse_beats(self, x):
        x = str(x).strip().lstrip('+')
        m = re.fullmatch(r'(-?\d+(?:\.\d+)?)b', x)
        if m: return float(m.group(1))
        m = re.fullmatch(r'(\d+):(\d+(?:\.\d+)?)', x)
        if m: return int(m.group(1)) * self.bpb + float(m.group(2))
        raise ValueError(f'看不懂的拍号：{x!r}')

    def beat_to_sec(self, b):
        t = 0.0
        for i, (b0, bpm) in enumerate(self.segs):
            b1 = self.segs[i + 1][0] if i + 1 < len(self.segs) else float('inf')
            if b <= b1: return t + (b - b0) * 60.0 / bpm
            t += (b1 - b0) * 60.0 / bpm
        return t

    def sec_to_beat(self, s):
        t = 0.0
        for i, (b0, bpm) in enumerate(self.segs):
            b1 = self.segs[i + 1][0] if i + 1 < len(self.segs) else float('inf')
            seg = (b1 - b0) * 60.0 / bpm
            if s <= t + seg: return b0 + (s - t) * bpm / 60.0
            t += seg
        return b0

    def sec(self, x):
        """任意时间写法 → 秒。也接受 'hit:id' / 'mark:id' / 'shot:id'（镜头开始）。"""
        if isinstance(x, (int, float)): return float(x)
        x = str(x)
        if x.startswith('hit:'):
            return self.hit(x[4:])['t']
        if x.startswith('mark:'): return self.marks[x[5:]]
        if x.startswith('shot:'): return self.shot(x[5:])['a']
        return self.beat_to_sec(self._parse_beats(x))

    def length_sec(self, start_sec, ln):
        if isinstance(ln, (int, float)): return float(ln)
        b0 = self.sec_to_beat(start_sec)
        return self.beat_to_sec(b0 + self._parse_beats(ln)) - start_sec

    def length_before(self, end_sec, ln):
        """以 end_sec 为终点往回量 ln（秒或拍）→ 秒数。拍数按速度表逐段换算，跨变速也准。"""
        if isinstance(ln, (int, float)): return float(ln)
        b1 = self.sec_to_beat(end_sec)
        return end_sec - self.beat_to_sec(max(0.0, b1 - self._parse_beats(ln)))

    # ---- 解析 ----
    def _resolve(self):
        d = self.raw; t = 0.0; self.shots = []
        for i, s in enumerate(d.get('shots', [])):
            if 'at' in s: t = self.sec(s['at'])
            ln = self.length_sec(t, s['len'])
            tr = s.get('in', 'cut')
            if tr not in TRANSITIONS: raise ValueError(f'镜头 {s.get("id")} 的转场 {tr!r} 不认识，可选 {TRANSITIONS}')
            if i == 0: tr = 'cut'
            sh = {'id': s.get('id', f's{i}'), 'a': q(t), 'b': q(t + ln), 'in': tr}
            if tr == 'fade': sh['fade'] = self.length_sec(t, s.get('fade', '1b'))
            if tr == 'carry': sh['carry'] = self.length_sec(t, s.get('carry', '1b'))
            if tr == 'match': sh['match'] = self.length_sec(t, s.get('match', '0.5b'))
            if 'dir' in s: sh['dir'] = s['dir']
            self.shots.append(sh); t += ln
        dur = d.get('duration', 'auto')
        self.duration = q(t if dur == 'auto' else self.sec(dur))
        self.marks = {}
        for k, v in d.get('marks', {}).items(): self.marks[k] = q(self.sec(v))
        self.hits = []
        for h in d.get('hits', []):
            ty = h.get('type', 'slam')
            if ty not in HIT_TYPES: raise ValueError(f'hit {h.get("id")} 类型 {ty!r} 不认识，可选 {HIT_TYPES}')
            at = self.sec(h['at'])
            # 提前量从高潮点往回数拍（跨变速也准）：pre 秒 = at − (at 的拍号 − pre 拍) 对应的秒数
            pre = self.length_before(at, h['pre'] if 'pre' in h else '1.5b')   # 默认一拍半（慢歌更长、快歌更短）
            self.hits.append({'id': h.get('id', f'h{len(self.hits)}'), 't': q(at), 'type': ty,
                              'pre': round(pre, 6), 'main': bool(h.get('main', False)),
                              'freeze': int(h.get('freeze', 3 if ty == 'slam' else 0))})
        if self.hits and not any(h['main'] for h in self.hits): self.hits[-1]['main'] = True
        self.sections = sorted([{'t': self.sec(s['at']), 'energy': int(s.get('energy', 2)), **{k: s[k] for k in ('palette', 'tr', 'd') if k in s}} for s in d.get('sections', [{'at': 0, 'energy': 2}])], key=lambda s: s['t'])
        self.music = dict(d.get('music', {}))
        if 'outro_at' in self.music: self.music['outro_t'] = self.sec(self.music['outro_at'])

    def tempo_at(self, s):
        return [bpm for b0, bpm in self.segs if self.beat_to_sec(b0) <= s + 1e-9][-1]

    def hit(self, hid):
        if hid == 'main': return [h for h in self.hits if h['main']][0]
        for h in self.hits:
            if h['id'] == hid: return h
        raise KeyError(hid)

    def shot(self, sid):
        for s in self.shots:
            if s['id'] == sid: return s
        raise KeyError(sid)

    def cuts(self):
        """所有镜头交界（不含 0）：[(秒, 转场类型, 镜头 id)]"""
        return [(s['a'], s['in'], s['id']) for s in self.shots[1:]]

    def beats(self, until=None):
        """拍点秒数列表（含变速）。"""
        until = self.duration if until is None else until; out = []; b = 0.0
        while True:
            s = self.beat_to_sec(b)
            if s > until + 1e-9: break
            out.append(s); b += 1
        return out

    def bars(self, until=None):
        return self.beats(until)[::self.bpb]

    def energy_at(self, s):
        e = 0
        for sec in self.sections:
            if sec['t'] <= s + 1e-9: e = sec['energy']
        return e

    def pacing(self):
        """留人节奏：{'events': [(秒, 名字)], 'first', 'max_gap', 'tail', 'warn': [(秒, 说明)]}。"""
        ev = sorted([(h['t'], 'hit:' + h['id']) for h in self.hits] + [(t, 'mark:' + k) for k, t in self.marks.items()])
        ts = [t for t, _ in ev]; warn = []
        if not ev:
            return {'events': [], 'first': None, 'max_gap': self.duration, 'tail': self.duration,
                    'warn': [(0.0, f'没有揭示点（hits 和 marks 都是空的），全片 {self.duration:.1f}s 没有一次拉回注意力')]}
        if ts[0] > REVEAL_FIRST:
            warn.append((0.0, f'第一个揭示在 {ts[0]:.1f}s（{ev[0][1]}），晚于 {REVEAL_FIRST:g}s'))
        span = list(zip(ev, ev[1:] + [(self.duration, '片尾')]))
        for (a, na), (b, nb) in span:
            if b - a > REVEAL_GAP + 1e-6:
                warn.append((a, f'{na} {a:.1f}s → {nb} {b:.1f}s 隔了 {b - a:.1f}s 没有新揭示（≤{REVEAL_GAP:g}s）'))
        gaps = [b - a for (a, _), (b, _) in span]
        return {'events': [(round(t, 3), n) for t, n in ev], 'first': round(ts[0], 3), 'max_gap': max(gaps),
                'tail': self.duration - ts[-1], 'warn': warn}

    def changes(self):
        """画面变化密度：镜头起点 + hits + marks 都算一次新字/新画面。返回 {'events','max_gap','avg_gap','warn'}。
        每一行新字都写成 mark（场景里用 M() 取时间），这项才量得准。"""
        ts = sorted(set(round(t, 3) for t in [s['a'] for s in self.shots] + [h['t'] for h in self.hits] + list(self.marks.values())))
        ts = [t for t in ts if t < self.duration]
        pts = ts + [self.duration]
        gaps = [(a, b - a) for a, b in zip(pts, pts[1:])]
        warn = [(a, f'{a:.1f}s 起 {g:.1f}s 没有新字或新画面（≤{CHANGE_GAP:g}s）') for a, g in gaps if g > CHANGE_GAP + 1e-6]
        return {'events': ts, 'max_gap': max(g for _, g in gaps) if gaps else self.duration,
                'avg_gap': self.duration / max(len(ts), 1), 'warn': warn}

    def to_js(self):
        return {'bpm': self.bpm, 'bpb': self.bpb, 'duration': self.duration, 'shots': self.shots,
                'hits': self.hits, 'marks': self.marks, 'beats': [round(b, 6) for b in self.beats()],
                'sections': self.sections}


def load(film_dir):
    p = pathlib.Path(film_dir) / 'rhythm.json'
    if not p.exists(): return None
    return Rhythm(json.loads(p.read_text(encoding='utf-8')))


if __name__ == '__main__':
    r = load(sys.argv[1])
    if r is None: sys.exit('没有 rhythm.json')
    print(f'bpm {r.bpm}（变速 {r.segs[1:] or "无"}），时长 {r.duration:.3f}s')
    for s in r.shots: print(f"  {s['a']:7.3f}–{s['b']:7.3f}  {s['in']:5s}  {s['id']}")
    for h in r.hits: print(f"  hit {h['t']:7.3f}  {h['type']:5s} pre {h['pre']:.3f}s {'MAIN' if h['main'] else ''}  {h['id']}")
    for k, v in r.marks.items(): print(f'  mark {v:7.3f}  {k}')
    pc = r.pacing()
    print(f"留人节奏：揭示 {len(pc['events'])} 个，第一个 {pc['first']}s（≤{REVEAL_FIRST:g}），"
          f"最长间隔 {pc['max_gap']:.1f}s（≤{REVEAL_GAP:g}），最后一个揭示到片尾 {pc['tail']:.1f}s")
    for t, msg in pc['warn']: print(f'  ⚠ {msg}')
    ch = r.changes()
    print(f"画面变化：{len(ch['events'])} 次，平均 {ch['avg_gap']:.1f}s 一次，最长 {ch['max_gap']:.1f}s（≤{CHANGE_GAP:g}，只提示）")
    for t, msg in ch['warn']: print(f'  ⚠ 变化密度：{msg}')
