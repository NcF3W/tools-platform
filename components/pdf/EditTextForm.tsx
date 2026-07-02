"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ChevronLeft, ChevronRight, Pipette } from "lucide-react";
import {
  applyTextEdits,
  hexToRgb,
  type PageEdits,
  type PdfFontFamily,
  type Redaction,
  type TextInsertion,
} from "@/lib/pdf/editText";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const TARGET_WIDTH = 760;

const FONT_OPTIONS: { value: PdfFontFamily; label: string; css: string }[] = [
  { value: "Helvetica", label: "Helvetica (serifenlos)", css: "Helvetica, Arial, sans-serif" },
  { value: "TimesRoman", label: "Times (Serifen)", css: '"Times New Roman", Times, serif' },
  { value: "Courier", label: "Courier (Monospace)", css: '"Courier New", Courier, monospace' },
];

function cssFontFamily(family: PdfFontFamily): string {
  return FONT_OPTIONS.find((f) => f.value === family)?.css ?? "sans-serif";
}

interface OverlayTextItem {
  pdfBox: { x: number; y: number; width: number; height: number };
  canvasBox: { left: number; top: number; width: number; height: number };
}

interface DisplayInsertion extends TextInsertion {
  id: number;
  canvasLeft: number;
  canvasTop: number;
}

interface PageState {
  viewport: pdfjsLib.PageViewport;
  imageUrl: string;
  items: OverlayTextItem[];
  deleted: Set<number>;
  insertions: DisplayInsertion[];
}

