import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function LatexPage() {
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">LaTeX-Tools</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/latex/table">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Tabellengenerator</CardTitle>
              <CardDescription>
                Daten rein, fertiger booktabs-Code raus
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
