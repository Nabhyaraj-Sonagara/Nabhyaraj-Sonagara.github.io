// Builds every page of the site from src/content.mjs into static HTML at the repo root.
// No dependencies: `node src/build.mjs`. Commit the output; GitHub Pages serves it as-is.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { site, nav, marquee, projects, fields, research, timeline, about, paper } from "./content.mjs";
import { visual } from "./visuals.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Asset links carry a fingerprint of the file, so a deploy never meets a stale cached copy.
const asset = (name) => `/assets/${name}?v=${createHash("sha1").update(readFileSync(join(ROOT, "assets", name))).digest("hex").slice(0, 10)}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ext = (href) => /^https?:/.test(href) || href.startsWith("mailto:");

/* ---------- components (markup twins of the Kinetic React components) ---------- */

function heroTitle(text, highlight, cls = "") {
  let i = 0;
  const hl = highlight ? highlight.toLowerCase() : null;
  const words = text.split(" ").map((w) => {
    const bare = w.replace(/[^A-Za-z0-9'À-ɏ-]/g, "").toLowerCase();
    const chars = Array.from(w).map((ch) => `<span class="kn-hero-mask"><span class="kn-hero-ch" style="--i:${i++}">${esc(ch)}</span></span>`).join("");
    return `<span class="kn-hero-word${hl && bare === hl ? " kn-hero-hl" : ""}" aria-hidden="true">${chars}</span>`;
  });
  return `<h1 class="kn-hero ${cls}" aria-label="${esc(text)}">${words.join(" ")}</h1>`;
}

function btn(label, href, { variant = "primary", size = "md", arrow = false, attrs = "" } = {}) {
  const inner = `<span class="kn-btn-label">${label}${arrow ? '<span class="kn-btn-arrow" aria-hidden="true">→</span>' : ""}</span>`;
  const cls = `kn-btn kn-btn-${variant} kn-btn-${size}`;
  if (!href) return `<button type="button" class="${cls}" ${attrs}>${inner}</button>`;
  const x = ext(href) && !href.startsWith("mailto:") ? ' target="_blank" rel="noreferrer"' : "";
  return `<a class="${cls}" href="${href}"${x} ${attrs}>${inner}</a>`;
}

function textLink(label, href, external = ext(href)) {
  const x = external && !href.startsWith("mailto:") ? ' target="_blank" rel="noreferrer"' : "";
  return `<a class="kn-link" href="${href}"${x}>${esc(label)}${external ? '<span class="kn-link-ext" aria-hidden="true">↗</span>' : ""}</a>`;
}

const tag = (t, tone) => `<span class="kn-tag${tone ? " kn-tag-" + tone : ""}">${esc(t)}</span>`;
const nowTag = (t) => `<span class="kn-tag kn-tag-now"><span class="kn-tag-pulse" aria-hidden="true"></span>${esc(t)}</span>`;

function card(p, i = 0, headingLevel = "h3") {
  return `<div class="kn-reveal" style="--d:${(i % 2) * 120}ms">
  <a class="kn-card" href="/work/${p.slug}/">
    <div class="kn-card-media kn-tone-${p.tone}" data-visual style="view-transition-name:v-${p.slug}">${visual(p.visual, p.slug)}</div>
    <div class="kn-card-body">
      <div class="kn-card-meta"><span class="kn-card-year">${esc(p.date)}</span>${p.badge ? tag(p.badge, "signal") : ""}${p.tags.map((t) => tag(t)).join("")}</div>
      <${headingLevel} class="kn-card-title"><span>${esc(p.title)}</span><span class="kn-card-arrow" aria-hidden="true">↗</span></${headingLevel}>
      <p class="kn-card-summary">${esc(p.summary)}</p>
    </div>
  </a>
