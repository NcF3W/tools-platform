"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { splitPdfToTiles } from "@/lib/pdf/splitPdf";
import { calcGrid, PAPER_SIZES_MM, type PaperSize } from "@/lib/pdf/paperSizes";
import SplitPreview from "@/components/pdf/SplitPreview";

export default function SplitForm() {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<PaperSize>("A3");
  const [overlap, setOverlap] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<{ cols: number; rows: number } | null>(null);

  // Grid live berechnen, sobald Datei oder Zielformat sich ändern
  useEffect(() => {
    let cancelled = false;

    async function computeGrid() {
      if (!file) {
        setGrid(null);
        return;
      }
      try {
        const bytes = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes);
        const [page] = srcDoc.getPages();
        const result = calcGrid(page.getWidth(), page.getHeight(), target);
        if (!cancelled) setGrid(result);
      } catch {
        if (!cancelled) setGrid(null);
      }
    }

    computeGrid();
    return () => {
      cancelled = true;
    };
  }, [file, target]);

  async function handleSplit() {
    if (!file || !grid) return;
    setBusy(true);
    setError(null);

    try {
      const bytes = await file.arrayBuffer();
      const outBytes = await splitPdfToTiles(bytes, {
        cols: grid.cols,
        rows: grid.rows,
        overlapMm: overlap,
        cropMarks: overlap > 0,
      });

      const blob = new Blob([new Uint8Array(outBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}_${grid.cols}x${grid.rows}_${target}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(
        "Beim Verarbeiten ist etwas schiefgelaufen. Ist die Datei ein gültiges PDF?",
      );
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
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm border rounded-md p-2"
        />
      </div>

      <div className="space-y-2">
        <Label>Zielformat pro Kachel</Label>
        <Select value={target} onValueChange={(v) => setTarget(v as PaperSize)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(PAPER_SIZES_MM).map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Überlappung: {overlap}mm</Label>
        <Slider
          value={[overlap]}
          onValueChange={([v]) => setOverlap(v)}
          min={0}
          max={20}
          step={1}
        />
      </div>

      {file && grid && (
        <div className="space-y-2">
          <Label>
            Vorschau ({grid.cols}× {grid.rows} = {grid.cols * grid.rows}{" "}
            Blätter, erste Seite)
          </Label>
          <SplitPreview file={file} cols={grid.cols} rows={grid.rows} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleSplit}
        disabled={!file || !grid || busy}
        className="w-full"
      >
        {busy ? "Verarbeite..." : "Aufteilen & Herunterladen"}
      </Button>
    </div>
  );
}
