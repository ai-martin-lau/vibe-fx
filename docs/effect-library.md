# 动效库 Effect library

63个可复用动效，代码在 `engine/effects/fx.js`（自写；3D 部分用 three.js，MIT）。每个效果2.5秒样片，在目录片里带编号和中文名。

**用法**：每部片子从下表挑3–5个，把它们分配到这些节拍：钩子（前2秒）、揭示、数字时刻、结尾。至少要有一个 G 类（生图×代码），符合 playbook §3.6。

```html
<script src="../../engine/effects/fx.js"></script>
<script>
FXI('img/');                       // 预加载用到的生图（img/ 不进 git）
FXP.k_slam={s:'别存钱'};            // 改参数（见 params 列）
S.push({id:'hook',draw(t,lt){FXR.k_slam.draw(lt,2.5,t)}});
</script>
```

- 总览：目录片约142秒，用下面「整部目录片」的命令生成；每个效果的预览 GIF 在 `docs/previews/<id>.gif`。
- 单个效果一条命令出片：`examples/effect-library/one.sh <id>`，产物在 `examples/effect-library/out/test/test.mp4`。
- 整部目录片：`cd examples/effect-library && python3 gen.py && ../../engine/make.sh .`
- 成本：● 纯2D 便宜，●● 是3D 或要用生图。3D 效果每个会建一个 WebGL 上下文（懒加载），一部片里最多用6个左右。
- 参数：`FXP[id]` 里的键。没列参数的效果，直接复制函数改文案。

## 前2秒钩子最强的10个

| # | id | 为什么适合当钩子 |
|---|---|---|
| 1 | `k_slam` | 0.3秒砸下来，带白闪和震动，第一帧就有冲击 |
| 2 | `n_counter` | 数字往上狂涨，再弹一下，"数字型钩子"首选 |
| 3 | `c_orbit` | 3D 金币堆环绕，大场面开局 |
| 4 | `g_depthPlate` | 生图场景伪3D 推镜，一秒交代年代和人物环境 |
| 5 | `t_shatter` | "你以为" 碎掉，露出 "其实"，反常识开头 |
| 6 | `g_img2particles` | 实物炸成粒子，再聚成一个词，最有记忆点 |
| 7 | `k_scramble` | 乱码解出一句话，制造悬念 |
| 8 | `t_glitch` | 故障闪断，适合反转、打脸 |
| 9 | `c_dutch` | 坏消息配冲击侧滚 |
| 10 | `n_dots` | 100个点里只亮3个，比例一眼就懂 |

**结尾推荐**：`g_skybox`、`g_inkPaper`、`m_paperFold`、`k_stamp`。
**揭示推荐**：`t_iris`、`g_spotlight`、`g_eraMorph`、`k_splitFlap`。
**数字推荐**：`n_odometer`、`n_compound`、`n_pie`、`n_coinStack`。

## 新发明（别处少见）

- `g_img2particles`：用真实生图的像素当粒子，再聚成字。
- `t_coinWipe`：用物体形状做转场。
- `g_eraMorph`：同一构图的新旧两张生图，用扫描线切换。
- `g_lens`：放大镜看生图钞票上的小字。
- `g_puppet`：绿幕生图在浏览器里抠像后，做剪纸木偶跳着走。
- `g_tiles`：生图切块，飞进来拼成全貌。

## 树状节点（R 类）

结构参数统一写成 `FXP.<id>.tree = {l:'根',c:[{l:'子',c:[...]}]}`，标签可以用中文。示例：

```js
FXP.r_decision={tree:{l:'已经投了10万',c:[{l:'继续投',c:[{l:'越陷越深'},{l:'侥幸回本'}]},{l:'及时止损',c:[{l:'损失封顶'},{l:'重新出发'}]}]},pick:[1,1]};
```

- `pick` 指定高亮路径上每一层选第几个子节点。
- 节点弹入用弹簧缓动，标签0.15秒内出现，连线带发光。
- 预览：见 docs/previews 里的 r_* GIF。

## 索引

