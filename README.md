# quickcalcs

Set of HTML calculators for children and simple operations.

## Development

Each calculator variant lives under `src/variants/<name>` with an accompanying HTML template inside `variants/<name>/template.html`.

### Building individual HTML files

1. Install dependencies once:
   ```bash
   npm install
   ```
2. Run the build script:
   ```bash
   npm run build
   ```

This produces a standalone HTML file per variant in `dist/`. For example:

* `dist/circular.html` — swipe-driven circular dial calculator rendered on canvas.
* `dist/keypad-dual.html` — dual keypad calculator with side-by-side pads dedicated to each operand.
* `dist/keypad-single.html` — classic keypad with a lock toggle to route digits to the left or right operand.
* `dist/columnar-dual.html` — vertical column calculator with stacked digits per operand.

Every output file is fully self-contained so it can be shared offline.

To add a new variant, place its JavaScript entry point under `src/variants/<variant>/index.js`, create a matching template with the `/*__SCRIPT__*/` placeholder, and register it in `scripts/build.js`.

### Optional test harness

The circular calculator includes an exploratory test harness that is excluded from production builds. If you need to embed the tests (for example, to verify the layout from the packaged HTML), run:

```bash
npm run build -- --with-tests
```

Opening the generated HTML with `#test` in the URL hash will execute the assertions in the developer console.
