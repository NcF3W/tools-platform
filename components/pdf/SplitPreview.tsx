"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface SplitPreviewProps {
  file: File;
  cols: number;
  rows: number;
}

export default function SplitPreview({ file, cols, rows }: SplitPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(null);
      try {
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const maxWidth = 500;
        const scale = maxWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({
          canvas,
          canvasContext: ctx,
          viewport: scaledViewport,
        }).promise;

        if (cancelled) return;

        // Grid-Linien zeichnen
        ctx.strokeStyle = "rgba(220, 38, 38, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);

        for (let c = 1; c < cols; c++) {
          const x = (canvas.width / cols) * c;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        for (let r = 1; r < rows; r++) {
          const y = (canvas.height / rows) * r;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Vorschau konnte nicht geladen werden.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [file, cols, rows]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="border rounded-md p-2 flex justify-center bg-muted/30">
      <canvas ref={canvasRef} className="max-w-full h-auto" />
    </div>
  );
}
