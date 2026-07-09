# Weather Blog · 天气博客

带**天气粒子**、**24 小时天空**和**丝滑页面转场**的静态博客。  
项目路径：`/home/loo/work/grok5.4`  
技术栈：纯 HTML / CSS / ES Modules，无构建步骤，打开即用。

---

## 一、怎么跑起来

ES Modules 必须通过 HTTP 访问，**不能**直接用浏览器打开 `file://`。

```bash
cd /home/loo/work/grok5.4
python3 -m http.server 3456 --bind 127.0.0.1
```

然后浏览器打开：

- 首页：http://127.0.0.1:3456/
- 第一篇博文：http://127.0.0.1:3456/#/post/hello-world

等价命令：

```bash
npm start   # 内部同样是 python3 -m http.server 3456
```

换端口示例：

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

停服务：在跑服务器的终端里按 `Ctrl+C`。

### 端口被占用（`Address already in use`）

说明 **3456 上已经有进程在听**（常见于上次没关干净的 `http.server`）。两种做法：

**A. 直接用现成的服务（最快）**

浏览器打开 http://127.0.0.1:3456/ 即可，不必再启一次。

**B. 关掉旧进程再启动**

```bash
# 看谁占用了 3456
ss -tlnp | grep 3456
# 或
lsof -i :3456

# 结束该进程（把 PID 换成你看到的数字）
kill <PID>

# 再启动
python3 -m http.server 3456 --bind 127.0.0.1
```

**C. 换一个端口**

```bash
python3 -m http.server 3457 --bind 127.0.0.1
# 打开 http://127.0.0.1:3457/
```

---

## 二、你在页面上会看到什么

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

- 数据在 `js/posts.js`。
- 路由：`#/post/hello-world`。
- 内容说明了天气、昼夜、转场该怎么体验，本身就是验收清单。

---

## 三、交互速查

| 操作 | 效果 |
|------|------|
| 点首页文章卡片 | 内容就地淡出淡入 → 进入文章 |
| 点「← 返回列表」 | 同样就地切换回首页 |
| 点 Logo「Weather Blog」 | 回首页 |
| 点右上角天气徽章 | 手动循环八种天气（含小/中/大雨、大风、雷电） |
| 联网 | 徽章显示南京江宁实况（可能带温度） |
| 系统「减少动态效果」 | 关闭重动画，转场降级 |

路由是 **hash 路由**，刷新不会丢当前文章页。

---

## 四、浏览器控制台调试

页面加载成功后，全局有：

```js
window.WeatherBlog
```

常用：

```js
// 循环切换天气预览
WeatherBlog.weather.cyclePreview()

// 指定天气
WeatherBlog.weather.applyWeather("rain-medium")
// sunny | cloudy | rain-light | rain-medium | rain-heavy | snowy | windy | thunder

// 看当前天气
WeatherBlog.weather.getType()

// 模拟不同钟点（0–24，可小数）
WeatherBlog.timeSky.setDebugHour(6.5)   // 黎明
WeatherBlog.timeSky.setDebugHour(12)    // 正午
WeatherBlog.timeSky.setDebugHour(19)    // 黄昏
WeatherBlog.timeSky.setDebugHour(23)    // 深夜

// 强制重新走一遍路由渲染（含转场，非首次）
WeatherBlog.router.navigate()
```

控制台启动成功时会打印一行提示。

---

## 五、项目结构

```
/home/loo/work/grok5.4/
├── index.html              # 壳：天空层、粒子 canvas、转场层、页眉
├── package.json            # type:module；npm start 起静态服
├── README.md               # 本说明
├── styles/
│   ├── main.css            # 布局、玻璃卡片、文章排版、昼夜 token
│   ├── weather.css         # 天气相关氛围（雨感、雪雾等）
│   └── transitions.css     # 路由 veil / 粒子 / 进场出场
└── js/
    ├── main.js             # 启动：天空 + 天气 + 转场 + 路由
    ├── time-sky.js         # 24h 天空采样与日月位置
    ├── weather.js          # 天气 API、徽章、canvas 粒子引擎
    ├── transitions.js      # 页面切换动画编排
    ├── router.js           # hash 路由与页面 HTML 渲染
    └── posts.js            # 博文数据（在此加文章）
```

依赖关系（概念上）：

