#!/usr/bin/env node
import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const variants = [
  { slug: 'circular', title: 'Swipe Calculator — Canvas', file: 'dist/circular.html' },
  { slug: 'keypad-dual', title: 'Dual Keypad Calculator', file: 'dist/keypad-dual.html' },
  { slug: 'keypad-single', title: 'Classic Keypad Calculator', file: 'dist/keypad-single.html' },
  { slug: 'columnar-dual', title: 'Columnar Dual Calculator', file: 'dist/columnar-dual.html' },
];

const outDir = resolve(rootDir, 'docs/images');

async function ensureBuildArtifacts() {
  const missing = [];
  for (const variant of variants) {
    const filePath = resolve(rootDir, variant.file);
    try {
      await access(filePath);
    } catch {
      missing.push({ ...variant, path: filePath });
    }
  }

  if (missing.length === 0) {
    return;
  }

  console.log(
    `Missing build output for ${missing.map((item) => item.slug).join(', ')}. Running \`npm run build\` first...`,
  );

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('npm', ['run', 'build'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`npm run build exited with code ${code}`));
      }
    });
  });

  // Double-check we actually produced the expected files.
  await Promise.all(
    missing.map(async ({ slug, path }) => {
      try {
        await access(path);
      } catch {
        throw new Error(`Expected build output for ${slug} at ${path} was not created`);
      }
    }),
  );
}

async function main() {
  await ensureBuildArtifacts();
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    for (const variant of variants) {
      const filePath = resolve(rootDir, variant.file);
      const url = pathToFileURL(filePath).toString();
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const screenshotPath = resolve(outDir, `${variant.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Captured ${variant.slug} → ${screenshotPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
