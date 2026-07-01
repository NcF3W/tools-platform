export interface MorseParams {
  De: number; // Dissoziationsenergie (Tiefe des Potentialtopfs)
  re: number; // Gleichgewichtsabstand
  a: number; // Formparameter (Kurvenbreite)
}

export interface MorseBounds {
  rMin: number;
  rMax: number;
  axisX: number;
  axisYBottom: number;
  axisYTop: number;
  annX: number;
}

// V(r) = De * (1 - e^{-a(r-re)})^2 - De
// Minimum bei r=re: V=-De. Asymptote für r->unendlich: V=0 (Dissoziationsgrenze).
export function morseEnergy(r: number, { De, re, a }: MorseParams): number {
  const term = 1 - Math.exp(-a * (r - re));
  return De * term * term - De;
}

export function computeMorseBounds(params: MorseParams): MorseBounds {
  const { De, re, a } = params;
  const rMin = Math.max(0.05, re - 1.5 / a);
  const rMax = re + 4 / a;
  const axisX = rMin - 0.3;
  const axisYBottom = -De - 0.6;
  const axisYTop = 0.6;
  const annX = rMax + 0.8;
  return { rMin, rMax, axisX, axisYBottom, axisYTop, annX };
}

export function sampleMorseCurve(
  params: MorseParams,
  samples = 150,
): { x: number; y: number }[] {
  const { rMin, rMax } = computeMorseBounds(params);
  const step = (rMax - rMin) / (samples - 1);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const r = rMin + i * step;
    points.push({ x: r, y: morseEnergy(r, params) });
  }
  return points;
}

export function generatePotentialCurveTikz(params: MorseParams): string {
  const { De, re, a } = params;
  const { rMin, rMax, axisX, axisYBottom, axisYTop, annX } =
    computeMorseBounds(params);
  const fmt = (n: number) => n.toFixed(2);
  const fmtParam = (n: number) => n.toFixed(3);

  const lines: string[] = ["\\begin{tikzpicture}"];

  // Achsen
  lines.push(
    `\\draw[->] (${fmt(axisX)},${fmt(axisYBottom)}) -- (${fmt(rMax + 0.6)},${fmt(axisYBottom)}) node[right] {$r$};`,
  );
  lines.push(
    `\\draw[->] (${fmt(axisX)},${fmt(axisYBottom)}) -- (${fmt(axisX)},${fmt(axisYTop)}) node[above] {$E$};`,
  );

  // Dissoziationsasymptote
  lines.push(
    `\\draw[dashed,gray] (${fmt(axisX)},0) -- (${fmt(annX)},0);`,
  );

  // De-Annotation
  lines.push(
    `\\draw[dashed,gray] (${fmt(rMax + 0.6)},0) -- (${fmt(annX)},0);`,
  );
  lines.push(
    `\\draw[dashed,gray] (${fmt(re)},${fmt(-De)}) -- (${fmt(annX)},${fmt(-De)});`,
  );
  lines.push(
    `\\draw[<->,thick] (${fmt(annX)},0) -- (${fmt(annX)},${fmt(-De)});`,
  );
  lines.push(
    `\\node[anchor=west,align=left] at (${fmt(annX)},${fmt(-De / 2)}) {$D_e$\\\\${De}};`,
  );

  // re-Annotation
  lines.push(
    `\\draw[dashed,gray] (${fmt(re)},${fmt(-De)}) -- (${fmt(re)},${fmt(axisYBottom)});`,
  );
  lines.push(
    `\\node[anchor=north] at (${fmt(re)},${fmt(axisYBottom)}) {$r_e$ = ${re}};`,
  );
  lines.push(`\\filldraw (${fmt(re)},${fmt(-De)}) circle (1.2pt);`);

  // Morse-Kurve als native TikZ-Funktionsdarstellung (kein pgfplots nötig)
  lines.push(
    `\\draw[domain=${fmtParam(rMin)}:${fmtParam(rMax)},smooth,samples=100,variable=\\x,thick,blue] plot ({\\x},{${fmtParam(De)}*(1-exp(-${fmtParam(a)}*(\\x-${fmtParam(re)})))^2 - ${fmtParam(De)}});`,
  );

  lines.push("\\end{tikzpicture}");
  return lines.join("\n");
}
