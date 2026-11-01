# nabhyaraj-sonagara.github.io

My personal site, built on my Kinetic design system. Static HTML served by
GitHub Pages from the `main` branch root. No framework and no dependencies.

## Pages

| Path | What is there |
|---|---|
| `/` | Hero, the Fields board, featured work, research, contact |
| `/work/` and `/work/<project>/` | Every project, each with its own page and animated visual |
| `/research/` | The paper, essays and weekly notes |
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
- Change the circuit board: `fields` in `src/content.mjs` holds the text; positions are in `LAYOUTS` at the top of `assets/board.js`.

## Files

- `assets/kinetic.css`: Kinetic tokens (dark and light), components, page styles and motion.
- `assets/site.js`: the Kinetic components as plain JavaScript (nav glide, reveal, marquee, magnetic buttons, cursor), plus theme toggle and timeline.
- `assets/board.js`: the Fields card that grows into the full-page circuit board.
- `assets/instrument.js`: the quantization slider on the paper page.
- `src/`: the content, the project visuals and the page builder.

Every animation has a `prefers-reduced-motion` fallback.
