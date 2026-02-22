"use client";

import { useState } from "react";
import { useShopStore } from "@/stores/shop-store";
import { adjustPtoBalance } from "@/actions/time-off";
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

export function BalanceAdjustmentDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const adjustmentHours =
      mode === "add" ? parseFloat(hours) : -parseFloat(hours);

    const result = await adjustPtoBalance({
      shop_id: shopId,
      user_id: userId,
      hours: adjustmentHours,
      reason,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["pto-balance"] });
    await queryClient.invalidateQueries({ queryKey: ["team-pto-balances"] });
    await queryClient.invalidateQueries({ queryKey: ["pto-ledger"] });
    setHours("");
    setReason("");
    setMode("add");
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust PTO Balance</DialogTitle>
          <DialogDescription>
            Add or subtract PTO hours for {userName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("add")}
            >
              Add
            </Button>
            <Button
              type="button"
              variant={mode === "subtract" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("subtract")}
            >
              Subtract
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-hours">Hours</Label>
            <Input
              id="adj-hours"
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
            <Label htmlFor="adj-reason">Reason</Label>
            <Input
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual carryover, correction"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : `${mode === "add" ? "Add" : "Subtract"} hours`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
