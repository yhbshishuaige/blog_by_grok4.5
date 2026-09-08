/**
 * 设置抽屉（右上角“设置”⚙）
 * 把浏览器/布局控制里原来的一排顶部小钮收进一个分组面板：
 *   布局 / 背景 / 时间 / 季节 / 天气 —— 各自分段，读取当前状态、即选即用。
 * 依赖 main.js 注入的控制器句柄（homeLayout/background/timeSky/seasonControl/weather）。
 * 打开 × 关闭：点齿轮、外部点击、Esc。
 */
import { WEATHER_TYPES, WEATHER_META } from "./weather.js";

const ICONS = {
  deck: "☰", classic: "▱",
  sky: "◐", mountain: "⛰",
  auto: "✨", spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️",
};

function h(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function createSettings({ g }) {
  const root = document.getElementById("configControl");
  const btn = document.getElementById("configBtn");
  const panel = document.getElementById("configPanel");
  if (!root || !btn || !panel) return null;
  let open = false;


  // ═══ 分组：layout / 背景 / 时间 / 季节 / 天气 ═══
  function layoutGroup() {
    const cur = g.homeLayout.getMode();
    const row = ["deck", "classic"];
    return `
      <div class="config-group" data-group="layout">
        <div class="config-group-head"><span class="config-group-title">首页布局</span><small>首页排布</small></div>
        <div class="config-row">` +
      row.map((m) =>
        `<button type="button" class="cfg-pill${cur === m ? " is-on" : ""}" data-layout="${m}">
           <span class="cfg-ic">${ICONS[m]}</span>${m === "deck" ? "翻卡" : "经典列表"}
         </button>`
      ).join("") +
      `</div></div>`;
  }

  function backgroundGroup() {
    const cur = g.background.getMode();
    return `
      <div class="config-group" data-group="background">
        <div class="config-group-head"><span class="config-group-title">背景</span><small>身后的山水</small></div>
        <div class="config-row">
          <button type="button" class="cfg-pill${cur === "sky" ? " is-on" : ""}" data-bg="sky"><span class="cfg-ic">◐</span>天空</button>
          <button type="button" class="cfg-pill${cur === "mountain" ? " is-on" : ""}" data-bg="mountain"><span class="cfg-ic">⛰</span>雪山</button>
        </div></div>`;
  }

  function seasonGroup() {
    const cur = g.seasonControl.getSeason();
    const opts = [
      ["auto", "自动"],
      ["spring", "春"],
      ["summer", "夏"],
      ["autumn", "秋"],
      ["winter", "冬"],
    ];
    return `
      <div class="config-group" data-group="season">
        <div class="config-group-head"><span class="config-group-title">季节</span><small>四季氛围</small></div>
        <div class="config-row">` +
      opts.map(([k, lbl]) =>
        `<button type="button" class="cfg-pill${cur === k ? " is-on" : ""}" data-season="${k}">
           <span class="cfg-ic">${ICONS[k]}</span>${lbl}
         </button>`
      ).join("") +
      `</div></div>`;
  }

  function weatherGroup() {
    const now = g.weather.getType();
    const meta = WEATHER_META[now] || WEATHER_META.sunny;
    // 手动点击任一类型可看对应天气粒子（预览），再点“跟随实时”让其自动刷新
    return `
      <div class="config-group" data-group="weather">
        <div class="config-group-head"><span class="config-group-title">天气</span><small>此刻 / 可预览</small></div>
        <div class="config-weather-now">
          <span class="big">${meta.icon}</span>
          <span><span class="lbl">${h(meta.label)}</span>
          <br><span class="meta">晋中·榆次 · Open-Meteo</span></span>
        </div>
        <div class="config-row">` +
      WEATHER_TYPES.map((t) =>
        `<button type="button" class="cfg-pill" data-weather="${t}">${WEATHER_META[t].icon}${WEATHER_META[t].label}</button>`
      ).join("") +
      `<button type="button" class="cfg-pill cfg-live" data-weather-live>◉ 跟随实时</button>
        </div></div>`;
  }

  function render() {
    try {
      panel.innerHTML = [
        layoutGroup(),
        backgroundGroup(),
        seasonGroup(),
        weatherGroup(),
      ].join("");
      bind();
    } catch (err) {
      console.warn("[settings] 渲染失败:", err);
      panel.innerHTML = `<div class="config-group"><div class="config-group-head"><span class="config-group-title">设置</span><small>渲染出错了</small></div><p style="font-size:0.8rem;color:var(--text-muted)">${h(String(err?.message || err))}</p></div>`;
    }
  }

  function bind() {
    // 布局
    panel.querySelectorAll("[data-layout]").forEach((el) =>
      el.addEventListener("click", () => {
        g.homeLayout.setMode(el.dataset.layout);
        paint();
      })
    );
    // 背景
    panel.querySelectorAll("[data-bg]").forEach((el) =>
      el.addEventListener("click", () => {
        g.background.setMode(el.dataset.bg);
        paint();
      })
    );

    // 季节
    panel.querySelectorAll("[data-season]").forEach((el) =>
      el.addEventListener("click", () => {
        g.seasonControl.setSeason(el.dataset.season);
        paint();
      })
    );
    // 天气（手动预览 / 跟实时）
    panel.querySelectorAll("[data-weather]").forEach((el) =>
      el.addEventListener("click", () => {
        g.weather.applyWeather(el.dataset.weather);
        paint();
      })
    );
    panel.querySelector("[data-weather-live]")?.addEventListener("click", async () => {
      await g.weather.init();
      paint();
    });
  }

  function paint() {
    render();
  }

  function openPanel() {
    open = true;
    root.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    render();
  }

  function closePanel() {
    open = false;
    root.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    open ? closePanel() : openPanel();
  });

  // 面板内任何点击都不应冒泡到 document（面板会在值改变时重建，冒泡会被误判为“点到面板外”）
  panel.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("click", (event) => {
    if (open && !root?.contains(event.target)) closePanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) closePanel();
  });

  // 状态变化后若面板开着则同步刷新 check
  const repaint = () => open && paint();
  window.addEventListener("homelayoutchange", repaint);
  window.addEventListener("seasonchange", repaint);
  window.addEventListener("weatherchange", repaint);

  return { open: openPanel, close: closePanel, refresh: paint };
}
