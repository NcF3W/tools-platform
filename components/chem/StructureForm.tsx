"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadRDKit } from "@/lib/chem/rdkit";
import { molblockToChemfig, getAtomElements } from "@/lib/chem/chemfig";
import { lookupFormula } from "@/lib/chem/formula";

type InputMode = "smiles" | "formula" | "cas";

const MODE_CONFIG: Record<
  InputMode,
  { label: string; placeholder: string; defaultValue: string }
> = {
  smiles: {
    label: "SMILES-Code",
    placeholder: "z.B. CCO für Ethanol",
    defaultValue: "c1ccccc1O",
  },
  formula: {
    label: "Summenformel",
    placeholder: "z.B. C2H6O oder Ca(OH)2",
    defaultValue: "H2O",
  },
  cas: {
    label: "CAS-Nummer",
    placeholder: "z.B. 64-17-5 für Ethanol",
    defaultValue: "64-17-5",
  },
};

export default function StructureForm() {
  const [mode, setMode] = useState<InputMode>("smiles");
  const [input, setInput] = useState(MODE_CONFIG.smiles.defaultValue);
  const [showCarbons, setShowCarbons] = useState(false);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [rawSvg, setRawSvg] = useState<string | null>(null);
  const [chemfigCode, setChemfigCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleModeChange(next: InputMode) {
    setMode(next);
    setInput(MODE_CONFIG[next].defaultValue);
    setError(null);
    setInfo(null);
  }

  async function resolveSmiles(): Promise<string> {
    const trimmed = input.trim();

    if (mode === "smiles") return trimmed;

    if (mode === "formula") {
      const result = lookupFormula(trimmed);
      if ("error" in result) throw new Error(result.error);
      if (result.note) setInfo(result.note);
      return result.smiles;
    }

    // CAS-Nummer über den Server auflösen (PubChem), um CORS zu vermeiden.
    const res = await fetch(`/api/chem/cas?cas=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "CAS-Nummer konnte nicht aufgelöst werden.");
    }
    if (data.name) setInfo(`Gefunden: ${data.name}`);
    return data.smiles as string;
  }

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setInfo(null);
    setSvgDataUrl(null);
    setRawSvg(null);
    setChemfigCode(null);

    try {
      const smiles = await resolveSmiles();
      const RDKit = await loadRDKit();
      const mol = RDKit.get_mol(smiles);

      if (!mol || !mol.is_valid()) {
        setError("Ungültiger SMILES-Code.");
        return;
      }

      const molblock = mol.get_molblock();

      const atomLabels: Record<number, string> = {};
      if (showCarbons) {
        getAtomElements(molblock).forEach((el, idx) => {
          if (el === "C") atomLabels[idx] = "C";
        });
      }
      const svgText = mol.get_svg_with_highlights(
        JSON.stringify({ width: 350, height: 300, atomLabels }),
      );
      const cleanedSvg = svgText.replace(/<\?xml[^>]*\?>/, "").trim();
      setRawSvg(cleanedSvg);

      const encoded = btoa(unescape(encodeURIComponent(cleanedSvg)));
      setSvgDataUrl(`data:image/svg+xml;base64,${encoded}`);

      const code = molblockToChemfig(molblock, { showCarbons });
      setChemfigCode(code);

      mol.delete();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Beim Rendern ist etwas schiefgelaufen.",
      );
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
    a.download = `${input.replace(/[^a-z0-9]/gi, "_")}.svg`;
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
        a.download = `${input.replace(/[^a-z0-9]/gi, "_")}.png`;
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
        <Label htmlFor="input-mode">Eingabeart</Label>
        <Select value={mode} onValueChange={(v) => handleModeChange(v as InputMode)}>
          <SelectTrigger id="input-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="smiles">SMILES-Code</SelectItem>
            <SelectItem value="formula">Summenformel</SelectItem>
            <SelectItem value="cas">CAS-Nummer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="structure-input">{MODE_CONFIG[mode].label}</Label>
        <Input
          id="structure-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={MODE_CONFIG[mode].placeholder}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-carbons"
          checked={showCarbons}
          onCheckedChange={(checked) => setShowCarbons(checked === true)}
        />
        <Label htmlFor="show-carbons" className="font-normal">
          Kohlenstoff-Atome (C) in der Strukturformel einzeln anzeigen
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {info && !error && <p className="text-sm text-muted-foreground">{info}</p>}

      <Button onClick={handleGenerate} disabled={busy || !input.trim()}>
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