/* Instrument 01: real quantization formats, not a continuum.
   There is no 7-bit or 11-bit model. What ships is a short list of formats, and
   their bits per weight are not whole numbers because each one carries
   per-block scales. Figures are published GGUF bits-per-weight. */
(function () {
  "use strict";
  var FORMATS = [
    { name: "BitNet b1.58", bpw: 1.58, bits: 0, warn: true, note: "<b>Ternary.</b> Every weight is -1, 0 or +1. You have to train for it; converting afterwards will not get you here." },
    { name: "Q2_K", bpw: 2.625, bits: 2, warn: true, note: "<b>Aggressive.</b> Workable on a large model, rough on a small one. Reasoning length drifts hardest here." },
    { name: "Q3_K_M", bpw: 3.875, bits: 3, warn: true, note: "<b>Three bits.</b> Not a power of two, and shipped every day. This band is where my research sits." },
    { name: "Q4_K_M", bpw: 4.5, bits: 4, warn: false, note: "<b>The common default.</b> Most community uploads use it. At this size it fits on a microcontroller." },
    { name: "Q5_K_M", bpw: 5.5, bits: 5, warn: false, note: "<b>Five bits.</b> Buys back some of what four gives up, for about four more megabytes." },
    { name: "Q6_K", bpw: 6.5625, bits: 6, warn: false, note: "<b>Near FP16 quality.</b> Often used only for the layers that cannot take the loss." },
    { name: "Q8_0", bpw: 8.5, bits: 8, warn: false, note: "<b>Boring and safe.</b> Half the size of FP16 and almost none of the damage." },
    { name: "FP16", bpw: 16, bits: 16, warn: false, note: "<b>Full precision.</b> Every weight keeps its shape, and the file needs a real machine." }
  ];
  var barsEl = document.getElementById("bars");
  var range = document.getElementById("bits");
  if (!barsEl || !range) return;
  var N = 28, src = [], bars = [], i;
  for (i = 0; i < N; i++) src.push(Math.sin(i / (N - 1) * Math.PI * 1.6) * 0.92);
  for (i = 0; i < N; i++) {
    var b = document.createElement("div");
    b.className = "qbar";
    b.style.transitionDelay = (i * 12) + "ms";
    barsEl.appendChild(b); bars.push(b);
  }
  var label = document.getElementById("bitsLabel"), perW = document.getElementById("perW");
  var size = document.getElementById("size"), verdict = document.getElementById("verdict");

  function quantize(w, f) {
    if (f.bits === 0) { var t = Math.round(w); return t > 1 ? 1 : (t < -1 ? -1 : t); }
    var levels = Math.max(1, Math.pow(2, f.bits - 1) - 1);
    return Math.round(w * levels) / levels;
  }
  /* bars grow from the centre line: positive up, negative down */
  function render(idx) {
    var f = FORMATS[idx];
    for (var i = 0; i < N; i++) {
      var q = quantize(src[i], f), h = Math.max(0.03, Math.abs(q) / 2);
      bars[i].style.setProperty("--h", h.toFixed(3));
      bars[i].style.setProperty("--y", (q < 0 ? 50 : -50) + "%");
      bars[i].classList.toggle("neg", q < 0);
    }
    label.textContent = f.name;
    perW.textContent = f.bpw.toFixed(2).replace(/\.?0+$/, "");
    size.textContent = (30e6 * f.bpw / 8 / 1e6).toFixed(1) + " MB";
    verdict.innerHTML = f.note;
    verdict.classList.toggle("warn", f.warn);
  }
  range.addEventListener("input", function () { render(parseInt(range.value, 10)); });
  render(FORMATS.length - 1);
})();
