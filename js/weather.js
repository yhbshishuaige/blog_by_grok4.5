/**
 * Weather system: Open-Meteo + canvas particles
 * Types: sunny | cloudy | rain-light | rain-medium | rain-heavy | snowy | windy | thunder
 */

export const WEATHER_TYPES = [
  "sunny",
  "cloudy",
  "rain-light",
  "rain-medium",
  "rain-heavy",
  "snowy",
  "windy",
  "thunder",
];

export const WEATHER_META = {
  sunny: { icon: "☀️", label: "晴天", transition: "光影流转" },
  cloudy: { icon: "☁️", label: "阴天", transition: "云层漫过" },
  "rain-light": { icon: "🌦️", label: "小雨", transition: "细雨轻落" },
  "rain-medium": { icon: "🌧️", label: "中雨", transition: "雨幕低垂" },
  "rain-heavy": { icon: "🌧️", label: "大雨", transition: "骤雨倾泻" },
  snowy: { icon: "❄️", label: "雪天", transition: "雪落无声" },
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
  // Snow
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return "snowy";
  }
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
    if (m === 11 || m === 0 || m === 1) type = h > 14 && h < 18 ? "snowy" : "cloudy";
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
    else if (t === "snowy") n = 220;
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

    if (t === "snowy") {
      const size = 2.5 + Math.random() * 6.5;
      return {
        kind: "snow",
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -16,
        size,
        speed: 0.7 + Math.random() * 2.2,
        drift: -1.6 + Math.random() * 3.2,
        swing: Math.random() * Math.PI * 2,
        swingSpeed: 0.018 + Math.random() * 0.035,
        alpha: 0.55 + Math.random() * 0.45,
        soft: Math.random() > 0.45,
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
    else if (t === "snowy") this.drawSnow(ctx);
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

  drawSnow(ctx) {
    const fog = ctx.createLinearGradient(0, 0, 0, this.h * 0.45);
    fog.addColorStop(0, "rgba(255,255,255,0.18)");
    fog.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, this.w, this.h * 0.45);

    for (const p of this.particles) {
      p.swing += p.swingSpeed;
      p.x += p.drift + Math.sin(p.swing) * 1.1;
      p.y += p.speed;
      if (p.y > this.h + 14) Object.assign(p, this.makeParticle(false));
      if (p.x < -14) p.x = this.w + 10;
      if (p.x > this.w + 14) p.x = -10;

      if (p.soft) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.6);
        g.addColorStop(0, `rgba(255,255,255,${p.alpha})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        // tiny sparkle rim
        ctx.strokeStyle = `rgba(220, 235, 255, ${p.alpha * 0.5})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
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
      "点击切换天气预览：晴 / 阴 / 小雨 / 中雨 / 大雨 / 雪 / 大风 / 雷电";
  }

  return {
    init,
    applyWeather,
    cyclePreview,
    getType: () => current,
    engine,
  };
}
