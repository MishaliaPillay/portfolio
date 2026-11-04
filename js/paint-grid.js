/**
 * Paint grid: the interactive pixel canvas behind the hero.
 * Hover leaves a fading glow, drag paints with the selected swatch,
 * clicks send ripples, and the toolbar can clear or save the drawing as a PNG.
 */
(function () {
  "use strict";

  const canvas = document.getElementById("turf");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const tools = hero.querySelector(".tools");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const RIPPLE_RADIUS = 14;
  const IDLE_RIPPLE_FRAMES = 260; // ~4s at 60fps
  const GLOW_DECAY = 0.025;
  const PAINT_ALPHA = 0.85;
  const SWATCHES = 4;

  let width = 0;
  let height = 0;
  let cellSize = 34;
  let cols = 0;
  let rows = 0;
  let paint = new Uint8Array(0); // 0 = empty, otherwise a swatch index
  let glow = new Float32Array(0); // transient hover / ripple light, 0..1
  let ripples = [];
  let brush = 1;
  let drawing = false;
  let lastCell = null;
  let seeded = false;
  let idleFrames = 0;
  let tileColor = "";
  let glowColor = "";
  let palette = [];

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    tileColor = s.getPropertyValue("--tile").trim();
    glowColor = s.getPropertyValue("--accent").trim();
    palette = [null];
    for (let n = 1; n <= SWATCHES; n++) palette.push(s.getPropertyValue(`--paint-${n}`).trim());
  }

  function inBounds(i, j) {
    return i >= 0 && j >= 0 && i < cols && j < rows;
  }

  function seed() {
    // a few scattered strokes so the canvas reads as a work in progress
    for (let k = 0; k < 6; k++) {
      const cx = Math.floor(Math.random() * cols);
      const cy = Math.floor(Math.random() * rows);
      const color = 1 + Math.floor(Math.random() * 3);
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          if (inBounds(cx + i, cy + j) && Math.random() > 0.55) paint[(cy + j) * cols + cx + i] = color;
        }
      }
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    width = r.width;
    height = r.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cellSize = width < 600 ? 26 : 34;

    const nextCols = Math.ceil(width / cellSize) + 1;
    const nextRows = Math.ceil(height / cellSize) + 1;
    const next = new Uint8Array(nextCols * nextRows);
    // keep the visitor's drawing when the viewport resizes (e.g. mobile URL bar)
    for (let j = 0; j < Math.min(rows, nextRows); j++) {
      for (let i = 0; i < Math.min(cols, nextCols); i++) next[j * nextCols + i] = paint[j * cols + i];
    }
    cols = nextCols;
    rows = nextRows;
    paint = next;
    glow = new Float32Array(cols * rows);

    if (!seeded) {
      seeded = true;
      seed();
    }
    readColors();
    draw();
  }

  function fillCell(i, j, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(i * cellSize + 1, j * cellSize + 1, cellSize - 2, cellSize - 2);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        fillCell(i, j, tileColor, 1);
        if (paint[k]) fillCell(i, j, palette[paint[k]], PAINT_ALPHA);
        if (glow[k] > 0.01) fillCell(i, j, glowColor, Math.min(glow[k], 1) * 0.8);
      }
    }
    ctx.globalAlpha = 1;
  }

  function addRipple(i, j) {
    if (!reduceMotion) ripples.push({ i, j, r: 0 });
  }

  function stepRipples() {
    for (const rp of ripples) {
      rp.r += 0.45;
      const reach = Math.ceil(rp.r) + 1;
      const strength = 0.7 * (1 - rp.r / RIPPLE_RADIUS);
      for (let a = -reach; a <= reach; a++) {
        for (let b = -reach; b <= reach; b++) {
          const i = rp.i + a;
          const j = rp.j + b;
          if (inBounds(i, j) && Math.abs(Math.hypot(a, b) - rp.r) < 0.6) {
            const k = j * cols + i;
            glow[k] = Math.max(glow[k], strength);
          }
        }
      }
    }
    ripples = ripples.filter((rp) => rp.r < RIPPLE_RADIUS);
  }

  function frame() {
    for (let k = 0; k < glow.length; k++) {
      if (glow[k] > 0) glow[k] = Math.max(0, glow[k] - GLOW_DECAY);
    }
    stepRipples();
    // ambient ripple now and then so the hero breathes when nobody's touching it
    if (++idleFrames > IDLE_RIPPLE_FRAMES) {
      idleFrames = 0;
      addRipple(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
    }
    draw();
    requestAnimationFrame(frame);
  }

  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / cellSize), Math.floor((e.clientY - r.top) / cellSize)];
  }

  function paintCell(i, j) {
    if (inBounds(i, j)) paint[j * cols + i] = brush;
  }

  function strokeTo(cell) {
    // fill the gap between pointer events so fast strokes stay continuous
    const [i0, j0] = lastCell || cell;
    const [i1, j1] = cell;
    const steps = Math.max(Math.abs(i1 - i0), Math.abs(j1 - j0), 1);
    for (let s = 0; s <= steps; s++) {
      paintCell(Math.round(i0 + ((i1 - i0) * s) / steps), Math.round(j0 + ((j1 - j0) * s) / steps));
    }
    lastCell = cell;
  }

  function lightAround(i, j) {
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        if (!inBounds(i + a, j + b)) continue;
        const k = (j + b) * cols + i + a;
        glow[k] = Math.max(glow[k], a || b ? 0.35 : 0.7);
      }
    }
  }

  function isControl(e) {
    return e.target.closest(".tools, a, button");
  }

  function savePng() {
    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "pixel-art-from-mishalia-pillay.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
  }

  hero.addEventListener("pointermove", (e) => {
    if (isControl(e)) return;
    const [i, j] = cellAt(e);
    if (drawing) strokeTo([i, j]);
    if (!reduceMotion) lightAround(i, j);
    idleFrames = 0;
    if (reduceMotion) draw();
  });

  hero.addEventListener("pointerdown", (e) => {
    if (isControl(e)) return;
    drawing = true;
    lastCell = null;
    const cell = cellAt(e);
    strokeTo(cell);
    addRipple(cell[0], cell[1]);
    if (reduceMotion) draw();
  });

  window.addEventListener("pointerup", () => (drawing = false));
  window.addEventListener("pointercancel", () => (drawing = false));

  tools.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    if (button.dataset.c !== undefined) {
      brush = Number(button.dataset.c);
      tools.querySelectorAll(".sw").forEach((sw) => sw.setAttribute("aria-pressed", String(sw === button)));
    } else if (button.dataset.act === "clear") {
      paint.fill(0);
      addRipple(Math.floor(cols / 2), Math.floor(rows / 2));
      draw();
    } else if (button.dataset.act === "save") {
      savePng();
    }
  });

  function onThemeChange() {
    readColors();
    draw();
  }

  window.addEventListener("resize", resize);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onThemeChange);
  new MutationObserver(onThemeChange).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  resize();
  if (!reduceMotion) requestAnimationFrame(frame);
})();
