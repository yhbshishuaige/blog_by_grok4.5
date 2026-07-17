const WHEEL_THRESHOLD = 48;
const WHEEL_VISUAL_SETTLE_MS = 620;
const WHEEL_SPRING = 90;
const WHEEL_DAMPING = 19;
const WHEEL_MAX_SPEED = 6.25;
const WHEEL_SETTLE_DISTANCE = 0.0015;
const WHEEL_SETTLE_VELOCITY = 0.02;
const TRANSITION_LOCK_MS = 560;

const DECK_POSES = [
  { at: -2, y: -34, z: -420, rotate: -16, scale: 0.72, opacity: 0 },
  { at: -1, y: -24, z: -220, rotate: -13, scale: 0.86, opacity: 0.16 },
  { at: 0, y: 0, z: 0, rotate: 0, scale: 1, opacity: 1 },
  { at: 1, y: 22, z: -175, rotate: 12, scale: 0.89, opacity: 0.34 },
  { at: 2, y: 32, z: -420, rotate: 16, scale: 0.72, opacity: 0 },
];

const COMPACT_DECK_POSES = [
  DECK_POSES[0],
  { at: -1, y: -18, z: -190, rotate: -11, scale: 0.86, opacity: 0.16 },
  DECK_POSES[2],
  { at: 1, y: 17, z: -150, rotate: 10, scale: 0.9, opacity: 0.34 },
  DECK_POSES[4],
];

