import LigandFieldForm from "@/components/latex/LigandFieldForm";

export default function LigandFieldPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ligandenfeldaufspaltung</h1>
        <p className="text-muted-foreground">
          d-Orbitalaufspaltung für Oh/Td/D4h, Elektronenbesetzung und CFSE –
          als TikZ-Code
        </p>
      </div>
      <LigandFieldForm />
    </main>
  );
}
