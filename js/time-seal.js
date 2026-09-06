/**
 * 时间印章（Time Seal）
 *
 * 每一篇文章都有它诞生与修订的时刻。虽然无法回放历史天气，但「时刻」本身
 * 决定天色：抽出创建 / 修订时分，渲染一枚微型动态天空圆盘——昼夜渐变、日 /
 * 月位置与月相、夜里的星点；再把 frontmatter 顺手写的 `weather` 变成圆盘
 * 内的雨丝雪粒。文案如：
 *
 *   写于 2026-03-14 · 雨夜 23:42
 *   最后修订于 2026-09-06 · 晴日午后 14:05 · 盈凸月
 *
 * 这是博客「时间驱动天空」主线下的时间胶囊。
 */
import { sampleSky, celestialPosition } from "./time-sky.js";

const pad = (n) => String(n).padStart(2, "0");

/** "2026-03-14 23:42" → 日期与时刻；缺时间默认正午。 */
function parseStamp(stamp) {
  if (!stamp) return null;
  const m = String(stamp)
    .trim()
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = m[4] != null ? Number(m[4]) : 12;
  const mi = m[5] != null ? Number(m[5]) : 0;
  return {
    date: new Date(y, mo - 1, d),
    dateText: `${y}-${pad(mo)}-${pad(d)}`,
    hours: h + mi / 60,
    hour: h,
    minute: mi,
  };
}

function prettyDate(p) {
  return `${p.date.getFullYear()} 年 ${p.date.getMonth() + 1} 月 ${p.date.getDate()} 日`;
}

/** 时辰 → 凌晨 / 清晨 / 上午 / 正午 / 午后 / 黄昏 / 夜晚 / 深夜 */
function clockWord(p) {
  const h = p.hours;
  if (h < 5) return "凌晨";
  if (h < 8) return "清晨";
  if (h < 11) return "上午";
  if (h < 13) return "正午";
  if (h < 17) return "午后";
  if (h < 19.5) return "黄昏";
  if (h < 23) return "夜晚";
  return "深夜";
}

const isNightHour = (h) => h >= 19.5 || h < 5;

const WEATHER_CN = {
  clear: "晴",
  cloudy: "阴",
  rain: "雨",
  snow: "雪",
  thunder: "雷",
  wind: "风",
};

/** 文案主体：天气 + 时辰揉成“雨夜 / 晴日午后 / 雪后初晴” */
function weatherPhrase(weather, p) {
  const kw = WEATHER_CN[weather] || "";
  const phase = sampleSky(p.hours).phase;
  const night = phase === "night" || isNightHour(p.hours);
  if (!kw) return night ? "静夜" : clockWord(p);
  if (night) {
    if (kw === "雷") return "雷雨夜";
    if (kw === "风") return "风夜";
    if (kw === "阴") return "阴夜";
    if (kw === "雪") return "雪夜";
    return kw === "晴" ? "晴夜" : `${kw}夜`;
  }
  if (kw === "雷") return "雷阵雨";
  if (kw === "风") return "大风天色";
  if (kw === "雪") return "雪后初霁";
  if (kw === "阴") return "阴沉天色";
  return `${kw}日${clockWord(p)}`; // 例如: 晴日午后 / 雨日下午
}

/** 月相 (0 新 → .5 满 → 1 残) 与中文名 */
function moonPhase(stamp) {
  const p = parseStamp(stamp);
  if (!p) return { fraction: 0.5, name: "满月" };
  const SYNODIC = 29.530588853;
  // 以本地日期 + 时分推相位（审美用途，非天文刊物），锚在 2000-01-06 新月
  const base = Date.UTC(p.date.getFullYear(), p.date.getMonth(), p.date.getDate());
  const refNew = Date.UTC(2000, 0, 6);
  let f = (((base - refNew) / 86400000) % SYNODIC + SYNODIC) % SYNODIC / SYNODIC;
  f = (f + p.hours / 24) % 1;
  const names = ["新月", "娥眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"];
  return { fraction: f, name: names[Math.floor(f * 8 + 0.01) % 8] };
}

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** 单枚月亮背景渐变：直描亮暗分界（审美相，非精确天文）。新月可为纯暗。 */
function phaseGradient(ph, name) {
  const LIT = "#fdfcef";
  const DARK = "#0b1326";
  if (name === "新月" || ph < 0.03) return DARK;
  if (name === "满月" || ph > 0.97) return LIT;
  const I = (1 - Math.cos(2 * Math.PI * ph)) / 2; // 照度 0..1
  const pct = (Math.max(0.02, Math.min(0.98, I)) * 100).toFixed(1);
  // 上半月（0→.5）光从右来：右侧亮、左侧暗；下半月反之
  if (ph < 0.5) {
    return `linear-gradient(to right, ${DARK} 0%, ${DARK} ${100 - +pct}%, ${LIT} ${100 - +pct}%)`;
  }
  return `linear-gradient(to right, ${LIT} 0%, ${LIT} ${pct}%, ${DARK} ${pct}%)`;
}

