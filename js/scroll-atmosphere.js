const CURRENT_COUNT = 6;
const PARTICLE_COUNT = 14;

function weatherFamily(type) {
  if (type === "windy") return "wind";
  if (type === "thunder" || String(type).startsWith("rain")) return "rain";
  if (String(type).startsWith("snow")) return "snow";
  if (type === "cloudy") return "cloud";
  return "sun";
}

function makeAtmosphereLayer() {
  const layer = document.createElement("div");
  layer.className = "scroll-atmosphere";
  layer.setAttribute("aria-hidden", "true");
  layer.dataset.direction = "down";
  layer.dataset.weather = "sun";

  const currents = document.createElement("div");
  currents.className = "scroll-currents";
  for (let index = 0; index < CURRENT_COUNT; index += 1) {
    const current = document.createElement("i");
    current.style.setProperty("--current-y", `${10 + index * 15}%`);
    current.style.setProperty("--current-delay", `${(-index * 0.17).toFixed(2)}s`);
    current.style.setProperty("--current-duration", `${(0.78 + index * 0.09).toFixed(2)}s`);
    current.style.setProperty("--current-scale", `${(0.72 + (index % 3) * 0.22).toFixed(2)}`);
    currents.appendChild(current);
  }

  const particles = document.createElement("div");
  particles.className = "scroll-response-particles";
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const particle = document.createElement("i");
    particle.style.setProperty("--particle-x", `${4 + Math.random() * 92}%`);
    particle.style.setProperty("--particle-y", `${5 + Math.random() * 88}%`);
    particle.style.setProperty("--particle-drift", `${-24 + Math.random() * 48}px`);
    particle.style.setProperty("--particle-size", `${(2.5 + Math.random() * 4.5).toFixed(1)}px`);
    particle.style.setProperty("--particle-length", `${(14 + Math.random() * 22).toFixed(0)}px`);
    particle.style.setProperty("--particle-delay", `${(-Math.random() * 1.1).toFixed(2)}s`);
    particle.style.setProperty("--particle-duration", `${(0.72 + Math.random() * 0.55).toFixed(2)}s`);
    particles.appendChild(particle);
  }

  layer.append(currents, particles);
  const app = document.getElementById("app");
  document.body.insertBefore(layer, app || null);
  return layer;
}

export function createScrollAtmosphere({ getWeatherType = () => "sunny" } = {}) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const layer = makeAtmosphereLayer();
  let wheelRaf = 0;
  let idleTimer = 0;
  let pendingStrength = 0;
  let pendingDirection = "down";
  let chapterObserver;
  const chapterTimers = new Map();

  function syncWeather() {
    layer.dataset.weather = weatherFamily(getWeatherType());
  }

  function deactivate() {
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    pendingStrength = 0;
    layer.classList.remove("is-active");
  }

  function renderWheelResponse() {
    wheelRaf = 0;
    if (reduceMotion.matches || document.hidden) return deactivate();

    syncWeather();
    layer.dataset.direction = pendingDirection;
    layer.style.setProperty(
      "--scroll-response-opacity",
      Math.min(0.5, 0.12 + pendingStrength * 0.34).toFixed(3),
    );
    layer.classList.add("is-active");

    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(deactivate, 260);
    pendingStrength = 0;
  }

  function pulse(direction = "down", strength = 0.72) {
    if (reduceMotion.matches || document.hidden) return;
    pendingDirection = direction === "up" ? "up" : "down";
    pendingStrength = Math.max(pendingStrength, Math.min(1, Math.max(0.08, strength)));
    if (!wheelRaf) wheelRaf = requestAnimationFrame(renderWheelResponse);
  }

  function handleWheel(event) {
    if (document.body.dataset.route === "home" && document.body.dataset.homeLayout === "deck") return;
    if (event.ctrlKey || Math.abs(event.deltaY) < 2) return;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? window.innerHeight
        : 1;
    const delta = event.deltaY * unit;
    pulse(delta < 0 ? "up" : "down", Math.min(1, Math.abs(delta) / 180));
  }

  function clearChapterEffects() {
    chapterObserver?.disconnect();
    chapterObserver = undefined;
    chapterTimers.forEach((timer) => window.clearTimeout(timer));
    chapterTimers.clear();
  }

  function flashChapter(heading, tocLink) {
    const previousTimer = chapterTimers.get(heading);
    if (previousTimer) window.clearTimeout(previousTimer);

    heading.classList.remove("is-scroll-arrival");
    tocLink?.classList.remove("is-scroll-arrival");
    void heading.offsetWidth;
    heading.classList.add("is-scroll-arrival");
    tocLink?.classList.add("is-scroll-arrival");

    const timer = window.setTimeout(() => {
      heading.classList.remove("is-scroll-arrival");
      tocLink?.classList.remove("is-scroll-arrival");
      chapterTimers.delete(heading);
    }, 1050);
    chapterTimers.set(heading, timer);
  }

  function bind(main, route) {
    clearChapterEffects();
    if (reduceMotion.matches || route.name !== "post" || !("IntersectionObserver" in window)) return;

    const headings = [...main.querySelectorAll(".article-body h2[id], .article-body h3[id]")];
    const tocLinks = [...main.querySelectorAll(".toc-link")];
    if (!headings.length) return;

    chapterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const tocLink = tocLinks.find((link) => link.dataset.target === entry.target.id);
        flashChapter(entry.target, tocLink);
      });
    }, {
      rootMargin: "-18% 0px -67% 0px",
      threshold: 0,
    });
    headings.forEach((heading) => chapterObserver.observe(heading));
  }

  function handleVisibilityChange() {
    if (document.hidden) deactivate();
  }

  function handleMotionPreference() {
    if (reduceMotion.matches) {
      deactivate();
      clearChapterEffects();
    }
  }

  syncWeather();
  window.addEventListener("wheel", handleWheel, { passive: true });
  window.addEventListener("weatherchange", syncWeather);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  reduceMotion.addEventListener?.("change", handleMotionPreference);

  return {
    bind,
    pulse,
    destroy() {
      deactivate();
      clearChapterEffects();
      cancelAnimationFrame(wheelRaf);
      wheelRaf = 0;
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("weatherchange", syncWeather);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reduceMotion.removeEventListener?.("change", handleMotionPreference);
      layer.remove();
    },
  };
}
