/* The circuit board. The Fields card grows until it fills the screen, then a
   board draws itself in: Physics is the CPU, and a trace runs from it to every
   other interest. One lime pulse at a time travels out along a trace. The whole
   board drifts slightly with the pointer, so it floats instead of sitting flat.
   Closes on the button, Escape or the browser's back button. */
(function () {
  "use strict";
  var board = document.getElementById("board");
  var dataEl = document.getElementById("board-data");
  if (!board || !dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var stage = board.querySelector(".board-stage");
  var read = board.querySelector(".board-read");
  var closeBtn = board.querySelector("[data-board-close]");
  var openers = Array.prototype.slice.call(document.querySelectorAll("[data-board-open]"));
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var FLOAT = "cubic-bezier(0.22, 1, 0.36, 1)";
  var MOVE = "cubic-bezier(0.65, 0, 0.35, 1)";
  var GROW = "cubic-bezier(0.5, 0, 0.12, 1)";

  var state = { open: false, opener: null, pushed: false, sel: null, mode: null, raf: 0 };
  var byId = {};
  [data.core].concat(data.nodes).forEach(function (n) { byId[n.id] = n; });

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function r(n) { return Math.round(n * 10) / 10; }

  /* ---------- layouts: one wide, one tall ---------- */
  var LAYOUTS = {
    wide: {
      w: 1600, h: 880, aspect: "xMidYMid meet", cpu: { x: 800, y: 420, s: 240, name: 46 },
      nodeW: 290, nodeH: 88, useShort: false,
      nodes: {
        ai:      { x: 300,  y: 150, pin: [740, 300], type: "vh" },
        writing: { x: 220,  y: 420, pin: [680, 420], type: "hh" },
        design:  { x: 300,  y: 690, pin: [740, 540], type: "vh" },
        maths:   { x: 1300, y: 150, pin: [860, 300], type: "vh" },
        games:   { x: 1380, y: 420, pin: [920, 420], type: "hh" },
        fintech: { x: 1300, y: 690, pin: [860, 540], type: "vh" }
      }
    },
    tall: {
      w: 900, h: 1220, aspect: "xMidYMin meet", cpu: { x: 450, y: 560, s: 200, name: 40 },
      nodeW: 250, nodeH: 84, useShort: true,
      nodes: {
        ai:      { x: 150, y: 170, pin: [375, 460], type: "vv" },
        maths:   { x: 450, y: 170, pin: [450, 460], type: "vv" },
        writing: { x: 750, y: 170, pin: [525, 460], type: "vv" },
        design:  { x: 150, y: 950, pin: [375, 660], type: "vv" },
        fintech: { x: 450, y: 950, pin: [450, 660], type: "vv" },
        games:   { x: 750, y: 950, pin: [525, 660], type: "vv" }
      }
    }
  };

  /* where a trace meets a node: the side facing the CPU */
  function entry(L, n) {
    var hw = L.nodeW / 2, hh = L.nodeH / 2;
    if (n.type === "vv") return { x: n.x, y: n.y + (n.pin[1] < n.y ? -hh : hh), side: n.pin[1] < n.y ? "top" : "bottom" };
    return { x: n.x + (n.pin[0] < n.x ? -hw : hw), y: n.y, side: n.pin[0] < n.x ? "left" : "right" };
  }

  /* PCB routing: straight runs joined by 45-degree chamfers */
  function route(p, t, type) {
    var px = p[0], py = p[1], tx = t.x, ty = t.y, pts = [[px, py]];
    var sx = tx > px ? 1 : -1, sy = ty > py ? 1 : -1, d, lead;
    if (type === "hh") {
      d = Math.abs(ty - py); lead = Math.max(0, (Math.abs(tx - px) - d) / 2);
      pts.push([px + sx * lead, py], [px + sx * (lead + d), ty]);
    } else if (type === "vv") {
      d = Math.abs(tx - px); lead = Math.max(0, (Math.abs(ty - py) - d) / 2);
      pts.push([px, py + sy * lead], [tx, py + sy * (lead + d)]);
    } else { /* vh: out vertically, into the node horizontally */
      d = Math.max(0, Math.min(Math.abs(tx - px) - 70, Math.abs(ty - py) - 40));
      pts.push([px, ty - sy * d], [px + sx * d, ty]);
    }
    pts.push([tx, ty]);
    var out = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      var a = out[out.length - 1];
      if (Math.abs(a[0] - pts[i][0]) > 0.5 || Math.abs(a[1] - pts[i][1]) > 0.5) out.push(pts[i]);
    }
    return { d: "M" + out.map(function (q) { return r(q[0]) + " " + r(q[1]); }).join(" L"), pts: out };
  }

  /* a small seeded random so the decoration is the same on every visit */
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function decoTraces(L, blocked) {
    var rand = rng(L.w * 7 + 3), out = [], tries = 0;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function free(x, y) {
      if (x < 30 || y < 30 || x > L.w - 30 || y > L.h - 30) return false;
      for (var i = 0; i < blocked.length; i++) {
        var b = blocked[i];
        if (x > b[0] - 26 && x < b[2] + 26 && y > b[1] - 26 && y < b[3] + 26) return false;
      }
      return true;
    }
    while (out.length < (L.w > 1000 ? 26 : 16) && tries < 900) {
      tries++;
      var x = Math.round(rand() * L.w / 20) * 20, y = Math.round(rand() * L.h / 20) * 20;
      if (!free(x, y)) continue;
      var pts = [[x, y]], dir = dirs[Math.floor(rand() * 4)], ok = true;
      var segs = 2 + Math.floor(rand() * 2);
      for (var s = 0; s < segs && ok; s++) {
        var len = 40 + Math.round(rand() * 5) * 20;
        var last = pts[pts.length - 1];
        var nx = last[0] + dir[0] * len, ny = last[1] + dir[1] * len;
        for (var k = 0; k <= 8; k++) if (!free(last[0] + (nx - last[0]) * k / 8, last[1] + (ny - last[1]) * k / 8)) ok = false;
        if (!ok) break;
        pts.push([nx, ny]);
        var c = 30 + Math.round(rand() * 2) * 20, turn = rand() < 0.5 ? 1 : -1;
        var dx = dir[0] ? dir[0] : turn, dy = dir[1] ? dir[1] : turn;
        var cx = nx + dx * c, cy = ny + dy * c;
        if (!free(cx, cy)) break;
        pts.push([cx, cy]);
        dir = dir[0] ? [0, dy] : [dx, 0];
      }
      if (pts.length < 3) continue;
      blocked.push([Math.min.apply(null, pts.map(function (p) { return p[0]; })), Math.min.apply(null, pts.map(function (p) { return p[1]; })),
        Math.max.apply(null, pts.map(function (p) { return p[0]; })), Math.max.apply(null, pts.map(function (p) { return p[1]; }))]);
      out.push(pts);
    }
    return out;
  }

  /* ---------- build the SVG ---------- */
  function build(mode) {
    var L = LAYOUTS[mode], c = L.cpu, half = c.s / 2, svg = [];
    var nodeIds = Object.keys(L.nodes);
    var blocked = [[c.x - half - 40, c.y - half - 40, c.x + half + 40, c.y + half + 40]];
    svg.push('<svg class="board-svg" viewBox="0 0 ' + L.w + " " + L.h + '" preserveAspectRatio="' + L.aspect + '" aria-hidden="false" role="group" aria-label="Circuit board of interests">');
    svg.push('<defs><pattern id="pcb-dots" width="40" height="40" patternUnits="userSpaceOnUse"><circle class="pcb-dot" cx="20" cy="20" r="1.6"/></pattern></defs>');

    /* back layer: dot grid, decorative traces, silkscreen, mounting holes */
    var back = ['<g class="pcb-layer" data-depth="0.45">', '<rect class="pcb-grid" x="-200" y="-200" width="' + (L.w + 400) + '" height="' + (L.h + 400) + '" fill="url(#pcb-dots)"/>'];

    /* main traces first, so decoration routes around them */
    var mains = [], i = 0;
    nodeIds.forEach(function (id) {
      var n = L.nodes[id], e = entry(L, n), rt = route(n.pin, e, n.type);
      rt.pts.forEach(function (p, k) { if (k) { var q = rt.pts[k - 1]; blocked.push([Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]); } });
      blocked.push([n.x - L.nodeW / 2 - 10, n.y - L.nodeH / 2 - 30, n.x + L.nodeW / 2 + 10, n.y + L.nodeH / 2 + 10]);
      /* a thin companion trace from the neighbouring pin, offset along the entry side */
      var off = (n.type === "vv" ? (n.pin[0] <= c.x ? -1 : 1) : (n.pin[1] <= c.y ? -1 : 1)) * (mode === "wide" ? 30 : 25);
      if (n.type === "vv" && n.pin[0] === c.x) off = mode === "wide" ? 30 : 25;
      var p2 = n.type === "vv" ? [n.pin[0] + off, n.pin[1]] : (n.type === "hh" ? [n.pin[0], n.pin[1] + off] : [n.pin[0] + off, n.pin[1]]);
      var e2 = n.type === "vv" ? { x: e.x + off * 0.9, y: e.y } : { x: e.x, y: e.y + (off > 0 ? 18 : -18) };
      var rt2 = route(p2, e2, n.type);
      mains.push({ id: id, n: n, e: e, d: rt.d, d2: rt2.d, e2: e2, td: 450 + i * 130 });
      i++;
    });

    decoTraces(L, blocked).forEach(function (pts, k) {
      var d = "M" + pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L"), td = 200 + (k % 9) * 90;
      var end = pts[pts.length - 1];
      back.push('<path class="pcb-deco pcb-trace thin" pathLength="1" d="' + d + '" style="--td:' + td + 'ms;stroke:var(--line);opacity:1"/>');
      back.push('<circle class="pcb-via" cx="' + end[0] + '" cy="' + end[1] + '" r="6" style="--td:' + (td + 900) + 'ms"/>');
      back.push('<circle class="pcb-via" cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="4" style="--td:' + (td + 200) + 'ms"/>');
    });
    var holes = [[44, 44], [L.w - 44, 44], [44, L.h - 44], [L.w - 44, L.h - 44]];
    back.push('<g class="pcb-decos">' + holes.map(function (h) { return '<circle class="pcb-hole" cx="' + h[0] + '" cy="' + h[1] + '" r="14"/><circle class="pcb-hole" cx="' + h[0] + '" cy="' + h[1] + '" r="7"/>'; }).join("") + "</g>");
    /* edge connector under the CPU */
    var fingers = [], fy = mode === "wide" ? L.h - 70 : c.y + half + 120, fx0 = c.x - 105;
    for (var f = 0; f < 8; f++) {
      var fx = fx0 + f * 30;
      fingers.push('<path class="pcb-trace thin" pathLength="1" style="--td:' + (900 + f * 60) + 'ms" d="M' + (c.x - 105 + f * 30) + " " + (c.y + half + 14) + " V" + (fy - 30) + '"/>');
      fingers.push('<rect class="pcb-via" x="' + (fx - 8) + '" y="' + (fy - 30) + '" width="16" height="44" rx="4" style="--td:' + (1500 + f * 60) + 'ms"/>');
    }
    if (mode === "wide") back.push(fingers.join(""));
    back.push('<g class="pcb-silks">' +
      '<text class="pcb-silk" x="' + (mode === "wide" ? c.x : 60) + '" y="' + (mode === "wide" ? L.h - 106 : L.h - 40) + '" text-anchor="' + (mode === "wide" ? "middle" : "start") + '">J1 · NABHYARAJ SONAGARA · REV 11.26</text>' +
      '<text class="pcb-silk" x="' + (L.w - 60) + '" y="78" text-anchor="end">AHMEDABAD · IN</text></g>');
    back.push("</g>");
    svg.push(back.join(""));

    /* front layer: traces, CPU, nodes */
    var front = ['<g class="pcb-layer" data-depth="1">'];
    mains.forEach(function (m) {
      front.push('<path class="pcb-trace thin" pathLength="1" d="' + m.d2 + '" style="--td:' + (m.td + 160) + 'ms"/>');
      front.push('<circle class="pcb-via" cx="' + r(m.e2.x) + '" cy="' + r(m.e2.y) + '" r="5" style="--td:' + (m.td + 1300) + 'ms"/>');
      front.push('<path class="pcb-trace main" data-trace="' + m.id + '" pathLength="1" d="' + m.d + '" style="--td:' + m.td + 'ms"/>');
      front.push('<circle class="pcb-end" data-end="' + m.id + '" cx="' + r(m.e.x) + '" cy="' + r(m.e.y) + '" r="8" style="--td:' + (m.td + 1150) + 'ms"/>');
    });

    /* CPU */
    var cpu = ['<g class="pcb-cpu-g"><g class="pcb-cpu" tabindex="0" role="button" data-node="physics" aria-label="Physics, the core">'];
    for (var k = -3; k <= 3; k++) {
      var o = k * (c.s / 8);
      cpu.push('<rect class="pcb-cpu-pin" data-pin="t' + k + '" x="' + (c.x + o - 5) + '" y="' + (c.y - half - 18) + '" width="10" height="20" rx="2"/>');
      cpu.push('<rect class="pcb-cpu-pin" data-pin="b' + k + '" x="' + (c.x + o - 5) + '" y="' + (c.y + half - 2) + '" width="10" height="20" rx="2"/>');
      cpu.push('<rect class="pcb-cpu-pin" data-pin="l' + k + '" x="' + (c.x - half - 18) + '" y="' + (c.y + o - 5) + '" width="20" height="10" rx="2"/>');
      cpu.push('<rect class="pcb-cpu-pin" data-pin="r' + k + '" x="' + (c.x + half - 2) + '" y="' + (c.y + o - 5) + '" width="20" height="10" rx="2"/>');
    }
    cpu.push('<rect class="pcb-cpu-body" x="' + (c.x - half) + '" y="' + (c.y - half) + '" width="' + c.s + '" height="' + c.s + '" rx="18"/>');
    cpu.push('<rect class="pcb-cpu-die" x="' + (c.x - half + 24) + '" y="' + (c.y - half + 24) + '" width="' + (c.s - 48) + '" height="' + (c.s - 48) + '" rx="10"/>');
    cpu.push('<circle class="pcb-cpu-mark" cx="' + (c.x - half + 42) + '" cy="' + (c.y - half + 42) + '" r="6"/>');
    cpu.push('<text class="pcb-cpu-name" x="' + c.x + '" y="' + (c.y + c.name * 0.32) + '" text-anchor="middle" style="font-size:' + c.name + 'px">' + esc(data.core.name) + "</text>");
    cpu.push('<text class="pcb-cpu-sub" x="' + c.x + '" y="' + (c.y + c.name * 0.32 + 32) + '" text-anchor="middle">' + esc(data.core.ref) + "</text>");
    cpu.push("</g></g>");
    front.push(cpu.join(""));

    /* nodes */
    mains.forEach(function (m) {
      var n = m.n, info = byId[m.id], w = L.nodeW, h = L.nodeH, x0 = n.x - w / 2, y0 = n.y - h / 2;
      var name = L.useShort ? info.short : info.name, fs = name.length > 16 ? 22 : 26;
      var g = ['<g class="pcb-node-g" style="--td:' + (m.td + 950) + 'ms"><g class="pcb-node" tabindex="0" role="button" data-node="' + m.id + '" aria-label="' + esc(info.name) + '">'];
      var side = m.e.side, pins = [];
      for (var q = -1.5; q <= 1.5; q++) {
        if (side === "left" || side === "right") {
          var px = side === "left" ? x0 - 10 : x0 + w - 2;
          pins.push('<rect class="pcb-node-pin" x="' + px + '" y="' + r(n.y + q * 16 - 3) + '" width="12" height="6" rx="1.5"/>');
        } else {
          var py = side === "top" ? y0 - 10 : y0 + h - 2;
          pins.push('<rect class="pcb-node-pin" x="' + r(n.x + q * 22 - 3) + '" y="' + py + '" width="6" height="12" rx="1.5"/>');
        }
      }
      g.push(pins.join(""));
      g.push('<rect class="pcb-node-body" x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" rx="14"/>');
      g.push('<text class="pcb-node-ref" x="' + (x0 + 20) + '" y="' + (y0 + 26) + '">' + esc(info.ref) + "</text>");
      g.push('<text class="pcb-node-name" x="' + (x0 + 20) + '" y="' + (y0 + 62) + '" style="font-size:' + fs + 'px">' + esc(name) + "</text>");
      g.push('<circle class="pcb-node-pin" cx="' + (x0 + w - 22) + '" cy="' + (y0 + 22) + '" r="4"/>');
      g.push("</g></g>");
      front.push(g.join(""));
    });

    front.push('<g class="pcb-pulse-g" style="opacity:0"><circle class="pcb-pulse-glow" r="16"/><circle class="pcb-pulse" r="6"/></g>');
    front.push("</g>");
    svg.push(front.join(""));
    svg.push("</svg>");
    stage.innerHTML = svg.join("");
    state.mode = mode;
    wire();
  }

  /* ---------- interaction ---------- */
  var els = {};
  function wire() {
    var s = stage.querySelector("svg");
    els = { svg: s, layers: Array.prototype.slice.call(s.querySelectorAll(".pcb-layer")), traces: {}, ends: {}, nodes: {}, pulse: s.querySelector(".pcb-pulse-g") };
    Array.prototype.forEach.call(s.querySelectorAll("[data-trace]"), function (p) { els.traces[p.getAttribute("data-trace")] = p; });
    Array.prototype.forEach.call(s.querySelectorAll("[data-end]"), function (p) { els.ends[p.getAttribute("data-end")] = p; });
    Array.prototype.forEach.call(s.querySelectorAll("[data-node]"), function (g) {
      var id = g.getAttribute("data-node");
      els.nodes[id] = g;
      g.addEventListener("click", function () { select(id); });
      g.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") select(id); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id); } });
      g.addEventListener("focus", function () { select(id); });
    });
    select(state.sel || "physics", true);
  }

  function linkHtml(l) {
    var x = l.external ? ' target="_blank" rel="noreferrer"' : "";
    return '<a class="kn-link" href="' + l.href + '"' + x + ">" + esc(l.label) + (l.external ? '<span class="kn-link-ext" aria-hidden="true">↗</span>' : "") + "</a>";
  }

  var swapTimer = 0;
  function select(id, instant) {
    if (state.sel === id && !instant) return;
    state.sel = id;
    var info = byId[id], core = id === "physics";
    els.svg.classList.toggle("has-sel", !core);
    Object.keys(els.traces).forEach(function (k) {
      els.traces[k].classList.toggle("sel", k === id);
      els.ends[k].classList.toggle("sel", k === id);
    });
    Object.keys(els.nodes).forEach(function (k) { els.nodes[k].classList.toggle("sel", k === id); });
    function fill() {
      read.innerHTML = '<div><span class="label">' + esc(info.ref) + (core ? "" : " · wired to Physics") + "</span><h3>" + esc(info.name) + "</h3></div><p>" + esc(info.text) + "</p>" +
        (info.links && info.links.length ? '<div class="row-actions">' + info.links.map(linkHtml).join("") + "</div>" : "");
      read.classList.remove("swap");
    }
    clearTimeout(swapTimer);
    if (instant || reduced) { fill(); return; }
    read.classList.add("swap");
    swapTimer = setTimeout(fill, 220);
  }

  /* ---------- the lime pulse and the floating drift ---------- */
  var pulse = { id: null, t0: 0, dur: 0, len: 0, wait: 0, idx: 0 };
  var px = 0, py = 0, tx = 0, ty = 0, hasPointer = false;
  function nextPulse(now) {
    var ids = Object.keys(els.traces);
    var id = state.sel && state.sel !== "physics" ? state.sel : ids[pulse.idx++ % ids.length];
    var path = els.traces[id];
    pulse.id = id; pulse.len = path.getTotalLength(); pulse.t0 = now;
    pulse.dur = Math.max(1500, pulse.len * 3.2);
  }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function loop(now) {
    if (!state.open) return;
    /* drift: follow the pointer slowly; with no pointer, breathe on its own */
    var gx = hasPointer ? tx : Math.sin(now / 4200) * 0.5, gy = hasPointer ? ty : Math.cos(now / 5100) * 0.5;
    px += (gx - px) * 0.035; py += (gy - py) * 0.035;
    els.layers.forEach(function (l) {
      var d = parseFloat(l.getAttribute("data-depth"));
      l.setAttribute("transform", "translate(" + r(-px * 18 * d) + " " + r(-py * 14 * d) + ")");
    });
    if (pulse.ready) {
      if (!pulse.id) {
        if (now >= pulse.wait) nextPulse(now);
      } else {
        var k = Math.min(1, (now - pulse.t0) / pulse.dur), path = els.traces[pulse.id];
        var pt = path.getPointAtLength(ease(k) * pulse.len);
        els.pulse.setAttribute("transform", "translate(" + r(pt.x) + " " + r(pt.y) + ")");
        els.pulse.style.opacity = k < 0.08 ? k / 0.08 : (k > 0.94 ? (1 - k) / 0.06 : 1);
        if (k >= 1) {
          var node = els.nodes[pulse.id];
          if (node) { node.classList.add("ping"); setTimeout(function () { node.classList.remove("ping"); }, 900); }
          pulse.id = null; pulse.wait = now + 700;
          els.pulse.style.opacity = 0;
        }
      }
    }
    state.raf = requestAnimationFrame(loop);
  }
  board.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    hasPointer = true;
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
  });

  /* ---------- open and close ---------- */
  function modeFor() { var s = stage.getBoundingClientRect(); return s.width / Math.max(1, s.height) > 1.05 ? "wide" : "tall"; }
  function cssVar(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
  function rectClip(el) {
    var b = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    return "inset(" + r(b.top) + "px " + r(W - b.right) + "px " + r(H - b.bottom) + "px " + r(b.left) + "px round 16px)";
  }
  var FULL = "inset(0px 0px 0px 0px round 0px)";
  var anim = null, drawTimer = 0, pulseTimer = 0;

  function open(opener, animate) {
    if (state.open) return;
    state.open = true; state.opener = opener || openers[0];
    var sbw = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden"; if (sbw) root.style.paddingRight = sbw + "px";
    board.hidden = false;
    board.classList.remove("drawn", "closing");
    build(modeFor());
    pulse.ready = false; pulse.id = null; hasPointer = false;
    var go = animate && !reduced && board.animate && state.opener;
    if (go) {
      if (anim) anim.cancel();
      anim = board.animate([
        { clipPath: rectClip(state.opener), backgroundColor: cssVar("--surface") },
        { clipPath: FULL, backgroundColor: cssVar("--ground") }
      ], { duration: 1400, easing: GROW });
      Array.prototype.forEach.call(board.querySelectorAll(".board-fade"), function (el, i) {
        el.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 1000, delay: 650 + i * 90, easing: FLOAT, fill: "backwards" });
      });
    }
    clearTimeout(drawTimer); clearTimeout(pulseTimer);
    drawTimer = setTimeout(function () { board.classList.add("drawn"); }, go ? 700 : 30);
    pulseTimer = setTimeout(function () { pulse.ready = !reduced; pulse.wait = 0; }, go ? 3200 : 600);
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(loop);
    setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, go ? 800 : 0);
  }

  function finish() {
    board.hidden = true;
    board.classList.remove("drawn", "closing");
    if (anim) { anim.cancel(); anim = null; }
    root.style.overflow = ""; root.style.paddingRight = "";
    state.open = false;
    cancelAnimationFrame(state.raf);
    if (state.opener) state.opener.focus({ preventScroll: true });
  }

  function doClose() {
    if (!state.open) return;
    clearTimeout(drawTimer); clearTimeout(pulseTimer);
    pulse.ready = false;
    if (reduced || !board.animate || !state.opener) { finish(); return; }
    board.classList.add("closing");
    if (anim) anim.cancel();
    anim = board.animate([
      { clipPath: FULL, backgroundColor: cssVar("--ground") },
      { clipPath: rectClip(state.opener), backgroundColor: cssVar("--surface") }
    ], { duration: 850, delay: 120, easing: MOVE, fill: "forwards" });
    anim.onfinish = finish;
  }

  function requestClose() {
    if (state.pushed) { state.pushed = false; history.back(); }
    else { doClose(); if (location.hash === "#fields") history.replaceState(null, "", location.pathname + location.search); }
  }

  openers.forEach(function (o) {
    o.addEventListener("click", function () {
      open(o, true);
      if (location.hash !== "#fields") { history.pushState({ board: 1 }, "", "#fields"); state.pushed = true; }
    });
  });
  closeBtn.addEventListener("click", requestClose);
  window.addEventListener("popstate", function () {
    if (location.hash === "#fields") { if (!state.open) open(openers[0], false); }
    else if (state.open) { state.pushed = false; doClose(); }
  });
  document.addEventListener("keydown", function (e) {
    if (!state.open) return;
    if (e.key === "Escape") { e.preventDefault(); requestClose(); return; }
    if (e.key === "Tab") {
      var f = Array.prototype.slice.call(board.querySelectorAll('button, a[href], [tabindex="0"]'));
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  var rz = 0;
  window.addEventListener("resize", function () {
    if (!state.open) return;
    clearTimeout(rz);
    rz = setTimeout(function () { var m = modeFor(); if (m !== state.mode) build(m); }, 150);
  });
  if (location.hash === "#fields" && openers.length) open(openers[0], false);
})();
