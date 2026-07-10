# Weather Blog · 天气博客

- 每次更新要讲更新内容编辑到README.md中

## 更新记录

### 2026-07-10 · 本地启动与端口占用修复

1. **清理残留服务**：关闭开发验收时遗留的 Python 静态服务器，释放 `127.0.0.1:3456`。
2. **友好启动脚本**：`npm start` 改用 `scripts/start-server.mjs`，启动前主动检查端口；占用时显示 PID、关闭命令和切换端口示例，不再输出 Python traceback。
3. **替代端口**：可使用 `PORT=8080 npm start` 在其他端口运行；`Ctrl + C` 会同时关闭 Node 启动器和 Python 子服务。

### 2026-07-10 · 隐藏场景 / 环境彩蛋 / 微交互

1. **环境型彩蛋系统**：新增独立 `js/secrets.js` 与 `styles/secrets.css`，隐藏场景会回应昼夜、天气、背景选择和阅读进度，不使用打断阅读的弹窗。
2. **可发现的天空与山谷**：加入极光、流星、彩虹、星座、星鲸、萤火、远山灯火、日月光环、雪山访客、山谷回声和季节微景象；具体触发方式不在用户说明中剧透。
3. **发现记录与终极奖励**：浏览器本地保存彩蛋发现进度；全部发现后解锁可开关的低密度星尘模式。
4. **丝滑与性能**：重量级场景互斥，低性能设备自动减少临时粒子，页面切到后台会暂停装饰动画；文章卡片增加低幅度指针柔光与景深倾斜。

### 2026-07-10 · 天空 / 雪山双背景

1. **新增背景选择器**：右上角加入「背景」菜单，可在纯天空版与动态雪山版之间随时切换。
2. **保留两套体验**：天空模式隐藏雪山、飞鸟和山雾，恢复添加山景前的纯天空视觉；雪山模式保留当前山景及天气联动效果。
3. **自动记忆选择**：背景偏好保存到浏览器 `localStorage`，刷新或下次打开时自动恢复；天空模式下不会触发大风离山镜头动画。

### 2026-07-10 · 大风离山镜头转场

1. **天气预览顺序调整**：改为 `晴 → 阴 → 小雨 → 中雨 → 大雨 → 雷电 → 小雪 → 中雪 → 大雪 → 大风`。
2. **大雪转大风**：手动从大雪切到大风时，镜头顺风离开雪山，山景向左加速退出；大风期间只保留原有天空与风动画。
3. **大风回晴**：继续切回晴天时风立即停下，雪山从离开的方向平滑回到视野，并带轻微缓冲归位，正文与顶栏保持稳定。
4. **性能与残影修复**：取消整屏 SVG 的渐变遮罩和远距离移动，改为短距离偏移、快速淡出与独立风幕扫过；大风粒子错开 180ms 启动，减少切换首帧的渲染压力。

### 2026-07-10 · 动态雪山景观 / 清凉阴天

1. **原创雪山背景**：新增 SVG 主峰、副峰、自然雪线、柔和岩面、远近山脊与淡薄山腰雾；保持轮廓干净、层次清晰，不使用临时截图或第三方壁纸。
2. **动态景观联动**：三组错速飞鸟缓慢穿过天空，山体、积雪和远山色调随昼夜及雨雪天气变化；开启“减少动态效果”时自动隐藏飞鸟。
3. **舒适清凉阴天**：保持晴天效果不变；阴天完全隐藏太阳，使用明亮浅蓝灰高云和轻柔风线，视野依旧通透，呈现凉爽、适合散步的氛围。

### 2026-07-09 · 雪天分层 / 时间轮盘 / 首页文案

1. **雪天拆为小雪 / 中雪 / 大雪**（`snow-light` / `snow-medium` / `snow-heavy`）
   - 粒子形态：`dust` 远景柔点、`fluff` 不规则多瓣絮团、`near` 近处软边晶枝（非 clip-art 六角星）。
   - 尺寸幂分布（多数极小 fleck）、双正弦飘摆 + 共享阵风场；去掉硬圆盘与描边假雪花。
   - 氛围罩层与密度按强度拉开；WMO 降雪码映射到三档。
