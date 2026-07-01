export interface EnergyColumn {
  id: string;
  label: string;
  color: string; // TikZ-Farbname, z.B. "blue", "red", "black"
}

export interface EnergyLevel {
  id: string;
  columnId: string;
  height: number;
  label: string;
  electrons: 0 | 1 | 2;
  copies: number;
  // Optional: individuelle Besetzung pro entartetem Orbital (Index = copyIndex),
  // z.B. für Ligandenfeld-Aufspaltung, wo entartete Orbitale ungleich besetzt sein können.
  // Fehlt dieses Feld, wird `electrons` einheitlich für alle Kopien verwendet.
  copyElectrons?: (0 | 1 | 2)[];
}

export interface EnergyConnection {
  id: string;
  fromLevelId: string;
  toLevelId: string;
}

export interface LevelSegment {
  levelId: string;
  copyIndex: number;
  x: number;
  y: number;
  halfWidth: number;
  label: string;
  electrons: 0 | 1 | 2;
  showLabel: boolean;
  color: string;
}

export const COLOR_PALETTE: { label: string; tikz: string; hex: string }[] = [
  { label: "Schwarz", tikz: "black", hex: "#171717" },
  { label: "Blau", tikz: "blue", hex: "#1d4ed8" },
  { label: "Rot", tikz: "red", hex: "#dc2626" },
  { label: "Grün", tikz: "green!55!black", hex: "#15803d" },
  { label: "Orange", tikz: "orange", hex: "#ea580c" },
  { label: "Violett", tikz: "violet", hex: "#7c3aed" },
  { label: "Türkis", tikz: "teal", hex: "#0d9488" },
];

export function colorHex(tikzName: string): string {
  return COLOR_PALETTE.find((c) => c.tikz === tikzName)?.hex ?? "#171717";
}

const COLUMN_SPACING = 3.2;
const SEGMENT_WIDTH = 1.3;
const COPY_GAP = 0.35;
const MAX_GROUP_WIDTH = COLUMN_SPACING * 0.8; // Sicherheitsabstand zur Nachbarspalte

// Pfeile durchqueren die Energielinie (typische Lehrbuch-Konvention),
// statt nur darüber zu "schweben"
const ARROW_BELOW = 0.15;
const ARROW_ABOVE = 0.28;

function getSegmentSizing(copies: number): { width: number; gap: number } {
  if (copies <= 1) return { width: SEGMENT_WIDTH, gap: COPY_GAP };

  let width = SEGMENT_WIDTH;
  let gap = COPY_GAP;
  let total = copies * width + (copies - 1) * gap;

  if (total > MAX_GROUP_WIDTH) {
    const scale = MAX_GROUP_WIDTH / total;
    width = Math.max(width * scale, 0.28); // Mindestbreite, damit's noch sichtbar bleibt
    gap = Math.max(gap * scale, 0.08);
  }

  return { width, gap };
}

export function computeLayout(columns: EnergyColumn[], levels: EnergyLevel[]) {
  const columnIndex = new Map(columns.map((c, i) => [c.id, i]));
  const columnById = new Map(columns.map((c) => [c.id, c]));
  const segments: LevelSegment[] = [];

  levels.forEach((level) => {
    const colIdx = columnIndex.get(level.columnId) ?? 0;
    const baseX = colIdx * COLUMN_SPACING;
    const copies = Math.max(1, level.copies);
    const { width, gap } = getSegmentSizing(copies);
    const totalWidth = copies * width + (copies - 1) * gap;
    const startX = baseX - totalWidth / 2 + width / 2;
    const color = columnById.get(level.columnId)?.color ?? "black";

    for (let i = 0; i < copies; i++) {
      segments.push({
        levelId: level.id,
        copyIndex: i,
        x: startX + i * (width + gap),
        y: level.height,
        halfWidth: width / 2,
        label: level.label,
        electrons: level.copyElectrons?.[i] ?? level.electrons,
        showLabel: i === 0,
        color,
      });
    }
  });

  return { segments, columnIndex };
}