| # | id | name | category | best beat | cost | params | preview | render |
|---|---|---|---|---|---|---|---|---|
| 01 | `t_iris` | Iris reveal / 圆孔揭示 | 转场 Transition | 揭示答案 / reveal | ● | `a` `b` | [gif](previews/t_iris.gif) | `examples/effect-library/one.sh t_iris` |
| 02 | `t_coinWipe` | Object-shape wipe / 硬币擦除 | 转场 Transition | 钱相关话题切镜 | ● | — | [gif](previews/t_coinWipe.gif) | `examples/effect-library/one.sh t_coinWipe` |
| 03 | `t_zoomThrough` | Zoom through a letter / 穿字推进 | 转场 Transition | 从标题进正文 / hook→body | ● | — | [gif](previews/t_zoomThrough.gif) | `examples/effect-library/one.sh t_zoomThrough` |
| 04 | `t_whip` | Whip pan / 甩镜 | 转场 Transition | 对比 A/B、转折 | ● | — | [gif](previews/t_whip.gif) | `examples/effect-library/one.sh t_whip` |
| 05 | `t_pageTurn` | Page turn / 翻页 | 转场 Transition | 讲故事换年代 / chapter | ●● 🖼 paper.jpg | — | [gif](previews/t_pageTurn.gif) | `examples/effect-library/one.sh t_pageTurn` |
| 06 | `t_ink` | Ink bleed reveal / 墨迹晕开 | 转场 Transition | 情绪转折、开悟 | ●● 🖼 ink.jpg,paper.jpg | — | [gif](previews/t_ink.gif) | `examples/effect-library/one.sh t_ink` |
| 07 | `t_shatter` | Shatter cut / 玻璃碎裂 | 转场 Transition | 打破认知 / myth busted | ●● | — | [gif](previews/t_shatter.gif) | `examples/effect-library/one.sh t_shatter` |
| 08 | `t_blinds` | Venetian blinds / 百叶窗 | 转场 Transition | 列清单换项 | ● | — | [gif](previews/t_blinds.gif) | `examples/effect-library/one.sh t_blinds` |
| 09 | `t_carry` | Object-carried cut / 物体带走 | 转场 Transition | 镜头间连续感 | ● 🖼 watch.jpg | — | [gif](previews/t_carry.gif) | `examples/effect-library/one.sh t_carry` |
| 10 | `t_glitch` | Glitch cut / 故障切 | 转场 Transition | 反转、打脸 | ● | `s`, `s2` | [gif](previews/t_glitch.gif) | `examples/effect-library/one.sh t_glitch` |
| 11 | `k_slam` | Slam text / 砸字 | 动态字 Kinetic text | 第1秒钩子 / hook | ● | `s` | [gif](previews/k_slam.gif) | `examples/effect-library/one.sh k_slam` |
| 12 | `k_scramble` | Scramble decode / 乱码解码 | 动态字 Kinetic text | 揭示秘密 / reveal | ● | `s` | [gif](previews/k_scramble.gif) | `examples/effect-library/one.sh k_scramble` |
| 13 | `k_splitFlap` | Split-flap board / 机场翻牌 | 动态字 Kinetic text | 年份/地点/数字揭示 | ●● | `s` | [gif](previews/k_splitFlap.gif) | `examples/effect-library/one.sh k_splitFlap` |
| 14 | `k_stamp` | Rubber stamp / 盖章 | 动态字 Kinetic text | 下结论、定性 | ● 🖼 paper.jpg | `s` | [gif](previews/k_stamp.gif) | `examples/effect-library/one.sh k_stamp` |
| 15 | `k_highlight` | Highlighter sweep / 荧光笔划重点 | 动态字 Kinetic text | 金句关键词 | ● | — | [gif](previews/k_highlight.gif) | `examples/effect-library/one.sh k_highlight` |
| 16 | `k_textPath` | Text on a path / 文字绕圈 | 动态字 Kinetic text | 循环、周期话题 | ● | — | [gif](previews/k_textPath.gif) | `examples/effect-library/one.sh k_textPath` |
| 17 | `k_charDrop` | Physics letters / 字掉落弹跳 | 动态字 Kinetic text | 轻松吐槽 | ● | — | [gif](previews/k_charDrop.gif) | `examples/effect-library/one.sh k_charDrop` |
| 18 | `k_type` | Typewriter / 打字机 | 动态字 Kinetic text | 引用一句原话（有出处） | ● 🖼 paper.jpg | `s`, `size`, `w`, `y`, `src` | [gif](previews/k_type.gif) | `examples/effect-library/one.sh k_type` |
| 19 | `k_stretch` | Elastic stretch / 弹性拉伸字 | 动态字 Kinetic text | 强调"越来越" | ● | — | [gif](previews/k_stretch.gif) | `examples/effect-library/one.sh k_stretch` |
| 20 | `k_stack` | Word stack / 词语堆叠 | 动态字 Kinetic text | 列举三件事 | ● | — | [gif](previews/k_stack.gif) | `examples/effect-library/one.sh k_stack` |
| 21 | `k_counterWords` | Karaoke word light / 逐词点亮 | 动态字 Kinetic text | 朗读金句跟读 | ● | — | [gif](previews/k_counterWords.gif) | `examples/effect-library/one.sh k_counterWords` |
| 22 | `n_counter` | Counter roll-up / 数字飞涨 | 数字 Number | 数字钩子 / number hook | ● | `v`, `pre`, `suf`, `label`, `y`, `size` | [gif](previews/n_counter.gif) | `examples/effect-library/one.sh n_counter` |
| 23 | `n_odometer` | Odometer / 里程表滚轮 | 数字 Number | 年份/次数增长 | ●● | — | [gif](previews/n_odometer.gif) | `examples/effect-library/one.sh n_odometer` |
| 24 | `n_bars` | Bar grow / 柱子生长 | 数字 Number | 比较几组数据 | ● | — | [gif](previews/n_bars.gif) | `examples/effect-library/one.sh n_bars` |
| 25 | `n_coinStack` | Coin stack / 硬币越堆越高 | 数字 Number | 积累、复利 | ● | — | [gif](previews/n_coinStack.gif) | `examples/effect-library/one.sh n_coinStack` |
| 26 | `n_compound` | Compound curve ride / 复利曲线骑行 | 数字 Number | "后面越来越快" | ● | — | [gif](previews/n_compound.gif) | `examples/effect-library/one.sh n_compound` |
| 27 | `n_timeline` | Timeline scrub / 时间轴拖动 | 数字 Number | 人物生平节点 | ● | — | [gif](previews/n_timeline.gif) | `examples/effect-library/one.sh n_timeline` |
| 28 | `n_pie` | Pie eats / 扇形吃掉 | 数字 Number | 占比、被拿走多少 | ● | — | [gif](previews/n_pie.gif) | `examples/effect-library/one.sh n_pie` |
| 29 | `n_dots` | 100-dot grid / 百人点阵 | 数字 Number | "100个人里只有N个" | ● | — | [gif](previews/n_dots.gif) | `examples/effect-library/one.sh n_dots` |
| 30 | `n_scale` | Balance scale / 天平倾斜 | 数字 Number | 取舍、两边对比 | ● | — | [gif](previews/n_scale.gif) | `examples/effect-library/one.sh n_scale` |
| 31 | `c_orbit` | 3D orbit / 3D 环绕 | 镜头 Camera | 开场大场面 / hook | ●● | — | [gif](previews/c_orbit.gif) | `examples/effect-library/one.sh c_orbit` |
| 32 | `c_dollyZoom` | Dolly zoom / 推拉变焦（眩晕） | 镜头 Camera | "突然意识到"的瞬间 | ●● | — | [gif](previews/c_dollyZoom.gif) | `examples/effect-library/one.sh c_dollyZoom` |
| 33 | `c_rackFocus` | Rack focus / 焦点转移 | 镜头 Camera | 注意力从A转到B | ● 🖼 watch.jpg,town.jpg | — | [gif](previews/c_rackFocus.gif) | `examples/effect-library/one.sh c_rackFocus` |
| 34 | `c_spline` | Spline fly-through / 曲线穿越 | 镜头 Camera | 招牌镜头一镜到底 | ●● | — | [gif](previews/c_spline.gif) | `examples/effect-library/one.sh c_spline` |
| 35 | `c_dutch` | Impact roll / 冲击侧滚 | 镜头 Camera | 坏消息砸下来 | ● | — | [gif](previews/c_dutch.gif) | `examples/effect-library/one.sh c_dutch` |
| 36 | `c_parallax` | Multi-layer parallax / 多层视差 | 镜头 Camera | 交代环境 | ● | — | [gif](previews/c_parallax.gif) | `examples/effect-library/one.sh c_parallax` |
| 37 | `m_spring` | Spring pop / 弹簧弹入 | 变形/物理 Morph | 物件登场 | ● | — | [gif](previews/m_spring.gif) | `examples/effect-library/one.sh m_spring` |
| 38 | `m_paperFold` | Paper fold / 纸张折叠 | 变形/物理 Morph | 收起旧观念 / ending | ●● 🖼 paper.jpg | — | [gif](previews/m_paperFold.gif) | `examples/effect-library/one.sh m_paperFold` |
| 39 | `m_liquid` | Liquid fill / 液体注满 | 变形/物理 Morph | 进度/储蓄满了 | ● | — | [gif](previews/m_liquid.gif) | `examples/effect-library/one.sh m_liquid` |
| 40 | `m_particleText` | Particle form / 粒子聚字 | 变形/物理 Morph | 关键词出现 | ● | `s` | [gif](previews/m_particleText.gif) | `examples/effect-library/one.sh m_particleText` |
| 41 | `m_morph` | Shape morph / 形状变形 | 变形/物理 Morph | A 变成 B | ● | — | [gif](previews/m_morph.gif) | `examples/effect-library/one.sh m_morph` |
| 42 | `m_pendulum` | Newton cradle / 牛顿摆 | 变形/物理 Morph | 因果传递 | ● | — | [gif](previews/m_pendulum.gif) | `examples/effect-library/one.sh m_pendulum` |
| 43 | `m_domino` | Dominoes / 多米诺 | 变形/物理 Morph | 小习惯→大结果 | ● | — | [gif](previews/m_domino.gif) | `examples/effect-library/one.sh m_domino` |
| 44 | `m_explode` | Burst disperse / 爆裂散开 | 变形/物理 Morph | 泡沫破裂 | ● | `s`, `s2`, `col`, `at` | [gif](previews/m_explode.gif) | `examples/effect-library/one.sh m_explode` |
| 45 | `g_depthPlate` | Depth-plate dolly / 场景板伪深度推镜 | 生图×代码 Image-gen | 开场交代年代 / hook | ●● 🖼 town.jpg | — | [gif](previews/g_depthPlate.gif) | `examples/effect-library/one.sh g_depthPlate` |
| 46 | `g_tex3D` | Textured 3D prop / 生图纹理3D 道具 | 生图×代码 Image-gen | 钱/文件/证据特写 | ●● 🖼 bill.jpg | — | [gif](previews/g_tex3D.gif) | `examples/effect-library/one.sh g_tex3D` |
| 47 | `g_img2particles` | Image → particles → word / 图片碎成粒子聚字 | 生图×代码 Image-gen | 高潮：物变词 | ●● 🖼 watch.jpg | — | [gif](previews/g_img2particles.gif) | `examples/effect-library/one.sh g_img2particles` |
| 48 | `g_diorama` | Diorama + draw-on notes / 微缩模型+手绘批注 | 生图×代码 Image-gen | 日常现象指出问题 | ●● 🖼 diorama.jpg | — | [gif](previews/g_diorama.gif) | `examples/effect-library/one.sh g_diorama` |
| 49 | `g_eraMorph` | Era scan morph / 跨时代扫描变形 | 生图×代码 Image-gen | 技术/时代变迁 | ●● 🖼 phone-old.jpg,phone-new.jpg | — | [gif](previews/g_eraMorph.gif) | `examples/effect-library/one.sh g_eraMorph` |
| 50 | `g_puppet` | Cutout puppet / 剪纸木偶 | 生图×代码 Image-gen | 人物故事动作拍 | ●● 🖼 cutout.jpg,paper.jpg | — | [gif](previews/g_puppet.gif) | `examples/effect-library/one.sh g_puppet` |
| 51 | `g_skybox` | Generated skybox / 生图天空盒 | 生图×代码 Image-gen | 结尾升华 / ending | ●● 🖼 sky.jpg | — | [gif](previews/g_skybox.gif) | `examples/effect-library/one.sh g_skybox` |
| 52 | `g_inkPaper` | Ink on generated paper / 生图纸墨 | 生图×代码 Image-gen | 金句收尾 | ● 🖼 paper.jpg,ink.jpg | — | [gif](previews/g_inkPaper.gif) | `examples/effect-library/one.sh g_inkPaper` |
| 53 | `g_spotlight` | Spotlight search / 探照灯寻物 | 生图×代码 Image-gen | "答案藏在这里" | ● 🖼 town.jpg | — | [gif](previews/g_spotlight.gif) | `examples/effect-library/one.sh g_spotlight` |
| 54 | `g_tiles` | Tile assemble / 图块拼合 | 生图×代码 Image-gen | 拼出全貌 | ● 🖼 diorama.jpg | — | [gif](previews/g_tiles.gif) | `examples/effect-library/one.sh g_tiles` |
| 55 | `g_kenBurns` | Ken Burns plate / 生图推拉摇移 | 生图×代码 Image-gen | 铺垫背景 | ● 🖼 sky.jpg | — | [gif](previews/g_kenBurns.gif) | `examples/effect-library/one.sh g_kenBurns` |
| 56 | `g_lens` | Magnifier inspect / 放大镜细看 | 生图×代码 Image-gen | 看细节/小字 | ● 🖼 bill.jpg | — | [gif](previews/g_lens.gif) | `examples/effect-library/one.sh g_lens` |
| 57 | `g_polaroid` | Polaroid drop / 照片拍立得掉落 | 生图×代码 Image-gen | 回忆、证据 | ● 🖼 town.jpg,diorama.jpg,sky.jpg | — | [gif](previews/g_polaroid.gif) | `examples/effect-library/one.sh g_polaroid` |
| 58 | `r_treeGrow` | Knowledge tree grows / 知识树生长 | 树状节点 Tree | 拆解一个概念、讲结构 | ● | `tree` | [gif](previews/r_treeGrow.gif) | `examples/effect-library/one.sh r_treeGrow` |
| 59 | `r_forceGraph` | Force graph lights up / 关系网逐个点亮 | 树状节点 Tree | 人物关系、因果网 | ● | `labels` `edges` | [gif](previews/r_forceGraph.gif) | `examples/effect-library/one.sh r_forceGraph` |
| 60 | `r_constellation3D` | 3D node constellation fly-through / 3D 节点星座穿越 | 树状节点 Tree | 招牌镜头：顺一条线深挖 | ●● | `s` | [gif](previews/r_constellation3D.gif) | `examples/effect-library/one.sh r_constellation3D` |
| 61 | `r_decision` | Decision tree path / 决策树选一条路 | 树状节点 Tree | 揭示正确选择（沉没成本） | ● | `tree` `pick` | [gif](previews/r_decision.gif) | `examples/effect-library/one.sh r_decision` |
| 62 | `r_mindmap` | Radial mind map burst / 放射脑图炸开 | 树状节点 Tree | 列举可能性、开场铺开 | ● | `tree` | [gif](previews/r_mindmap.gif) | `examples/effect-library/one.sh r_mindmap` |
| 63 | `r_imageTree` | Tree with image leaves / 生图叶子树 | 树状节点 Tree | 人物一生章节、回顾结尾 | ●● 🖼 town,diorama,bill,sky,paper | `tree`（节点可带 `img`） | [gif](previews/r_imageTree.gif) | `examples/effect-library/one.sh r_imageTree` |

