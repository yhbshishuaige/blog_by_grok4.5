const DISCOVERY_KEY = "weather-blog-secrets";
const STARDUST_KEY = "weather-blog-stardust";
const SECRET_NAMES = {
  aurora: "极光",
  meteors: "流星雨",
  fireflies: "山脚萤火",
  "blue-hour": "蓝调时刻",
  rainbow: "雨后彩虹",
  constellation: "星鲸座",
  "snow-fox": "雪狐",
  "moon-halo": "零点月晕",
  prism: "12:34 光棱",
  "sky-whale": "云上星鲸",
  "sun-halo": "太阳日晕",
  "paper-boat": "雨中纸船",
  dandelion: "阴天蒲公英",
  echo: "山谷回声",
};

function readDiscoveries() {
  try {
    const saved = JSON.parse(localStorage.getItem(DISCOVERY_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

export function createSecrets({ timeSky, weather, background }) {
  const logoMark = document.querySelector(".logo-mark");
  const moon = document.getElementById("moonOrb");
  const sun = document.getElementById("sunOrb");
  const stars = document.getElementById("stars");
  const clock = document.getElementById("clock");
  const meteorField = document.getElementById("meteorField");
  const fireflyField = document.getElementById("fireflyField");
  const rainbow = document.getElementById("rainbowSecret");
  const visitor = document.getElementById("ridgeVisitor");
  const weatherIcon = document.getElementById("weatherIcon");
  const backgroundButton = document.getElementById("backgroundBtn");
  const footerWhisper = document.getElementById("footerWhisper");
  const footer = document.querySelector(".site-footer");
  const groundSecrets = document.getElementById("groundSecrets");
  const mountainEcho = document.getElementById("mountainEcho");
  const seasonalField = document.getElementById("seasonalField");
  const toast = document.getElementById("secretToast");
  const discoveries = readDiscoveries();
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const lowPower = reducedMotion || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const timers = new Set();
  let logoClicks = [];
  let toastTimer = 0;
  let disposed = false;
  let visitorClicks = 0;
  let visitorHoldTimer = 0;
  let visitorHoldTriggered = false;
  let midnightLatched = false;
  let prismLatched = false;
  let keyBuffer = "";
  let discoveryHoldTimer = 0;
  let discoveryHoldTriggered = false;
  let suppressBackgroundClick = false;
  let whisperShownFor = "";
  let pointerRaf = 0;
  let lastSkyState = null;
  let idleTimer = 0;
  let tourTimers = [];

  function later(fn, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (!disposed) fn();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function remember(id) {
    if (discoveries.has(id)) return false;
    discoveries.add(id);
    try {
      localStorage.setItem(DISCOVERY_KEY, JSON.stringify([...discoveries]));
    } catch {
      /* storage unavailable */
    }
    syncDiscoveryIndicator();
    if (discoveries.size >= Object.keys(SECRET_NAMES).length) unlockStardust();
    return true;
  }

  function syncDiscoveryIndicator() {
    const total = Object.keys(SECRET_NAMES).length;
    backgroundButton?.classList.toggle("has-discoveries", discoveries.size > 0);
    backgroundButton?.classList.toggle("is-complete", discoveries.size >= total);
  }

  function setStardust(enabled) {
    document.body.classList.toggle("secret-stardust", enabled);
    try {
      localStorage.setItem(STARDUST_KEY, enabled ? "on" : "off");
    } catch {
      /* storage unavailable */
    }
  }

  function unlockStardust() {
    setStardust(true);
    later(() => announce("全部隐藏景色已发现 · 星尘模式已解锁"), 700);
  }

  function announce(message, id) {
    const first = id ? remember(id) : false;
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = first ? `${message} · 已发现 ${discoveries.size}/${Object.keys(SECRET_NAMES).length}` : message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function clearMeteors() {
    meteorField?.replaceChildren();
    document.body.classList.remove("secret-meteors");
  }

  function clearHeavyScenes(except = "") {
    if (except !== "meteors") clearMeteors();
    if (except !== "aurora") document.body.classList.remove("secret-aurora");
    if (except !== "sky-whale") document.body.classList.remove("secret-sky-whale");
  }

  function triggerMeteors({ announceDiscovery = true, force = false } = {}) {
    if (!meteorField || document.body.classList.contains("secret-meteors")) return;
    const hour = timeSky.getHour();
    if (!force && hour >= 5.2 && hour < 19.2) {
      announce("流星还在日光背后休息");
      return;
    }
    clearHeavyScenes("meteors");
    clearMeteors();
    const meteorCount = lowPower ? 7 : 13;
    for (let i = 0; i < meteorCount; i++) {
      const meteor = document.createElement("i");
      meteor.style.setProperty("--meteor-x", `${10 + Math.random() * 82}%`);
      meteor.style.setProperty("--meteor-y", `${-8 + Math.random() * 34}%`);
      meteor.style.setProperty("--meteor-delay", `${Math.random() * 2.2}s`);
      meteor.style.setProperty("--meteor-duration", `${0.75 + Math.random() * 0.65}s`);
      meteor.style.setProperty("--meteor-size", `${70 + Math.random() * 120}px`);
      meteorField.appendChild(meteor);
    }
    document.body.classList.add("secret-meteors");
    if (announceDiscovery) announce("月亮听见了愿望，流星正在经过", "meteors");
    later(clearMeteors, 5200);
  }

  function triggerSunHalo(event, { force = false } = {}) {
    event.preventDefault();
    event.stopPropagation();
    if (document.body.classList.contains("secret-sun-halo")) return;
    const hour = timeSky.getHour();
    if (!force && (hour >= 19.2 || hour < 5.2)) {
      announce("太阳已经越过山的另一边");
      return;
    }
    document.body.classList.add("secret-sun-halo");
    announce("太阳把一小圈暖光留在了指尖", "sun-halo");
    later(() => document.body.classList.remove("secret-sun-halo"), 6200);
  }

  function triggerAurora() {
    if (document.body.classList.contains("secret-aurora")) return;
    if (["thunder", "rain-heavy"].includes(weather.getType())) {
      announce("云层太厚，极光今晚暂时没有回应");
      return;
    }
    clearHeavyScenes("aurora");
    document.body.classList.add("secret-aurora");
    announce("天空被轻轻拨亮，极光苏醒了", "aurora");
    later(() => document.body.classList.remove("secret-aurora"), 11000);
  }

  function triggerFireflies() {
    if (!fireflyField || document.body.classList.contains("secret-fireflies")) return;
    fireflyField.replaceChildren();
    const fireflyCount = lowPower ? 12 : 26;
    for (let i = 0; i < fireflyCount; i++) {
      const firefly = document.createElement("i");
      firefly.style.setProperty("--fly-x", `${4 + Math.random() * 92}%`);
      firefly.style.setProperty("--fly-y", `${55 + Math.random() * 39}%`);
      firefly.style.setProperty("--fly-delay", `${Math.random() * 4}s`);
      firefly.style.setProperty("--fly-duration", `${3.6 + Math.random() * 4.5}s`);
      fireflyField.appendChild(firefly);
    }
    document.body.classList.add("secret-fireflies");
    announce("风停了一会儿，萤火虫从山脚醒来", "fireflies");
    later(() => {
      document.body.classList.remove("secret-fireflies");
      fireflyField.replaceChildren();
    }, 12000);
  }

  function triggerBlueHour() {
    if (document.body.classList.contains("secret-blue-hour")) return;
    document.body.classList.add("secret-blue-hour");
    announce("你找到了山谷的蓝调时刻", "blue-hour");
    later(() => document.body.classList.remove("secret-blue-hour"), 9000);
  }

  function triggerRainbow() {
    if (!rainbow || document.body.classList.contains("secret-rainbow")) return;
    document.body.classList.add("secret-rainbow");
    announce("风雨走远，天空把颜色还给了你", "rainbow");
    later(() => document.body.classList.remove("secret-rainbow"), 9000);
  }

  function triggerConstellation(options = {}) {
    const force = options?.force === true;
    const hour = timeSky.getHour();
    if (!force && hour >= 5.2 && hour < 19.2) {
      announce("星座藏在真正的夜里");
      return;
    }
    if (document.body.classList.contains("secret-constellation")) return;
    document.body.classList.add("secret-constellation");
    announce("群星连成了一只等待远行的鲸", "constellation");
    later(() => document.body.classList.remove("secret-constellation"), 10000);
  }

  function wakeVisitor() {
    if (!visitor || background.getMode() !== "mountain") return;
    if (!weather.getType().startsWith("snow")) {
      announce("山脊上的小家伙只喜欢下雪天");
      return;
    }
    visitorClicks += 1;
    weatherIcon?.classList.remove("secret-icon-blink");
    void weatherIcon?.offsetWidth;
    weatherIcon?.classList.add("secret-icon-blink");
    later(() => weatherIcon?.classList.remove("secret-icon-blink"), 900);
    visitor.classList.add("is-awake");
    document.body.classList.add("secret-ridge-visitor");
    if (visitorClicks >= 3) {
      visitorClicks = 0;
      visitor.classList.add("is-delighted");
      announce("雪狐记住了你的脚步声", "snow-fox");
      later(() => visitor.classList.remove("is-delighted"), 1800);
    }
    later(() => {
      visitor.classList.remove("is-awake");
      document.body.classList.remove("secret-ridge-visitor");
    }, 4800);
  }

  function handleLogoClick(event) {
    const now = performance.now();
    logoClicks = logoClicks.filter((time) => now - time < 1700);
    logoClicks.push(now);
    if (logoClicks.length >= 5) {
      event.preventDefault();
      logoClicks = [];
      triggerAurora();
    }
  }

  function triggerSkyWhale() {
    if (document.body.classList.contains("secret-sky-whale")) return;
    if (["thunder", "rain-heavy"].includes(weather.getType())) {
      announce("星鲸绕开了正在打雷的云层");
      return;
    }
    clearHeavyScenes("sky-whale");
    document.body.classList.add("secret-sky-whale");
    announce("有一只鲸，正在云层之上迁徙", "sky-whale");
    later(() => document.body.classList.remove("secret-sky-whale"), 13000);
  }

  function handleSecretKeys(event) {
    if (event.metaKey || event.ctrlKey || event.altKey || event.target?.matches?.("input, textarea, [contenteditable]")) return;
    if (event.key.length !== 1) return;
    keyBuffer = `${keyBuffer}${event.key.toLowerCase()}`.slice(-8);
    if (keyBuffer.endsWith("sky")) {
      keyBuffer = "";
      triggerSkyWhale();
    }
  }

  function handleBackgroundChange(event) {
    const mode = event.detail?.mode;
    document.body.classList.remove("secret-sky-breeze", "secret-mountain-homecoming");
    void document.body.offsetWidth;
    const className = mode === "sky" ? "secret-sky-breeze" : "secret-mountain-homecoming";
    document.body.classList.add(className);
    later(() => document.body.classList.remove(className), 2400);
    if (lastSkyState) syncAmbient(lastSkyState);
  }

  function updateWhisper() {
    if (!footerWhisper) return;
    const nearEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 110;
    if (!nearEnd) return;
    const hour = timeSky.getHour();
    const type = weather.getType();
    let key = "";
    let lines = [];
    if (type.startsWith("snow")) {
      key = "snow";
      lines = ["雪把远方的声音，放得很轻。", "每一片雪，都像天空迟到的信。", "山路没有消失，只是暂时被雪收藏。"];
    } else if (type.startsWith("rain") || type === "thunder") {
      key = "rain";
      lines = ["雨替世界按下了慢放。", "窗外有雨，字里也有一点潮湿。", "读到这里，雨声刚好成为句号。"];
    } else if (hour >= 19 || hour < 5) {
      key = "night";
      lines = ["夜色很长，故事不必急着结束。", "星星没有说话，但它们一直都在。", "读完这一页，山谷还亮着几盏灯。"];
    } else if (type === "windy") {
      key = "wind";
      lines = ["风翻过这一页，又去了更远的地方。", "有些句子，适合交给风继续写。"];
    }
    if (!key || whisperShownFor === key) return;
    whisperShownFor = key;
    footerWhisper.textContent = lines[Math.floor(Math.random() * lines.length)];
    footerWhisper.classList.add("is-visible");
  }

  function triggerGroundSecret(forceType = "") {
    if (!groundSecrets || groundSecrets.childElementCount) return;
    const type = forceType || weather.getType();
    const item = document.createElement("i");
    if (type.startsWith("rain") || type === "thunder") {
      item.className = "paper-boat-secret";
      groundSecrets.appendChild(item);
      announce("一只纸船顺着雨水出发了", "paper-boat");
      later(() => item.remove(), 9200);
    } else if (type === "cloudy") {
      item.className = "dandelion-secret";
      item.innerHTML = "<span></span><b></b><b></b><b></b><b></b><b></b>";
      groundSecrets.appendChild(item);
      announce("清风捎来一颗远方的种子", "dandelion");
      later(() => item.remove(), 10500);
    }
  }

  function triggerMountainEcho() {
    if (background.getMode() !== "mountain" || weather.getType() === "windy") return;
    if (document.body.classList.contains("secret-mountain-echo")) return;
    document.body.classList.add("secret-mountain-echo");
    announce("山谷把你的声音，轻轻送了回来", "echo");
    later(() => document.body.classList.remove("secret-mountain-echo"), 4200);
  }

  function triggerSeasonalMoment() {
    if (!seasonalField || reducedMotion || !["sunny", "cloudy"].includes(weather.getType())) return;
    const month = new Date().getMonth() + 1;
    let season = "winter";
    if (month >= 3 && month <= 5) season = "spring";
    else if (month >= 6 && month <= 8) season = "summer";
    else if (month >= 9 && month <= 11) season = "autumn";
    seasonalField.replaceChildren();
    seasonalField.dataset.season = season;
    const count = lowPower ? 7 : 13;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("i");
      piece.style.setProperty("--season-x", `${Math.random() * 100}%`);
      piece.style.setProperty("--season-delay", `${Math.random() * 3.8}s`);
      piece.style.setProperty("--season-duration", `${5.5 + Math.random() * 4}s`);
      seasonalField.appendChild(piece);
    }
    document.body.classList.add("secret-seasonal");
    later(() => {
      document.body.classList.remove("secret-seasonal");
      seasonalField.replaceChildren();
    }, 10500);
  }

  function handlePointerMove(event) {
    if (reducedMotion || event.pointerType === "touch") return;
    if (pointerRaf) return;
    pointerRaf = requestAnimationFrame(() => {
      pointerRaf = 0;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty("--stars-shift-x", `${(-x * 3).toFixed(2)}px`);
      rootStyle.setProperty("--stars-shift-y", `${(-y * 2).toFixed(2)}px`);
      rootStyle.setProperty("--mountain-shift-x", `${(-x * 5).toFixed(2)}px`);
      rootStyle.setProperty("--mountain-shift-y", `${(-y * 2).toFixed(2)}px`);
    });
  }

  function triggerMoonHalo() {
    if (document.body.classList.contains("secret-moon-halo")) return;
    document.body.classList.add("secret-moon-halo");
    announce("零点，月光在天空写下一个圆", "moon-halo");
    later(() => document.body.classList.remove("secret-moon-halo"), 8500);
  }

  function triggerPrism() {
    if (document.body.classList.contains("secret-prism")) return;
    document.body.classList.add("secret-prism");
    announce("12:34，光线刚好排成了顺序", "prism");
    later(() => document.body.classList.remove("secret-prism"), 6500);
  }

  function preview(name) {
    const previews = {
      aurora: triggerAurora,
      meteors: () => triggerMeteors({ force: true }),
      fireflies: triggerFireflies,
      "blue-hour": triggerBlueHour,
      rainbow: triggerRainbow,
      constellation: () => triggerConstellation({ force: true }),
      whale: triggerSkyWhale,
      "sky-whale": triggerSkyWhale,
      "sun-halo": () => triggerSunHalo(new Event("preview"), { force: true }),
      "moon-halo": triggerMoonHalo,
      prism: triggerPrism,
      fox: wakeVisitor,
      "snow-fox": wakeVisitor,
      echo: triggerMountainEcho,
      "paper-boat": () => triggerGroundSecret("rain-light"),
      dandelion: () => triggerGroundSecret("cloudy"),
    };
    previews[name]?.();
    return Boolean(previews[name]);
  }

  function resetDiscoveries() {
    discoveries.clear();
    setStardust(false);
    try {
      localStorage.removeItem(DISCOVERY_KEY);
      localStorage.removeItem(STARDUST_KEY);
    } catch {
      /* storage unavailable */
    }
    syncDiscoveryIndicator();
    announce("彩蛋发现记录已重置");
  }

  function stopTour() {
    tourTimers.forEach(clearTimeout);
    tourTimers = [];
    clearHeavyScenes();
    document.body.classList.remove("secret-rainbow", "secret-constellation", "secret-fireflies");
  }

  function tour() {
    stopTour();
    const steps = [
      [0, triggerAurora],
      [6500, () => triggerMeteors({ announceDiscovery: false, force: true })],
      [12000, triggerSkyWhale],
      [19000, triggerRainbow],
      [25500, () => triggerConstellation({ force: true })],
    ];
    steps.forEach(([delay, fn]) => {
      tourTimers.push(window.setTimeout(() => {
        if (!disposed) fn();
      }, delay));
    });
    announce("隐藏景色巡演开始");
  }

  function handleMoonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    triggerMeteors();
  }

  function handleActivation(event, callback) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    callback(event);
  }

  const handleMoonKey = (event) => handleActivation(event, handleMoonClick);
  const handleSunKey = (event) => handleActivation(event, triggerSunHalo);
  const handleStarsKey = (event) => handleActivation(event, triggerConstellation);

  function handleClockClick() {
    const hour = timeSky.getHour();
    if (hour >= 18.5 && hour <= 20.5) triggerFireflies();
    else if (hour >= 4.8 && hour <= 6.3) triggerBlueHour();
    else announce("有些景色，只在黎明或入夜后出现");
  }

  function handleWeatherIconPointerDown(event) {
    if (!weather.getType().startsWith("snow")) return;
    visitorHoldTriggered = false;
    clearTimeout(visitorHoldTimer);
    visitorHoldTimer = window.setTimeout(() => {
      visitorHoldTriggered = true;
      wakeVisitor();
    }, 520);
  }

  function handleWeatherIconPointerEnd(event) {
    clearTimeout(visitorHoldTimer);
    if (visitorHoldTriggered) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleWeatherIconClick(event) {
    if (!visitorHoldTriggered) return;
    event.preventDefault();
    event.stopPropagation();
    visitorHoldTriggered = false;
  }

  function showDiscoveryBook(event) {
    event.preventDefault();
    const found = [...discoveries].map((id) => SECRET_NAMES[id]).filter(Boolean);
    if (!found.length) announce("还没有发现隐藏景色。试着留意月亮、时间和天气");
    else if (found.length >= Object.keys(SECRET_NAMES).length) {
      const enabled = !document.body.classList.contains("secret-stardust");
      setStardust(enabled);
      announce(`全部景色已发现 · 星尘模式${enabled ? "开启" : "关闭"}`);
    } else announce(`已发现：${found.join("、")}（${found.length}/${Object.keys(SECRET_NAMES).length}）`);
  }

  function startDiscoveryHold() {
    discoveryHoldTriggered = false;
    clearTimeout(discoveryHoldTimer);
    discoveryHoldTimer = window.setTimeout(() => {
      discoveryHoldTriggered = true;
      suppressBackgroundClick = true;
      showDiscoveryBook(new Event("longpress"));
    }, 720);
  }

  function endDiscoveryHold(event) {
    clearTimeout(discoveryHoldTimer);
    if (discoveryHoldTriggered) {
      event.preventDefault();
      event.stopPropagation();
      discoveryHoldTriggered = false;
    }
  }

  function swallowDiscoveryClick(event) {
    if (!suppressBackgroundClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressBackgroundClick = false;
  }

  function handleWeatherChange(event) {
    const { previous, current, manual } = event.detail || {};
    if (!manual) return;
    const rainEnded = previous?.startsWith("rain") || previous === "thunder";
    const windEnded = previous === "windy";
    if ((rainEnded || windEnded) && current === "sunny") later(triggerRainbow, 520);
    if (current === "thunder") {
      footer?.classList.remove("secret-thunder-rumble");
      void footer?.offsetWidth;
      footer?.classList.add("secret-thunder-rumble");
      later(() => footer?.classList.remove("secret-thunder-rumble"), 900);
    }
    if (lastSkyState) syncAmbient(lastSkyState);
  }

  function syncAmbient(state) {
    lastSkyState = state;
    const calm = ["sunny", "cloudy"].includes(weather.getType());
    const mountain = background.getMode() === "mountain";
    const lightsVisible = mountain && calm && (state.hour >= 19.4 || state.hour < 4.8);
    document.body.classList.toggle("secret-distant-lights", lightsVisible);
    const skyNight = !mountain && calm && (state.hour >= 20.2 || state.hour < 4.4);
    document.body.classList.toggle("secret-milky-way", skyNight);
    const homewardBirds = !mountain && calm && state.hour >= 17.5 && state.hour <= 19;
    document.body.classList.toggle("secret-homeward-birds", homewardBirds);
  }

  function handleVisibilityChange() {
    document.body.classList.toggle("secrets-paused", document.hidden);
  }

  function scheduleIdleBreath() {
    clearTimeout(idleTimer);
    document.body.classList.remove("secret-idle-breath");
    if (reducedMotion || document.hidden) return;
    idleTimer = window.setTimeout(() => {
      if (!["sunny", "cloudy"].includes(weather.getType())) return scheduleIdleBreath();
      if (document.body.classList.contains("secret-aurora") || document.body.classList.contains("secret-sky-whale")) return scheduleIdleBreath();
      document.body.classList.add("secret-idle-breath");
      later(() => {
        document.body.classList.remove("secret-idle-breath");
        scheduleIdleBreath();
      }, 7600);
    }, 45000);
  }

  logoMark?.addEventListener("click", handleLogoClick);
  moon?.addEventListener("click", handleMoonClick);
  moon?.addEventListener("keydown", handleMoonKey);
  sun?.addEventListener("click", triggerSunHalo);
  sun?.addEventListener("keydown", handleSunKey);
  clock?.addEventListener("click", handleClockClick);
  stars?.addEventListener("click", triggerConstellation);
  stars?.addEventListener("keydown", handleStarsKey);
  visitor?.addEventListener("click", wakeVisitor);
  weatherIcon?.addEventListener("pointerdown", handleWeatherIconPointerDown);
  weatherIcon?.addEventListener("pointerup", handleWeatherIconPointerEnd);
  weatherIcon?.addEventListener("pointercancel", handleWeatherIconPointerEnd);
  weatherIcon?.addEventListener("click", handleWeatherIconClick);
  backgroundButton?.addEventListener("contextmenu", showDiscoveryBook);
  backgroundButton?.addEventListener("pointerdown", startDiscoveryHold);
  backgroundButton?.addEventListener("pointerup", endDiscoveryHold);
  backgroundButton?.addEventListener("pointercancel", endDiscoveryHold);
  backgroundButton?.addEventListener("click", swallowDiscoveryClick, true);
  document.addEventListener("keydown", handleSecretKeys);
  window.addEventListener("backgroundchange", handleBackgroundChange);
  window.addEventListener("scroll", updateWhisper, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  footer?.addEventListener("click", triggerGroundSecret);
  mountainEcho?.addEventListener("click", triggerMountainEcho);
  window.addEventListener("weatherchange", handleWeatherChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  for (const eventName of ["pointerdown", "keydown", "scroll"]) {
    window.addEventListener(eventName, scheduleIdleBreath, { passive: true });
  }
  moon?.classList.add("is-secret-interactive");
  sun?.classList.add("is-secret-interactive");
  clock?.classList.add("is-secret-interactive");
  stars?.classList.add("is-secret-interactive");
  for (const [element, label] of [[moon, "月亮"], [sun, "太阳"], [stars, "星空"]]) {
    element?.setAttribute("role", "button");
    element?.setAttribute("aria-label", label);
    element?.setAttribute("tabindex", "0");
  }
  syncDiscoveryIndicator();

  try {
    const completed = discoveries.size >= Object.keys(SECRET_NAMES).length;
    const savedStardust = localStorage.getItem(STARDUST_KEY);
    if (completed && savedStardust !== "off") setStardust(true);
  } catch {
    /* storage unavailable */
  }

  later(triggerSeasonalMoment, 18000 + Math.random() * 7000);
  scheduleIdleBreath();

  const unsubscribe = timeSky.onChange((state) => {
    syncAmbient(state);
    const night = state.hour >= 19.2 || state.hour < 5.2;
    stars?.setAttribute("tabindex", night ? "0" : "-1");
    moon?.setAttribute("tabindex", night ? "0" : "-1");
    sun?.setAttribute("tabindex", night ? "-1" : "0");

    const minute = Math.round((state.hour - Math.floor(state.hour)) * 60) % 60;
    const hour = Math.floor(state.hour) % 24;
    const midnight = state.overridden && hour === 0 && minute <= 1;
    const prism = state.overridden && hour === 12 && Math.abs(minute - 34) <= 1;
    if (midnight && !midnightLatched) triggerMoonHalo();
    if (prism && !prismLatched) triggerPrism();
    midnightLatched = midnight;
    prismLatched = prism;
  });

  return {
    triggerAurora,
    triggerMeteors,
    triggerFireflies,
    triggerRainbow,
    triggerConstellation,
    triggerSkyWhale,
    triggerMountainEcho,
    preview,
    list: () => ["aurora", "meteors", "fireflies", "blue-hour", "rainbow", "constellation", "sky-whale", "sun-halo", "moon-halo", "prism", "snow-fox", "echo", "paper-boat", "dandelion"],
    resetDiscoveries,
    tour,
    stopTour,
    getDiscoveries: () => [...discoveries],
    destroy() {
      disposed = true;
      timers.forEach(clearTimeout);
      timers.clear();
      clearTimeout(toastTimer);
      unsubscribe?.();
      logoMark?.removeEventListener("click", handleLogoClick);
      moon?.removeEventListener("click", handleMoonClick);
      moon?.removeEventListener("keydown", handleMoonKey);
      sun?.removeEventListener("click", triggerSunHalo);
      sun?.removeEventListener("keydown", handleSunKey);
      clock?.removeEventListener("click", handleClockClick);
      stars?.removeEventListener("click", triggerConstellation);
      stars?.removeEventListener("keydown", handleStarsKey);
      visitor?.removeEventListener("click", wakeVisitor);
      clearTimeout(visitorHoldTimer);
      weatherIcon?.removeEventListener("pointerdown", handleWeatherIconPointerDown);
      weatherIcon?.removeEventListener("pointerup", handleWeatherIconPointerEnd);
      weatherIcon?.removeEventListener("pointercancel", handleWeatherIconPointerEnd);
      weatherIcon?.removeEventListener("click", handleWeatherIconClick);
      backgroundButton?.removeEventListener("contextmenu", showDiscoveryBook);
      clearTimeout(discoveryHoldTimer);
      backgroundButton?.removeEventListener("pointerdown", startDiscoveryHold);
      backgroundButton?.removeEventListener("pointerup", endDiscoveryHold);
      backgroundButton?.removeEventListener("pointercancel", endDiscoveryHold);
      backgroundButton?.removeEventListener("click", swallowDiscoveryClick, true);
      document.removeEventListener("keydown", handleSecretKeys);
      window.removeEventListener("backgroundchange", handleBackgroundChange);
      window.removeEventListener("scroll", updateWhisper);
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(pointerRaf);
      footer?.removeEventListener("click", triggerGroundSecret);
      mountainEcho?.removeEventListener("click", triggerMountainEcho);
      document.documentElement.style.removeProperty("--stars-shift-x");
      document.documentElement.style.removeProperty("--stars-shift-y");
      document.documentElement.style.removeProperty("--mountain-shift-x");
      document.documentElement.style.removeProperty("--mountain-shift-y");
      window.removeEventListener("weatherchange", handleWeatherChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(idleTimer);
      stopTour();
      for (const eventName of ["pointerdown", "keydown", "scroll"]) {
        window.removeEventListener(eventName, scheduleIdleBreath);
      }
    },
  };
}
