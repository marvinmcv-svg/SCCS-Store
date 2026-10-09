/**
 * Size charts and the sizing helper.
 * PLACEHOLDER measurements: typical Bolivian school-uniform charts. Replace
 * with the supplier's chart when available; the helper adapts automatically.
 */
export type SizeRow = { size: string; age: string; heightCm: [number, number]; chestCm: [number, number] };

export const TOPS_CHART: SizeRow[] = [
  { size: '4', age: '3–4', heightCm: [98, 110], chestCm: [54, 57] },
  { size: '6', age: '5–6', heightCm: [110, 122], chestCm: [58, 62] },
  { size: '8', age: '7–8', heightCm: [122, 134], chestCm: [63, 67] },
  { size: '10', age: '9–10', heightCm: [134, 146], chestCm: [68, 72] },
  { size: '12', age: '11–12', heightCm: [146, 152], chestCm: [73, 77] },
  { size: '14', age: '13–14', heightCm: [152, 158], chestCm: [78, 82] },
  { size: '16', age: '15', heightCm: [158, 164], chestCm: [83, 87] },
  { size: 'XS', age: '15+', heightCm: [160, 166], chestCm: [84, 88] },
  { size: 'S', age: '16+', heightCm: [164, 172], chestCm: [88, 94] },
  { size: 'M', age: '16+', heightCm: [170, 178], chestCm: [94, 100] },
  { size: 'L', age: '16+', heightCm: [176, 184], chestCm: [100, 106] },
  { size: 'XL', age: '16+', heightCm: [182, 192], chestCm: [106, 114] },
];

/**
 * Recommend a size from height (preferred) or age.
 * When the child sits within 2 cm of the upper bound we size up: uniforms
 * are bought once a year and kids grow ~5–6 cm/year.
 */
export function recommendSize(input: { heightCm?: number; age?: number }, available?: string[]): string | null {
  const chart = available ? TOPS_CHART.filter((r) => available.includes(r.size)) : TOPS_CHART;
  if (!chart.length) return null;
  if (input.heightCm && input.heightCm > 0) {
    const h = input.heightCm;
    const idx = chart.findIndex((r) => h >= r.heightCm[0] && h < r.heightCm[1]);
    if (idx === -1) return h < chart[0].heightCm[0] ? chart[0].size : chart[chart.length - 1].size;
    const row = chart[idx];
    const growthRoom = row.heightCm[1] - h <= 2 && idx + 1 < chart.length;
    return growthRoom ? chart[idx + 1].size : row.size;
  }
  if (input.age && input.age > 0) {
    const a = input.age;
    const row = chart.find((r) => {
      const [lo, hi] = r.age.replace('+', '').split('–').map(Number);
      return hi ? a >= lo && a <= hi : a >= lo;
    });
    return row?.size ?? (a < 4 ? chart[0].size : chart[chart.length - 1].size);
  }
  return null;
}