```
main.js
  ├── time-sky.js      → 改 CSS 变量与 body 阶段 class
  ├── weather.js       → body.weather-* + canvas 粒子
  ├── transitions.js   → 读当前天气，播 veil
  └── router.js        → 读 posts，调 transitions，写 #main
```

---

## 六、怎么加第二篇文章

编辑 `js/posts.js`，在 `posts` 数组里追加一项，例如：

```js
{
  slug: "second-post",
  title: "第二篇标题",
  date: "2026-07-10",
  tag: "随笔",
  readingMinutes: 5,
  excerpt: "列表卡片上显示的摘要……",
  lead: "文章页标题下的导语……",
  content: `
    <p>正文支持 HTML。</p>
    <h2>小标题</h2>
    <pre><code>console.log("ok");</code></pre>
  `,
}
```

访问：`http://127.0.0.1:3456/#/post/second-post`  
首页列表会自动出现新卡片（数组顺序即列表顺序）。

正文是 HTML 字符串，样式类名已在 `main.css` 的 `.article-body` 里覆盖 `p / h2 / h3 / pre / blockquote / code / a / ul`。

---

## 七、关键实现说明（方便以后改）

### 天空颜色

`js/time-sky.js` 里 `SKY_STOPS` 是按小时排列的关键帧。  
改某个时段的氛围：改对应 `top / mid / bot / glow / phase` 即可。

### 天气判定与地点

`js/weather.js`：

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

- **不做构建**：方便本地双击目录 + 静态服即预览，改完刷新即可。
- **hash 路由**：静态托管零配置，GitHub Pages 一类也能直接用。
- **天气与时间拆开**：天气管粒子与徽章，时间管天空色与日月；互不阻塞，失败也能好看。
- **跳转只动内容**：顶栏与天空不动，避免像整页刷新或额外 loading 页。

---

## 八、常见问题

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

**想完全离线**  
静态资源已全部本地（字体走 Google Fonts，断网时回退系统字体）。天气 API 失败会自动 fallback。

---

## 九、怎么公开这个博客（不需要自己买服务器）

### 先说结论

