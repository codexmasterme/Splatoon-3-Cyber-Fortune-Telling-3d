# 赛博求签机 · Cyber Omikuji

以 **Splatoon 3** 大厅扭蛋机为灵感的每日运势求签 web app。投币抽签，得到当日总运势，以及**打工（鲑鱼跑）/ 真格 / X 赛**三大模式的分项运势、宜忌与幸运物。

界面走 Splatoon 的荧光撞色风格，背景是双色墨水铺满的对战场地风格图，每次抽签随机切换配色。

## 功能

- **扭蛋机抽签动画**：投币 → 转动 → 弹出签文卡
- **七档运势**：超激赞 / 激赞 / 还不错 / 小赢 / 勉强 / 翻车 / 深海（加权随机，好签与大凶都偏稀有）
- **三模式当日运势**：打工 / 真格 / X 赛，各自独立的顺 / 平 / 逆
- **签诗**：每档 20 首四句偈；**三模式签文**各档 20 条
- **宜忌 + 幸运武器 / 幸运色**：随机组合，几乎不重样
- **两种模式**：
  - 「每日一签」——用当天日期做随机种子，同一天抽到同一签
  - 「随缘连抽」——纯随机，想连抽就连抽
- **双色墨水背景**：像对战一样只用两种撞色，随配色自动切换
- 移动端适配，尊重 `prefers-reduced-motion`

## 本地运行

需要 Node.js 18+。

```bash
npm install
npm run dev
```

打开终端里显示的地址（默认 http://localhost:5173）。

## 打包构建

```bash
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览构建产物
```

## 部署到 GitHub Pages

1. 在 `vite.config.js` 里把 `base` 改成你的仓库名：

   ```js
   // 如果站点地址是 https://<用户名>.github.io/cyber-omikuji/
   base: "/cyber-omikuji/",
   ```

   如果用自定义域名或部署在根路径，保持 `base: "./"` 即可。

2. 构建并发布 `dist/`。最省事的方式是用附带的 GitHub Actions 工作流（见 `.github/workflows/deploy.yml`）：把代码推到 `main` 分支后，到仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions** 即可自动部署。

也可以部署到 **Vercel** 或 **Netlify**：直接导入仓库，框架选 Vite，构建命令 `npm run build`，输出目录 `dist`，无需额外配置。

## 项目结构

```
cyber-omikuji/
├─ index.html
├─ package.json
├─ vite.config.js
├─ .github/workflows/deploy.yml   # GitHub Pages 自动部署
└─ src/
   ├─ main.jsx                    # 入口
   ├─ index.css                   # 全局样式
   └─ SplatoonOmikuji.jsx         # 全部逻辑、内容与内嵌墨水背景素材
```

签文库、配色、墨水背景图（base64 内嵌）都在 `src/SplatoonOmikuji.jsx` 一个文件里，方便你直接改内容。

## 关于素材

墨水背景由项目作者自行生成的墨渍图片合成，不含任天堂或第三方版权美术资源。

## 免责声明

Splatoon / 斯普拉遁 / 喷射战士是任天堂（Nintendo）的商标。本项目为非商业性的粉丝同人作品，与任天堂无关联、未获其授权或背书。运势内容纯属娱乐。
