"""读字时间检查：画面上每段字停留得够不够读完。


用法：python3 engine/readcheck.py FILM [--seconds S] [--json OUT] [--step 0.1]
页面约定：vibe.js 的 window.TEXTS(t) 返回第 t 秒画面上每段字 {text, a, x0, y0, x1, y1}（txt()/rise()/slam() 都会登记）。
规则：一段字（同样的文字）从第一次「完整在画面里且透明度 ≥ 0.5」开始，连续停留时间要 ≥
      max(MIN, 汉字数 ÷ CJK_CPS + 其他字符数 ÷ LATIN_CPS + PAD)。默认 CJK_CPS 4.5 字/秒、LATIN_CPS 15、PAD 1.0、MIN 1.2。
      （Vibe 片字少、节奏快，PAD 比原版的 1.5 秒短；数字、符号这类不含汉字和字母的「计数器」不查；只有数字在变的字按同一段算。）
      试片只渲前 S 秒时，S 秒处被截断的字不判。
退出码：0 = 全部够读；1 = 有字停留太短；2 = 没法检查（页面没有 TEXTS 或整片没有字），不算通过。
"""
import argparse, asyncio, json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import rhythm as _rh
from playwright.async_api import async_playwright
from vibe_env import chrome_path

CJK = re.compile(r'[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]')
DIGITS = re.compile(r'\d+(?:[.,]\d+)*')
WORD = re.compile(r'[A-Za-z\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]')


def need(text, a):
    cjk = len(CJK.findall(text)); other = sum(1 for ch in text if not ch.isspace() and not CJK.match(ch))
    return max(a.min, cjk / a.cjk_cps + other / a.latin_cps + a.pad)


async def scan(film, step, seconds):
    exe = chrome_path()
    r = _rh.load(film)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(**({'executable_path': exe} if exe else {}), args=['--font-render-hinting=none', '--allow-file-access-from-files'])
        p = await b.new_page(viewport={'width': 1080, 'height': 1920})
        await p.add_init_script(f'window.RHYTHM={json.dumps(r.to_js(), ensure_ascii=False)};' if r else 'window.RHYTHM=null;')
        await p.goto((film / 'scene.html').as_uri()); await p.evaluate('window.ready')
        res = await p.evaluate('''([step, lim]) => {
          if (typeof window.TEXTS !== 'function') return {noTexts: true};
          const D = Math.min(window.DURATION, lim || 1e9), frames = [];
          for (let t = 0; t <= D + 1e-9; t += step) frames.push([t, window.TEXTS(t)]);
          return {D, full: window.DURATION, frames};
        }''', [step, seconds or 0])
        await b.close()
    return res


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('film'); ap.add_argument('--seconds', type=float); ap.add_argument('--json')
    ap.add_argument('--step', type=float, default=0.1); ap.add_argument('--cjk-cps', type=float, default=4.5)
    ap.add_argument('--latin-cps', type=float, default=15); ap.add_argument('--pad', type=float, default=1.0); ap.add_argument('--min', type=float, default=1.2)
    a = ap.parse_args(); film = pathlib.Path(a.film).resolve()
    res = asyncio.run(scan(film, a.step, a.seconds))
    if res.get('noTexts') or not any(f[1] for f in res['frames']):
        print('readcheck：没法检查（页面没有 window.TEXTS，或整片没有登记到字）。这不算通过。'); sys.exit(2)
    W, H, D = 1080, 1920, res['D']
    seen, partial = {}, {}
    for t, items in res['frames']:
        vis = set()
        for it in items:
            if 'kind' in it: continue          # 线、框（给 layoutcheck.py 用）
            text = DIGITS.sub('#', it['text'].strip())     # 只有数字在变的字（计数器、「第 1 圈 ×1.2」）算同一段
            if not text or not WORD.search(text) or it['a'] < .5: continue
            if not (it['x0'] >= -2 and it['y0'] >= -2 and it['x1'] <= W + 2 and it['y1'] <= H + 2):
                partial.setdefault(text, t); continue
            vis.add(text)
            s = seen.setdefault(text, {'text': text, 't0': t, 'run': 0.0, 'done': False})
            if not s['done']: s['run'] = min(t + a.step, D) - s['t0']
        for k, s in seen.items():
            if k not in vis: s['done'] = True
    rows = []
    for s in seen.values():
        n = need(s['text'], a); cut = (not s['done']) and s['t0'] + n > D and D < res['full'] - 1e-6
        st = 'SKIP' if cut else ('OK' if s['run'] >= n - 1e-6 else 'SHORT')
        rows.append({'text': s['text'], 't0': round(s['t0'], 2), 'need': round(n, 2), 'got': round(s['run'], 2), 'status': st})
    for k, t in partial.items():
        if k not in seen: rows.append({'text': k, 't0': round(t, 2), 'need': None, 'got': 0, 'status': 'OFFSCREEN'})
    rows.sort(key=lambda r: r['t0'])
    for r in rows:
        print(f"{r['status']:9} {r['t0']:6.2f}s  need {r['need'] if r['need'] is not None else '-':>5}  got {r['got']:5.2f}  {r['text'][:30]}")
    bad = [r for r in rows if r['status'] in ('SHORT', 'OFFSCREEN')]
    if a.json: pathlib.Path(a.json).write_text(json.dumps({'rows': rows, 'bad': len(bad), 'rule': vars(a) | {'film': str(film)}}, ensure_ascii=False, indent=1), encoding='utf-8')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