function interpolatePose(relative, poses) {
  if (relative <= -2) return poses[0];
  if (relative >= 2) return poses[4];
  const lowerIndex = Math.floor(relative) + 2;
  const from = poses[lowerIndex];
  const to = poses[lowerIndex + 1];
  const progress = relative - from.at;
  return {
    y: from.y + (to.y - from.y) * progress,
    z: from.z + (to.z - from.z) * progress,
    rotate: from.rotate + (to.rotate - from.rotate) * progress,
    scale: from.scale + (to.scale - from.scale) * progress,
    opacity: from.opacity + (to.opacity - from.opacity) * progress,
  };
}

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
  let wheelSettleTimer = 0;
  let wheelInputFrame = 0;
  let wheelMotionFrame = 0;
  let pendingWheelDelta = 0;
  let wheelTargetIndex = 0;
  let visualIndex = 0;
  let wheelVelocity = 0;
  let wheelLastFrameTime = 0;
  let transitionTimer = 0;
  let boundaryTimer = 0;
  let transitionLocked = false;
  let lastWheelDirection = 0;
  let boundaryFeedbackDirection = "";
  let pointerStart;

  function clearTimers() {
    window.clearTimeout(wheelResetTimer);
    window.clearTimeout(wheelSettleTimer);
    window.cancelAnimationFrame(wheelInputFrame);
    window.cancelAnimationFrame(wheelMotionFrame);
    window.clearTimeout(transitionTimer);
    window.clearTimeout(boundaryTimer);
    wheelResetTimer = 0;
    wheelSettleTimer = 0;
    wheelInputFrame = 0;
    wheelMotionFrame = 0;
    pendingWheelDelta = 0;
    wheelVelocity = 0;
    wheelLastFrameTime = 0;
    transitionTimer = 0;
    boundaryTimer = 0;
  }

  function bind(main, route) {
    controller?.abort();
    clearTimers();
    transitionLocked = false;
    wheelAccumulator = 0;
    lastWheelDirection = 0;
    boundaryFeedbackDirection = "";
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
    const wheelStyledCards = new Set();

    controller = new AbortController();
    const { signal } = controller;
    activeIndex = Math.min(activeIndex, cards.length - 1);
    wheelTargetIndex = activeIndex;
    visualIndex = activeIndex;

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
              : relative < -1
                ? "past"
                : "future";
        const active = state === "active";
        const hidden = String(!active);
        const tabIndex = active ? 0 : -1;
        if (card.dataset.deckState !== state) card.dataset.deckState = state;
        if (card.getAttribute("aria-hidden") !== hidden) card.setAttribute("aria-hidden", hidden);
        if (card.tabIndex !== tabIndex) card.tabIndex = tabIndex;
      });

      dots.forEach((dot, index) => {
        if (index === activeIndex && dot.getAttribute("aria-current") !== "true") {
          dot.setAttribute("aria-current", "true");
        } else if (index !== activeIndex && dot.hasAttribute("aria-current")) {
          dot.removeAttribute("aria-current");
        }
      });

      const currentText = String(activeIndex + 1).padStart(2, "0");
      if (currentLabel && currentLabel.textContent !== currentText) currentLabel.textContent = currentText;
      if (previousButton) previousButton.disabled = activeIndex === 0;
      if (nextButton) nextButton.disabled = activeIndex === cards.length - 1;
      if (announce && liveRegion) {
        const title = cards[activeIndex].querySelector("h2")?.textContent?.trim() || "文章";
        liveRegion.textContent = `第 ${activeIndex + 1} 篇，共 ${cards.length} 篇：${title}`;
      }
    }

    function showBoundary(direction) {
      if (boundaryFeedbackDirection === direction) return;
      boundaryFeedbackDirection = direction;
      const restartAnimation = stage.classList.contains("is-boundary");
      stage.dataset.boundary = direction;
      if (restartAnimation) {
        stage.classList.remove("is-boundary");
        void stage.offsetWidth;
      }
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
      wheelTargetIndex = nextIndex;
      visualIndex = nextIndex;
      wheelVelocity = 0;
      wheelLastFrameTime = 0;
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

    function beginWheelMotion() {
      stage.classList.add("is-wheel-moving");
      window.clearTimeout(wheelSettleTimer);
      wheelSettleTimer = 0;
    }

    function scheduleWheelIdle(delay = 80) {
      window.clearTimeout(wheelSettleTimer);
      wheelSettleTimer = window.setTimeout(() => {
        stage.classList.remove("is-wheel-moving");
        boundaryFeedbackDirection = "";
        wheelSettleTimer = 0;
      }, delay);
    }

    function clearWheelPose() {
      wheelStyledCards.forEach((card) => {
        card.style.removeProperty("transform");
        card.style.removeProperty("opacity");
        card.style.removeProperty("z-index");
      });
      wheelStyledCards.clear();
    }

    function applyWheelPose(position) {
      const poses = window.innerWidth <= 820 ? COMPACT_DECK_POSES : DECK_POSES;
      cards.forEach((card, index) => {
        const relative = index - position;
        if (relative <= -2 || relative >= 2) {
          if (wheelStyledCards.has(card)) {
            card.style.removeProperty("transform");
            card.style.removeProperty("opacity");
            card.style.removeProperty("z-index");
            wheelStyledCards.delete(card);
          }
          return;
        }

        const pose = interpolatePose(relative, poses);
        card.style.transform = `translate(-50%, -50%) translate3d(0, ${pose.y.toFixed(3)}%, ${pose.z.toFixed(2)}px) rotateX(${pose.rotate.toFixed(3)}deg) scale(${pose.scale.toFixed(4)})`;
        card.style.opacity = pose.opacity.toFixed(4);
        card.style.zIndex = String(Math.max(2, Math.round(100 - Math.abs(relative) * 10)));
        wheelStyledCards.add(card);
      });
    }

    function syncActiveIndex() {
      const nextActive = Math.max(0, Math.min(cards.length - 1, Math.round(visualIndex)));
      if (nextActive === activeIndex) return;
      const direction = nextActive > activeIndex ? "next" : "previous";
      activeIndex = nextActive;
      stage.classList.add("has-interacted");
      updateDeck({ direction, announce: false });
    }

    function settleWheelMotion() {
      visualIndex = wheelTargetIndex;
      wheelVelocity = 0;
      wheelLastFrameTime = 0;
      applyWheelPose(visualIndex);
      syncActiveIndex();
      updateDeck({ direction: lastWheelDirection < 0 ? "previous" : "next", announce: true });
      clearWheelPose();
      scheduleWheelIdle();
    }

    function animateWheelMotion(time) {
      wheelMotionFrame = 0;
      const elapsed = wheelLastFrameTime
        ? Math.min(0.034, Math.max(0.001, (time - wheelLastFrameTime) / 1000))
        : 1 / 60;
      wheelLastFrameTime = time;

      const distance = wheelTargetIndex - visualIndex;
      const acceleration = distance * WHEEL_SPRING - wheelVelocity * WHEEL_DAMPING;
      wheelVelocity += acceleration * elapsed;
      wheelVelocity = Math.max(-WHEEL_MAX_SPEED, Math.min(WHEEL_MAX_SPEED, wheelVelocity));

      let nextVisual = visualIndex + wheelVelocity * elapsed;
      const nextDistance = wheelTargetIndex - nextVisual;
      if (distance && Math.sign(distance) !== Math.sign(nextDistance)) {
        nextVisual = wheelTargetIndex;
        wheelVelocity = 0;
      }
      visualIndex = Math.max(0, Math.min(cards.length - 1, nextVisual));

      applyWheelPose(visualIndex);
      syncActiveIndex();

      if (
        Math.abs(wheelTargetIndex - visualIndex) <= WHEEL_SETTLE_DISTANCE
        && Math.abs(wheelVelocity) <= WHEEL_SETTLE_VELOCITY
      ) {
        settleWheelMotion();
        return;
      }

      wheelMotionFrame = window.requestAnimationFrame(animateWheelMotion);
    }

    function startWheelMotion() {
      beginWheelMotion();
      stage.classList.add("has-interacted");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        settleWheelMotion();
        return;
      }
      if (!wheelMotionFrame) {
        wheelLastFrameTime = 0;
        wheelMotionFrame = window.requestAnimationFrame(animateWheelMotion);
      }
    }

    function cancelWheelQueue() {
      window.clearTimeout(wheelResetTimer);
      window.clearTimeout(wheelSettleTimer);
      window.cancelAnimationFrame(wheelInputFrame);
      window.cancelAnimationFrame(wheelMotionFrame);
      wheelResetTimer = 0;
      wheelSettleTimer = 0;
      wheelInputFrame = 0;
      wheelMotionFrame = 0;
      pendingWheelDelta = 0;
      wheelTargetIndex = activeIndex;
      visualIndex = activeIndex;
      wheelVelocity = 0;
      wheelLastFrameTime = 0;
      wheelAccumulator = 0;
      lastWheelDirection = 0;
      boundaryFeedbackDirection = "";
      clearWheelPose();
      stage.classList.remove("is-wheel-moving");
    }

    function flushWheelInput() {
      wheelInputFrame = 0;
      const delta = pendingWheelDelta;
      pendingWheelDelta = 0;
      const direction = Math.sign(delta);
      if (!direction) return;

      if (lastWheelDirection && direction !== lastWheelDirection) {
        wheelTargetIndex = activeIndex;
        wheelAccumulator = 0;
      }

      beginWheelMotion();
      lastWheelDirection = direction;
      wheelAccumulator += delta;
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => {
        wheelAccumulator = 0;
        lastWheelDirection = 0;
      }, 150);

      if (Math.abs(wheelAccumulator) < WHEEL_THRESHOLD) {
        if (!wheelMotionFrame) scheduleWheelIdle(WHEEL_VISUAL_SETTLE_MS);
        return;
      }
      const steps = Math.trunc(wheelAccumulator / WHEEL_THRESHOLD);
      wheelAccumulator -= steps * WHEEL_THRESHOLD;

      const requestedIndex = wheelTargetIndex + steps;
      const nextTarget = Math.max(0, Math.min(cards.length - 1, requestedIndex));
      if (nextTarget === wheelTargetIndex) {
        if (!wheelMotionFrame && Math.abs(visualIndex - wheelTargetIndex) <= WHEEL_SETTLE_DISTANCE) {
          showBoundary(direction < 0 ? "start" : "end");
          scheduleWheelIdle(WHEEL_VISUAL_SETTLE_MS);
        }
        return;
      }

      wheelTargetIndex = nextTarget;
      startWheelMotion();
    }

    function handleWheel(event) {
      if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      const delta = normalizeWheelDelta(event);
      if (!delta) return;
      event.preventDefault();
      pendingWheelDelta += delta;
      if (!wheelInputFrame) wheelInputFrame = window.requestAnimationFrame(flushWheelInput);
    }

    function handleKeydown(event) {
      if (document.body.dataset.homeLayout !== "deck") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.target?.matches?.("input, textarea, select, [contenteditable]")) return;
      if (transitionLocked) return;
      const nextKeys = new Set(["ArrowDown", "ArrowRight", "PageDown", " "]);
      const previousKeys = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);
      if (nextKeys.has(event.key)) {
        event.preventDefault();
        cancelWheelQueue();
        moveTo(activeIndex + 1);
      } else if (previousKeys.has(event.key)) {
        event.preventDefault();
        cancelWheelQueue();
        moveTo(activeIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        cancelWheelQueue();
        moveTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        cancelWheelQueue();
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
      cancelWheelQueue();
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
      cancelWheelQueue();
      moveTo(activeIndex - 1);
      lockTransition();
    }, { signal });
    nextButton?.addEventListener("click", () => {
      if (transitionLocked) return;
      cancelWheelQueue();
      moveTo(activeIndex + 1);
      lockTransition();
    }, { signal });
    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        if (transitionLocked) return;
        cancelWheelQueue();
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
