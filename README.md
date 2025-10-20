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

This produces a standalone HTML file per variant in `dist/`. For example, the circular dial calculator is emitted as `dist/circular.html`. Every output file is fully self-contained so it can be shared offline.

To add a new variant, place its JavaScript entry point under `src/variants/<variant>/index.js`, create a matching template with the `/*__SCRIPT__*/` placeholder, and register it in `scripts/build.js`.
