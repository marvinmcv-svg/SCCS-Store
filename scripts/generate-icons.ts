/** Builds PWA / favicon PNGs from public/brand/crest.svg.  npm run icons:generate */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();

async function icon(size: number, file: string, { padding = 0.14, bg = '#ffffff' } = {}) {
  const svg = await readFile(path.join(root, 'public/brand/crest.svg'));
  const inner = Math.round(size * (1 - padding * 2));
  const crest = await sharp(svg, { density: 600 }).resize({ height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: crest, gravity: 'center' }])
    .png()
    .toFile(path.join(root, 'public/icons', file));
}

async function main() {
  await icon(192, 'icon-192.png', { padding: 0.1 });
  await icon(512, 'icon-512.png', { padding: 0.1 });
  await icon(512, 'maskable-512.png', { padding: 0.22 });
  await icon(180, 'apple-touch-icon.png', { padding: 0.12 });
  await icon(32, 'favicon-32.png', { padding: 0.04 });
  console.log('icons generated');
}
main();
