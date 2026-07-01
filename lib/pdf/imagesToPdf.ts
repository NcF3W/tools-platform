import { PDFDocument } from "pdf-lib";

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();

    const isPng = file.type === "image/png";
    const image = isPng
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

    // Seite in Bildgröße anlegen (in Punkten, 1px = 1pt hier vereinfacht;
    // für sauberen Druckmaßstab könnte man später DPI berücksichtigen)
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  return pdfDoc.save();
}
