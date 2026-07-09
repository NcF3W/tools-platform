import { PDFDocument } from "pdf-lib";
import { calcFit, type PaperSize } from "./paperSizes";

const MM_TO_PT = 2.834645669;

// Skaliert jede Seite proportional (ohne Verzerrung) auf ein einzelnes
// Zielblatt im gewählten A-Format. Funktioniert in beide Richtungen -
// sowohl Verkleinern (z. B. A0 -> A4) als auch Vergrößern (z. B. Letter
// oder ein kleines Custom-Format -> A3) eines beliebigen Quellformats.
export async function convertPdfToFormat(
  fileBytes: ArrayBuffer,
  target: PaperSize,
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(fileBytes);
  const outDoc = await PDFDocument.create();
  const pageCount = srcDoc.getPageCount();

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const [embedded] = await outDoc.embedPdf(fileBytes, [pageIndex]);
    const { scale, pageWidthMm, pageHeightMm } = calcFit(
      embedded.width,
      embedded.height,
      target,
    );

    const pageWidthPt = pageWidthMm * MM_TO_PT;
    const pageHeightPt = pageHeightMm * MM_TO_PT;
    const drawWidth = embedded.width * scale;
    const drawHeight = embedded.height * scale;

    const page = outDoc.addPage([pageWidthPt, pageHeightPt]);
    page.drawPage(embedded, {
      x: (pageWidthPt - drawWidth) / 2,
      y: (pageHeightPt - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return outDoc.save();
}
