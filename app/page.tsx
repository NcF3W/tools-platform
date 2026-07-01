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

      <Link href="/pdf">
        <Card className="max-w-sm hover:border-primary transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle>PDF-Tools</CardTitle>
            <CardDescription>
              Teilen, konvertieren, zusammenführen
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </main>
  );
}
