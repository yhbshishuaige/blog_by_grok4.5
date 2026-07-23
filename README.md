# Weather Blog · 天气博客

纯 HTML、CSS 与 ES Modules 构建的动态天气博客：时间驱动天空，天气驱动粒子，并提供天空 / 雪山背景、Markdown 文章和环境彩蛋。

## 快速启动

需要 Node.js 20+ 与 Python 3。首次拉取项目后安装构建依赖并启动：

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
- 南京江宁天气（Open-Meteo 当前值 + 当前小时降水校正，每 10 分钟刷新）；请求失败时使用本地预估。数据是网格化预报，局地暴雨仍可能与雨量站 / 雷达有差异。
- 天气徽章依次切换：晴、阴、小雨、中雨、大雨、雷电、小雪、中雪、大雪、大风。
- 首页文章按发布日期由旧到新排列，先看到最早发布的内容。
- 首页可在右上角切换一屏式 3D 翻卡与经典纵向列表；选择会自动记忆。
- 鼠标滚轮会唤起随方向、速度和天气变化的环境风迹，文章章节进入阅读区时同步回应。
- 右上角选择纯天空或动态雪山，选择保存在 `localStorage`。
- GFM Markdown 文章、代码高亮 / 折叠 / 复制、浮动目录、字数统计、友链、Hash 路由和页面转场。
- 彩蛋触发、效果与调试方法见 `docs/EASTER_EGGS.md`。

## 写文章

文章放在 `posts/*.md`，模板为 `posts/_template.md`。文章图片推荐直接上传到 Cloudflare R2：

```bash
npm run new -- "文章标题"  # 新建文章
npm run images -- ~/Pictures/photo.jpg # 上传 R2，生成并复制 Markdown
npm run build              # 生成文章数据
npm run watch              # 监听文章并自动构建
```

首次上传前复制 `.env.r2.example` 为 `.env.r2`，填入 R2 的 API 凭据、bucket 和公开域名；该文件已被 Git 忽略。上传命令支持单张、多张或一个目录，图片会按内容哈希命名并获得长缓存地址，成功后同时输出图片直链与 `![说明](https://...)`，并尽量把 Markdown 复制到系统剪贴板。`images` 后用于分隔 npm 参数的 `--` 不能省略，相对图片路径按执行命令时所在目录解析。可先执行 `npm run images -- --dry-run img/a.jpg` 预览；本地 `img/` 路径仍兼容。单数命令 `npm run image` 保留为兼容别名。

`js/posts.data.js` 是构建产物，**不要手动修改**；`npm run watch` 只构建文章，不启动网页服务。

多个标签写在 frontmatter 的同一行，用英文逗号或中文逗号分隔，例如 `tag: coc, 狗球, 十六本`；构建后会显示为三个独立标签。

正文支持标题、粗体 / 斜体 / 删除线、链接、图片、引用、嵌套列表、任务列表、表格，以及反引号或波浪线代码围栏。原始 HTML 会按普通文本显示，避免文章内容执行脚本。

代码围栏标注 `c`、`python` / `py`、`shell` / `bash` / `sh`、`json` 或 `javascript` / `js` 会自动高亮。二、三级标题自动进入文章目录；字数、阅读时间与代码块数量会在构建时计算。

友链配置位于 `js/friends.js`，按现有对象格式增加名称、地址、说明和缩写即可。

## 架构与数据流

```text
posts/*.md + R2 图片（或 img/*）
  -> scripts/build-posts.mjs + marked + highlight.js
  -> js/posts.data.js
  -> js/posts.js
  -> js/router.js
```

| 位置 | 职责 |
|---|---|
| `index.html` | 页面骨架与背景图层 |
| `js/main.js` | 创建模块并暴露 `window.WeatherBlog` |
| `js/router.js` | 首页 / 文章 / 友链 Hash 路由与渲染 |
| `js/article-tools.js` | 文章目录、代码折叠与复制交互 |
| `js/home-deck.js` | 首页文章卡片的滚轮、键盘、按钮与触屏切换 |
| `js/home-layout.js` | 首页翻卡 / 经典布局切换与本地记忆 |
| `js/scroll-atmosphere.js` | 滚轮风感、天气反馈与章节进入效果 |
| `js/friends.js` | 友链数据配置 |
| `js/time-sky.js`、`js/time-dial.js` | 24 小时天空和时间轮盘 |
| `js/weather.js` | 天气 API、类型映射、手动切换与粒子 |
| `js/background.js` | 天空 / 雪山选择及持久化 |
| `js/secrets.js` | 彩蛋触发、收集状态和自动环境场景 |
| `styles/main.css` | 页面、玻璃卡片、雪山与全局样式 |
| `styles/home-deck.css` | 首页全视口卡片舞台、景深与响应式布局 |
| `styles/weather.css` | 天气粒子与天气状态 |
| `styles/transitions.css` | 路由、天气和背景转场 |
| `styles/scroll-atmosphere.css` | 滚轮环境反馈与章节光迹 |
| `styles/secrets.css` | 彩蛋视觉效果 |
| `scripts/` | 文章构建、新建、R2 图片上传、监听和本地服务器 |

