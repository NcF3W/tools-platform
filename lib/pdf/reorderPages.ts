import { PDFDocument } from "pdf-lib";

export async function exportReorderedPdf(
  fileBytes: ArrayBuffer,
  pageOrder: number[], // 0-basierte Original-Seitenindizes, in Zielreihenfolge
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(fileBytes);
  const outDoc = await PDFDocument.create();

  const copiedPages = await outDoc.copyPages(srcDoc, pageOrder);
  copiedPages.forEach((page) => outDoc.addPage(page));

  return outDoc.save();
}
