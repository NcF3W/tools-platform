import EditTextForm from "@/components/pdf/EditTextForm";

export default function EditTextPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Text in PDF bearbeiten</h1>
        <p className="text-muted-foreground">
          Vorhandenen Text löschen und neuen Text einfügen
        </p>
      </div>
      <EditTextForm />
    </main>
  );
}
