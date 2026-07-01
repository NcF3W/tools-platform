import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table2, FlaskConical } from "lucide-react";

export default function LatexPage() {
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">LaTeX-Tools</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/latex/table">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Table2 className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Tabellengenerator</CardTitle>
              <CardDescription>
                Daten rein, fertiger booktabs-Code raus
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/latex/structure">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <FlaskConical className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Strukturformel</CardTitle>
              <CardDescription>SMILES-Code zu Strukturformel</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
