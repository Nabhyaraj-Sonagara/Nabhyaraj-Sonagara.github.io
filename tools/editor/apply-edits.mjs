// Applies the editor's saved changes (edits.json from the artifact) to the site's source.
//   node tools/editor/apply-edits.mjs path/to/edits.json
// Edits are keyed by the text as it was when the editor was built. tools/editor/applied.json
// remembers what each one was last changed to, so saving the same text twice, or putting
// back the original, still finds it. Anything it can't place is listed for a hand edit.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const FILES = ["src/content.mjs", "src/build.mjs", "src/visuals.mjs", "assets/board.js"];
const APPLIED = join(HERE, "applied.json");

const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
const edits = input.edits || {};
const applied = existsSync(APPLIED) ? JSON.parse(readFileSync(APPLIED, "utf8")) : {};
const src = Object.fromEntries(FILES.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));

const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escQ = (s, q) => s.replace(/\\/g, "\\\\").replace(new RegExp(q, "g"), "\\" + q).replace(q === "`" ? /\$\{/g : /$^/, "\\${");
const hasTags = (h) => /<[a-z]/i.test(h || "");
const count = (hay, needle) => (needle ? hay.split(needle).length - 1 : 0);

// Each way a piece of text can be written in the source, paired with how to write its replacement.
function forms(from, to) {
  const out = [];
  for (const q of ['"', "'", "`"]) out.push([q + escQ(from.v, q) + q, q + escQ(to.v, q) + q]);
  if (from.isHtml) {
    out.push([from.v.replace(/"/g, '\\"'), to.v.replace(/"/g, '\\"')]);
    out.push([from.v, to.v]);
  }
  out.push([">" + escHtml(from.v) + "<", ">" + escHtml(to.v) + "<"]);
  out.push([">" + from.v + "<", ">" + escHtml(to.v) + "<"]);
  if (from.v.length >= 24) {
    for (const q of ['"', "`"]) out.push([escQ(from.v, q), escQ(to.v, q)]);
  }
  return out;
}

const done = [], skipped = [], unplaced = [];
const keys = new Set([...Object.keys(edits), ...Object.keys(applied)]);
for (const key of keys) {
  const e = edits[key], a = applied[key];
  const base = e || a;
  const isHtml = hasTags(base.wasHtml) || hasTags(e && e.html);
  const pick = (text, html) => (isHtml ? { v: html, isHtml } : { v: text, isHtml });
  const now = a ? pick(a.text, a.html) : pick(base.was, base.wasHtml);
  const want = e ? pick(e.text, e.html) : pick(base.was, base.wasHtml);
  if (now.v === want.v) { skipped.push(key); continue; }
  if (base.scope === "page") { unplaced.push({ key, why: `only on ${base.page}`, from: now.v, to: want.v }); continue; }
  let hit = false;
  for (const [f, s] of Object.entries(src)) {
    for (const [find, repl] of forms(now, want)) {
      if (count(s, find)) { src[f] = s.split(find).join(repl); hit = true; break; }
    }
  }
  if (hit) { done.push({ key, from: now.v, to: want.v }); if (e) applied[key] = { was: e.was, wasHtml: e.wasHtml, text: e.text, html: e.html }; else delete applied[key]; }
  else unplaced.push({ key, why: "not found in source", from: now.v, to: want.v });
}

for (const f of FILES) writeFileSync(join(ROOT, f), src[f]);
writeFileSync(APPLIED, JSON.stringify(applied, null, 1) + "\n");
const show = (x) => `  "${x.from}"\n   -> "${x.to}"`;
console.log(`applied ${done.length}, unchanged ${skipped.length}, need a hand edit ${unplaced.length}`);
for (const x of done) console.log(show(x));
if (unplaced.length) console.log("\nby hand:");
for (const x of unplaced) console.log(`  [${x.why}]\n` + show(x));
console.log("\nThen: node src/build.mjs. After a hand edit, record it in applied.json so the next run starts from it.");