export default function EditTextForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageStates, setPageStates] = useState<Map<number, PageState>>(new Map());
  const [loadingPage, setLoadingPage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState<PdfFontFamily>("Helvetica");
  const [textColor, setTextColor] = useState("#000000");

  const [redactionColor, setRedactionColor] = useState("#ffffff");
  const [pickingColor, setPickingColor] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const nextInsertionId = useRef(1);

  const pageState = pageStates.get(pageIndex) ?? null;

  function updatePageState(idx: number, patch: Partial<PageState>) {
    setPageStates((prev) => {
      const existing = prev.get(idx);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(idx, { ...existing, ...patch });
      return next;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setFile(selected);
    setPdfDoc(null);
    setPageStates(new Map());
    setPageIndex(0);
    if (!selected) return;

    try {
      const bytes = await selected.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    } catch (err) {
      console.error(err);
      setError("PDF konnte nicht geladen werden.");
    }
  }

  // Seite bei Bedarf laden: als Bild rendern + Textpositionen extrahieren.
  // Async-Funktion bewusst innerhalb des Effekts definiert (inkl.
  // cancelled-Flag), damit kein setState synchron aus dem Effekt-Body
  // heraus aufgerufen wird.
  useEffect(() => {
    if (!pdfDoc || pageStates.has(pageIndex)) return;
    let cancelled = false;

    async function render() {
      setLoadingPage(true);
      try {
        const page = await pdfDoc!.getPage(pageIndex + 1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = TARGET_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas-Context nicht verfügbar");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const textContent = await page.getTextContent();
        const items: OverlayTextItem[] = [];
        for (const raw of textContent.items) {
          if (!("str" in raw) || !raw.str.trim()) continue;
          const pdfBox = {
            x: raw.transform[4],
            y: raw.transform[5],
            width: raw.width,
            height: raw.height || Math.abs(raw.transform[3]) || 10,
          };
          const corners = [
            viewport.convertToViewportPoint(pdfBox.x, pdfBox.y),
            viewport.convertToViewportPoint(pdfBox.x + pdfBox.width, pdfBox.y),
            viewport.convertToViewportPoint(pdfBox.x, pdfBox.y + pdfBox.height),
            viewport.convertToViewportPoint(
              pdfBox.x + pdfBox.width,
              pdfBox.y + pdfBox.height,
            ),
          ];
          const xs = corners.map((c) => c[0]);
          const ys = corners.map((c) => c[1]);
          items.push({
            pdfBox,
            canvasBox: {
              left: Math.min(...xs),
              top: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
            },
          });
        }

        if (cancelled) return;
        setPageStates((prev) => {
          const next = new Map(prev);
          next.set(pageIndex, {
            viewport,
            imageUrl: canvas.toDataURL(),
            items,
            deleted: new Set(),
            insertions: [],
          });
          return next;
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Seite konnte nicht geladen werden.");
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageIndex, pageStates]);

  function toggleDeleted(itemIdx: number) {
    if (!pageState) return;
    const deleted = new Set(pageState.deleted);
    if (deleted.has(itemIdx)) deleted.delete(itemIdx);
    else deleted.add(itemIdx);
    updatePageState(pageIndex, { deleted });
  }

  function findItemAt(state: PageState, left: number, top: number): OverlayTextItem | null {
    let fallback: OverlayTextItem | null = null;
    for (let i = 0; i < state.items.length; i++) {
      const box = state.items[i].canvasBox;
      const inside =
        left >= box.left &&
        left <= box.left + box.width &&
        top >= box.top &&
        top <= box.top + box.height;
      if (!inside) continue;
      if (state.deleted.has(i)) return state.items[i];
      fallback = state.items[i];
    }
    return fallback;
  }

  function sampleRedactionColor(left: number, top: number) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = Math.min(img.naturalWidth - 1, Math.max(0, Math.floor(left * scaleX)));
    const y = Math.min(img.naturalHeight - 1, Math.max(0, Math.floor(top * scaleY)));

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${[pixel[0], pixel[1], pixel[2]]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")}`;
    setRedactionColor(hex);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!pageState || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const left = e.clientX - rect.left;
    const top = e.clientY - rect.top;

    if (pickingColor) {
      sampleRedactionColor(left, top);
      setPickingColor(false);
      return;
    }

    const hit = findItemAt(pageState, left, top);
    const insertionFontSize = hit
      ? Math.min(72, Math.max(6, Math.round(hit.pdfBox.height)))
      : fontSize;

    const baselineTop = top + insertionFontSize * pageState.viewport.scale;
    const [pdfX, pdfY] = pageState.viewport.convertToPdfPoint(left, baselineTop);

    const insertion: DisplayInsertion = {
      id: nextInsertionId.current++,
      x: pdfX,
      y: pdfY,
      text: "",
      fontSize: insertionFontSize,
      fontFamily,
      color: hexToRgb(textColor),
      canvasLeft: left,
      canvasTop: top,
    };
    updatePageState(pageIndex, {
      insertions: [...pageState.insertions, insertion],
    });
  }

  function updateInsertionText(id: number, text: string) {
    if (!pageState) return;
    updatePageState(pageIndex, {
      insertions: pageState.insertions.map((ins) =>
        ins.id === id ? { ...ins, text } : ins,
      ),
    });
  }

  function removeInsertion(id: number) {
    if (!pageState) return;
    updatePageState(pageIndex, {
      insertions: pageState.insertions.filter((ins) => ins.id !== id),
    });
  }

  async function handleDownload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const rColor = hexToRgb(redactionColor);
      const edits = new Map<number, PageEdits>();
      for (const [idx, state] of pageStates) {
        const redactions: Redaction[] = [];
        state.deleted.forEach((i) => {
          const box = state.items[i]?.pdfBox;
          if (box) redactions.push({ ...box, color: rColor });
        });
        const insertions: TextInsertion[] = state.insertions
          .filter((ins) => ins.text.trim())
          .map(({ x, y, text, fontSize: size, fontFamily: family, color }) => ({
            x,
            y,
            text,
            fontSize: size,
            fontFamily: family,
            color,
          }));
        if (redactions.length || insertions.length) {
          edits.set(idx, { redactions, insertions });
        }
      }

      if (edits.size === 0) {
        setError("Keine Änderungen vorhanden.");
        return;
      }

      const outBytes = await applyTextEdits(bytes, edits);
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
      setError("Beim Erzeugen des PDFs ist etwas schiefgelaufen.");
    } finally {
      setBusy(false);
    }
  }

  const hasChanges =
    pageStates.size > 0 &&
    Array.from(pageStates.values()).some(
      (s) => s.deleted.size > 0 || s.insertions.some((i) => i.text.trim()),
    );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-upload">PDF auswählen</Label>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm border rounded-md p-2"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {pdfDoc && (
        <>
          <div className="flex flex-wrap items-end gap-4 border rounded-md p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft />
              </Button>
              <span className="text-sm text-muted-foreground w-24 text-center">
                Seite {pageIndex + 1} / {numPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={pageIndex >= numPages - 1}
                onClick={() => setPageIndex((p) => Math.min(numPages - 1, p + 1))}
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Schriftart (neuer Text)</Label>
              <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as PdfFontFamily)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Schriftgröße</Label>
              <Input
                type="number"
                min={6}
                max={72}
                className="w-20"
                value={fontSize}
                onChange={(e) => setFontSize(Math.max(6, Number(e.target.value) || 14))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Textfarbe</Label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-8 w-12 rounded-md border border-input p-0.5"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Löschfarbe (Hintergrund)</Label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={redactionColor}
                  onChange={(e) => setRedactionColor(e.target.value)}
                  className="h-8 w-12 rounded-md border border-input p-0.5"
                />
                <Button
                  type="button"
                  variant={pickingColor ? "default" : "outline"}
                  size="icon-sm"
                  title="Hintergrundfarbe von der Seite abgreifen"
                  onClick={() => setPickingColor((p) => !p)}
                >
                  <Pipette />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Auf vorhandenen Text klicken, um ihn zu löschen (rot markiert,
            erneut klicken macht es rückgängig). Auf eine leere Stelle
            klicken, um neuen Text einzufügen – klickt man dabei auf gelöschten
            Text, wird dessen Schriftgröße automatisch übernommen. Mit der
            Pipette lässt sich die Löschfarbe von der Seite abgreifen, falls
            der Hintergrund nicht weiß ist.
          </p>

          <div className="border rounded-md p-2 overflow-auto bg-muted">
            {loadingPage && !pageState && (
              <p className="text-sm text-muted-foreground p-4">Seite wird geladen...</p>
            )}
            {pageState && (
              <div
                className="relative inline-block bg-white"
                style={{ width: pageState.viewport.width, height: pageState.viewport.height }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={pageState.imageUrl}
                  alt={`Seite ${pageIndex + 1}`}
                  className="absolute inset-0 w-full h-full select-none pointer-events-none"
                  draggable={false}
                />
                <div
                  className={
                    pickingColor
                      ? "absolute inset-0 cursor-crosshair"
                      : "absolute inset-0"
                  }
                  onClick={handleOverlayClick}
                >
                  {pageState.items.map((item, i) => {
                    const isDeleted = pageState.deleted.has(i);
                    return (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!pickingColor) toggleDeleted(i);
                        }}
                        className={
                          isDeleted
                            ? "absolute cursor-pointer bg-destructive/40 border border-destructive"
                            : "absolute cursor-pointer hover:bg-yellow-300/30"
                        }
                        style={{
                          left: item.canvasBox.left,
                          top: item.canvasBox.top,
                          width: item.canvasBox.width,
                          height: item.canvasBox.height,
                        }}
                      />
                    );
                  })}

                  {pageState.insertions.map((ins) => (
                    <div
                      key={ins.id}
                      className="absolute"
                      style={{ left: ins.canvasLeft, top: ins.canvasTop }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={ins.text}
                        onChange={(e) => updateInsertionText(ins.id, e.target.value)}
                        className="bg-transparent border border-dashed border-primary/60 outline-none px-0.5 min-w-[2ch]"
                        style={{
                          fontSize: ins.fontSize * pageState.viewport.scale,
                          fontFamily: cssFontFamily(ins.fontFamily),
                          color: `rgb(${ins.color.r}, ${ins.color.g}, ${ins.color.b})`,
                          width: `${Math.max(2, ins.text.length + 1)}ch`,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeInsertion(ins.id)}
                        className="absolute -right-5 -top-1 text-muted-foreground hover:text-destructive"
                        title="Entfernen"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleDownload} disabled={busy || !hasChanges} className="w-full">
            {busy ? "Erzeuge PDF..." : "Bearbeitetes PDF herunterladen"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Hinweis: Gelöschter Text wird mit einem Rechteck in der
            gewählten Löschfarbe überdeckt. Neuer Text wird als zusätzliche
            Ebene eingefügt – der ursprüngliche Textfluss im PDF bleibt
            technisch bestehen, nur die Ansicht ändert sich.
          </p>
        </>
      )}
    </div>
  );
}
