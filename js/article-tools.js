function setCopyFeedback(button, text) {
  const original = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = original;
  button.textContent = text;
  window.clearTimeout(Number(button.dataset.feedbackTimer));
  const timer = window.setTimeout(() => {
    button.textContent = original;
    delete button.dataset.feedbackTimer;
  }, 1600);
  button.dataset.feedbackTimer = String(timer);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("copy failed");
}

export function createArticleTools() {
  let controller;

  function bind(main, route) {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;

    if (route.name !== "post") return;

    main.addEventListener("click", async (event) => {
      const copyButton = event.target.closest(".code-copy");
      if (copyButton) {
        const code = copyButton.closest(".code-block")?.querySelector("code");
        if (!code) return;
        try {
          await copyText(code.textContent || "");
          setCopyFeedback(copyButton, "已复制");
        } catch {
          setCopyFeedback(copyButton, "复制失败");
        }
        return;
      }

      const toggleButton = event.target.closest(".code-toggle");
      if (toggleButton) {
        const block = toggleButton.closest(".code-block");
        const pre = block?.querySelector("pre");
        if (!block || !pre) return;
        const collapsed = !block.classList.contains("is-collapsed");
        block.classList.toggle("is-collapsed", collapsed);
        pre.hidden = collapsed;
        toggleButton.setAttribute("aria-expanded", String(!collapsed));
        toggleButton.textContent = collapsed ? "展开" : "折叠";
        return;
      }

      const tocButton = event.target.closest(".toc-link");
      if (tocButton) {
        const heading = document.getElementById(tocButton.dataset.target || "");
        if (!heading) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        heading.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    }, { signal });

    const headings = [...main.querySelectorAll(".article-body h2[id], .article-body h3[id]")];
    const tocLinks = [...main.querySelectorAll(".toc-link")];
    if (!headings.length || !tocLinks.length) return;

    const updateActiveHeading = () => {
      const offset = 120;
      let active = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= offset) active = heading.id;
        else break;
      }
      tocLinks.forEach((link) => {
        const selected = link.dataset.target === active;
        link.classList.toggle("is-active", selected);
        if (selected) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    window.addEventListener("scroll", updateActiveHeading, { passive: true, signal });
    updateActiveHeading();
  }

  return { bind };
}
