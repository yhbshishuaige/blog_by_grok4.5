/**
 * Weather Blog — 季节与节日系统
 * - 按月份判定四季,为 body 挂 season-* 类并生成季节环境粒子(花瓣/萤火/落叶/冰晶)
 * - 内置农历换算(1900–2099),识别中国节日:除夕、春节、元宵、情人节、清明、
 *   劳动节、端午、七夕、中秋、国庆、重阳、元旦;挂 festival-* 类并生成对应场景
 * - 支持 URL 参数预览:?season=autumn&festival=mid-autumn(festival=none 可强制关闭)
 * - 控制台 API:WeatherBlog.season.setSeason('autumn') / setFestival('spring-festival') / info()
 */

/* ===================== 农历数据(1900–2099 标准压缩表) ===================== */
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
];

function lunarYearDays(year) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += LUNAR_INFO[year - 1900] & i ? 1 : 0;
  return sum + leapDays(year);
}

function leapMonth(year) {
  return LUNAR_INFO[year - 1900] & 0xf;
}

function leapDays(year) {
  return leapMonth(year) ? (LUNAR_INFO[year - 1900] & 0x10000 ? 30 : 29) : 0;
}

function monthDays(year, month) {
  return LUNAR_INFO[year - 1900] & (0x10000 >> month) ? 30 : 29;
}

function solarToLunar(date) {
  const base = Date.UTC(1900, 0, 31);
  let offset = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - base) / 86400000
  );

  let year = 1900;
  for (; year < 2099; year++) {
    const days = lunarYearDays(year);
    if (offset < days) break;
    offset -= days;
  }

  const leap = leapMonth(year);
  let leapDone = false;
  let month = 1;
  let day = 1;
  let isLeap = false;
  for (;;) {
    // 闰月排在同序号常规月之后:处理完第 leap 月、进入 leap+1 月前,先插入闰月
    const thisIsLeap = leap > 0 && month === leap + 1 && !leapDone;
    const days = thisIsLeap ? leapDays(year) : monthDays(year, month);
    if (offset < days) {
      day = offset + 1;
      isLeap = thisIsLeap;
      if (thisIsLeap) month = leap;
      break;
    }
    offset -= days;
    if (thisIsLeap) leapDone = true;
    else month += 1;
  }
  return { year, month, day, isLeap };
}

const LUNAR_MONTH_NAMES = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const CN_DIGITS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function lunarDayName(day) {
  if (day === 10) return "初十";
  if (day === 20) return "二十";
  if (day === 30) return "三十";
  if (day < 10) return `初${CN_DIGITS[day - 1]}`;
  if (day < 20) return `十${CN_DIGITS[day - 11]}`;
  return `廿${CN_DIGITS[day - 21]}`;
}

function lunarLabel(date) {
  const l = solarToLunar(date);
  return `${l.isLeap ? "闰" : ""}${LUNAR_MONTH_NAMES[l.month - 1]}月${lunarDayName(l.day)}`;
}

export { solarToLunar, lunarLabel };

/* ===================== 节日定义 ===================== */

// 农历节日(month/day 为农历,span 为额外延续天数)
const LUNAR_FESTIVALS = [
  { id: "spring-festival", month: 1, day: 1, span: 6 },
  { id: "lantern", month: 1, day: 15, span: 1 },
  { id: "duanwu", month: 5, day: 5, span: 1 },
  { id: "qixi", month: 7, day: 7, span: 1 },
  { id: "mid-autumn", month: 8, day: 15, span: 1 },
  { id: "chongyang", month: 9, day: 9, span: 1 },
];

// 公历节日(span 为额外延续天数)
const SOLAR_FESTIVALS = [
  { id: "new-year", month: 1, day: 1, span: 1 },
  { id: "valentine", month: 2, day: 14, span: 1 },
  { id: "qingming", month: 4, day: 4, span: 2 },
  { id: "labor", month: 5, day: 1, span: 4 },
  { id: "national", month: 10, day: 1, span: 6 },
];

