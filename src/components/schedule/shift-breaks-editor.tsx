"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export type BreakItem = {
  id?: string;
  label: string;
  duration_minutes: number;
  is_paid: boolean;
};

type ShiftBreaksEditorProps = {
  value: BreakItem[];
  onChange: (breaks: BreakItem[]) => void;
};

const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

export function ShiftBreaksEditor({ value, onChange }: ShiftBreaksEditorProps) {
  function addBreak() {
    onChange([
      ...value,
      { label: "Break", duration_minutes: 30, is_paid: false },
    ]);
  }

  function removeBreak(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateBreak(index: number, updates: Partial<BreakItem>) {
    onChange(value.map((b, i) => (i === index ? { ...b, ...updates } : b)));
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Breaks</div>
      {value.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={b.label}
            onChange={(e) => updateBreak(i, { label: e.target.value })}
            className="flex-1 h-8 text-sm"
            placeholder="Break name"
          />
          <Select
            value={String(b.duration_minutes)}
            onValueChange={(v) =>
              updateBreak(i, { duration_minutes: parseInt(v) })
            }
          >
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge
            variant={b.is_paid ? "default" : "secondary"}
            className="cursor-pointer select-none text-xs shrink-0"
            onClick={() => updateBreak(i, { is_paid: !b.is_paid })}
          >
            {b.is_paid ? "Paid" : "Unpaid"}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => removeBreak(i)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addBreak}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Break
      </Button>
    </div>
  );
}
