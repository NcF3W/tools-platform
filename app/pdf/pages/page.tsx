import PagesForm from "@/components/pdf/PagesForm";

export default function PagesPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Seiten anordnen & löschen</h1>
        <p className="text-muted-foreground">
          Reihenfolge ändern oder einzelne Seiten aus einem PDF entfernen
        </p>
      </div>
      <PagesForm />
    </main>
  );
}
