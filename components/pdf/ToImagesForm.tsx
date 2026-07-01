"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PageThumbnail = dynamic(() => import("@/components/pdf/PageThumbnail"), {
  ssr: false,
});

export default function ToImagesForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPageCount() {
      if (!file) {
        setPageCount(0);
        setSelected(new Set());
        return;
      }
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const count = doc.getPageCount();
        if (!cancelled) {
          setPageCount(count);
          setSelected(new Set(Array.from({ length: count }, (_, i) => i)));
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

  function toggleSelected(idx: number) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(idx)) copy.delete(idx);
      else copy.add(idx);
      return copy;
    });
  }

  function selectAll() {
    setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function handleExport() {
    if (!file || selected.size === 0) return;
    setBusy(true);
    setError(null);

    try {
      const { pdfToImages } = await import("@/lib/pdf/pdfToImages");
      const bytes = await file.arrayBuffer();
      const pageIndices = Array.from(selected).sort((a, b) => a - b);

      const blob = await pdfToImages(bytes, file.name, {
        scale: Number(scale),
        pageIndices,
      });

      const isZip = pageIndices.length > 1;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = isZip
        ? `${file.name.replace(/\.pdf$/i, "")}_bilder.zip`
        : `${file.name.replace(/\.pdf$/i, "")}_seite-${pageIndices[0] + 1}.png`;
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
          onChange={(e) => {
            setError(null);
            setFile(e.target.files?.[0] ?? null);
          }}
          className="block w-full text-sm border rounded-md p-2"
        />
      </div>

      <div className="space-y-2">
        <Label>Auflösung</Label>
        <Select value={scale} onValueChange={setScale}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Niedrig (schnell)</SelectItem>
            <SelectItem value="2">Mittel (Präsentationen)</SelectItem>
            <SelectItem value="4">Hoch (Druck)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {file && pageCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              Seiten auswählen ({selected.size} von {pageCount})
            </Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Alle
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>
                Keine
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: pageCount }, (_, idx) => (
              <div
                key={idx}
                className={`border rounded-md p-2 space-y-2 cursor-pointer transition-all ${
                  selected.has(idx) ? "border-primary" : "opacity-50"
                }`}
                onClick={() => toggleSelected(idx)}
              >
                <div className="flex justify-center pointer-events-none">
                  <PageThumbnail file={file} pageIndex={idx} />
                </div>
                <div className="flex items-center justify-center gap-2 pointer-events-none">
                  <Checkbox checked={selected.has(idx)} />
                  <span className="text-xs text-muted-foreground">
                    Seite {idx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleExport}
        disabled={!file || selected.size === 0 || busy}
        className="w-full"
      >
        {busy ? "Exportiere..." : "Als PNG exportieren"}
      </Button>
    </div>
  );
}
