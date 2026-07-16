export function createCardMotion() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  function bind(root = document) {
    if (reduceMotion.matches || !finePointer.matches) return;
    root.querySelectorAll(".post-card:not(.post-deck-card):not([data-card-motion])").forEach((card) => {
      card.dataset.cardMotion = "true";
      let raf = 0;

      const move = (event) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          card.style.setProperty("--card-x", `${(x * 100).toFixed(1)}%`);
          card.style.setProperty("--card-y", `${(y * 100).toFixed(1)}%`);
          card.style.setProperty("--card-rx", `${((0.5 - y) * 2.4).toFixed(2)}deg`);
          card.style.setProperty("--card-ry", `${((x - 0.5) * 2.8).toFixed(2)}deg`);
        });
      };

      const reset = () => {
        cancelAnimationFrame(raf);
        raf = 0;
        card.style.setProperty("--card-rx", "0deg");
        card.style.setProperty("--card-ry", "0deg");
      };

      card.addEventListener("pointermove", move, { passive: true });
      card.addEventListener("pointerleave", reset);
    });
  }

  return { bind };
}
