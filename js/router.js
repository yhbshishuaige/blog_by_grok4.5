/**
 * Hash router with weather-aware transitions
 */
import { posts, getPostBySlug, formatDate } from "./posts.js";
import { friends } from "./friends.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function renderPostTags(post) {
  const tags = Array.isArray(post.tags) && post.tags.length
    ? post.tags
    : [post.tag || "随笔"];
  return tags
    .map((tag) => `<span class="post-card-tag">${escapeHtml(tag)}</span>`)
    .join("");
}

function parseRoute() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "friends") return { name: "friends" };
  if (parts[0] === "post" && parts[1]) {
    return { name: "post", slug: decodeURIComponent(parts[1]) };
  }
  return { name: "notfound" };
}

function renderHome() {
  const cards = posts
    .map(
      (p, i) => `
    <a
      href="#/post/${p.slug}"
      class="post-card post-deck-card"
      data-nav
      data-deck-card
      data-deck-index="${i}"
      data-deck-state="${i === 0 ? "active" : i === 1 ? "next" : "future"}"
      aria-label="打开文章：${escapeHtml(p.title)}"
      style="--deck-hue:${205 + (i * 47) % 135}"
    >
      <span class="post-deck-number" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <div class="post-card-meta">
        ${renderPostTags(p)}
        <time datetime="${p.date}">${formatDate(p.date)}</time>
        <span>· ${formatCount(p.wordCount)} 字</span>
        <span>· ${p.readingMinutes} 分钟阅读</span>
      </div>
      <h2>${p.title}</h2>
      <p>${p.excerpt}</p>
      <span class="post-deck-open">阅读文章 <i aria-hidden="true">↗</i></span>
    </a>`
    )
    .join("");

  const dots = posts
    .map(
      (p, i) => `
        <button
          type="button"
          class="post-deck-dot"
          data-deck-dot="${i}"
          aria-label="查看第 ${i + 1} 篇：${escapeHtml(p.title)}"
          ${i === 0 ? 'aria-current="true"' : ""}
        ><span></span></button>`
    )
    .join("");

  const classicCards = posts
    .map(
      (p, i) => `
        <a href="#/post/${p.slug}" class="post-card home-classic-card" data-nav style="--stagger:${i}">
          <div class="post-card-meta">
            ${renderPostTags(p)}
            <time datetime="${p.date}">${formatDate(p.date)}</time>
            <span>· ${formatCount(p.wordCount)} 字</span>
            <span>· ${p.readingMinutes} 分钟阅读</span>
          </div>
          <h2>${p.title}</h2>
          <p>${p.excerpt}</p>
          <span class="post-card-arrow" aria-hidden="true">→</span>
        </a>`
    )
    .join("");

  return `
    <section class="home-deck-stage" data-home-deck aria-label="文章翻阅器">
      <header class="home-deck-intro">
        <p class="hero-kicker">Weather · Time · Motion</p>
        <h1>写在<em>会呼吸</em>的天空下</h1>
        <p class="hero-desc">光在变，风在写。滚动翻阅，让下一篇文章从天气里浮现。</p>
        <div class="home-deck-position" aria-hidden="true">
          <span data-deck-current>01</span>
          <i></i>
          <span>${String(posts.length).padStart(2, "0")}</span>
        </div>
      </header>

      <div class="post-deck-shell">
        <div class="post-deck-viewport">
          <div class="post-deck" data-post-deck>${cards}</div>
        </div>

        <nav class="post-deck-controls" aria-label="文章切换">
          <button type="button" class="post-deck-control" data-deck-prev aria-label="上一篇文章">↑</button>
          <div class="post-deck-dots">${dots}</div>
          <button type="button" class="post-deck-control" data-deck-next aria-label="下一篇文章">↓</button>
        </nav>
        <p class="post-deck-hint"><span aria-hidden="true">↕</span> 滚轮 / 方向键翻阅</p>
        <p class="home-deck-live" data-deck-live aria-live="polite"></p>
      </div>
    </section>

    <div class="home-classic" data-home-classic hidden>
      <section class="hero">
        <p class="hero-kicker">Weather · Time · Motion</p>
        <h1>写在<em>会呼吸</em>的天空下</h1>
        <p class="hero-desc">光在变，风在写。字句栖在这片会呼吸的天空下，慢一点，也刚好。</p>
      </section>
      <section class="post-list" aria-label="文章列表">${classicCards}</section>
    </div>
  `;
}

function renderToc(post) {
  if (!post.toc?.length) return "";
  const links = post.toc
    .map(
      (item) => `
        <button type="button" class="toc-link toc-level-${item.level}" data-target="${escapeHtml(item.id)}">
          ${escapeHtml(item.label)}
        </button>`
    )
    .join("");

  return `
    <details class="article-toc" open>
      <summary>本文目录 <span>${post.toc.length} 节</span></summary>
      <nav class="toc-list" aria-label="本文目录">${links}</nav>
    </details>`;
}

