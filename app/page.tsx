import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Tools</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/pdf">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>PDF-Tools</CardTitle>
              <CardDescription>
                Teilen, konvertieren, zusammenführen
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/latex">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>LaTeX-Tools</CardTitle>
              <CardDescription>Tabellen, Vorlagen und mehr</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
