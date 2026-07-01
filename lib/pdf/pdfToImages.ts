import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface PdfToImagesOptions {
  scale?: number; // 1 = 72dpi entsprechend PDF-Punkten, höher = mehr Auflösung
  pageIndices?: number[]; // 0-basiert; undefined = alle Seiten
}

async function renderPageToBlob(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number, // 1-basiert (pdfjs-Konvention)
  scale: number,
): Promise<Blob> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas-Context nicht verfügbar");

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas-Export fehlgeschlagen"));
    }, "image/png");
  });
}

export async function pdfToImages(
  fileBytes: ArrayBuffer,
  fileName: string,
  { scale = 2, pageIndices }: PdfToImagesOptions = {},
): Promise<Blob> {
  const pdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;
  const totalPages = pdf.numPages;
  const targetIndices =
    pageIndices ?? Array.from({ length: totalPages }, (_, i) => i);

  const baseName = fileName.replace(/\.pdf$/i, "");

  if (targetIndices.length === 1) {
    // Einzelne Seite: direkt als PNG zurückgeben, kein ZIP nötig
    return renderPageToBlob(pdf, targetIndices[0] + 1, scale);
  }

  const zip = new JSZip();
  for (const idx of targetIndices) {
    const blob = await renderPageToBlob(pdf, idx + 1, scale);
    zip.file(`${baseName}_seite-${idx + 1}.png`, blob);
  }

  return zip.generateAsync({ type: "blob" });
}
