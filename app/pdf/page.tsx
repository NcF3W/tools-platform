import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Scissors,
  Image as ImageIcon,
  Combine,
  ListOrdered,
  FileImage,
  Wand2,
  PenLine,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function PdfPage() {
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">PDF-Tools</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/pdf/split">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Scissors className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Poster aufteilen</CardTitle>
              <CardDescription>
                A0/A1-Poster in A3/A4-Kacheln zum selbst Ausdrucken
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/pdf/merge">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Combine className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Zusammenführen</CardTitle>
              <CardDescription>Mehrere PDFs zu einem verbinden</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/pdf/pages">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <ListOrdered className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Seiten anordnen & löschen</CardTitle>
              <CardDescription>
                Reihenfolge ändern, einzelne Seiten entfernen
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/pdf/edit-text">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <PenLine className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Text bearbeiten</CardTitle>
              <CardDescription>
                Text löschen und neuen Text einfügen
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="space-y-4">
        <Separator />
        <h2 className="text-sm font-medium text-muted-foreground">
          Konvertieren
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/pdf/convert">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <ImageIcon className="w-6 h-6 mb-2 text-primary" />
                <CardTitle>Bilder → PDF</CardTitle>
                <CardDescription>
                  PNG oder JPG/JPEG in ein PDF umwandeln
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/pdf/to-images">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <FileImage className="w-6 h-6 mb-2 text-primary" />
                <CardTitle>PDF → PNG</CardTitle>
                <CardDescription>Seiten als Bilder exportieren</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/pdf/remove-background">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <Wand2 className="w-6 h-6 mb-2 text-primary" />
                <CardTitle>PNG freistellen</CardTitle>
                <CardDescription>
                  Einfarbigen Hintergrund per Klick transparent machen
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