## 接手修改

- 改天空配色：`js/time-sky.js` 的 `SKY_STOPS`。
- 改天气地点：`js/weather.js` 的 `WEATHER_LOCATION`。
- 改雨雪密度：`js/weather.js` 的 `RAIN_PRESETS`、`SNOW_PRESETS`。
- 改页面或雪山：`styles/main.css`；改天气和转场时同步检查对应拆分样式。
- 改首页翻卡：同步检查 `js/router.js`、`js/home-deck.js` 和 `styles/home-deck.css`。
- 改彩蛋：同时核对 `js/secrets.js`、`styles/secrets.css` 和 `docs/EASTER_EGGS.md`。
- 改文章解析：检查 `scripts/build-posts.mjs`、`js/posts.js`、`js/article-tools.js` 和 `js/router.js` 的完整数据链。
- 改友链：编辑 `js/friends.js`，无需修改路由模板。

## 验收

```bash
npm run build
node --check js/*.js
node --check scripts/*.mjs
git diff --check
npm start
```

浏览器至少检查：首页滚轮 / 键盘 / 触屏翻卡、文章目录、代码高亮 / 折叠 / 复制、友链页、天气循环、时间预览与恢复、两种背景、滚动条、移动端布局；启动验证后用 `Ctrl+C` 关闭服务。

## 维护规则

- `README.md` 只保留接手所需信息和精简更新摘要。
- `log.log` 记录每次更新的详细改动、原因、涉及文件和验证结果。
- `docs/EASTER_EGGS.md` 维护全部彩蛋条件、效果、奖励和调试方式。
- 新增功能时同步更新上述对应文档，不在 README 堆叠实现参数或逐轮过程。

## 最近更新

- 2026-07-23：天气读取当前降水与当前小时天气码，避免 Open-Meteo 的阴天码覆盖正在发生的降雨；天气页签每 10 分钟自动刷新，回到前台时立即更新。
- 2026-07-17：新增 Cloudflare R2 图片上传命令，自动哈希命名、输出 Markdown 并复制到剪贴板；本地密钥不会进入 Git。
- 2026-07-17：首页改为旧文章优先；文章标签支持中英文逗号分隔并独立显示；顶栏换用 256×256 矢量 Logo；翻卡滚轮支持单次连续翻阅多张卡片。
- 2026-07-15：保留经典纵向文章列表，在首页右上角新增“经典 / 翻卡”即时切换并记忆选择。
- 2026-07-15：首页改为固定一屏的 3D 文章卡片舞台，以滚轮、键盘、按钮或触屏滑动逐篇翻阅，并在返回首页时保留当前位置。
- 2026-07-15：新增不接管原生滚动的滚轮环境反馈，按天气呈现光尘、雨丝、雪粒或风纹，并为章节进入阅读区增加轻量光迹。
- 2026-07-15：文章正文改为固定在页面中心轴，目录独立右移并换成透明灰色磨砂效果；代码段新增行号。
- 2026-07-14：新增天气、昼夜与雪山主题的 SVG 站点标志，同时用于浏览器标签页和顶栏品牌图标。
- 2026-07-14：文章增强：17px 字体、常用语言代码高亮、折叠 / 复制、浮动目录、字数与代码块统计，并新增友链页面。
- 2026-07-14：全站字体对齐终端 Vim，改用 Cascadia Code、15px 基础字号和半粗字重，并移除远程 Google Fonts。
- 2026-07-14：改用标准 GFM Markdown 构建文章，修复波浪线代码块、嵌套列表和链接渲染，并补齐 Pages 依赖安装。
- 2026-07-10：美化全局滚动条；重构接手文档；补全彩蛋手册；将 `log.log` 统一为倒序 Markdown 更新记录。