function renderPost(slug) {
  const post = getPostBySlug(slug);
  if (!post) return renderNotFound();

  const lead = post.lead
    ? `<p class="article-lead">${post.lead}</p>`
    : "";

  return `
    <div class="article-layout">
      <article class="article">
      <a href="#/" class="back-link" data-nav>← 返回列表</a>
      <header class="article-header">
        <div class="article-meta">
          ${renderPostTags(post)}
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span>· ${formatCount(post.wordCount)} 字</span>
          <span>· ${post.readingMinutes} 分钟阅读</span>
          ${post.codeBlockCount ? `<span>· ${post.codeBlockCount} 个代码块</span>` : ""}
        </div>
        <h1>${post.title}</h1>
        ${lead}
      </header>
      <div class="article-body">
        ${post.content}
      </div>
      <footer class="article-end">
        <p class="article-end-note">—— ${post.title} · Weather Blog</p>
        <a href="#/" class="back-link" data-nav style="margin:0;animation-delay:0.5s">← 回首页</a>
      </footer>
      </article>
      ${renderToc(post)}
    </div>
  `;
}

function renderFriends() {
  const cards = friends
    .map(
      (friend) => `
        <a class="friend-card" href="${escapeHtml(safeExternalUrl(friend.url))}" target="_blank" rel="noopener noreferrer">
          <span class="friend-badge" aria-hidden="true">${escapeHtml(friend.badge || friend.name.slice(0, 2))}</span>
          <span class="friend-copy">
            <strong>${escapeHtml(friend.name)}</strong>
            <small>${escapeHtml(friend.description)}</small>
          </span>
          <span class="friend-arrow" aria-hidden="true">↗</span>
        </a>`
    )
    .join("");

  return `
    <section class="friends-page">
      <a href="#/" class="back-link" data-nav>← 返回文章</a>
      <header class="friends-header">
        <p class="hero-kicker">Links · Neighbors</p>
        <h1>友链</h1>
        <p>在各自的小小角落写字，也在彼此的世界留下入口。</p>
      </header>
      <div class="friends-grid">${cards}</div>
    </section>`;
}

function renderNotFound() {
  return `
    <div class="not-found">
      <h1>404</h1>
      <p>这页被风吹走了。</p>
      <a href="#/" class="back-link" data-nav style="opacity:1;animation:none">← 回首页</a>
    </div>
  `;
}

function revealCards(main) {
  const cards = main.querySelectorAll(".post-card:not(.post-deck-card)");
  requestAnimationFrame(() => {
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add("is-visible"), 40 + i * 70);
    });
  });
}

export function createRouter({ transitions, getWeatherType, onRender }) {
  const main = document.getElementById("main");
  let first = true;

  async function navigate() {
    const route = parseRoute();
    let html;
    let title = "Weather Blog · 天气博客";
    let message;

    if (route.name === "home") {
      html = renderHome();
      message = undefined; // content-only morph; no interstitial caption
    } else if (route.name === "friends") {
      html = renderFriends();
      title = "友链 · Weather Blog";
      message = undefined;
    } else if (route.name === "post") {
      html = renderPost(route.slug);
      const post = getPostBySlug(route.slug);
      title = post ? `${post.title} · Weather Blog` : "未找到 · Weather Blog";
      message = undefined;
    } else {
      html = renderNotFound();
      title = "404 · Weather Blog";
      message = undefined;
    }

    document.title = title;
    const weatherType = getWeatherType?.() || "sunny";

    // Content swap only — enter animation is owned by transitions.run()
    // so we don't double-trigger view-enter.
    const apply = () => {
      main.innerHTML = html;
      main.dataset.route = route.name;
      document.body.dataset.route = route.name;
      if (route.name === "home") revealCards(main);
      onRender?.(main, route);
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    };

    if (first) {
      first = false;
      apply();
      main.classList.add("view-enter");
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      await transitions.softSwap(main, apply);
    } else {
      await transitions.run({
        weatherType,
        message,
        work: apply,
      });
    }
  }

  function start() {
    window.addEventListener("hashchange", () => navigate());
    // Intercept same-page hash clicks for consistent transition even when hash unchanged
    document.body.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-nav]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      // Let hashchange handle it; if same hash, force navigate
      if (location.hash === href || (href === "#/" && (!location.hash || location.hash === "#/"))) {
        e.preventDefault();
        if (location.hash !== href) location.hash = href;
        else navigate();
      }
    });
    navigate();
  }

  return { start, navigate };
}
