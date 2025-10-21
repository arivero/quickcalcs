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

Note: The Make setup provided here is developed and tested on macOS (Apple/BSD make). It assumes:
- A system `make` is available (the default on macOS via Command Line Tools/Xcode).
- `python3` is available on PATH for template rendering.
- `esbuild` is installed or provided via `ESBUILD=/path/to/esbuild`.

Builds now use Make + the esbuild CLI (no npm required for bundling).

1. Ensure `esbuild` is available on your PATH (or set `ESBUILD=/path/to/esbuild`).
2. Produce the standalone HTML files with:
   ```bash
   make
   ```
   - Include the optional test harness in the output by adding:
     ```bash
     WITH_TESTS=1 make
     ```

The compiled calculators land in `dist/`:

* `dist/circular.html` – Swipe-driven circular dial calculator rendered on canvas.
* `dist/dial-dom.html` – Canvas-inspired radial dial built entirely with DOM elements.
* `dist/keypad-dual.html` – Dual keypad calculator with side-by-side pads dedicated to each operand (landscape template).
* `dist/keypad-single.html` – Classic keypad with a toggle to route digits to the left or right operand.
* `dist/columnar-dual.html` – Vertical column calculator with stacked digits per operand.

and must be moved to docs to release it public

Each file is self-contained and ready for offline distribution.

## Refreshing screenshots

The Playwright-based capture helper remains a Node tool. If you need screenshots, install Playwright and run the capture script manually after building with Make:

```bash
# one-time
npx playwright install chromium

# build HTML then capture
make
node scripts/capture-screenshots.js
```

## Shared template development tips

* Place markup reused across calculators in `variants/shared/fragments/`. Reference fragments using `{{> ...}}`. Fragment includes resolve recursively so fragments can reference other fragments.
* To add a new calculator, create `variants/<name>/head.html` and `variants/<name>/body.html`, implement its logic in `src/variants/<name>/index.js`, then register the variant metadata in the `Makefile` with the appropriate base template (`vertical` or `landscape`).
* Keep `variants/shared/templates` limited to structural scaffolds. Most layout-specific tweaks belong either in fragments or the variant head file so they remain shareable.

## Optional test harness

The circular calculator ships with a developer-only assertion harness. To include it in the built HTML with Make, set `WITH_TESTS=1`:

```bash
WITH_TESTS=1 make
```

Open the generated HTML with `#test` in the URL hash to execute the assertions in the developer console.

## Screenshot gallery

Screenshots are generated artifacts and therefore not version-controlled. After running the capture helper you can open the following files locally:

* `docs/images/circular.png`
* `docs/images/keypad-dual.png`
* `docs/images/keypad-single.png`
* `docs/images/columnar-dual.png`

If you need to embed the gallery in documentation, upload the generated PNGs to an image host that accepts temporary assets and reference those URLs instead of the git-ignored paths.