2. **时间轮盘**：右上角天气徽章**左侧**「时间」按钮；玻璃态 24h 轮盘，拖动指针 / 点「子夜·黎明·正午·黄昏」；「回到实时」恢复本地时钟。`js/time-dial.js` + `time-sky.js` hour override。
3. **首页副文案**改为诗意感受向（`js/router.js` 的 `hero-desc`），不再写操作说明。

---

带**天气粒子**、**24 小时天空**和**丝滑页面转场**的静态博客。  
技术栈：纯 HTML / CSS / ES Modules（构建脚本仅用 Node 内置模块，**无需 `npm install`**）。

## 本地启动

### 环境要求

- Node.js 18 或更高版本（用于生成文章数据）
- Python 3（用于启动本地静态服务器）
- 本项目没有第三方 npm 依赖，克隆后**无需运行 `npm install`**

### 启动步骤

进入项目目录并启动：

```bash
cd /home/loo/work/grok4.5
npm start
```

`npm start` 会依次执行：

1. 将 `posts/*.md` 构建为 `js/posts.data.js`
2. 在 `127.0.0.1:3456` 启动 Python 静态服务器

启动成功后，在浏览器访问：

```text
http://127.0.0.1:3456
```

停止服务器时，回到运行命令的终端并按 `Ctrl + C`。

### 开发与写作

修改 HTML、CSS 或 JavaScript 后，通常直接刷新浏览器即可看到效果。

修改 `posts/*.md` 后，可手动重新生成文章数据：

```bash
npm run build
```

写文章时也可以打开自动构建监听：

```bash
npm run watch
```

监听脚本只负责生成文章数据；预览页面时仍需在另一个终端运行 `npm start`。

如果 `3456` 端口已被占用，可以直接使用其他端口启动：

```bash
PORT=8080 npm start
```

启动脚本会在端口占用时显示占用进程 PID 和解决命令，不再输出冗长的 Python traceback。然后访问 `http://127.0.0.1:8080`。不要直接双击 `index.html` 或使用 `file://` 打开，因为浏览器会限制 ES Modules。

### 1. 丝滑转场（需求 1）

- 从**文章列表**点进文章、或从文章**返回列表**时，内容在**同一主区域**就地淡出再淡入。
- **没有**全屏遮罩、插层文案、转场粒子——不会像「又强制塞进了一页」。
- 顶栏、页脚、天空与天气粒子全程保留；只有 `#main` 里的内容在换。
- 系统若开启「减少动态效果」，会进一步缩短动画。

### 2. 天气动画（需求 2）

十种氛围，粒子密度与色调会明显拉开：

| 类型 | 图标 | 粒子 / 氛围 |
|------|------|-------------|
| 晴天 `sunny` | ☀️ | 漂浮金色光点 + 极淡神光 |
| 阴天 `cloudy` | ☁️ | 高空轻雾云（少、淡、靠上），几乎不压暗正文 |
| 小雨 `rain-light` | 🌦️ | 稀疏细丝，偏透、偏慢 |
| 中雨 `rain-medium` | 🌧️ | 中等密度雨幕 + 地面溅起 |
| 大雨 `rain-heavy` | 🌧️ | 高密度斜雨、深色罩层、底部雾气 |
| 小雪 `snow-light` | 🌨️ | 稀疏 dust 柔点 + 轻顶雾 |
| 中雪 `snow-medium` | ❄️ | 中等密度，fluff 絮团 + 少许 near 软晶 |
| 大雪 `snow-heavy` | ❄️ | 高密度、共享阵风、厚顶雾与地面积雪感 |
| 大风 `windy` | 💨 | 横向风丝 + 飞叶，内容轻微晃动 |
| 雷电 `thunder` | ⛈️ | 暴雨粒子 + 不定期闪电（双闪） |

