interface Atom {
  element: string;
  x: number;
  y: number;
}
interface Bond {
  a1: number;
  a2: number;
  order: number;
}

function parseMolblock(molblock: string): { atoms: Atom[]; bonds: Bond[] } {
  const lines = molblock.split("\n");
  const countsLine = lines[3] ?? "";
  const numAtoms = parseInt(countsLine.substring(0, 3).trim(), 10);
  const numBonds = parseInt(countsLine.substring(3, 6).trim(), 10);

  const atoms: Atom[] = [];
  for (let i = 0; i < numAtoms; i++) {
    const line = lines[4 + i];
    const x = parseFloat(line.substring(0, 10));
    const y = parseFloat(line.substring(10, 20));
    const element = line.substring(31, 34).trim();
    atoms.push({ element, x, y });
  }

  const bonds: Bond[] = [];
  for (let i = 0; i < numBonds; i++) {
    const line = lines[4 + numAtoms + i];
    const a1 = parseInt(line.substring(0, 3).trim(), 10) - 1;
    const a2 = parseInt(line.substring(3, 6).trim(), 10) - 1;
    const order = parseInt(line.substring(6, 9).trim(), 10);
    bonds.push({ a1, a2, order });
  }

  return { atoms, bonds };
}

// Grobe Standard-Valenzen (ohne Ladungen/Isotope) für implizite H-Berechnung
const VALENCE: Record<string, number> = {
  H: 1,
  C: 4,
  N: 3,
  O: 2,
  F: 1,
  P: 3,
  S: 2,
  Cl: 1,
  Br: 1,
  I: 1,
};

function bondSymbol(order: number): string {
  if (order === 2) return "=";
  if (order === 3) return "~";
  return "-";
}

function roundAngle(deg: number): number {
  const norm = ((deg % 360) + 360) % 360;
  return (Math.round(norm / 15) * 15) % 360;
}

export function molblockToChemfig(molblock: string): string {
  const { atoms, bonds } = parseMolblock(molblock);
  const n = atoms.length;
  if (n === 0) return "";

  const adj: { to: number; order: number }[][] = Array.from(
    { length: n },
    () => [],
  );
  bonds.forEach((b) => {
    adj[b.a1].push({ to: b.a2, order: b.order });
    adj[b.a2].push({ to: b.a1, order: b.order });
  });

  // implizite H-Zahl je Atom
  const bondOrderSum = new Array(n).fill(0);
  bonds.forEach((b) => {
    bondOrderSum[b.a1] += b.order;
    bondOrderSum[b.a2] += b.order;
  });
  const hCount = atoms.map((a, i) => {
    const val = VALENCE[a.element];
    if (val === undefined) return 0;
    return Math.max(0, val - bondOrderSum[i]);
  });

  function atomLabel(i: number): string {
    const el = atoms[i].element;
    if (el === "C") return ""; // Kohlenstoff bleibt unsichtbar (Skelettformel-Konvention)
    const h = hCount[i];
    if (h === 0) return el;
    if (h === 1) return `${el}H`;
    return `${el}H${h}`;
  }

  function angleBetween(a: number, b: number): number {
    const dx = atoms[b].x - atoms[a].x;
    const dy = atoms[b].y - atoms[a].y;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return roundAngle(deg);
  }

  // Startatom: bevorzugt eines mit nur einer Bindung, für eine natürlichere Kette
  let start = 0;
  for (let i = 0; i < n; i++) {
    if (adj[i].length === 1) {
      start = i;
      break;
    }
  }

  const visited = new Array(n).fill(false);
  const parent = new Array(n).fill(-1);
  const children: number[][] = Array.from({ length: n }, () => []);
  const backEdges: { from: number; to: number }[] = [];

  function dfsStructure(u: number) {
    visited[u] = true;
    for (const { to: v } of adj[u]) {
      if (!visited[v]) {
        parent[v] = u;
        children[u].push(v);
        dfsStructure(v);
      } else if (
        v !== parent[u] &&
        !backEdges.some((e) => e.from === v && e.to === u)
      ) {
        backEdges.push({ from: u, to: v });
      }
    }
  }
  dfsStructure(start);

  // Ringschluss-Zielatome benennen (für chemfig's @{name}-Referenzsyntax)
  const atomName: Record<number, string> = {};
  backEdges.forEach(({ to }) => {
    if (!(to in atomName)) atomName[to] = `a${to}`;
  });

  function bondOrderBetween(a: number, b: number): number {
    const found = adj[a].find((e) => e.to === b);
    return found ? found.order : 1;
  }

  function emit(u: number): string {
    let token = atomLabel(u);
    if (atomName[u]) token += `@{${atomName[u]}}`;

    const branches: string[] = [];
    let inline = "";

    backEdges
      .filter((e) => e.from === u)
      .forEach(({ to: v }) => {
        const sym = bondSymbol(bondOrderBetween(u, v));
        const ang = angleBetween(u, v);
        branches.push(`${sym}[:${ang}]@{${atomName[v]}}`);
      });

    const kids = children[u];
    kids.forEach((v, idx) => {
      const sym = bondSymbol(bondOrderBetween(u, v));
      const ang = angleBetween(u, v);
      const sub = `${sym}[:${ang}]${emit(v)}`;
      if (idx === kids.length - 1) {
        inline = sub; // letztes Kind setzt die Hauptkette fort
      } else {
        branches.push(sub);
      }
    });

    const branchStr = branches.map((b) => `(${b})`).join("");
    return `${token}${branchStr}${inline}`;
  }

  return `\\chemfig{${emit(start)}}`;
}
