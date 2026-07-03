// Bekannte Elementsymbole zur Validierung geparster Summenformel-Token.
const ELEMENT_SYMBOLS = new Set([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
  "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
  "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
  "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn",
  "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd",
  "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb",
  "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
  "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th",
  "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm",
  "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds",
  "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og",
]);

type ElementCounts = Record<string, number>;

function parseFormula(formula: string): ElementCounts | null {
  const trimmed = formula.trim().replace(/\s+/g, "");
  if (!trimmed) return null;

  let i = 0;

  function parseGroup(): ElementCounts {
    const counts: ElementCounts = {};
    while (i < trimmed.length && trimmed[i] !== ")") {
      if (trimmed[i] === "(") {
        i++;
        const inner = parseGroup();
        if (trimmed[i] !== ")") throw new Error("Klammer nicht geschlossen");
        i++;
        const numMatch = /^\d+/.exec(trimmed.slice(i));
        const mult = numMatch ? parseInt(numMatch[0], 10) : 1;
        if (numMatch) i += numMatch[0].length;
        for (const [el, c] of Object.entries(inner)) {
          counts[el] = (counts[el] ?? 0) + c * mult;
        }
      } else {
        const elMatch = /^[A-Z][a-z]?/.exec(trimmed.slice(i));
        if (!elMatch || !ELEMENT_SYMBOLS.has(elMatch[0])) {
          throw new Error("Unbekanntes Element");
        }
        const el = elMatch[0];
        i += el.length;
        const numMatch = /^\d+/.exec(trimmed.slice(i));
        const count = numMatch ? parseInt(numMatch[0], 10) : 1;
        if (numMatch) i += numMatch[0].length;
        counts[el] = (counts[el] ?? 0) + count;
      }
    }
    return counts;
  }

  try {
    const result = parseGroup();
    if (i !== trimmed.length) return null;
    if (Object.keys(result).length === 0) return null;
    return result;
  } catch {
    return null;
  }
}

// Hill-System: Kohlenstoff zuerst, dann Wasserstoff, sonst alphabetisch.
function hillKey(counts: ElementCounts): string {
  const hasCarbon = (counts["C"] ?? 0) > 0;
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  entries.sort(([a], [b]) => {
    if (hasCarbon) {
      if (a === "C" || b === "C") return a === "C" ? -1 : 1;
      if (a === "H" || b === "H") return a === "H" ? -1 : 1;
    }
    return a.localeCompare(b);
  });
  return entries.map(([el, n]) => `${el}${n > 1 ? n : ""}`).join("");
}

interface FormulaEntry {
  smiles: string;
  name: string;
  note?: string;
}

const STEM_NAMES = [
  "Meth", "Eth", "Prop", "But", "Pent", "Hex",
  "Hept", "Oct", "Non", "Dec", "Undec", "Dodec",
];

function carbonChain(count: number): string {
  return "C".repeat(count);
}

