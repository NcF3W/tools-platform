export type StageKind = "minimum" | "maximum";

export interface ReactionStage {
  id: string;
  label: string;
  height: number;
}

export interface ReactionPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: StageKind;
}

export interface BezierSegment {
  x0: number;
  y0: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  x1: number;
  y1: number;
}

export interface EaAnnotation {
  stageId: string;
  mathLabel: string; // LaTeX math content, ohne umschließende $
  value: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  arrowX: number;
}

export interface EnthalpyAnnotation {
  value: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  arrowX: number;
}

export interface ReactionLayout {
  points: ReactionPoint[];
  segments: BezierSegment[];
  eaAnnotations: EaAnnotation[];
  enthalpy: EnthalpyAnnotation | null;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

const STAGE_SPACING = 2.6;
const EA_ARROW_OFFSET = -0.55; // links vom ÜZ-Punkt
const ENTHALPY_ARROW_OFFSET = 1.1; // rechts vom letzten Punkt
const BOUNDS_PADDING = 0.9;

export function stageKind(index: number): StageKind {
  return index % 2 === 0 ? "minimum" : "maximum";
}

export function computeReactionPoints(
  stages: ReactionStage[],
): ReactionPoint[] {
  return stages.map((s, i) => ({
    id: s.id,
    x: i * STAGE_SPACING,
    y: s.height,
    label: s.label,
    kind: stageKind(i),
  }));
}

// Catmull-Rom -> kubische Bezier (Spannung 1/6), Enden geklemmt.
// Damit läuft die Kurve glatt exakt durch jeden Stufenpunkt.
export function computeCurveSegments(points: ReactionPoint[]): BezierSegment[] {
  if (points.length < 2) return [];
  const segments: BezierSegment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    segments.push({
      x0: p1.x,
      y0: p1.y,
      c1x,
      c1y,
      c2x,
      c2y,
      x1: p2.x,
      y1: p2.y,
    });
  }

  return segments;
}

export function computeEaAnnotations(points: ReactionPoint[]): EaAnnotation[] {
  const annotations: EaAnnotation[] = [];
  const maximaCount = points.filter((p) => p.kind === "maximum").length;
  let tsIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].kind !== "maximum") continue;
    tsIndex++;
    const prevMin = points[i - 1];
    const ts = points[i];

    annotations.push({
      stageId: ts.id,
      mathLabel: maximaCount > 1 ? `E_{a,${tsIndex}}` : "E_a",
      value: ts.y - prevMin.y,
      fromX: prevMin.x,
      fromY: prevMin.y,
      toX: ts.x,
      toY: ts.y,
      arrowX: ts.x + EA_ARROW_OFFSET,
    });
  }

  return annotations;
}

export function computeEnthalpyAnnotation(
  points: ReactionPoint[],
): EnthalpyAnnotation | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];

  return {
    value: last.y - first.y,
    fromX: first.x,
    fromY: first.y,
    toX: last.x,
    toY: last.y,
    arrowX: last.x + ENTHALPY_ARROW_OFFSET,
  };
}

export function computeReactionLayout(stages: ReactionStage[]): ReactionLayout {
  const points = computeReactionPoints(stages);
  const segments = computeCurveSegments(points);
  const eaAnnotations = computeEaAnnotations(points);
  const enthalpy = computeEnthalpyAnnotation(points);

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const annotationXs = [
    ...eaAnnotations.map((a) => a.arrowX),
    ...(enthalpy ? [enthalpy.arrowX] : []),
  ];

  const minX = Math.min(...xs) - BOUNDS_PADDING;
  const maxX = Math.max(...xs, ...annotationXs) + BOUNDS_PADDING;
  const minY = Math.min(...ys) - BOUNDS_PADDING;
  const maxY = Math.max(...ys) + BOUNDS_PADDING;

  return { points, segments, eaAnnotations, enthalpy, bounds: { minX, maxX, minY, maxY } };
}