**真实天气**：固定观测点为 **中国江苏南京江宁区**（约 `31.95°N, 118.84°E`），用 [Open-Meteo](https://open-meteo.com/)（免 API Key）拉 `weather_code` 与风速。**不使用**浏览器定位。  
坐标在 `js/weather.js` 的 `WEATHER_LOCATION`，换城市只改这一处。  
**失败时**（无网络）：按月份与小时做本地预估，徽章会标「江宁预估」。

**手动预览**：点右上角天气徽章，循环：`晴 → 阴 → 小雨 → 中雨 → 大雨 → 雷电 → 小雪 → 中雪 → 大雪 → 大风`。徽章文案会标「预览」。

### 3. 24 小时天空（需求 3）

- 背景三色渐变（顶 / 中 / 底）随本地时间插值变化。
- 太阳在约 5:30–19:30 沿抛物线移动；夜晚显示月亮与星点。
- 太阳与光晕刻意压低亮度（柔化圆盘、弱 box-shadow），避免刺眼抢戏。
- 阶段 class：`is-dawn` / `is-day` / `is-dusk` / `is-night`，CSS 会跟着调星星、日月透明度。
- 右上角时钟每分钟刷新；天空大约每秒重算一次位置（CSS transition 负责丝滑）。
- **时间轮盘**（天气徽章左侧）：拖动 24h 环预览任意时刻；预览时时钟高亮，可点「回到实时」。

也可用控制台：`WeatherBlog.timeSky.setHour(6.5)` / `clearOverride()`。

彩蛋开发预览：`WeatherBlog.secrets.list()` 查看可预览名称，`WeatherBlog.secrets.preview("aurora")` 触发指定场景，`WeatherBlog.secrets.tour()` 播放隐藏景色巡演，`WeatherBlog.secrets.resetDiscoveries()` 重置本地发现记录。

### 4. 第一篇博文 Hello World（需求 4）

- 源文件：`posts/hello-world.md`（由 `npm run build` 生成 `js/posts.data.js`）。
- 路由：`#/post/hello-world`。
- 内容说明了天气、昼夜、转场该怎么体验，本身就是验收清单。

## 项目结构

```
/home/loo/work/grok5.4/
├── posts/                  # ★ 文章源文件（Markdown，在此写作）
│   ├── hello-world.md
│   └── _template.md        # 模板（文件名以 _ 开头，不参与构建）
├── img/                    # ★ 文章图片（md 里写 img/xxx.jpg）
├── scripts/
│   ├── build-posts.mjs     # 把 posts/*.md → js/posts.data.js
│   ├── new-post.mjs        # 脚手架：npm run new -- "标题"
│   └── watch-posts.mjs     # 监听 posts/ 自动 build
├── .githooks/pre-commit    # 提交 posts 时自动 build（npm run hooks 启用）
├── .github/workflows/
│   └── pages.yml           # git push 后自动构建并部署 GitHub Pages
├── index.html
├── package.json            # build / start / new / watch / hooks
├── styles/ …
└── js/
    ├── posts.js            # 对外 API（getPostBySlug 等）
    ├── posts.data.js       # ★ 自动生成，勿手改
    ├── main.js / router.js / weather.js / …
```

写作管线：

```
posts/*.md + img/*
        │
        ├── 本地: npm start / npm run watch / pre-commit
        └── CI:   git push → Actions 跑 npm run build
                │
                ▼
        js/posts.data.js  →  浏览器列表与文章页
```

### 图片

```text
img/
  photo.jpg
  diagram.png
```

在 md 中任选一种写法（都会归一成站点根路径）：

```md
![说明](img/photo.jpg)
![说明](../img/photo.jpg)
```

公开站上图片 URL 即 `https://你的域名/img/photo.jpg`。

## 关键实现说明

### 天空颜色

`js/time-sky.js` 里 `SKY_STOPS` 是按小时排列的关键帧。  
改某个时段的氛围：改对应 `top / mid / bot / glow / phase` 即可。

### 天气判定与地点


- `WEATHER_LOCATION`：固定经纬度（默认南京江宁），**不用** `navigator.geolocation`。
- `codeToWeather`：WMO `weather_code` + 风速 → 十种类型。  
  雨量：毛毛雨/轻雨 → `rain-light`，中雨 → `rain-medium`，暴雨 → `rain-heavy`；  
  降雪：轻雪/雪粒 → `snow-light`，中雪 → `snow-medium`，大雪/强阵雪 → `snow-heavy`；  
  雷暴 → `thunder`；强风可升为 `windy`。

### 转场时长

`js/transitions.js` 的 `run()`：内容先 `view-exit`（~280ms）→ 换 HTML → `view-enter`（~420ms）。  
**不再使用**全屏 veil / 底部文案 / 转场粒子（`#transitionOverlay` 已禁用显示），避免「强制中间页」感。

### 粒子数量

`RAIN_PRESETS` / `SNOW_PRESETS` 与 `spawnAll`：`rain-light≈70` / `rain-medium≈220` / `rain-heavy≈480` / `thunder≈400` / `snow-light≈100` / `snow-medium≈230` / `snow-heavy≈420` / `windy≈90+叶`。  
机器卡的话优先把 `rain-heavy` / `snow-heavy` 降到 280 左右。

### 设计取舍

- **Markdown 源 + 轻量构建**：文章写在 `posts/*.md`，`npm run build`（或 CI / pre-commit）生成 `js/posts.data.js`；浏览器仍是纯静态，无框架。
- **hash 路由**：静态托管零配置，GitHub Pages 一类也能直接用。
- **天气与时间拆开**：天气管粒子与徽章，时间管天空色与日月；互不阻塞，失败也能好看。
- **跳转只动内容**：顶栏与天空不动，避免像整页刷新或额外 loading 页。


## 常见问题

**白屏 / 模块报错**  
确认是用 `http://127.0.0.1:端口` 打开的，不是 `file://`。

**天气一直是「江宁预估」**  
网络不通 Open-Meteo，或请求失败。不影响动画，可点徽章手动预览。换观测城市：改 `js/weather.js` 里 `WEATHER_LOCATION`。

**天空不随系统时间变**  
若用过时间轮盘或 `setHour` / `setDebugHour`，会进入预览覆盖模式。点轮盘「回到实时」，或 `WeatherBlog.timeSky.clearOverride()`，或刷新页面。

**动画卡顿**  
- 系统设置里开「减少动态效果」  
- 或降低 `weather.js` 里雨/雪粒子数  
- 或临时 `WeatherBlog.weather.engine.stop()` 关掉粒子 canvas

## 验收清单

- [x] 跳转就地柔化（无全屏遮罩 / 无强制中间页）
- [x] 动画与南京江宁天气相关（固定坐标，不用浏览器定位；可手动十种天气）
- [x] 小雨 / 中雨 / 大雨分层；小雪 / 中雪 / 大雪分层；大风 + 雷电
- [x] 阴天轻盈、不压暗正文
- [x] 太阳柔和、不刺眼
- [x] 背景随 24 小时变化；时间轮盘可预览
- [x] 第一篇 `Hello World` 可测全流程
- [x] 无需自备服务器即可公开（见第九节：GitHub Pages / Cloudflare / Netlify / Vercel）

## 总结

这不是「文章外面包一层装饰」，而是：**时间决定天空，天气决定粒子，跳转只换内容**——三者共用同一套氛围语言。  
打开 http://127.0.0.1:3456 ，点进 Hello World，再戳右上角天气徽章与时间轮盘，把十种天气（尤其小/中/大雪与小/中/大雨）和昼夜都看一遍，就够验收了。  

有想改的：文章只动 `posts/*.md` 与 `img/`，然后 `git push`（或本地 `npm start` / `npm run watch`）；观测城市 / 天空配色改 `js/weather.js`、`js/time-sky.js` 和 `styles/*`。一般不用装 npm 依赖（构建脚本是纯 Node 内置模块）。
