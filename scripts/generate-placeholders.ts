/**
 * Generates placeholder product + editorial imagery into /public/images and
 * a manifest with blur placeholders (public/images/manifest.json).
 *
 *   npm run images:generate
 *
 * Re-run any time art changes. Real photography uploaded via the admin
 * replaces these per product; see docs/imagery.md.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ART, C, crest, type ArtKey } from './placeholders/art';

const OUT = path.join(process.cwd(), 'public/images');

async function svgToWebp(svg: string, file: string, width: number, height: number) {
  const buf = await sharp(Buffer.from(svg), { density: 144 })
    .resize(width, height)
    .webp({ quality: 86, alphaQuality: 90, effort: 5 })
    .toBuffer();
  await writeFile(file, buf);
  const blur = await sharp(buf).resize(10).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${blur.toString('base64')}`;
}

const wrap = (inner: string, w = 800, h = 1000, bg?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}${inner}</svg>`;

/** Two views per product: full garment, and a detail crop (crest/texture). */
async function product(key: ArtKey, manifest: Record<string, { url: string; blur: string }[]>) {
  const art = ART[key]();
  const views = [
    { suffix: '1', svg: wrap(art) },
    { suffix: '2', svg: wrap(`<g transform="translate(-520 -560) scale(2.3)">${art}</g>`) },
  ];
  manifest[key] = [];
  for (const v of views) {
    const file = path.join(OUT, 'products', `${key}-${v.suffix}.webp`);
    const blur = await svgToWebp(v.svg, file, 800, 1000);
    manifest[key].push({ url: `/images/products/${key}-${v.suffix}.webp`, blur });
  }
}

function heroArt(w: number, h: number, portrait: boolean) {
  const g = `<defs>
    <radialGradient id="glow" cx="${portrait ? '50%' : '68%'}" cy="${portrait ? '42%' : '50%'}" r="70%"><stop offset="0" stop-color="#3b3b8a"/><stop offset="1" stop-color="${C.navyDeep}"/></radialGradient>
  </defs><rect width="100%" height="100%" fill="url(#glow)"/>`;
  const big = `<g opacity=".09" transform="translate(${portrait ? w / 2 : w * 0.7} ${portrait ? h * 0.38 : h * 0.5}) scale(${portrait ? 13 : 15})">${crest(0, 0, 1, true)}</g>`;
  const items = portrait
    ? `<g transform="translate(${w * 0.06} ${h * 0.14}) scale(1.1)">${ART.polo()}</g>
       <g transform="translate(${w * 0.36} ${h * 0.28}) scale(.95) rotate(8 400 500)">${ART.sweater()}</g>
       <g transform="translate(${w * 0.02} ${h * 0.42}) scale(.7) rotate(-6 400 500)">${ART.backpack()}</g>`
    : `<g transform="translate(${w * 0.44} ${h * 0.02}) scale(1.05)">${ART.polo()}</g>
       <g transform="translate(${w * 0.62} ${h * 0.1}) scale(.95) rotate(8 400 500)">${ART.sweater()}</g>
       <g transform="translate(${w * 0.36} ${h * 0.3}) scale(.62) rotate(-6 400 500)">${ART.backpack()}</g>`;
  const fade = `<defs><linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#fade)"/>`;
  return wrap(`${g}${big}${items}${fade}`, w, h);
}

function editorialArt(w: number, h: number) {
  return wrap(
    `<rect width="100%" height="100%" fill="${C.red}"/>
     <g opacity=".12" transform="translate(${w * 0.5} ${h * 0.5}) scale(${Math.min(w, h) / 70})">${crest(0, 0, 1, true)}</g>
     <g transform="translate(${w / 2 - 400 * 1.05} ${h / 2 - 520 * 1.05}) scale(1.05)">${ART.jacket()}</g>
     <defs><linearGradient id="f2" x1="0" x2="0" y1="0" y2="1"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f2)"/>`,
    w,
    h,
  );
}

function bundleArt(keys: ArtKey[], bg: string) {
  const pos = [
    [-20, 40, 0.62, -6],
    [300, 10, 0.62, 5],
    [-10, 420, 0.55, 3],
    [320, 430, 0.55, -4],
  ];
  return wrap(
    `<rect width="100%" height="100%" fill="${bg}"/>` +
      keys
        .slice(0, 4)
        .map((k, i) => {
          const [x, y, s, r] = pos[i];
          return `<g transform="translate(${x} ${y}) scale(${s}) rotate(${r} 400 500)">${ART[k]()}</g>`;
        })
        .join(''),
  );
}

async function main() {
  await mkdir(path.join(OUT, 'products'), { recursive: true });
  await mkdir(path.join(OUT, 'hero'), { recursive: true });
  await mkdir(path.join(OUT, 'bundles'), { recursive: true });
  const manifest: Record<string, { url: string; blur: string }[]> = {};

  for (const key of Object.keys(ART) as ArtKey[]) await product(key, manifest);

  const heroes: Record<string, string> = {};
  heroes['back-to-school-portrait'] = await svgToWebp(
    heroArt(1200, 1600, true),
    path.join(OUT, 'hero/back-to-school-portrait.webp'),
    1200,
    1600,
  );
  heroes['back-to-school-landscape'] = await svgToWebp(
    heroArt(2400, 1200, false),
    path.join(OUT, 'hero/back-to-school-landscape.webp'),
    2400,
    1200,
  );
  heroes['everyday-portrait'] = await svgToWebp(editorialArt(1200, 1500), path.join(OUT, 'hero/everyday-portrait.webp'), 1200, 1500);
  heroes['everyday-landscape'] = await svgToWebp(editorialArt(2400, 1100), path.join(OUT, 'hero/everyday-landscape.webp'), 2400, 1100);

  const bundles: Record<string, ArtKey[]> = {
    'kit-inicial': ['polo', 'sweater', 'backpackSmall', 'peShorts'],
    'kit-primaria': ['polo', 'bermuda', 'sweater', 'peTee'],
    'kit-middle-school': ['polo', 'pants', 'jacket', 'dryTee'],
    'kit-high-school': ['poloLong', 'pants', 'jacket', 'sweatsuit'],
  };
  for (const [slug, keys] of Object.entries(bundles)) {
    heroes[`bundle-${slug}`] = await svgToWebp(bundleArt(keys, '#f5f5f5'), path.join(OUT, `bundles/${slug}.webp`), 800, 1000);
  }

  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ products: manifest, editorial: heroes }, null, 2));
  console.log(`Generated ${Object.keys(manifest).length * 2} product images + ${Object.keys(heroes).length} editorial images`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