</div>`;
}

function rows(list) {
  return `<div class="rows">${list.map((r, i) => {
    const inner = `<span class="label">${esc(r.when)}</span><span><span class="row-t">${esc(r.title)}</span><span class="row-d">${esc(r.text)}</span></span><span class="label">${esc(r.kind)}</span>`;
    if (!r.href) return `<div class="row kn-reveal" style="--d:${i * 60}ms">${inner}</div>`;
    const x = ext(r.href) ? ' target="_blank" rel="noreferrer"' : "";
    return `<a class="row kn-reveal" style="--d:${i * 60}ms" href="${r.href}"${x}>${inner}</a>`;
  }).join("")}</div>`;
}

function marqueeBlock() {
  const row = (copy) => `<ul class="kn-marquee-row"${copy ? ' aria-hidden="true"' : ""}>${marquee.map((m) => `<li class="kn-marquee-item">${esc(m)}<span class="kn-marquee-dot" aria-hidden="true"></span></li>`).join("")}</ul>`;
  return `<div class="kn-marquee" aria-label="Things I work with" data-speed="56"><div class="kn-marquee-track">${row(false)}${row(true)}</div></div>`;
}

// Related work on the Interests board: project slugs become links to their pages.
function resolve(list) {
  return list.map((x) => {
    if (typeof x !== "string") return x;
    const p = projects.find((q) => q.slug === x);
    if (!p) throw new Error("Unknown project in fields: " + x);
    return { title: p.title, href: `/work/${p.slug}/`, kind: "Project" };
  });
}
const board = {
  core: { ...fields.core, related: resolve(fields.core.related) },
  nodes: fields.nodes.map((n) => ({ ...n, related: resolve(n.related) })),
};

function interestsLink(label = "See how my interests connect") {
  return `<a class="row kn-reveal" href="/interests/"><span class="label">Interests</span><span><span class="row-t">${esc(label)}</span><span class="row-d">Go to a fun visual that depicts my interests in a fun and playful way.</span></span><span class="label">Board ↗</span></a>`;
}

function contactLine() {
  return `<section class="section"><div class="wrap">
  <div class="cta-line kn-reveal">
    <h2 class="display">Let's <span class="hl">connect</span>.</h2>
    <p class="body-lg muted">I am looking for internships and research work in tech and physics. This address is a real one and I answer it.</p>
    <div class="row-actions">
      ${btn("Email me", `mailto:${site.email}`, { arrow: true })}
      ${btn("Copy address", null, { variant: "ghost", attrs: `data-copy="${site.email}"` })}
    </div>
  </div>
</div></section>`;
}

/* ---------- page shell ---------- */

const ICON_MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>';
const ICON_SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

function header(active) {
  const items = (overlay) => nav.map((n) => overlay
    ? `<li><span class="kn-nav-item">${n.label}</span></li>`
    : `<li><a class="kn-nav-item" href="${n.href}"${n.href === active ? ' aria-current="page"' : ""}>${n.label}</a></li>`).join("");
  return `<a class="kn-btn kn-btn-primary kn-btn-sm skip" href="#main"><span class="kn-btn-label">Skip to content</span></a>
<header class="site-head"><div class="wrap bar">
  <a class="mark" href="/">Nabhyaraj</a>
  <nav class="kn-nav" aria-label="Main"><ul class="kn-nav-list">${items(false)}</ul><div class="kn-nav-hl" aria-hidden="true"><ul class="kn-nav-list">${items(true)}</ul></div></nav>
  <button class="theme-btn" type="button" aria-label="Switch theme">${ICON_MOON}${ICON_SUN}</button>
</div></header>`;
}

function footer() {
  return `<footer class="site-foot"><div class="wrap foot">
  <span class="label">Built with love, by Nabhyaraj and Claude</span>
  <span class="foot-links">${textLink("GitHub", site.links.github)}${textLink("LinkedIn", site.links.linkedin)}${textLink("Substack", site.links.substack)}${textLink("Email", "mailto:" + site.email, false)}</span>
  <span class="label">Ahmedabad · Last updated ${site.updated}</span>
</div></footer>
<div class="toast label" id="toast" role="status" hidden></div>`;
}

function page({ path, title, description = site.description, active, body, scripts = [], jsonld = "", extraHead = "", bodyClass = "", htmlClass = "" }) {
  const url = site.url + path;
  const full = path === "/" ? title : `${title} — ${site.name}`;
  return `<!doctype html>
