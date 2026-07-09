/**
 * Weather system: Open-Meteo + canvas particles
 * Types: sunny | cloudy | rain-light | rain-medium | rain-heavy
 *      | snow-light | snow-medium | snow-heavy | windy | thunder
 */

export const WEATHER_TYPES = [
  "sunny",
  "cloudy",
  "rain-light",
  "rain-medium",
  "rain-heavy",
  "snow-light",
  "snow-medium",
  "snow-heavy",
  "windy",
  "thunder",
];

export const WEATHER_META = {
  sunny: { icon: "☀️", label: "晴天", transition: "光影流转" },
  cloudy: { icon: "☁️", label: "阴天", transition: "云层漫过" },
  "rain-light": { icon: "🌦️", label: "小雨", transition: "细雨轻落" },
  "rain-medium": { icon: "🌧️", label: "中雨", transition: "雨幕低垂" },
  "rain-heavy": { icon: "🌧️", label: "大雨", transition: "骤雨倾泻" },
  "snow-light": { icon: "🌨️", label: "小雪", transition: "细雪轻落" },
  "snow-medium": { icon: "❄️", label: "中雪", transition: "雪幕轻垂" },
  "snow-heavy": { icon: "❄️", label: "大雪", transition: "大雪纷飞" },
  windy: { icon: "💨", label: "大风", transition: "风过留痕" },
  thunder: { icon: "⛈️", label: "雷电", transition: "电光一闪" },
};

/** WMO weather code → type (optionally wind-boosted) */
function codeToWeather(code, windKmh = 0) {
  if (code === 0 || code === 1) {
    return windKmh >= 35 ? "windy" : "sunny";
  }
  if (code === 2 || code === 3 || (code >= 45 && code <= 48)) {
    return windKmh >= 40 ? "windy" : "cloudy";
  }
  // Drizzle / slight rain / slight showers
  if (
    (code >= 51 && code <= 55) ||
    code === 56 ||
    code === 57 ||
    code === 61 ||
    code === 80
  ) {
    return "rain-light";
  }
  // Moderate rain / showers
  if (code === 63 || code === 66 || code === 81) {
    return "rain-medium";
  }
  // Heavy rain / violent showers
  if (code === 65 || code === 67 || code === 82) {
    return "rain-heavy";
  }
  // Snow — light / moderate / heavy
  if (code === 71 || code === 77 || code === 85) return "snow-light";
  if (code === 73) return "snow-medium";
  if (code === 75 || code === 86) return "snow-heavy";
  if (code >= 71 && code <= 77) return "snow-medium";
  // Thunderstorm
  if (code >= 95 && code <= 99) {
    return "thunder";
  }
  // Generic rain band leftover
  if (code >= 51 && code <= 67) return "rain-medium";
  if (code >= 80 && code <= 82) return "rain-medium";

  if (windKmh >= 45) return "windy";
  return "cloudy";
}

function isRainType(t) {
  return (
    t === "rain-light" ||
    t === "rain-medium" ||
    t === "rain-heavy" ||
    t === "thunder"
  );
}

function isSnowType(t) {
  return t === "snow-light" || t === "snow-medium" || t === "snow-heavy";
}

/**
 * Fixed observation point — no browser geolocation.
 * 中国江苏南京江宁区（大致中心）
 */
export const WEATHER_LOCATION = {
  name: "南京·江宁",
  label: "江苏南京江宁区",
  latitude: 31.9526,
  longitude: 118.8399,
  timezone: "Asia/Shanghai",
};