const FESTIVALS = {
  "new-year": {
    name: "元旦",
    greet: "元旦快乐 · 新的一年也要闪闪发光",
    build: (kit) => {
      kit.bunting(["#ff6b6b", "#ffd98a", "#6bc5ff", "#8ee08e"]);
      kit.fall("confetti", 20, ["#ff6b6b", "#ffd98a", "#6bc5ff", "#8ee08e", "#c792ea"]);
    },
  },
  "new-year-eve": {
    name: "除夕",
    greet: "爆竹声中一岁除 · 阖家团圆",
    build: (kit) => {
      kit.lanterns(8);
      kit.fireworks();
    },
  },
  "spring-festival": {
    name: "春节",
    greet: "新春快乐 · 万事胜意 岁岁平安",
    build: (kit) => {
      kit.lanterns(10);
      kit.fireworks();
      kit.fall("confetti", 14, ["#ff5a4e", "#ffd98a", "#ff8a5c", "#ffe9a0"]);
    },
  },
  lantern: {
    name: "元宵节",
    greet: "火树银花不夜天 · 元宵安康",
    build: (kit) => {
      kit.lanterns(8);
      kit.kongming(9);
    },
  },
  valentine: {
    name: "情人节",
    greet: "愿天下有情人终成眷属",
    build: (kit) => {
      kit.hearts(9);
    },
  },
  qingming: {
    name: "清明",
    greet: "清明时节 · 天清景明",
    build: () => {},
  },
  labor: {
    name: "劳动节",
    greet: "劳动最光荣 · 假期愉快",
    build: (kit) => {
      kit.bunting(["#ff6b6b", "#ffd98a", "#6bc5ff", "#8ee08e", "#c792ea"]);
      kit.fall("confetti", 12, ["#ff6b6b", "#ffd98a", "#6bc5ff", "#8ee08e"]);
    },
  },
  duanwu: {
    name: "端午节",
    greet: "粽叶飘香 · 端午安康",
    build: (kit) => {
      kit.fall("leafgreen", 14, ["#7fc86e", "#4f9f5f", "#8fd07e"]);
    },
  },
  qixi: {
    name: "七夕",
    greet: "金风玉露一相逢 · 便胜却人间无数",
    build: (kit) => {
      kit.qixiStars();
      kit.hearts(7);
    },
  },
  "mid-autumn": {
    name: "中秋节",
    greet: "但愿人长久 · 千里共婵娟",
    build: (kit) => {
      kit.moon();
      kit.kongming(7);
    },
  },
  national: {
    name: "国庆节",
    greet: "盛世华诞 · 举国同庆",
    build: (kit) => {
      kit.bunting(["#ff5a4e", "#ffd98a", "#ff8a5c", "#ffe9a0"]);
      kit.lanterns(9);
      kit.fireworks();
    },
  },
  chongyang: {
    name: "重阳节",
    greet: "登高望远 · 菊香满秋",
    build: (kit) => {
      kit.fall("chrysanth", 16, ["#ffe9a0", "#f0b429", "#fff3d6"]);
    },
  },
};

/* ===================== 四季环境粒子配置 ===================== */
const SEASON_AMBIENT = {
  spring: {
    count: 14,
    kind: "petal",
    colors: ["#ffc7d8", "#ffd9e4", "#ffb3c8", "#fff0f4"],
  },
  summer: {
    count: 10,
    kind: "firefly",
    colors: ["#d8ffb0"],
  },
  autumn: {
    count: 18,
    kind: "leaf",
    colors: ["#e8964a", "#d96a2a", "#f0b429", "#c9542e", "#e8c46a"],
  },
  winter: {
    count: 12,
    kind: "crystal",
    colors: ["#eaf4ff"],
  },
};

