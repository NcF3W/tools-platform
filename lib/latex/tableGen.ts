export type ColumnAlign = "S" | "l" | "c" | "r";

export interface TableColumn {
  header: string;
  unit?: string; // z.B. "\milli\gram" -> wird zu $[\unit{...}]$
  align: ColumnAlign;
  tableFormat?: string; // nur bei S, z.B. "4.2"
  separatorAfter?: boolean; // fügt "|" nach dieser Spalte ein
}

export interface GenerateTableOptions {
  columns: TableColumn[];
  rows: string[][];
  midruleAfterRows: boolean[]; // gleiche Länge wie rows
  caption?: string;
  label?: string;
  placement?: string;
}

export function generateLatexTable(opts: GenerateTableOptions): string {
  const {
    columns,
    rows,
    midruleAfterRows,
    caption,
    label,
    placement = "H",
  } = opts;

  const colTokens = columns.map((c) => {
    const base =
      c.align === "S" ? `S[table-format=${c.tableFormat || "1.0"}]` : c.align;
    return c.separatorAfter ? `${base}\n\t\t\t\t|` : base;
  });

  const headerCells = columns
    .map((c) => {
      const unitPart = c.unit ? ` $[\\unit{${c.unit}}]$` : "";
      return `{${c.header}${unitPart}}`;
    })
    .join(" & ");

  const bodyLines: string[] = [];
  rows.forEach((row, i) => {
    const cells = row.map((cell) => cell.trim()).join(" & ");
    bodyLines.push(`\t\t\t${cells} \\\\`);
    if (midruleAfterRows[i]) {
      bodyLines.push("\t\t\t\\midrule");
    }
  });

  const lines: string[] = [];
  lines.push(`\\begin{table}[${placement}]`);
  lines.push("\t\\centering");
  if (caption) lines.push(`\t\\caption{${caption}}`);
  if (label) lines.push(`\t\\label{${label}}`);
  lines.push("\t\\begin{tabular}{");
  lines.push(`\t\t\t\t${colTokens.join("\n\t\t\t\t")}`);
  lines.push("\t\t}");
  lines.push(`\t\t\t${headerCells} \\\\`);
  lines.push("\t\t\t\\midrule");
  lines.push(...bodyLines);
  lines.push("\t\\end{tabular}");
  lines.push("\\end{table}");

  return lines.join("\n");
}

export function parseDelimitedText(text: string): string[][] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
}
