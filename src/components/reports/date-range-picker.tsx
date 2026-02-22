"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  format,
} from "date-fns";
import { useState } from "react";

type Preset = "this-week" | "last-week" | "this-month" | "last-month" | "custom";

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
}: {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}) {
  const [preset, setPreset] = useState<Preset>("this-week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (p) {
      case "this-week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "last-week":
        start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case "this-month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last-month":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case "custom":
        return;
    }

    onRangeChange(start.toISOString(), end.toISOString());
  }

  function applyCustom() {
    if (customStart && customEnd) {
      onRangeChange(
        new Date(customStart).toISOString(),
        new Date(customEnd + "T23:59:59").toISOString()
      );
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {(
        [
          ["this-week", "This Week"],
          ["last-week", "Last Week"],
          ["this-month", "This Month"],
          ["last-month", "Last Month"],
          ["custom", "Custom"],
        ] as [Preset, string][]
      ).map(([value, label]) => (
        <Button
          key={value}
          variant={preset === value ? "default" : "outline"}
          size="sm"
          onClick={() => applyPreset(value)}
        >
          {label}
        </Button>
      ))}

      {preset === "custom" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <Button size="sm" onClick={applyCustom}>
            Apply
          </Button>
        </>
      )}

      {startDate && endDate && (
        <span className="text-sm text-muted-foreground ml-2">
          {format(new Date(startDate), "MMM d")} &ndash;{" "}
          {format(new Date(endDate), "MMM d, yyyy")}
        </span>
      )}
    </div>
  );
}