/** 单枚天空圆盘（.time-seal__disc）的完整 HTML */
function discHTML(stamp, weather, label) {
  const p = parseStamp(stamp) || { hours: 12, hour: 12, minute: 0, dateText: "", date: new Date() };
  const sky = sampleSky(p.hours);
  const phase = sky.phase; // night / dawn / day / dusk
  const night = phase === "night";
  const mpos = celestialPosition(p.hours, "moon");
  const spos = celestialPosition(p.hours, "sun");
  const phaseInfo = moonPhase(stamp);

  // 太阳只在“白天时段”展示；黄昏已过/破晓前的时段放月亮（天空仍可能带夕光）
  const daylight = p.hours >= 6 && p.hours < 19.5;
  const showSun = daylight;
  const celestial = showSun
    ? `<span class="time-seal__sun" style="--x:${spos.x}%;--y:${spos.y}%" aria-hidden="true"></span>`
    : `<span class="time-seal__moon" role="presentation"
         style="--x:${mpos.x}%;--y:${mpos.y}%;background:${phaseGradient(phaseInfo.fraction, phaseInfo.name)}" aria-hidden="true"></span>`;

  const stars = night
    ? `<span class="time-seal__stars" aria-hidden="true"></span>`
    : "";

  let wxLayer = "";
  if (weather === "snow") wxLayer = `<span class="time-seal__wx time-seal__wx--snow" aria-hidden="true"></span>`;
  else if (weather === "rain" || weather === "thunder") {
    wxLayer = `<span class="time-seal__wx${weather === "thunder" ? " is-thunder" : ""} time-seal__wx--rain" aria-hidden="true"></span>`;
  } else if (weather === "wind") wxLayer = `<span class="time-seal__wx time-seal__wx--wind" aria-hidden="true"></span>`;

  const style =
    `--st-top:${sky.top};--st-mid:${sky.mid};--st-bot:${sky.bot};` +
    `--cloud:${weather === "cloudy" ? "1" : weather ? "0.35" : "0"};`;

  return `<span class="time-seal__disc${night ? " is-night" : ""}${weather === "cloudy" ? " has-cloud" : ""}" style="${style}" role="img" aria-label="${esc(label)}" title="${esc(label)}">
      <span class="time-seal__haze" aria-hidden="true"></span>
      ${stars}
      ${celestial}
      ${weather === "cloudy" ? '<span class="time-seal__cloud" aria-hidden="true"></span>' : ""}
      ${wxLayer}
    </span>`;
}

/** 卡片 meta 行里的小图章：小圆盘 + 天气时辰短文，跟标签同高度。 */
export function renderCardSeal(post) {
  const t = post.createdAt || `${post.date} 12:00`;
  const p = parseStamp(t);
  if (!p) return "";
  const stamp = `${p.dateText} ${pad(p.hour)}:${pad(p.minute)}`;
  const phrase = weatherPhrase(post.weather || "", p);
  const text = `${phrase} ${pad(p.hour)}:${pad(p.minute)}`;
  const label = `写于 ${prettyDate(p)} · ${phrase} · ${pad(p.hour)}:${pad(p.minute)}`;
  return `<span class="time-seal time-seal--chip" title="${esc(label)}">
      <span class="time-seal__badge">${discHTML(stamp, post.weather || "", label)}</span>
      <span class="time-seal__chip-text">${esc(text)}</span>
    </span>`;
}

/** 文章页头部：一条“写于”，可选再加一条“最后修订于” */
export function renderArticleSeal(post) {
  const created = `${post.createdAt || `${post.date} 12:00`}`;
  const c = entryHTML("写于", created, post.weather || "");
  let u = "";
  if (post.updatedAt && post.updatedAt !== created) {
    u = entryHTML("最后修订于", post.updatedAt, "");
  }
  return `<div class="article-seals">${c}${u}</div>`;
}

function entryHTML(label, stamp, weather) {
  const p = parseStamp(stamp);
  if (!p) return "";
  const phrase = weatherPhrase(weather, p);
  const phaseInfo = moonPhase(stamp);
  const timeText = `${pad(p.hour)}:${pad(p.minute)}`;
  const sub = [phrase, phaseInfo.name === "新月" ? "" : phaseInfo.name, timeText]
    .filter((x) => x !== null && x !== undefined && x !== "")
    .join(" · ");
  return `<div class="time-seal time-seal--entry">
    ${discHTML(stamp, weather, `${label} ${prettyDate(p)} · ${sub}`)}
    <span class="time-seal__words">
      <strong>${label} <time>${prettyDate(p)}</time></strong>
      <small>${sub}</small>
    </span>
  </div>`;
}

