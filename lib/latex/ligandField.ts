import {
  type EnergyColumn,
  type EnergyLevel,
  type EnergyConnection,
} from "@/lib/latex/energyDiagram";

export type Geometry = "oktaedrisch" | "tetraedrisch" | "quadratisch-planar";
export type SpinState = "high" | "low";

export interface OrbitalGroup {
  id: string;
  mathLabel: string; // LaTeX-Symmetrielabel, z.B. "t_{2g}"
  degeneracy: number;
  // Energie in Delta-Einheiten (Oh: Delta_o, Td: Delta_t), Schwerpunkt = 0.
  // Bei quadratisch-planar nur schematisch (siehe SCHEMATIC_ONLY).
  energy: number;
  fractionText: string; // Klartext-Anzeige, z.B. "-2/5", nur für exakte Geometrien
}

// Quadratisch-planar hat keine allgemeingültigen Delta_o-Brüche (hängt von
// Ds/Dt der AOM ab) - Werte hier sind rein schematisch für die Reihenfolge/
// Abstände, keine quantitative Aussage.
export const SCHEMATIC_ONLY: Record<Geometry, boolean> = {
  oktaedrisch: false,
  tetraedrisch: false,
  "quadratisch-planar": true,
};

export const DELTA_SYMBOL: Record<Geometry, string> = {
  oktaedrisch: "\\Delta_o",
  tetraedrisch: "\\Delta_t",
  "quadratisch-planar": "\\Delta",
};

// Klartext-Variante für die UI (kein LaTeX-Rendering dort)
export const DELTA_SYMBOL_PLAIN: Record<Geometry, string> = {
  oktaedrisch: "Δo",
  tetraedrisch: "Δt",
  "quadratisch-planar": "Δ",
};

// Nur bei oktaedrischer Aufspaltung ist Low-Spin real relevant (Delta_o kann
// groß genug werden); bei Td ist Delta_t immer zu klein, bei D4h wird
// (vereinfacht) immer "low-spin-artig" von unten aufgefüllt.
export const SPIN_TOGGLE_AVAILABLE: Record<Geometry, boolean> = {
  oktaedrisch: true,
  tetraedrisch: false,
  "quadratisch-planar": false,
};

export const GEOMETRY_LABEL: Record<Geometry, string> = {
  oktaedrisch: "Oktaedrisch (O_h)",
  tetraedrisch: "Tetraedrisch (T_d)",
  "quadratisch-planar": "Quadratisch-planar (D_{4h})",
};

const GEOMETRY_GROUPS: Record<Geometry, OrbitalGroup[]> = {
  oktaedrisch: [
    {
      id: "t2g",
      mathLabel: "t_{2g}",
      degeneracy: 3,
      energy: -0.4,
      fractionText: "-2/5",
    },
    {
      id: "eg",
      mathLabel: "e_g",
      degeneracy: 2,
      energy: 0.6,
      fractionText: "+3/5",
    },
  ],
  tetraedrisch: [
    {
      id: "e",
      mathLabel: "e",
      degeneracy: 2,
      energy: -0.6,
      fractionText: "-3/5",
    },
    {
      id: "t2",
      mathLabel: "t_2",
      degeneracy: 3,
      energy: 0.4,
      fractionText: "+2/5",
    },
  ],
  "quadratisch-planar": [
    { id: "eg", mathLabel: "e_g", degeneracy: 2, energy: -0.8, fractionText: "" },
    { id: "a1g", mathLabel: "a_{1g}", degeneracy: 1, energy: -0.2, fractionText: "" },
    { id: "b2g", mathLabel: "b_{2g}", degeneracy: 1, energy: 0.4, fractionText: "" },
    { id: "b1g", mathLabel: "b_{1g}", degeneracy: 1, energy: 1.6, fractionText: "" },
  ],
};

export function orbitalGroupsFor(geometry: Geometry): OrbitalGroup[] {
  return GEOMETRY_GROUPS[geometry];
}

export interface FilledGroup extends OrbitalGroup {
  occupation: (0 | 1 | 2)[]; // Länge = degeneracy
}

// Hund'sche Regel innerhalb eines Satzes von `slots` Orbitalen: erst jedes
// Orbital einfach besetzen, danach erst paaren.
function fillHund(slots: number, electrons: number): (0 | 1 | 2)[] {
  const occ: (0 | 1 | 2)[] = new Array(slots).fill(0);
  let remaining = electrons;
  for (let i = 0; i < slots && remaining > 0; i++) {
    occ[i] = 1;
    remaining--;
  }
  for (let i = 0; i < slots && remaining > 0; i++) {
    occ[i] = 2;
    remaining--;
  }
  return occ;
}

