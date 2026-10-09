// Dev helper: deep-merge a JSON patch {es:{...}, en:{...}} into src/messages/*.json
import fs from 'node:fs';
const patch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v; return a; };
for (const loc of ['es', 'en']) {
  const file = `src/messages/${loc}.json`;
  const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(merge(cur, patch[loc] ?? {}), null, 2) + '\n');
}
console.log('merged');