<html lang="en" data-theme="dark"${htmlClass ? ` class="${htmlClass}"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${site.name}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0e0e0c">
<meta property="og:type" content="${path === "/" ? "profile" : "website"}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(full)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${site.url}/og.png">
${extraHead}<script>(function(){var d=document.documentElement,t;d.classList.add("js");try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.setAttribute("data-theme",t);if(t==="light"){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#f4f1ea")}try{var s=sessionStorage,o=s.getItem("vt-o");if(o){s.removeItem("vt-o");o=o.split(",");d.style.setProperty("--vt-x",o[0]+"%");d.style.setProperty("--vt-y",o[1]+"%")}if(s.getItem("vt-pcb")){s.removeItem("vt-pcb");if(!d.classList.contains("pcb"))d.classList.add("from-pcb")}}catch(e){}})();</script>
<link rel="icon" href="${asset("favicon.svg")}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400..600&display=swap">
<link rel="stylesheet" href="${asset("kinetic.css")}">
${jsonld}</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
${header(active)}
<main id="main">
${body}
</main>
${footer()}
<script src="${asset("site.js")}" defer></script>
${scripts.map((s) => `<script src="${asset(s)}" defer></script>`).join("\n")}
</body>
</html>
`;
}

/* ---------- pages ---------- */

const pages = {};
const featured = projects.filter((p) => p.featured);

pages["/"] = page({
  path: "/", active: "/", title: `${site.name} — AI, physics, small models`,
  extraHead: '<meta name="google-site-verification" content="2duIK8_yHvdRAUk_NHS0ZqqPsxn8cjbFtzsDW7OteGU">\n',
  jsonld: `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Person", name: site.name, url: site.url + "/", image: site.url + "/og.png",
    description: "Student of AI, physics and mathematics. Writes machine learning from scratch.",
    homeLocation: { "@type": "Place", name: site.city },
    knowsAbout: ["Machine learning", "Quantization", "Language models", "Experimental physics", "Particle physics", "Mathematics"],
    sameAs: Object.values(site.links),
  })}</script>\n`,
  body: `
<section class="hero"><div class="wrap">
  <div class="eyebrow">${nowTag("Open to internships in tech and physics")}</div>
  ${heroTitle("I build small models and sharp tools.", "small")}
  <p class="body-lg kn-reveal" style="--d:500ms">Hey, I'm Nabhyaraj. I like studying physics, AI and writing opinionated articles to express myself. I am proficient in Python and am mastering C++. I also use (and highly reccomend) Omarchy linux (Arch, by the way ;)</p>
  <div class="row-actions kn-reveal" style="--d:650ms">${btn("See the work", "/work/", { arrow: true })}${btn("Get in touch", "/contact/", { variant: "ghost" })}</div>
</div></section>

<section class="section"><div class="wrap split">
  <div class="rows">${interestsLink()}</div>
  <div class="aside kn-reveal" style="--d:120ms">
    <span class="label">Currently</span>
    <p>Writing a paper on why low-bit models misjudge how long to think, and using a new quantization method to prevent it.</p>
    <p>Quantizing TinyGPT using the same methods to fit on a microcontroller</p>
    <p>Opening small businesses to AI agents with Ostium.</p>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="shead"><h2 class="display">Magnum Opuses (Opi?)</h2>${textLink(`All ${projects.length} projects`, "/work/", false)}</div>
  <div class="cards">${featured.map((p, i) => card(p, i)).join("")}</div>
</div></section>

${marqueeBlock()}

<section class="section" style="padding-top:var(--section)"><div class="wrap">
  <div class="shead"><h2 class="display">Research and writing</h2>${textLink("More under Interests", "/interests/research/", false)}</div>
  ${rows(research.rows)}
</div></section>

${contactLine()}`,
});

pages["/work/"] = page({
  path: "/work/", active: "/work/", title: "Work",
  description: `${projects.length} projects by ${site.name}: small models from scratch, particle physics tools, agents, apps and plugins.`,
  body: `
<section class="hero"><div class="wrap">
  ${heroTitle("Things I have built.", "built")}
  <p class="body-lg kn-reveal" style="--d:450ms">From a language model with no framework under it to a particle detector you can fly around. Open any of them for the full write-up.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
  <div class="cards">${projects.map((p, i) => card(p, i, "h2")).join("")}</div>
</div></section>
${contactLine()}`,
});

