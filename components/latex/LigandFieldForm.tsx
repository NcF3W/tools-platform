"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  computeLayout,
  computeConnectionLines,
  computeColumnLabelPositions,
  generateEnergyDiagramTikz,
  colorHex,
} from "@/lib/latex/energyDiagram";
import {
  type Geometry,
  type SpinState,
  buildLigandFieldDiagram,
  GEOMETRY_LABEL,
  DELTA_SYMBOL_PLAIN,
  SCHEMATIC_ONLY,
  SPIN_TOGGLE_AVAILABLE,
} from "@/lib/latex/ligandField";

const GEOMETRIES: Geometry[] = [
  "oktaedrisch",
  "tetraedrisch",
  "quadratisch-planar",
];

const SCALE = 45;
const PADDING = 1.5;
const ARROW_BELOW = 0.15;
const ARROW_ABOVE = 0.28;

export default function LigandFieldForm() {
  const [geometry, setGeometry] = useState<Geometry>("oktaedrisch");
  const [dElectrons, setDElectrons] = useState(6);
  const [spin, setSpin] = useState<SpinState>("high");
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => buildLigandFieldDiagram(geometry, dElectrons, spin),
    [geometry, dElectrons, spin],
  );

  const tikzCode = useMemo(
    () => generateEnergyDiagramTikz(result.columns, result.levels, result.connections),
    [result],
  );

  const { segments } = useMemo(
    () => computeLayout(result.columns, result.levels),
    [result],
  );
  const connectionLines = useMemo(
    () => computeConnectionLines(result.levels, segments, result.connections),
    [result, segments],
  );
  const columnLabels = useMemo(
    () => computeColumnLabelPositions(result.columns, result.levels),
    [result],
  );

  const allX = [
    ...segments.map((s) => s.x - s.halfWidth),
    ...segments.map((s) => s.x + s.halfWidth),
    ...columnLabels.map((c) => c.x),
  ];
  const allY = [...segments.map((s) => s.y), ...columnLabels.map((c) => c.y)];
  const minX = allX.length ? Math.min(...allX) - PADDING : 0;
  const maxX = allX.length ? Math.max(...allX) + PADDING : 5;
  const minY = allY.length ? Math.min(...allY) - PADDING : 0;
  const maxY = allY.length ? Math.max(...allY) + PADDING + 0.5 : 5;

  const svgWidth = (maxX - minX) * SCALE;
  const svgHeight = (maxY - minY) * SCALE;

  function toSvgX(x: number) {
    return (x - minX) * SCALE;
  }
  function toSvgY(y: number) {
    return (maxY - y) * SCALE;
  }

  function handleCopy() {
    navigator.clipboard.writeText(tikzCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const showSpinToggle = SPIN_TOGGLE_AVAILABLE[geometry];

  return (
    <div className="space-y-8">
      {/* Parameter */}
      <section className="space-y-3">
        <Label>Parameter</Label>
        <div className="flex flex-wrap items-end gap-4 border rounded-md p-3">
          <div className="space-y-1">
            <Label className="text-xs">Geometrie</Label>
            <Select
              value={geometry}
              onValueChange={(v) => setGeometry(v as Geometry)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GEOMETRIES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GEOMETRY_LABEL[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">d-Elektronen</Label>
            <Select
              value={String(dElectrons)}
              onValueChange={(v) => setDElectrons(Number(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, n) => (
                  <SelectItem key={n} value={String(n)}>
                    d{n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showSpinToggle && (
            <div className="space-y-1">
              <Label className="text-xs">Spin-Zustand</Label>
              <Select
                value={spin}
                onValueChange={(v) => setSpin(v as SpinState)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High-Spin</SelectItem>
                  <SelectItem value="low">Low-Spin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {SCHEMATIC_ONLY[geometry] && (
          <p className="text-xs text-muted-foreground">
            Hinweis: Die quadratisch-planare Aufspaltung ist hier nur
            schematisch (Reihenfolge/ungefährer Abstand der Orbitale). Die
            exakten Energien hängen vom konkreten System ab und lassen sich
            nicht als feste Δ<sub>o</sub>-Brüche angeben.
          </p>
        )}
      </section>

      {/* Vorschau */}
      <section className="space-y-2">
        <Label>Vorschau</Label>
        <div className="border rounded-md p-4 overflow-x-auto bg-white">
          <svg width={svgWidth} height={svgHeight}>
            {connectionLines.map((line, i) => (
              <line
                key={i}
                x1={toSvgX(line.x1)}
                y1={toSvgY(line.y1)}
                x2={toSvgX(line.x2)}
                y2={toSvgY(line.y2)}
                stroke="#999"
                strokeDasharray="4 3"
              />
            ))}

            {segments.map((seg, i) => {
              const arrowBelow = ARROW_BELOW * SCALE;
              const arrowAbove = ARROW_ABOVE * SCALE;
              const lineY = toSvgY(seg.y);
              const xLeft = toSvgX(seg.x - seg.halfWidth);
              const xRight = toSvgX(seg.x + seg.halfWidth);
              return (
                <g key={i}>
                  <line
                    x1={xLeft}
                    y1={lineY}
                    x2={xRight}
                    y2={lineY}
                    stroke={colorHex(seg.color)}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                  {seg.electrons >= 1 && (
                    <line
                      x1={toSvgX(seg.x - 0.14)}
                      y1={lineY + arrowBelow}
                      x2={toSvgX(seg.x - 0.14)}
                      y2={lineY - arrowAbove}
                      stroke="black"
                      markerEnd="url(#ligandArrowUp)"
                    />
                  )}
                  {seg.electrons >= 2 && (
                    <line
                      x1={toSvgX(seg.x + 0.14)}
                      y1={lineY - arrowAbove}
                      x2={toSvgX(seg.x + 0.14)}
                      y2={lineY + arrowBelow}
                      stroke="black"
                      markerEnd="url(#ligandArrowDown)"
                    />
                  )}
                  {seg.showLabel && seg.label && (
                    <text
                      x={toSvgX(seg.x)}
                      y={lineY - (seg.electrons > 0 ? arrowAbove + 12 : 10)}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={600}
                      fill={colorHex(seg.color)}
                    >
                      {seg.label.replace(/\$/g, "")}
                    </text>
                  )}
                </g>
              );
            })}

            <defs>
              <marker
                id="ligandArrowUp"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="5"
                orient="auto"
              >
                <path d="M0,5 L3,0 L6,5 Z" fill="black" />
              </marker>
              <marker
                id="ligandArrowDown"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="1"
                orient="auto"
              >
                <path d="M0,0 L3,5 L6,0 Z" fill="black" />
              </marker>
            </defs>

            {columnLabels.map((c, i) => (
              <text
                key={i}
                x={toSvgX(c.x)}
                y={toSvgY(c.y) + 16}
                textAnchor="middle"
                fontSize={13}
                fontWeight="bold"
                fill={colorHex(c.color)}
              >
                {c.label}
              </text>
            ))}
          </svg>
        </div>
      </section>

      {/* Berechnete Werte */}
      <section className="space-y-2">
        <Label>Berechnete Werte</Label>
        <div className="flex flex-wrap gap-2 text-sm">
          {!SCHEMATIC_ONLY[geometry] &&
            result.filledGroups.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1 border rounded-full px-3 py-1 bg-muted/50"
              >
                {g.mathLabel} ({g.fractionText} {DELTA_SYMBOL_PLAIN[geometry]}
                ): {g.occupation.reduce((s: number, n) => s + n, 0)} e⁻
              </span>
            ))}
          {result.cfse !== null && (
            <span className="inline-flex items-center gap-1 border rounded-full px-3 py-1 bg-muted/50">
              CFSE = {result.cfse.toFixed(1)} {DELTA_SYMBOL_PLAIN[geometry]}
            </span>
          )}
          {result.extraPairs > 0 && (
            <span className="inline-flex items-center gap-1 border rounded-full px-3 py-1 bg-muted/50">
              {result.extraPairs} zusätzliche(s) Elektronenpaar(e) ggü. freiem Ion
            </span>
          )}
        </div>
      </section>

      {/* Output */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>TikZ-Code</Label>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? "Kopiert!" : "Kopieren"}
          </Button>
        </div>
        <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto whitespace-pre">
          {tikzCode}
        </pre>
        <p className="text-xs text-muted-foreground">
          Benötigt <code>\usepackage{"{tikz}"}</code> in der Präambel.
        </p>
      </section>
    </div>
  );
}
