// One animated SVG scene per project. 320x200 viewBox, drawn in the card's tone
// colours (--v-a strong, --v-b soft, --v-c faint). Motion is CSS only: slow,
// floaty loops on transform, opacity and stroke-dashoffset. Kept inside
// x 30-290 / y 20-180 so it survives being cropped to 16:9 or 4:3.

const wrap = (body, label) =>
  `<svg class="v" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">${body}</svg>`;
const anim = (name, dur, delay = 0, ease = "var(--ease-move)", extra = "infinite alternate") =>
  `animation:${name} ${dur}s ${ease} ${delay}s ${extra}`;
const center = "transform-box:view-box;transform-origin:160px 100px;";
const r1 = (n) => Math.round(n * 10) / 10;

// Ostium: a doorway, with agents walking through it.
function ostium() {
  const agents = [0, 1, 2, 3, 4].map((i) =>
    `<g style="${anim("v-walk", 10, -i * 2, "linear", "infinite")}"><circle class="a-f" cx="36" cy="156" r="6.5" style="${anim("v-float", 1.6 + i * 0.2, -i * 0.4)}"/></g>`
  ).join("");
  const rays = [-34, 0, 34].map((dx, i) =>
    `<line class="a-s" x1="${160 + dx * 0.55}" y1="34" x2="${160 + dx}" y2="20" stroke-width="3" style="${anim("v-fade", 3.4, i * 0.5, "var(--ease-move)", "infinite")}"/>`
  ).join("");
  return wrap(`
    <line class="b-s" x1="30" y1="172" x2="290" y2="172" stroke-width="3"/>
    <g class="v-float-lg">
      ${rays}
      <path class="c-f" d="M124 172 V98 A36 36 0 0 1 196 98 V172 Z"/>
      <path class="a-s" stroke-width="7" d="M112 172 V98 A48 48 0 0 1 208 98 V172"/>
    </g>
    ${agents}`, "A doorway with small agents passing through it");
}

// ATLAS: an end-on detector, particle tracks curling out of the collision point.
function atlas() {
  const tracks = [];
  for (let i = 0; i < 9; i++) {
    const th = (i / 9) * Math.PI * 2 + 0.3;
    const bend = (i % 2 ? 1 : -1) * (0.35 + (i % 3) * 0.18);
    const R = 72 - (i % 3) * 6;
    const ex = 160 + R * Math.cos(th), ey = 100 + R * Math.sin(th);
    const cx = 160 + R * 0.5 * Math.cos(th + bend), cy = 100 + R * 0.5 * Math.sin(th + bend);
    const d = i * 0.38;
    tracks.push(`<path class="a-s" pathLength="1" stroke-dasharray="1" stroke-width="2.6" d="M160 100 Q${r1(cx)} ${r1(cy)} ${r1(ex)} ${r1(ey)}" style="${anim("v-draw", 6.4, d, "var(--ease-float)", "infinite")}"/>`);
    tracks.push(`<rect class="a-f" x="${r1(ex - 4)}" y="${r1(ey - 4)}" width="8" height="8" rx="1.5" style="${anim("v-glow", 6.4, d + 1.4, "var(--ease-move)", "infinite")}"/>`);
  }
  return wrap(`
    <circle class="b-s" cx="160" cy="100" r="86" stroke-width="1.5" stroke-dasharray="2 6"/>
    <circle class="c-s" cx="160" cy="100" r="66" stroke-width="14" stroke-dasharray="9 3"/>
    <circle class="c-s" cx="160" cy="100" r="38" stroke-width="12"/>
    <circle class="b-s" cx="160" cy="100" r="16" stroke-width="2"/>
    <g style="${center}${anim("v-spin", 90, 0, "linear", "infinite")}">${tracks.join("")}</g>
    <circle class="a-f" cx="160" cy="100" r="4.5" style="${anim("v-glow", 1.6, 0, "var(--ease-move)", "infinite")}"/>`,
    "Particle tracks curling out of a collision inside a detector");
}

