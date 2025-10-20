# quickcalcs

A set of themed, kid-friendly HTML calculators that can be shared as single-file downloads. Each variant uses a shared template system so common chrome lives in one place while individual layouts remain easy to tweak.

## Project layout

```
variants/
  <variant>/
    head.html   # Styles and extra head markup unique to the variant
    body.html   # Calculator markup (buttons, wrappers, etc.)
  shared/
    templates/  # Base "vertical" and "landscape" HTML scaffolds
    fragments/  # Reusable snippets referenced from variant head/body files
src/
  variants/<variant>/index.js  # JavaScript entry point for the variant
scripts/
  build.js                 # Bundles JS and expands templates
  capture-screenshots.js   # Generates README screenshots using Playwright
```

Every variant chooses a base template (`vertical` or `landscape`). The build script injects the variant title, shared fragments, custom head/body markup, and bundled JavaScript into that base. Shared fragments are referenced with Mustache-style placeholders such as `{{> variants/shared/fragments/keypad-grid.html }}`. Nested fragments are supported.

## Building the calculators

1. Install dependencies:
   ```bash
   npm install
   ```
2. (First run only) install a browser for Playwright screenshots:
   ```bash
   npx playwright install chromium
   ```
3. Produce the standalone HTML files:
   ```bash
   npm run build
   ```

The compiled calculators land in `dist/`:

* `dist/circular.html` – Swipe-driven circular dial calculator rendered on canvas.
* `dist/keypad-dual.html` – Dual keypad calculator with side-by-side pads dedicated to each operand (landscape template).
* `dist/keypad-single.html` – Classic keypad with a toggle to route digits to the left or right operand.
* `dist/columnar-dual.html` – Vertical column calculator with stacked digits per operand.

and must be moved to docs to release it public

Each file is self-contained and ready for offline distribution.

## Refreshing screenshots

Capture updated images for the README with:

```bash
npm run capture
```

The script ensures the production HTML exists (running `npm run build` automatically when needed), then opens each calculator from `dist/` via Playwright Chromium and writes PNGs to `docs/images/`. The PNGs are git-ignored because the repository cannot accept binary assets, so regenerate them locally whenever you need updated screenshots. Share them by uploading the generated files to your preferred hosting service.

## Shared template development tips

* Place markup reused across calculators in `variants/shared/fragments/`. Reference fragments using `{{> ...}}`. Fragment includes resolve recursively so fragments can reference other fragments.
* To add a new calculator, create `variants/<name>/head.html` and `variants/<name>/body.html`, implement its logic in `src/variants/<name>/index.js`, then register the variant in `scripts/build.js` with the appropriate base template (`vertical` or `landscape`).
* Keep `variants/shared/templates` limited to structural scaffolds. Most layout-specific tweaks belong either in fragments or the variant head file so they remain shareable.

## Optional test harness

The circular calculator ships with a developer-only assertion harness. To include it in the built HTML, append `-- --with-tests` when running the build:

```bash
npm run build -- --with-tests
```

Open the generated HTML with `#test` in the URL hash to execute the assertions in the developer console.

## Screenshot gallery

Screenshots are generated artifacts and therefore not version-controlled. After running `npm run capture` you can open the following files locally:

* `docs/images/circular.png`
* `docs/images/keypad-dual.png`
* `docs/images/keypad-single.png`
* `docs/images/columnar-dual.png`

If you need to embed the gallery in documentation, upload the generated PNGs to an image host that accepts temporary assets and reference those URLs instead of the git-ignored paths.

