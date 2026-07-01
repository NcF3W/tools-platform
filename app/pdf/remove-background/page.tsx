import RemoveBackgroundForm from "@/components/pdf/RemoveBackgroundForm";

export default function RemoveBackgroundPage() {
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PNG freistellen</h1>
        <p className="text-muted-foreground">
          Einfarbigen Hintergrund per Klick transparent machen
        </p>
      </div>
      <RemoveBackgroundForm />
    </main>
  );
}
