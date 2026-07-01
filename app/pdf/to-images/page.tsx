import ToImagesForm from "@/components/pdf/ToImagesForm";

export default function ToImagesPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PDF → PNG</h1>
        <p className="text-muted-foreground">
          Einzelne oder alle Seiten eines PDFs als Bilder exportieren
        </p>
      </div>
      <ToImagesForm />
    </main>
  );
}
