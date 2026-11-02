"""联系表（带安全区参考框）：python3 engine/sheet.py OUT.jpg COLS img1 img2 ...
红框 = 底部 20%（标题/文案遮挡区），蓝框 = 右侧按钮栏。文字要留在 x 120–920、y 180–1500 内。"""
import pathlib, sys
from PIL import Image, ImageDraw
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from vibe_env import label_font as font

out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
tw, th = 360, 640; rows = (len(files) + cols - 1) // cols
S = Image.new('RGB', (cols * tw + (cols + 1) * 12, rows * (th + 44) + 12), (20, 20, 20)); d = ImageDraw.Draw(S)
f = font(22)
for i, fn in enumerate(files):
    im = Image.open(fn).convert('RGB').resize((tw, th)); di = ImageDraw.Draw(im, 'RGBA')
    di.rectangle([0, int(th * .8), tw, th], fill=(255, 0, 0, 40))
    di.rectangle([int(tw * 0.885), int(th * .45), tw, int(th * .8)], fill=(0, 120, 255, 45))
    x = 12 + (i % cols) * (tw + 12); y = 12 + (i // cols) * (th + 44)
    S.paste(im, (x, y)); d.text((x, y + th + 6), fn.split('/')[-1], fill=(220, 220, 220), font=f)
S.save(out, quality=90)
print(out)