projects.forEach((p, idx) => {
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];
  const highlight = p.title.split(" ")[0];
  pages[`/work/${p.slug}/`] = page({
    path: `/work/${p.slug}/`, active: "/work/", title: p.title, description: p.summary,
    body: `
<section class="section p-hero"><div class="wrap">
  <div class="eyebrow">${textLink("← All work", "/work/", false)}</div>
  <div class="kn-card-media p-media kn-tone-${p.tone}" data-visual style="view-transition-name:v-${p.slug}">${visual(p.visual, p.slug + "-hero")}</div>
  <div class="p-head">
    <div>
      <div class="kn-card-meta" style="margin-bottom:var(--space-2)"><span class="kn-card-year">${esc(p.date)}</span>${p.badge ? tag(p.badge, "signal") : ""}${p.tags.map((t) => tag(t)).join("")}</div>
      ${heroTitle(p.title, highlight, "kn-hero-md")}
      <p class="body-lg kn-reveal" style="--d:400ms">${esc(p.summary)}</p>
    </div>
    <div class="sheet kn-reveal" style="--d:550ms">
      <dl>${p.sheet.map(([k, v, c]) => `<dt>${esc(k)}</dt><dd${c ? ` class="${c}"` : ""}>${esc(v)}</dd>`).join("")}</dl>
      ${p.links.length ? `<div class="row-actions">${p.links.map((l, i) => btn(esc(l.label), l.href, { variant: i ? "ghost" : "primary", size: "sm", arrow: true })).join("")}</div>` : ""}
    </div>
  </div>
</div></section>
<section class="section"><div class="wrap">
  <div class="shead"><h2 class="heading">The write-up</h2></div>
  <div class="notes">${p.notes.map(([h, t], i) => `<div class="note kn-reveal" style="--d:${i * 90}ms"><h2>${esc(h)}</h2><p>${esc(t)}</p></div>`).join("")}</div>
</div></section>
<section class="section"><div class="wrap">
  <nav class="pager" aria-label="More projects">
    <a href="/work/${prev.slug}/"><span class="label muted">← Previous</span><span class="heading">${esc(prev.title)}</span></a>
    <a href="/work/${next.slug}/"><span class="label muted">Next →</span><span class="heading">${esc(next.title)}</span></a>
  </nav>
</div></section>`,
  });
});

pages["/interests/"] = page({
  path: "/interests/", active: "/interests/", title: "Interests", bodyClass: "pcb-page", htmlClass: "pcb", scripts: ["board.js"],
  description: "Nabhyaraj Sonagara's interests as a circuit board: physics at the core, with AI, mathematics, writing, design and fintech wired to it, and the work behind each.",
  body: `
<section class="pcb-hero">
  <div class="wrap pcb-top">
    <div class="eyebrow"><button class="label pcb-flip-btn" id="pcb-flip-btn" type="button" aria-pressed="false">Flip the board ↻</button><span class="pcb-top-go">${btn("Research and writing", "/interests/research/", { size: "sm", arrow: true })}</span></div>
    ${heroTitle("*insert cool heading", "components", "kn-hero-md")}
  </div>
  <div class="pcb-stage" id="pcb-stage" role="group" aria-label="A circuit board of interests. Pick a part to see the work wired to it."></div>
  <div class="wrap"><div class="pcb-bar" id="pcb-bar" aria-live="polite"></div></div>
</section>
<noscript><div class="wrap"><p class="body-lg">The board needs JavaScript to draw. The research lives on <a class="kn-link" href="/interests/research/">its own page</a>.</p></div></noscript>
<script type="application/json" id="pcb-data">${JSON.stringify(board).replace(/</g, "\\u003c")}</script>`,
});

const researchWork = ["tinygpt", "atlas-collision-predictor"].map((slug) => projects.find((p) => p.slug === slug));
pages["/interests/research/"] = page({
  path: "/interests/research/", active: "/interests/", title: "Research and writing",
  description: "Research and writing by Nabhyaraj Sonagara: an independent paper on quantization-aware reasoning distillation, essays and weekly paper notes.",
  body: `
<section class="hero"><div class="wrap">
  <div class="eyebrow">${textLink("← Interests", "/interests/", false)}</div>
  ${heroTitle("Research and writing.", "research")}
  <p class="body-lg kn-reveal" style="--d:450ms">${esc(research.intro)}</p>
  <div class="row-actions kn-reveal" style="--d:600ms">${btn("Read the paper's record", "/quantization-aware-reasoning-distillation/", { arrow: true })}</div>
</div></section>
<section class="section"><div class="wrap split">
  <div>${rows(research.rows)}</div>
  <div class="aside kn-reveal"><span class="label">Fields</span><p>Artificial intelligence · Physics · Mathematics · Fintech</p><span class="label">Heading for</span><p>${esc(research.headingFor)}</p></div>
</div></section>
<section class="section"><div class="wrap">
  <div class="shead"><h2 class="display">Where it shows up in the work</h2>${textLink("All projects", "/work/", false)}</div>
  <div class="cards">${researchWork.map((p, i) => card(p, i)).join("")}</div>
</div></section>
<section class="section"><div class="wrap"><div class="rows">${interestsLink("Back to the board")}</div></div></section>`,
});

