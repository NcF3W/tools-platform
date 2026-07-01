"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PageThumbnailProps {
  file: File;
  pageIndex: number; // 0-basiert
}

export default function PageThumbnail({ file, pageIndex }: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(pageIndex + 1); // pdfjs ist 1-basiert

        const viewport = page.getViewport({ scale: 1 });
        const targetWidth = 150;
        const scale = targetWidth / viewport.width;
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
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [file, pageIndex]);

  if (error) {
    return (
      <div className="w-[150px] h-[200px] flex items-center justify-center bg-muted text-xs text-muted-foreground border rounded">
        Fehler
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} className="border rounded shadow-sm max-w-full" />
  );
}
