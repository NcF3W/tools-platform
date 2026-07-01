"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { applyColorKeyTransparency, type RgbColor } from "@/lib/pdf/removeBackground";

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

export default function RemoveBackgroundForm() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<RgbColor | null>(null);
  const [tolerance, setTolerance] = useState(20);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setBgColor(null);
    setFile(selected);
    setImgUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  useEffect(() => {
    return () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = img.naturalWidth;
    sampleCanvas.height = img.naturalHeight;
    const ctx = sampleCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setBgColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }

  // Vorschau neu zeichnen, sobald Hintergrundfarbe oder Toleranz sich ändern
  useEffect(() => {
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas || !bgColor) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyColorKeyTransparency(imageData, bgColor, tolerance);
    ctx.putImageData(imageData, 0, 0);
  }, [bgColor, tolerance, imgUrl]);

  function handleDownload() {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(file?.name ?? "bild").replace(/\.[^.]+$/, "")}_freigestellt.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="image-upload">Bild auswählen (PNG oder JPG)</Label>
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="block w-full text-sm border rounded-md p-2"
        />
      </div>

      {imgUrl && (
        <div className="space-y-2">
          <Label>Original – auf die Hintergrundfarbe klicken</Label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imgUrl}
            alt="Original"
            className="max-w-full max-h-[400px] border rounded-md cursor-crosshair"
            onClick={handleImageClick}
          />
        </div>
      )}

      {bgColor && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              className="w-5 h-5 rounded border inline-block shrink-0"
              style={{
                backgroundColor: `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`,
              }}
            />
            Gewählte Hintergrundfarbe: rgb({bgColor.r}, {bgColor.g}, {bgColor.b})
          </div>
          <div className="space-y-1">
            <Label>Toleranz ({tolerance})</Label>
            <Slider
              value={[tolerance]}
              onValueChange={([v]) => setTolerance(v)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>
      )}

      {bgColor && (
        <div className="space-y-2">
          <Label>Vorschau (transparenter Hintergrund)</Label>
          <div className="inline-block border rounded-md p-2" style={CHECKERBOARD_STYLE}>
            <canvas ref={previewCanvasRef} className="max-w-full max-h-[400px] block" />
          </div>
        </div>
      )}

      <Button onClick={handleDownload} disabled={!bgColor} className="w-full">
        Freigestelltes PNG herunterladen
      </Button>
    </div>
  );
}