pages["/quantization-aware-reasoning-distillation/"] = page({
  path: "/quantization-aware-reasoning-distillation/", active: "/interests/", title: "Quantization-aware reasoning distillation",
  description: "The working record of an independent paper on why low-bit reasoning models misjudge how long to think, by Nabhyaraj Sonagara.",
  scripts: ["instrument.js"],
  body: `
<section class="hero"><div class="wrap">
  <div class="eyebrow">${textLink("← Research", "/interests/research/", false)}</div>
  ${heroTitle("Quantization-aware reasoning distillation", "reasoning", "kn-hero-md")}
  <p class="body-lg kn-reveal" style="--d:600ms">${esc(paper.lede)}</p>
</div></section>
<section class="section"><div class="wrap split">
  <div class="inst kn-reveal">
    <div class="inst-head label"><span>Instrument 01 — quantization</span><b id="bitsLabel">FP16</b></div>
    <div class="bars" id="bars" aria-hidden="true"></div>
    <label class="label muted" for="bits">Drag through the formats people actually ship</label>
    <input type="range" id="bits" min="0" max="7" step="1" value="7" aria-describedby="verdict">
    <div class="readout">
      <div class="cell"><span class="label">Weights</span><span class="v-num">30M</span></div>
      <div class="cell"><span class="label">Bits / wt</span><span class="v-num" id="perW">16</span></div>
      <div class="cell"><span class="label">Size</span><span class="v-num" id="size">60.0 MB</span></div>
    </div>
    <p class="verdict" id="verdict" aria-live="polite"></p>
  </div>
  <div class="aside kn-reveal" style="--d:120ms"><span class="label">Where the size goes</span><p>${esc(paper.sizeNote)}</p></div>
</div></section>
<section class="section"><div class="wrap">
  <div class="shead"><h2 class="display">The question</h2></div>
  <div class="split">
    <div class="prose kn-reveal">${paper.question.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
    <div class="aside kn-reveal" style="--d:120ms"><span class="label">In one line</span><p>${esc(paper.oneLine)}</p><span class="label">Status</span><p>${esc(paper.status)}</p></div>
  </div>
</div></section>
<section class="section"><div class="wrap">
  <div class="shead"><h2 class="display">Why it is worth asking</h2></div>
  <div class="prose kn-reveal">${paper.why.map((t) => `<p>${t}</p>`).join("")}</div>
</div></section>
<section class="section"><div class="wrap">
  <div class="shead"><h2 class="display">What I am measuring</h2></div>
  <div class="prose kn-reveal">${paper.measuring.length ? paper.measuring.map((t) => `<p>${esc(t)}</p>`).join("") : `<p>${esc(paper.measuringNote)}</p>`}</div>
</div></section>
<section class="section"><div class="wrap">
  <div class="shead"><h2 class="display">Where it stands</h2></div>
  ${rows(paper.stands)}
</div></section>
<section class="section"><div class="wrap">
  <div class="shead"><h2 class="display">Reading</h2></div>
  <div class="prose kn-reveal"><p>The papers this one is built on. I will add each as I write its note, rather than listing work I have not read.</p></div>
  ${paper.reading.length ? rows(paper.reading) : ""}
</div></section>
<section class="section"><div class="wrap">
  <div class="panel kn-reveal">
    <div class="stack">
      <span class="label muted">If you work on this</span>
      <h2 class="display">Tell me where I am <span class="hl">wrong</span>.</h2>
      <p class="muted">I am a student doing this without a supervisor, which means the fastest way for it to improve is someone who knows the area telling me what I have missed. If that is you, I would rather hear it early than after the draft is finished.</p>
      <div class="row-actions"><span class="addr">${site.email}</span>${btn("Copy address", null, { attrs: `data-copy="${site.email}"` })}</div>
    </div>
    <div class="links-col"><span class="label muted">Elsewhere</span>${textLink("The rest of the work", "/work/", false)}${textLink("GitHub", site.links.github)}${textLink("Substack", site.links.substack)}</div>
  </div>
</div></section>`,
});