const GREET_KEY = "weather-blog-festival-greet";
const SEASON_KEY = "weather-blog-season-override";
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function createSeason() {
  const body = document.body;
  const ambient = document.getElementById("seasonAmbient");
  const layer = document.getElementById("festivalLayer");
  const toast = document.getElementById("secretToast");
  const reducedMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentSeason = null;
  let currentFestival = null;
  let manualSeason = null;
  let manualFestival = null;
  let fireworksTimer = 0;

  /* ---------- 工具 ---------- */

  function seasonOf(date) {
    const m = date.getMonth() + 1;
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "autumn";
    return "winter";
  }

  function festivalOf(date) {
    const lunar = solarToLunar(date);
    for (const f of LUNAR_FESTIVALS) {
      if (
        lunar.month === f.month &&
        !lunar.isLeap &&
        lunar.day >= f.day &&
        lunar.day <= f.day + f.span
      ) {
        return f.id;
      }
    }
    // 除夕:腊月最后一天
    if (lunar.month === 12 && !lunar.isLeap && lunar.day === monthDays(lunar.year, 12)) {
      return "new-year-eve";
    }
    const m = date.getMonth() + 1;
    const d = date.getDate();
    for (const f of SOLAR_FESTIVALS) {
      if (m === f.month && d >= f.day && d <= f.day + f.span) return f.id;
    }
    return null;
  }

  /* ---------- 季节环境粒子 ---------- */

  function buildAmbient(season) {
    if (!ambient) return;
    ambient.dataset.season = season;
    if (reducedMotion) {
      ambient.replaceChildren();
      return;
    }
    const conf = SEASON_AMBIENT[season];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < conf.count; i++) {
      const el = document.createElement("i");
      el.className = conf.kind;
      const dur = conf.kind === "firefly" ? rand(9, 16) : rand(8, 15);
      el.style.setProperty("--x", `${rand(2, 97)}%`);
      el.style.setProperty("--dur", `${dur.toFixed(1)}s`);
      el.style.setProperty("--delay", `${(-Math.random() * dur).toFixed(1)}s`);
      el.style.setProperty("--scale", rand(0.7, 1.5).toFixed(2));
      el.style.setProperty("--drift", `${rand(-6, 6).toFixed(1)}vw`);
      el.style.setProperty("--spin", `${Math.round(rand(160, 560))}deg`);
      el.style.setProperty("--peak", rand(0.55, 0.95).toFixed(2));
      el.style.setProperty("--c", pick(conf.colors));
      frag.appendChild(el);
    }
    ambient.replaceChildren(frag);
  }

  /* ---------- 节日场景生成器 ---------- */

  function spawnBunting(colors) {
    if (!layer) return;
    const strip = document.createElement("div");
    strip.className = "fest-bunting";
    const count = Math.ceil(window.innerWidth / 34);
    for (let i = 0; i < count; i++) {
      const flag = document.createElement("i");
      flag.style.setProperty("--c", colors[i % colors.length]);
      flag.style.left = `${(i / count) * 100}%`;
      flag.style.animationDelay = `${(-Math.random() * 3).toFixed(1)}s`;
      strip.appendChild(flag);
    }
    layer.appendChild(strip);
  }

  function spawnLanterns(count) {
    if (!layer) return;
    for (let i = 0; i < count; i++) {
      const lantern = document.createElement("div");
      lantern.className = "fest-lantern";
      const scale = rand(0.7, 1.25);
      lantern.style.setProperty("--x", `${rand(3, 93)}%`);
      lantern.style.setProperty("--dur", `${rand(3.4, 5.4).toFixed(1)}s`);
      lantern.style.setProperty("--delay", `${(-Math.random() * 4).toFixed(1)}s`);
      lantern.style.transform = `scale(${scale.toFixed(2)})`;
      lantern.style.opacity = String(rand(0.82, 1));
      layer.appendChild(lantern);
    }
  }

  function spawnKongming(count) {
    if (!layer) return;
    for (let i = 0; i < count; i++) {
      const lamp = document.createElement("div");
      lamp.className = "fest-kongming";
      const dur = rand(34, 56);
      lamp.style.setProperty("--x", `${rand(4, 92)}%`);
      lamp.style.setProperty("--dur", `${dur.toFixed(0)}s`);
      lamp.style.setProperty("--delay", `${(-Math.random() * dur).toFixed(0)}s`);
      lamp.style.setProperty("--peak", rand(0.6, 1).toFixed(2));
      lamp.style.setProperty("--scale", rand(0.75, 1.3).toFixed(2));
      layer.appendChild(lamp);
    }
  }

  function spawnHearts(count) {
    if (!layer) return;
    const colors = ["#ff7aa2", "#ff5c8a", "#ffb3c8", "#ff8fb0"];
    for (let i = 0; i < count; i++) {
      const heart = document.createElement("i");
      heart.className = "fest-heart";
      const dur = rand(13, 22);
      heart.style.setProperty("--x", `${rand(4, 92)}%`);
      heart.style.setProperty("--dur", `${dur.toFixed(1)}s`);
      heart.style.setProperty("--delay", `${(-Math.random() * dur).toFixed(1)}s`);
      heart.style.setProperty("--scale", rand(0.6, 1.3).toFixed(2));
      heart.style.setProperty("--peak", rand(0.5, 0.9).toFixed(2));
      heart.style.setProperty("--drift", `${rand(-5, 5).toFixed(1)}vw`);
      heart.style.setProperty("--c", pick(colors));
      layer.appendChild(heart);
    }
  }

  function spawnFall(kind, count, colors) {
    if (!layer) return;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("i");
      el.className = kind;
      const dur = rand(7, 13);
      el.style.setProperty("--x", `${rand(2, 97)}%`);
      el.style.setProperty("--dur", `${dur.toFixed(1)}s`);
      el.style.setProperty("--delay", `${(-Math.random() * dur).toFixed(1)}s`);
      el.style.setProperty("--scale", rand(0.7, 1.4).toFixed(2));
      el.style.setProperty("--drift", `${rand(-5, 5).toFixed(1)}vw`);
      el.style.setProperty("--spin", `${Math.round(rand(160, 560))}deg`);
      el.style.setProperty("--peak", rand(0.6, 0.95).toFixed(2));
      el.style.setProperty("--c", pick(colors));
      layer.appendChild(el);
    }
  }

  function spawnBurst() {
    if (!layer || document.hidden) return;
    const burst = document.createElement("div");
    burst.className = "fest-fw";
    const hueSets = [
      ["#ffd98a", "#fff3d6"],
      ["#ff8a5c", "#ffd98a"],
      ["#9ad7ff", "#e6f6ff"],
      ["#ff7aa2", "#ffd9e4"],
      ["#c792ea", "#f0e0ff"],
    ];
    const [c1, c2] = pick(hueSets);
    burst.style.setProperty("--x", `${rand(8, 90)}%`);
    burst.style.setProperty("--y", `${rand(8, 38)}%`);
    burst.style.setProperty("--c", c1);
    burst.style.setProperty("--c2", c2);
    layer.appendChild(burst);
    window.setTimeout(() => burst.remove(), 2100);
  }

  function startFireworks() {
    if (reducedMotion) return;
    window.setTimeout(spawnBurst, 700);
    const loop = () => {
      spawnBurst();
      fireworksTimer = window.setTimeout(loop, rand(1800, 4600));
    };
    fireworksTimer = window.setTimeout(loop, rand(2400, 4000));
  }

  function spawnMoon() {
    if (!layer) return;
    const moon = document.createElement("div");
    moon.className = "fest-moon";
    layer.appendChild(moon);
  }

  function spawnQixiStars() {
    if (!layer) return;
    const stars = [
      { name: "织女星", left: "24%", top: "17%" },
      { name: "牛郎星", left: "66%", top: "25%" },
    ];
    for (const s of stars) {
      const star = document.createElement("span");
      star.className = "fest-star";
      star.dataset.name = s.name;
      star.style.left = s.left;
      star.style.top = s.top;
      layer.appendChild(star);
    }
  }

  /* ---------- 节日祝福 ---------- */

  function greet(id) {
    const fest = FESTIVALS[id];
    if (!fest || !toast) return;
    const today = new Date();
    const key = `${id}|${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    try {
      if (localStorage.getItem(GREET_KEY) === key) return;
      localStorage.setItem(GREET_KEY, key);
    } catch {
      /* storage 不可用时仍显示 */
    }
    toast.textContent = `🎉 ${fest.greet}`;
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 6500);
  }

  function clearFestival() {
    window.clearTimeout(fireworksTimer);
    fireworksTimer = 0;
    if (currentFestival) body.classList.remove(`festival-${currentFestival}`);
    currentFestival = null;
    if (layer) layer.replaceChildren();
  }

  function buildFestival(id) {
    const fest = FESTIVALS[id];
    if (!fest) return;
    currentFestival = id;
    body.classList.add(`festival-${id}`);
    if (!reducedMotion) {
      fest.build({
        bunting: spawnBunting,
        lanterns: spawnLanterns,
        kongming: spawnKongming,
        hearts: spawnHearts,
        fall: spawnFall,
        fireworks: startFireworks,
        moon: spawnMoon,
        qixiStars: spawnQixiStars,
      });
    }
    greet(id);
  }

  /* ---------- 主刷新 ---------- */

  function refresh() {
    const now = new Date();

    const season = manualSeason || seasonOf(now);
    if (season !== currentSeason) {
      if (currentSeason) body.classList.remove(`season-${currentSeason}`);
      body.classList.add(`season-${season}`);
      currentSeason = season;
      buildAmbient(season);
    }

    const festival =
      manualFestival === "none" ? null : manualFestival || festivalOf(now);
    if (festival !== currentFestival) {
      clearFestival();
      if (festival) buildFestival(festival);
    }
  }

  function init() {
    try {
      const params = new URLSearchParams(location.search);
      // URL 参数优先,其次读本地保存的手动季节
      manualSeason = params.get("season") || loadSeasonOverride();
      manualFestival = params.get("festival") || null;
    } catch {
      manualSeason = loadSeasonOverride();
    }
    refresh();
    window.setInterval(refresh, 10 * 60 * 1000);
  }

  function loadSeasonOverride() {
    try {
      const saved = localStorage.getItem(SEASON_KEY);
      return saved && SEASON_AMBIENT[saved] ? saved : null;
    } catch {
      return null;
    }
  }

  /* ---------- 控制台 API ---------- */

  function setSeason(season, save = false) {
    manualSeason = season || null;
    if (save) {
      try {
        if (manualSeason) localStorage.setItem(SEASON_KEY, manualSeason);
        else localStorage.removeItem(SEASON_KEY);
      } catch {
        /* storage 不可用 */
      }
    }
    refresh();
    window.dispatchEvent(new CustomEvent("seasonchange", { detail: info() }));
    return manualSeason;
  }

  function setFestival(festival) {
    manualFestival = festival || null;
    refresh();
  }

  function info() {
    const now = new Date();
    return {
      season: currentSeason,
      festival: currentFestival,
      festivalName: currentFestival ? FESTIVALS[currentFestival].name : null,
      lunar: lunarLabel(now),
      manual: { season: manualSeason, festival: manualFestival },
    };
  }

  return {
    init,
    refresh,
    setSeason,
    setFestival,
    info,
    lunarLabel,
  };
}