## 生图（不进 git，按提示词自己生成，放到 `examples/<film>/img/`）

| 文件 | 提示词 |
|---|---|
| town.jpg | 19th-century American river town at dusk, steamboat at the dock, warm gas lamps, painterly, cinematic, 9:16 |
| bill.jpg | fictional vintage banknote, engraved sailing ship vignette, ornate guilloche border, denomination 100, no real country, 16:9 |
| watch.jpg | brass pocket watch, open face, on pure black background, studio light, 1:1 |
| diorama.jpg | isometric miniature diorama of a small gym, tilt-shift, on solid navy #1b2546 background, 1:1 |
| paper.jpg | aged cream paper texture, subtle fibers and stains, flat, 9:16 |
| phone-old.jpg | 1920s black rotary telephone on pure black background, studio light, 1:1 |
| phone-new.jpg | modern smartphone, no logo, same angle, on pure black background, 1:1 |
| cutout.jpg | fictional paper-cutout style 1900s businessman in a bowler hat, full body, on pure #00ff00 green background, 3:4 |
| sky.jpg | golden-hour sky over a calm ocean, wide panorama, 16:9 |
| ink.jpg | black sumi ink splash on pure white, 1:1 |

人物只用虚构的外国形象，不画中国人。

## 版面检查（layoutcheck）

