/**
 * Full-text article search (pure client-side).
 * Indexes js/posts.data.js at startup — no server, no third-party service.
 */
import { posts } from "./posts.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Plain text of generated HTML content. */
function stripHtml(html) {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Wrap every (length >= 2) term with <mark>; single regex pass avoids nesting. */
function highlight(text, terms) {
  const pattern = terms
    .filter((term) => term.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  if (!pattern) return escapeHtml(text);
  return escapeHtml(text).replace(new RegExp(`(${pattern})`, "gi"), "<mark>$1</mark>");
}

export function createSearch() {
  const root = document.getElementById("searchControl");
  const button = document.getElementById("searchBtn");
  const panel = document.getElementById("searchPanel");
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("searchResults");
  const emptyEl = document.getElementById("searchEmpty");
  const hintEl = document.getElementById("searchHint");
  const hintCount = document.getElementById("searchPanelHint");
  const clearBtn = document.getElementById("searchClear");

  // Prebuilt index — built once at startup. Private articles are excluded:
  // they are encrypted and must not surface in search results.
  const index = posts
    .filter((post) => !post.private)
    .map((post) => ({
      post,
      title: String(post.title || "").toLowerCase(),
      tags: (post.tags || []).join(" ").toLowerCase(),
      meta: `${post.lead || ""} ${post.excerpt || ""}`.toLowerCase(),
      body: stripHtml(post.content || "").toLowerCase(),
    }));

  let open = false;
  let hideTimer = 0;
  let activeIndex = -1;
  let lastResults = [];
  let composing = false;


  function scoreEntry(entry, terms) {
    const { title, tags, meta, body } = entry;
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 12;
      if (title.startsWith(term)) score += 3;
      if (tags.includes(term)) score += 9;
      if (meta.includes(term)) score += 4;
      const hits = body.split(term).length - 1;
      if (hits > 0) score += Math.min(hits, 5);
    }
    if (terms.length > 1 && body.includes(terms.join(" "))) score += 6;
    return score;
  }

  function runSearch(rawQuery) {
    const query = String(rawQuery || "").trim();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = [];

    if (terms.length) {
      for (const entry of index) {
        const score = scoreEntry(entry, terms);
        if (score > 0) matched.push({ entry, score });
      }
      matched.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.entry.post.date < b.entry.post.date ? 1 : -1;
      });
    }
    return { terms, matched: matched.slice(0, 8) };
  }

  function renderResults(terms, matched) {
    const items = matched
      .map(
        (item, i) => `
      <a
        href="#/post/${item.entry.post.slug}"
        class="search-result"
        data-nav
        role="option"
        aria-selected="${i === activeIndex}"
        data-search-result="${i}"
      >
        <span class="search-result-head">
          <span class="search-result-title">${highlight(item.entry.post.title, terms)}</span>
          <span class="search-result-tags">${escapeHtml((item.entry.post.tags || []).join(" · "))}</span>
        </span>
        <span class="search-result-excerpt">${highlight(item.entry.post.excerpt || "", terms)}</span>
      </a>`
      )
      .join("");

    resultsEl.innerHTML = items;
    resultsEl.hidden = !items;
    emptyEl.hidden = !(terms.length && !items);
    hintEl.hidden = Boolean(terms.length);
    hintCount.textContent = terms.length
      ? `找到 ${matched.length} 篇`
      : "输入关键词";
    lastResults = [...matched];
  }

  function updateQuery() {
    activeIndex = -1;
    const { terms, matched } = runSearch(input.value);
    renderResults(terms, matched);
    clearBtn.hidden = !input.value;
  }

  function setActive(next) {
    if (!lastResults.length) return;
    activeIndex = (next + lastResults.length) % lastResults.length;
    resultsEl.querySelectorAll("[data-search-result]").forEach((el, i) => {
      const active = i === activeIndex;
      el.classList.toggle("is-active", active);
      el.setAttribute("aria-selected", String(active));
      if (active) el.scrollIntoView({ block: "nearest" });
    });
  }

  function openResult(item) {
    closePanel();
    location.hash = `#/post/${item.entry.post.slug}`;
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
    updateQuery();
    input.focus({ preventScroll: true });
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
    if (document.activeElement === input) button.focus({ preventScroll: true });
  }

  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (open) closePanel();
    else openPanel();
  });

  input?.addEventListener("compositionstart", () => {
    composing = true;
  });
  input?.addEventListener("compositionend", () => {
    composing = false;
    updateQuery();
  });

  function guardedInput() {
    if (!composing) updateQuery();
  }

  input?.addEventListener("input", guardedInput);

  clearBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    input.value = "";
    updateQuery();
    input.focus({ preventScroll: true });
  });

  resultsEl?.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-search-result]");
    if (link) {
      event.preventDefault();
      openResult(lastResults[Number(link.dataset.searchResult)]);
    }
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target =
        activeIndex >= 0 ? lastResults[activeIndex] : lastResults[0];
      if (target) openResult(target);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closePanel();
    }
  });

  document.addEventListener("click", (event) => {
    if (open && !root?.contains(event.target)) closePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) closePanel();
  });

  // Closing the panel on navigation keeps it from lingering after a transition.
  window.addEventListener("hashchange", () => {
    if (open) closePanel();
  });

  return { open: openPanel, close: closePanel };
}
