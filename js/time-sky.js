/**
 * 24-hour sky cycle: gradient, sun/moon position, day/night classes
 * Supports manual hour override for the time dial UI.
 */

/** Keyframes for sky colors through the day (hour 0–24). Glow kept soft so sun never blinds. */
const SKY_STOPS = [
  // midnight
  { h: 0, top: "#050814", mid: "#0a1228", bot: "#121c38", glow: "rgba(120,140,220,0.08)", phase: "night" },
  { h: 4, top: "#0a1020", mid: "#1a2040", bot: "#2a3058", glow: "rgba(100,120,200,0.1)", phase: "night" },
  // dawn
  { h: 5.5, top: "#1a2048", mid: "#5a4068", bot: "#e89070", glow: "rgba(255,150,110,0.14)", phase: "dawn" },
  { h: 6.5, top: "#3a5088", mid: "#e8a070", bot: "#ffc090", glow: "rgba(255,180,120,0.16)", phase: "dawn" },
  // morning
  { h: 8, top: "#4a7ab8", mid: "#7ab0e0", bot: "#c8e0f8", glow: "rgba(255,210,140,0.12)", phase: "day" },
  { h: 10, top: "#3a80c8", mid: "#6ab0e8", bot: "#a8d4f8", glow: "rgba(255,220,150,0.11)", phase: "day" },
  // noon — deliberately muted glow
  { h: 12, top: "#2a78c8", mid: "#5aa8e8", bot: "#98c8f0", glow: "rgba(255,220,160,0.1)", phase: "day" },
  { h: 14, top: "#3a70b8", mid: "#5a98d8", bot: "#88b8e8", glow: "rgba(255,210,140,0.1)", phase: "day" },
  // afternoon
  { h: 16, top: "#3a68a8", mid: "#6890c0", bot: "#c8a888", glow: "rgba(255,180,110,0.12)", phase: "day" },
  // dusk
  { h: 18, top: "#2a3868", mid: "#c07050", bot: "#e8a060", glow: "rgba(255,150,90,0.16)", phase: "dusk" },
  { h: 19.5, top: "#1a2048", mid: "#5a3860", bot: "#a85060", glow: "rgba(255,120,90,0.12)", phase: "dusk" },
  // night
  { h: 21, top: "#0a1028", mid: "#141e40", bot: "#1a2850", glow: "rgba(140,160,255,0.12)", phase: "night" },
  { h: 24, top: "#050814", mid: "#0a1228", bot: "#121c38", glow: "rgba(120,140,220,0.08)", phase: "night" },
];

const PHASE_LABELS = {
  night: "深夜",
  dawn: "黎明",
  day: "白昼",
  dusk: "黄昏",
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const c = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgbToHex({
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  });
}

function parseGlow(rgba) {
  const m = rgba.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
  if (!m) return { r: 255, g: 200, b: 120, a: 0.3 };
  return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
}

function lerpGlow(g1, g2, t) {
  const a = parseGlow(g1);
  const b = parseGlow(g2);
  return `rgba(${lerp(a.r, b.r, t)}, ${lerp(a.g, b.g, t)}, ${lerp(a.b, b.b, t)}, ${lerp(a.a, b.a, t)})`;
}

function sampleSky(hour) {
  let h = hour % 24;
  if (h < 0) h += 24;

  let i = 0;
  while (i < SKY_STOPS.length - 1 && SKY_STOPS[i + 1].h < h) i++;
  const a = SKY_STOPS[i];
  const b = SKY_STOPS[Math.min(i + 1, SKY_STOPS.length - 1)];
  const span = b.h - a.h || 1;
  const t = Math.min(1, Math.max(0, (h - a.h) / span));

  return {
    top: lerpColor(a.top, b.top, t),
    mid: lerpColor(a.mid, b.mid, t),
    bot: lerpColor(a.bot, b.bot, t),
    glow: lerpGlow(a.glow, b.glow, t),
    phase: t < 0.5 ? a.phase : b.phase,
    t,
  };
}