`python3 engine/layoutcheck.py FILM` 查字压字、线穿字（glowLine 画的线）、框碰框（logShape 登记的框）、字出安全框（40px）。qa.py 会自动跑，结果在 qa/layoutcheck.json。新效果里的连线用 glowLine()，带框的标签用 logShape('box',…) 登记，节点标签放在节点旁边并加 plate:true 底板，不要放在连线进来的方向上。图片、粒子挡字查不到，仍要人工看 watch-*.jpg。

对比度（CONTRAST）：每0.25s 取每段文字框内背景像素的中位亮度，算文字色对背景的对比度，低于3:1且持续 ≥0.3s 就提示（切镜后0.35s 不算）。暗色调色板的未选中文字用 THEME.dimText / boxOff / dimLine，不要写死灰色。

## 调色板（背景色变化，2026-10-31）

引擎 `engine/vibe.js` 里的 `PALETTES`，不用加 script。默认 `gold` 和以前逐像素一样，旧片不受影响。

| 名字 | 中文 | 底色（上→下） | 字 | 强调/发光 | 深浅 |
|---|---|---|---|---|---|
| gold | 暗金 | #07060a（+暖光晕） | #f3ece0 | #f2c46d / 255,200,90 | 深 |
| paper | 米纸 | #f3ead6 → #eadfc5 → #ddcda9 | #2a1f14 | #764610 / 122,74,20 | 浅 |
| sea | 深海蓝 | #03101c → #062038 → #0b2f4d | #eaf4ff | #7cc8ff / 120,200,255 | 深 |
| forest | 墨绿 | #04100b → #0a2219 → #123326 | #eef6ee | #a6dc84 / 150,220,120 | 深 |
| wine | 酒红 | #160407 → #2c0811 → #3f0d18 | #fbeeee | #f2b07e / 255,170,120 | 深 |
| mist | 雾白 | #f5f6f7 → #e9ecef → #d9dee4 | #1b222b | #2f5a86 / 45,77,112 | 浅 |
| sunset | 日落 | #160d2e → #3a1846 → #62203e → #742c26 | #fff6ea | #ffc27a / 255,170,100 | 深 |