export function generateReactionDiagramTikz(stages: ReactionStage[]): string {
  const { points, segments, eaAnnotations, enthalpy, bounds } =
    computeReactionLayout(stages);
  const fmt = (n: number) => n.toFixed(2);

  const lines: string[] = ["\\begin{tikzpicture}"];

  // Achsen
  const axisX = bounds.minX;
  const axisY = bounds.minY;
  lines.push(
    `\\draw[->] (${fmt(axisX)},${fmt(axisY)}) -- (${fmt(bounds.maxX)},${fmt(axisY)}) node[right] {Reaktionskoordinate};`,
  );
  lines.push(
    `\\draw[->] (${fmt(axisX)},${fmt(axisY)}) -- (${fmt(axisX)},${fmt(bounds.maxY)}) node[above] {$E$};`,
  );

  // Aktivierungsenergie-Annotationen
  eaAnnotations.forEach((ann) => {
    lines.push(
      `\\draw[dashed,gray] (${fmt(ann.fromX)},${fmt(ann.fromY)}) -- (${fmt(ann.arrowX)},${fmt(ann.fromY)});`,
    );
    lines.push(
      `\\draw[dashed,gray] (${fmt(ann.toX)},${fmt(ann.toY)}) -- (${fmt(ann.arrowX)},${fmt(ann.toY)});`,
    );
    lines.push(
      `\\draw[<->,thick] (${fmt(ann.arrowX)},${fmt(ann.fromY)}) -- (${fmt(ann.arrowX)},${fmt(ann.toY)});`,
    );
    lines.push(
      `\\node[anchor=east,align=left] at (${fmt(ann.arrowX)},${fmt((ann.fromY + ann.toY) / 2)}) {$${ann.mathLabel}$\\\\${ann.value.toFixed(1)}};`,
    );
  });

  // Reaktionsenthalpie-Annotation
  if (enthalpy) {
    lines.push(
      `\\draw[dashed,gray] (${fmt(enthalpy.fromX)},${fmt(enthalpy.fromY)}) -- (${fmt(enthalpy.arrowX)},${fmt(enthalpy.fromY)});`,
    );
    lines.push(
      `\\draw[dashed,gray] (${fmt(enthalpy.toX)},${fmt(enthalpy.toY)}) -- (${fmt(enthalpy.arrowX)},${fmt(enthalpy.toY)});`,
    );
    lines.push(
      `\\draw[<->,thick] (${fmt(enthalpy.arrowX)},${fmt(enthalpy.fromY)}) -- (${fmt(enthalpy.arrowX)},${fmt(enthalpy.toY)});`,
    );
    lines.push(
      `\\node[anchor=west,align=left] at (${fmt(enthalpy.arrowX)},${fmt((enthalpy.fromY + enthalpy.toY) / 2)}) {$\\Delta H_R$\\\\${enthalpy.value.toFixed(1)}};`,
    );
  }

  // Glatte Kurve durch alle Stufenpunkte
  if (segments.length > 0) {
    let path = `\\draw[thick,blue] (${fmt(segments[0].x0)},${fmt(segments[0].y0)})`;
    segments.forEach((seg) => {
      path += `\n\t.. controls (${fmt(seg.c1x)},${fmt(seg.c1y)}) and (${fmt(seg.c2x)},${fmt(seg.c2y)}) .. (${fmt(seg.x1)},${fmt(seg.y1)})`;
    });
    lines.push(path + ";");
  }

  // Punktmarker + Beschriftungen
  points.forEach((p) => {
    lines.push(`\\filldraw (${fmt(p.x)},${fmt(p.y)}) circle (1.2pt);`);
    if (!p.label) return;
    const anchor = p.kind === "minimum" ? "north" : "south";
    const offset = p.kind === "minimum" ? -0.3 : 0.3;
    lines.push(
      `\\node[anchor=${anchor}] at (${fmt(p.x)},${fmt(p.y + offset)}) {${p.label}};`,
    );
  });

  lines.push("\\end{tikzpicture}");
  return lines.join("\n");
}
