/* Area Map tab: upload a photo of the spot and draw/label group areas on it. */
window.AreaMap = (function () {
  let canvas, ctx, placeholder;
  let bgImage = null;       // HTMLImageElement of the background photo
  let data = { image: null, shapes: [] };
  let drawing = false;
  let currentShape = null;

  const MAX_W = 1200; // downscale uploads so they fit in storage comfortably

  function init() {
    canvas = document.getElementById("map-canvas");
    ctx = canvas.getContext("2d");
    placeholder = document.getElementById("canvas-placeholder");

    document.getElementById("map-image").addEventListener("change", onUpload);
    document.getElementById("undo-draw").addEventListener("click", undo);
    document.getElementById("clear-draw").addEventListener("click", clearShapes);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    Store.subscribe("map", (val) => {
      data = val && typeof val === "object" ? { image: val.image || null, shapes: val.shapes || [] } : { image: null, shapes: [] };
      loadBackground();
    });
  }

  function loadBackground() {
    if (!data.image) {
      bgImage = null;
      canvas.width = 900; canvas.height = 560;
      placeholder.style.display = "flex";
      redraw();
      renderLegend();
      return;
    }
    placeholder.style.display = "none";
    const img = new Image();
    img.onload = () => {
      bgImage = img;
      canvas.width = img.width;
      canvas.height = img.height;
      redraw();
    };
    img.src = data.image;
    renderLegend();
  }

  function onUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_W / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const tmp = document.createElement("canvas");
        tmp.width = w; tmp.height = h;
        tmp.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = tmp.toDataURL("image/jpeg", 0.82);
        // New photo starts a fresh set of drawings.
        Store.set("map", { image: dataUrl, shapes: [] });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Map a pointer event to canvas-internal coordinates.
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  }

  function currentStyle() {
    return {
      color: document.getElementById("draw-color").value,
      label: document.getElementById("draw-label").value.trim(),
      tool: document.getElementById("draw-tool").value
    };
  }

  function onDown(e) {
    if (!bgImage) return; // need a photo first
    e.preventDefault();
    const p = pos(e);
    const s = currentStyle();
    drawing = true;
    if (s.tool === "rect") {
      currentShape = { type: "rect", color: s.color, label: s.label, x: p.x, y: p.y, w: 0, h: 0 };
    } else {
      currentShape = { type: "pen", color: s.color, label: s.label, points: [{ x: p.x, y: p.y }] };
    }
  }

  function onMove(e) {
    if (!drawing || !currentShape) return;
    const p = pos(e);
    if (currentShape.type === "rect") {
      currentShape.w = p.x - currentShape.x;
      currentShape.h = p.y - currentShape.y;
    } else {
      currentShape.points.push({ x: p.x, y: p.y });
    }
    redraw();
  }

  function onUp() {
    if (!drawing) return;
    drawing = false;
    const shape = currentShape;
    currentShape = null;
    if (!shape) return;
    // Ignore accidental tiny clicks.
    if (shape.type === "rect" && Math.abs(shape.w) < 4 && Math.abs(shape.h) < 4) { redraw(); return; }
    if (shape.type === "pen" && shape.points.length < 2) { redraw(); return; }
    Store.update("map", (m) => {
      m = m && typeof m === "object" ? m : { image: data.image, shapes: [] };
      m.shapes = (m.shapes || []).concat([shape]);
      return m;
    });
  }

  function undo() {
    Store.update("map", (m) => {
      if (m && m.shapes && m.shapes.length) m.shapes = m.shapes.slice(0, -1);
      return m;
    });
  }

  function clearShapes() {
    Store.update("map", (m) => {
      if (m) m.shapes = [];
      return m;
    });
  }

  function drawShape(s) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color + "26"; // ~15% alpha
    if (s.type === "rect") {
      ctx.beginPath();
      ctx.rect(s.x, s.y, s.w, s.h);
      ctx.fill();
      ctx.stroke();
      if (s.label) label(s.label, s.color, Math.min(s.x, s.x + s.w) + 4, Math.min(s.y, s.y + s.h) + 16);
    } else if (s.type === "pen" && s.points.length) {
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      if (s.label) label(s.label, s.color, s.points[0].x + 4, s.points[0].y - 6);
    }
  }

  function label(text, color, x, y) {
    ctx.font = "bold 15px system-ui, sans-serif";
    const w = ctx.measureText(text).width;
    ctx.fillStyle = color;
    ctx.fillRect(x - 3, y - 14, w + 8, 19);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x + 1, y);
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    (data.shapes || []).forEach(drawShape);
    if (currentShape) drawShape(currentShape);
  }

  function renderLegend() {
    const ul = document.getElementById("map-legend");
    ul.innerHTML = "";
    const seen = new Set();
    (data.shapes || []).forEach((s) => {
      if (!s.label) return;
      const key = s.label + s.color;
      if (seen.has(key)) return;
      seen.add(key);
      const li = document.createElement("li");
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = s.color;
      const t = document.createElement("span");
      t.textContent = s.label;
      li.append(sw, t);
      ul.appendChild(li);
    });
  }

  return { init };
})();
