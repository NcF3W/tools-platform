import { NextRequest, NextResponse } from "next/server";

const CAS_PATTERN = /^\d{2,7}-\d{2}-\d$/;

export async function GET(request: NextRequest) {
  const cas = request.nextUrl.searchParams.get("cas")?.trim() ?? "";

  if (!CAS_PATTERN.test(cas)) {
    return NextResponse.json(
      { error: "Ungültiges CAS-Nummer-Format (erwartet z. B. 64-17-5)." },
      { status: 400 },
    );
  }

  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
    cas,
  )}/property/SMILES,IUPACName,MolecularFormula/JSON`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (err) {
    console.error("PubChem-Anfrage fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "PubChem ist gerade nicht erreichbar." },
      { status: 502 },
    );
  }

  if (res.status === 404) {
    return NextResponse.json(
      { error: `Keine Verbindung mit CAS-Nummer ${cas} in PubChem gefunden.` },
      { status: 404 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "Fehler bei der Abfrage von PubChem." },
      { status: 502 },
    );
  }

  const data = await res.json();
  const props = data?.PropertyTable?.Properties?.[0];

  if (!props?.SMILES) {
    return NextResponse.json(
      { error: `Keine Struktur zu CAS-Nummer ${cas} gefunden.` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    smiles: props.SMILES as string,
    name: (props.IUPACName as string | undefined) ?? null,
    formula: (props.MolecularFormula as string | undefined) ?? null,
  });
}