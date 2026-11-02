"""确定性逐帧渲染：Playwright 打开 <film>/scene.html，逐帧调用 window.draw(t) 截图。

用法（在仓库任意位置运行）：
  python3 engine/render.py FILM_DIR stills 0,9,17,26 [--out DIR]     # 关键时刻 PNG 静帧（默认 out/stills）
  python3 engine/render.py FILM_DIR frames [--jobs 6] [--seconds S]  # 全片 JPG 帧到 out/frames（30fps）
  python3 engine/render.py FILM_DIR cover                            # 3:4 封面 out/cover-3x4.jpg；写了 cover43 再出 4:3 横封面 out/cover-4x3.jpg

rhythm.json：存在时解析后注入页面为 window.RHYTHM（场景时间、高潮、拍点都从它来，audio.py 读同一份）。
浏览器：优先环境变量 CHROME，其次系统 Chrome / Chromium（含 macOS 应用路径），都没有时用 Playwright 自带 Chromium。
字体：页面就绪后核对画面字体 Noto Serif CJK SC 真的在，缺了直接报错（vibe_env.check_font）。
"""
import argparse, asyncio, base64, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import rhythm as _rh
from vibe_env import chrome_path, check_font
from playwright.async_api import async_playwright

FPS = 30
ARGS = ['--force-color-profile=srgb', '--font-render-hinting=none', '--allow-file-access-from-files']  # 贴纸 PNG 走 file://，不加这个画布会被污染，toDataURL 报 SecurityError
if sys.platform == 'darwin':   # macOS 用 GPU 画文字和光晕时同一帧重渲会差 1–2 个色阶；软件渲染逐字节一致，速度差不多
    ARGS.append('--disable-gpu')


def rhythm_js(scene):
    r = _rh.load(scene.parent)
    return f'window.RHYTHM={json.dumps(r.to_js(), ensure_ascii=False)};' if r else 'window.RHYTHM=null;'


async def open_page(pw, scene):
    exe = chrome_path()
    b = await pw.chromium.launch(**({'executable_path': exe} if exe else {}), args=ARGS)
    p = await b.new_page(viewport={'width': 1080, 'height': 1920})
    await p.add_init_script(rhythm_js(scene))
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    await p.goto(scene.as_uri())
    try:
        await p.evaluate('window.ready')
    except Exception as e:
        raise SystemExit(f'scene.html 出错：{e} {errs}')
    if errs: raise SystemExit(f'scene.html 出错：{errs}')
    await check_font(p)
    return b, p


async def grab(p, t, fmt='image/png', q=0.95):
    d = await p.evaluate(f'(()=>{{window.draw({t});return document.getElementById("c").toDataURL("{fmt}",{q})}})()')
    return base64.b64decode(d.split(',', 1)[1])


async def worker(pw, scene, out, frames):
    b, p = await open_page(pw, scene)
    for f in frames:
        (out / f'f{f:05d}.jpg').write_bytes(await grab(p, f / FPS, 'image/jpeg', 0.94))
    await b.close()


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('film'); ap.add_argument('mode', choices=['stills', 'frames', 'cover'])
    ap.add_argument('times', nargs='?', default='')
    ap.add_argument('--out'); ap.add_argument('--jobs', type=int, default=6)
    ap.add_argument('--seconds', type=float, help='只渲前 S 秒（冒烟测试用）')
    a = ap.parse_args()
    film = pathlib.Path(a.film).resolve(); scene = film / 'scene.html'
    async with async_playwright() as pw:
        if a.mode == 'stills':
            out = pathlib.Path(a.out or film / 'out' / 'stills'); out.mkdir(parents=True, exist_ok=True)
            b, p = await open_page(pw, scene)
            for t in [float(x) for x in a.times.split(',') if x]:
                (out / f'still_{t:06.2f}.png').write_bytes(await grab(p, t))
            await b.close()
        elif a.mode == 'cover':
            out = pathlib.Path(a.out or film / 'out'); out.mkdir(parents=True, exist_ok=True)
            b, p = await open_page(pw, scene)
            d = await p.evaluate("()=>{window.drawCover();return document.getElementById('c').toDataURL('image/jpeg',0.95)}")
            (out / 'cover-3x4.jpg').write_bytes(base64.b64decode(d.split(',', 1)[1]))
            # 4:3 横封面（1440×1080）：VIBE_FILM({cover43(){…}}) 或 scene.html 自己定义的 window.drawCover43
            d = await p.evaluate("()=>{if(typeof window.drawCover43!=='function')return null;window.drawCover43();"
                                 "return document.getElementById('c').toDataURL('image/jpeg',0.95)}")
            if d: (out / 'cover-4x3.jpg').write_bytes(base64.b64decode(d.split(',', 1)[1]))
            print('封面：cover-3x4.jpg' + (' + cover-4x3.jpg' if d else '（没有 cover43，横封面没出）'))
            await b.close()
        else:
            out = pathlib.Path(a.out or film / 'out' / 'frames'); out.mkdir(parents=True, exist_ok=True)
            for old in out.glob('f*.jpg'):
                old.unlink()
            b, p = await open_page(pw, scene)
            dur = await p.evaluate('window.DURATION'); await b.close()
            if a.seconds:
                dur = min(dur, a.seconds)
            n = int(round(dur * FPS))
            await asyncio.gather(*[worker(pw, scene, out, range(w, n, a.jobs)) for w in range(a.jobs)])
            got = len(list(out.glob('f*.jpg')))
            if got != n: raise SystemExit(f'帧数不对：应有 {n}，实际 {got}')
            (out / 'meta.json').write_text(json.dumps({'frames': n, 'fps': FPS, 'duration': n / FPS, 'partial': bool(a.seconds)}))
            print(f'{n} frames -> {out}')

asyncio.run(main())
