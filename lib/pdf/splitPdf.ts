import { PDFDocument, rgb } from "pdf-lib";

interface SplitOptions {
  cols: number;
  rows: number;
  overlapMm?: number;
  cropMarks?: boolean;
}

const MM_TO_PT = 2.834645669;

export async function splitPdfToTiles(
  fileBytes: ArrayBuffer,
  { cols, rows, overlapMm = 0, cropMarks = true }: SplitOptions,
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(fileBytes);
  const outDoc = await PDFDocument.create();
  const pageCount = srcDoc.getPageCount();
  const overlap = overlapMm * MM_TO_PT;
  const halfOverlap = overlap / 2;
  const markLength = 8; // Länge der Schnittmarken-Striche in pt

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const [embedded] = await outDoc.embedPdf(fileBytes, [pageIndex]);
    const srcWidth = embedded.width;
    const srcHeight = embedded.height;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tileWidth = srcWidth / cols + overlap;
        const tileHeight = srcHeight / rows + overlap;

        const page = outDoc.addPage([tileWidth, tileHeight]);
        page.drawPage(embedded, {
          x: -(c * (srcWidth / cols)) + halfOverlap,
          y: -((rows - 1 - r) * (srcHeight / rows)) + halfOverlap,
          width: srcWidth,
          height: srcHeight,
        });

        if (cropMarks && overlap > 0) {
          drawCropMarks(page, tileWidth, tileHeight, halfOverlap, markLength);
        }
      }
    }
  }

  return outDoc.save();
}

function drawCropMarks(
  page: import("pdf-lib").PDFPage,
  tileWidth: number,
  tileHeight: number,
  inset: number,
  markLength: number,
) {
  const color = rgb(1, 0, 0);
  const thickness = 0.75;

  // Die vier Ecken der "eigentlichen" Kachel (ohne Überlappungsrand)
  const left = inset;
  const right = tileWidth - inset;
  const top = tileHeight - inset;
  const bottom = inset;

  const corners: [number, number][] = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
  ];

  for (const [x, y] of corners) {
    // horizontaler Strich
    page.drawLine({
      start: { x: x - markLength / 2, y },
      end: { x: x + markLength / 2, y },
      thickness,
      color,
    });
    // vertikaler Strich
    page.drawLine({
      start: { x, y: y - markLength / 2 },
      end: { x, y: y + markLength / 2 },
      thickness,
      color,
    });
  }
}
