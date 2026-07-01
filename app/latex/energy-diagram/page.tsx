import EnergyDiagramForm from "@/components/latex/EnergyDiagramForm";

export default function EnergyDiagramPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Energieniveau-Diagramm</h1>
        <p className="text-muted-foreground">
          MO-Schemas, Bänderdiagramme, Ligandenfeldaufspaltung – als TikZ-Code
        </p>
      </div>
      <EnergyDiagramForm />
    </main>
  );
}
