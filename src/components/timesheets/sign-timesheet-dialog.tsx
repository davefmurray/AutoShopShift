"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShopStore } from "@/stores/shop-store";
import { signTimesheet } from "@/actions/timesheets";
import type { TimesheetSummary } from "@/types/timesheets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  periodStart: string;
  periodEnd: string;
  summary: TimesheetSummary;
  children: React.ReactNode;
};

function formatHours(h: number): string {
  if (h === 0) return "0h";
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function SignTimesheetDialog({
  periodStart,
  periodEnd,
  summary,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

  async function handleSign() {
    if (!shopId || !typedName.trim()) return;
    setSubmitting(true);
    setError(null);

    const result = await signTimesheet({
      shop_id: shopId,
      period_start: periodStart,
      period_end: periodEnd,
      signature_data: typedName.trim(),
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as string;
        return (
          key === "timesheet-signature" || key === "team-signatures"
        );
      },
    });

    setTypedName("");
    setSubmitting(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign Timesheet</DialogTitle>
          <DialogDescription>
            Review period: {periodStart} to {periodEnd}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 rounded-md border p-3 text-sm">
            <div>
              <p className="text-muted-foreground">Worked</p>
              <p className="font-medium">{formatHours(summary.worked_hours)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Overtime</p>
              <p className="font-medium">
                {formatHours(summary.overtime_hours)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Off</p>
              <p className="font-medium">
                {formatHours(summary.time_off_hours)}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            By typing your name below, you confirm these hours are accurate.
          </p>

          <div className="space-y-2">
            <Label htmlFor="signature-name">Full Name</Label>
            <Input
              id="signature-name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full name"
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={submitting || !typedName.trim()}
          >
            {submitting ? "Signing..." : "Sign Timesheet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
