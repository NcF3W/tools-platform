import MergeForm from "@/components/pdf/MergeForm";

export default function MergePage() {
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PDFs zusammenführen</h1>
        <p className="text-muted-foreground">
          Mehrere PDFs in der gewünschten Reihenfolge zu einem PDF verbinden
        </p>
      </div>
      <MergeForm />
    </main>
  );
}
