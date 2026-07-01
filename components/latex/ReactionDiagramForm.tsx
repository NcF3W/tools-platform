"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ReactionStage,
  computeReactionLayout,
  generateReactionDiagramTikz,
} from "@/lib/latex/reactionDiagram";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const defaultStages: ReactionStage[] = [
  { id: "s1", label: "Edukte", height: 0 },
  { id: "s2", label: "Übergangszustand", height: 2.5 },
  { id: "s3", label: "Produkte", height: -1.2 },
];

const SCALE = 60;
const PADDING = 0.6;

interface HeightDrag {
  stageId: string;
  startClientY: number;
  startHeight: number;
}

export default function ReactionDiagramForm() {
  const [stages, setStages] = useState<ReactionStage[]>(defaultStages);
  const [copied, setCopied] = useState(false);
  const [heightDrag, setHeightDrag] = useState<HeightDrag | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function updateStage(id: string, patch: Partial<ReactionStage>) {
    setStages((s) => s.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  }

  function addStep() {
    setStages((s) => {
      const stepNumber = Math.floor(s.length / 2) + 1;
      const newTs: ReactionStage = {
        id: uid(),
        label: `Übergangszustand ${stepNumber}`,
        height: 2,
      };
      const newIntermediate: ReactionStage = {
        id: uid(),
        label: `Zwischenprodukt ${stepNumber}`,
        height: 0,
      };
      return [...s.slice(0, -1), newTs, newIntermediate, s[s.length - 1]];
    });
  }

  function removeStep(tsIndex: number) {
    setStages((s) => {
      if (s.length <= 3) return s;
      return [...s.slice(0, tsIndex), ...s.slice(tsIndex + 2)];
    });
  }

  const tikzCode = useMemo(() => generateReactionDiagramTikz(stages), [stages]);
  const { points, segments, eaAnnotations, enthalpy, bounds } = useMemo(
    () => computeReactionLayout(stages),
    [stages],
  );

  const svgWidth = (bounds.maxX - bounds.minX + 2 * PADDING) * SCALE;
  const svgHeight = (bounds.maxY - bounds.minY + 2 * PADDING) * SCALE;

  function toSvgX(x: number) {
    return (x - bounds.minX + PADDING) * SCALE;
  }
  function toSvgY(y: number) {
    return (bounds.maxY + PADDING - y) * SCALE;
  }

  // Höhe per Drag ändern
  useEffect(() => {
    if (!heightDrag) return;
    function onMove(e: MouseEvent) {
      const deltaPx = heightDrag!.startClientY - e.clientY;
      const deltaData = deltaPx / SCALE;
      const newHeight =
        Math.round((heightDrag!.startHeight + deltaData) * 10) / 10;
      updateStage(heightDrag!.stageId, { height: newHeight });
    }
    function onUp() {
      setHeightDrag(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [heightDrag]);

  function handleCopy() {
    navigator.clipboard.writeText(tikzCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function pathD() {
    if (segments.length === 0) return "";
    let d = `M ${toSvgX(segments[0].x0)} ${toSvgY(segments[0].y0)}`;
    segments.forEach((seg) => {
      d += ` C ${toSvgX(seg.c1x)} ${toSvgY(seg.c1y)}, ${toSvgX(seg.c2x)} ${toSvgY(seg.c2y)}, ${toSvgX(seg.x1)} ${toSvgY(seg.y1)}`;
    });
    return d;
  }

  return (
    <div className="space-y-8">
      {/* Stufen */}
      <section className="space-y-3">
        <Label>Reaktionsverlauf</Label>
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 border rounded-md p-3">
            <div className="space-y-1">
              <Label className="text-xs">Startzustand (Edukte)</Label>
              <Input
                className="w-40"
                value={stages[0].label}
                onChange={(e) =>
                  updateStage(stages[0].id, { label: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Höhe</Label>
              <Input
                type="number"
                step="0.1"
                className="w-24"
                value={stages[0].height}
                onChange={(e) =>
                  updateStage(stages[0].id, {
                    height: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          {Array.from({ length: (stages.length - 1) / 2 }, (_, i) => {
            const tsIndex = 1 + i * 2;
            const ts = stages[tsIndex];
            const after = stages[tsIndex + 1];
            const isLast = tsIndex + 1 === stages.length - 1;
            return (
              <div key={ts.id} className="border rounded-md p-3 space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Übergangszustand</Label>
                    <Input
                      className="w-40"
                      value={ts.label}
                      onChange={(e) =>
                        updateStage(ts.id, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Höhe</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="w-24"
                      value={ts.height}
                      onChange={(e) =>
                        updateStage(ts.id, {
                          height: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  {stages.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(tsIndex)}
                    >
                      Schritt entfernen
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {isLast ? "Endzustand (Produkte)" : "Zwischenprodukt"}
                    </Label>
                    <Input
                      className="w-40"
                      value={after.label}
                      onChange={(e) =>
                        updateStage(after.id, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Höhe</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="w-24"
                      value={after.height}
                      onChange={(e) =>
                        updateStage(after.id, {
                          height: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={addStep}>
          + Zwischenschritt
        </Button>
      </section>

      {/* Interaktive Vorschau */}
      <section className="space-y-2">
        <Label>Vorschau</Label>
        <p className="text-xs text-muted-foreground">
          Punkt vertikal ziehen, um die Energiehöhe der Stufe zu ändern
        </p>
        <div className="border rounded-md p-4 overflow-x-auto bg-white">
          <svg ref={svgRef} width={svgWidth} height={svgHeight}>
            {/* Achsen */}
            <line
              x1={toSvgX(bounds.minX)}
              y1={toSvgY(bounds.minY)}
              x2={toSvgX(bounds.maxX)}
              y2={toSvgY(bounds.minY)}
              stroke="#171717"
              strokeWidth={1.5}
              markerEnd="url(#axisArrow)"
            />
            <line
              x1={toSvgX(bounds.minX)}
              y1={toSvgY(bounds.minY)}
              x2={toSvgX(bounds.minX)}
              y2={toSvgY(bounds.maxY)}
              stroke="#171717"
              strokeWidth={1.5}
              markerEnd="url(#axisArrow)"
            />
            <defs>
              <marker
                id="axisArrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#171717" />
              </marker>
            </defs>
            <text
              x={toSvgX(bounds.maxX) - 4}
              y={toSvgY(bounds.minY) - 6}
              textAnchor="end"
              fontSize={11}
              fill="#171717"
            >
              Reaktionskoordinate
            </text>

            {/* Ea-Annotationen */}
            {eaAnnotations.map((ann, i) => (
              <g key={i}>
                <line
                  x1={toSvgX(ann.fromX)}
                  y1={toSvgY(ann.fromY)}
                  x2={toSvgX(ann.arrowX)}
                  y2={toSvgY(ann.fromY)}
                  stroke="#999"
                  strokeDasharray="4 3"
                />
                <line
                  x1={toSvgX(ann.toX)}
                  y1={toSvgY(ann.toY)}
                  x2={toSvgX(ann.arrowX)}
                  y2={toSvgY(ann.toY)}
                  stroke="#999"
                  strokeDasharray="4 3"
                />
                <line
                  x1={toSvgX(ann.arrowX)}
                  y1={toSvgY(ann.fromY)}
                  x2={toSvgX(ann.arrowX)}
                  y2={toSvgY(ann.toY)}
                  stroke="#dc2626"
                  strokeWidth={1.5}
                />
                <text
                  x={toSvgX(ann.arrowX) - 6}
                  y={toSvgY((ann.fromY + ann.toY) / 2)}
                  textAnchor="end"
                  fontSize={11}
                  fill="#dc2626"
                >
                  {ann.value.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Enthalpie-Annotation */}
            {enthalpy && (
              <g>
                <line
                  x1={toSvgX(enthalpy.fromX)}
                  y1={toSvgY(enthalpy.fromY)}
                  x2={toSvgX(enthalpy.arrowX)}
                  y2={toSvgY(enthalpy.fromY)}
                  stroke="#999"
                  strokeDasharray="4 3"
                />
                <line
                  x1={toSvgX(enthalpy.toX)}
                  y1={toSvgY(enthalpy.toY)}
                  x2={toSvgX(enthalpy.arrowX)}
                  y2={toSvgY(enthalpy.toY)}
                  stroke="#999"
                  strokeDasharray="4 3"
                />
                <line
                  x1={toSvgX(enthalpy.arrowX)}
                  y1={toSvgY(enthalpy.fromY)}
                  x2={toSvgX(enthalpy.arrowX)}
                  y2={toSvgY(enthalpy.toY)}
                  stroke="#1d4ed8"
                  strokeWidth={1.5}
                />
                <text
                  x={toSvgX(enthalpy.arrowX) + 6}
                  y={toSvgY((enthalpy.fromY + enthalpy.toY) / 2)}
                  textAnchor="start"
                  fontSize={11}
                  fill="#1d4ed8"
                >
                  {enthalpy.value.toFixed(1)}
                </text>
              </g>
            )}

            {/* Glatte Kurve */}
            <path d={pathD()} fill="none" stroke="#1d4ed8" strokeWidth={2.5} />

            {/* Punkte */}
            {points.map((p) => (
              <g key={p.id}>
                <circle
                  cx={toSvgX(p.x)}
                  cy={toSvgY(p.y)}
                  r={10}
                  fill="transparent"
                  style={{ cursor: "ns-resize" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setHeightDrag({
                      stageId: p.id,
                      startClientY: e.clientY,
                      startHeight: p.y,
                    });
                  }}
                />
                <circle
                  cx={toSvgX(p.x)}
                  cy={toSvgY(p.y)}
                  r={4}
                  fill="#171717"
                  style={{ pointerEvents: "none" }}
                />
                {p.label && (
                  <text
                    x={toSvgX(p.x)}
                    y={toSvgY(p.y) + (p.kind === "minimum" ? 18 : -12)}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="#171717"
                    style={{ pointerEvents: "none" }}
                  >
                    {p.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </section>

      {/* Berechnete Werte */}
      <section className="space-y-2">
        <Label>Berechnete Werte</Label>
        <div className="flex flex-wrap gap-2 text-sm">
          {eaAnnotations.map((ann, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 border rounded-full px-3 py-1 bg-muted/50"
            >
              E<sub>a{eaAnnotations.length > 1 ? `,${i + 1}` : ""}</sub> ={" "}
              {ann.value.toFixed(2)}
            </span>
          ))}
          {enthalpy && (
            <span className="inline-flex items-center gap-1 border rounded-full px-3 py-1 bg-muted/50">
              ΔH<sub>R</sub> = {enthalpy.value.toFixed(2)}
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