export function computeConnectionLines(
  levels: EnergyLevel[],
  segments: LevelSegment[],
  connections: EnergyConnection[],
) {
  return connections
    .map((conn) => {
      const fromLevel = levels.find((l) => l.id === conn.fromLevelId);
      const toLevel = levels.find((l) => l.id === conn.toLevelId);
      if (!fromLevel || !toLevel) return null;

      const fromSegs = segments.filter((s) => s.levelId === fromLevel.id);
      const toSegs = segments.filter((s) => s.levelId === toLevel.id);
      if (fromSegs.length === 0 || toSegs.length === 0) return null;

      const fromX = fromSegs.reduce((sum, s) => sum + s.x, 0) / fromSegs.length;
      const toX = toSegs.reduce((sum, s) => sum + s.x, 0) / toSegs.length;
      const fromHalf = fromSegs[0].halfWidth;
      const toHalf = toSegs[0].halfWidth;

      const fromEdgeX = fromX < toX ? fromX + fromHalf : fromX - fromHalf;
      const toEdgeX = fromX < toX ? toX - toHalf : toX + toHalf;

      return {
        x1: fromEdgeX,
        y1: fromLevel.height,
        x2: toEdgeX,
        y2: toLevel.height,
      };
    })
    .filter(
      (l): l is { x1: number; y1: number; x2: number; y2: number } =>
        l !== null,
    );
}

export function computeColumnLabelPositions(
  columns: EnergyColumn[],
  levels: EnergyLevel[],
) {
  return columns.map((col, idx) => {
    const x = idx * COLUMN_SPACING;
    const colLevels = levels.filter((l) => l.columnId === col.id);
    const minY = colLevels.length
      ? Math.min(...colLevels.map((l) => l.height))
      : 0;
    return { x, y: minY - 1.0, label: col.label, color: col.color };
  });
}

function electronArrowsTikz(
  x: number,
  y: number,
  electrons: number,
  color: string,
): string {
  if (electrons === 0) return "";
  const fmt = (n: number) => n.toFixed(2);
  const yBottom = y - ARROW_BELOW;
  const yTop = y + ARROW_ABOVE;

  if (electrons === 1) {
    return `\\draw[->,thick,${color}] (${fmt(x)},${fmt(yBottom)}) -- (${fmt(x)},${fmt(yTop)});`;
  }
  const x1 = x - 0.14;
  const x2 = x + 0.14;
  return [
    `\\draw[->,thick,${color}] (${fmt(x1)},${fmt(yBottom)}) -- (${fmt(x1)},${fmt(yTop)});`,
    `\\draw[<-,thick,${color}] (${fmt(x2)},${fmt(yTop)}) -- (${fmt(x2)},${fmt(yBottom)});`,
  ].join("\n");
}

export function generateEnergyDiagramTikz(
  columns: EnergyColumn[],
  levels: EnergyLevel[],
  connections: EnergyConnection[],
): string {
  const { segments } = computeLayout(columns, levels);
  const connectionLines = computeConnectionLines(levels, segments, connections);
  const columnLabels = computeColumnLabelPositions(columns, levels);
  const fmt = (n: number) => n.toFixed(2);

  const lines: string[] = ["\\begin{tikzpicture}"];

  connectionLines.forEach((line) => {
    lines.push(
      `\\draw[dashed,gray] (${fmt(line.x1)},${fmt(line.y1)}) -- (${fmt(line.x2)},${fmt(line.y2)});`,
    );
  });

  segments.forEach((seg) => {
    const xLeft = seg.x - seg.halfWidth;
    const xRight = seg.x + seg.halfWidth;
    lines.push(
      `\\draw[thick,${seg.color}] (${fmt(xLeft)},${fmt(seg.y)}) -- (${fmt(xRight)},${fmt(seg.y)});`,
    );

    const arrows = electronArrowsTikz(seg.x, seg.y, seg.electrons, "black");
    if (arrows) lines.push(arrows);

    if (seg.showLabel && seg.label) {
      const labelOffset = seg.electrons > 0 ? 0.55 : 0.35;
      lines.push(
        `\\node[anchor=south,${seg.color}] at (${fmt(seg.x)},${fmt(seg.y + labelOffset)}) {${seg.label}};`,
      );
    }
  });

  columnLabels.forEach((c) => {
    lines.push(
      `\\node[anchor=north,${c.color}] at (${fmt(c.x)},${fmt(c.y)}) {\\textbf{${c.label}}};`,
    );
  });

  lines.push("\\end{tikzpicture}");
  return lines.join("\n");
}