async function fetchWeather() {
  try {
    const { latitude, longitude, timezone } = WEATHER_LOCATION;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=weather_code,temperature_2m,wind_speed_10m` +
      `&timezone=${encodeURIComponent(timezone)}&wind_speed_unit=kmh`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("weather api fail");
    const data = await res.json();
    const code = data?.current?.weather_code ?? 2;
    const temp = data?.current?.temperature_2m;
    const wind = data?.current?.wind_speed_10m ?? 0;
    return {
      type: codeToWeather(code, wind),
      temp,
      wind,
      source: "live",
      code,
      location: WEATHER_LOCATION.name,
    };
  } catch {
    // Network fail: mild seasonal guess for Nanjing, still usable offline
    const m = new Date().getMonth();
    const h = new Date().getHours();
    let type = "sunny";
    if (m === 11 || m === 0 || m === 1) {
      if (h > 14 && h < 16) type = "snow-light";
      else if (h >= 16 && h < 18) type = "snow-medium";
      else type = "cloudy";
    }
    else if (m >= 5 && m <= 7) {
      if (h >= 14 && h <= 16) type = "rain-medium";
      else if (h >= 17 && h <= 18) type = "thunder";
      else type = "sunny";
    } else if (m >= 2 && m <= 4 && h >= 6 && h <= 10) type = "rain-light";
    else if (h >= 16 && h <= 20) type = "cloudy";
    else type = "sunny";
    return {
      type,
      temp: null,
      wind: null,
      source: "fallback",
      location: WEATHER_LOCATION.name,
    };
  }
}

/* ---------- Canvas particles ---------- */

/**
 * Rain intensity ladder — deliberately far apart so small / medium / heavy
 * read as three different atmospheres, not three densities of the same look.
 */
const RAIN_PRESETS = {
  "rain-light": {
    count: 70,
    len: [6, 12],
    speed: [3.5, 6.5],
    drift: [-0.9, -0.25],
    alpha: [0.35, 0.55],
    width: [0.7, 1.1],
    color: "200, 225, 255",
    sheet: null,
    splash: false,
    mist: 0.04,
  },
  "rain-medium": {
    count: 220,
    len: [14, 26],
    speed: [10, 17],
    drift: [-2.4, -0.9],
    alpha: [0.42, 0.7],
    width: [1.2, 2.0],
    color: "175, 210, 255",
    sheet: "rgba(18, 36, 62, 0.1)",
    splash: true,
    mist: 0.08,
  },
  "rain-heavy": {
    count: 480,
    len: [22, 42],
    speed: [18, 32],
    drift: [-4.5, -1.8],
    alpha: [0.5, 0.85],
    width: [1.6, 2.8],
    color: "160, 200, 255",
    sheet: "rgba(8, 18, 36, 0.22)",
    splash: true,
    mist: 0.14,
  },
  thunder: {
    count: 400,
    len: [20, 38],
    speed: [16, 30],
    drift: [-4, -1.4],
    alpha: [0.48, 0.8],
    width: [1.5, 2.6],
    color: "170, 200, 255",
    sheet: "rgba(6, 10, 28, 0.28)",
    splash: true,
    mist: 0.12,
  },
};

/**
 * Snow intensity ladder — soft fluffs, not hard discs / gamey stars.
 * Size is power-biased toward tiny flecks (real snowfall look).
 * form: "dust" tiny pin · "fluff" multi-lobe soft blob · "near" soft incomplete crystal.
 */
const SNOW_PRESETS = {
  "snow-light": {
    count: 100,
    sizeMin: 0.7,
    sizeMax: 3.4,
    sizePower: 2.6,
    speed: [0.28, 0.95],
    drift: [-0.28, 0.28],
    swingAmp: [0.4, 1.0],
    swingSpeed: [0.01, 0.024],
    alpha: [0.22, 0.55],
    fluffChance: 0.22,
    nearChance: 0.04,
    fogTop: 0.06,
    fogBot: 0,
    windBase: 0.05,
    windGust: 0.25,
  },
  "snow-medium": {
    count: 230,
    sizeMin: 0.9,
    sizeMax: 5.2,
    sizePower: 2.2,
    speed: [0.45, 1.75],
    drift: [-0.55, 0.4],
    swingAmp: [0.55, 1.35],
    swingSpeed: [0.012, 0.03],
    alpha: [0.3, 0.7],
    fluffChance: 0.32,
    nearChance: 0.1,
    fogTop: 0.12,
    fogBot: 0.035,
    windBase: -0.12,
    windGust: 0.45,
  },
  "snow-heavy": {
    count: 420,
    sizeMin: 1.0,
    sizeMax: 6.5,
    sizePower: 1.85,
    speed: [0.75, 2.9],
    drift: [-1.1, 0.35],
    swingAmp: [0.7, 1.8],
    swingSpeed: [0.014, 0.036],
    alpha: [0.34, 0.82],
    fluffChance: 0.4,
    nearChance: 0.14,
    fogTop: 0.18,
    fogBot: 0.09,
    windBase: -0.4,
    windGust: 0.85,
  },
};

class ParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.particles = [];
    this.splashes = [];
    this.leaves = [];
    this.type = "sunny";
    this.running = false;
    this.raf = 0;
    this.dpr = 1;
    this.time = 0;
    this.nextLightning = 0;
    this.lightningAlpha = 0;
    this.bolts = [];
    this.flashHold = 0;
    /** shared wind field for snow (gusts feel natural) */
    this.snowWind = 0;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  setType(type) {
    this.type = type;
    this.splashes = [];
    this.bolts = [];
    this.lightningAlpha = 0;
    this.flashHold = 0;
    this.nextLightning = performance.now() + 600 + Math.random() * 900;
    this.spawnAll();
  }

  spawnAll() {
    this.particles = [];
    this.leaves = [];
    const t = this.type;
    let n = 40;

    if (RAIN_PRESETS[t]) n = RAIN_PRESETS[t].count;
    else if (SNOW_PRESETS[t]) n = SNOW_PRESETS[t].count;
    else if (t === "cloudy") n = 7;
    else if (t === "windy") n = 90;
    else if (t === "sunny") n = 70;
    else n = 40;

    for (let i = 0; i < n; i++) {
      this.particles.push(this.makeParticle(true));
    }

    if (t === "windy") {
      for (let i = 0; i < 55; i++) this.leaves.push(this.makeLeaf(true));
    }
  }

  makeParticle(randomY = false) {
    const w = this.w || window.innerWidth;
    const h = this.h || window.innerHeight;
    const t = this.type;
    const rnd = (a, b) => a + Math.random() * (b - a);

    if (RAIN_PRESETS[t]) {
      const p = RAIN_PRESETS[t];
      return {
        kind: "rain",
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -20 - Math.random() * 100,
        len: rnd(...p.len),
        speed: rnd(...p.speed),
        drift: rnd(...p.drift),
        alpha: rnd(...p.alpha),
        width: rnd(...p.width),
      };
    }

    if (SNOW_PRESETS[t]) {
      const sp = SNOW_PRESETS[t];
      // Power-law size: many dust flecks, few large near flakes
      const u = Math.random();
      const size =
        sp.sizeMin +
        Math.pow(u, sp.sizePower) * (sp.sizeMax - sp.sizeMin);
      const depth = Math.min(
        1,
        (size - sp.sizeMin) / (sp.sizeMax - sp.sizeMin || 1)
      );
      // form selection — avoid geometric stars for distant flakes
      let form = "dust";
      if (size > 2.2 && Math.random() < sp.fluffChance) form = "fluff";
      if (size > 3.4 && Math.random() < sp.nearChance) form = "near";
      // irregular multi-lobe offsets for fluff / near
      const lobes =
        form === "dust"
          ? 0
          : 2 + Math.floor(Math.random() * (form === "near" ? 3 : 2));
      const lobeOffsets = [];
      for (let i = 0; i < lobes; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = size * (0.25 + Math.random() * 0.55);
        lobeOffsets.push({
          ox: Math.cos(ang) * dist,
          oy: Math.sin(ang) * dist * 0.7,
          r: size * (0.35 + Math.random() * 0.45),
        });
      }
      return {
        kind: "snow",
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -24 - Math.random() * 50,
        size,
        speed: rnd(...sp.speed) * (0.82 + depth * 0.4),
        drift: rnd(...sp.drift),
        swing: Math.random() * Math.PI * 2,
        swing2: Math.random() * Math.PI * 2,
        swingAmp: rnd(...sp.swingAmp) * (0.65 + depth * 0.55),
        swingSpeed: rnd(...sp.swingSpeed) * (0.85 + Math.random() * 0.3),
        alpha: rnd(...sp.alpha) * (0.7 + depth * 0.4),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (-0.008 + Math.random() * 0.016) * (form === "near" ? 1.2 : 0.5),
        form,
        depth,
        lobes: lobeOffsets,
        // cool-white variance — snow is never pure #fff
        tintR: 0.9 + Math.random() * 0.1,
        tintG: 0.92 + Math.random() * 0.08,
        tintB: 0.98 + Math.random() * 0.02,
        // slight ellipse stretch for depth of field
        aspect: 0.75 + Math.random() * 0.45,
      };
    }

    if (t === "cloudy") {
      return {
        kind: "cloud",
        x: Math.random() * (w + 280) - 120,
        // Stay high in the sky — avoid covering reading area
        y: 4 + Math.random() * h * 0.22,
        r: 36 + Math.random() * 56,
        speed: 0.12 + Math.random() * 0.28,
        // Very light veil clouds
        alpha: 0.018 + Math.random() * 0.032,
        blobs: 2 + Math.floor(Math.random() * 2),
      };
    }

    if (t === "windy") {
      return {
        kind: "streak",
        x: Math.random() * w,
        y: Math.random() * h,
        len: 40 + Math.random() * 100,
        speed: 14 + Math.random() * 28,
        alpha: 0.12 + Math.random() * 0.28,
        yJitter: -0.6 + Math.random() * 1.2,
        width: 1 + Math.random() * 1.8,
      };
    }

    // sunny motes
    return {
      kind: "mote",
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1.6 + Math.random() * 4,
      speed: 0.25 + Math.random() * 0.6,
      drift: -0.4 + Math.random() * 0.8,
      alpha: 0.28 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.014 + Math.random() * 0.022,
    };
  }

  makeLeaf(randomX = false) {
    const w = this.w || window.innerWidth;
    const h = this.h || window.innerHeight;
    return {
      x: randomX ? Math.random() * w : -30 - Math.random() * 50,
      y: Math.random() * h,
      size: 5 + Math.random() * 11,
      speed: 10 + Math.random() * 20,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: -0.2 + Math.random() * 0.4,
      driftY: -2 + Math.random() * 4,
      alpha: 0.4 + Math.random() * 0.5,
      hue: 20 + Math.random() * 45,
    };
  }

  frame(ts) {
    if (!this.running) return;
    this.time = ts || performance.now();
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    ctx.clearRect(0, 0, w, h);

    const t = this.type;
    if (RAIN_PRESETS[t]) this.drawRain(ctx, t);
    else if (SNOW_PRESETS[t]) this.drawSnow(ctx, t);
    else if (t === "cloudy") this.drawClouds(ctx);
    else if (t === "windy") this.drawWindy(ctx);
    else this.drawSunny(ctx);

    if (t === "thunder") this.drawLightning(ctx);

    this.raf = requestAnimationFrame(this.frame);
  }

  drawRain(ctx, type) {
    const preset = RAIN_PRESETS[type];
    ctx.lineCap = "round";

    // atmosphere sheet — stronger for heavy / thunder
    if (preset.sheet) {
      ctx.fillStyle = preset.sheet;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // ground mist band
    if (preset.mist > 0) {
      const mist = ctx.createLinearGradient(0, this.h * 0.7, 0, this.h);
      mist.addColorStop(0, "rgba(180, 210, 255, 0)");
      mist.addColorStop(1, `rgba(160, 200, 240, ${preset.mist})`);
      ctx.fillStyle = mist;
      ctx.fillRect(0, this.h * 0.7, this.w, this.h * 0.3);
    }

    const rgb = preset.color;

    for (const p of this.particles) {
      p.x += p.drift;
      p.y += p.speed;
      if (p.y > this.h + 12) {
        if (preset.splash && Math.random() > 0.35) {
          this.splashes.push({
            x: p.x,
            y: this.h - 2 - Math.random() * 10,
            life: 1,
            r: 2 + Math.random() * 5,
          });
        }
        Object.assign(p, this.makeParticle(false));
      }
      if (p.x < -40) p.x = this.w + 25;
      if (p.x > this.w + 40) p.x = -25;

      // bright core + soft outer stroke for visibility
      ctx.strokeStyle = `rgba(${rgb}, ${p.alpha * 0.45})`;
      ctx.lineWidth = p.width * 2.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.drift * 2.4, p.y + p.len);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${rgb}, ${p.alpha})`;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.drift * 2.4, p.y + p.len);
      ctx.stroke();
    }

    // ground splashes (medium / heavy / thunder)
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.life -= 0.045;
      s.r += 0.45;
      if (s.life <= 0) {
        this.splashes.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(200, 230, 255, ${s.life * 0.55})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 1.8, s.r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawSnow(ctx, type) {
    const preset = SNOW_PRESETS[type] || SNOW_PRESETS["snow-medium"];

    // shared gust field — slow sine, shared by all flakes
    const gust =
      Math.sin(this.time * 0.00035) * preset.windGust +
      Math.sin(this.time * 0.00011 + 1.7) * preset.windGust * 0.35;
    this.snowWind = preset.windBase + gust;

    // soft high veil — never a hard white sheet
    if (preset.fogTop > 0) {
      const fog = ctx.createLinearGradient(0, 0, 0, this.h * 0.42);
      fog.addColorStop(0, `rgba(235, 245, 255, ${preset.fogTop})`);
      fog.addColorStop(0.55, `rgba(220, 235, 255, ${preset.fogTop * 0.32})`);
      fog.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, this.w, this.h * 0.42);
    }

    // ground bloom for heavier snow
    if (preset.fogBot > 0) {
      const ground = ctx.createLinearGradient(0, this.h * 0.72, 0, this.h);
      ground.addColorStop(0, "rgba(230, 240, 255, 0)");
      ground.addColorStop(1, `rgba(245, 250, 255, ${preset.fogBot})`);
      ctx.fillStyle = ground;
      ctx.fillRect(0, this.h * 0.72, this.w, this.h * 0.28);
    }

    for (const p of this.particles) {
      p.swing += p.swingSpeed;
      p.swing2 += p.swingSpeed * 0.61;
      p.rot += p.rotSpeed;
      // natural flutter: dual-sine + shared wind
      const sway =
        Math.sin(p.swing) * p.swingAmp +
        Math.sin(p.swing2) * p.swingAmp * 0.32;
      const windInfluence = this.snowWind * (0.55 + p.depth * 0.55);
      p.x += p.drift + sway * 0.38 + windInfluence;
      p.y += p.speed * (0.9 + Math.sin(p.swing * 0.55) * 0.1);

      if (p.y > this.h + 20) Object.assign(p, this.makeParticle(false));
      if (p.x < -28) p.x = this.w + 16;
      if (p.x > this.w + 28) p.x = -16;

      if (p.form === "near") this.drawSnowflakeNear(ctx, p);
      else if (p.form === "fluff") this.drawSnowflakeFluff(ctx, p);
      else this.drawSnowflakeDust(ctx, p);
    }
  }

  /** Tiny distant fleck — soft pin of light, no hard edge */
  drawSnowflakeDust(ctx, p) {
    const r = p.size * (1.4 + p.depth * 0.5);
    const a = p.alpha * (0.85 + p.depth * 0.15);
    const rC = Math.round(230 + p.tintR * 25);
    const gC = Math.round(235 + p.tintG * 20);
    const bC = Math.round(245 + p.tintB * 10);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(${rC}, ${gC}, ${bC}, ${a})`);
    g.addColorStop(0.4, `rgba(${rC - 10}, ${gC - 5}, ${bC}, ${a * 0.35})`);
    g.addColorStop(1, `rgba(${rC - 20}, ${gC - 10}, 255, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * p.aspect, p.rot * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Mid-field cotton fluff — irregular multi-lobe soft blob */
  drawSnowflakeFluff(ctx, p) {
    const a = p.alpha;
    const rC = Math.round(235 + p.tintR * 20);
    const gC = Math.round(240 + p.tintG * 15);
    const bC = 255;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot * 0.4);

    // outer haze
    const outer = p.size * 2.2;
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, outer);
    haze.addColorStop(0, `rgba(${rC}, ${gC}, ${bC}, ${a * 0.28})`);
    haze.addColorStop(0.55, `rgba(${rC - 12}, ${gC - 6}, 250, ${a * 0.1})`);
    haze.addColorStop(1, "rgba(220, 230, 255, 0)");
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.ellipse(0, 0, outer, outer * p.aspect, 0, 0, Math.PI * 2);
    ctx.fill();

    // center kernel
    const core = p.size * 0.9;
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, core);
    cg.addColorStop(0, `rgba(255, 255, 255, ${a * 0.75})`);
    cg.addColorStop(0.5, `rgba(${rC}, ${gC}, ${bC}, ${a * 0.35})`);
    cg.addColorStop(1, "rgba(230, 240, 255, 0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(0, 0, core, core * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // irregular lobes (cotton clumps)
    for (const L of p.lobes || []) {
      const lg = ctx.createRadialGradient(L.ox, L.oy, 0, L.ox, L.oy, L.r * 1.8);
      lg.addColorStop(0, `rgba(255, 255, 255, ${a * 0.45})`);
      lg.addColorStop(0.45, `rgba(${rC - 5}, ${gC}, ${bC}, ${a * 0.2})`);
      lg.addColorStop(1, "rgba(220, 230, 255, 0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(L.ox, L.oy, L.r * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Near-field flake — soft incomplete crystal suggestion.
   * Arms are short, low-alpha, with heavy glow so they never look like clip-art ★.
   */
  drawSnowflakeNear(ctx, p) {
    const arm = p.size * 1.05;
    const a = p.alpha * 0.9;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";

    // soft body first (most of the visual weight)
    const body = ctx.createRadialGradient(0, 0, 0, 0, 0, arm * 1.6);
    body.addColorStop(0, `rgba(255, 255, 255, ${a * 0.55})`);
    body.addColorStop(0.4, `rgba(240, 248, 255, ${a * 0.22})`);
    body.addColorStop(1, "rgba(220, 235, 255, 0)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, arm * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 5–6 incomplete arms, slightly irregular lengths
    const arms = 5 + (Math.floor(p.size * 10) % 2);
    for (let i = 0; i < arms; i++) {
      const ang = (i * Math.PI * 2) / arms + (p.depth - 0.5) * 0.08;
      const len = arm * (0.72 + (i % 3) * 0.1);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);

      // glow arm
      ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.28})`;
      ctx.lineWidth = Math.max(1.2, p.size * 0.22);
      ctx.beginPath();
      ctx.moveTo(cos * arm * 0.08, sin * arm * 0.08);
      ctx.lineTo(cos * len, sin * len);
      ctx.stroke();

      // thin bright core
      ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.55})`;
      ctx.lineWidth = Math.max(0.4, p.size * 0.08);
      ctx.beginPath();
      ctx.moveTo(cos * arm * 0.1, sin * arm * 0.1);
      ctx.lineTo(cos * len * 0.92, sin * len * 0.92);
      ctx.stroke();

      // one soft side prong (not perfect hexagonal)
      if (i % 2 === 0) {
        const bx = cos * len * 0.55;
        const by = sin * len * 0.55;
        const px = -sin * len * 0.22;
        const py = cos * len * 0.22;
        ctx.strokeStyle = `rgba(230, 242, 255, ${a * 0.35})`;
        ctx.lineWidth = Math.max(0.35, p.size * 0.06);
        ctx.beginPath();
        ctx.moveTo(bx - px, by - py);
        ctx.lineTo(bx + px, by + py);
        ctx.stroke();
      }
    }

    // bright soft center
    const pin = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 0.45);
    pin.addColorStop(0, `rgba(255, 255, 255, ${a * 0.9})`);
    pin.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = pin;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // multi-lobe cotton around crystal for organic feel
    ctx.globalCompositeOperation = "source-over";
    for (const L of p.lobes || []) {
      const lg = ctx.createRadialGradient(L.ox * 0.6, L.oy * 0.6, 0, L.ox * 0.6, L.oy * 0.6, L.r * 1.4);
      lg.addColorStop(0, `rgba(255, 255, 255, ${a * 0.2})`);
      lg.addColorStop(1, "rgba(230, 240, 255, 0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(L.ox * 0.6, L.oy * 0.6, L.r * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawClouds(ctx) {
    // Barely-there overcast haze — never a dark curtain over content
    ctx.fillStyle = "rgba(55, 68, 90, 0.025)";
    ctx.fillRect(0, 0, this.w, this.h);

    for (const p of this.particles) {
      p.x += p.speed;
      if (p.x - p.r > this.w + 70) {
        p.x = -p.r * 2.4;
        p.y = 4 + Math.random() * this.h * 0.22;
      }
      for (let i = 0; i < p.blobs; i++) {
        const ox = (i - 0.9) * p.r * 0.55;
        const oy = Math.sin(i * 1.7 + p.r) * 6;
        const rr = p.r * (0.45 + (i % 3) * 0.18);
        const g = ctx.createRadialGradient(
          p.x + ox,
          p.y + oy,
          0,
          p.x + ox,
          p.y + oy,
          rr * 1.7
        );
        // Soft pearl mist — high transparency, readable text first
        g.addColorStop(0, `rgba(250, 252, 255, ${p.alpha * 0.95})`);
        g.addColorStop(0.5, `rgba(210, 220, 235, ${p.alpha * 0.4})`);
        g.addColorStop(1, "rgba(180, 195, 215, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x + ox, p.y + oy, rr * 1.55, rr * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawWindy(ctx) {
    // diagonal wind haze
    const haze = ctx.createLinearGradient(0, 0, this.w, this.h * 0.3);
    haze.addColorStop(0, "rgba(200, 215, 235, 0.06)");
    haze.addColorStop(0.5, "rgba(255, 255, 255, 0.03)");
    haze.addColorStop(1, "rgba(180, 200, 220, 0.07)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, this.w, this.h);

    for (const p of this.particles) {
      p.x += p.speed;
      p.y += p.yJitter;
      if (p.x > this.w + 50) {
        p.x = -50;
        p.y = Math.random() * this.h;
      }
      // soft outer
      ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha * 0.4})`;
      ctx.lineWidth = (p.width || 1.2) * 2.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.len, p.y - p.yJitter * 5);
      ctx.stroke();
      // core
      ctx.strokeStyle = `rgba(240, 248, 255, ${p.alpha})`;
      ctx.lineWidth = p.width || 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.len, p.y - p.yJitter * 5);
      ctx.stroke();
    }

    for (const leaf of this.leaves) {
      leaf.x += leaf.speed;
      leaf.y += leaf.driftY + Math.sin(this.time * 0.004 + leaf.rot) * 1.1;
      leaf.rot += leaf.rotSpeed;
      if (leaf.x > this.w + 35) Object.assign(leaf, this.makeLeaf(false));

      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.fillStyle = `hsla(${leaf.hue}, 60%, 40%, ${leaf.alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // stem hint
      ctx.strokeStyle = `hsla(${leaf.hue}, 40%, 28%, ${leaf.alpha * 0.7})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-leaf.size * 0.2, 0);
      ctx.lineTo(leaf.size * 0.85, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawSunny(ctx) {
    // soft god-rays — subtle, not glare
    const cx = this.w * 0.68;
    const cy = this.h * 0.16;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const ang = -0.95 + i * 0.3 + Math.sin(this.time * 0.00025 + i) * 0.025;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, this.h * 0.9, ang, ang + 0.07);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 225, 160, 0.028)";
      ctx.fill();
    }
    ctx.restore();

    for (const p of this.particles) {
      p.pulse += p.pulseSpeed;
      p.y -= p.speed * 0.4;
      p.x += p.drift * 0.3;
      if (p.y < -14) {
        p.y = this.h + 12;
        p.x = Math.random() * this.w;
      }
      const a = p.alpha * (0.55 + 0.45 * Math.sin(p.pulse));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(255, 236, 190, ${a})`);
      g.addColorStop(0.4, `rgba(255, 210, 140, ${a * 0.45})`);
      g.addColorStop(1, "rgba(255, 200, 100, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  makeBolt() {
    const startX = this.w * (0.12 + Math.random() * 0.76);
    const segs = [];
    let x = startX;
    let y = 0;
    const targetY = this.h * (0.4 + Math.random() * 0.45);
    while (y < targetY) {
      const nx = x + (-50 + Math.random() * 100);
      const ny = y + 16 + Math.random() * 40;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny });
      if (Math.random() > 0.65) {
        segs.push({
          x1: x,
          y1: y,
          x2: x + (-70 + Math.random() * 140),
          y2: y + 18 + Math.random() * 50,
          branch: true,
        });
      }
      x = nx;
      y = ny;
    }
    return { segs, life: 1, width: 2 + Math.random() * 2.5 };
  }

  drawLightning(ctx) {
    const now = this.time;

    // trigger flash
    if (now >= this.nextLightning && this.lightningAlpha <= 0 && this.flashHold <= 0) {
      this.lightningAlpha = 1;
      this.flashHold = Math.random() > 0.4 ? 2 : 1; // double-flash feel
      this.bolts = [this.makeBolt()];
      if (Math.random() > 0.45) this.bolts.push(this.makeBolt());
      this.nextLightning =
        now + (Math.random() > 0.3 ? 1400 + Math.random() * 2800 : 90 + Math.random() * 160);
    }

    if (this.lightningAlpha > 0 || this.flashHold > 0) {
      if (this.lightningAlpha > 0) {
        this.lightningAlpha -= 0.055;
      } else if (this.flashHold > 0) {
        // brief re-flash
        this.flashHold -= 1;
        this.lightningAlpha = 0.7;
        if (Math.random() > 0.5) this.bolts = [this.makeBolt()];
      }

      const a = Math.max(0, this.lightningAlpha);

      // full-sky flash
      ctx.fillStyle = `rgba(220, 235, 255, ${a * 0.42})`;
      ctx.fillRect(0, 0, this.w, this.h);
      // brighter near top
      const flashTop = ctx.createLinearGradient(0, 0, 0, this.h * 0.5);
      flashTop.addColorStop(0, `rgba(255, 255, 255, ${a * 0.25})`);
      flashTop.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = flashTop;
      ctx.fillRect(0, 0, this.w, this.h * 0.5);

      for (const bolt of this.bolts) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // outer glow
        ctx.strokeStyle = `rgba(160, 200, 255, ${a * 0.45})`;
        ctx.lineWidth = bolt.width * 8;
        ctx.beginPath();
        for (const s of bolt.segs) {
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
        }
        ctx.stroke();
        // mid glow
        ctx.strokeStyle = `rgba(200, 225, 255, ${a * 0.7})`;
        ctx.lineWidth = bolt.width * 3;
        ctx.beginPath();
        for (const s of bolt.segs) {
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
        }
        ctx.stroke();
        // white core
        ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
        ctx.lineWidth = bolt.width;
        ctx.beginPath();
        for (const s of bolt.segs) {
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
        }
        ctx.stroke();
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.spawnAll();
    window.addEventListener("resize", this.resize);
    this.frame();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }
}

export function createWeather() {
  const canvas = document.getElementById("weatherCanvas");
  const badge = document.getElementById("weatherBadge");
  const iconEl = document.getElementById("weatherIcon");
  const textEl = document.getElementById("weatherText");
  const engine = new ParticleEngine(canvas);

  let current = "sunny";
  let cycleIndex = 0;
  let manual = false;

  function clearWeatherClasses() {
    const toRemove = [];
    document.body.classList.forEach((c) => {
      if (c.startsWith("weather-")) toRemove.push(c);
    });
    document.body.classList.remove(...toRemove);
  }

  function applyWeather(type, { announce = true, extraLabel } = {}) {
    const prev = current;
    current = WEATHER_TYPES.includes(type) ? type : "sunny";
    clearWeatherClasses();
    document.body.classList.add(`weather-${current}`);
    if (isRainType(current)) document.body.classList.add("weather-is-rain");
    if (isSnowType(current)) document.body.classList.add("weather-is-snow");

    engine.setType(current);

    const meta = WEATHER_META[current];
    if (iconEl) {
      iconEl.textContent = meta.icon;
      iconEl.style.transition = "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)";
      iconEl.style.transform = "scale(1.28) rotate(-10deg)";
      requestAnimationFrame(() => {
        setTimeout(() => {
          iconEl.style.transform = "";
        }, 40);
      });
    }
    if (textEl) {
      textEl.textContent = extraLabel || meta.label;
    }

    if (announce && prev !== current) {
      const flash = document.createElement("div");
      flash.className = "weather-flash";
      flash.dataset.weather = current;
      document.body.appendChild(flash);
      flash.addEventListener("animationend", () => flash.remove());
    }

    return current;
  }

  async function init() {
    engine.start();
    const info = await fetchWeather();
    if (!manual) {
      applyWeather(info.type, { announce: false });
      if (textEl) {
        const base = WEATHER_META[info.type].label;
        const place = info.location || WEATHER_LOCATION.name;
        if (info.temp != null) {
          textEl.textContent = `${base} · ${Math.round(info.temp)}°C · ${place}`;
        } else if (info.source === "fallback") {
          textEl.textContent = `${base} · ${place}预估`;
        } else {
          textEl.textContent = `${base} · ${place}`;
        }
      }
    }
    cycleIndex = Math.max(0, WEATHER_TYPES.indexOf(current));
  }

  function cyclePreview() {
    manual = true;
    cycleIndex = (cycleIndex + 1) % WEATHER_TYPES.length;
    const t = WEATHER_TYPES[cycleIndex];
    applyWeather(t, { extraLabel: `${WEATHER_META[t].label} · 预览` });
  }

  if (badge) {
    badge.addEventListener("click", cyclePreview);
    badge.title =
      "点击切换天气预览：晴 / 阴 / 小雨 / 中雨 / 大雨 / 小雪 / 中雪 / 大雪 / 大风 / 雷电";
  }

  return {
    init,
    applyWeather,
    cyclePreview,
    getType: () => current,
    engine,
  };
}
