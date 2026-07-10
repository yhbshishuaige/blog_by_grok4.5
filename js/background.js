const STORAGE_KEY = "weather-blog-background";
const MODES = new Set(["sky", "mountain"]);

function loadMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.has(saved) ? saved : "mountain";
  } catch {
    return "mountain";
  }
}

export function createBackgroundControl() {
  const root = document.getElementById("backgroundControl");
  const button = document.getElementById("backgroundBtn");
  const panel = document.getElementById("backgroundPanel");
  const options = [...document.querySelectorAll("[data-background]")];
  let mode = loadMode();
  let open = false;
  let hideTimer = 0;

  function syncOptions() {
    document.body.dataset.background = mode;
    root?.classList.toggle("is-sky", mode === "sky");
    root?.classList.toggle("is-mountain", mode === "mountain");
    button?.setAttribute("title", `选择背景 · 当前${mode === "sky" ? "天空" : "雪山"}`);
    options.forEach((option) => {
      const active = option.dataset.background === mode;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-pressed", String(active));
    });
  }

  function setMode(next, { save = true } = {}) {
    if (!MODES.has(next) || next === mode) return mode;
    document.body.classList.add("is-background-changing");
    mode = next;
    syncOptions();
    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* storage unavailable */
      }
    }
    window.setTimeout(() => {
      document.body.classList.remove("is-background-changing");
    }, 620);
    window.dispatchEvent(new CustomEvent("backgroundchange", { detail: { mode } }));
    return mode;
  }

  function openPanel() {
    if (!panel || !button || !root) return;
    clearTimeout(hideTimer);
    open = true;
    panel.hidden = false;
    requestAnimationFrame(() => {
      panel.classList.add("is-open");
      root.classList.add("is-open");
    });
    button.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    if (!panel || !button || !root) return;
    open = false;
    panel.classList.remove("is-open");
    root.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    hideTimer = window.setTimeout(() => {
      if (!open) panel.hidden = true;
    }, 260);
  }

  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (open) closePanel();
    else openPanel();
  });

  options.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      setMode(option.dataset.background);
      closePanel();
    });
  });

  document.addEventListener("click", (event) => {
    if (open && !root?.contains(event.target)) closePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) closePanel();
  });

  syncOptions();

  return {
    getMode: () => mode,
    setMode,
    open: openPanel,
    close: closePanel,
  };
}