// Generiert die homologen Reihen (Alkane, Alkene, Alkine, Aldehyde,
// primäre Carbonsäuren) bis C12 als jeweils unverzweigte/endständige
// Standardstruktur. Summenformeln sind ab einer gewissen Kettenlänge nicht
// mehr eindeutig (Stellungs-/Kettenisomere, Ringschluss, isomere
// Carbonylverbindungen) - das wird über den `note`-Text transparent gemacht.
function buildHomologousSeries(): { formula: string; entry: FormulaEntry }[] {
  const entries: { formula: string; entry: FormulaEntry }[] = [];

  for (let n = 1; n <= 12; n++) {
    const stem = STEM_NAMES[n - 1];

    // Alkan: CnH(2n+2)
    entries.push({
      formula: `C${n}H${2 * n + 2}`,
      entry: {
        smiles: carbonChain(n),
        name: `${stem}an`,
        note:
          n >= 4
            ? `C${n}H${2 * n + 2} ist nicht eindeutig - ab dieser Kettenlänge gibt es auch verzweigte Alkane (z. B. Isobutan bei C4H10). Angezeigt: n-${stem}an.`
            : undefined,
      },
    });

    // Aldehyd: CnH2nO, endständige Carbonylgruppe
    const aldehydeName =
      n === 1 ? "Methanal (Formaldehyd)" : n === 2 ? "Ethanal (Acetaldehyd)" : `${stem}anal`;
    entries.push({
      formula: `C${n}H${2 * n}O`,
      entry: {
        smiles: `${carbonChain(n - 1)}C=O`,
        name: aldehydeName,
        note:
          n >= 3
            ? `C${n}H${2 * n}O ist nicht eindeutig - es gibt auch das isomere Keton ${stem}an-2-on. Angezeigt: ${aldehydeName}.`
            : undefined,
      },
    });

    // Primäre Carbonsäure: CnH2nO2, unverzweigte Kette
    const acidName =
      n === 1 ? "Methansäure (Ameisensäure)" : n === 2 ? "Essigsäure (Ethansäure)" : `${stem}ansäure`;
    entries.push({
      formula: `C${n}H${2 * n}O2`,
      entry: {
        smiles: `${carbonChain(n - 1)}C(=O)O`,
        name: acidName,
        note:
          n >= 4
            ? `C${n}H${2 * n}O2 ist nicht eindeutig - ab dieser Kettenlänge gibt es auch verzweigte Carbonsäuren (z. B. Isobuttersäure bei C4H8O2). Angezeigt: n-${acidName}.`
            : undefined,
      },
    });

    if (n >= 2) {
      // Alken: CnH2n, endständige Doppelbindung
      const alkeneName = n === 2 ? "Ethen (Ethylen)" : n === 3 ? "Propen" : `${stem}-1-en`;
      entries.push({
        formula: `C${n}H${2 * n}`,
        entry: {
          smiles: `C=C${carbonChain(n - 2)}`,
          name: alkeneName,
          note:
            n >= 3
              ? `C${n}H${2 * n} ist nicht eindeutig - es gibt z. B. Stellungsisomere und das entsprechende Cycloalkan (z. B. Cyclopropan bei C3H6). Angezeigt: ${alkeneName}.`
              : undefined,
        },
      });

      // Alkin: CnH(2n-2), endständige Dreifachbindung
      const alkyneName = n === 2 ? "Ethin (Acetylen)" : n === 3 ? "Propin" : `${stem}-1-in`;
      entries.push({
        formula: `C${n}H${2 * n - 2}`,
        entry: {
          smiles: `C#C${carbonChain(n - 2)}`,
          name: alkyneName,
          note:
            n >= 3
              ? `C${n}H${2 * n - 2} ist nicht eindeutig - es gibt z. B. Stellungsisomere, Diene und Cycloalkene mit gleicher Formel. Angezeigt: ${alkyneName}.`
              : undefined,
        },
      });
    }
  }

  return entries;
}

