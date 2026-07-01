"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type EnergyColumn,
  type EnergyLevel,
  type EnergyConnection,
  computeLayout,
  computeConnectionLines,
  computeColumnLabelPositions,
  generateEnergyDiagramTikz,
  COLOR_PALETTE,
  colorHex,
} from "@/lib/latex/energyDiagram";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const defaultColumns: EnergyColumn[] = [
  { id: "c1", label: "AO A", color: "blue" },
  { id: "c2", label: "MO", color: "black" },
  { id: "c3", label: "AO B", color: "red" },
];

const defaultLevels: EnergyLevel[] = [
  { id: "l1", columnId: "c1", height: 0, label: "2p", electrons: 2, copies: 1 },
  { id: "l2", columnId: "c3", height: 0, label: "2p", electrons: 2, copies: 1 },
  {
    id: "l3",
    columnId: "c2",
    height: -1.2,
    label: "$\\sigma$",
    electrons: 2,
    copies: 1,
  },
  {
    id: "l4",
    columnId: "c2",
    height: 1.2,
    label: "$\\sigma^*$",
    electrons: 0,
    copies: 1,
  },
];

const defaultConnections: EnergyConnection[] = [
  { id: "k1", fromLevelId: "l1", toLevelId: "l3" },
  { id: "k2", fromLevelId: "l2", toLevelId: "l3" },
  { id: "k3", fromLevelId: "l1", toLevelId: "l4" },
  { id: "k4", fromLevelId: "l2", toLevelId: "l4" },
];

const SCALE = 40;
const PADDING = 1.5;
const ARROW_BELOW = 0.15;
const ARROW_ABOVE = 0.28;

interface HeightDrag {
  levelId: string;
  startClientY: number;
  startHeight: number;
}

interface ConnectDrag {
  fromLevelId: string;
  x: number;
  y: number;
}

