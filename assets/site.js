/* Kinetic components, ported from the design system's React bundle to plain
   JavaScript so the site stays static: Nav glide, Reveal, Marquee, magnetic
   Button, Cursor. Plus the theme toggle, copy button and timeline rail. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  var reduced = mq("(prefers-reduced-motion: reduce)");
  var fine = mq("(pointer: fine)");
  function $$(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }

  /* ---- theme toggle (the initial theme is set inline in <head>) ---- */
  $$(".theme-btn").forEach(function (b) {
    function sync() {
      var light = root.getAttribute("data-theme") === "light";
      b.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    }
    sync();
    b.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      var meta = doc.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "light" ? "#f4f1ea" : "#0e0e0c");
      sync();
    });
  });

  /* ---- page transitions to and from the Interests board ----
     Going in, remember where the click happened so the board can open from
     that spot. Leaving, flag it so the next page plays the power-off. */
  var IN = /^\/interests\/?$/;
  function leavingBoard() { try { if (root.classList.contains("pcb")) sessionStorage.setItem("vt-pcb", "1"); } catch (e) {} }
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var u; try { u = new URL(a.href); } catch (err) { return; }
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (IN.test(u.pathname) && !root.classList.contains("pcb")) {
      var x = e.clientX, y = e.clientY;
      if (!x && !y) { var b = a.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top + b.height / 2; }
      try { sessionStorage.setItem("vt-o", (x / innerWidth * 100).toFixed(1) + "," + (y / innerHeight * 100).toFixed(1)); } catch (err) {}
    } else if (!IN.test(u.pathname)) leavingBoard();
  }, true);
  window.addEventListener("pageswap", function (e) {
    var to = e.activation && e.activation.entry && e.activation.entry.url;
    if (to && !IN.test(new URL(to).pathname)) leavingBoard();
  });

  /* ---- header turns solid once the page scrolls ---- */
  var head = doc.querySelector(".site-head");
  function onScroll() { if (head) head.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Nav: the ink highlight glides between items; the label under it
     inverts through a clipped copy of the list ---- */
  $$(".kn-nav").forEach(function (nav) {
    var links = $$(".kn-nav-list a", nav);
    var hl = nav.querySelector(".kn-nav-hl");
    if (!hl || !links.length) return;
    var active = -1;
    links.forEach(function (a, i) { if (a.getAttribute("aria-current") === "page") active = i; });
    var target = active;
    function measure() {
      var a = links[target];
      if (!a) { hl.classList.remove("on"); return; }
      var l = a.offsetLeft, t = a.offsetTop;
      var clip = "inset(" + t + "px " + (nav.clientWidth - l - a.offsetWidth) + "px " +
        (nav.clientHeight - t - a.offsetHeight) + "px " + l + "px round 999px)";
      hl.style.clipPath = clip; hl.style.webkitClipPath = clip;
      hl.classList.add("on");
    }
    links.forEach(function (a, i) {
      a.addEventListener("mouseenter", function () { target = i; measure(); });
      a.addEventListener("focus", function () { target = i; measure(); });
      a.addEventListener("blur", function () { target = active; measure(); });
    });
    nav.addEventListener("mouseleave", function () { target = active; measure(); });
    if (window.ResizeObserver) new ResizeObserver(measure).observe(nav);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
    measure();
  });

  /* ---- Reveal: fade up the first time each block scrolls into view ---- */
  var reveals = $$(".kn-reveal");
  if (window.IntersectionObserver && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("kn-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("kn-in"); });
  }

  /* ---- project visuals only animate while on screen ---- */
  var media = $$("[data-visual]");
  if (window.IntersectionObserver) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("v-paused", !e.isIntersecting); });
    }, { rootMargin: "80px" });
    media.forEach(function (m) { m.classList.add("v-paused"); vio.observe(m); });
  }

  /* ---- Marquee: endless line that eases to a stop under the pointer ---- */
  $$(".kn-marquee").forEach(function (w) {
    var t = w.querySelector(".kn-marquee-track");
    if (!t || !t.animate || reduced) return;
    var speed = parseFloat(w.getAttribute("data-speed") || "48");
    var anim = t.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }],
      { duration: speed * 1000, iterations: Infinity });
    var raf = 0;
    function tweenTo(to) {
      cancelAnimationFrame(raf);
      var from = anim.playbackRate, start = performance.now();
      function step(now) {
        var k = Math.min(1, (now - start) / 900), e = 1 - Math.pow(1 - k, 3);
        anim.playbackRate = from + (to - from) * e;
        if (k < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }
    w.addEventListener("pointerenter", function () { tweenTo(0); });
    w.addEventListener("pointerleave", function () { tweenTo(1); });
  });

  /* ---- Button: pill that leans toward the pointer and floats back ---- */
  if (!reduced && fine) {
    $$(".kn-btn").forEach(function (el) {
      var lb = el.querySelector(".kn-btn-label");
      var colors = ", background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)";
      function set(dur, x, y) {
        el.style.transition = "transform " + dur + " var(--ease-float)" + colors;
        el.style.transform = "translate(" + x * 8 + "px," + y * 8 + "px)";
        if (lb) { lb.style.transition = "transform " + dur + " var(--ease-float)"; lb.style.transform = "translate(" + x * -4 + "px," + y * -4 + "px)"; }
      }
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        set("var(--dur-base)", (e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1);
      });
      el.addEventListener("pointerleave", function () { set("900ms", 0, 0); });
    });
  }

  /* ---- Cursor: lime dot that trails the pointer and swells over links ---- */
  if (fine && !reduced) {
    var cur = doc.createElement("div");
    cur.className = "kn-cursor"; cur.setAttribute("aria-hidden", "true");
    cur.innerHTML = '<span class="kn-cursor-dot"></span>';
    doc.body.appendChild(cur);
    root.classList.add("kn-cursor-on");
    var x = 0, y = 0, tx = 0, ty = 0, seen = false;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      if (!seen) { x = tx; y = ty; seen = true; }
      var t = e.target;
      if (!t || !t.closest) return;
      cur.classList.toggle("kn-cursor-big", !!t.closest("a,button,[data-cursor],input[type=range]"));
      cur.classList.toggle("kn-cursor-hide", !!t.closest("input:not([type=range]),textarea,select,[contenteditable]"));
      cur.classList.add("kn-cursor-show");
    });
    doc.addEventListener("pointerout", function (e) { if (!e.relatedTarget) cur.classList.remove("kn-cursor-show"); });
    (function tick() {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      cur.style.transform = "translate(" + x + "px," + y + "px)";
      requestAnimationFrame(tick);
    })();
  }

  /* ---- toast ---- */
  var toast = doc.getElementById("toast"), tid = 0;
  function say(text) {
    if (!toast) return;
    toast.textContent = text; toast.hidden = false;
    clearTimeout(tid); tid = setTimeout(function () { toast.hidden = true; }, 2400);
  }
  window.kineticSay = say;

  /* ---- copy the address ---- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say("Address copied."); }, function () { say(text); });
      } else { say(text); }
    });
  });

  /* ---- timeline rail fills as you scroll, floating behind the scroll ---- */
  var tl = doc.querySelector(".tl");
  if (tl) {
    var fill = tl.querySelector(".tl-fill"), items = $$(".tl-item", tl);
    var prog = 0, goal = 0, running = false;
    function target() {
      var r = tl.getBoundingClientRect(), line = window.innerHeight * 0.62;
      goal = Math.max(0, Math.min(1, (line - r.top) / r.height));
      items.forEach(function (it) { it.classList.toggle("lit", it.getBoundingClientRect().top + 14 < line); });
      if (!running) { running = true; requestAnimationFrame(step); }
    }
    function step() {
      prog += (goal - prog) * (reduced ? 1 : 0.08);
      fill.style.setProperty("--p", prog.toFixed(4));
      if (Math.abs(goal - prog) > 0.0005) requestAnimationFrame(step); else running = false;
    }
    window.addEventListener("scroll", target, { passive: true });
    window.addEventListener("resize", target);
    target();
  }
})();