// TinyGPT: six tokens, attention arcs breathing between them, the next token arriving.
function tinygpt() {
  const toks = ["I", "build", "sm", "all", "mod", "els"];
  const xs = toks.map((_, i) => 48 + i * 44);
  const pairs = [[0, 5, 2], [1, 5, 4], [2, 5, 3], [3, 5, 2.5], [4, 5, 3.5], [2, 3, 2], [0, 2, 1.5], [1, 3, 1.5], [1, 4, 2]];
  const arcs = pairs.map(([i, j, w], k) => {
    const h = 136 - (xs[j] - xs[i]) * 0.5;
    return `<path class="a-s" stroke-width="${w}" d="M${xs[i]} 134 Q${(xs[i] + xs[j]) / 2} ${h} ${xs[j]} 134" style="${anim("v-fade", 5.2, -k * 0.7, "var(--ease-move)", "infinite")}"/>`;
  }).join("");
  const boxes = toks.map((t, i) => {
    const last = i === toks.length - 1;
    return `<g ${last ? `style="${anim("v-fade", 5.2, 0, "var(--ease-move)", "infinite")}"` : ""}>
      <rect class="${last ? "a-f" : "b-s"}" x="${xs[i] - 19}" y="136" width="38" height="24" rx="5" stroke-width="2"/>
      <text class="${last ? "g-f" : "b-f"}" x="${xs[i]}" y="151" text-anchor="middle">${t}</text></g>`;
  }).join("");
  return wrap(`<g class="v-float">${arcs}${boxes}</g>
    <line class="c-s" x1="30" y1="176" x2="290" y2="176" stroke-width="2" stroke-dasharray="2 5"/>`,
    "Attention arcs connecting six tokens");
}

// Study system: four agents orbit one vault, every write passing through the gate.
function studySystem() {
  const orbs = [0, 1, 2, 3].map((i) => {
    const th = (i / 4) * Math.PI * 2;
    const ox = 160 + 76 * Math.cos(th), oy = 100 + 76 * Math.sin(th);
    const ix = 160 + 66 * Math.cos(th), iy = 100 + 66 * Math.sin(th);
    const gx = 160 + 47 * Math.cos(th), gy = 100 + 47 * Math.sin(th);
    return `<line class="a-s" pathLength="1" stroke-dasharray=".18 .32" stroke-width="3" x1="${r1(ix)}" y1="${r1(iy)}" x2="${r1(gx)}" y2="${r1(gy)}" style="${anim("v-dash", 1.8 + i * 0.3, 0, "linear", "infinite")}"/>
      <circle class="a-f" cx="${r1(ox)}" cy="${r1(oy)}" r="10"/>
      <circle class="b-s" cx="${r1(ox)}" cy="${r1(oy)}" r="15" stroke-width="1.5" style="${anim("v-glow", 3, i * 0.7, "var(--ease-move)", "infinite")}"/>`;
  }).join("");
  return wrap(`
    <circle class="c-s" cx="160" cy="100" r="76" stroke-width="1.5"/>
    <g style="${center}${anim("v-spin", 36, 0, "linear", "infinite")}">${orbs}</g>
    <circle class="a-s" cx="160" cy="100" r="44" stroke-width="2" stroke-dasharray="5 6" style="${center}${anim("v-spin-r", 50, 0, "linear", "infinite")}"/>
    <g class="v-float">
      <rect class="a-s" x="136" y="76" width="48" height="48" rx="9" stroke-width="4"/>
      <line class="b-s" x1="147" y1="92" x2="173" y2="92" stroke-width="3"/>
      <line class="b-s" x1="147" y1="100" x2="167" y2="100" stroke-width="3"/>
      <line class="b-s" x1="147" y1="108" x2="170" y2="108" stroke-width="3"/>
    </g>`, "Four agents orbiting one shared notes vault");
}

// Fine Print Reader: a page of small print, a lens drifting over it, one clause lighting up.
function finePrint() {
  const widths = [80, 72, 84, 60, 78, 86, 66, 82, 74, 52];
  const lines = widths.map((w, i) => `<rect class="b-f" x="120" y="${44 + i * 13}" width="${w}" height="5" rx="2.5"/>`).join("");
  return wrap(`
    <g class="v-float">
      <rect class="c-f" x="104" y="26" width="112" height="152" rx="7"/>
      <rect class="a-f" x="114" y="106" width="96" height="11" rx="3" style="${anim("v-hl", 11, 0, "var(--ease-move)", "infinite")}"/>
      ${lines}
    </g>
    <g style="${anim("v-lens", 11, 0, "var(--ease-move)", "infinite")}">
      <circle class="a-s" cx="0" cy="0" r="25" stroke-width="4.5"/>
      <line class="a-s" x1="18" y1="18" x2="36" y2="36" stroke-width="8"/>
    </g>`, "A magnifying lens moving over a page, highlighting one clause");
}