export default function EnergyDiagramForm() {
  const [columns, setColumns] = useState<EnergyColumn[]>(defaultColumns);
  const [levels, setLevels] = useState<EnergyLevel[]>(defaultLevels);
  const [connections, setConnections] =
    useState<EnergyConnection[]>(defaultConnections);
  const [copied, setCopied] = useState(false);
  const [heightDrag, setHeightDrag] = useState<HeightDrag | null>(null);
  const [connectDrag, setConnectDrag] = useState<ConnectDrag | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function addColumn() {
    setColumns((c) => [
      ...c,
      { id: uid(), label: `Spalte ${c.length + 1}`, color: "black" },
    ]);
  }
  function updateColumn(id: string, label: string) {
    setColumns((c) =>
      c.map((col) => (col.id === id ? { ...col, label } : col)),
    );
  }
  function updateColumnColor(id: string, color: string) {
    setColumns((c) =>
      c.map((col) => (col.id === id ? { ...col, color } : col)),
    );
  }
  function removeColumn(id: string) {
    setColumns((c) => c.filter((col) => col.id !== id));
    setLevels((ls) => ls.filter((l) => l.columnId !== id));
  }

  function addLevel() {
    if (columns.length === 0) return;
    setLevels((ls) => [
      ...ls,
      {
        id: uid(),
        columnId: columns[0].id,
        height: 0,
        label: "",
        electrons: 0,
        copies: 1,
      },
    ]);
  }
  function updateLevel(id: string, patch: Partial<EnergyLevel>) {
    setLevels((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLevel(id: string) {
    setLevels((ls) => ls.filter((l) => l.id !== id));
    setConnections((cs) =>
      cs.filter((c) => c.fromLevelId !== id && c.toLevelId !== id),
    );
  }

  function removeConnection(id: string) {
    setConnections((cs) => cs.filter((c) => c.id !== id));
  }

  const levelLabel = (l: EnergyLevel) => {
    const col = columns.find((c) => c.id === l.columnId);
    return `${col?.label ?? "?"}: ${l.label || "(ohne Label)"} (h=${l.height})`;
  };

  const tikzCode = useMemo(
    () => generateEnergyDiagramTikz(columns, levels, connections),
    [columns, levels, connections],
  );

  const { segments } = useMemo(
    () => computeLayout(columns, levels),
    [columns, levels],
  );
  const connectionLines = useMemo(
    () => computeConnectionLines(levels, segments, connections),
    [levels, segments, connections],
  );
  const columnLabels = useMemo(
    () => computeColumnLabelPositions(columns, levels),
    [columns, levels],
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
  function clientToData(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;
    const svgX = (clientX - rect.left) * scaleX;
    const svgY = (clientY - rect.top) * scaleY;
    return { x: svgX / SCALE + minX, y: maxY - svgY / SCALE };
  }

  // Höhe per Drag ändern
  useEffect(() => {
    if (!heightDrag) return;
    function onMove(e: MouseEvent) {
      const deltaPx = heightDrag!.startClientY - e.clientY;
      const deltaData = deltaPx / SCALE;
      const newHeight =
        Math.round((heightDrag!.startHeight + deltaData) * 10) / 10;
      updateLevel(heightDrag!.levelId, { height: newHeight });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightDrag]);

  // Verbindung per Drag erstellen
  useEffect(() => {
    if (!connectDrag) return;
    function onMove(e: MouseEvent) {
      const { x, y } = clientToData(e.clientX, e.clientY);
      setConnectDrag((prev) => (prev ? { ...prev, x, y } : prev));
    }
    function onUp(e: MouseEvent) {
      const { x, y } = clientToData(e.clientX, e.clientY);
      const hit = segments.find(
        (seg) =>
          Math.abs(x - seg.x) <= seg.halfWidth + 0.1 &&
          Math.abs(y - seg.y) <= 0.3,
      );
      setConnectDrag((prev) => {
        if (hit && prev && hit.levelId !== prev.fromLevelId) {
          setConnections((cs) => [
            ...cs,
            {
              id: uid(),
              fromLevelId: prev.fromLevelId,
              toLevelId: hit.levelId,
            },
          ]);
        }
        return null;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectDrag, segments]);

  function handleCopy() {
    navigator.clipboard.writeText(tikzCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-8">
      {/* Spalten */}
      <section className="space-y-3">
        <Label>Spalten</Label>
        <div className="space-y-2">
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <Input
                value={col.label}
                onChange={(e) => updateColumn(col.id, e.target.value)}
                className="max-w-xs"
              />
              <Select
                value={col.color}
                onValueChange={(v) => updateColumnColor(col.id, v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_PALETTE.map((c) => (
                    <SelectItem key={c.tikz} value={c.tikz}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeColumn(col.id)}
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

      {/* Niveaus */}
      <section className="space-y-3">
        <Label>Energieniveaus</Label>
        <div className="space-y-3">
          {levels.map((level) => (
            <div
              key={level.id}
              className="flex flex-wrap items-end gap-2 border rounded-md p-3"
            >
              <div className="space-y-1">
                <Label className="text-xs">Spalte</Label>
                <Select
                  value={level.columnId}
                  onValueChange={(v) => updateLevel(level.id, { columnId: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Höhe</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="w-24"
                  value={level.height}
                  onChange={(e) =>
                    updateLevel(level.id, {
                      height: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  className="w-28"
                  placeholder="z.B. $\sigma^*$"
                  value={level.label}
                  onChange={(e) =>
                    updateLevel(level.id, { label: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Elektronen</Label>
                <Select
                  value={String(level.electrons)}
                  onValueChange={(v) =>
                    updateLevel(level.id, { electrons: Number(v) as 0 | 1 | 2 })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entartung</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={level.copies}
                  onChange={(e) =>
                    updateLevel(level.id, {
                      copies: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLevel(level.id)}
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addLevel}>
          + Niveau
        </Button>
      </section>

      {/* Interaktive Vorschau */}
      <section className="space-y-2">
        <Label>Vorschau</Label>
        <p className="text-xs text-muted-foreground">
          Linie an ihrem Mittelteil ziehen, um die Höhe zu ändern · Kreis am
          Rand einer Linie zu einer anderen ziehen, um eine Verbindung zu
          erstellen
        </p>
        <div className="border rounded-md p-4 overflow-x-auto bg-white">
          <svg ref={svgRef} width={svgWidth} height={svgHeight}>
            <defs>
              <marker
                id="arrowUp"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="5"
                orient="auto"
              >
                <path d="M0,5 L3,0 L6,5 Z" fill="black" />
              </marker>
              <marker
                id="arrowDown"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="1"
                orient="auto"
              >
                <path d="M0,0 L3,5 L6,0 Z" fill="black" />
              </marker>
            </defs>

            {connectionLines.map((line, i) => (
              <line
                key={connections[i]?.id ?? i}
                x1={toSvgX(line.x1)}
                y1={toSvgY(line.y1)}
                x2={toSvgX(line.x2)}
                y2={toSvgY(line.y2)}
                stroke="#999"
                strokeDasharray="4 3"
                strokeWidth={6}
                style={{ opacity: 0 }}
                className="cursor-pointer"
                onClick={() =>
                  connections[i] && removeConnection(connections[i].id)
                }
              />
            ))}
            {connectionLines.map((line, i) => (
              <line
                key={`visible-${connections[i]?.id ?? i}`}
                x1={toSvgX(line.x1)}
                y1={toSvgY(line.y1)}
                x2={toSvgX(line.x2)}
                y2={toSvgY(line.y2)}
                stroke="#999"
                strokeDasharray="4 3"
                style={{ pointerEvents: "none" }}
              />
            ))}

            {connectDrag &&
              (() => {
                const fromSeg = segments.find(
                  (s) => s.levelId === connectDrag.fromLevelId,
                );
                if (!fromSeg) return null;
                return (
                  <line
                    x1={toSvgX(fromSeg.x)}
                    y1={toSvgY(fromSeg.y)}
                    x2={toSvgX(connectDrag.x)}
                    y2={toSvgY(connectDrag.y)}
                    stroke="#2563eb"
                    strokeDasharray="4 3"
                    style={{ pointerEvents: "none" }}
                  />
                );
              })()}

            {segments.map((seg, i) => {
              const arrowBelow = ARROW_BELOW * SCALE;
              const arrowAbove = ARROW_ABOVE * SCALE;
              const lineY = toSvgY(seg.y);
              const xLeft = toSvgX(seg.x - seg.halfWidth);
              const xRight = toSvgX(seg.x + seg.halfWidth);
              return (
                <g key={i}>
                  {/* breiter, unsichtbarer Grabber für vertikales Höhe-Ziehen */}
                  <line
                    x1={xLeft}
                    y1={lineY}
                    x2={xRight}
                    y2={lineY}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ cursor: "ns-resize" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setHeightDrag({
                        levelId: seg.levelId,
                        startClientY: e.clientY,
                        startHeight: seg.y,
                      });
                    }}
                  />
                  <line
                    x1={xLeft}
                    y1={lineY}
                    x2={xRight}
                    y2={lineY}
                    stroke={colorHex(seg.color)}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    style={{ pointerEvents: "none" }}
                  />

                  {/* Verbindungs-Griffe an beiden Enden */}
                  {[xLeft, xRight].map((cx, hIdx) => (
                    <circle
                      key={hIdx}
                      cx={cx}
                      cy={lineY}
                      r={5}
                      fill="white"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                      style={{ cursor: "crosshair" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const { x, y } = clientToData(e.clientX, e.clientY);
                        setConnectDrag({ fromLevelId: seg.levelId, x, y });
                      }}
                    />
                  ))}

                  {seg.electrons >= 1 && (
                    <line
                      x1={toSvgX(seg.x - 0.14)}
                      y1={lineY + arrowBelow}
                      x2={toSvgX(seg.x - 0.14)}
                      y2={lineY - arrowAbove}
                      stroke="black"
                      markerEnd="url(#arrowUp)"
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  {seg.electrons >= 2 && (
                    <line
                      x1={toSvgX(seg.x + 0.14)}
                      y1={lineY - arrowAbove}
                      x2={toSvgX(seg.x + 0.14)}
                      y2={lineY + arrowBelow}
                      stroke="black"
                      markerEnd="url(#arrowDown)"
                      style={{ pointerEvents: "none" }}
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
                      style={{ pointerEvents: "none" }}
                    >
                      {seg.label.replace(/\$/g, "")}
                    </text>
                  )}
                </g>
              );
            })}
            {columnLabels.map((c, i) => (
              <text
                key={i}
                x={toSvgX(c.x)}
                y={toSvgY(c.y) + 16}
                textAnchor="middle"
                fontSize={13}
                fontWeight="bold"
                fill={colorHex(c.color)}
                style={{ pointerEvents: "none" }}
              >
                {c.label}
              </text>
            ))}
          </svg>
        </div>
        <p className="text-xs text-muted-foreground">
          Klick auf eine gestrichelte Verbindungslinie, um sie zu entfernen.
          LaTeX-Syntax wie $\sigma^*$ wird hier als Rohtext gezeigt, im fertigen
          PDF korrekt gerendert.
        </p>
      </section>

      {/* Verbindungen: nur noch Übersicht/Löschen, Erstellen läuft per Drag */}
      {connections.length > 0 && (
        <section className="space-y-2">
          <Label>Bestehende Verbindungen</Label>
          <div className="flex flex-wrap gap-2">
            {connections.map((conn) => {
              const from = levels.find((l) => l.id === conn.fromLevelId);
              const to = levels.find((l) => l.id === conn.toLevelId);
              return (
                <span
                  key={conn.id}
                  className="inline-flex items-center gap-2 text-xs border rounded-full px-3 py-1 bg-muted/50"
                >
                  {from ? levelLabel(from) : "?"} ↔ {to ? levelLabel(to) : "?"}
                  <button
                    onClick={() => removeConnection(conn.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Verbindung entfernen"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        </section>
      )}

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