pages["/timeline/"] = page({
  path: "/timeline/", active: "/timeline/", title: "Timeline",
  description: "What Nabhyaraj Sonagara has been building, researching and writing, most recent first.",
  body: `
<section class="hero"><div class="wrap">
  ${heroTitle("The story so far.", "story")}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
  <div class="tl">
    <div class="tl-rail" aria-hidden="true"><div class="tl-fill"></div></div>
    <ol class="tl-list">${timeline.map((t, i) => {
      const x = ext(t.href) ? ' target="_blank" rel="noreferrer"' : "";
      return `<li class="tl-item kn-reveal" style="--d:${Math.min(i, 3) * 60}ms"><span class="label">${esc(t.when)} · ${esc(t.kind)}</span><a class="row-t" href="${t.href}"${x}>${esc(t.title)}</a><span class="row-d">${esc(t.text)}</span></li>`;
    }).join("")}</ol>
  </div>
</div></section>
${contactLine()}`,
});

pages["/about/"] = page({
  path: "/about/", active: "/about/", title: "About",
  description: "About Nabhyaraj Sonagara: a student of AI, physics and mathematics in Ahmedabad who learns by rebuilding things from scratch.",
  body: `
<section class="hero"><div class="wrap">
  ${heroTitle("I learn by rebuilding.", "rebuilding")}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap split">
  <div class="prose kn-reveal">${about.paras.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
  <div class="aside kn-reveal" style="--d:120ms">
    <span class="label">Tools I use</span><p>${esc(about.tools)}</p>
    <span class="label">Ask me about</span><p>${esc(about.askMe)}</p>
    <span class="label">Heading for</span><p>${esc(research.headingFor)}</p>
  </div>
</div></section>
<section class="section"><div class="wrap"><div class="rows">${interestsLink()}</div></div></section>
${contactLine()}`,
});

pages["/contact/"] = page({
  path: "/contact/", active: "/contact/", title: "Contact",
  description: "Get in touch with Nabhyaraj Sonagara about internships and research work in tech and physics.",
  body: `
<section class="hero"><div class="wrap">
  <div class="eyebrow">${nowTag("Open to internships in tech and physics")}</div>
  ${heroTitle("Let's connect.", "connect")}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
  <div class="panel kn-reveal">
    <div class="stack">
      <p class="body-lg">I am looking for internships and research work in tech and physics. If you are hiring or reviewing applications, this address is a real one and I answer it. A résumé goes out the same day you ask.</p>
      <div class="row-actions"><span class="addr">${site.email}</span>${btn("Copy address", null, { attrs: `data-copy="${site.email}"` })}</div>
      <div class="row-actions">${btn("Write an email", `mailto:${site.email}`, { variant: "ghost", arrow: true })}</div>
    </div>
    <div class="links-col"><span class="label muted">Elsewhere</span>${textLink("GitHub", site.links.github)}${textLink("LinkedIn", site.links.linkedin)}${textLink("Substack", site.links.substack)}</div>
  </div>
</div></section>`,
});

const notFound = page({
  path: "/404.html", active: "", title: "Not found",
  body: `
<section class="hero"><div class="wrap">
  ${heroTitle("Lost in the wires.", "wires")}
  <p class="body-lg kn-reveal" style="--d:400ms">You appear to have loitered off your path.</p>
  <div class="row-actions kn-reveal" style="--d:550ms">${btn("Go home", "/", { arrow: true })}${btn("See the work", "/work/", { variant: "ghost" })}</div>
</div></section>`,
});

/* ---------- write ---------- */

function out(path, html) {
  const file = path.endsWith(".html") ? join(ROOT, path) : join(ROOT, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html.replace(/\n{3,}/g, "\n\n"));
}
for (const [path, html] of Object.entries(pages)) out(path, html);
out("/404.html", notFound);

mkdirSync(join(ROOT, "research"), { recursive: true });
writeFileSync(join(ROOT, "research", "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Research moved</title>
<link rel="canonical" href="${site.url}/interests/research/"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=/interests/research/"></head>
<body><p>Research now lives under <a href="/interests/research/">Interests</a>.</p></body></html>
`);

const today = new Date().toISOString().slice(0, 10);
const prio = (p) => (p === "/" ? "1.0" : p.split("/").length > 3 ? "0.6" : "0.8");
writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(pages).map((p) => `  <url>\n    <loc>${site.url}${p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${prio(p)}</priority>\n  </url>`).join("\n")}
</urlset>
`);
console.log(`Built ${Object.keys(pages).length + 1} pages.`);