// Black hole: a tilted accretion disk streaming round a dark centre, the far side lensed overhead.
function blackHole() {
  const stars = [[46, 38], [92, 160], [262, 44], [280, 150], [210, 28], [60, 120], [128, 30], [236, 172]]
    .map(([x, y], i) => `<circle class="b-f" cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 1.8}" style="${anim("v-fade", 3 + (i % 4), -i, "var(--ease-move)", "infinite")}"/>`).join("");
  return wrap(`${stars}
    <g style="${center}${anim("v-tilt", 10, 0)}">
      <ellipse class="a-s" cx="160" cy="100" rx="118" ry="24" stroke-width="3" pathLength="1" stroke-dasharray=".05 .03" opacity=".55" style="${anim("v-dash", 16, 0, "linear", "infinite")}"/>
      <ellipse class="a-s" cx="160" cy="100" rx="86" ry="16" stroke-width="5" pathLength="1" stroke-dasharray=".09 .04" style="${anim("v-dash", 10, 0, "linear", "infinite")}"/>
      <path class="a-s" d="M116 100 A44 42 0 0 1 204 100" stroke-width="3" pathLength="1" stroke-dasharray=".12 .05" style="${anim("v-dash", 7, 0, "linear", "infinite")}"/>
      <circle class="b-s" cx="160" cy="100" r="38" stroke-width="1.5" style="${anim("v-glow", 4)}"/>
      <circle class="hole" cx="160" cy="100" r="32"/>
      <path class="a-s" d="M42 100 A118 24 0 0 0 278 100" stroke-width="3" pathLength="1" stroke-dasharray=".05 .03" opacity=".7" style="${anim("v-dash", 16, 0, "linear", "infinite")}"/>
      <path class="a-s" d="M74 100 A86 16 0 0 0 246 100" stroke-width="5" pathLength="1" stroke-dasharray=".09 .04" style="${anim("v-dash", 10, 0, "linear", "infinite")}"/>
    </g>`, "A black hole with a glowing accretion disk");
}

// LanLink: four Macs on one network, a sealed packet hopping between them.
function lanlink() {
  const nodes = [[70, 58], [250, 58], [250, 142], [70, 142]];
  const mesh = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]].map(([a, b]) =>
    `<line class="b-s" x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke-width="1.5" stroke-dasharray="3 6"/>`).join("");
  const macs = nodes.map(([x, y], i) => `<g style="${anim("v-float", 5 + i * 0.6, -i)}">
      <rect class="a-s" x="${x - 21}" y="${y - 20}" width="42" height="28" rx="4" stroke-width="3.5"/>
      <rect class="c-f" x="${x - 16}" y="${y - 15}" width="32" height="18" rx="2"/>
      <line class="a-s" x1="${x - 28}" y1="${y + 12}" x2="${x + 28}" y2="${y + 12}" stroke-width="4.5"/></g>`).join("");
  const ripples = [0, 1, 2].map((i) => `<circle class="b-s" cx="160" cy="100" r="74" stroke-width="2" style="${anim("v-ripple", 4.5, -i * 1.5, "var(--ease-out)", "infinite")}"/>`).join("");
  return wrap(`${ripples}${mesh}${macs}
    <g style="${anim("v-hop", 9, 0, "var(--ease-move)", "infinite")}"><rect class="a-f" x="0" y="0" width="11" height="11" rx="2.5"/></g>`,
    "Four laptops on a local network passing an encrypted packet");
}

// Agent Referendum: three layers of one vault drifting apart, the brief floating on top.
function referendum() {
  const rh = (y, w, h) => `M160 ${y - h / 2} L${160 + w / 2} ${y} L160 ${y + h / 2} L${160 - w / 2} ${y} Z`;
  const layers = [
    [140, "c-f", "b-s", 2, "OS", 7.5],
    [108, "", "a-s", 2.5, "NOTES", 6.5],
    [76, "c-f", "a-s", 3.5, "CONTEXT", 5.5],
  ].map(([y, f, s, w, t, dur], i) => `<g style="${anim("v-float", dur, -i * 1.2)}">
      ${f ? `<path class="${f}" d="${rh(y, 170, 64)}"/>` : ""}
      <path class="${s}" d="${rh(y, 170, 64)}" stroke-width="${w}" ${i === 1 ? 'stroke-dasharray="6 5"' : ""}/>
      <text class="b-f" x="252" y="${y + 3}">${t}</text></g>`).join("");
  return wrap(`
    <line class="b-s" x1="160" y1="48" x2="160" y2="150" stroke-width="1.5" stroke-dasharray="2 5"/>
    ${layers}
    <g class="v-float-lg"><path class="a-f" d="${rh(40, 58, 22)}"/></g>`, "Three stacked layers with a brief floating above them");
}

