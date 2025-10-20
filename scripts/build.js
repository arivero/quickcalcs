#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const args = process.argv.slice(2);
const withTests = args.includes('--with-tests');

const templatePresets = {
  vertical: 'variants/shared/templates/base-vertical.html',
  landscape: 'variants/shared/templates/base-landscape.html',
};

const variants = [
  {
    slug: 'circular',
    entry: 'src/variants/circular/index.js',
    title: 'Swipe Calculator — Canvas',
    base: 'vertical',
    head: 'variants/circular/head.html',
    body: 'variants/circular/body.html',
    out: 'dist/circular.html',
  },
  {
    slug: 'keypad-dual',
    entry: 'src/variants/keypad-dual/index.js',
    title: 'Dual Keypad Calculator',
    base: 'landscape',
    head: 'variants/keypad-dual/head.html',
    body: 'variants/keypad-dual/body.html',
    out: 'dist/keypad-dual.html',
  },
  {
    slug: 'keypad-single',
    entry: 'src/variants/keypad-single/index.js',
    title: 'Classic Keypad Calculator',
    base: 'vertical',
    head: 'variants/keypad-single/head.html',
    body: 'variants/keypad-single/body.html',
    out: 'dist/keypad-single.html',
  },
  {
    slug: 'columnar-dual',
    entry: 'src/variants/columnar-dual/index.js',
    title: 'Columnar Dual Calculator',
    base: 'vertical',
    head: 'variants/columnar-dual/head.html',
    body: 'variants/columnar-dual/body.html',
    out: 'dist/columnar-dual.html',
  },
];

const fragmentCache = new Map();

async function loadFragment(relativePath) {
  const key = resolve(rootDir, relativePath);
  if (fragmentCache.has(key)) {
    return fragmentCache.get(key);
  }
  const content = (await readFile(key, 'utf8')).trim();
  fragmentCache.set(key, content);
  return content;
}

const includePattern = /\{\{\s*>\s*([^\s}]+)\s*\}\}/g;

async function applyFragments(input) {
  let output = input;
  let match;
  // Continue replacing until no include placeholders remain so nested includes resolve.
  while ((match = includePattern.exec(output))) {
    const fragment = await loadFragment(match[1]);
    output = output.replace(match[0], fragment);
    includePattern.lastIndex = 0;
  }
  return output;
}

async function buildVariant(variant) {
  const entryPath = resolve(rootDir, variant.entry);
  const templateBasePath = templatePresets[variant.base];
  if (!templateBasePath) {
    throw new Error(`Unknown template base "${variant.base}" for variant ${variant.slug}`);
  }
  const basePath = resolve(rootDir, templateBasePath);
  const headPath = variant.head ? resolve(rootDir, variant.head) : null;
  const bodyPath = variant.body ? resolve(rootDir, variant.body) : null;
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
  let template = await readFile(basePath, 'utf8');
  const headRaw = headPath ? await readFile(headPath, 'utf8') : '';
  const bodyRaw = bodyPath ? await readFile(bodyPath, 'utf8') : '';
  const head = headRaw ? (await applyFragments(headRaw)).trim() : '';
  const body = bodyRaw ? (await applyFragments(bodyRaw)).trim() : '';

  if (!template.includes('/*__SCRIPT__*/')) {
    throw new Error(`Template for ${variant.slug} is missing /*__SCRIPT__*/ placeholder.`);
  }

  template = template
    .replace('<!--__TITLE__-->', variant.title ?? 'QuickCalcs')
    .replace('<!--__HEAD__-->', head ? `${head}\n` : '')
    .replace('<!--__BODY__-->', body ? `${body}\n` : '');

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
