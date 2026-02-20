"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShopStore } from "@/stores/shop-store";
import { useMembers } from "@/hooks/use-shifts";
import { createManualEntry } from "@/actions/time-tracking";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export function ManualEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const { data: members = [] } = useMembers();

  const [userId, setUserId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [clockInTime, setClockInTime] = useState("08:00");
  const [clockOutTime, setClockOutTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !userId) return;
    setLoading(true);
    setError(null);

    const result = await createManualEntry({
      shop_id: shopId,
      user_id: userId,
      clock_in: `${date}T${clockInTime}:00`,
      clock_out: `${date}T${clockOutTime}:00`,
      notes: notes || undefined,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["time-records"] });
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Time Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m: { user_id: string; profile?: { full_name: string | null } }) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name ?? "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
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
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for manual entry..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading || !userId}>
              {loading ? "Creating..." : "Create Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
