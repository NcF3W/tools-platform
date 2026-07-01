"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type MorseParams,
  computeMorseBounds,
  sampleMorseCurve,
  generatePotentialCurveTikz,
} from "@/lib/latex/potentialCurve";

// Standardwerte entsprechen ungefähr H2 (De in eV, re in Å, a in Å^-1)
const defaultParams: MorseParams = { De: 4.52, re: 0.74, a: 1.94 };

const SCALE = 90;
const PADDING = 0.4;
const LABEL_MARGIN_PX = 90; // Platz für "De = ..."-Beschriftung rechts der Achse

export default function PotentialCurveForm() {
  const [params, setParams] = useState<MorseParams>(defaultParams);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  function updateParam(patch: Partial<MorseParams>) {
    setParams((p) => ({ ...p, ...patch }));
  }

  const tikzCode = useMemo(() => generatePotentialCurveTikz(params), [params]);
  const bounds = useMemo(() => computeMorseBounds(params), [params]);
  const curvePoints = useMemo(() => sampleMorseCurve(params), [params]);

  const boundsMinX = bounds.axisX;
  const boundsMaxX = bounds.annX;
  const boundsMinY = bounds.axisYBottom;
  const boundsMaxY = bounds.axisYTop;

  const svgWidth =
    (boundsMaxX - boundsMinX + 2 * PADDING) * SCALE + LABEL_MARGIN_PX;
  const svgHeight = (boundsMaxY - boundsMinY + 2 * PADDING) * SCALE;

  function toSvgX(x: number) {
    return (x - boundsMinX + PADDING) * SCALE;
  }
  function toSvgY(y: number) {
    return (boundsMaxY + PADDING - y) * SCALE;
  }
  function clientToData(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;
    const svgX = (clientX - rect.left) * scaleX;
    const svgY = (clientY - rect.top) * scaleY;
    return {
      x: svgX / SCALE + boundsMinX - PADDING,
      y: boundsMaxY + PADDING - svgY / SCALE,
    };
  }

  // Minimum-Punkt per Drag ändern: x -> re, y -> -De
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      const { x, y } = clientToData(e.clientX, e.clientY);
      updateParam({
        re: Math.max(0.05, Math.round(x * 100) / 100),
        De: Math.max(0.1, Math.round(-y * 100) / 100),
      });
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  function handleCopy() {
    navigator.clipboard.writeText(tikzCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const pathD = curvePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toSvgX(p.x)} ${toSvgY(p.y)}`)
    .join(" ");

  return (
    <div className="space-y-8">
      {/* Parameter */}
      <section className="space-y-3">
        <Label>Parameter</Label>
        <div className="flex flex-wrap items-end gap-4 border rounded-md p-3">
          <div className="space-y-1">
            <Label className="text-xs">Dissoziationsenergie De</Label>
            <Input
              type="number"
              step="0.1"
              className="w-28"
              value={params.De}
              onChange={(e) =>
                updateParam({ De: Math.max(0.1, parseFloat(e.target.value) || 0.1) })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Gleichgewichtsabstand re</Label>
            <Input
              type="number"
              step="0.05"
              className="w-28"
              value={params.re}
              onChange={(e) =>
                updateParam({ re: Math.max(0.05, parseFloat(e.target.value) || 0.05) })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kurvenbreite a</Label>
            <Input
              type="number"
              step="0.05"
              className="w-28"
              value={params.a}
              onChange={(e) =>
                updateParam({ a: Math.max(0.05, parseFloat(e.target.value) || 0.05) })
              }
            />
          </div>
        </div>
      </section>

      {/* Interaktive Vorschau */}
      <section className="space-y-2">
        <Label>Vorschau</Label>
        <p className="text-xs text-muted-foreground">
          Minimum der Kurve ziehen, um Gleichgewichtsabstand und
          Dissoziationsenergie gleichzeitig anzupassen
        </p>
        <div className="border rounded-md p-4 overflow-x-auto bg-white">
          <svg ref={svgRef} width={svgWidth} height={svgHeight}>
            <defs>
              <marker
                id="potAxisArrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#171717" />
              </marker>
            </defs>

            {/* Achsen */}
            <line
              x1={toSvgX(bounds.axisX)}
              y1={toSvgY(bounds.axisYBottom)}
              x2={toSvgX(boundsMaxX)}
              y2={toSvgY(bounds.axisYBottom)}
              stroke="#171717"
              strokeWidth={1.5}
              markerEnd="url(#potAxisArrow)"
            />
            <line
              x1={toSvgX(bounds.axisX)}
              y1={toSvgY(bounds.axisYBottom)}
              x2={toSvgX(bounds.axisX)}
              y2={toSvgY(bounds.axisYTop)}
              stroke="#171717"
              strokeWidth={1.5}
              markerEnd="url(#potAxisArrow)"
            />
            <text
              x={toSvgX(boundsMaxX) - 4}
              y={toSvgY(bounds.axisYBottom) - 6}
              textAnchor="end"
              fontSize={11}
              fill="#171717"
            >
              r
            </text>
            <text
              x={toSvgX(bounds.axisX) + 6}
              y={toSvgY(bounds.axisYTop) + 12}
              textAnchor="start"
              fontSize={11}
              fill="#171717"
            >
              E
            </text>

            {/* Dissoziationsasymptote */}
            <line
              x1={toSvgX(bounds.axisX)}
              y1={toSvgY(0)}
              x2={toSvgX(boundsMaxX)}
              y2={toSvgY(0)}
              stroke="#999"
              strokeDasharray="4 3"
            />

            {/* De-Annotation */}
            <line
              x1={toSvgX(bounds.rMax + 0.6)}
              y1={toSvgY(0)}
              x2={toSvgX(bounds.annX)}
              y2={toSvgY(0)}
              stroke="#999"
              strokeDasharray="4 3"
            />
            <line
              x1={toSvgX(params.re)}
              y1={toSvgY(-params.De)}
              x2={toSvgX(bounds.annX)}
              y2={toSvgY(-params.De)}
              stroke="#999"
              strokeDasharray="4 3"
            />
            <line
              x1={toSvgX(bounds.annX)}
              y1={toSvgY(0)}
              x2={toSvgX(bounds.annX)}
              y2={toSvgY(-params.De)}
              stroke="#dc2626"
              strokeWidth={1.5}
            />
            <text
              x={toSvgX(bounds.annX) + 6}
              y={toSvgY(-params.De / 2)}
              textAnchor="start"
              fontSize={11}
              fill="#dc2626"
            >
              De = {params.De.toFixed(2)}
            </text>

            {/* re-Annotation */}
            <line
              x1={toSvgX(params.re)}
              y1={toSvgY(-params.De)}
              x2={toSvgX(params.re)}
              y2={toSvgY(bounds.axisYBottom)}
              stroke="#999"
              strokeDasharray="4 3"
            />
            <text
              x={toSvgX(params.re)}
              y={toSvgY(bounds.axisYBottom) + 16}
              textAnchor="middle"
              fontSize={11}
              fill="#171717"
            >
              re = {params.re.toFixed(2)}
            </text>

            {/* Morse-Kurve */}
            <path d={pathD} fill="none" stroke="#1d4ed8" strokeWidth={2.5} />

            {/* Draggable Minimum */}
            <circle
              cx={toSvgX(params.re)}
              cy={toSvgY(-params.De)}
              r={10}
              fill="transparent"
              style={{ cursor: "move" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragging(true);
              }}
            />
            <circle
              cx={toSvgX(params.re)}
              cy={toSvgY(-params.De)}
              r={4}
              fill="#171717"
              style={{ pointerEvents: "none" }}
            />
          </svg>
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
