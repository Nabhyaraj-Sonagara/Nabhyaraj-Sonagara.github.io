// Packs the built site into one self-contained page: the text editor artifact.
// Run `node src/build.mjs` first, then `node tools/editor/build-editor.mjs [outDir]`.
// Writes <outDir>/index.html, plus an empty <outDir>/edits.json the first time.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { projects } from "../../src/content.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = process.argv[2] || join(HERE, "dist");

const paths = [
  "/", "/work/", ...projects.map((p) => `/work/${p.slug}/`),
  "/interests/", "/interests/research/", "/quantization-aware-reasoning-distillation/",
  "/timeline/", "/about/", "/contact/", "/404",
];

const SUFFIX = " — Nabhyaraj Sonagara";
const pages = paths.map((path) => {
  const file = path === "/404" ? join(ROOT, "404.html") : join(ROOT, path, "index.html");
  const html = readFileSync(file, "utf8");
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, path])[1].replace(/&amp;/g, "&");
  const label = path === "/" ? "Home" : path === "/404" ? "Not found (404)" : title.endsWith(SUFFIX) ? title.slice(0, -SUFFIX.length) : title;
  return { path, label, html };
});

const assets = {};
for (const name of ["kinetic.css", "site.js", "board.js", "instrument.js"]) assets[name] = readFileSync(join(ROOT, "assets", name), "utf8");

let base = "unknown";
try { base = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim(); } catch (e) {}

// JSON inside a <script> block: never let page markup close it early.
const data = JSON.stringify({ base, pages, assets }).replace(/</g, "\\u003c");
const engine = readFileSync(join(HERE, "editor.js"), "utf8");
const shell = readFileSync(join(HERE, "shell.html"), "utf8");
const out = shell.replace("__DATA__", () => data).replace("__ENGINE__", () => engine);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), out);
if (!existsSync(join(OUT, "edits.json"))) writeFileSync(join(OUT, "edits.json"), JSON.stringify({ version: 1, base, edits: {} }, null, 1) + "\n");
console.log(`editor: ${pages.length} pages, ${(out.length / 1024).toFixed(0)} KB, base ${base.slice(0, 7)} -> ${OUT}`);
