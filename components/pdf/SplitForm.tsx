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
import { convertPdfToFormat } from "@/lib/pdf/convertPdf";
import {
  calcFit,
  calcGrid,
  detectPaperSize,
  PAPER_SIZES_MM,
  type PaperSize,
} from "@/lib/pdf/paperSizes";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const SplitPreview = dynamic(() => import("@/components/pdf/SplitPreview"), {
  ssr: false,
});

type Mode = "split" | "convert";

export default function SplitForm() {
  const [mode, setMode] = useState<Mode>("split");
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<PaperSize>("A3");
  const [overlap, setOverlap] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<ReturnType<typeof calcGrid> | null>(null);
  const [fit, setFit] = useState<ReturnType<typeof calcFit> | null>(null);
  const [sourceFormat, setSourceFormat] = useState<ReturnType<
    typeof detectPaperSize
  > | null>(null);

  // Grid/Fit live berechnen, sobald Datei oder Zielformat sich ändern
  useEffect(() => {
    let cancelled = false;

    async function computeGrid() {
      if (!file) {
        setGrid(null);
        setFit(null);
        setSourceFormat(null);
        return;
      }
      try {
        const bytes = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes);
        const [page] = srcDoc.getPages();
        const result = calcGrid(page.getWidth(), page.getHeight(), target);
        if (!cancelled) {
          setGrid(result);
          setFit(calcFit(page.getWidth(), page.getHeight(), target));
          setSourceFormat(detectPaperSize(page.getWidth(), page.getHeight()));
        }
      } catch {
        if (!cancelled) {
          setGrid(null);
          setFit(null);
          setSourceFormat(null);
        }
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

      downloadPdf(outBytes, `${grid.cols}x${grid.rows}_${target}`);
    } catch (err) {
      console.error(err);
      setError(
        "Beim Verarbeiten ist etwas schiefgelaufen. Ist die Datei ein gültiges PDF?",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert() {
    if (!file) return;
    setBusy(true);
    setError(null);

    try {
      const bytes = await file.arrayBuffer();
      const outBytes = await convertPdfToFormat(bytes, target);
      downloadPdf(outBytes, target);
    } catch (err) {
      console.error(err);
      setError(
        "Beim Verarbeiten ist etwas schiefgelaufen. Ist die Datei ein gültiges PDF?",
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadPdf(bytes: Uint8Array, suffix: string) {
    if (!file) return;
    const blob = new Blob([new Uint8Array(bytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.pdf$/i, "")}_${suffix}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border p-1 gap-1">
        <button
          type="button"
          onClick={() => setMode("split")}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors",
            mode === "split"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Aufteilen
        </button>
        <button
          type="button"
          onClick={() => setMode("convert")}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors",
            mode === "convert"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Format konvertieren
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pdf-upload">PDF hochladen</Label>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm border rounded-md p-2"
        />
        {sourceFormat && (
          <p className="text-sm text-muted-foreground">
            Erkanntes Format:{" "}
            {sourceFormat.size
              ? `${sourceFormat.size} (${sourceFormat.widthMm} × ${sourceFormat.heightMm} mm)`
              : `${sourceFormat.widthMm} × ${sourceFormat.heightMm} mm`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{mode === "split" ? "Zielformat pro Kachel" : "Zielformat"}</Label>
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

      {mode === "split" && (
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
      )}

      {mode === "split" && file && grid && (
        <div className="space-y-2">
          <Label>
            Vorschau ({grid.cols}× {grid.rows} = {grid.cols * grid.rows}{" "}
            Blätter{" "}
            {grid.orientation === "landscape" ? `${target} quer` : `${target} hoch`}
            , erste Seite)
          </Label>
          <SplitPreview file={file} cols={grid.cols} rows={grid.rows} />
          {grid.orientation === "landscape" && (
            <p className="text-sm text-muted-foreground">
              Für möglichst wenige Blätter werden die Kacheln im Querformat
              zugeschnitten – beim Drucken das Papier entsprechend drehen.
            </p>
          )}
        </div>
      )}

      {mode === "convert" && file && fit && (
        <div className="space-y-2">
          <Label>
            Vorschau (
            {fit.orientation === "landscape" ? `${target} quer` : `${target} hoch`}
            , erste Seite)
          </Label>
          <SplitPreview file={file} cols={1} rows={1} />
          <p className="text-sm text-muted-foreground">
            {fit.scale >= 1
              ? `Wird um Faktor ${fit.scale.toFixed(2)} vergrößert`
              : `Wird um Faktor ${fit.scale.toFixed(2)} verkleinert`}{" "}
            und proportional auf {target} eingepasst (Seitenverhältnis bleibt
            erhalten, ggf. mit weißem Rand).
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {mode === "split" ? (
        <Button
          onClick={handleSplit}
          disabled={!file || !grid || busy}
          className="w-full"
        >
          {busy ? "Verarbeite..." : "Aufteilen & Herunterladen"}
        </Button>
      ) : (
        <Button
          onClick={handleConvert}
          disabled={!file || !fit || busy}
          className="w-full"
        >
          {busy ? "Verarbeite..." : "Konvertieren & Herunterladen"}
        </Button>
      )}
    </div>
  );
}
