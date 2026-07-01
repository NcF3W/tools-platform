"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { exportReorderedPdf } from "@/lib/pdf/reorderPages";

const PageThumbnail = dynamic(() => import("@/components/pdf/PageThumbnail"), {
  ssr: false,
});

interface PageEntry {
  originalIndex: number;
  removed: boolean;
}

export default function PagesForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPageCount() {
      if (!file) {
        setPages([]);
        return;
      }
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const count = doc.getPageCount();
        if (!cancelled) {
          setPages(
            Array.from({ length: count }, (_, i) => ({
              originalIndex: i,
              removed: false,
            })),
          );
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("PDF konnte nicht gelesen werden.");
      }
    }

    loadPageCount();
    return () => {
      cancelled = true;
    };
  }, [file]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setFile(e.target.files?.[0] ?? null);
  }

  function toggleRemoved(idx: number) {
    setPages((prev) =>
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
    setPages((prev) => {
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

  const remainingCount = pages.filter((p) => !p.removed).length;

  async function handleExport() {
    if (!file || remainingCount === 0) return;
    setBusy(true);
    setError(null);

    try {
      const bytes = await file.arrayBuffer();
      const order = pages.filter((p) => !p.removed).map((p) => p.originalIndex);
      const outBytes = await exportReorderedPdf(bytes, order);

      const blob = new Blob([new Uint8Array(outBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}_bearbeitet.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Beim Exportieren ist etwas schiefgelaufen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-upload">PDF hochladen</Label>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm border rounded-md p-2"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {file && pages.length > 0 && (
        <div className="space-y-2">
          <Label>
            Seiten ({remainingCount} von {pages.length} werden exportiert) — per
            Drag & Drop umsortieren
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pages.map((pageEntry, idx) => (
              <div
                key={pageEntry.originalIndex}
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
                  <PageThumbnail
                    file={file}
                    pageIndex={pageEntry.originalIndex}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground pointer-events-none">
                  Original-Seite {pageEntry.originalIndex + 1} · Position{" "}
                  {idx + 1}
                </p>
                <div className="flex items-center justify-center">
                  <Button
                    variant={pageEntry.removed ? "outline" : "ghost"}
                    size="sm"
                    onClick={() => toggleRemoved(idx)}
                  >
                    {pageEntry.removed ? "Wiederherstellen" : "Entfernen"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleExport}
        disabled={!file || remainingCount === 0 || busy}
        className="w-full"
      >
        {busy ? "Exportiere..." : "Exportieren & Herunterladen"}
      </Button>
    </div>
  );
}
