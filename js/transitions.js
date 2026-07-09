/**
 * Soft in-place page transitions
 * Content morphs in place only — no full-screen interstitial "page".
 */
import { WEATHER_META } from "./weather.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createTransitions() {
  const overlay = document.getElementById("transitionOverlay");
  const particles = document.getElementById("transitionParticles");
  const label = document.getElementById("transitionLabel");
  const main = document.getElementById("main");
  let busy = false;

  /**
   * Content-first transition: old view soft-fades out, HTML swaps, new view settles in.
   * Overlay is intentionally unused so navigation never feels like a forced extra page.
   *
   * @param {object} opts
   * @param {string} opts.weatherType
   * @param {string} [opts.message]  ignored (kept for API compat)
   * @param {() => void | Promise<void>} opts.work
   */
  async function run({ weatherType = "sunny", message, work }) {
    if (busy) {
      await work?.();
      return;
    }
    busy = true;

    // Keep overlay DOM inert — never stage a full-screen curtain / label page
    if (overlay) {
      overlay.classList.remove("is-active", "is-leaving", "phase-hold");
      if (overlay.dataset) delete overlay.dataset.weather;
    }
    if (particles) particles.innerHTML = "";
    if (label) {
      label.textContent = "";
      delete label.dataset.weather;
    }

    // Optional micro cue on body for CSS hooks (does not cover the screen)
    document.body.dataset.navWeather = weatherType;
    document.body.classList.add("is-navigating");

    // Phase 1 — current content gently recedes in place
    if (main) {
      main.classList.remove("view-enter");
      main.classList.add("view-exit");
    }

    await sleep(280);
    await work?.();

    // Phase 2 — new content settles in the same slot
    if (main) {
      main.classList.remove("view-exit");
      main.classList.add("view-enter");
    }

    await sleep(420);

    document.body.classList.remove("is-navigating");
    delete document.body.dataset.navWeather;
    // silence unused param for linters that care
    void message;
    void WEATHER_META;

    busy = false;
  }

  async function softSwap(mainEl, render) {
    mainEl.classList.remove("view-enter");
    mainEl.classList.add("view-exit");
    await sleep(200);
    render();
    mainEl.classList.remove("view-exit");
    mainEl.classList.add("view-enter");
  }

  return { run, softSwap, isBusy: () => busy };
}
