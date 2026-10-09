/**
 * Vector placeholder art for products, drawn in the real uniform colours.
 * Every function returns SVG markup for an 800×1000 (4:5) canvas with a
 * transparent background so the card backdrop token shows through in both
 * light and dark mode. These are clearly illustrations, not photos — they are
 * meant to be replaced by real photography (see docs/imagery.md).
 */

export const C = {
  navy: '#292963',
  navyDeep: '#1b1b45',
  red: '#b72034',
  redDeep: '#8f1828',
  white: '#fbfbfb',
  whiteShade: '#e7e7ea',
  khaki: '#c9b68c',
  khakiShade: '#a8956b',
  gold: '#f8a724',
  steel: '#3a3a74',
  canvas: '#e9e1cf',
  ink: '#14142b',
};

let uid = 0;
const id = (p: string) => `${p}${++uid}`;

function shadow(cx = 400, cy = 900, rx = 260, ry = 26) {
  const g = id('sh');
  return `<defs><radialGradient id="${g}"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${g})"/>`;
}

/** Soft vertical light falloff that gives flat shapes some volume. */
function volume(path: string, strength = 0.12) {
  const g = id('vol');
  return `<defs><linearGradient id="${g}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="${strength}"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="${strength * 0.6}"/><stop offset="1" stop-color="#000" stop-opacity="${strength}"/></linearGradient></defs><path d="${path}" fill="url(#${g})"/>`;
}

