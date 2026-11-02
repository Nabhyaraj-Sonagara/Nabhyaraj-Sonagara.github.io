/* The Interests board. A green circuit board: Physics is the CPU, and every
   other interest is a part wired to it (GPU, RAM, SSD, LCD, PSU, card slot).
   On load the CPU boots, then one pulse leaves for every part at once; each
   trace stays lit behind it and each part powers on when the pulse arrives.
   Picking a part shows what it is and the work wired to it. */
(function () {
  "use strict";
  var stage = document.getElementById("pcb-stage");
  var dataEl = document.getElementById("pcb-data");
  if (!stage || !dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var bar = document.getElementById("pcb-bar");
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var byId = {};
  [data.core].concat(data.nodes).forEach(function (n) { byId[n.id] = n; });

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function r(n) { return Math.round(n * 10) / 10; }

  /* ---------- layouts ---------- */
  var LAYOUTS = {
    wide: {
      w: 1900, h: 880, aspect: "xMidYMid meet", cpu: { x: 950, y: 360, s: 240 }, fw: 300, fh: 150,
      nodes: {
        ai:      { x: 330,  y: 200, pin: [830, 318], type: "hh" },
        design:  { x: 330,  y: 600, pin: [830, 402], type: "hh" },
        maths:   { x: 1570, y: 200, pin: [1070, 318], type: "hh" },
        fintech: { x: 1570, y: 600, pin: [1070, 402], type: "hh" },
        writing: { x: 950,  y: 660, pin: [950, 480], type: "vv" }
      }
    },
    tall: {
      w: 900, h: 1460, aspect: "xMidYMid meet", cpu: { x: 450, y: 730, s: 220 }, fw: 240, fh: 120,
      nodes: {
        ai:      { x: 150, y: 250,  pin: [375, 620], type: "vv" },
        maths:   { x: 450, y: 250,  pin: [450, 620], type: "vv" },
        writing: { x: 750, y: 250,  pin: [525, 620], type: "vv" },
        design:  { x: 270, y: 1210, pin: [375, 840], type: "vv" },
        fintech: { x: 630, y: 1210, pin: [525, 840], type: "vv" }
      }
    }
  };

  function entry(L, n) {
    if (n.type === "vv") return { x: n.x, y: n.y + (n.pin[1] < n.y ? -L.fh / 2 : L.fh / 2), side: n.pin[1] < n.y ? "top" : "bottom" };
    return { x: n.x + (n.pin[0] < n.x ? -L.fw / 2 : L.fw / 2), y: n.y, side: n.pin[0] < n.x ? "left" : "right" };
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
    } else {
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

  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  /* ---------- the parts, drawn in a 300 x 150 box ---------- */
  function fan(cx, cy, size) {
    var b = [];
    for (var i = 0; i < 7; i++) b.push('<path class="p-blade" transform="translate(' + cx + " " + cy + ") rotate(" + r(i * 360 / 7) + ") scale(" + size + ')" d="M0 -7 C 15 -19 31 -22 39 -8 C 27 -6 15 0 6 6 Z"/>');
    return '<circle class="p-hole" cx="' + cx + '" cy="' + cy + '" r="' + r(44 * size) + '"/><g class="p-fan"><circle fill="none" cx="' + cx + '" cy="' + cy + '" r="' + r(42 * size) + '"/>' + b.join("") +
      '<circle class="p-hub" cx="' + cx + '" cy="' + cy + '" r="' + r(12 * size) + '"/></g>';
  }
  var PARTS = {
    GPU: function () {
      var f = [];
      for (var i = 0; i < 26; i++) if (i !== 7) f.push('<rect class="p-gold" x="' + (34 + i * 9) + '" y="128" width="5" height="18" rx="1"/>');
      return '<rect class="p-chip" x="0" y="6" width="300" height="122" rx="14"/>' +
        '<rect class="p-edge" x="10" y="16" width="280" height="102" rx="9"/>' +
        fan(82, 67, 1) + fan(218, 67, 1) +
        '<circle class="p-ring" cx="82" cy="67" r="44"/><circle class="p-ring" cx="218" cy="67" r="44"/>' +
        '<rect class="p-led p-led-bar" x="122" y="10" width="56" height="4" rx="2"/>' +
        '<text class="p-print" x="150" y="112" text-anchor="middle">GPU</text>' + f.join("");
    },
    RAM: function () {
      var g = [], c = [];
      for (var i = 0; i < 36; i++) if (i !== 17 && i !== 18) g.push('<rect class="p-gold" x="' + (8 + i * 8) + '" y="124" width="4" height="20" rx="1"/>');
      for (var k = 0; k < 8; k++) c.push('<rect class="p-chip" x="' + (12 + k * 36) + '" y="30" width="30" height="42" rx="3"/>' +
        '<rect class="p-led p-led-ram" style="--i:' + k + '" x="' + (17 + k * 36) + '" y="77" width="20" height="4" rx="2"/>');
      return '<rect class="p-sub" x="0" y="22" width="300" height="104" rx="6"/>' +
        '<circle class="p-cut" cx="0" cy="72" r="8"/><circle class="p-cut" cx="300" cy="72" r="8"/>' +
        c.join("") + g.join("");
    },
    SSD: function () {
      var f = [];
      for (var i = 0; i < 9; i++) if (i !== 3) f.push('<rect class="p-gold" x="0" y="' + (44 + i * 7) + '" width="18" height="4" rx="1"/>');
      return '<rect class="p-chip" x="16" y="40" width="270" height="70" rx="8"/>' + f.join("") +
        '<rect class="p-ctrl" x="36" y="52" width="46" height="46" rx="4"/>' +
        '<rect class="p-nand" x="96" y="50" width="72" height="50" rx="3"/><rect class="p-nand" x="180" y="50" width="72" height="50" rx="3"/>' +
        '<text class="p-print" x="132" y="80" text-anchor="middle">NAND</text><text class="p-print" x="216" y="80" text-anchor="middle">NAND</text>' +
        '<circle class="p-gold" cx="292" cy="75" r="11"/><circle class="p-hole" cx="292" cy="75" r="5"/>' +
        '<circle class="p-led p-led-blink" cx="264" cy="56" r="4"/>';
    },
    PSU: function () {
      return '<rect class="p-chip" x="8" y="4" width="284" height="142" rx="12"/>' + fan(100, 75, 1.28) +
        '<circle class="p-ring" cx="100" cy="75" r="56"/><circle class="p-ring" cx="100" cy="75" r="40"/><circle class="p-ring" cx="100" cy="75" r="24"/>' +
        '<path class="p-ring" d="M44 75 H156 M100 19 V131"/>' +
        '<rect class="p-switch" x="194" y="30" width="56" height="32" rx="7"/><rect class="p-rocker" x="199" y="35" width="24" height="22" rx="4"/>' +
        '<rect class="p-edge" x="190" y="78" width="64" height="44" rx="9"/>' +
        '<rect class="p-gold" x="205" y="92" width="6" height="16" rx="1"/><rect class="p-gold" x="219" y="92" width="6" height="16" rx="1"/><rect class="p-gold" x="233" y="92" width="6" height="16" rx="1"/>' +
        '<circle class="p-led" cx="274" cy="22" r="5"/><text class="p-print" x="274" y="138" text-anchor="end">12V</text>';
    },
    LCD: function () {
      var cols = ["#ff5b2e", "#d7ff3d", "#f2efe6", "#ffd6c4", "#6a2410", "#2b2b27", "#ffffff"], b = [], ln = [];
      for (var i = 0; i < 7; i++) b.push('<rect class="p-bar" style="--i:' + i + ";fill:" + cols[i] + '" x="' + r(14 + i * 208 / 7) + '" y="20" width="' + r(208 / 7 + 0.5) + '" height="78"/>');
      for (var k = 0; k < 4; k++) b.push('<rect class="p-bar" style="--i:' + (7 + k) + ";fill:" + ["#141412", "#ff5b2e", "#141412", "#d7ff3d"][k] + '" x="' + (14 + k * 52) + '" y="98" width="52" height="32"/>');
      for (var j = 0; j < 6; j++) ln.push('<line class="p-ribbon-l" x1="236" y1="' + (50 + j * 10) + '" x2="280" y2="' + (50 + j * 10) + '"/>');
      return '<rect class="p-chip" x="0" y="6" width="236" height="138" rx="12"/>' +
        '<rect class="p-screen" x="14" y="20" width="208" height="110" rx="4"/>' + b.join("") +
        '<rect class="p-glass" x="14" y="20" width="208" height="110" rx="4"/>' +
        '<rect class="p-ribbon" x="236" y="44" width="44" height="62"/>' + ln.join("") +
        '<rect class="p-chip" x="278" y="38" width="20" height="74" rx="3"/><circle class="p-led" cx="118" cy="137" r="3"/>';
    }
  };

  /* ---------- build the SVG ---------- */
  var state = { mode: null, sel: "physics", booted: false, raf: 0 };
  var els = {};

  function build(mode) {
    var L = LAYOUTS[mode], c = L.cpu, half = c.s / 2, ids = Object.keys(L.nodes), svg = [];
    var blocked = [[c.x - half - 50, c.y - half - 50, c.x + half + 50, c.y + half + 50],
      [10, 10, 90, 90], [L.w - 90, 10, L.w - 10, 90], [10, L.h - 90, 90, L.h - 10], [L.w - 90, L.h - 90, L.w - 10, L.h - 10],
      mode === "wide" ? [L.w / 2 - 330, 24, L.w / 2 + 330, 84] : [L.w / 2 - 330, L.h - 70, L.w / 2 + 330, L.h - 10]];
    var mains = ids.map(function (id, i) {
      var n = L.nodes[id], e = entry(L, n), rt = route(n.pin, e, n.type);
      rt.pts.forEach(function (p, k) { if (k) { var q = rt.pts[k - 1]; blocked.push([Math.min(p[0], q[0]) - 6, Math.min(p[1], q[1]) - 6, Math.max(p[0], q[0]) + 6, Math.max(p[1], q[1]) + 6]); } });
      var labelPad = mode === "wide" ? 100 : 96;
      blocked.push([n.x - L.fw / 2 - 64, n.y - L.fh / 2 - (e.side === "bottom" ? labelPad : 24), n.x + L.fw / 2 + 24, n.y + L.fh / 2 + (e.side === "bottom" ? 24 : labelPad)]);
      /* companion: a thinner parallel trace from the neighbouring pin */
      var off = (mode === "wide" ? 26 : 22) * (n.type === "vv" ? (n.pin[0] < c.x ? -1 : 1) : (n.pin[1] <= c.y ? -1 : 1));
      if (n.type === "vv" && n.pin[0] === c.x) off = 22;
      var p2 = n.type === "hh" ? [n.pin[0], n.pin[1] + off] : [n.pin[0] + off, n.pin[1]];
      var e2 = n.type === "vv" ? { x: e.x + off * 1.6, y: e.y + (n.pin[1] < n.y ? -34 : 34) } : { x: e.x + (n.pin[0] < n.x ? -34 : 34), y: e.y + (off > 0 ? 34 : -34) };
      return { id: id, n: n, e: e, d: rt.d, d2: route(p2, e2, n.type).d, e2: e2, i: i };
    });

    svg.push('<svg class="pcb-svg" viewBox="0 0 ' + L.w + " " + L.h + '" preserveAspectRatio="' + L.aspect + '">');
    svg.push('<defs><filter id="pcb-glow" filterUnits="userSpaceOnUse" x="-100" y="-100" width="' + (L.w + 200) + '" height="' + (L.h + 200) + '"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<filter id="pcb-glow-head" filterUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<pattern id="pcb-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1.4" class="pcb-dot"/></pattern></defs>');

    /* back layer: texture, copper under the mask, small parts, holes, silkscreen */
    svg.push('<defs><clipPath id="f-clip"><rect x="16" y="16" width="' + (L.w - 32) + '" height="' + (L.h - 32) + '" rx="36"/></clipPath>' +
      '<radialGradient id="f-fill" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#0b9a4b"/><stop offset=".6" stop-color="#088540"/><stop offset="1" stop-color="#066c34"/></radialGradient></defs>');
    svg.push('<rect class="f-panel" x="16" y="16" width="' + (L.w - 32) + '" height="' + (L.h - 32) + '" rx="36"/><g clip-path="url(#f-clip)">');
    var back = ['<g class="pcb-layer pcb-back" data-depth="0.4"><rect x="-200" y="-200" width="' + (L.w + 400) + '" height="' + (L.h + 400) + '" fill="url(#pcb-dots)"/>'];
    var rand = rng(L.w * 13 + 7);
    function free(x, y, m) {
      if (x < 40 || y < 40 || x > L.w - 40 || y > L.h - 40) return false;
      for (var i = 0; i < blocked.length; i++) { var b = blocked[i]; if (x > b[0] - m && x < b[2] + m && y > b[1] - m && y < b[3] + m) return false; }
      return true;
    }
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], made = 0, tries = 0;
    while (made < (mode === "wide" ? 30 : 20) && tries < 1500) {
      tries++;
      var x = Math.round(rand() * L.w / 20) * 20, y = Math.round(rand() * L.h / 20) * 20;
      if (!free(x, y, 16)) continue;
      var pts = [[x, y]], dir = dirs[Math.floor(rand() * 4)], ok = true;
      for (var s = 0; s < 2 + Math.floor(rand() * 2) && ok; s++) {
        var last = pts[pts.length - 1], len = 40 + Math.round(rand() * 5) * 20;
        var nx = last[0] + dir[0] * len, ny = last[1] + dir[1] * len;
        for (var k = 1; k <= 8; k++) if (!free(last[0] + (nx - last[0]) * k / 8, last[1] + (ny - last[1]) * k / 8, 12)) ok = false;
        if (!ok) break;
        pts.push([nx, ny]);
        var cl = 20 + Math.round(rand() * 2) * 20, turn = rand() < 0.5 ? 1 : -1;
        var dx = dir[0] || turn, dy = dir[1] || turn;
        if (!free(nx + dx * cl, ny + dy * cl, 12)) break;
        pts.push([nx + dx * cl, ny + dy * cl]);
        dir = dir[0] ? [0, dy] : [dx, 0];
      }
      if (pts.length < 3) continue;
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      blocked.push([Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)]);
      var end = pts[pts.length - 1];
      back.push('<path class="d-trace" d="M' + pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L") + '"/>' +
        '<circle class="d-via" cx="' + end[0] + '" cy="' + end[1] + '" r="7"/><circle class="d-via-h" cx="' + end[0] + '" cy="' + end[1] + '" r="3"/>' +
        '<circle class="d-via" cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="5"/>');
      made++;
    }
    /* scattered resistors and capacitors */
    for (var m = 0, t2 = 0; m < (mode === "wide" ? 22 : 14) && t2 < 900; t2++) {
      var sx = Math.round(rand() * L.w), sy = Math.round(rand() * L.h);
      if (!free(sx, sy, 26) || !free(sx + 34, sy, 14) || !free(sx - 20, sy - 22, 10)) continue;
      blocked.push([sx - 24, sy - 26, sx + 44, sy + 24]);
      var rot = rand() < 0.5 ? 0 : 90, cap = rand() < 0.4;
      back.push('<g transform="translate(' + sx + " " + sy + ") rotate(" + rot + ')"><rect class="' + (cap ? "smd-c" : "smd-r") + '" x="-11" y="-6" width="22" height="12" rx="2"/>' +
        '<rect class="p-gold" x="-14" y="-6" width="6" height="12" rx="1"/><rect class="p-gold" x="8" y="-6" width="6" height="12" rx="1"/></g>' +
        '<text class="pcb-silk-s" x="' + (sx + (rot ? 14 : -14)) + '" y="' + (sy + (rot ? 4 : -12)) + '">' + (cap ? "C" : "R") + (m + 3) + "</text>");
      m++;
    }
    [[50, 50], [L.w - 50, 50], [50, L.h - 50], [L.w - 50, L.h - 50]].forEach(function (h) {
      back.push('<circle class="p-gold" cx="' + h[0] + '" cy="' + h[1] + '" r="20"/><circle class="pcb-mhole" cx="' + h[0] + '" cy="' + h[1] + '" r="11"/>');
    });
    back.push('<text class="pcb-silk-l" x="' + (L.w / 2) + '" y="' + (mode === "wide" ? 60 : L.h - 30) + '" text-anchor="middle">NABHYARAJ-SONAGARA.GITHUB.IO · REV 11.26</text>');
    back.push("</g>");
    svg.push(back.join(""));

    /* front layer: traces, CPU, parts */
    var front = ['<g class="pcb-layer pcb-front" data-depth="1">'];
    mains.forEach(function (t) {
      front.push('<path class="t-thin" d="' + t.d2 + '"/><circle class="d-via" cx="' + r(t.e2.x) + '" cy="' + r(t.e2.y) + '" r="7"/><circle class="d-via-h" cx="' + r(t.e2.x) + '" cy="' + r(t.e2.y) + '" r="3"/>');
      front.push('<path class="t-base" d="' + t.d + '"/>');
      front.push('<path class="t-glow" data-glow="' + t.id + '" pathLength="1" d="' + t.d + '"/>');
      front.push('<path class="t-lit" data-trace="' + t.id + '" pathLength="1" d="' + t.d + '"/>');
    });

    /* CPU */
    var cpu = ['<g class="pcb-cpu" data-node="physics" tabindex="0" role="button" aria-label="Physics, the CPU">'];
    cpu.push('<rect class="p-cpu-glow" x="' + (c.x - half - 30) + '" y="' + (c.y - half - 30) + '" width="' + (c.s + 60) + '" height="' + (c.s + 60) + '" rx="38"/>');
    for (var q = -4; q <= 4; q++) {
      var o = q * (c.s / 10);
      cpu.push('<rect class="p-gold" x="' + (c.x + o - 4) + '" y="' + (c.y - half - 14) + '" width="8" height="16" rx="1.5"/><rect class="p-gold" x="' + (c.x + o - 4) + '" y="' + (c.y + half - 2) + '" width="8" height="16" rx="1.5"/>');
      cpu.push('<rect class="p-gold" x="' + (c.x - half - 14) + '" y="' + (c.y + o - 4) + '" width="16" height="8" rx="1.5"/><rect class="p-gold" x="' + (c.x + half - 2) + '" y="' + (c.y + o - 4) + '" width="16" height="8" rx="1.5"/>');
    }
    cpu.push('<rect class="p-chip" x="' + (c.x - half) + '" y="' + (c.y - half) + '" width="' + c.s + '" height="' + c.s + '" rx="18"/>');
    cpu.push('<rect class="p-ihs" x="' + (c.x - half + 22) + '" y="' + (c.y - half + 22) + '" width="' + (c.s - 44) + '" height="' + (c.s - 44) + '" rx="12"/>');
    cpu.push('<path class="p-gold" d="M' + (c.x - half + 10) + " " + (c.y - half + 10) + " h18 l-18 18 Z" + '"/>');
    cpu.push('<text class="p-cpu-name" x="' + c.x + '" y="' + r(c.y + c.s * 0.06) + '" text-anchor="middle" style="font-size:' + r(c.s * 0.19) + 'px">Physics</text>');
    cpu.push('<text class="p-cpu-sub" x="' + c.x + '" y="' + r(c.y + c.s * 0.06 + 34) + '" text-anchor="middle">' + esc(data.core.ref) + "</text>");
    cpu.push('<circle class="p-led p-led-cpu" cx="' + (c.x + half - 34) + '" cy="' + (c.y + half - 34) + '" r="5"/></g>');
    front.push(cpu.join(""));

    mains.forEach(function (t) {
      var n = t.n, info = byId[t.id], x0 = n.x - L.fw / 2, y0 = n.y - L.fh / 2, sc = L.fw / 300;
      var above = t.e.side === "bottom";
      var nameY = above ? y0 - 46 : y0 + L.fh + 46, refY = above ? y0 - 20 : y0 + L.fh + 72;
      if (mode === "tall") { nameY = above ? y0 - 44 : y0 + L.fh + 52; refY = above ? y0 - 16 : y0 + L.fh + 80; }
      var g = ['<g class="pcb-part" data-node="' + t.id + '" tabindex="0" role="button" aria-label="' + esc(info.name) + ", the " + esc(info.part) + '" style="--i:' + t.i + '">'];
      g.push('<rect class="p-court" x="' + (x0 - 14) + '" y="' + (y0 - 14) + '" width="' + (L.fw + 28) + '" height="' + (L.fh + 28) + '" rx="12"/>');
      g.push('<g transform="translate(' + x0 + " " + y0 + ") scale(" + sc + ')">' + PARTS[info.part]() + "</g>");
      g.push('<text class="p-name" x="' + x0 + '" y="' + nameY + '">' + esc(mode === "tall" ? info.short : info.name) + "</text>");
      g.push('<text class="p-ref" x="' + x0 + '" y="' + refY + '">' + esc(info.ref) + "</text>");
      g.push('<circle class="p-gold" cx="' + r(t.e.x) + '" cy="' + r(t.e.y) + '" r="11"/><circle class="d-via-h" cx="' + r(t.e.x) + '" cy="' + r(t.e.y) + '" r="4.5"/>');
      g.push("</g>");
      front.push(g.join(""));
    });
    front.push('<g class="t-heads"></g></g>');
    svg.push(front.join(""));
    svg.push("</g></svg>");
    var slices = [], N = 14;
    for (var si = 0; si < N; si++) {
      var f = si / (N - 1), col = si === 0 || si === N - 1 ? "#04542a" : (si === Math.floor(N / 2) ? "#c58b3a" : (f < 0.2 || f > 0.8 ? "#a39e74" : "#bdb78c"));
      slices.push('<div class="pcb-slice" style="--f:' + r(f - 0.5) + ";--c:" + col + '"></div>');
    }
    stage.innerHTML = '<div class="pcb-tilt"><div class="pcb-flip">' +
      '<div class="pcb-face pcb-face-front"><div class="pcb-plate"></div>' + svg.join("") + "</div>" + slices.join("") +
      '<div class="pcb-face pcb-face-back" aria-hidden="true"><div class="pcb-plate"></div>' + backSide(L, mode, mains) + "</div></div></div>";
    state.mode = mode;
    fitBoard();
    if (state.flipped) stage.classList.add("flipped");
    layoutSign();
    wire();
  }

  /* ---------- wiring and selection ---------- */
  function wire() {
    var s = stage.querySelector(".pcb-face-front svg");
    els = { svg: s, layers: [].slice.call(s.querySelectorAll(".pcb-layer")), lit: {}, glow: {}, parts: {}, heads: s.querySelector(".t-heads") };
    [].forEach.call(s.querySelectorAll("[data-trace]"), function (p) { els.lit[p.getAttribute("data-trace")] = p; });
    [].forEach.call(s.querySelectorAll("[data-glow]"), function (p) { els.glow[p.getAttribute("data-glow")] = p; });
    [].forEach.call(s.querySelectorAll("[data-node]"), function (g) {
      var id = g.getAttribute("data-node");
      els.parts[id] = g;
      g.addEventListener("click", function () { select(id, true); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id, true); } });
    });
    if (state.booted) { setLit(1); powerAll(); }
    mark(state.sel);
  }

  function setLit(k) {
    Object.keys(els.lit).forEach(function (id) {
      els.lit[id].style.strokeDashoffset = 1 - k;
      els.glow[id].style.strokeDashoffset = 1 - k;
    });
  }
  function powerAll() {
    els.svg.classList.add("booted");
    Object.keys(els.parts).forEach(function (id) { els.parts[id].classList.add("on"); });
  }

  function mark(id) {
    Object.keys(els.parts).forEach(function (k) { els.parts[k].classList.toggle("sel", k === id); });
    Object.keys(els.lit).forEach(function (k) {
      els.lit[k].classList.toggle("sel", k === id);
      els.glow[k].classList.toggle("sel", k === id);
    });
  }

  function chip(it) {
    var x = /^https?:/.test(it.href) ? ' target="_blank" rel="noreferrer"' : "";
    return '<a class="pcb-chip" href="' + it.href + '"' + x + "><span>" + esc(it.title) + "</span><em>" + esc(it.kind) + "</em></a>";
  }
  function fillBar(id) {
    var info = byId[id];
    bar.innerHTML = '<div class="pcb-bar-id"><span class="label">' + esc(info.ref) + "</span><h2>" + esc(info.name) + "</h2></div>" +
      '<p class="pcb-bar-text">' + esc(info.text) + "</p>" +
      '<div class="pcb-bar-work"><span class="label">' + (info.related.length ? "Wired to" : "Wired to nothing yet") + "</span>" +
      (info.related.length ? '<div class="pcb-chips">' + info.related.map(chip).join("") + "</div>" : "") + "</div>";
  }
  var swap = 0;
  function select(id, pulse) {
    var changed = state.sel !== id;
    state.sel = id;
    mark(id);
    if (changed) {
      clearTimeout(swap);
      if (reduced) fillBar(id);
      else { bar.classList.add("swap"); swap = setTimeout(function () { fillBar(id); bar.classList.remove("swap"); }, 200); }
    }
    if ((pulse || changed) && state.booted && !reduced && id !== "physics") send(id, false, 1300);
  }

  /* ---------- pulses ---------- */
  var heads = [];
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function send(id, back, dur) {
    var path = els.lit[id];
    if (!path) return;
    var c = document.createElementNS("http://www.w3.org/2000/svg", "g");
    c.setAttribute("class", "t-head" + (back ? " small" : ""));
    c.innerHTML = '<circle class="t-head-glow" r="' + (back ? 9 : 16) + '"/><circle class="t-head-core" r="' + (back ? 4 : 7) + '"/>';
    els.heads.appendChild(c);
    heads.push({ id: id, el: c, len: path.getTotalLength(), t0: performance.now(), dur: dur, back: back });
  }

  var px = 0, py = 0, tx = 0, ty = 0, hasPointer = false, nextPacket = 0, tiltEl = null;
  /* size the 3D board to the drawing, centred in the stage */
  function fitBoard() {
    var L = LAYOUTS[state.mode], W = stage.clientWidth, H = stage.clientHeight;
    var s = Math.min(W / L.w, H / L.h), bw = L.w * s, bh = L.h * s;
    tiltEl = stage.querySelector(".pcb-tilt");
    if (!tiltEl) return;
    tiltEl.style.width = r(bw) + "px"; tiltEl.style.height = r(bh) + "px";
    tiltEl.style.left = r((W - bw) / 2) + "px"; tiltEl.style.top = r((H - bh) / 2) + "px";
    stage.style.setProperty("--inset", r(16 * s) + "px");
    stage.style.setProperty("--rad", r(36 * s) + "px");
    stage.style.setProperty("--t", r(Math.max(8, Math.min(18, bw * 0.012))) + "px");
  }
  function loop(now) {
    if (!reduced) {
      var gx = hasPointer ? tx : Math.sin(now / 4600) * 0.4, gy = hasPointer ? ty : Math.cos(now / 5300) * 0.4;
      px += (gx - px) * 0.03; py += (gy - py) * 0.03;
      els.layers.forEach(function (l) {
        var d = parseFloat(l.getAttribute("data-depth"));
        l.setAttribute("transform", "translate(" + r(-px * 8 * d) + " " + r(-py * 6 * d) + ")");
      });
      if (tiltEl) tiltEl.style.transform = "rotateX(" + r(-py * 3.5) + "deg) rotateY(" + r(px * 4.5) + "deg)";
    }
    for (var i = heads.length - 1; i >= 0; i--) {
      var h = heads[i], k = Math.min(1, (now - h.t0) / h.dur), e = ease(k);
      var path = els.lit[h.id];
      if (!path) { h.el.remove(); heads.splice(i, 1); continue; }
      var pt = path.getPointAtLength((h.back ? 1 - e : e) * h.len);
      h.el.setAttribute("transform", "translate(" + r(pt.x) + " " + r(pt.y) + ")");
      h.el.style.opacity = k < 0.06 ? k / 0.06 : (k > 0.92 ? (1 - k) / 0.08 : 1);
      if (h.boot) setLit(e);
      if (k >= 1) {
        h.el.remove(); heads.splice(i, 1);
        if (h.boot) { setLit(1); powerAll(); state.booted = true; nextPacket = now + 1200; }
      }
    }
    if (state.booted && !reduced && now > nextPacket) {
      var ids = Object.keys(els.lit), id = ids[Math.floor(Math.random() * ids.length)];
      send(id, Math.random() < 0.5, 1600 + Math.random() * 900);
      nextPacket = now + 700 + Math.random() * 900;
    }
    state.raf = requestAnimationFrame(loop);
  }

  function boot() {
    stage.classList.add("go");
    if (reduced) { setLit(1); powerAll(); state.booted = true; return; }
    setTimeout(function () { els.parts.physics && els.parts.physics.classList.add("on"); }, 700);
    setTimeout(function () {
      var t0 = performance.now();
      Object.keys(els.lit).forEach(function (id, i) {
        send(id, false, 1900);
        if (i === 0) heads[heads.length - 1].boot = true;
        heads[heads.length - 1].t0 = t0;
      });
    }, 1150);
  }

  /* ---------- the back of the board ---------- */
  var HEART = "M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3.1 1.8-2 3.3-3.1 5.4-3.1 3.6 0 5.7 3.8 4.2 7.3C19.5 16.4 12 21 12 21z";
  function backSide(L, mode, mains) {
    var c = L.cpu, out = [], rand = rng(L.w * 31 + 11);
    out.push('<svg class="pcb-svg" viewBox="0 0 ' + L.w + " " + L.h + '" preserveAspectRatio="' + L.aspect + '">');
    out.push('<defs><clipPath id="b-clip"><rect x="16" y="16" width="' + (L.w - 32) + '" height="' + (L.h - 32) + '" rx="36"/></clipPath></defs>');
    out.push('<rect class="b-panel" x="16" y="16" width="' + (L.w - 32) + '" height="' + (L.h - 32) + '" rx="36"/><g clip-path="url(#b-clip)">');
    /* the same copper, seen from underneath: every trace mirrored */
    out.push('<g transform="translate(' + L.w + ' 0) scale(-1 1)">');
    mains.forEach(function (t) { out.push('<path class="b-trace" d="' + t.d + '"/><path class="b-trace thin" d="' + t.d2 + '"/>'); });
    /* through-hole solder joints where each part sits on the front */
    Object.keys(L.nodes).forEach(function (id) {
      var n = L.nodes[id], x0 = n.x - L.fw / 2, y1 = n.y + L.fh / 2 - 14;
      for (var k = 0; k < 10; k++) out.push('<circle class="b-joint" cx="' + r(x0 + 24 + k * (L.fw - 48) / 9) + '" cy="' + r(y1) + '" r="7"/>');
    });
    out.push("</g>");
    /* a few long runs on the back layer */
    for (var i = 0; i < (mode === "wide" ? 16 : 12); i++) {
      var y = 80 + Math.round(rand() * (L.h - 160) / 20) * 20, x = 80 + Math.round(rand() * (L.w - 160) / 20) * 20;
      var len = 120 + Math.round(rand() * 8) * 30, up = rand() < 0.5 ? -1 : 1, d;
      if (rand() < 0.5) d = "M" + x + " " + y + " h" + len + " l" + 30 + " " + 30 * up + " h" + Math.round(len / 2);
      else d = "M" + x + " " + y + " v" + Math.round(len / 2) + " l" + 30 * up + " 30 v" + Math.round(len / 3);
      out.push('<path class="b-run" d="' + d + '"/><circle class="b-joint" cx="' + x + '" cy="' + y + '" r="5"/>');
    }
    out.push("</g>");
    [[50, 50], [L.w - 50, 50], [50, L.h - 50], [L.w - 50, L.h - 50]].forEach(function (h) {
      out.push('<circle class="p-gold" cx="' + h[0] + '" cy="' + h[1] + '" r="20"/><circle class="pcb-mhole" cx="' + h[0] + '" cy="' + h[1] + '" r="11"/>');
    });
    /* the maker's mark, in the middle */
    var lines = mode === "wide" ? [["Made in Ahmedabad with", "♥", "by Claude and Nabhyaraj"]] : [["Made in Ahmedabad"], ["with", "♥", "by Claude"], ["and Nabhyaraj"]];
    var fs = mode === "wide" ? 64 : 62, lh = fs * 1.25, top = c.y - (lines.length - 1) * lh / 2;
    var plateW = mode === "wide" ? 1500 : 820, plateH = lines.length * lh + 90;
    out.push('<rect class="b-plate" x="' + (c.x - plateW / 2) + '" y="' + r(top - fs * 0.35 - 45) + '" width="' + plateW + '" height="' + r(plateH) + '" rx="22"/>');
    out.push('<g class="b-sign" data-fs="' + fs + '">');
    lines.forEach(function (ln, li) {
      var y = r(top + li * lh + fs * 0.35);
      out.push('<g class="b-line" data-y="' + y + '" data-cx="' + c.x + '">' + ln.map(function (part) {
        return part === "♥" ? '<g class="b-heart-g"><path class="b-heart" d="' + HEART + '"/></g>' : '<text class="b-text" y="' + y + '">' + esc(part) + "</text>";
      }).join("") + "</g>");
    });
    out.push("</g>");
    out.push('<text class="pcb-silk-l" x="' + c.x + '" y="' + r(top - fs * 0.35 - 70) + '" text-anchor="middle">BOTTOM LAYER · REV 11.26</text>');
    out.push('<text class="pcb-silk-l" x="' + c.x + '" y="' + r(top - fs * 0.35 - 45 + plateH + 44) + '" text-anchor="middle">CLICK TO FLIP BACK</text>');
    out.push("</svg>");
    return out.join("");
  }
  /* centre each line of the mark, leaving room for the heart between words */
  function layoutSign() {
    var sign = stage.querySelector(".b-sign");
    if (!sign) return;
    var fs = parseFloat(sign.getAttribute("data-fs")), gap = fs * 0.28, hs = fs * 0.9, widest = 0;
    [].forEach.call(sign.querySelectorAll(".b-line"), function (line) {
      var y = parseFloat(line.getAttribute("data-y")), cx = parseFloat(line.getAttribute("data-cx"));
      var items = [].slice.call(line.children), widths = items.map(function (el) {
        if (el.tagName.toLowerCase() === "text") { try { return el.getComputedTextLength(); } catch (e) { return el.textContent.length * fs * 0.5; } }
        return hs;
      });
      var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (items.length - 1), x = cx - total / 2;
      widest = Math.max(widest, total);
      items.forEach(function (el, i) {
        if (el.tagName.toLowerCase() === "text") el.setAttribute("x", r(x));
        else el.setAttribute("transform", "translate(" + r(x) + " " + r(y - hs * 0.82) + ") scale(" + r(hs / 24 * 100) / 100 + ")");
        x += widths[i] + gap;
      });
    });
    var plate = stage.querySelector(".b-plate"), mode = LAYOUTS[state.mode];
    if (plate && widest) {
      var w = Math.min(widest + fs * 1.6, mode.w - 120);
      plate.setAttribute("x", r(mode.cpu.x - w / 2)); plate.setAttribute("width", r(w));
    }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutSign);

  /* ---------- flipping: click empty board, or the hint ---------- */
  state.flipped = false;
  var flipAnim = null;
  function flip() {
    var el = stage.querySelector(".pcb-flip");
    if (!el) return;
    var from = state.flipped ? 180 : 0, to = state.flipped ? 0 : 180;
    state.flipped = !state.flipped;
    stage.classList.toggle("flipped", state.flipped);
    if (flipBtn) flipBtn.setAttribute("aria-pressed", state.flipped ? "true" : "false");
    if (reduced || !el.animate) return;
    if (flipAnim) flipAnim.cancel();
    flipAnim = el.animate([
      { transform: "rotateY(" + from + "deg)" },
      { transform: "rotateY(" + (from + to) / 2 + "deg) rotateX(8deg) scale(.84)", offset: 0.5 },
      { transform: "rotateY(" + to + "deg)" }
    ], { duration: 1300, easing: "cubic-bezier(0.65, 0, 0.35, 1)" });
  }
  /* A short tap or click on empty board flips it. Taps are read from pointer
     events, because phones do not reliably send a click for empty space
     inside a 3D-transformed SVG; the click handler covers everything else. */
  var tap = null, lastTap = 0;
  function onPart(t) { return !!(t && t.closest && t.closest("[data-node]")); }
  stage.addEventListener("pointerdown", function (e) {
    tap = { x: e.clientX, y: e.clientY, t: Date.now(), part: onPart(e.target) };
  });
  stage.addEventListener("pointerup", function (e) {
    var s = tap; tap = null;
    if (!s || s.part || onPart(e.target)) return;
    if (Math.abs(e.clientX - s.x) > 12 || Math.abs(e.clientY - s.y) > 12 || Date.now() - s.t > 600) return;
    lastTap = Date.now();
    flip();
  });
  stage.addEventListener("pointercancel", function () { tap = null; });
  stage.addEventListener("click", function (e) {
    if (Date.now() - lastTap < 800 || onPart(e.target)) return;
    flip();
  });
  var flipBtn = document.getElementById("pcb-flip-btn");
  if (flipBtn) flipBtn.addEventListener("click", flip);

  stage.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    hasPointer = true;
    var b = stage.getBoundingClientRect();
    tx = ((e.clientX - b.left) / b.width) * 2 - 1; ty = ((e.clientY - b.top) / b.height) * 2 - 1;
  });
  stage.addEventListener("pointerleave", function () { hasPointer = false; });

  function modeFor() { var b = stage.getBoundingClientRect(); return b.width / Math.max(1, b.height) > 1.05 ? "wide" : "tall"; }
  var rz = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { var m = modeFor(); if (m !== state.mode) { heads.forEach(function (h) { h.el.remove(); }); heads = []; state.booted = true; build(m); } else fitBoard(); }, 150);
  });

  build(modeFor());
  fillBar(state.sel);
  requestAnimationFrame(function () { boot(); state.raf = requestAnimationFrame(loop); });
})();