字和金色渐变字（hi/mid/lo）对每个底色停靠点的对比度都 ≥ 4.5（最低：paper 的 hi 4.75，sea 的 lo 5.0）。

用法：
- 整片一个色：`VIBE_FILM({palette:'sea', ...})`。
- 按段换（推荐）：rhythm.json `"sections":[{"at":"shot:a","energy":2,"palette":"gold"},{"at":"shot:b","energy":3,"palette":"mist","tr":"iris","d":0.45}]`。`tr`：`fade` 交叉淡化（默认），`iris` 圆形扩开，`wipe` 从左擦过；`d` 是过渡秒数。也可以在 scene 里写 `VIBE_FILM({palettes:[{at:'shot:b',p:'mist',tr:'wipe'}]})`。
- 自定义：`palette:{...}` 传对象，字段同 `PAL_BASE`（bgStops、text、hi/mid/lo、glow、acc、line、line2、node2、plate、box/boxOn/boxStroke/boxOff、dim/dimText、flapBg/flapLine/flapText、label、ink、amb、vig、flash、shadow、pt、light）。
- 写新特效时颜色读 `THEME.x`，叠加模式写 `pBlend()`（深底 lighter，浅底 source-over），不要再写死 '#fff' / 'lighter'。

跟着调色板变的：背景（底色、光晕、光束、尘）、`post` 暗角和前景尘、ambientDust、高潮闪光（slam/snap/drop）、`txt` 默认字色和金色渐变字、`particleForm`（所以 m_particleText 和所有粒子聚字），以及 k_slam（闪白）、k_splitFlap（翻牌底/字）、n_counter、r_treeGrow、r_mindmap、r_decision、g_img2particles、`node()`、`glowLine()`（树/图的线）。
样片：`examples/palette-demo/`（7套色 × 砸字 + 树/脑图/决策树/粒子字，节拍上换底色）。

