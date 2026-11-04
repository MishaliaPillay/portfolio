/**
 * Custom cursor: a pixel dot plus a lagging square frame.
 * Takes the brush colour over the paint grid and turns into a diamond on links.
 * Mouse only; touch devices keep their native behaviour.
 */
(function () {
  "use strict";

  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FOLLOW = reduceMotion ? 1 : 0.22; // 1 = no lag
  const root = document.documentElement;
  const tools = document.querySelector(".tools");
  const dot = createPart("cur-dot");
  const ring = createPart("cur-ring");

  let mouseX = -100;
  let mouseY = -100;
  let ringX = mouseX;
  let ringY = mouseY;

  function createPart(className) {
    const el = document.createElement("div");
    el.className = `${className} off`;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  function setState(name, on) {
    dot.classList.toggle(name, on);
    ring.classList.toggle(name, on);
  }

  function brushColor() {
    const active = tools && tools.querySelector('[aria-pressed="true"]');
    return active ? getComputedStyle(active).getPropertyValue("--c").trim() : "";
  }

  function onMove(e) {
    if (e.pointerType !== "mouse") return;
    mouseX = e.clientX;
    mouseY = e.clientY;

    const target = e.target;
    const overLink = Boolean(target.closest("a, button"));
    const overCanvas = !overLink && Boolean(target.closest(".hero"));

    let color = "";
    if (target.closest(".contact")) color = "var(--accent-ink)";
    else if (overCanvas) color = brushColor();

    if (color) root.style.setProperty("--cur", color);
    else root.style.removeProperty("--cur");

    setState("off", Boolean(target.closest("input, textarea")));
    setState("link", overLink);
    setState("paint", overCanvas);
    setState("erase", overCanvas && !color);
  }

  function follow() {
    ringX += (mouseX - ringX) * FOLLOW;
    ringY += (mouseY - ringY) * FOLLOW;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(follow);
  }

  root.classList.add("cc");
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", () => setState("down", true));
  window.addEventListener("pointerup", () => setState("down", false));
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) setState("off", true);
  });
  requestAnimationFrame(follow);
})();
