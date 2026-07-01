"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { imagesToPdf } from "@/lib/pdf/imagesToPdf";

export default function ConvertForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected);
  }

  async function handleConvert() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const outBytes = await imagesToPdf(files);
      const blob = new Blob([new Uint8Array(outBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "konvertiert.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(
        "Beim Konvertieren ist etwas schiefgelaufen. Sind es gültige PNG/JPG-Dateien?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="image-upload">Bilder auswählen (PNG oder JPG)</Label>
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm border rounded-md p-2"
        />
        {files.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {files.length} Datei(en) ausgewählt
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleConvert}
        disabled={files.length === 0 || busy}
        className="w-full"
      >
        {busy ? "Konvertiere..." : "In PDF umwandeln & Herunterladen"}
      </Button>
    </div>
  );
}