// Kleine, kuratierte Auswahl gängiger einfacher Moleküle. Summenformeln sind
// nicht eindeutig (mehrere Isomere möglich) - hier wird jeweils die
// gebräuchlichste Verbindung hinterlegt, bei bekannten Mehrdeutigkeiten mit
// Hinweis.
const FORMULA_DB: { formula: string; entry: FormulaEntry }[] = [
  { formula: "H2", entry: { smiles: "[HH]", name: "Wasserstoff" } },
  { formula: "O2", entry: { smiles: "O=O", name: "Sauerstoff" } },
  { formula: "N2", entry: { smiles: "N#N", name: "Stickstoff" } },
  { formula: "Cl2", entry: { smiles: "ClCl", name: "Chlor" } },
  { formula: "F2", entry: { smiles: "FF", name: "Fluor" } },
  { formula: "Br2", entry: { smiles: "BrBr", name: "Brom" } },
  { formula: "I2", entry: { smiles: "II", name: "Iod" } },
  { formula: "H2O", entry: { smiles: "O", name: "Wasser" } },
  { formula: "H2O2", entry: { smiles: "OO", name: "Wasserstoffperoxid" } },
  { formula: "CO2", entry: { smiles: "O=C=O", name: "Kohlenstoffdioxid" } },
  { formula: "CO", entry: { smiles: "[C-]#[O+]", name: "Kohlenstoffmonoxid" } },
  { formula: "NH3", entry: { smiles: "N", name: "Ammoniak" } },
  { formula: "HCl", entry: { smiles: "Cl", name: "Chlorwasserstoff" } },
  { formula: "HF", entry: { smiles: "F", name: "Fluorwasserstoff" } },
  { formula: "HBr", entry: { smiles: "Br", name: "Bromwasserstoff" } },
  { formula: "HI", entry: { smiles: "I", name: "Iodwasserstoff" } },
  { formula: "H2S", entry: { smiles: "S", name: "Schwefelwasserstoff" } },
  { formula: "SO2", entry: { smiles: "O=S=O", name: "Schwefeldioxid" } },
  { formula: "SO3", entry: { smiles: "O=S(=O)=O", name: "Schwefeltrioxid" } },
  { formula: "H2SO4", entry: { smiles: "OS(=O)(=O)=O", name: "Schwefelsäure" } },
  { formula: "HNO3", entry: { smiles: "O[N+](=O)[O-]", name: "Salpetersäure" } },
  { formula: "H3PO4", entry: { smiles: "OP(=O)(O)=O", name: "Phosphorsäure" } },
  { formula: "NaOH", entry: { smiles: "[Na+].[OH-]", name: "Natriumhydroxid" } },
  { formula: "KOH", entry: { smiles: "[K+].[OH-]", name: "Kaliumhydroxid" } },
  { formula: "NaCl", entry: { smiles: "[Na+].[Cl-]", name: "Natriumchlorid (Kochsalz)" } },
  {
    formula: "NaHCO3",
    entry: { smiles: "[Na+].OC(=O)[O-]", name: "Natriumhydrogencarbonat (Natron)" },
  },
  {
    formula: "CaCO3",
    entry: { smiles: "[Ca+2].[O-]C(=O)[O-]", name: "Calciumcarbonat" },
  },
  { formula: "CaO", entry: { smiles: "[Ca+2].[O-2]", name: "Calciumoxid (gebrannter Kalk)" } },
  {
    formula: "Ca(OH)2",
    entry: { smiles: "[Ca+2].[OH-].[OH-]", name: "Calciumhydroxid (Löschkalk)" },
  },
  { formula: "NH4Cl", entry: { smiles: "[NH4+].[Cl-]", name: "Ammoniumchlorid" } },
  { formula: "CH4O", entry: { smiles: "CO", name: "Methanol" } },
  {
    formula: "C2H6O",
    entry: {
      smiles: "CCO",
      name: "Ethanol",
      note: "C2H6O ist nicht eindeutig - es gibt z. B. auch Dimethylether. Angezeigt: Ethanol.",
    },
  },
  { formula: "C6H6", entry: { smiles: "c1ccccc1", name: "Benzol" } },
  {
    formula: "C6H12O6",
    entry: {
      smiles: "OCC1OC(O)C(O)C(O)C1O",
      name: "Glucose",
      note: "C6H12O6 ist nicht eindeutig - es gibt z. B. auch Fructose. Angezeigt: Glucose.",
    },
  },
  {
    formula: "C3H8O",
    entry: {
      smiles: "CCCO",
      name: "1-Propanol",
      note: "C3H8O ist nicht eindeutig - es gibt z. B. auch 2-Propanol. Angezeigt: 1-Propanol.",
    },
  },
  ...buildHomologousSeries(),
];

const FORMULA_MAP: Map<string, FormulaEntry> = new Map();
for (const { formula, entry } of FORMULA_DB) {
  const counts = parseFormula(formula);
  if (!counts) throw new Error(`Interne Summenformel ungültig: ${formula}`);
  const key = hillKey(counts);
  if (FORMULA_MAP.has(key)) {
    throw new Error(`Doppelter Summenformel-Eintrag: ${key} (${formula})`);
  }
  FORMULA_MAP.set(key, entry);
}

export type FormulaLookupResult =
  | { smiles: string; name: string; note?: string }
  | { error: string };

export function lookupFormula(input: string): FormulaLookupResult {
  const counts = parseFormula(input);
  if (!counts) {
    return {
      error:
        "Konnte die Summenformel nicht lesen. Bitte im Format wie 'C2H6O' oder 'Ca(OH)2' eingeben.",
    };
  }
  const entry = FORMULA_MAP.get(hillKey(counts));
  if (!entry) {
    return {
      error:
        "Für diese Summenformel ist kein einfaches Molekül hinterlegt. Bitte SMILES oder CAS-Nummer verwenden.",
    };
  }
  return entry;
}