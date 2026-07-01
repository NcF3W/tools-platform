export const PAPER_SIZES_MM = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES_MM;

export function calcGrid(
  srcWidthPt: number,
  srcHeightPt: number,
  target: PaperSize,
) {
  const PT_TO_MM = 0.352778;
  const srcW = srcWidthPt * PT_TO_MM;
  const srcH = srcHeightPt * PT_TO_MM;
  const { w, h } = PAPER_SIZES_MM[target];

  // Toleranz: rundet nur dann auf, wenn wirklich mehr als 2% der
  // Zielbreite/-höhe übrig sind. Verhindert, dass minimale
  // ISO-216-Rundungsdifferenzen (z.B. A1 ist 841mm statt exakt 840mm
  // = 2×A3-Höhe) eine ganze zusätzliche Reihe/Spalte erzwingen.
  const TOLERANCE = 0.02;

  const cols = Math.max(1, Math.ceil(srcW / w - TOLERANCE));
  const rows = Math.max(1, Math.ceil(srcH / h - TOLERANCE));

  return { cols, rows };
}
