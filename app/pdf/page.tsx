import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function PdfPage() {
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">PDF-Tools</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/pdf/split">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Poster aufteilen</CardTitle>
              <CardDescription>
                A1 → 4× A3 zum selbst Ausdrucken
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/pdf/convert">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>PNG → PDF</CardTitle>
              <CardDescription>Bilder in ein PDF umwandeln</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
