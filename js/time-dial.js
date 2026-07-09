/**
 * Circular 24h time dial — sits left of the weather badge.
 * Drag or click the ring to preview any hour; “回到实时” restores the clock.
 */

const PHASE_MARKS = [
  { h: 0, label: "子夜" },
  { h: 6, label: "黎明" },
  { h: 12, label: "正午" },
  { h: 18, label: "黄昏" },
];

function pad(n) {
  return String(Math.floor(n)).padStart(2, "0");
}

function formatHour(h) {
  let x = h % 24;
  if (x < 0) x += 24;
  const hours = Math.floor(x);
  const minutes = Math.round((x - hours) * 60) % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Hour 0 at top, clockwise through 24h → degrees */
function hourToDeg(h) {
  return (h / 24) * 360;
}

function degToHour(deg) {
  let d = ((deg % 360) + 360) % 360;
  return (d / 360) * 24;
}

function pointerAngle(el, clientX, clientY) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // 0° at top, clockwise
  const rad = Math.atan2(clientX - cx, cy - clientY);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function createTimeDial(timeSky) {
  const root = document.getElementById("timeControl");
  const btn = document.getElementById("timeBtn");
  const panel = document.getElementById("timeDialPanel");
  const ring = document.getElementById("timeDialRing");
  const hand = document.getElementById("timeDialHand");
  const display = document.getElementById("timeDialDisplay");
  const phaseEl = document.getElementById("timeDialPhase");
  const liveBtn = document.getElementById("timeDialLive");
  const ticksEl = document.getElementById("timeDialTicks");
  const marksEl = document.getElementById("timeDialMarks");

  if (!root || !btn || !panel || !ring) {
    return { destroy() {} };
  }

  let open = false;
  let dragging = false;

  // Build hour ticks (every hour; major every 3) + hour numbers at 0/6/12/18
  if (ticksEl) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 24; i++) {
      const tick = document.createElement("span");
      tick.className = "time-dial-tick" + (i % 3 === 0 ? " is-major" : "");
      tick.style.setProperty("--tick-deg", `${hourToDeg(i)}deg`);
      frag.appendChild(tick);
    }
    // numeric hour labels for orientation
    for (const h of [0, 6, 12, 18]) {
      const num = document.createElement("span");
      num.className = "time-dial-hour";
      num.textContent = String(h).padStart(2, "0");
      num.style.setProperty("--tick-deg", `${hourToDeg(h)}deg`);
      frag.appendChild(num);
    }
    ticksEl.appendChild(frag);
  }

  // Phase labels around the rim
  if (marksEl) {
    const frag = document.createDocumentFragment();
    for (const m of PHASE_MARKS) {
      const el = document.createElement("span");
      el.className = "time-dial-mark";
      el.textContent = m.label;
      el.style.setProperty("--mark-deg", `${hourToDeg(m.h)}deg`);
      el.title = `跳到 ${m.label}`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setFromHour(m.h);
      });
      frag.appendChild(el);
    }
    marksEl.appendChild(frag);
  }

  function syncUI(state) {
    const hour = state?.hour ?? timeSky.getHour();
    const deg = hourToDeg(hour);
    if (hand) hand.style.setProperty("--hand-deg", `${deg}deg`);
    if (display) display.textContent = state?.display || formatHour(hour);
    if (phaseEl) phaseEl.textContent = state?.phaseLabel || timeSky.phaseLabel?.(state?.phase) || "";
    root.classList.toggle("is-override", !!state?.overridden || timeSky.isOverridden());
    btn.setAttribute("aria-pressed", timeSky.isOverridden() ? "true" : "false");
    if (liveBtn) {
      liveBtn.disabled = !timeSky.isOverridden();
      liveBtn.classList.toggle("is-active", timeSky.isOverridden());
    }
  }

  function setFromHour(h, { snap = false } = {}) {
    let hour = h;
    if (snap) {
      // snap to nearest 15 minutes for click comfort
      hour = Math.round(h * 4) / 4;
    }
    const state = timeSky.setHour(hour);
    syncUI(state);
    return state;
  }

  function setFromPointer(clientX, clientY, { snap = false } = {}) {
    const deg = pointerAngle(ring, clientX, clientY);
    setFromHour(degToHour(deg), { snap });
  }

  function openPanel() {
    open = true;
    panel.hidden = false;
    // double rAF so opacity/transform transition actually runs
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add("is-open");
        root.classList.add("is-open");
      });
    });
    btn.setAttribute("aria-expanded", "true");
    const hour = timeSky.getHour();
    const sky = timeSky.sampleSky(hour);
    syncUI({
      hour,
      display: formatHour(hour),
      phaseLabel: timeSky.phaseLabel(sky.phase),
      phase: sky.phase,
      overridden: timeSky.isOverridden(),
    });
  }

  function closePanel() {
    open = false;
    panel.classList.remove("is-open");
    root.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    const onEnd = () => {
      if (!open) panel.hidden = true;
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
    // fallback if no transition
    setTimeout(() => {
      if (!open) panel.hidden = true;
    }, 320);
  }

  function toggle() {
    if (open) closePanel();
    else openPanel();
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  liveBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const state = timeSky.clearOverride();
    syncUI(state);
  });

  // Pointer drag on ring
  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    ring.classList.add("is-dragging");
    ring.setPointerCapture?.(e.pointerId);
    setFromPointer(e.clientX, e.clientY, { snap: true });
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    setFromPointer(e.clientX, e.clientY, { snap: false });
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    ring.classList.remove("is-dragging");
    try {
      ring.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    // final snap
    setFromPointer(e.clientX, e.clientY, { snap: true });
  };

  ring.addEventListener("pointerdown", onPointerDown);
  ring.addEventListener("pointermove", onPointerMove);
  ring.addEventListener("pointerup", onPointerUp);
  ring.addEventListener("pointercancel", onPointerUp);

  // Click outside to close
  const onDocPointer = (e) => {
    if (!open) return;
    if (root.contains(e.target)) return;
    closePanel();
  };
  document.addEventListener("pointerdown", onDocPointer);

  const onKey = (e) => {
    if (e.key === "Escape" && open) closePanel();
  };
  document.addEventListener("keydown", onKey);

  const unsub = timeSky.onChange?.((state) => {
    if (open || state.overridden) syncUI(state);
  });

  // initial
  syncUI({
    hour: timeSky.getHour(),
    display: formatHour(timeSky.getHour()),
    overridden: false,
  });

  return {
    open: openPanel,
    close: closePanel,
    destroy() {
      unsub?.();
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    },
  };
}
