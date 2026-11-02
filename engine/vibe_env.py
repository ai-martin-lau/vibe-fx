"""运行环境：浏览器路径、画面字体自检、联系表标注字体。render.py / readcheck.py / qa.py / sheet.py 共用。
Linux（云端）和 macOS 都能跑；macOS 的装法见 README「macOS」。"""
import glob, os, shutil

MAC_BROWSERS = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Chromium.app/Contents/MacOS/Chromium']


def chrome_path():
    """优先环境变量 CHROME，其次系统 Chrome / Chromium（Linux 命令名、macOS 应用路径）；都没有返回 None，用 Playwright 自带 Chromium。"""
    for p in [os.environ.get('CHROME'), shutil.which('google-chrome'), shutil.which('google-chrome-stable'),
              shutil.which('chromium'), shutil.which('chromium-browser'), *MAC_BROWSERS]:
        if p and os.path.exists(p):
            return p
    return None


FONT = 'Noto Serif CJK SC'
# 字体在不在：同一串字分别按「本字体, monospace」「本字体, sans-serif」量宽度。
# 字体在：两次都用它，宽度相等。字体不在：各自回落到不同的后备字体，宽度不同。
# 不用 document.fonts.check：系统里根本没有的字体它也返回 true。
_PROBE = '''(fam)=>{const g=document.createElement('canvas').getContext('2d'),s='Wealth 0123 知识久';
  const m=f=>{g.font=f;return g.measureText(s).width};
  return [m(`700 80px "${fam}", monospace`), m(`700 80px "${fam}", sans-serif`)]}'''


async def check_font(page):
    """画面字体缺了直接报错：Chrome 会悄悄换成别的字体，片子照出，但和云端渲的不一样。
    确实要用后备字体出片，设 VIBE_ALLOW_FONT_FALLBACK=1（只用于临时排查，不能发）。"""
    a, b = await page.evaluate(_PROBE, FONT)
    if abs(a - b) <= 0.5:
        return
    msg = (f'✗ 没有画面字体「{FONT}」，Chrome 会换成别的字体，画面和云端不一致。\n'
           '  Debian/Ubuntu：sudo apt-get install fonts-noto-cjk\n'
           '  macOS：brew install --cask font-noto-serif-cjk-sc')
    if os.environ.get('VIBE_ALLOW_FONT_FALLBACK') == '1':
        print(msg.replace('✗', '⚠') + '\n  已按 VIBE_ALLOW_FONT_FALLBACK=1 继续，这一版不能发。')
        return
    raise SystemExit(msg)


def label_font(size):
    """联系表、QA 图上的标注字（时间码、镜头名、「高潮」）。找不到中文字体就用 Pillow 默认字体。"""
    from PIL import ImageFont
    for f in glob.glob('/usr/share/fonts/**/NotoSansCJK-Regular.ttc', recursive=True) + \
             ['/System/Library/Fonts/Hiragino Sans GB.ttc', '/System/Library/Fonts/STHeiti Medium.ttc', '/System/Library/Fonts/PingFang.ttc']:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()
