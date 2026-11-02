/* Site text editor. Every page of the site runs, unchanged, inside a frame.
   Any text on it can be clicked and rewritten; changes are keyed by the
   original text, so one edit reaches every place that text appears (or just
   this page, if asked). Save writes edits.json into the artifact, which is
   what gets turned into a pull request. */
(function () {
  "use strict";
  var DATA = JSON.parse(document.getElementById("ed-data").textContent);
  var A = DATA.assets;
  var PAGES = {}; DATA.pages.forEach(function (p) { PAGES[p.path] = p; });
  var SVGNS = "http://www.w3.org/2000/svg";
  var LET = /[\p{L}\p{N}]/u;
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, IFRAME: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, INPUT: 1 };
  var LS_KEY = "site-editor-draft";
  var $ = function (id) { return document.getElementById(id); };
  var frame = $("ed-frame");

  var mode = "edit", current = "/", scope = "all";
  var saved = {}, draft = {}, canSave = false, loaded = false;
  var index = {};          // original text -> [paths it appears on]
  var cdoc = null, units = new WeakMap(), editing = null, obs = null, writing = false;

  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function hidden(n) { return n.nodeType === 1 && n.getAttribute("aria-hidden") === "true"; }

  /* ---------- finding the text on a page ---------- */
  function cleanText(el) {
    var s = "";
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) s += c.nodeValue;
        else if (c.nodeType === 1 && !hidden(c) && !SKIP[c.tagName.toUpperCase()]) walk(c);
      }
    })(el);
    return norm(s);
  }
  // The editable part of an element: everything except decorative (aria-hidden) children.
  function editableHtml(el) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('[aria-hidden="true"]'), function (n) { n.remove(); });
    Array.prototype.forEach.call(c.querySelectorAll("[contenteditable],[data-ed],[data-ed-x]"), function (n) { n.removeAttribute("contenteditable"); n.removeAttribute("data-ed"); n.removeAttribute("data-ed-x"); });
    return c.innerHTML;
  }
  function directText(el) {
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && LET.test(c.nodeValue)) return true;
    return false;
  }
  function skipEl(el) {
    return SKIP[el.tagName.toUpperCase()] || el.id === "ed-pop" || el.id === "ed-svg-input" || el.id === "toast" || (el.classList && el.classList.contains("kn-cursor"));
  }
  // Calls fn(el, kind) for every piece of text under node. kind: html | hero | svg.
  function scan(node, fn) {
    if (node.nodeType !== 1 || skipEl(node)) return;
    if (node.namespaceURI === SVGNS) {
      if (node.tagName === "text") fn(node, "svg");
      else Array.prototype.forEach.call(node.querySelectorAll("text"), function (t) { fn(t, "svg"); });
      return;
    }
    if (node.classList.contains("kn-hero")) return fn(node, "hero");
    if (directText(node)) return fn(node, "html");
    for (var c = node.firstElementChild; c; c = c.nextElementSibling) scan(c, fn);
  }
  function textOf(el, kind) {
    if (kind === "hero") return norm(el.getAttribute("aria-label"));
    if (kind === "svg") return norm(el.textContent);
    return cleanText(el);
  }

  /* ---------- where each piece of text appears, across all pages ---------- */
  function buildIndex() {
    var parser = new DOMParser();
    DATA.pages.forEach(function (p) {
      var d = parser.parseFromString(p.html, "text/html");
      var add = function (t) { if (!t || !LET.test(t)) return; var l = index[t] || (index[t] = []); if (l.indexOf(p.path) < 0) l.push(p.path); };
      scan(d.body, function (el, kind) { add(textOf(el, kind)); });
      add(norm(d.title));
      var m = d.querySelector('meta[name="description"]'); if (m) add(norm(m.getAttribute("content")));
      var j = d.getElementById("pcb-data");
      if (j) { try { (function walk(v) { if (typeof v === "string") add(norm(v)); else if (v && typeof v === "object") for (var k in v) if (k !== "href" && k !== "id") walk(v[k]); })(JSON.parse(j.textContent)); } catch (e) {} }
      p.title = norm(d.title); p.desc = m ? norm(m.getAttribute("content")) : "";
    });
  }
  function pagesFor(text) { return index[text] || [current]; }

  /* ---------- edits ---------- */
  function keyAll(text) { return "a:" + text; }
  function keyPage(path, text) { return "p:" + path + "\n" + text; }
  function lookup(text, path) { return draft[keyPage(path || current, text)] || draft[keyAll(text)] || null; }

  /* ---------- the page frame ---------- */
  var ED_CSS = [
    "html.ed-edit.kn-cursor-on, html.ed-edit.kn-cursor-on * { cursor: auto !important; }",
    "html.ed-edit .kn-cursor { display: none !important; }",
    "html.ed-edit [data-ed='1'], html.ed-edit.kn-cursor-on [data-ed='1'], html.ed-edit.kn-cursor-on [data-ed='1'] * { cursor: text !important; }",
    "html.ed-edit [data-ed='1']:hover { outline: 2px dashed rgba(215,255,61,.75); outline-offset: 3px; border-radius: 3px; }",
    "html.ed-edit[data-theme='light'] [data-ed='1']:hover { outline-color: rgba(207,53,9,.7); }",
    "html.ed-edit [data-ed-x] { outline: 1.5px dotted rgba(255,91,46,.9); outline-offset: 3px; border-radius: 3px; }",
    "html.ed-edit text[data-ed='1']:hover { outline: none; fill: #d7ff3d !important; }",
    "[data-ed][contenteditable] { outline: 2px solid #d7ff3d !important; outline-offset: 4px; background: rgba(215,255,61,.10); border-radius: 3px; }",
    "html[data-theme='light'] [data-ed][contenteditable] { outline-color: #cf3509 !important; background: rgba(255,91,46,.08); }",
    "#ed-pop { position: absolute; z-index: 2147483646; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; max-width: min(560px, calc(100vw - 24px)); padding: 7px 8px 7px 12px; border-radius: 12px; background: #0e0e0c; color: #f4f1ea; border: 1px solid #3a3a33; box-shadow: 0 10px 28px rgba(0,0,0,.4); font: 500 12px/1.3 'JetBrains Mono', ui-monospace, monospace; letter-spacing: .01em; text-transform: none; }",
    "#ed-pop[hidden] { display: none; }",
    "#ed-pop .k { color: #a19d92; }",
    "#ed-pop .seg { display: inline-flex; background: #1a1a17; border: 1px solid #34342d; border-radius: 999px; padding: 2px; }",
    "#ed-pop button { font: inherit; border: 0; background: none; color: #a19d92; border-radius: 999px; padding: 4px 10px; cursor: pointer !important; }",
    "#ed-pop button.on { background: #d7ff3d; color: #0e0e0c; font-weight: 600; }",
    "#ed-svg-input { position: fixed; z-index: 2147483647; font: 600 14px 'JetBrains Mono', ui-monospace, monospace; padding: 6px 10px; border-radius: 8px; border: 2px solid #d7ff3d; background: #0e0e0c; color: #f4f1ea; min-width: 140px; }"
  ].join("\n");

  function compose(p) {
    var h = p.html;
    h = h.replace(/<link rel="icon"[^>]*>\n?/, "");
    h = h.replace(/<link rel="stylesheet" href="\/assets\/kinetic\.css[^"]*">/, function () { return "<style>" + A["kinetic.css"] + "</style>"; });
    h = h.replace('try{t=localStorage.getItem("theme")}catch(e){}', function () { return 'try{t=parent.__edTheme}catch(e){}'; });
    h = h.replace(/<script src="\/assets\/([\w.-]+)\?v=[^"]*" defer><\/script>/g, function (m, name) {
      var js = (A[name] || "").replace(/<\/script/gi, "<\\/script");
      var pre = name === "site.js" ? "<script>try{parent.__edWire(document)}catch(e){}<\/script>\n" : "";
      return pre + "<script>" + js + "<\/script>";
    });
    h = h.replace("</head>", function () { return "<style id=\"ed-style\">" + ED_CSS + "</style></head>"; });
    return h;
  }

  window.__edTheme = (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
  try { var st = localStorage.getItem("site-editor-theme"); if (st === "light" || st === "dark") window.__edTheme = st; } catch (e) {}

  function slugFor(path) { return path === "/" ? "home" : path === "/404" ? "not-found" : path.replace(/^\/|\/$/g, "").replace(/\//g, "-"); }
  function pathFor(slug) { for (var k in PAGES) if (slugFor(k) === slug) return k; return null; }

  function go(path, hash) {
    if (!PAGES[path]) return;
    if (editing) commit(editing);
    current = path;
    $("ed-page").value = path;
    try { history.replaceState(null, "", "#" + slugFor(path)); } catch (e) {}
    pendingHash = hash || "";
    frame.srcdoc = compose(PAGES[path]);
    closeDrawers();
  }
  var pendingHash = "";

  // Called from inside the frame, before the site's own scripts run.
  window.__edWire = function (d) {
    cdoc = d; units = new WeakMap(); editing = null;
    d.documentElement.classList.toggle("ed-edit", mode === "edit");
    var pop = d.createElement("div"); pop.id = "ed-pop"; pop.hidden = true; d.body.appendChild(pop);
    scan(d.body, register);
    applyMeta();
    d.addEventListener("click", onClick, true);
    d.addEventListener("keydown", onKey, true);
    d.addEventListener("focusout", function (e) { if (editing && e.target === editing) commit(editing); }, true);
    new MutationObserver(function () { window.__edTheme = d.documentElement.getAttribute("data-theme") || window.__edTheme; try { localStorage.setItem("site-editor-theme", window.__edTheme); } catch (e) {} })
      .observe(d.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    obs = new MutationObserver(onMutate);
    obs.observe(d.body, { childList: true, subtree: true });
  };
  frame.addEventListener("load", function () {
    if (!cdoc || cdoc !== frame.contentDocument) { try { window.__edWire(frame.contentDocument); } catch (e) { say("This view blocked the page frame, so nothing can be edited here.", true); return; } }
    if (pendingHash) { var t = cdoc.getElementById(pendingHash.slice(1)); if (t) t.scrollIntoView(); }
  });

  function register(el, kind) {
    if (units.has(el)) return;
    var text = textOf(el, kind);
    if (!text || !LET.test(text)) return;
    var info = { kind: kind, text: text, html: kind === "html" ? editableHtml(el) : esc(text), mirror: kind === "html" && !!el.closest('[aria-hidden="true"]') };
    if (kind === "hero") { var w = el.querySelector(".kn-hero-hl"); info.hl = w ? w.textContent.replace(/[^A-Za-z0-9'À-ɏ-]/g, "").toLowerCase() : null; }
    units.set(el, info);
    el.setAttribute("data-ed", info.mirror ? "m" : "1");
    apply(el);
  }

  function apply(el) {
    var info = units.get(el); if (!info || el === editing) return;
    var e = lookup(info.text);
    writing = true;
    if (info.kind === "hero") setHero(el, info, e ? e.text : info.text);
    else if (info.kind === "svg") { var t = e ? e.text : info.text; if (el.textContent !== t) el.textContent = t; }
    else setHtml(el, e ? e.html : info.html);
    if (e) el.setAttribute("data-ed-x", ""); else el.removeAttribute("data-ed-x");
    if (obs) obs.takeRecords();
    writing = false;
  }
  function setHtml(el, html) {
    if (editableHtml(el) === html) return;
    var vis = Array.prototype.filter.call(el.childNodes, function (k) { return !hidden(k); });
    var t = el.ownerDocument.createElement("template"); t.innerHTML = html;
    if (vis.length) el.insertBefore(t.content, vis[0]); else el.appendChild(t.content);
    vis.forEach(function (k) { k.remove(); });
  }
  function setHero(el, info, text) {
    if (el.getAttribute("aria-label") === text && el.querySelector(".kn-hero-word")) return;
    var i = 0;
    el.innerHTML = text.split(" ").map(function (w) {
      var bare = w.replace(/[^A-Za-z0-9'À-ɏ-]/g, "").toLowerCase();
      var chars = Array.from(w).map(function (ch) { return '<span class="kn-hero-mask"><span class="kn-hero-ch" style="--i:' + (i++) + '">' + esc(ch) + "</span></span>"; }).join("");
      return '<span class="kn-hero-word' + (info.hl && bare === info.hl ? " kn-hero-hl" : "") + '" aria-hidden="true">' + chars + "</span>";
    }).join(" ");
    el.setAttribute("aria-label", text);
  }
  function applyAll() {
    if (!cdoc) return;
    scan(cdoc.body, function (el) { if (units.has(el)) apply(el); });
    applyMeta();
  }
  function applyMeta() {
    if (!cdoc) return;
    var p = PAGES[current], t = lookup(p.title), d = lookup(p.desc);
    cdoc.title = t ? t.text : p.title;
    var m = cdoc.querySelector('meta[name="description"]'); if (m) m.setAttribute("content", d ? d.text : p.desc);
  }

  // Scripts on the page add text later (the circuit board, its readout). Pick it up as it appears.
  function onMutate(list) {
    if (writing) return;
    list.forEach(function (r) {
      var tgt = r.target;
      if (tgt.nodeType === 1 && units.has(tgt) && tgt !== editing) {
        var info = units.get(tgt), now = textOf(tgt, info.kind), e = lookup(info.text);
        if (now !== (e ? e.text : info.text)) { units.delete(tgt); register(tgt, info.kind); }
        return;
      }
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType === 3 && tgt.nodeType === 1 && !inUnit(tgt)) { if (tgt.namespaceURI === SVGNS && tgt.tagName === "text") register(tgt, "svg"); else if (directText(tgt)) register(tgt, "html"); }
        else if (n.nodeType === 1 && !inUnit(n.parentNode)) scan(n, register);
      });
    });
  }
  function inUnit(n) { for (; n && n.nodeType === 1; n = n.parentNode) if (units.has(n)) return true; return false; }
  function unitFor(n) { for (; n && n.nodeType === 1; n = n.parentNode) if (units.has(n)) return n; return null; }

  /* ---------- editing ---------- */
  function onClick(e) {
    var d = cdoc, a = e.target.closest && e.target.closest("a[href]");
    if (e.target.closest && e.target.closest("#ed-pop")) return;
    if (mode === "browse") {
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) === "#") return;
      if (href.charAt(0) === "/" && href.charAt(1) !== "/") {
        var u = new URL(href, "https://site.invalid"), p = u.pathname;
        if (p === "/404.html") p = "/404";
        if (p === "/research/") p = "/interests/research/";
        if (PAGES[p]) { e.preventDefault(); e.stopPropagation(); go(p, u.hash); }
        else { e.preventDefault(); say("That page isn't part of the editor."); }
      }
      return;
    }
    var el = unitFor(e.target);
    if (el && editing === el) { e.preventDefault(); e.stopPropagation(); return; }
    if (a) { e.preventDefault(); e.stopPropagation(); }   // links don't navigate while editing
    if (!el) return;                                       // other buttons (theme, board) still work
    var info = units.get(el);
    if (info.mirror) return;
    e.preventDefault(); e.stopPropagation();
    start(el, e.clientX, e.clientY);
  }

  function start(el, x, y) {
    if (editing) commit(editing);
    var info = units.get(el);
    var e = lookup(info.text);
    scope = draft[keyPage(current, info.text)] ? "page" : "all";
    info.before = e ? clone(e) : null;
    if (info.kind === "svg") return startSvg(el, info);
    editing = el;
    if (info.kind === "hero") { el.textContent = el.getAttribute("aria-label"); }
    Array.prototype.forEach.call(el.querySelectorAll('[aria-hidden="true"]'), function (n) { n.contentEditable = "false"; });
    try { el.contentEditable = "plaintext-only"; } catch (err) { el.contentEditable = "true"; }
    if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    el.focus({ preventScroll: true });
    placeCaret(el, x, y);
    showPop(el, info);
  }
  function placeCaret(el, x, y) {
    var d = cdoc, sel = d.getSelection(), r = null;
    if (x != null) {
      if (d.caretRangeFromPoint) r = d.caretRangeFromPoint(x, y);
      else if (d.caretPositionFromPoint) { var cp = d.caretPositionFromPoint(x, y); if (cp) { r = d.createRange(); r.setStart(cp.offsetNode, cp.offset); } }
    }
    if (!r || !el.contains(r.startContainer)) { r = d.createRange(); r.selectNodeContents(el); r.collapse(false); }
    sel.removeAllRanges(); sel.addRange(r);
  }

  function showPop(el, info) {
    var pop = cdoc.getElementById("ed-pop"); if (!pop) return;
    var where = pagesFor(info.text), n = where.length;
    var html = "";
    if (n > 1) {
      html += '<span class="k">On ' + n + " pages · change</span>" +
        '<span class="seg"><button type="button" data-s="all" class="' + (scope === "all" ? "on" : "") + '">everywhere</button>' +
        '<button type="button" data-s="page" class="' + (scope === "page" ? "on" : "") + '">this page only</button></span>';
    }
    html += '<span class="k">Enter keeps · Esc undoes</span>';
    pop.innerHTML = html;
    pop.hidden = false;
    Array.prototype.forEach.call(pop.querySelectorAll("button"), function (b) {
      b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation(); scope = b.getAttribute("data-s");
        Array.prototype.forEach.call(pop.querySelectorAll("button"), function (o) { o.classList.toggle("on", o === b); });
      });
    });
    var r = el.getBoundingClientRect(), w = cdoc.defaultView;
    var top = r.top + w.scrollY - pop.offsetHeight - 12;
    if (r.top - pop.offsetHeight - 12 < 8) top = r.bottom + w.scrollY + 12;
    var left = Math.max(8, Math.min(r.left + w.scrollX, w.scrollX + w.innerWidth - pop.offsetWidth - 12));
    pop.style.top = top + "px"; pop.style.left = left + "px";
  }
  function hidePop() { var pop = cdoc && cdoc.getElementById("ed-pop"); if (pop) pop.hidden = true; }

  function onKey(e) {
    if (!editing) return;
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); editing.blur(); }
    else if (e.key === "Escape") { e.preventDefault(); cancel(editing); }
  }
  function finish(el) {
    el.removeAttribute("contenteditable");
    Array.prototype.forEach.call(el.querySelectorAll("[contenteditable]"), function (n) { n.removeAttribute("contenteditable"); });
    if (editing === el) editing = null;
    hidePop();
    var s = cdoc.getSelection(); if (s) s.removeAllRanges();
  }
  function cancel(el) {
    var info = units.get(el);
    finish(el);
    if (info.kind === "hero") el.removeAttribute("aria-label");
    apply(el);
  }
  function commit(el) {
    var info = units.get(el); if (!info) return;
    var text = info.kind === "hero" ? norm(el.textContent) : cleanText(el);
    var html = info.kind === "hero" ? esc(text) : editableHtml(el);
    finish(el);
    if (info.kind === "hero") el.removeAttribute("aria-label");
    setEdit(info.text, text, html, info.html);
    applyAll();
  }
  function setEdit(was, text, html, wasHtml, isMeta) {
    var kp = keyPage(current, was), ka = keyAll(was);
    var key = scope === "page" ? kp : ka;
    delete draft[scope === "page" ? ka : kp];
    if (scope === "all") delete draft[kp];
    var unchanged = text === was && (html === wasHtml || html === esc(was));
    if (unchanged) delete draft[key];
    else draft[key] = { was: was, text: text, html: html, wasHtml: wasHtml, scope: scope, page: scope === "page" ? current : undefined, pages: pagesFor(was), meta: isMeta || undefined };
    if (draft[key] && draft[key].page === undefined) delete draft[key].page;
    if (draft[key] && !draft[key].meta) delete draft[key].meta;
    changed();
  }

  /* svg labels: a small input over the label */
  function startSvg(el, info) {
    var d = cdoc, inp = d.createElement("input"); inp.id = "ed-svg-input"; inp.type = "text";
    var e = lookup(info.text); inp.value = e ? e.text : info.text;
    var r = el.getBoundingClientRect();
    inp.style.left = Math.max(8, r.left - 8) + "px"; inp.style.top = Math.max(8, r.top - 8) + "px";
    d.body.appendChild(inp); inp.focus(); inp.select();
    editing = inp; units.set(inp, info);
    showPop(inp, info);
    var done = false;
    function end(keep) {
      if (done) return; done = true;
      var v = norm(inp.value);
      units.delete(inp); editing = null; inp.remove(); hidePop();
      if (keep) { setEdit(info.text, v, esc(v), info.html); applyAll(); }
    }
    inp.addEventListener("keydown", function (ev) {
      ev.stopPropagation();
      if (ev.key === "Enter") { ev.preventDefault(); end(true); }
      else if (ev.key === "Escape") { ev.preventDefault(); end(false); }
    });
    inp.addEventListener("blur", function () { end(true); });
  }

  /* ---------- toolbar ---------- */
  function setMode(m) {
    if (editing) commit(editing);
    mode = m;
    $("ed-mode-edit").setAttribute("aria-pressed", String(m === "edit"));
    $("ed-mode-browse").setAttribute("aria-pressed", String(m === "browse"));
    if (cdoc) cdoc.documentElement.classList.toggle("ed-edit", m === "edit");
    hint(m === "edit" ? "Click any text to change it. Enter keeps it, Esc undoes it." : "Browsing: links work as on the live site. Switch to Edit to change text.");
  }
  var hintT = 0;
  function hint(t) { var h = $("ed-hint"); h.textContent = t; h.classList.remove("off"); clearTimeout(hintT); hintT = setTimeout(function () { h.classList.add("off"); }, 4200); }
  var toastT = 0;
  function say(t, bad) { var el = $("ed-toast"); el.textContent = t; el.hidden = false; el.classList.toggle("bad", !!bad); clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, bad ? 9000 : 5200); }

  function dirtyKeys() {
    var k = {}, out = [];
    Object.keys(draft).forEach(function (x) { k[x] = 1; }); Object.keys(saved).forEach(function (x) { k[x] = 1; });
    Object.keys(k).forEach(function (x) { if (!same(draft[x], saved[x])) out.push(x); });
    return out;
  }
  function changed() {
    var dirty = dirtyKeys().length, total = Object.keys(draft).length;
    var c = $("ed-count");
    c.setAttribute("data-state", dirty ? "dirty" : total ? "saved" : "clean");
    $("ed-count-text").innerHTML = dirty ? "<b>" + dirty + "</b> unsaved" + (total - dirty > 0 ? " · " + (total) + " total" : "") : total ? "<b>" + total + "</b> saved" : "No changes yet";
    $("ed-save").disabled = !dirty || !loaded;
    $("ed-save").textContent = canSave || !loaded ? "Save" : "Copy changes";
    try { localStorage.setItem(LS_KEY, JSON.stringify({ draft: draft, saved: saved })); } catch (e) {}
    if (!$("ed-review").hidden) renderReview();
  }

  function closeDrawers() { $("ed-review").hidden = true; $("ed-metap").hidden = true; }
  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", closeDrawers); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawers(); });

  function label(path) { return PAGES[path] ? PAGES[path].label : path; }
  function renderReview() {
    var body = $("ed-review-body"); body.textContent = "";
    var keys = {}; Object.keys(draft).forEach(function (k) { keys[k] = 1; }); Object.keys(saved).forEach(function (k) { keys[k] = 1; });
    var list = Object.keys(keys);
    if (!list.length) { body.innerHTML = '<p class="note">Nothing changed yet. Click any text on a page to rewrite it; it shows up here.</p>'; return; }
    var note = document.createElement("p"); note.className = "note";
    note.textContent = "Saved changes go into the next pull request. Unsaved ones stay in this browser until you save.";
    body.appendChild(note);
    list.forEach(function (k) {
      var e = draft[k], s = saved[k], gone = !e;
      var x = e || s;
      var item = document.createElement("div"); item.className = "edit-item";
      var where = x.scope === "page" ? label(x.page) + " only" : (x.pages || []).map(label).slice(0, 3).join(", ") + ((x.pages || []).length > 3 ? " +" + (x.pages.length - 3) : "");
      var meta = document.createElement("div"); meta.className = "meta";
      meta.innerHTML = "<span></span>" + (!same(e, s) ? '<span class="new">' + (gone ? "removed, unsaved" : "unsaved") + "</span>" : "<span>saved</span>");
      meta.firstChild.textContent = (x.meta ? "Title / description · " : "") + where;
      var was = document.createElement("div"); was.className = "was"; was.textContent = x.was;
      var now = document.createElement("div"); now.className = "now"; now.textContent = gone ? x.was : x.text;
      var acts = document.createElement("div"); acts.className = "acts";
      var b1 = document.createElement("button"); b1.type = "button"; b1.textContent = "Show me";
      b1.onclick = function () { var p = x.scope === "page" ? x.page : (x.pages && x.pages.indexOf(current) >= 0 ? current : (x.pages || [current])[0]); if (p !== current) go(p); else closeDrawers(); };
      acts.appendChild(b1);
      if (!gone) { var b2 = document.createElement("button"); b2.type = "button"; b2.textContent = "Put back the original"; b2.onclick = function () { delete draft[k]; applyAll(); changed(); }; acts.appendChild(b2); }
      else { var b3 = document.createElement("button"); b3.type = "button"; b3.textContent = "Keep my change"; b3.onclick = function () { draft[k] = clone(s); applyAll(); changed(); }; acts.appendChild(b3); }
      item.appendChild(meta); item.appendChild(was); item.appendChild(now); item.appendChild(acts);
      body.appendChild(item);
    });
  }
  $("ed-count").addEventListener("click", function () { var r = $("ed-review"); var open = r.hidden; closeDrawers(); r.hidden = !open; if (open) renderReview(); });

  $("ed-meta").addEventListener("click", function () {
    var m = $("ed-metap"), open = m.hidden; closeDrawers(); m.hidden = !open; if (!open) return;
    var p = PAGES[current], t = lookup(p.title), d = lookup(p.desc);
    $("ed-title").value = t ? t.text : p.title; $("ed-desc").value = d ? d.text : p.desc;
    var n = pagesFor(p.desc).length;
    $("ed-desc-sub").textContent = n > 1 ? "This description is shared by " + n + " pages; changing it here changes all of them." : "";
  });
  $("ed-meta-keep").addEventListener("click", function () {
    var p = PAGES[current]; scope = "all";
    var t = norm($("ed-title").value), d = norm($("ed-desc").value);
    setEdit(p.title, t, esc(t), esc(p.title), true);
    setEdit(p.desc, d, esc(d), esc(p.desc), true);
    applyMeta(); closeDrawers(); say("Kept. Save when you're ready.");
  });

  $("ed-mode-edit").addEventListener("click", function () { setMode("edit"); });
  $("ed-mode-browse").addEventListener("click", function () { setMode("browse"); });
  $("ed-page").addEventListener("change", function () { go(this.value); });
  DATA.pages.forEach(function (p) { var o = document.createElement("option"); o.value = p.path; o.textContent = p.label; $("ed-page").appendChild(o); });
  window.addEventListener("hashchange", function () { var p = pathFor(location.hash.slice(1)); if (p && p !== current) go(p); });

  /* ---------- saving ---------- */
  var artifactP = null;
  function getArtifact() {
    if (!artifactP) artifactP = (window.claude && window.claude.use) ? Promise.resolve(window.claude.use("artifact")).catch(function () { return null; }) : Promise.resolve(null);
    return artifactP;
  }
  function payload() { return JSON.stringify({ version: 1, base: DATA.base, savedAt: new Date().toISOString(), edits: draft }, null, 1) + "\n"; }

  $("ed-save").addEventListener("click", function () {
    if (editing) commit(editing);
    var btn = $("ed-save");
    if (!canSave) { copyOut(); return; }
    btn.disabled = true; btn.textContent = "Saving…";
    getArtifact().then(function (art) {
      if (!art) throw { code: "unavailable" };
      return art.publish({ "edits.json": { content: payload(), contentType: "application/json" } });
    }).then(function () {
      saved = clone(draft); changed();
      say("Saved. Claude will turn it into a pull request.");
    }, function (err) {
      var c = err && err.code;
      if (c === "conflict") say("A newer save landed first. The page reloads with it; your unsaved changes stay in this browser.", true);
      else if (c === "not_writer" || c === "not_granted") { canSave = false; say("You can look but not save in this view. Use Copy changes and paste them to Claude.", true); }
      else if (c === "rate_limited") say("Saving too often. Wait a minute and save again.", true);
      else { canSave = false; say("Saving isn't available here. Use Copy changes and paste them to Claude.", true); }
      changed();
    });
  });
  function copyOut() {
    var text = payload();
    var done = function () { say("Changes copied. Paste them to Claude."); };
    try { navigator.clipboard.writeText(text).then(done, function () { say("Copying was blocked here. Open Changes to see them.", true); }); }
    catch (e) { say("Copying was blocked here. Open Changes to see them.", true); }
  }

  /* ---------- start ---------- */
  buildIndex();
  setMode("edit");
  var startPath = pathFor(location.hash.slice(1)) || "/";
  fetch("edits.json", { cache: "no-store" }).then(function (r) {
    if (r.status === 404) return { edits: {} };
    if (!r.ok) throw new Error("status " + r.status);
    return r.json();
  }).then(function (j) {
    saved = (j && j.edits) || {};
    draft = clone(saved);
    loaded = true; canSave = true;
    try {
      var local = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (local && local.draft) {
        // Keep the changes this browser hadn't saved, on top of what is saved now.
        Object.keys(local.draft).forEach(function (k) { if (!same(local.draft[k], local.saved && local.saved[k])) draft[k] = local.draft[k]; });
        Object.keys(local.saved || {}).forEach(function (k) { if (!local.draft[k] && same(saved[k], local.saved[k])) delete draft[k]; });
      }
    } catch (e) {}
  }, function () {
    loaded = true; canSave = false;
    try { var local = JSON.parse(localStorage.getItem(LS_KEY) || "null"); if (local && local.draft) draft = local.draft; } catch (e) {}
    say("Couldn't load the saved changes, so saving is off in this view. You can still edit and use Copy changes.", true);
  }).then(function () {
    getArtifact().then(function (art) { if (!art) { canSave = false; changed(); } });
    changed();
    go(startPath);
  });
})();
