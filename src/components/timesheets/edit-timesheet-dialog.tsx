"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useShopStore } from "@/stores/shop-store";
import { editTimesheetEntry, addTimesheetEntry } from "@/actions/timesheets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TimesheetDayRow } from "@/types/timesheets";

type EditTimesheetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: TimesheetDayRow;
  userId: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
};

function toLocalTime(isoString: string | null, tz: string): string {
  if (!isoString) return "";
  try {
    return format(new Date(isoString), "HH:mm");
  } catch {
    return "";
  }
}

export function EditTimesheetDialog({
  open,
  onOpenChange,
  row,
  userId,
  periodStart,
  periodEnd,
  timezone,
}: EditTimesheetDialogProps) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

  const isEdit = !!row.time_record_id;
  const dayLabel = format(new Date(row.day_date + "T00:00:00"), "EEEE, MMM d");

  const [clockInTime, setClockInTime] = useState(
    toLocalTime(row.clock_in, timezone) || "08:00"
  );
  const [clockOutTime, setClockOutTime] = useState(
    toLocalTime(row.clock_out, timezone) || "17:00"
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const clockIn = `${row.day_date}T${clockInTime}:00`;
    const clockOut = `${row.day_date}T${clockOutTime}:00`;

    const result = isEdit
      ? await editTimesheetEntry({
          shop_id: shopId,
          user_id: userId,
          time_record_id: row.time_record_id!,
          clock_in: clockIn,
          clock_out: clockOut,
          notes: notes || undefined,
          period_start: periodStart,
          period_end: periodEnd,
        })
      : await addTimesheetEntry({
          shop_id: shopId,
          user_id: userId,
          clock_in: clockIn,
          clock_out: clockOut,
          notes: notes || undefined,
          period_start: periodStart,
          period_end: periodEnd,
        });

    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["timesheet-breakdown"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["timesheet-signature"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["timesheet-activity-log"],
    });

    setLoading(false);
    setNotes("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Time Entry" : "Add Time Entry"} — {dayLabel}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && row.clock_in && (
            <p className="text-sm text-muted-foreground">
              Current: {format(new Date(row.clock_in), "h:mm a")}
              {row.clock_out
                ? ` – ${format(new Date(row.clock_out), "h:mm a")}`
                : ""}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Clock In</Label>
              <Input
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out</Label>
              <Input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for edit..."
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
