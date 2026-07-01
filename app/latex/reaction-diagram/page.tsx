import ReactionDiagramForm from "@/components/latex/ReactionDiagramForm";

export default function ReactionDiagramPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reaktionsenergiediagramm</h1>
        <p className="text-muted-foreground">
          Edukte, Übergangszustände und Produkte als glatte Kurve – mit
          Aktivierungsenergie und Reaktionsenthalpie als TikZ-Code
        </p>
      </div>
      <ReactionDiagramForm />
    </main>
  );
}
