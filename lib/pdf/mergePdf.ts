import { PDFDocument } from "pdf-lib";

export interface MergePageRef {
  fileIndex: number; // Index in das übergebene files-Array
  pageIndex: number; // 0-basierter Seitenindex innerhalb dieser Datei
}

export async function mergeAndReorderPdfs(
  files: File[],
  pageOrder: MergePageRef[],
): Promise<Uint8Array> {
  const outDoc = await PDFDocument.create();

  const neededFileIndices = new Set(pageOrder.map((p) => p.fileIndex));
  const srcDocs = new Map<number, PDFDocument>();
  for (const idx of neededFileIndices) {
    const bytes = await files[idx].arrayBuffer();
    srcDocs.set(idx, await PDFDocument.load(bytes));
  }

  for (const ref of pageOrder) {
    const srcDoc = srcDocs.get(ref.fileIndex)!;
    const [copiedPage] = await outDoc.copyPages(srcDoc, [ref.pageIndex]);
    outDoc.addPage(copiedPage);
  }

  return outDoc.save();
}
