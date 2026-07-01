import ConvertForm from "@/components/pdf/ConvertForm";

export default function ConvertPage() {
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bilder → PDF</h1>
        <p className="text-muted-foreground">
          PNG oder JPG/JPEG in ein PDF umwandeln
        </p>
      </div>
      <ConvertForm />
    </main>
  );
}