## 2026-11-01参数补全（成片要求：效果里不能有写死的占位字）

- `n_counter`：去掉了写死的占位小字「来自出处的数字」。新参数 `pre`/`suf`（前后缀，如 `£`、` 塞斯特斯`）、`label`（数字下面一行出处说明，不填就不画）、`y`、`size`。
- `m_explode`：`s`（爆前的字，默认 泡沫）、`s2`（爆后的字，默认 破了）、`col`（球的颜色 `'r,g,b'`）、`at`（第几秒爆）。
- `k_type`：自动换行（宽 `w` 默认840，从 x=120起，不再出安全区），`\n` 强制换行；`size`、`y`、`src`（打完后在下面淡入出处）。光标只在打字时闪。
- `t_glitch`：`s`（闪断前）、`s2`（闪断后，默认同 `s`）。
- `k_stamp`（11-01晚）：去掉写死的「合同条款……」。新参数 `sub`（章上方一行小字，不填就不画）、`bg`（false 时不铺纸，直接盖在当前画面上）、`y`（章的中心）、`at`（第几秒落章，默认0.6）。
- 读字检查登记（2026-11-02）：`charAssemble` 按整句登记一次（透明度取最后一个字），不再按单字登记；`k_type` 打字过程中不登记，打完才按整行登记。读字时间从「整句都看得清」算起。
