"use client";

import { useState } from "react";
import { useShopStore } from "@/stores/shop-store";
import { requestTimeOff } from "@/actions/time-off";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RequestTimeOffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const result = await requestTimeOff({
      shop_id: shopId,
      start_date: startDate,
      end_date: endDate,
      hours_requested: parseFloat(hours),
      reason: reason || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["time-off-requests", shopId] });
    await queryClient.invalidateQueries({ queryKey: ["pto-balance"] });
    setStartDate("");
    setEndDate("");
    setHours("");
    setReason("");
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>
            Submit a time off request for your manager to review.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours-requested">Hours requested</Label>
            <Input
              id="hours-requested"
              type="number"
              step="0.5"
              min="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Doctor appointment"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
