"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UnitDef } from "@/lib/chem/units";

export default function QuantityField({
  label,
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
  disabled,
}: {
  label: string;
  value: string;
  unit: string;
  units: UnitDef[];
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="decimal"
          className="w-32"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          placeholder="0"
        />
        <Select value={unit} onValueChange={onUnitChange}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
