export const PAPER_SIZES_MM = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES_MM;

const PT_TO_MM = 0.352778;

export function detectPaperSize(srcWidthPt: number, srcHeightPt: number) {
  const widthMm = srcWidthPt * PT_TO_MM;
  const heightMm = srcHeightPt * PT_TO_MM;

  // Hoch- und Querformat berücksichtigen
  const longSide = Math.max(widthMm, heightMm);
  const shortSide = Math.min(widthMm, heightMm);

  const TOLERANCE = 0.02;
  let match: PaperSize | null = null;
  for (const size of Object.keys(PAPER_SIZES_MM) as PaperSize[]) {
    const { w, h } = PAPER_SIZES_MM[size];
    if (
      Math.abs(longSide - h) / h < TOLERANCE &&
      Math.abs(shortSide - w) / w < TOLERANCE
    ) {
      match = size;
      break;
    }
  }

  return { size: match, widthMm: Math.round(widthMm), heightMm: Math.round(heightMm) };
}

export function calcGrid(
  srcWidthPt: number,
  srcHeightPt: number,
  target: PaperSize,
) {
  const srcW = srcWidthPt * PT_TO_MM;
  const srcH = srcHeightPt * PT_TO_MM;
  const { w, h } = PAPER_SIZES_MM[target];

  // Toleranz: rundet nur dann auf, wenn wirklich mehr als 2% der
  // Zielbreite/-höhe übrig sind. Verhindert, dass minimale
  // ISO-216-Rundungsdifferenzen (z.B. A1 ist 841mm statt exakt 840mm
  // = 2×A3-Höhe) eine ganze zusätzliche Reihe/Spalte erzwingen.
  const TOLERANCE = 0.02;

  function gridFor(tileW: number, tileH: number) {
    const cols = Math.max(1, Math.ceil(srcW / tileW - TOLERANCE));
    const rows = Math.max(1, Math.ceil(srcH / tileH - TOLERANCE));
    return { cols, rows, tiles: cols * rows };
  }

  // Beide Ausrichtungen des Zielformats prüfen (Hoch- und Querformat),
  // damit z.B. eine A3-Seite als 1×2 A4-Blätter (quer) statt als
  // unnötige 2×2-Kachelung erkannt wird.
  const portrait = gridFor(w, h);
  const landscape = gridFor(h, w);

  const useLandscape = landscape.tiles < portrait.tiles;
  const best = useLandscape ? landscape : portrait;

  return {
    cols: best.cols,
    rows: best.rows,
    orientation: (useLandscape ? "landscape" : "portrait") as
      | "landscape"
      | "portrait",
  };
}
