"use client";

import { useState } from "react";
import { format } from "date-fns";
import { approveTimeOff, denyTimeOff } from "@/actions/time-off";
import { usePtoBalance, type TimeOffRequest } from "@/hooks/use-time-off";
import { useQueryClient } from "@tanstack/react-query";
import { useShopStore } from "@/stores/shop-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ApprovalDialog({
  request,
  open,
  onOpenChange,
}: {
  request: TimeOffRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const { data: balance } = usePtoBalance(request?.user_id);
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"approve" | "deny">("approve");

  if (!request) return null;

  async function handleApprove() {
    setLoading(true);
    await approveTimeOff(request!.id, isPaid);
    await queryClient.invalidateQueries({ queryKey: ["time-off-requests", shopId] });
    await queryClient.invalidateQueries({ queryKey: ["pto-balance"] });
    await queryClient.invalidateQueries({ queryKey: ["team-pto-balances"] });
    setLoading(false);
    onOpenChange(false);
  }

  async function handleDeny() {
    setLoading(true);
    await denyTimeOff(request!.id, notes || undefined);
    await queryClient.invalidateQueries({ queryKey: ["time-off-requests", shopId] });
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "approve" ? "Approve" : "Deny"} Time Off Request
          </DialogTitle>
          <DialogDescription>
            {request.profile?.full_name ?? "Team member"} requested{" "}
            {request.hours_requested} hours off
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <div>
              <span className="font-medium">Dates: </span>
              {format(new Date(request.start_date), "MMM d, yyyy")}
              {request.start_date !== request.end_date &&
                ` - ${format(new Date(request.end_date), "MMM d, yyyy")}`}
            </div>
            <div>
              <span className="font-medium">Hours: </span>
              {request.hours_requested}
            </div>
            {request.reason && (
              <div>
                <span className="font-medium">Reason: </span>
                {request.reason}
              </div>
            )}
          </div>

          {balance && (
            <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
              <div className="font-medium">PTO Balance</div>
              <div className="grid grid-cols-2 gap-1">
                <span>Accrued:</span>
                <span>{balance.hours_accrued} hrs</span>
                <span>Used:</span>
                <span>{balance.hours_used} hrs</span>
                <span>Pending:</span>
                <span>{balance.hours_pending} hrs</span>
                <span className="font-medium">Available:</span>
                <span className="font-medium">{balance.hours_available} hrs</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant={mode === "approve" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("approve")}
            >
              Approve
            </Button>
            <Button
              variant={mode === "deny" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setMode("deny")}
            >
              Deny
            </Button>
          </div>

          {mode === "approve" && (
            <div className="space-y-2">
              <Label>Payment type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paid"
                    checked={isPaid}
                    onChange={() => setIsPaid(true)}
                    className="accent-primary"
                  />
                  <span>Paid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paid"
                    checked={!isPaid}
                    onChange={() => setIsPaid(false)}
                    className="accent-primary"
                  />
                  <span>Unpaid</span>
                </label>
              </div>
            </div>
          )}

          {mode === "deny" && (
            <div className="space-y-2">
              <Label htmlFor="deny-notes">Reason (optional)</Label>
              <Input
                id="deny-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Scheduling conflict"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {mode === "approve" ? (
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? "Approving..." : `Approve (${isPaid ? "Paid" : "Unpaid"})`}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={loading}
            >
              {loading ? "Denying..." : "Deny request"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
