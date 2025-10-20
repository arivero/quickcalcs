#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const args = process.argv.slice(2);
const withTests = args.includes('--with-tests');

const variants = [
  {
    slug: 'circular',
    entry: 'src/variants/circular/index.js',
    template: 'variants/circular/template.html',
    out: 'dist/circular.html',
  },
  {
    slug: 'keypad-dual',
    entry: 'src/variants/keypad-dual/index.js',
    template: 'variants/keypad-dual/template.html',
    out: 'dist/keypad-dual.html',
  },
  {
    slug: 'keypad-single',
    entry: 'src/variants/keypad-single/index.js',
    template: 'variants/keypad-single/template.html',
    out: 'dist/keypad-single.html',
  },
  {
    slug: 'columnar-dual',
    entry: 'src/variants/columnar-dual/index.js',
    template: 'variants/columnar-dual/template.html',
    out: 'dist/columnar-dual.html',
  },
];

async function buildVariant(variant) {
  const entryPath = resolve(rootDir, variant.entry);
  const templatePath = resolve(rootDir, variant.template);
  const outPath = resolve(rootDir, variant.out);

  const bundle = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    minify: false,
    write: false,
    target: 'es2019',
    format: 'esm',
    platform: 'browser',
    legalComments: 'none',
    define: {
      __INCLUDE_TESTS__: withTests ? 'true' : 'false',
      'process.env.NODE_ENV': withTests ? '"development"' : '"production"',
    },
  });

  if (!bundle.outputFiles || bundle.outputFiles.length === 0) {
    throw new Error(`No output generated for variant ${variant.slug}`);
  }

  const script = bundle.outputFiles[0].text.trim();
  const template = await readFile(templatePath, 'utf8');

  if (!template.includes('/*__SCRIPT__*/')) {
    throw new Error(`Template for ${variant.slug} is missing /*__SCRIPT__*/ placeholder.`);
  }

  const finalHtml = template.replace('/*__SCRIPT__*/', script);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, finalHtml, 'utf8');
  console.log(`Built ${variant.slug} → ${variant.out}`);
}

async function main() {
  await Promise.all(variants.map(buildVariant));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
