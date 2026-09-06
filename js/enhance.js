/**
 * Weather Blog — 视觉增强:文章阅读进度条
 * 在文章页顶部显示一条随滚动增长的流光进度条,
 * 其他视图(首页 / 友链 / 404)自动隐藏。
 */
export function createEnhance() {
  const bar = document.createElement("div");
  bar.className = "reading-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  let raf = 0;

  function update() {
    raf = 0;
    const article = document.querySelector(".article-body");
    if (!article) {
      bar.classList.remove("is-active");
      bar.style.setProperty("--progress", "0%");
      return;
    }

    bar.classList.add("is-active");
    const start = window.innerHeight * 0.28;
    const total = Math.max(article.offsetTop + article.offsetHeight - start, 1);
    const passed = Math.min(Math.max(window.scrollY + start - article.offsetTop, 0), total);
    bar.style.setProperty("--progress", `${((passed / total) * 100).toFixed(2)}%`);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  function bind(_main, route) {
    if (route.name !== "post") {
      bar.classList.remove("is-active");
      return;
    }
    // 等路由渲染完成后再测量
    requestAnimationFrame(update);
  }

  update();

  return { bind };
}
