const WHEEL_THRESHOLD = 42;
const TRANSITION_LOCK_MS = 560;

function normalizeWheelDelta(event) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

export function createHomeDeck() {
  let controller;
  let activeIndex = 0;
  let wheelAccumulator = 0;
  let wheelResetTimer = 0;
  let transitionTimer = 0;
  let boundaryTimer = 0;
  let transitionLocked = false;
  let lastWheelDirection = 0;
  let pointerStart;

  function clearTimers() {
    window.clearTimeout(wheelResetTimer);
    window.clearTimeout(transitionTimer);
    window.clearTimeout(boundaryTimer);
    wheelResetTimer = 0;
    transitionTimer = 0;
    boundaryTimer = 0;
  }

  function bind(main, route) {
    controller?.abort();
    clearTimers();
    transitionLocked = false;
    wheelAccumulator = 0;
    lastWheelDirection = 0;
    pointerStart = undefined;
    if (route.name !== "home") return;

    const stage = main.querySelector("[data-home-deck]");
    const cards = [...main.querySelectorAll("[data-deck-card]")];
    const dots = [...main.querySelectorAll("[data-deck-dot]")];
    const previousButton = main.querySelector("[data-deck-prev]");
    const nextButton = main.querySelector("[data-deck-next]");
    const currentLabel = main.querySelector("[data-deck-current]");
    const liveRegion = main.querySelector("[data-deck-live]");
    if (!stage || !cards.length) return;

    controller = new AbortController();
    const { signal } = controller;
    activeIndex = Math.min(activeIndex, cards.length - 1);

    function updateDeck({ direction = "next", announce = false } = {}) {
      stage.dataset.deckDirection = direction;
      cards.forEach((card, index) => {
        const relative = index - activeIndex;
        const state = relative === 0
          ? "active"
          : relative === -1
            ? "previous"
            : relative === 1
              ? "next"
              : "far";
        const active = state === "active";
        card.dataset.deckState = state;
        card.setAttribute("aria-hidden", String(!active));
        card.tabIndex = active ? 0 : -1;
      });

      dots.forEach((dot, index) => {
        if (index === activeIndex) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });

      if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, "0");
      if (previousButton) previousButton.disabled = activeIndex === 0;
      if (nextButton) nextButton.disabled = activeIndex === cards.length - 1;
      if (announce && liveRegion) {
        const title = cards[activeIndex].querySelector("h2")?.textContent?.trim() || "文章";
        liveRegion.textContent = `第 ${activeIndex + 1} 篇，共 ${cards.length} 篇：${title}`;
      }
    }

    function showBoundary(direction) {
      stage.dataset.boundary = direction;
      stage.classList.remove("is-boundary");
      void stage.offsetWidth;
      stage.classList.add("is-boundary");
      window.clearTimeout(boundaryTimer);
      boundaryTimer = window.setTimeout(() => stage.classList.remove("is-boundary"), 420);
    }

    function moveTo(index, { announce = true } = {}) {
      const nextIndex = Math.max(0, Math.min(cards.length - 1, index));
      if (nextIndex === activeIndex) {
        showBoundary(index < activeIndex || index < 0 ? "start" : "end");
        return false;
      }

      const direction = nextIndex > activeIndex ? "next" : "previous";
      activeIndex = nextIndex;
      stage.classList.add("has-interacted");
      updateDeck({ direction, announce });
      return true;
    }

    function lockTransition() {
      transitionLocked = true;
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        transitionLocked = false;
      }, TRANSITION_LOCK_MS);
    }

    function handleWheel(event) {
      if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      const delta = normalizeWheelDelta(event);
      const direction = Math.sign(delta);

      if (transitionLocked) {
        wheelAccumulator = 0;
        lastWheelDirection = direction;
        return;
      }

      if (lastWheelDirection && direction !== lastWheelDirection) wheelAccumulator = 0;
      lastWheelDirection = direction;
      wheelAccumulator += delta;
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => {
        wheelAccumulator = 0;
        lastWheelDirection = 0;
      }, 150);

      if (Math.abs(wheelAccumulator) < WHEEL_THRESHOLD) return;
      const step = wheelAccumulator > 0 ? 1 : -1;
      wheelAccumulator = 0;
      moveTo(activeIndex + step);
      lockTransition();
    }

    function handleKeydown(event) {
      if (document.body.dataset.homeLayout !== "deck") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.target?.matches?.("input, textarea, select, [contenteditable]")) return;
      if (transitionLocked) return;
      const nextKeys = new Set(["ArrowDown", "ArrowRight", "PageDown", " "]);
      const previousKeys = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);
      if (nextKeys.has(event.key)) {
        event.preventDefault();
        moveTo(activeIndex + 1);
      } else if (previousKeys.has(event.key)) {
        event.preventDefault();
        moveTo(activeIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        moveTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        moveTo(cards.length - 1);
      } else {
        return;
      }
      lockTransition();
    }

    function handlePointerDown(event) {
      if (event.pointerType === "mouse") return;
      pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }

    function handlePointerUp(event) {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = undefined;
      if (Math.abs(dy) < 44 || Math.abs(dy) < Math.abs(dx) * 0.75) return;
      event.preventDefault();
      if (transitionLocked) return;
      moveTo(activeIndex + (dy < 0 ? 1 : -1));
      lockTransition();
    }

    stage.addEventListener("wheel", handleWheel, { passive: false, signal });
    stage.addEventListener("pointerdown", handlePointerDown, { passive: true, signal });
    stage.addEventListener("pointerup", handlePointerUp, { signal });
    stage.addEventListener("pointercancel", () => { pointerStart = undefined; }, { signal });
    document.addEventListener("keydown", handleKeydown, { signal });
    previousButton?.addEventListener("click", () => {
      if (transitionLocked) return;
      moveTo(activeIndex - 1);
      lockTransition();
    }, { signal });
    nextButton?.addEventListener("click", () => {
      if (transitionLocked) return;
      moveTo(activeIndex + 1);
      lockTransition();
    }, { signal });
    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        if (transitionLocked) return;
        moveTo(index);
        lockTransition();
      }, { signal });
    });

    updateDeck();
  }

  return {
    bind,
    getIndex: () => activeIndex,
    destroy() {
      controller?.abort();
      controller = undefined;
      clearTimers();
    },
  };
}