// Paper trading: candles bobbing, a dashed paper line drawing through them.
function paperTrading() {
  let p = 112; const closes = [];
  const steps = [-8, 10, 6, -12, 14, -6, 9, 12, -10, 7, 11, -4];
  const candles = steps.map((s, i) => {
    const o = p, c = p - s; p = c; closes.push(c);
    const x = 46 + i * 21, top = Math.min(o, c), h = Math.max(4, Math.abs(o - c)), up = c < o;
    return `<g style="${anim("v-float", 4.5 + (i % 4) * 0.7, -i * 0.5)}">
      <line class="b-s" x1="${x}" y1="${top - 9}" x2="${x}" y2="${top + h + 9}" stroke-width="1.5"/>
      <rect class="${up ? "a-f" : "b-f"}" x="${x - 6}" y="${top}" width="12" height="${h}" rx="2"/></g>`;
  }).join("");
  const line = closes.map((c, i) => `${46 + i * 21},${c}`).join(" ");
  return wrap(`
    <text class="b-f" x="34" y="34">PAPER ONLY</text>
    <line class="c-s" x1="30" y1="170" x2="290" y2="170" stroke-width="2"/>
    ${candles}
    <polyline class="a-s" points="${line}" stroke-width="2.5" pathLength="1" stroke-dasharray="1" style="${anim("v-draw", 8, 0, "var(--ease-float)", "infinite")}"/>`,
    "Candlesticks with a price line drawing through them");
}

// Diagnostic tool: a terminal dashboard, core bars breathing, a sensor trace scrolling.
function diagnostic(id) {
  const bars = Array.from({ length: 8 }, (_, i) =>
    `<rect class="a-f" x="${56 + i * 17}" y="62" width="10" height="70" rx="2" style="transform-origin:50% 100%;${anim("v-bar", 2.8 + (i % 4) * 0.55, -i * 0.6, "var(--ease-move)", "infinite alternate")}"/>`).join("");
  let wave = "M206 122";
  for (let x = 0; x < 240; x += 20) wave += ` l10 ${x % 40 ? -9 : 7} l10 ${x % 40 ? 9 : -7}`;
  return wrap(`
    <defs><clipPath id="clip-${id}"><rect x="206" y="108" width="62" height="28"/></clipPath></defs>
    <g class="v-float">
      <rect class="c-f" x="40" y="28" width="240" height="144" rx="9"/>
      <rect class="b-s" x="40" y="28" width="240" height="144" rx="9" stroke-width="2"/>
      <line class="b-s" x1="40" y1="47" x2="280" y2="47" stroke-width="1.5"/>
      <text class="a-f" x="52" y="41">SYS · CPU</text>
      <text class="b-f" x="236" y="41">0.5S</text>
      ${bars}
      <line class="b-s" x1="52" y1="138" x2="190" y2="138" stroke-width="1.5"/>
      <text class="b-f" x="206" y="72">MEM</text>
      <rect class="c-s" x="206" y="78" width="62" height="9" rx="2" stroke-width="1.5"/>
      <rect class="a-f" x="206" y="78" width="62" height="9" rx="2" style="transform-origin:0 50%;${anim("v-meter", 5)}"/>
      <text class="b-f" x="206" y="104">TEMP</text>
      <g clip-path="url(#clip-${id})"><path class="a-s" d="${wave}" stroke-width="2" style="${anim("v-scroll", 6, 0, "linear", "infinite")}"/></g>
      <text class="b-f" x="52" y="160">Q TO QUIT</text>
    </g>`, "A terminal dashboard with CPU bars and a sensor trace");
}

const scenes = { ostium, atlas, tinygpt, studySystem, finePrint, blackHole, lanlink, referendum, paperTrading, diagnostic };
export function visual(name, id = name) { return scenes[name](id); }

// The small chip on the Fields card: a CPU with traces running out of it.
export function fieldsChip() {
  const traces = [
    "M84 56 V30 H40", "M100 56 V22 H140", "M56 84 H24 V52", "M56 100 H18 V140",
    "M112 84 H146 V54", "M112 100 H150 V136", "M84 112 V146 H40", "M100 112 V150 H136",
  ];
  const pads = [[40, 30], [140, 22], [24, 52], [18, 140], [146, 54], [150, 136], [40, 146], [136, 150]];
  const t = traces.map((d, i) => `<path class="fc-trace" d="${d}"/><path class="fc-run" pathLength="1" d="${d}" style="--d:${-i * 0.6}s"/>`).join("");
  const p = pads.map(([x, y]) => `<circle class="fc-pad" cx="${x}" cy="${y}" r="5"/>`).join("");
  const pins = [];
  for (let i = 0; i < 4; i++) {
    const o = 64 + i * 13;
    pins.push(`<rect class="fc-pin" x="${o}" y="50" width="4" height="6" rx="1"/><rect class="fc-pin" x="${o}" y="112" width="4" height="6" rx="1"/>`);
    pins.push(`<rect class="fc-pin" x="50" y="${o}" width="6" height="4" rx="1"/><rect class="fc-pin" x="112" y="${o}" width="6" height="4" rx="1"/>`);
  }
  return `<svg class="fields-chip" viewBox="0 0 168 168" aria-hidden="true">${t}${p}
    <g class="fc-float"><rect class="fc-body" x="56" y="56" width="56" height="56" rx="7"/>${pins.join("")}
    <text x="84" y="89" text-anchor="middle">Physics</text></g></svg>`;
}