// High-Spin: alle Orbitale über alle Gruppen hinweg (nach Energie sortiert)
// werden zuerst einfach besetzt, erst danach wird gepaart.
function fillHighSpin(groups: OrbitalGroup[], dElectrons: number): FilledGroup[] {
  const sorted = [...groups].sort((a, b) => a.energy - b.energy);
  const slots = sorted.flatMap((g, gIdx) =>
    Array.from({ length: g.degeneracy }, (_, i) => ({ gIdx, slotIdx: i })),
  );
  const occByGroup = sorted.map((g) => new Array<0 | 1 | 2>(g.degeneracy).fill(0));

  let remaining = dElectrons;
  for (const slot of slots) {
    if (remaining <= 0) break;
    occByGroup[slot.gIdx][slot.slotIdx] = 1;
    remaining--;
  }
  for (const slot of slots) {
    if (remaining <= 0) break;
    occByGroup[slot.gIdx][slot.slotIdx] = 2;
    remaining--;
  }

  return sorted.map((g, i) => ({ ...g, occupation: occByGroup[i] }));
}

// Low-Spin (bzw. "von unten auffüllen"): jede Gruppe in Energiereihenfolge
// wird komplett gefüllt, bevor die nächsthöhere Gruppe besetzt wird.
function fillLowSpin(groups: OrbitalGroup[], dElectrons: number): FilledGroup[] {
  const sorted = [...groups].sort((a, b) => a.energy - b.energy);
  let remaining = dElectrons;

  return sorted.map((g) => {
    const capacity = g.degeneracy * 2;
    const take = Math.min(remaining, capacity);
    remaining -= take;
    return { ...g, occupation: fillHund(g.degeneracy, take) };
  });
}

export function fillDElectrons(
  geometry: Geometry,
  dElectrons: number,
  spin: SpinState,
): FilledGroup[] {
  const groups = orbitalGroupsFor(geometry);
  const useLowSpin = SPIN_TOGGLE_AVAILABLE[geometry]
    ? spin === "low"
    : geometry === "quadratisch-planar"; // D4h: vereinfacht immer von unten auffüllen

  return useLowSpin
    ? fillLowSpin(groups, dElectrons)
    : fillHighSpin(groups, dElectrons);
}

export function freeIonOccupation(dElectrons: number): (0 | 1 | 2)[] {
  return fillHund(5, dElectrons);
}

export interface LigandFieldResult {
  columns: EnergyColumn[];
  levels: EnergyLevel[];
  connections: EnergyConnection[];
  filledGroups: FilledGroup[];
  cfse: number | null; // in Delta-Einheiten, null wenn nicht quantifizierbar (D4h)
  extraPairs: number; // zusätzliche Elektronenpaare ggü. dem freien Ion (Hund'sche Regel)
}

const DISPLAY_SCALE: Record<Geometry, number> = {
  oktaedrisch: 2,
  tetraedrisch: 2,
  "quadratisch-planar": 1,
};

export function buildLigandFieldDiagram(
  geometry: Geometry,
  dElectrons: number,
  spin: SpinState,
): LigandFieldResult {
  const filledGroups = fillDElectrons(geometry, dElectrons, spin);
  const freeOcc = freeIonOccupation(dElectrons);
  const scale = DISPLAY_SCALE[geometry];

  const columns: EnergyColumn[] = [
    { id: "free", label: "Freies Ion", color: "black" },
    { id: "field", label: GEOMETRY_LABEL[geometry], color: "blue" },
  ];

  const levels: EnergyLevel[] = [
    {
      id: "free-d",
      columnId: "free",
      height: 0,
      label: "$d$",
      electrons: 0,
      copies: 5,
      copyElectrons: freeOcc,
    },
    ...filledGroups.map((g) => ({
      id: g.id,
      columnId: "field",
      height: g.energy * scale,
      label: `$${g.mathLabel}$`,
      electrons: 0 as const,
      copies: g.degeneracy,
      copyElectrons: g.occupation,
    })),
  ];

  const connections: EnergyConnection[] = filledGroups.map((g) => ({
    id: `conn-${g.id}`,
    fromLevelId: "free-d",
    toLevelId: g.id,
  }));

  const cfse = SCHEMATIC_ONLY[geometry]
    ? null
    : filledGroups.reduce((sum, g) => {
        const electronsInGroup = g.occupation.reduce(
          (s: number, n) => s + n,
          0,
        );
        return sum + electronsInGroup * g.energy;
      }, 0);

  const pairsInField = filledGroups.reduce(
    (sum, g) => sum + g.occupation.filter((n) => n === 2).length,
    0,
  );
  const pairsFree = freeOcc.filter((n) => n === 2).length;
  const extraPairs = Math.max(0, pairsInField - pairsFree);

  return { columns, levels, connections, filledGroups, cfse, extraPairs };
}
