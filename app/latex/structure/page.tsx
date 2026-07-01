import StructureFormLoader from "@/components/chem/StructureFormLoader";

export default function StructurePage() {
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Strukturformel aus SMILES</h1>
        <p className="text-muted-foreground">
          SMILES-Code eingeben, Strukturformel als Bild generieren
        </p>
      </div>
      <StructureFormLoader />
    </main>
  );
}
