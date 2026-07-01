import TableForm from "@/components/latex/TableForm";

export default function TablePage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LaTeX-Tabellengenerator</h1>
        <p className="text-muted-foreground">
          Daten einfügen, Spalten konfigurieren, fertigen booktabs/siunitx-Code
          kopieren
        </p>
      </div>
      <TableForm />
    </main>
  );
}
