"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mergePdfs } from "@/lib/pdf/mergePdf";

export default function MergeForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = ""; // erlaubt erneutes Auswählen derselben Datei
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  }

  function moveDown(idx: number) {
    setFiles((prev) => {
      if (idx === prev.length - 1) return prev;
      const copy = [...prev];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy;
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleMerge() {
    if (files.length < 2) return;
    setBusy(true);
    setError(null);

    try {
      const outBytes = await mergePdfs(files);
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

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Reihenfolge ({files.length} Datei(en))</Label>
          <div className="border rounded-md divide-y">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2">
                <span className="text-sm text-muted-foreground w-6">
                  {idx + 1}.
                </span>
                <span className="flex-1 text-sm truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveDown(idx)}
                  disabled={idx === files.length - 1}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(idx)}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleMerge}
        disabled={files.length < 2 || busy}
        className="w-full"
      >
        {busy ? "Führe zusammen..." : "Zusammenführen & Herunterladen"}
      </Button>
    </div>
  );
}
