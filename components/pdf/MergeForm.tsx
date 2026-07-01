"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mergeAndReorderPdfs } from "@/lib/pdf/mergePdf";

const PageThumbnail = dynamic(() => import("@/components/pdf/PageThumbnail"), {
  ssr: false,
});

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

interface FileEntry {
  id: string;
  file: File;
}

interface PageEntry {
  fileId: string;
  pageIndex: number; // 0-basiert, innerhalb der zugehörigen Datei
  removed: boolean;
}

export default function MergeForm() {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [pageEntries, setPageEntries] = useState<PageEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ""; // erlaubt erneutes Auswählen derselben Datei
    setError(null);

    for (const file of selected) {
      const id = uid();
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const count = doc.getPageCount();
        setFileEntries((prev) => [...prev, { id, file }]);
        setPageEntries((prev) => [
          ...prev,
          ...Array.from({ length: count }, (_, i) => ({
            fileId: id,
            pageIndex: i,
            removed: false,
          })),
        ]);
      } catch (err) {
        console.error(err);
        setError(`Datei "${file.name}" konnte nicht gelesen werden.`);
      }
    }
  }

  function removeFileEntry(id: string) {
    setFileEntries((prev) => prev.filter((f) => f.id !== id));
    setPageEntries((prev) => prev.filter((p) => p.fileId !== id));
  }

  function togglePageRemoved(idx: number) {
    setPageEntries((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, removed: !p.removed } : p)),
    );
  }

  function handleDragStart(idx: number) {
    setDraggedIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault(); // notwendig, damit "drop" überhaupt feuert
    if (idx !== dragOverIdx) setDragOverIdx(idx);
  }

  function handleDrop(idx: number) {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    setPageEntries((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIdx, 1);
      copy.splice(idx, 0, moved);
      return copy;
    });
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  const remaining = pageEntries.filter((p) => !p.removed);

  async function handleMerge() {
    if (remaining.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const files = fileEntries.map((f) => f.file);
      const pageOrder = remaining.map((p) => ({
        fileIndex: fileEntries.findIndex((f) => f.id === p.fileId),
        pageIndex: p.pageIndex,
      }));
      const outBytes = await mergeAndReorderPdfs(files, pageOrder);
      const blob = new Blob([new Uint8Array(outBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zusammengefuehrt.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(
        "Beim Zusammenführen ist etwas schiefgelaufen. Sind alle Dateien gültige PDFs?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-upload">PDFs hinzufügen</Label>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm border rounded-md p-2"
        />
      </div>

      {fileEntries.length > 0 && (
        <div className="space-y-2">
          <Label>Dateien</Label>
          <div className="border rounded-md divide-y">
            {fileEntries.map((fe) => (
              <div key={fe.id} className="flex items-center gap-2 p-2">
                <span className="flex-1 text-sm truncate">{fe.file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFileEntry(fe.id)}
                >
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {pageEntries.length > 0 && (
        <div className="space-y-2">
          <Label>
            Seiten ({remaining.length} von {pageEntries.length} werden
            zusammengeführt) — per Drag & Drop umsortieren
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pageEntries.map((pageEntry, idx) => {
              const fe = fileEntries.find((f) => f.id === pageEntry.fileId);
              if (!fe) return null;
              return (
                <div
                  key={`${pageEntry.fileId}-${pageEntry.pageIndex}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`border rounded-md p-2 space-y-2 cursor-move transition-all ${
                    pageEntry.removed ? "opacity-40" : ""
                  } ${draggedIdx === idx ? "opacity-30" : ""} ${
                    dragOverIdx === idx && draggedIdx !== idx
                      ? "border-primary border-2 bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex justify-center pointer-events-none">
                    <PageThumbnail file={fe.file} pageIndex={pageEntry.pageIndex} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground pointer-events-none truncate">
                    {fe.file.name} · Seite {pageEntry.pageIndex + 1}
                  </p>
                  <div className="flex items-center justify-center">
                    <Button
                      variant={pageEntry.removed ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => togglePageRemoved(idx)}
                    >
                      {pageEntry.removed ? "Wiederherstellen" : "Entfernen"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button
        onClick={handleMerge}
        disabled={remaining.length === 0 || busy}
        className="w-full"
      >
        {busy ? "Führe zusammen..." : "Zusammenführen & Herunterladen"}
      </Button>
    </div>
  );
}
