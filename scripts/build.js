#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const variants = [
  {
    slug: 'circular',
    entry: 'src/variants/circular/index.js',
    template: 'variants/circular/template.html',
    out: 'dist/circular.html',
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
