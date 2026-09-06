/**
 * Weather Blog — 右上角季节选择控件
 * 提供 自动跟随 / 春夏秋冬 五个选项,选择会持久化到 localStorage
 * (key: weather-blog-season-override),与背景选择器交互一致:
 * 点击切换、点外部 / Esc 关闭、aria 状态同步。
 * 手动固定季节后 body.season-* 与季节粒子/色调随之切换。
 */
const SEASON_META = {
  auto: { short: "自动", full: "自动跟随日期" },
  spring: { short: "春", full: "春天 · 樱瓣飘落" },
  summer: { short: "夏", full: "夏天 · 萤火入夜" },
  autumn: { short: "秋", full: "秋天 · 落叶知秋" },
  winter: { short: "冬", full: "冬天 · 雪落无声" },
};

export function createSeasonControl({ season }) {
  const root = document.getElementById("seasonControl");
  const button = document.getElementById("seasonBtn");
  const label = document.getElementById("seasonBtnLabel");
  const panel = document.getElementById("seasonPanel");
  const autoNote = document.getElementById("seasonAutoNote");
  const options = [...document.querySelectorAll("[data-season-option]")];
  let open = false;
  let hideTimer = 0;

  function currentManual() {
    return season.info().manual.season || null;
  }

  function realSeasonName() {
    const now = new Date();
    const m = now.getMonth() + 1;
    if (m >= 3 && m <= 5) return "春";
    if (m >= 6 && m <= 8) return "夏";
    if (m >= 9 && m <= 11) return "秋";
    return "冬";
  }

  function sync() {
    const manual = currentManual();
    const isPinned = Boolean(manual);

    if (autoNote) {
      autoNote.textContent = isPinned
        ? `固定季节 · 清除后回到跟随`
        : `跟随日期 · 现在是${realSeasonName()}季`;
    }

    options.forEach((option) => {
      const value = option.dataset.seasonOption;
      const active = value === (manual || "auto");
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-pressed", String(active));
    });

    // 动态按钮文案 + 状态色
    const meta = isPinned ? SEASON_META[manual] : SEASON_META.auto;
    if (label) label.textContent = isPinned ? meta.short : "季节";
    root?.classList.remove("is-pinned", "is-auto", "is-spring", "is-summer", "is-autumn", "is-winter");
    root?.classList.toggle("is-pinned", isPinned);
    root?.classList.toggle("is-auto", !isPinned);
    root?.classList.add(`is-${manual || "auto"}`);
    button?.setAttribute(
      "title",
      `选择季节 · 当前：${isPinned ? meta.full : `自动（${realSeasonName()}季）`}`
    );
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
      const value = option.dataset.seasonOption;
      const manual = currentManual();
      if (value === "auto") {
        if (manual) season.setSeason(null, true); // 回到自动跟随
      } else {
        season.setSeason(value, true); // 固定季节并保存
      }
      sync();
      closePanel();
    });
  });

  document.addEventListener("click", (event) => {
    if (open && !root?.contains(event.target)) closePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) closePanel();
  });

  window.addEventListener("seasonchange", sync);

  sync();

  return {
    getSeason: () => currentManual() || "auto",
    setSeason(value, save = true) {
      season.setSeason(value === "auto" ? null : value, save);
      sync();
    },
    open: openPanel,
    close: closePanel,
  };
}
