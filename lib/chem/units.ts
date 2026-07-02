export type UnitDef = {
  value: string;
  label: string;
  /** Multiply a value in this unit by `factor` to get the base-unit value. */
  factor: number;
};

// Basiseinheiten: Stoffmenge -> mol, Masse -> g, Volumen -> L
// So gilt: n(mol) = m(g) / M(g/mol) und m(g) = ρ(g/L) * V(L)

export const AMOUNT_UNITS: UnitDef[] = [
  { value: "kmol", label: "kmol", factor: 1000 },
  { value: "mol", label: "mol", factor: 1 },
  { value: "mmol", label: "mmol", factor: 1e-3 },
  { value: "umol", label: "µmol", factor: 1e-6 },
  { value: "nmol", label: "nmol", factor: 1e-9 },
];

export const MASS_UNITS: UnitDef[] = [
  { value: "kg", label: "kg", factor: 1000 },
  { value: "g", label: "g", factor: 1 },
  { value: "mg", label: "mg", factor: 1e-3 },
  { value: "ug", label: "µg", factor: 1e-6 },
  { value: "ng", label: "ng", factor: 1e-9 },
];

export const VOLUME_UNITS: UnitDef[] = [
  { value: "m3", label: "m³", factor: 1000 },
  { value: "L", label: "L", factor: 1 },
  { value: "mL", label: "mL", factor: 1e-3 },
  { value: "uL", label: "µL", factor: 1e-6 },
];

// Basis g/L
export const DENSITY_UNITS: UnitDef[] = [
  { value: "g_mL", label: "g/mL", factor: 1000 },
  { value: "kg_L", label: "kg/L", factor: 1000 },
  { value: "g_L", label: "g/L", factor: 1 },
  { value: "kg_m3", label: "kg/m³", factor: 1 },
];

// Basis mol/L
export const CONCENTRATION_UNITS: UnitDef[] = [
  { value: "mol_L", label: "mol/L", factor: 1 },
  { value: "mmol_L", label: "mmol/L", factor: 1e-3 },
  { value: "umol_L", label: "µmol/L", factor: 1e-6 },
  { value: "mol_mL", label: "mol/mL", factor: 1000 },
];

export function toBase(value: number, unit: string, units: UnitDef[]): number {
  const u = units.find((entry) => entry.value === unit);
  return u ? value * u.factor : value;
}

export function fromBase(baseValue: number, unit: string, units: UnitDef[]): number {
  const u = units.find((entry) => entry.value === unit);
  return u ? baseValue / u.factor : baseValue;
}

/** Deutsches Komma als Dezimaltrennzeichen zulassen; "" -> null statt NaN. */
export function parseNum(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Auf ~6 signifikante Stellen runden, ohne unnötige Nachkommanullen. */
export function formatNum(value: number): string {
  if (!Number.isFinite(value)) return "";
  return parseFloat(value.toPrecision(6)).toString();
}
