import PotentialCurveForm from "@/components/latex/PotentialCurveForm";

export default function PotentialCurvePage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Potentialkurve (Morse-Potential)</h1>
        <p className="text-muted-foreground">
          Energie vs. Bindungsabstand für Bindungsdissoziation – als
          TikZ-Code
        </p>
      </div>
      <PotentialCurveForm />
    </main>
  );
}
