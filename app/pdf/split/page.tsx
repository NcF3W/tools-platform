import SplitForm from "@/components/pdf/SplitForm";

export default function SplitPage() {
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Poster aufteilen</h1>
        <p className="text-muted-foreground">
          Großformat (z. B. A0 oder A1) auf A3/A4-Kacheln zum selbst
          Ausdrucken
        </p>
      </div>
      <SplitForm />
    </main>
  );
}
