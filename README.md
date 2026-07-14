# Weather Blog · 天气博客

纯 HTML、CSS 与 ES Modules 构建的动态天气博客：时间驱动天空，天气驱动粒子，并提供天空 / 雪山背景、Markdown 文章和环境彩蛋。

## 快速启动

需要 Node.js 18+ 与 Python 3。首次拉取项目后安装构建依赖并启动：

```bash
npm install
npm start
```

访问 `http://127.0.0.1:3456`，按 `Ctrl+C` 停止。端口被占用时启动器会显示占用 PID，也可改用：

```bash
PORT=8080 npm start
```

不要用 `file://` 打开 `index.html`，浏览器会限制 ES Modules。

## 功能与操作

- 24 小时天空、日月星空和实时 / 手动时间轮盘。
- 南京江宁实时天气；请求失败时使用本地预估。
- 天气徽章依次切换：晴、阴、小雨、中雨、大雨、雷电、小雪、中雪、大雪、大风。
- 右上角选择纯天空或动态雪山，选择保存在 `localStorage`。
- GFM Markdown 文章、Hash 路由、页面转场、卡片微交互和减少动态效果适配。
- 彩蛋触发、效果与调试方法见 `docs/EASTER_EGGS.md`。

## 写文章

文章放在 `posts/*.md`，图片放在 `img/`，模板为 `posts/_template.md`。

```bash
npm run new -- "文章标题"  # 新建文章
npm run build              # 生成文章数据
npm run watch              # 监听文章并自动构建
```

图片路径写为 `![说明](img/photo.jpg)`。`js/posts.data.js` 是构建产物，**不要手动修改**；`npm run watch` 只构建文章，不启动网页服务。

正文支持标题、粗体 / 斜体 / 删除线、链接、图片、引用、嵌套列表、任务列表、表格，以及反引号或波浪线代码围栏。原始 HTML 会按普通文本显示，避免文章内容执行脚本。

## 架构与数据流

```text
posts/*.md + img/*
  -> scripts/build-posts.mjs + marked
  -> js/posts.data.js
  -> js/posts.js
  -> js/router.js
```

| 位置 | 职责 |
|---|---|
| `index.html` | 页面骨架与背景图层 |
| `js/main.js` | 创建模块并暴露 `window.WeatherBlog` |
| `js/router.js` | 首页 / 文章 Hash 路由与渲染 |
| `js/time-sky.js`、`js/time-dial.js` | 24 小时天空和时间轮盘 |
| `js/weather.js` | 天气 API、类型映射、手动切换与粒子 |
| `js/background.js` | 天空 / 雪山选择及持久化 |
| `js/secrets.js` | 彩蛋触发、收集状态和自动环境场景 |
| `styles/main.css` | 页面、玻璃卡片、雪山与全局样式 |
| `styles/weather.css` | 天气粒子与天气状态 |
| `styles/transitions.css` | 路由、天气和背景转场 |
| `styles/secrets.css` | 彩蛋视觉效果 |
| `scripts/` | 文章构建、新建、监听和本地服务器 |

## 接手修改

- 改天空配色：`js/time-sky.js` 的 `SKY_STOPS`。
- 改天气地点：`js/weather.js` 的 `WEATHER_LOCATION`。
- 改雨雪密度：`js/weather.js` 的 `RAIN_PRESETS`、`SNOW_PRESETS`。
- 改页面或雪山：`styles/main.css`；改天气和转场时同步检查对应拆分样式。
- 改彩蛋：同时核对 `js/secrets.js`、`styles/secrets.css` 和 `docs/EASTER_EGGS.md`。
- 改文章解析：检查 `scripts/build-posts.mjs`、`js/posts.js` 和 `js/router.js` 的完整数据链。

## 验收

```bash
npm run build
node --check js/*.js
node --check scripts/*.mjs
git diff --check
npm start
```

浏览器至少检查：首页、文章页、天气循环、时间预览与恢复、两种背景、滚动条、移动端布局；启动验证后用 `Ctrl+C` 关闭服务。

## 维护规则

- `README.md` 只保留接手所需信息和精简更新摘要。
- `log.log` 记录每次更新的详细改动、原因、涉及文件和验证结果。
- `docs/EASTER_EGGS.md` 维护全部彩蛋条件、效果、奖励和调试方式。
- 新增功能时同步更新上述对应文档，不在 README 堆叠实现参数或逐轮过程。

## 最近更新

- 2026-07-14：改用标准 GFM Markdown 构建文章，修复波浪线代码块、嵌套列表和链接渲染，并补齐 Pages 依赖安装。
- 2026-07-10：美化全局滚动条；重构接手文档；补全彩蛋手册；将 `log.log` 统一为倒序 Markdown 更新记录。
