# 机制组件 + 镜头运动演示

`engine/mechanisms.js` 里的五个组件，各占一个镜头，约 30 秒。仓库里只放源文件，不放渲染产物。

```sh
engine/make.sh templates/mechanisms --test 30   # → out/test/test.mp4 + out/test/qa/
```

| 镜头 | 组件 | 用法 | 镜头运动 |
|---|---|---|---|
| compound | `MECH.compound(k,{rate,years})` | 指数曲线对比直线，返回尖端 `{x,y}` | `CAM.follow`：跟着尖端走，最后回到全景 |
| leverage | `MECH.leverage(k,{ratio,small,big})` | 跷跷板，k=1 时短臂上的大方块被抬起 | `CAM.zoomIn`：推近支点 |
| funnel | `MECH.funnel(k,{n,keep})` | n 个粒子落下，只有 keep 比例穿过，计数 | `CAM.pullBack`：从瓶颈拉远看全景 |
| depletion | `MECH.depletion(k,{drain,label})` | 容器被一点点抽空 | 不动 |
| loop | `MECH.loop(k,{nodes,laps,gain})` | 节点围成一圈，光点每圈 ×gain | 不动（drop 高潮落在切点） |

规则：
- 组件只吃 0→1 的进度 `k`，用 `ramp(lt, 开始, 结束)` 算。同一个 k 永远画同一帧，可以任意帧跳渲。
- 切点那一帧组件就要画出来（k 可以从负时间起算，见 compound 的 `tipK`），别让镜头从空画面开始。QA 会报「空画面」。
- 镜头运动写在 scene 的 `cam:(t,lt)=>…`，和转场（rhythm.json 的 `in`）互不干扰。
