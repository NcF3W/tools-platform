"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QuantityField from "@/components/chem/QuantityField";
import {
  AMOUNT_UNITS,
  MASS_UNITS,
  VOLUME_UNITS,
  DENSITY_UNITS,
  CONCENTRATION_UNITS,
  toBase,
  fromBase,
  parseNum,
  formatNum,
} from "@/lib/chem/units";

export default function UnitConverterForm() {
  return (
    <div className="space-y-10">
      <ReinstoffRechner />
      <LoesungRechner />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stoffmenge <-> Masse <-> Volumen für einen Reinstoff (verknüpft über M & ρ)
// ---------------------------------------------------------------------------

function ReinstoffRechner() {
  const [molarMass, setMolarMass] = useState(""); // g/mol
  const [density, setDensity] = useState(""); // in densityUnit
  const [densityUnit, setDensityUnit] = useState("g_mL");

  const [n, setN] = useState("");
  const [nUnit, setNUnit] = useState("mmol");
  const [m, setM] = useState("");
  const [mUnit, setMUnit] = useState("g");
  const [v, setV] = useState("");
  const [vUnit, setVUnit] = useState("mL");

  function densityBase(): number | null {
    const rho = parseNum(density);
    if (rho === null || rho <= 0) return null;
    return toBase(rho, densityUnit, DENSITY_UNITS);
  }

  function propagateFromMass(mBase: number, M: number | null, rhoBase: number | null) {
    if (M !== null && M > 0) {
      setN(formatNum(fromBase(mBase / M, nUnit, AMOUNT_UNITS)));
    }
    if (rhoBase !== null) {
      setV(formatNum(fromBase(mBase / rhoBase, vUnit, VOLUME_UNITS)));
    }
  }

  function handleNChange(text: string) {
    setN(text);
    const num = parseNum(text);
    if (num === null) return;
    const M = parseNum(molarMass);
    if (M === null || M <= 0) return;
    const nBase = toBase(num, nUnit, AMOUNT_UNITS);
    const mBase = nBase * M;
    setM(formatNum(fromBase(mBase, mUnit, MASS_UNITS)));
    const rhoBase = densityBase();
    if (rhoBase !== null) {
      setV(formatNum(fromBase(mBase / rhoBase, vUnit, VOLUME_UNITS)));
    }
  }

  function handleMChange(text: string) {
    setM(text);
    const num = parseNum(text);
    if (num === null) return;
    const mBase = toBase(num, mUnit, MASS_UNITS);
    const M = parseNum(molarMass);
    propagateFromMass(mBase, M, densityBase());
  }

  function handleVChange(text: string) {
    setV(text);
    const num = parseNum(text);
    if (num === null) return;
    const rhoBase = densityBase();
    if (rhoBase === null) return;
    const vBase = toBase(num, vUnit, VOLUME_UNITS);
    const mBase = vBase * rhoBase;
    setM(formatNum(fromBase(mBase, mUnit, MASS_UNITS)));
    const M = parseNum(molarMass);
    if (M !== null && M > 0) {
      setN(formatNum(fromBase(mBase / M, nUnit, AMOUNT_UNITS)));
    }
  }

  function handleMolarMassChange(text: string) {
    setMolarMass(text);
    const M = parseNum(text);
    if (M === null || M <= 0) return;
    // Bevorzugt von n aus neu rechnen, sonst von m, sonst von V (falls ρ bekannt)
    const nNum = parseNum(n);
    const mNum = parseNum(m);
    const vNum = parseNum(v);
    const rhoBase = densityBase();
    if (nNum !== null) {
      const mBase = toBase(nNum, nUnit, AMOUNT_UNITS) * M;
      setM(formatNum(fromBase(mBase, mUnit, MASS_UNITS)));
      if (rhoBase !== null) setV(formatNum(fromBase(mBase / rhoBase, vUnit, VOLUME_UNITS)));
    } else if (mNum !== null) {
      const mBase = toBase(mNum, mUnit, MASS_UNITS);
      setN(formatNum(fromBase(mBase / M, nUnit, AMOUNT_UNITS)));
    } else if (vNum !== null && rhoBase !== null) {
      const mBase = toBase(vNum, vUnit, VOLUME_UNITS) * rhoBase;
      setN(formatNum(fromBase(mBase / M, nUnit, AMOUNT_UNITS)));
    }
  }

  function handleDensityChange(text: string, unit = densityUnit) {
    setDensity(text);
    const rho = parseNum(text);
    if (rho === null || rho <= 0) return;
    const rhoBase = toBase(rho, unit, DENSITY_UNITS);
    const mNum = parseNum(m);
    const vNum = parseNum(v);
    if (mNum !== null) {
      const mBase = toBase(mNum, mUnit, MASS_UNITS);
      setV(formatNum(fromBase(mBase / rhoBase, vUnit, VOLUME_UNITS)));
    } else if (vNum !== null) {
      const mBase = toBase(vNum, vUnit, VOLUME_UNITS) * rhoBase;
      setM(formatNum(fromBase(mBase, mUnit, MASS_UNITS)));
      const M = parseNum(molarMass);
      if (M !== null && M > 0) setN(formatNum(fromBase(mBase / M, nUnit, AMOUNT_UNITS)));
    }
  }

  function reformat(text: string, oldUnit: string, newUnit: string, units: typeof AMOUNT_UNITS) {
    const num = parseNum(text);
    if (num === null) return text;
    return formatNum(fromBase(toBase(num, oldUnit, units), newUnit, units));
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Stoffmenge ⇄ Masse ⇄ Volumen</h2>
        <p className="text-sm text-muted-foreground">
          Für einen Reinstoff. Molare Masse verknüpft Stoffmenge und Masse,
          Dichte verknüpft Masse und Volumen.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 border rounded-md p-3">
        <div className="space-y-1">
          <Label className="text-xs">Molare Masse M</Label>
          <div className="flex items-center gap-1">
            <Input
              type="text"
              inputMode="decimal"
              className="w-28"
              value={molarMass}
              onChange={(e) => handleMolarMassChange(e.target.value)}
              placeholder="z.B. 58.44"
            />
            <span className="text-sm text-muted-foreground">g/mol</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Dichte ρ</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="decimal"
              className="w-24"
              value={density}
              onChange={(e) => handleDensityChange(e.target.value)}
              placeholder="z.B. 1.0"
            />
            <Select
              value={densityUnit}
              onValueChange={(u) => {
                setDensityUnit(u);
                handleDensityChange(density, u);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DENSITY_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 border rounded-md p-3">
        <QuantityField
          label="Stoffmenge n"
          value={n}
          unit={nUnit}
          units={AMOUNT_UNITS}
          onValueChange={handleNChange}
          onUnitChange={(u) => {
            setN((prev) => reformat(prev, nUnit, u, AMOUNT_UNITS));
            setNUnit(u);
          }}
        />
        <QuantityField
          label="Masse m"
          value={m}
          unit={mUnit}
          units={MASS_UNITS}
          onValueChange={handleMChange}
          onUnitChange={(u) => {
            setM((prev) => reformat(prev, mUnit, u, MASS_UNITS));
            setMUnit(u);
          }}
        />
        <QuantityField
          label="Volumen V"
          value={v}
          unit={vUnit}
          units={VOLUME_UNITS}
          onValueChange={handleVChange}
          onUnitChange={(u) => {
            setV((prev) => reformat(prev, vUnit, u, VOLUME_UNITS));
            setVUnit(u);
          }}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Konzentration einer Lösung: c = n / V, optional Masse des gelösten Stoffs
// ---------------------------------------------------------------------------

function LoesungRechner() {
  const [molarMass, setMolarMass] = useState(""); // g/mol, nur für Massenanzeige

  const [n, setN] = useState("");
  const [nUnit, setNUnit] = useState("mmol");
  const [v, setV] = useState("");
  const [vUnit, setVUnit] = useState("mL");
  const [c, setC] = useState("");
  const [cUnit, setCUnit] = useState("mol_L");
  const [massUnit, setMassUnit] = useState("g");

  function handleNChange(text: string) {
    setN(text);
    const nNum = parseNum(text);
    const vNum = parseNum(v);
    if (nNum === null || vNum === null) return;
    const vBase = toBase(vNum, vUnit, VOLUME_UNITS);
    if (vBase <= 0) return;
    const nBase = toBase(nNum, nUnit, AMOUNT_UNITS);
    setC(formatNum(fromBase(nBase / vBase, cUnit, CONCENTRATION_UNITS)));
  }

  function handleVChange(text: string) {
    setV(text);
    const vNum = parseNum(text);
    const nNum = parseNum(n);
    if (vNum === null || nNum === null || vNum === 0) return;
    const vBase = toBase(vNum, vUnit, VOLUME_UNITS);
    const nBase = toBase(nNum, nUnit, AMOUNT_UNITS);
    setC(formatNum(fromBase(nBase / vBase, cUnit, CONCENTRATION_UNITS)));
  }

  function handleCChange(text: string) {
    setC(text);
    const cNum = parseNum(text);
    if (cNum === null) return;
    const cBase = toBase(cNum, cUnit, CONCENTRATION_UNITS);
    if (cBase <= 0) return;
    const nNum = parseNum(n);
    const vNum = parseNum(v);
    if (nNum !== null) {
      const nBase = toBase(nNum, nUnit, AMOUNT_UNITS);
      setV(formatNum(fromBase(nBase / cBase, vUnit, VOLUME_UNITS)));
    } else if (vNum !== null) {
      const vBase = toBase(vNum, vUnit, VOLUME_UNITS);
      setN(formatNum(fromBase(cBase * vBase, nUnit, AMOUNT_UNITS)));
    }
  }

  function reformat(text: string, oldUnit: string, newUnit: string, units: typeof AMOUNT_UNITS) {
    const num = parseNum(text);
    if (num === null) return text;
    return formatNum(fromBase(toBase(num, oldUnit, units), newUnit, units));
  }

  const nNum = parseNum(n);
  const M = parseNum(molarMass);
  const massSolute =
    nNum !== null && M !== null && M > 0
      ? fromBase(toBase(nNum, nUnit, AMOUNT_UNITS) * M, massUnit, MASS_UNITS)
      : null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Konzentration einer Lösung</h2>
        <p className="text-sm text-muted-foreground">
          c = n / V. Stoffmenge und Volumen der Lösung eingeben, um die
          Konzentration zu erhalten – oder umgekehrt.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 border rounded-md p-3">
        <QuantityField
          label="Stoffmenge n"
          value={n}
          unit={nUnit}
          units={AMOUNT_UNITS}
          onValueChange={handleNChange}
          onUnitChange={(u) => {
            setN((prev) => reformat(prev, nUnit, u, AMOUNT_UNITS));
            setNUnit(u);
          }}
        />
        <QuantityField
          label="Volumen V (Lösung)"
          value={v}
          unit={vUnit}
          units={VOLUME_UNITS}
          onValueChange={handleVChange}
          onUnitChange={(u) => {
            setV((prev) => reformat(prev, vUnit, u, VOLUME_UNITS));
            setVUnit(u);
          }}
        />
        <QuantityField
          label="Konzentration c"
          value={c}
          unit={cUnit}
          units={CONCENTRATION_UNITS}
          onValueChange={handleCChange}
          onUnitChange={(u) => {
            setC((prev) => reformat(prev, cUnit, u, CONCENTRATION_UNITS));
            setCUnit(u);
          }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4 border rounded-md p-3">
        <div className="space-y-1">
          <Label className="text-xs">Molare Masse M (optional)</Label>
          <div className="flex items-center gap-1">
            <Input
              type="text"
              inputMode="decimal"
              className="w-28"
              value={molarMass}
              onChange={(e) => setMolarMass(e.target.value)}
              placeholder="z.B. 58.44"
            />
            <span className="text-sm text-muted-foreground">g/mol</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Masse gelöster Stoff (berechnet)</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              className="w-28"
              value={massSolute !== null ? formatNum(massSolute) : ""}
              readOnly
              placeholder="—"
            />
            <Select value={massUnit} onValueChange={setMassUnit}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MASS_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}
