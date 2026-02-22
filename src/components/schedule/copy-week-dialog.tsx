"use client";

import { useState } from "react";
import { format, addWeeks, endOfWeek } from "date-fns";
import { copyWeekForward } from "@/actions/shifts";
import { useShopStore } from "@/stores/shop-store";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

type CopyWeekDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  currentShiftCount: number;
};

export function CopyWeekDialog({
  open,
  onOpenChange,
  weekStart,
  currentShiftCount,
}: CopyWeekDialogProps) {
  const [weeksCount, setWeeksCount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

  const weeks = parseInt(weeksCount, 10);
  const totalShifts = currentShiftCount * weeks;
  const firstTargetStart = addWeeks(weekStart, 1);
  const lastTargetEnd = endOfWeek(addWeeks(weekStart, weeks), {
    weekStartsOn: 0,
  });

  const weekRange = `${format(weekStart, "MMM d")} – ${format(
    endOfWeek(weekStart, { weekStartsOn: 0 }),
    "MMM d, yyyy"
  )}`;

  async function handleSubmit() {
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const result = await copyWeekForward({
      shop_id: shopId,
      source_week_start: weekStart.toISOString(),
      weeks_count: weeks,
    });

    setLoading(false);

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    onOpenChange(false);
    setWeeksCount("1");
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Copy This Week&apos;s Schedule</DialogTitle>
          <DialogDescription>
            Duplicate all {currentShiftCount} shift
            {currentShiftCount !== 1 ? "s" : ""} from {weekRange} to future
            weeks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="weeks-count">Number of weeks to copy</Label>
            <Select value={weeksCount} onValueChange={setWeeksCount}>
              <SelectTrigger id="weeks-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1} week{i > 0 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            This will create {totalShifts} shift{totalShifts !== 1 ? "s" : ""}{" "}
            from {format(firstTargetStart, "MMM d")} through{" "}
            {format(lastTargetEnd, "MMM d, yyyy")}.
          </p>

          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Target weeks that already have shifts will keep them. Copies are
              added alongside existing shifts.
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copying...
              </>
            ) : (
              `Copy ${totalShifts} Shift${totalShifts !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