/** Mini SCCS crest: shield, initials and the US + Bolivian flags. */
export function crest(x: number, y: number, s = 1, onDark = false) {
  const stroke = onDark ? '#ffffff' : C.navy;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0-26c11 0 20 2 26 5v19C26 14 14 25 0 30-14 25-26 14-26-2v-19c6-3 15-5 26-5z" fill="${onDark ? 'none' : '#fff'}" stroke="${stroke}" stroke-width="3"/>
    <text x="0" y="-8" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="10" letter-spacing="2" fill="${stroke}">SCCS</text>
    <rect x="-17" y="0" width="16" height="11" fill="${C.red}"/><rect x="-17" y="0" width="7" height="6" fill="${C.navy}"/>
    <rect x="1" y="0" width="16" height="3.7" fill="#d52b1e"/><rect x="1" y="3.7" width="16" height="3.7" fill="#f4d000"/><rect x="1" y="7.4" width="16" height="3.6" fill="#007934"/>
  </g>`;
}

const TEE = 'M292 222 L214 252 L104 372 L184 450 L248 402 L250 830 Q400 850 550 830 L552 402 L616 450 L696 372 L586 252 L508 222 Q400 282 292 222 Z';
const LONG =
  'M292 222 L210 252 Q150 290 132 420 L104 760 L186 772 L240 470 L250 830 Q400 850 550 830 L560 470 L614 772 L696 760 L668 420 Q650 290 590 252 L508 222 Q400 282 292 222 Z';

function top(color: string, shade: string, long = false) {
  const p = long ? LONG : TEE;
  return `<path d="${p}" fill="${color}" stroke="${shade}" stroke-width="3" stroke-linejoin="round"/>${volume(p)}`;
}

export function polo({ long = false }: { long?: boolean } = {}) {
  return `${shadow()}${top(C.white, C.whiteShade, long)}
  <path d="M292 222 Q330 300 362 330 L400 268 L438 330 Q470 300 508 222 Q470 250 400 252 Q330 250 292 222 Z" fill="#fff" stroke="${C.whiteShade}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M384 262 L384 420 L416 420 L416 262" fill="none" stroke="${C.whiteShade}" stroke-width="3"/>
  ${[300, 340, 380].map((y) => `<circle cx="400" cy="${y}" r="5" fill="#fff" stroke="#cfcfd6" stroke-width="2"/>`).join('')}
  ${long ? '' : `<path d="M110 378 L188 452" stroke="${C.whiteShade}" stroke-width="5"/><path d="M690 378 L612 452" stroke="${C.whiteShade}" stroke-width="5"/>`}
  ${crest(486, 352, 1.15)}`;
}

export function peTee({ dry = false }: { dry?: boolean } = {}) {
  const color = dry ? C.navy : C.white;
  const shade = dry ? C.navyDeep : C.whiteShade;
  return `${shadow()}${top(color, shade)}
  <path d="M330 236 Q400 300 470 236" fill="none" stroke="${dry ? '#fff' : C.whiteShade}" stroke-width="10" stroke-linecap="round" opacity="${dry ? 0.9 : 1}"/>
  ${dry ? `<path d="M206 262 L118 368" stroke="${C.red}" stroke-width="12"/><path d="M594 262 L682 368" stroke="${C.red}" stroke-width="12"/><text x="400" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="58" letter-spacing="-1" fill="#fff">JAGUARS</text><text x="400" y="600" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="22" letter-spacing="8" fill="${C.gold}">ATHLETICS</text>` : crest(470, 340, 1.05)}`;
}

function bottoms(len: number, color: string, shade: string, opts: { stripe?: string; cuff?: boolean } = {}) {
  const yb = 360 + len;
  const p = `M244 300 L556 300 L572 ${yb} L418 ${yb + 10} L400 470 L382 ${yb + 10} L228 ${yb} Z`;
  return `${shadow(400, yb + 70, 230)}<path d="${p}" fill="${color}" stroke="${shade}" stroke-width="3" stroke-linejoin="round"/>${volume(p, 0.14)}
  <rect x="244" y="300" width="312" height="44" fill="${color}" stroke="${shade}" stroke-width="3"/>
  ${opts.stripe ? `<path d="M236 344 L224 ${yb - 4}" stroke="${opts.stripe}" stroke-width="14"/><path d="M564 344 L576 ${yb - 4}" stroke="${opts.stripe}" stroke-width="14"/>` : ''}
  ${opts.cuff ? `<path d="M230 ${yb - 30} L382 ${yb - 22}" stroke="${shade}" stroke-width="3"/><path d="M418 ${yb - 22} L570 ${yb - 30}" stroke="${shade}" stroke-width="3"/>` : ''}
  ${[290, 350, 450, 510].map((x) => `<rect x="${x - 6}" y="296" width="12" height="52" rx="3" fill="${shade}" opacity=".55"/>`).join('')}
  <path d="M400 344 L400 440" stroke="${shade}" stroke-width="3"/>`;
}

export const peShorts = () => bottoms(260, C.red, C.redDeep, { stripe: '#fff' });
export const bermuda = () => bottoms(330, C.khaki, C.khakiShade, { cuff: true });
export const pants = () => bottoms(500, C.khaki, C.khakiShade);

export function sweater() {
  return `${shadow()}${top(C.red, C.redDeep, true)}
  <path d="M330 232 L400 330 L470 232" fill="none" stroke="${C.redDeep}" stroke-width="16" stroke-linejoin="round"/>
  <rect x="252" y="790" width="296" height="40" fill="${C.redDeep}" opacity=".55"/>
  <rect x="104" y="732" width="84" height="34" fill="${C.redDeep}" opacity=".55" transform="rotate(3 146 750)"/>
  <rect x="612" y="732" width="84" height="34" fill="${C.redDeep}" opacity=".55" transform="rotate(-3 654 750)"/>
  ${crest(480, 380, 1.1)}`;
}

export function jacket() {
  return `${shadow()}${top(C.red, C.redDeep, true)}
  <path d="M318 214 Q400 250 482 214 L492 250 Q400 290 308 250 Z" fill="${C.redDeep}"/>
  <path d="M400 262 L400 830" stroke="#d9d9de" stroke-width="7"/><path d="M400 262 L400 830" stroke="${C.ink}" stroke-width="2" stroke-dasharray="4 6"/>
  <rect x="393" y="300" width="14" height="30" rx="3" fill="#d9d9de"/>
  <path d="M290 600 L360 600 M440 600 L510 600" stroke="${C.redDeep}" stroke-width="5" stroke-linecap="round"/>
  ${crest(480, 380, 1)}`;
}

export function sweatsuit() {
  return `<g transform="translate(-130 -40) scale(.86)">${jacket()}</g><g transform="translate(250 230) scale(.72)">${bottoms(500, C.red, C.redDeep, { stripe: '#fff' })}</g>`;
}

export function hoodie() {
  const p = LONG;
  return `${shadow()}<path d="M300 236 Q300 120 400 116 Q500 120 500 236 Q400 300 300 236Z" fill="${C.navyDeep}"/>${top(C.navy, C.navyDeep, true)}
  <path d="M310 236 Q400 330 490 236" fill="none" stroke="${C.navyDeep}" stroke-width="12"/>
  <path d="M296 610 L504 610 L530 760 L270 760 Z" fill="${C.navyDeep}" opacity=".45"/>
  <text x="400" y="520" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="80" letter-spacing="-2" fill="#fff">JAGUARS</text>
  <text x="400" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="20" letter-spacing="8" fill="${C.gold}">EST. 1959</text>
  ${volume(p, 0.06)}`;
}

export function backpack({ small = false }: { small?: boolean } = {}) {
  const s = small ? 0.82 : 1;
  const p = 'M250 300 Q250 220 330 214 L470 214 Q550 220 550 300 L560 820 Q560 860 520 860 L280 860 Q240 860 240 820 Z';
  return `<g transform="translate(${400 - 400 * s} ${(1 - s) * 520}) scale(${s})">${shadow(400, 880, 220)}
  <path d="M340 214 Q340 150 400 150 Q460 150 460 214" fill="none" stroke="${C.navyDeep}" stroke-width="18"/>
  <path d="${p}" fill="${C.navy}"/>${volume(p, 0.2)}
  <path d="M290 560 Q290 520 330 520 L470 520 Q510 520 510 560 L512 800 Q512 830 482 830 L318 830 Q288 830 288 800 Z" fill="${C.navyDeep}"/>
  <path d="M300 540 L500 540" stroke="${C.red}" stroke-width="10" stroke-linecap="round"/>
  <path d="M262 300 Q400 260 538 300" fill="none" stroke="#d9d9de" stroke-width="5" stroke-dasharray="2 6"/>
  ${crest(400, 420, 1.6, true)}
  <rect x="380" y="640" width="40" height="12" rx="6" fill="${C.gold}"/></g>`;
}

export function lunchBag() {
  const p = 'M220 400 L580 400 L580 820 Q580 850 550 850 L250 850 Q220 850 220 820 Z';
  return `${shadow(400, 880, 230)}<path d="M330 400 L330 330 Q330 300 360 300 L440 300 Q470 300 470 330 L470 400" fill="none" stroke="${C.navyDeep}" stroke-width="20"/>
  <path d="${p}" fill="${C.navy}"/>${volume(p, 0.2)}
  <path d="M220 400 L580 400 L580 480 L220 480 Z" fill="${C.navyDeep}"/>
  <path d="M232 440 L568 440" stroke="#d9d9de" stroke-width="5" stroke-dasharray="2 6"/>
  <rect x="270" y="560" width="260" height="190" rx="18" fill="none" stroke="${C.red}" stroke-width="8"/>
  ${crest(400, 650, 1.5, true)}`;
}

export function bottle() {
  const p = 'M330 330 Q330 290 360 280 L440 280 Q470 290 470 330 L476 860 Q476 890 446 890 L354 890 Q324 890 324 860 Z';
  return `${shadow(400, 905, 120, 18)}<rect x="350" y="170" width="100" height="120" rx="20" fill="${C.ink}"/><path d="M375 170 Q400 120 425 170" fill="none" stroke="${C.ink}" stroke-width="14"/>
  <path d="${p}" fill="${C.navy}"/>${volume(p, 0.3)}
  <text x="400" y="620" text-anchor="middle" transform="rotate(-90 400 620)" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="56" letter-spacing="-1" fill="#fff">JAGUARS</text>
  <rect x="324" y="820" width="152" height="10" fill="${C.red}"/>`;
}

export function cap() {
  return `${shadow(400, 760, 250)}<path d="M200 600 Q200 330 400 320 Q600 330 600 600 Z" fill="${C.navy}"/>${volume('M200 600 Q200 330 400 320 Q600 330 600 600 Z', 0.2)}
  <path d="M400 322 L400 600 M300 345 Q330 470 320 600 M500 345 Q470 470 480 600" stroke="${C.navyDeep}" stroke-width="3" fill="none"/>
  <path d="M196 596 Q400 650 604 596 Q640 660 600 712 Q400 780 200 712 Q160 660 196 596 Z" fill="${C.navyDeep}"/><path d="M220 700 Q400 760 580 700" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="4"/>
  <circle cx="400" cy="322" r="12" fill="${C.navyDeep}"/>
  ${crest(400, 480, 1.7, true)}`;
}

export function notebook() {
  return `${shadow(400, 880, 220)}<rect x="250" y="190" width="320" height="660" rx="10" fill="${C.navy}"/>${volume('M250 190 L570 190 L570 850 L250 850 Z', 0.15)}
  <rect x="250" y="190" width="38" height="660" fill="${C.navyDeep}"/>
  ${Array.from({ length: 14 }, (_, i) => `<circle cx="269" cy="${230 + i * 45}" r="6" fill="#d9d9de"/>`).join('')}
  <rect x="330" y="330" width="200" height="120" rx="6" fill="#fff"/>
  <text x="430" y="402" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="30" fill="${C.navy}">SCCS</text>
  ${crest(430, 620, 2.1, true)}`;
}

export function pencilCase() {
  const p = 'M170 430 Q170 380 230 380 L570 380 Q630 380 630 430 L630 640 Q630 690 570 690 L230 690 Q170 690 170 640 Z';
  return `${shadow(400, 730, 250)}<path d="${p}" fill="${C.navy}"/>${volume(p, 0.2)}
  <path d="M190 420 L610 420" stroke="#d9d9de" stroke-width="10"/><path d="M190 420 L610 420" stroke="${C.ink}" stroke-width="2" stroke-dasharray="3 5"/>
  <rect x="590" y="408" width="34" height="24" rx="6" fill="${C.gold}"/>
  ${crest(400, 560, 1.6, true)}`;
}

export function mug() {
  return `${shadow(380, 800, 200)}<path d="M520 470 Q640 470 640 580 Q640 690 520 690" fill="none" stroke="#ececf0" stroke-width="36"/>
  <path d="M250 380 L530 380 L520 770 Q520 790 500 790 L280 790 Q260 790 260 770 Z" fill="#fff" stroke="#e1e1e6" stroke-width="3"/>${volume('M250 380 L530 380 L520 770 L260 770 Z', 0.1)}
  <ellipse cx="390" cy="380" rx="140" ry="18" fill="#efeff3" stroke="#e1e1e6" stroke-width="3"/>
  ${crest(390, 540, 2.2)}
  <text x="390" y="690" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="40" fill="${C.navy}">JAGUARS</text>`;
}

export function keychain() {
  return `${shadow(400, 820, 120, 16)}<circle cx="400" cy="270" r="70" fill="none" stroke="#b8b8c2" stroke-width="12"/>
  <path d="M400 340 L400 400" stroke="#b8b8c2" stroke-width="10"/>
  <path d="M310 400 L490 400 L490 640 Q490 740 400 780 Q310 740 310 640 Z" fill="${C.gold}"/>${volume('M310 400 L490 400 L490 640 Q490 740 400 780 Q310 740 310 640 Z', 0.2)}
  <text x="400" y="640" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="150" fill="${C.navy}">J</text>`;
}

export function tote() {
  return `${shadow(400, 900, 230)}<path d="M320 360 Q320 200 400 200 Q480 200 480 360" fill="none" stroke="${C.navy}" stroke-width="16"/>
  <path d="M230 360 L570 360 L600 860 L200 860 Z" fill="${C.canvas}"/>${volume('M230 360 L570 360 L600 860 L200 860 Z', 0.12)}
  ${crest(400, 560, 2.4)}
  <text x="400" y="760" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="46" letter-spacing="-1" fill="${C.navy}">SANTA CRUZ</text>
  <text x="400" y="800" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="20" letter-spacing="6" fill="${C.red}">COOPERATIVE SCHOOL</text>`;
}

export function plush() {
  return `${shadow(400, 880, 220)}<ellipse cx="400" cy="650" rx="210" ry="200" fill="${C.gold}"/>
  <circle cx="400" cy="380" r="150" fill="${C.gold}"/>
  <circle cx="290" cy="260" r="42" fill="${C.gold}"/><circle cx="510" cy="260" r="42" fill="${C.gold}"/>
  <circle cx="290" cy="260" r="20" fill="#d98d16"/><circle cx="510" cy="260" r="20" fill="#d98d16"/>
  ${[
    [330, 600],
    [470, 620],
    [400, 720],
    [300, 720],
    [500, 740],
    [360, 520],
    [450, 520],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="#7a4a0a" stroke-width="7"/>`)
    .join('')}
  <circle cx="350" cy="370" r="14" fill="${C.ink}"/><circle cx="450" cy="370" r="14" fill="${C.ink}"/>
  <ellipse cx="400" cy="430" rx="62" ry="44" fill="#fde7c0"/><path d="M386 418 L414 418 L400 434 Z" fill="${C.ink}"/>
  <path d="M260 560 Q400 520 540 560" fill="none" stroke="${C.red}" stroke-width="22"/>`;
}

export function stickers() {
  return `${shadow(400, 860, 230)}<rect x="210" y="250" width="380" height="560" rx="18" fill="#fff" stroke="#e1e1e6" stroke-width="3" transform="rotate(-5 400 530)"/>
  <circle cx="320" cy="380" r="70" fill="${C.navy}"/>${crest(320, 382, 1.6, true)}
  <rect x="410" y="320" width="130" height="110" rx="14" fill="${C.red}"/><text x="475" y="392" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="40" fill="#fff">GO!</text>
  <path d="M260 520 L560 520 L540 620 L280 620 Z" fill="${C.gold}"/><text x="410" y="584" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="42" fill="${C.navy}">JAGUARS</text>
  <circle cx="330" cy="710" r="54" fill="#fff" stroke="${C.navy}" stroke-width="8"/><text x="330" y="726" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="44" fill="${C.navy}">59</text>
  <rect x="420" y="660" width="130" height="100" rx="50" fill="${C.navy}"/><text x="485" y="722" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="28" fill="#fff">SCCS</text>`;
}

export function socks() {
  const sock = (x: number, r: number) =>
    `<g transform="translate(${x} 0) rotate(${r} 400 500)"><path d="M350 220 L450 220 L450 640 Q450 700 510 730 L560 760 Q600 790 580 830 Q560 860 510 850 L380 810 Q350 800 350 760 Z" fill="#fff" stroke="#e1e1e6" stroke-width="3"/><rect x="350" y="220" width="100" height="40" fill="#f0f0f3"/><rect x="350" y="290" width="100" height="14" fill="${C.red}"/><rect x="350" y="316" width="100" height="14" fill="${C.navy}"/></g>`;
  return `${shadow(420, 880, 240)}${sock(-70, -6)}${sock(40, 4)}`;
}

export function duffel() {
  const p = 'M160 470 Q160 400 240 400 L560 400 Q640 400 640 470 L640 760 Q640 800 600 800 L200 800 Q160 800 160 760 Z';
  return `${shadow(400, 840, 280)}<path d="M300 400 Q300 300 400 300 Q500 300 500 400" fill="none" stroke="${C.navyDeep}" stroke-width="22"/>
  <path d="${p}" fill="${C.navy}"/>${volume(p, 0.2)}
  <path d="M170 450 L630 450" stroke="#d9d9de" stroke-width="8"/>
  <rect x="160" y="620" width="480" height="24" fill="${C.red}"/>
  <text x="400" y="580" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="64" letter-spacing="-2" fill="#fff">JAGUARS</text>`;
}

export const ART = {
  polo: () => polo(),
  poloLong: () => polo({ long: true }),
  peTee: () => peTee(),
  dryTee: () => peTee({ dry: true }),
  peShorts,
  bermuda,
  pants,
  sweater,
  jacket,
  sweatsuit,
  hoodie,
  backpack: () => backpack(),
  backpackSmall: () => backpack({ small: true }),
  lunchBag,
  bottle,
  cap,
  notebook,
  pencilCase,
  mug,
  keychain,
  tote,
  plush,
  stickers,
  socks,
  duffel,
} as const;
export type ArtKey = keyof typeof ART;
