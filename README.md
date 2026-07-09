# Weather Blog · 天气博客

- 每次更新要讲更新内容编辑到README.md中


带**天气粒子**、**24 小时天空**和**丝滑页面转场**的静态博客。  
技术栈：纯 HTML / CSS / ES Modules（构建脚本仅用 Node 内置模块，**无需 `npm install`**）。

### 1. 丝滑转场（需求 1）

- 从**文章列表**点进文章、或从文章**返回列表**时，内容在**同一主区域**就地淡出再淡入。
- **没有**全屏遮罩、插层文案、转场粒子——不会像「又强制塞进了一页」。
- 顶栏、页脚、天空与天气粒子全程保留；只有 `#main` 里的内容在换。
- 系统若开启「减少动态效果」，会进一步缩短动画。

### 2. 天气动画（需求 2）

八种氛围，粒子密度与色调会明显拉开：

| 类型 | 图标 | 粒子 / 氛围 |
|------|------|-------------|
| 晴天 `sunny` | ☀️ | 漂浮金色光点 + 极淡神光 |
| 阴天 `cloudy` | ☁️ | 高空轻雾云（少、淡、靠上），几乎不压暗正文 |
| 小雨 `rain-light` | 🌦️ | 稀疏细丝，偏透、偏慢 |
| 中雨 `rain-medium` | 🌧️ | 中等密度雨幕 + 地面溅起 |
| 大雨 `rain-heavy` | 🌧️ | 高密度斜雨、深色罩层、底部雾气 |
| 雪天 `snowy` | ❄️ | 大片雪花轻晃下落 + 顶雾 |
| 大风 `windy` | 💨 | 横向风丝 + 飞叶，内容轻微晃动 |
| 雷电 `thunder` | ⛈️ | 暴雨粒子 + 不定期闪电（双闪） |

**真实天气**：固定观测点为 **中国江苏南京江宁区**（约 `31.95°N, 118.84°E`），用 [Open-Meteo](https://open-meteo.com/)（免 API Key）拉 `weather_code` 与风速。**不使用**浏览器定位。  
坐标在 `js/weather.js` 的 `WEATHER_LOCATION`，换城市只改这一处。  
**失败时**（无网络）：按月份与小时做本地预估，徽章会标「江宁预估」。

**手动预览**：点右上角天气徽章，循环：`晴 → 阴 → 小雨 → 中雨 → 大雨 → 雪 → 大风 → 雷电`。徽章文案会标「预览」。

### 3. 24 小时天空（需求 3）

- 背景三色渐变（顶 / 中 / 底）随本地时间插值变化。
- 太阳在约 5:30–19:30 沿抛物线移动；夜晚显示月亮与星点。
- 太阳与光晕刻意压低亮度（柔化圆盘、弱 box-shadow），避免刺眼抢戏。
- 阶段 class：`is-dawn` / `is-day` / `is-dusk` / `is-night`，CSS 会跟着调星星、日月透明度。
- 右上角时钟每分钟刷新；天空大约每秒重算一次位置（CSS transition 负责丝滑）。

想立刻看不同时段，不必改系统时间，用控制台即可（见下文「调试」）。

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
- `codeToWeather`：WMO `weather_code` + 风速 → 八种类型。  
  雨量：毛毛雨/轻雨 → `rain-light`，中雨 → `rain-medium`，暴雨 → `rain-heavy`；雷暴 → `thunder`；强风可升为 `windy`。

### 转场时长

`js/transitions.js` 的 `run()`：内容先 `view-exit`（~280ms）→ 换 HTML → `view-enter`（~420ms）。  
**不再使用**全屏 veil / 底部文案 / 转场粒子（`#transitionOverlay` 已禁用显示），避免「强制中间页」感。

### 粒子数量

`RAIN_PRESETS` 与 `spawnAll`：`rain-light≈70` / `rain-medium≈220` / `rain-heavy≈480` / `thunder≈400` / `snowy≈220` / `windy≈90+叶`。  
机器卡的话优先把 `rain-heavy` 降到 280 左右。

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
若之前调用过 `setDebugHour`，那只影响那一次 `apply`；要回到实时，刷新页面，或周期性调用 `WeatherBlog.timeSky.apply()`（`start()` 里已有每秒 tick）。

**动画卡顿**  
- 系统设置里开「减少动态效果」  
- 或降低 `weather.js` 里雨/雪粒子数  
- 或临时 `WeatherBlog.weather.engine.stop()` 关掉粒子 canvas

## 验收清单

- [x] 跳转就地柔化（无全屏遮罩 / 无强制中间页）
- [x] 动画与南京江宁天气相关（固定坐标，不用浏览器定位；可手动八种天气）
- [x] 小雨 / 中雨 / 大雨分层；大风 + 雷电
- [x] 阴天轻盈、不压暗正文
- [x] 太阳柔和、不刺眼
- [x] 背景随 24 小时变化
- [x] 第一篇 `Hello World` 可测全流程
- [x] 无需自备服务器即可公开（见第九节：GitHub Pages / Cloudflare / Netlify / Vercel）

## 总结

这不是「文章外面包一层装饰」，而是：**时间决定天空，天气决定粒子，跳转只换内容**——三者共用同一套氛围语言。  
打开 http://127.0.0.1:3456 ，点进 Hello World，再戳右上角天气徽章，把八种天气（尤其阴天是否够轻、小/中/大雨与雷电）和昼夜都看一遍，就够验收了。  

有想改的：文章只动 `posts/*.md` 与 `img/`，然后 `git push`（或本地 `npm start` / `npm run watch`）；观测城市 / 天空配色改 `js/weather.js`、`js/time-sky.js` 和 `styles/*`。一般不用装 npm 依赖（构建脚本是纯 Node 内置模块）。
