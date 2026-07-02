import UnitConverterForm from "@/components/chem/UnitConverterForm";

export default function EinheitenPage() {
  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chemische Einheiten umrechnen</h1>
        <p className="text-muted-foreground">
          Stoffmenge, Masse, Volumen, Dichte und Konzentration ineinander
          umrechnen
        </p>
      </div>
      <UnitConverterForm />
    </main>
  );
}
