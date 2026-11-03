# nabhyaraj-sonagara.github.io

My personal site, built on my Kinetic design system. Static HTML served by
GitHub Pages from the `main` branch root. No framework and no dependencies.

## Pages

| Path | What is there |
|---|---|
| `/` | Hero, featured work, research, contact |
| `/work/` and `/work/<project>/` | Every project, each with its own page and animated visual |
| `/interests/` | The interests as a green circuit board: Physics is the CPU, every other interest a part wired to it, with the work behind each |
| `/interests/research/` | The paper, essays and weekly notes (`/research/` forwards here) |
| `/quantization-aware-reasoning-distillation/` | The paper's working record, with the quantization instrument |
| `/timeline/` | Most recent first |
| `/about/`, `/contact/` | |

## Editing

All the words live in `src/content.mjs`. Change them, then rebuild:

```bash
node src/build.mjs
```

That rewrites every `index.html`, `404.html` and `sitemap.xml`. Commit the result and push; the site is live about a minute later.

- Add a project: add an entry to `projects` in `src/content.mjs`. Its `visual` names a scene in `src/visuals.mjs`; write a new scene there for a new project.
- Fill in the paper's method or reading list: `paper.measuring` and `paper.reading` in `src/content.mjs`. Empty lists show a short placeholder line instead.
- Change the circuit board: `fields` in `src/content.mjs` holds each part's text and the work wired to it (project slugs or links); positions are in `LAYOUTS` and the part drawings in `PARTS` in `assets/board.js`.

## Editing in the artifact

`tools/editor/` packs the built site into one claude.ai artifact where any text can be clicked and rewritten. Saving there writes `edits.json` into the artifact; Claude turns each save into a pull request.

```bash
node src/build.mjs
node tools/editor/build-editor.mjs <outDir>
node tools/editor/apply-edits.mjs <edits.json>
```

The first command rebuilds the site, the second rebuilds the editor page from it, and the third applies a saved `edits.json` to the source (`applied.json` remembers what was already applied). Text the script can't place on its own, such as lines put together from several pieces, is listed for a hand edit.

## Files

- `assets/kinetic.css`: Kinetic tokens (dark and light), components, page styles and motion.
- `assets/site.js`: the Kinetic components as plain JavaScript (nav glide, reveal, marquee, magnetic buttons, cursor), plus theme toggle and timeline.
- `assets/board.js`: the Interests circuit board: boot, power-on pulse, part drawings and selection.
- `assets/instrument.js`: the quantization slider on the paper page.
- `src/`: the content, the project visuals and the page builder.

Every animation has a `prefers-reduced-motion` fallback.
