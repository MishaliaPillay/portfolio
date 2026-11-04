/**
 * Name type: splits the hero name into letters that react to the cursor
 * (line one thins out, line two stretches) and sizes the name to fill the column.
 */
(function () {
  "use strict";

  const hero = document.querySelector(".hero");
  const heading = hero && hero.querySelector("h1");
  if (!heading) return;

  const MAX_FONT_SIZE = 230;
  const REACH = 1.4; // influence radius, in multiples of the font size

  const letters = [];
  let pointerX = null;
  let pointerY = null;
  let queued = false;

  function splitLetters() {
    // screen readers get the whole name once instead of letter-by-letter
    heading.setAttribute("aria-label", heading.textContent.replace(/\s+/g, " ").trim());
    for (const line of heading.children) {
      const text = line.textContent;
      line.textContent = "";
      line.setAttribute("aria-hidden", "true");
      for (const ch of text) {
        const span = document.createElement("span");
        span.className = "ch";
        span.textContent = ch;
        line.appendChild(span);
        letters.push({ el: span, topLine: line.classList.contains("a") });
      }
    }
  }

  function fit() {
    // size the name so line one exactly fills the column, never overflowing
    heading.style.fontSize = "";
    const line = heading.querySelector(".a");
    const fontSize = parseFloat(getComputedStyle(heading).fontSize);
    heading.style.fontSize = Math.min((fontSize * heading.clientWidth) / line.offsetWidth, MAX_FONT_SIZE) + "px";
  }

  function influence(rect) {
    if (pointerX === null) return 0;
    const radius = parseFloat(heading.style.fontSize || 100) * REACH;
    const d = Math.hypot(pointerX - (rect.left + rect.width / 2), pointerY - (rect.top + rect.height / 2));
    const t = Math.max(0, 1 - d / radius);
    return t * t * (3 - 2 * t); // smoothstep
  }

  function update() {
    queued = false;
    // read all rects first, then write, to avoid layout thrashing
    const rects = letters.map((l) => l.el.getBoundingClientRect());
    letters.forEach((l, n) => {
      const t = influence(rects[n]);
      if (l.topLine) {
        l.el.style.fontVariationSettings = `"wdth" 150, "wght" ${Math.round(900 - 620 * t)}`;
        l.el.style.color = t > 0.35 ? "var(--accent)" : "";
      } else {
        l.el.style.fontVariationSettings = `"wdth" ${Math.round(60 + 90 * t)}, "wght" 900`;
      }
    });
  }

  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  splitLetters();

  hero.addEventListener("pointermove", (e) => {
    pointerX = e.clientX;
    pointerY = e.clientY;
    scheduleUpdate();
  });
  hero.addEventListener("pointerleave", () => {
    pointerX = pointerY = null;
    scheduleUpdate();
  });

  window.addEventListener("resize", fit);
  fit();
  if (document.fonts) document.fonts.ready.then(fit);
})();
