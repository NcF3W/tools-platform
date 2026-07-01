import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FlaskConical, TrendingUp, Waves, Zap } from "lucide-react";

export default function ChemiePage() {
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Chemie-Tools</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/latex/structure">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <FlaskConical className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Strukturformel</CardTitle>
              <CardDescription>
                SMILES-Code zu Strukturformel (Bild + chemfig-Code)
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/latex/energy-diagram">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Zap className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Energieniveau-Diagramm</CardTitle>
              <CardDescription>
                MO-Schemas, Bänderdiagramme als TikZ
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/latex/reaction-diagram">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <TrendingUp className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Reaktionsenergiediagramm</CardTitle>
              <CardDescription>
                Edukte → Übergangszustand → Produkte, mit Ea und ΔH
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/latex/potential-curve">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <Waves className="w-6 h-6 mb-2 text-primary" />
              <CardTitle>Potentialkurve (Morse)</CardTitle>
              <CardDescription>
                Energie vs. Bindungsabstand, Bindungsdissoziation
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
