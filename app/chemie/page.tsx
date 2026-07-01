import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ChemiePage() {
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Chemie-Tools</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/latex/structure">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Strukturformel</CardTitle>
              <CardDescription>
                SMILES-Code zu Strukturformel (Bild + chemfig-Code)
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
