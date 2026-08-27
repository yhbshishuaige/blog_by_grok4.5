/**
 * Private article lock UI: password form, admin auto-unlock, lock button.
 */
import { getPostBySlug } from "./posts.js";
import {
  tryUnlock,
  autoUnlockAdmin,
  cacheUnlocked,
  getUnlocked,
  hasAdminKey,
  clearAdminKey,
  clearUnlocked,
} from "./private-access.js";

const LOCK_BTN_ID = "adminLockBtn";

export function createPrivateUnlock({ navigate }) {
  function bindLockForm(main, slug) {
    const form = main.querySelector(".private-lock-form");
    const input = main.querySelector(".private-lock-input");
    const button = main.querySelector(".private-lock-btn");
    const error = main.querySelector(".private-lock-error");
    if (!form || !input || !button) return;

    async function attempt() {
      const password = input.value;
      if (!password) return;
      button.disabled = true;
      button.textContent = "解锁中…";
      error.hidden = true;

      const payload = await tryUnlock(slug, password);
      if (payload) {
        cacheUnlocked(slug, payload);
        syncLockButton();
        navigate();
      } else {
        button.disabled = false;
        button.textContent = "解锁";
        error.hidden = false;
        input.select();
        input.focus();
      }
    }

    button.addEventListener("click", attempt);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") attempt();
    });
    input.focus({ preventScroll: true });
  }

  function bind(main, route) {
    if (route.name !== "post") return;
    const post = getPostBySlug(route.slug);
    if (!post?.private) return;
    // Already unlocked — the router rendered the article; nothing to do.
    if (getUnlocked(route.slug)) return;

    // Remembered admin key → open without asking.
    if (hasAdminKey()) {
      autoUnlockAdmin(route.slug).then((payload) => {
        if (payload) {
          cacheUnlocked(route.slug, payload);
          navigate();
        }
      });
    }
    bindLockForm(main, route.slug);
  }

  /** Header lock toggle — only present while an admin key is remembered. */
  function syncLockButton() {
    const meta = document.querySelector(".header-meta");
    if (!meta) return;
    let btn = document.getElementById(LOCK_BTN_ID);
    if (hasAdminKey()) {
      if (btn) return;
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = LOCK_BTN_ID;
      btn.className = "admin-lock-btn";
      btn.title = "清除已记住的管理员凭据，私密文章重新需要密码";
      btn.setAttribute("aria-label", "锁定私密文章");
      btn.innerHTML = `<span class="admin-lock-glyph" aria-hidden="true">🔒</span><span class="admin-lock-label">锁定</span>`;
      btn.addEventListener("click", () => {
        clearAdminKey();
        clearUnlocked();
        syncLockButton();
        navigate();
      });
      meta.insertBefore(btn, meta.firstChild);
    } else if (btn) {
      btn.remove();
    }
  }

  return { bind, syncLockButton };
}
