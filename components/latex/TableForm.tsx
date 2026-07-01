"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateLatexTable,
  parseDelimitedText,
  type TableColumn,
  type ColumnAlign,
} from "@/lib/latex/tableGen";

const defaultColumns: TableColumn[] = [
  { header: "Probe", align: "l" },
  { header: "Wert", align: "S", tableFormat: "1.2" },
];

export default function TableForm() {
  const [columns, setColumns] = useState<TableColumn[]>(defaultColumns);
  const [rows, setRows] = useState<string[][]>([
    ["1", "0.00"],
    ["2", "0.00"],
  ]);
  const [midlines, setMidlines] = useState<boolean[]>([false, false]);
  const [caption, setCaption] = useState("");
  const [label, setLabel] = useState("");
  const [placement, setPlacement] = useState("H");
  const [pasteText, setPasteText] = useState("");
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [copied, setCopied] = useState(false);

  function updateColumn(idx: number, patch: Partial<TableColumn>) {
    setColumns((cols) =>
      cols.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );
  }

  function addColumn() {
    setColumns((cols) => [
      ...cols,
      { header: `Spalte ${cols.length + 1}`, align: "S", tableFormat: "1.2" },
    ]);
    setRows((rs) => rs.map((r) => [...r, ""]));
  }

  function removeColumn(idx: number) {
    if (columns.length <= 1) return;
    setColumns((cols) => cols.filter((_, i) => i !== idx));
    setRows((rs) => rs.map((r) => r.filter((_, i) => i !== idx)));
  }

  function addRow() {
    setRows((rs) => [...rs, new Array(columns.length).fill("")]);
    setMidlines((m) => [...m, false]);
  }

  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
    setMidlines((m) => m.filter((_, i) => i !== idx));
  }

  function updateCell(rowIdx: number, colIdx: number, value: string) {
    setRows((rs) =>
      rs.map((r, i) =>
        i === rowIdx ? r.map((c, j) => (j === colIdx ? value : c)) : r,
      ),
    );
  }

  function toggleMidline(idx: number) {
    setMidlines((m) => m.map((v, i) => (i === idx ? !v : v)));
  }

  function handleImport() {
    const parsed = parseDelimitedText(pasteText);
    if (parsed.length === 0) return;

    const width = Math.max(...parsed.map((r) => r.length));
    const padded = parsed.map((r) => {
      const copy = [...r];
      while (copy.length < width) copy.push("");
      return copy;
    });

    if (firstRowHeader) {
      const [headerRow, ...dataRows] = padded;
      setColumns(
        headerRow.map((h, i) => ({
          header: h || `Spalte ${i + 1}`,
          align: columns[i]?.align ?? "S",
          tableFormat: columns[i]?.tableFormat ?? "1.2",
          unit: columns[i]?.unit,
          separatorAfter: columns[i]?.separatorAfter,
        })),
      );
      setRows(dataRows);
      setMidlines(dataRows.map(() => false));
    } else {
      setColumns(
        Array.from({ length: width }, (_, i) => ({
          header: `Spalte ${i + 1}`,
          align: "S" as ColumnAlign,
          tableFormat: "1.2",
        })),
      );
      setRows(padded);
      setMidlines(padded.map(() => false));
    }
  }

  const code = generateLatexTable({
    columns,
    rows,
    midruleAfterRows: midlines,
    caption: caption || undefined,
    label: label || undefined,
    placement,
  });

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-8">
      {/* Import */}
      <section className="space-y-2">
        <Label>Daten einfügen (aus Excel/Sheets kopiert, oder CSV)</Label>
        <Textarea
          rows={5}
          placeholder={"Probe\tWert\n1\t3695.08\n2\t77.29"}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="first-row-header"
            checked={firstRowHeader}
            onCheckedChange={(v) => setFirstRowHeader(Boolean(v))}
          />
          <Label htmlFor="first-row-header" className="font-normal">
            Erste Zeile ist Header
          </Label>
        </div>
        <Button variant="secondary" onClick={handleImport}>
          Importieren
        </Button>
      </section>

      {/* Spalten-Konfiguration */}
      <section className="space-y-3">
        <Label>Spalten</Label>
        <div className="space-y-3">
          {columns.map((col, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 border rounded-md p-3"
            >
              <div className="space-y-1">
                <Label className="text-xs">Header</Label>
                <Input
                  className="w-32"
                  value={col.header}
                  onChange={(e) => updateColumn(i, { header: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Einheit (optional)</Label>
                <Input
                  className="w-28"
                  placeholder="\milli\gram"
                  value={col.unit ?? ""}
                  onChange={(e) => updateColumn(i, { unit: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Typ</Label>
                <Select
                  value={col.align}
                  onValueChange={(v) =>
                    updateColumn(i, { align: v as ColumnAlign })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S (Zahl)</SelectItem>
                    <SelectItem value="l">l (links)</SelectItem>
                    <SelectItem value="c">c (mittig)</SelectItem>
                    <SelectItem value="r">r (rechts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {col.align === "S" && (
                <div className="space-y-1">
                  <Label className="text-xs">table-format</Label>
                  <Input
                    className="w-20"
                    placeholder="4.2"
                    value={col.tableFormat ?? ""}
                    onChange={(e) =>
                      updateColumn(i, { tableFormat: e.target.value })
                    }
                  />
                </div>
              )}
              <div className="flex items-center gap-1 pb-2">
                <Checkbox
                  id={`sep-${i}`}
                  checked={col.separatorAfter ?? false}
                  onCheckedChange={(v) =>
                    updateColumn(i, { separatorAfter: Boolean(v) })
                  }
                />
                <Label htmlFor={`sep-${i}`} className="text-xs font-normal">
                  Linie danach
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeColumn(i)}
                disabled={columns.length <= 1}
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addColumn}>
          + Spalte
        </Button>
      </section>

      {/* Daten-Grid */}
      <section className="space-y-2">
        <Label>Daten</Label>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {columns.map((col, i) => (
                  <th key={i} className="p-2 text-left font-medium">
                    {col.header}
                  </th>
                ))}
                <th className="p-2 w-40">Trennlinie danach</th>
                <th className="p-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-t">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-1">
                      <Input
                        value={cell}
                        onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                        className="h-8"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center">
                    <Checkbox
                      checked={midlines[rIdx] ?? false}
                      onCheckedChange={() => toggleMidline(rIdx)}
                    />
                  </td>
                  <td className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(rIdx)}
                    >
                      ✕
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" onClick={addRow}>
          + Zeile
        </Button>
      </section>

      {/* Meta */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Caption</Label>
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Label</Label>
          <Input
            placeholder="tab:massen"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Platzierung</Label>
          <Input
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
          />
        </div>
      </section>

      {/* Output */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Generierter Code</Label>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? "Kopiert!" : "Kopieren"}
          </Button>
        </div>
        <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto whitespace-pre">
          {code}
        </pre>
      </section>
    </div>
  );
}
