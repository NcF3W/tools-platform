import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

export type PdfFontFamily = "Helvetica" | "TimesRoman" | "Courier";

const STANDARD_FONT_MAP: Record<PdfFontFamily, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Redaction {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Rgb;
}

export interface TextInsertion {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: PdfFontFamily;
  color: Rgb;
}

export interface PageEdits {
  redactions: Redaction[];
  insertions: TextInsertion[];
}

export function hexToRgb(hex: string): Rgb {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * PDFs speichern Text als Glyph-Zeichenoperationen, nicht als editierbare
 * Textboxen. "Löschen" heißt hier: die Original-Glyphen mit einem Rechteck
 * in Hintergrundfarbe überdecken. Neuer Text wird als zusätzliche Ebene
 * obendrauf gezeichnet. Kein echtes In-Place-Editing des PDF-Inhaltsstroms
 * (dafür bräuchte man Zugriff auf die geparsten Content-Stream-Operatoren,
 * den pdf-lib nicht anbietet).
 */
export async function applyTextEdits(
  fileBytes: ArrayBuffer,
  pageEdits: Map<number, PageEdits>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const fontCache = new Map<PdfFontFamily, PDFFont>();
  async function getFont(family: PdfFontFamily): Promise<PDFFont> {
    let font = fontCache.get(family);
    if (!font) {
      font = await pdfDoc.embedFont(STANDARD_FONT_MAP[family]);
      fontCache.set(family, font);
    }
    return font;
  }

  const pages = pdfDoc.getPages();

  for (const [pageIndex, edits] of pageEdits) {
    const page = pages[pageIndex];
    if (!page) continue;

    for (const r of edits.redactions) {
      page.drawRectangle({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        color: rgb(r.color.r / 255, r.color.g / 255, r.color.b / 255),
      });
    }

    for (const t of edits.insertions) {
      if (!t.text.trim()) continue;
      const font = await getFont(t.fontFamily);
      page.drawText(t.text, {
        x: t.x,
        y: t.y,
        size: t.fontSize,
        font,
        color: rgb(t.color.r / 255, t.color.g / 255, t.color.b / 255),
      });
    }
  }

  return pdfDoc.save();
}