/** Sun arc: rises east (~10%) at dawn, high at noon, sets west (~90%) */
function celestialPosition(hour, kind) {
  if (kind === "sun") {
    const rise = 5.5;
    const set = 19.5;
    if (hour < rise || hour > set) {
      return { x: 50, y: 110, visible: false };
    }
    const p = (hour - rise) / (set - rise);
    const x = 8 + p * 84;
    const y = 78 - Math.sin(p * Math.PI) * 62;
    return { x, y, visible: true };
  }

  // Moon: opposite side of day roughly
  const nightStart = 19.5;
  if (hour >= 6 && hour <= 19) {
    const p = (hour - 6) / 13;
    return { x: 90 - p * 80, y: 90, visible: false };
  }
  const p = hour >= 19.5
    ? (hour - 19.5) / (24 - 19.5 + 5.5)
    : (hour + (24 - 19.5)) / (24 - 19.5 + 5.5);
  const x = 12 + p * 76;
  const y = 72 - Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * 50;
  return { x, y, visible: true };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function normalizeHour(h) {
  let x = h % 24;
  if (x < 0) x += 24;
  return x;
}

function hourToDate(hour) {
  const d = new Date();
  const h = normalizeHour(hour);
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60) % 60;
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function phaseLabel(phase) {
  return PHASE_LABELS[phase] || phase;
}

export function createTimeSky(options = {}) {
  const root = options.root || document.documentElement;
  const body = options.body || document.body;
  const sunOrb = document.getElementById("sunOrb");
  const moonOrb = document.getElementById("moonOrb");
  const clockEl = document.getElementById("clock");
  let raf = 0;
  let lastMinute = -1;
  /** @type {number | null} manual hour 0–24; null = live clock */
  let overrideHour = null;
  const listeners = new Set();

  function emit(state) {
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {
        /* ignore */
      }
    });
  }

  function apply(now) {
    const live = now instanceof Date ? now : new Date();
    const source =
      overrideHour != null ? hourToDate(overrideHour) : live;
    const hour =
      overrideHour != null
        ? normalizeHour(overrideHour)
        : live.getHours() + live.getMinutes() / 60 + live.getSeconds() / 3600;

    const sky = sampleSky(hour);
    const sun = celestialPosition(hour, "sun");
    const moon = celestialPosition(hour, "moon");

    root.style.setProperty("--sky-top", sky.top);
    root.style.setProperty("--sky-mid", sky.mid);
    root.style.setProperty("--sky-bot", sky.bot);
    root.style.setProperty("--glow-color", sky.glow);
    root.style.setProperty("--glow-x", `${sun.visible ? sun.x : moon.x}%`);
    root.style.setProperty("--glow-y", `${(sun.visible ? sun.y : moon.y) + 5}%`);

    body.classList.remove("is-day", "is-night", "is-dawn", "is-dusk");
    body.classList.add(`is-${sky.phase}`);
    body.classList.toggle("is-time-override", overrideHour != null);

    if (sunOrb) {
      sunOrb.style.left = `${sun.x}%`;
      sunOrb.style.top = `${sun.y}%`;
      sunOrb.style.opacity = sun.visible ? "" : "0";
    }
    if (moonOrb) {
      moonOrb.style.left = `${moon.x}%`;
      moonOrb.style.top = `${moon.y}%`;
    }

    if (clockEl) {
      const hours = source.getHours();
      const minutes = source.getMinutes();
      if (minutes !== lastMinute || clockEl.textContent === "--:--" || overrideHour != null) {
        lastMinute = minutes;
        clockEl.textContent = `${pad(hours)}:${pad(minutes)}`;
        clockEl.title = overrideHour != null ? "预览时间（可点时间轮盘返回实时）" : "本地时间";
        clockEl.classList.toggle("is-preview", overrideHour != null);
      }
    }

    const state = {
      hour,
      sky,
      sun,
      moon,
      phase: sky.phase,
      phaseLabel: phaseLabel(sky.phase),
      overridden: overrideHour != null,
      display: `${pad(source.getHours())}:${pad(source.getMinutes())}`,
    };
    emit(state);
    return state;
  }

  function tick() {
    apply();
    raf = window.setTimeout(tick, 1000);
  }

  function start() {
    apply();
    tick();
  }

  function stop() {
    clearTimeout(raf);
  }

  /** Force a fake hour 0–24 (preview mode) */
  function setHour(h) {
    overrideHour = normalizeHour(h);
    return apply();
  }

  /** Alias kept for console playground */
  function setDebugHour(h) {
    return setHour(h);
  }

  function clearOverride() {
    overrideHour = null;
    lastMinute = -1;
    return apply();
  }

  function getHour() {
    if (overrideHour != null) return normalizeHour(overrideHour);
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  function isOverridden() {
    return overrideHour != null;
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    start,
    stop,
    apply,
    setHour,
    setDebugHour,
    clearOverride,
    getHour,
    isOverridden,
    onChange,
    sampleSky,
    phaseLabel,
  };
}
