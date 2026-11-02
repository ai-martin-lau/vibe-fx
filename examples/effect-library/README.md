# effect-library — 动效目录片

- `python3 gen.py` 生成 rhythm.json，包含全部效果；`python3 gen.py k_slam` 只生成一个；`--part 1/2` 生成一半。
- `../../engine/make.sh .` 渲染整部目录片。`./one.sh <id>` 渲染单个效果的 2.5 秒样片。
- 需要 `img/` 里的生图（不进 git），文件名和提示词见 [docs/effect-library.md](../../docs/effect-library.md)。
