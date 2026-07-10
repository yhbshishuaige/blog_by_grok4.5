/**
 * Hash router with weather-aware transitions
 */
import { posts, getPostBySlug, formatDate } from "./posts.js";

function parseRoute() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "post" && parts[1]) {
    return { name: "post", slug: decodeURIComponent(parts[1]) };
  }
  return { name: "notfound" };
}

function renderHome() {
  const cards = posts
    .map(
      (p, i) => `
    <a href="#/post/${p.slug}" class="post-card" data-nav style="--stagger:${i}">
      <div class="post-card-meta">
        <span class="post-card-tag">${p.tag}</span>
        <time datetime="${p.date}">${formatDate(p.date)}</time>
        <span>· ${p.readingMinutes} 分钟阅读</span>
      </div>
      <h2>${p.title}</h2>
      <p>${p.excerpt}</p>
      <span class="post-card-arrow" aria-hidden="true">→</span>
    </a>`
    )
    .join("");

  return `
    <section class="hero">
      <p class="hero-kicker">Weather · Time · Motion</p>
      <h1>写在<em>会呼吸</em>的天空下</h1>
      <p class="hero-desc">
        光在变，风在写。字句栖在这片会呼吸的天空下，慢一点，也刚好。
      </p>
    </section>
    <section class="post-list" aria-label="文章列表">
      ${cards}
    </section>
  `;
}

function renderPost(slug) {
  const post = getPostBySlug(slug);
  if (!post) return renderNotFound();

  const lead = post.lead
    ? `<p class="article-lead">${post.lead}</p>`
    : "";

  return `
    <article class="article">
      <a href="#/" class="back-link" data-nav>← 返回列表</a>
      <header class="article-header">
        <div class="article-meta">
          <span class="post-card-tag">${post.tag}</span>
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span>· ${post.readingMinutes} 分钟阅读</span>
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
  `;
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
  const cards = main.querySelectorAll(".post-card");
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
