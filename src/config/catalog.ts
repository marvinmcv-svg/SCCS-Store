/**
 * Catalog vocabulary shared by storefront, admin, seed and validation.
 * Grades follow the school's own structure (PK–12, ES / MS / HS).
 */

export const GRADES = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
export type Grade = (typeof GRADES)[number];

export const DIVISIONS = [
  { id: 'early', grades: ['PK', 'K'] as Grade[], es: 'Inicial', en: 'Early Years' },
  { id: 'elementary', grades: ['1', '2', '3', '4', '5'] as Grade[], es: 'Primaria', en: 'Elementary' },
  { id: 'middle', grades: ['6', '7', '8'] as Grade[], es: 'Middle School', en: 'Middle School' },
  { id: 'high', grades: ['9', '10', '11', '12'] as Grade[], es: 'High School', en: 'High School' },
] as const;
export type DivisionId = (typeof DIVISIONS)[number]['id'];

export function divisionOf(grade: string): DivisionId | undefined {
  return DIVISIONS.find((d) => (d.grades as string[]).includes(grade))?.id;
}

export function gradeLabel(grade: string, locale: string): string {
  if (grade === 'PK') return locale === 'es' ? 'Pre-Kínder' : 'Pre-K';
  if (grade === 'K') return locale === 'es' ? 'Kínder' : 'Kindergarten';
  return locale === 'es' ? `${grade}° grado` : `Grade ${grade}`;
}

/** Garment types drive saved sizes, the uniform checklist and size charts. */
export const GARMENT_TYPES = [
  'POLO',
  'PE_TEE',
  'PE_SHORTS',
  'BERMUDA',
  'PANTS',
  'SWEATER',
  'JACKET',
  'SWEATSUIT',
  'BACKPACK',
  'LUNCH_BAG',
  'BOTTLE',
  'CAP',
  'NOTEBOOK',
  'PENCIL_CASE',
  'SOUVENIR',
] as const;
export type GarmentType = (typeof GARMENT_TYPES)[number];

export const GARMENT_LABELS: Record<GarmentType, { es: string; en: string }> = {
  POLO: { es: 'Polo', en: 'Polo' },
  PE_TEE: { es: 'Polera de deporte', en: 'PE T-shirt' },
  PE_SHORTS: { es: 'Short de deporte', en: 'PE shorts' },
  BERMUDA: { es: 'Bermuda', en: 'Bermuda shorts' },
  PANTS: { es: 'Pantalón', en: 'Trousers' },
  SWEATER: { es: 'Chompa', en: 'Sweater' },
  JACKET: { es: 'Chamarra', en: 'Jacket' },
  SWEATSUIT: { es: 'Buzo deportivo', en: 'Sweat suit' },
  BACKPACK: { es: 'Mochila', en: 'Backpack' },
  LUNCH_BAG: { es: 'Lonchera', en: 'Lunch bag' },
  BOTTLE: { es: 'Botella', en: 'Bottle' },
  CAP: { es: 'Gorra', en: 'Cap' },
  NOTEBOOK: { es: 'Cuaderno', en: 'Notebook' },
  PENCIL_CASE: { es: 'Estuche', en: 'Pencil case' },
  SOUVENIR: { es: 'Recuerdo', en: 'Souvenir' },
};

/** Garments that need a size (and therefore can be saved on a student profile). */
export const SIZED_GARMENTS: GarmentType[] = [
  'POLO',
  'PE_TEE',
  'PE_SHORTS',
  'BERMUDA',
  'PANTS',
  'SWEATER',
  'JACKET',
  'SWEATSUIT',
];

/**
 * The "complete the uniform" checklist, derived from the published policy:
 * white logo polo, khaki bermuda or pants, red sweater or jacket,
 * PE white tee + red shorts, and a backpack.
 */
export const UNIFORM_CHECKLIST: { id: string; garments: GarmentType[]; es: string; en: string }[] = [
  { id: 'polo', garments: ['POLO'], es: 'Polo blanca con logo', en: 'White logo polo' },
  { id: 'bottoms', garments: ['BERMUDA', 'PANTS'], es: 'Bermuda o pantalón khaki', en: 'Khaki bermuda or trousers' },
  { id: 'warm', garments: ['SWEATER', 'JACKET'], es: 'Chompa o chamarra roja', en: 'Red sweater or jacket' },
  { id: 'pe-top', garments: ['PE_TEE'], es: 'Polera de deporte', en: 'PE T-shirt' },
  { id: 'pe-bottom', garments: ['PE_SHORTS', 'SWEATSUIT'], es: 'Short o buzo de deporte', en: 'PE shorts or sweat suit' },
  { id: 'bag', garments: ['BACKPACK'], es: 'Mochila', en: 'Backpack' },
];

export const KID_SIZES = ['4', '6', '8', '10', '12', '14', '16'] as const;
export const ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
export const ALL_SIZES = [...KID_SIZES, ...ADULT_SIZES, 'U'] as const;

/** Stable ordering for size grids (kids → adults → one size). */
export function sizeSort(size: string): number {
  const i = (ALL_SIZES as readonly string[]).indexOf(size);
  return i === -1 ? 999 : i;
}

export function sizeLabel(size: string, locale: string): string {
  if (size === 'U') return locale === 'es' ? 'Talla única' : 'One size';
  return size;
}
