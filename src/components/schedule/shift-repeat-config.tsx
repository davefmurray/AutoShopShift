"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type RecurrenceConfig = {
  frequency: "weekly" | "biweekly";
  days: number[]; // 0=Sun, 1=Mon, ...
  endType: "never" | "on_date";
  endDate?: string;
};

type ShiftRepeatConfigProps = {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function ShiftRepeatConfig({ value, onChange }: ShiftRepeatConfigProps) {
  const enabled = value !== null;

  function toggle(on: boolean) {
    if (on) {
      onChange({
        frequency: "weekly",
        days: [],
        endType: "never",
      });
    } else {
      onChange(null);
    }
  }

  function update(updates: Partial<RecurrenceConfig>) {
    if (!value) return;
    onChange({ ...value, ...updates });
  }

  function toggleDay(day: number) {
    if (!value) return;
    const days = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day].sort();
    update({ days });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Repeat shifts</Label>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      {enabled && value && (
        <div className="space-y-3">
          <Select
            value={value.frequency}
            onValueChange={(v) =>
              update({ frequency: v as "weekly" | "biweekly" })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Every Week</SelectItem>
              <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
            </SelectContent>
          </Select>

          <div>
            <div className="text-xs text-muted-foreground mb-1.5">
              Repeat on
            </div>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "h-8 w-8 rounded-full text-xs font-medium transition-colors",
                    value.days.includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={value.endType}
              onValueChange={(v) =>
                update({ endType: v as "never" | "on_date" })
              }
            >
              <SelectTrigger className="h-8 text-sm w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never ends</SelectItem>
                <SelectItem value="on_date">Ends on</SelectItem>
              </SelectContent>
            </Select>
            {value.endType === "on_date" && (
              <Input
                type="date"
                value={value.endDate ?? ""}
                onChange={(e) => update({ endDate: e.target.value })}
                className="h-8 text-sm flex-1"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
