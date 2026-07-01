"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadRDKit } from "@/lib/chem/rdkit";
import { molblockToChemfig } from "@/lib/chem/chemfig";

export default function StructureForm() {
  const [smiles, setSmiles] = useState("c1ccccc1O");
  const [svg, setSvg] = useState<string | null>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [rawSvg, setRawSvg] = useState<string | null>(null);
  const [chemfigCode, setChemfigCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setSvgDataUrl(null);
    setRawSvg(null);
    setChemfigCode(null);

    try {
      const RDKit = await loadRDKit();
      const mol = RDKit.get_mol(smiles);

      if (!mol || !mol.is_valid()) {
        setError("Ungültiger SMILES-Code.");
        return;
      }

      const svgText = mol.get_svg(350, 300);
      const cleanedSvg = svgText.replace(/<\?xml[^>]*\?>/, "").trim();
      setRawSvg(cleanedSvg);

      const encoded = btoa(unescape(encodeURIComponent(cleanedSvg)));
      setSvgDataUrl(`data:image/svg+xml;base64,${encoded}`);

      const molblock = mol.get_molblock();
      const code = molblockToChemfig(molblock);
      setChemfigCode(code);

      mol.delete();
    } catch (err) {
      console.error(err);
      setError("Beim Rendern ist etwas schiefgelaufen.");
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    if (!chemfigCode) return;
    navigator.clipboard.writeText(chemfigCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadSvg() {
    if (!rawSvg) return;
    const blob = new Blob([rawSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${smiles.replace(/[^a-z0-9]/gi, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    if (!rawSvg) return;
    const img = new Image();
    const svgBlob = new Blob([rawSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const scale = 3; // höhere Auflösung als die 350x300 Bildschirm-Vorschau
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "white"; // sonst transparenter Hintergrund
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${smiles.replace(/[^a-z0-9]/gi, "_")}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="smiles-input">SMILES-Code</Label>
        <Input
          id="smiles-input"
          value={smiles}
          onChange={(e) => setSmiles(e.target.value)}
          placeholder="z.B. CCO für Ethanol"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleGenerate} disabled={busy || !smiles.trim()}>
        {busy ? "Generiere..." : "Struktur generieren"}
      </Button>

      {svgDataUrl && (
        <div className="space-y-2">
          <div className="border rounded-md p-4 flex justify-center bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgDataUrl} alt="Strukturformel" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadSvg}>
              Als SVG herunterladen
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPng}>
              Als PNG herunterladen
            </Button>
          </div>
        </div>
      )}

      {chemfigCode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>chemfig-Code</Label>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Kopiert!" : "Kopieren"}
            </Button>
          </div>
          <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto whitespace-pre-wrap">
            {chemfigCode}
          </pre>
          <p className="text-xs text-muted-foreground">
            Benötigt <code>\usepackage{"{chemfig}"}</code> in der Präambel.
          </p>
        </div>
      )}
    </div>
  );
}