| 问题 | 答案 |
|------|------|
| 要不要自己买 / 租一台服务器？ | **不需要** |
| 为什么？ | 本站是**纯静态**（HTML + CSS + JS），没有后端、没有数据库、没有登录 |
| 那访客怎么访问？ | 把文件交给**免费静态托管**，它们替你提供 HTTPS 与全球 CDN |
| 天气 API 谁付钱？ | [Open-Meteo](https://open-meteo.com/) 免费、免 Key；由访客浏览器直接请求 |

下面按「上手速度 / 稳定性」给出四种免费方案。推荐顺序：

**① GitHub Pages（长期维护首选）→ ② Cloudflare Pages → ③ Netlify Drop（最快试水）→ ④ Vercel**

---

### 方案 A · GitHub Pages（最常用，推荐）

适合：已有或愿意注册 [GitHub](https://github.com/) 账号；以后改文章只 `git push` 即可。

**步骤：**

1. 在 GitHub 新建一个 **Public** 仓库，例如 `weather-blog`。
2. 在本机把项目推上去：

```bash
cd /home/loo/work/grok5.4
git init                    # 若还不是 git 仓库
git add .
git commit -m "Publish weather blog"
git branch -M main
git remote add origin https://github.com/<你的用户名>/weather-blog.git
git push -u origin main
```

3. 打开仓库 → **Settings → Pages**：
   - **Source**：Deploy from a branch
   - **Branch**：`main`，目录选 `/`（根目录）
   - 点 Save
4. 等 1～2 分钟，访问：

```text
https://<你的用户名>.github.io/weather-blog/
```

**子路径说明**：若仓库名不是 `username.github.io`，站点会落在 `/weather-blog/` 这类子路径下。  
本项目资源已是相对路径（`styles/...`、`js/...`），hash 路由 `#/post/...` 也不需要服务器端 404 回退，一般**开箱即用**。

**可选自定义域名**：Pages 设置里填 Custom domain，并按提示在域名 DNS 加 CNAME。

**更新文章**：改 `js/posts.js` → `git commit` → `git push` → 自动重新部署。

---

### 方案 B · Cloudflare Pages（全球 CDN，也免费）

适合：想要更快的国内/海外访问，或已有 Cloudflare 账号。

1. 注册 [Cloudflare](https://dash.cloudflare.com/) → 左侧 **Workers & Pages** → **Create** → **Pages**。
2. 两种导入方式二选一：
   - **Connect to Git**：连 GitHub 仓库，之后 push 即部署；
   - **Direct Upload**：把本项目文件夹打成 zip 或直接上传。
3. 构建设置：
   - Build command：**留空**（无构建）
   - Build output directory：`/` 或 `.`
4. 部署后得到 `https://xxx.pages.dev`，可在自定义域名里绑定自己的域名。

---

### 方案 C · Netlify Drop（最快：拖文件夹，零 Git）

适合：先要一个能分享的链接，还不想折腾 Git。

1. 打开 [Netlify Drop](https://app.netlify.com/drop)（建议登录后用，链接更稳）。
2. 把整个 `grok5.4` 文件夹拖进浏览器窗口。
3. 几秒后得到 `https://随机名.netlify.app`，可在站点设置里改名字、绑域名。

之后更新：改完本地，再拖一次新文件夹覆盖即可（或改连 Git 做自动部署）。

---

### 方案 D · Vercel（同样免费静态托管）

1. 注册 [Vercel](https://vercel.com/) → **Add New Project** → 导入 GitHub 仓库（或 CLI 上传）。
2. Framework Preset 选 **Other**；Build Command 留空；Output 指项目根。
3. 得到 `https://xxx.vercel.app`。

---

### 方案 E · 以后真的有服务器时（可选，非必须）

若你有 VPS、云主机或家里 NAS，只需当**静态文件服务器**即可，**不必**常驻 Node 进程：

```bash
# 临时演示（不推荐公网长期这样裸跑）
python3 -m http.server 80 --bind 0.0.0.0
```

更稳妥：用 **Caddy** 或 **nginx** 指到本项目目录，并开 HTTPS（Let’s Encrypt）。  
对个人博客而言，维护成本通常**高于** Pages / Cloudflare，没有特殊需求不必上服务器。

---

### 公开前检查清单

| 项 | 说明 |
|----|------|
| 用 HTTPS 打开 | Open-Meteo 天气请求在 HTTPS 下最稳 |
| 天气地点 | 默认**江苏南京江宁区**（固定坐标，**不使用**浏览器定位）；改 `js/weather.js` 的 `WEATHER_LOCATION` |
| Google Fonts | 需能访问外网；国内访客若慢，可日后改本地字体 |
| 隐私 | 无定位弹窗、无用户数据上报；仅访客浏览器请求天气 API |
| 内容 | 在 `js/posts.js` 写好文章再发布 |
| 仓库可见性 | GitHub Pages 免费版要求**公开仓库**（或付费私有） |

### 日常更新公开站

```text
本地改完 → git add / commit / push → Pages / Cloudflare / Vercel 自动重新部署
```

Netlify Drop：改完再拖一次文件夹。

### 还要自己的域名吗？

不必。免费托管都会给 `*.github.io` / `*.pages.dev` / `*.netlify.app` 之类的地址，足够分享。  
以后想用 `blog.example.com`，在托管后台绑自定义域名 + 改 DNS 即可。

---

## 十、验收清单

- [x] 跳转就地柔化（无全屏遮罩 / 无强制中间页）
- [x] 动画与南京江宁天气相关（固定坐标，不用浏览器定位；可手动八种天气）
- [x] 小雨 / 中雨 / 大雨分层；大风 + 雷电
- [x] 阴天轻盈、不压暗正文
- [x] 太阳柔和、不刺眼
- [x] 背景随 24 小时变化
- [x] 第一篇 `Hello World` 可测全流程
- [x] 无需自备服务器即可公开（见第九节：GitHub Pages / Cloudflare / Netlify / Vercel）

---

## 十一、一句话总结

这不是「文章外面包一层装饰」，而是：**时间决定天空，天气决定粒子，跳转只换内容**——三者共用同一套氛围语言。  
打开 http://127.0.0.1:3456 ，点进 Hello World，再戳右上角天气徽章，把八种天气（尤其阴天是否够轻、小/中/大雨与雷电）和昼夜都看一遍，就够验收了。  
要公开：走 **GitHub Pages / Cloudflare Pages / Netlify / Vercel**，**不用自己买服务器**（详见第九节）。

有想改的（多文章、观测城市、配色关键帧），优先改 `js/posts.js`、`js/weather.js`、`js/time-sky.js` 和 `styles/*`，改完刷新浏览器即可，一般不用重新装依赖。
