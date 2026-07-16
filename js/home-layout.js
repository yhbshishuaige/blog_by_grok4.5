const STORAGE_KEY = "weather-blog-home-layout";
const LAYOUTS = new Set(["deck", "classic"]);

export function createHomeLayout() {
  const control = document.getElementById("homeLayoutControl");
  const button = document.getElementById("homeLayoutBtn");
  const glyph = document.getElementById("homeLayoutGlyph");
  const label = document.getElementById("homeLayoutLabel");
  let current = LAYOUTS.has(document.body.dataset.homeLayout)
    ? document.body.dataset.homeLayout
    : "deck";
  let boundMain;

  function syncHomeViews() {
    const deck = boundMain?.querySelector("[data-home-deck]");
    const classic = boundMain?.querySelector("[data-home-classic]");
    const deckActive = current === "deck";

    if (deck) {
      deck.hidden = !deckActive;
      deck.inert = !deckActive;
    }
    if (classic) {
      classic.hidden = deckActive;
      classic.inert = deckActive;
    }
  }

  function syncButton() {
    const showClassic = current === "deck";
    if (glyph) glyph.textContent = showClassic ? "☷" : "▱";
    if (label) label.textContent = showClassic ? "经典" : "翻卡";
    if (button) {
      button.setAttribute("aria-pressed", String(current === "classic"));
      button.setAttribute("aria-label", showClassic ? "切换为经典列表首页" : "切换为翻卡首页");
      button.title = showClassic ? "切换为经典纵向列表" : "切换为滚轮翻卡模式";
    }
    control?.classList.toggle("is-classic", current === "classic");
  }

  function setMode(mode, { persist = true } = {}) {
    const next = LAYOUTS.has(mode) ? mode : "deck";
    const changed = next !== current;
    current = next;
    document.body.dataset.homeLayout = current;
    syncButton();
    syncHomeViews();
    if (current === "deck" && document.body.dataset.route === "home") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, current);
      } catch {
        /* storage unavailable */
      }
    }

    if (changed) {
      window.dispatchEvent(new CustomEvent("homelayoutchange", {
        detail: { mode: current },
      }));
    }
    return current;
  }

  function bind(main, route) {
    boundMain = route.name === "home" ? main : undefined;
    syncHomeViews();
  }

  button?.addEventListener("click", () => {
    setMode(current === "deck" ? "classic" : "deck");
  });
  setMode(current, { persist: false });

  return {
    bind,
    setMode,
    getMode: () => current,
  };
}
