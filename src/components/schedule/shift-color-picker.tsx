"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Paintbrush } from "lucide-react";
import { useState } from "react";

const COLORS = [
  "#EF4444", // red-500
  "#F97316", // orange-500
  "#F59E0B", // amber-500
  "#EAB308", // yellow-500
  "#84CC16", // lime-500
  "#22C55E", // green-500
  "#14B8A6", // teal-500
  "#06B6D4", // cyan-500
  "#3B82F6", // blue-500
  "#6366F1", // indigo-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
];

type ShiftColorPickerProps = {
  value: string | null;
  onChange: (color: string | null) => void;
};

export function ShiftColorPicker({ value, onChange }: ShiftColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
        >
          {value ? (
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: value }}
            />
          ) : (
            <Paintbrush className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs text-muted-foreground",
              value === null
                ? "border-foreground ring-2 ring-foreground/20"
                : "border-muted"
            )}
          >
            ×
          </button>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all",
                value === c
                  ? "border-foreground ring-2 ring-foreground/20 scale-110"
                  : "border-transparent hover:scale-110"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
