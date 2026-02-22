"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShiftColorPicker } from "@/components/schedule/shift-color-picker";
import { usePositions } from "@/hooks/use-shifts";
import { useShopStore } from "@/stores/shop-store";
import { useQueryClient } from "@tanstack/react-query";
import { bulkUpdateShifts } from "@/actions/shifts";

type BulkEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftIds: string[];
  onSuccess: () => void;
};

const NO_CHANGE = "__no_change__";

export function BulkEditDialog({
  open,
  onOpenChange,
  shiftIds,
  onSuccess,
}: BulkEditDialogProps) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const { data: positions = [] } = usePositions();

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [positionId, setPositionId] = useState(NO_CHANGE);
  const [color, setColor] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setStartTime("");
    setEndTime("");
    setPositionId(NO_CHANGE);
    setColor(undefined);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data: Parameters<typeof bulkUpdateShifts>[1] = {};
    if (startTime) data.start_time_of_day = startTime;
    if (endTime) data.end_time_of_day = endTime;
    if (positionId !== NO_CHANGE) {
      data.position_id = positionId === "none" ? null : positionId;
    }
    if (color !== undefined) data.color = color;

    // Only submit if there's something to update
    if (Object.keys(data).length === 0) {
      setLoading(false);
      return;
    }

    const result = await bulkUpdateShifts(shiftIds, data);
    if (!result.error) {
      await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
      resetForm();
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Bulk Edit {shiftIds.length} Shift{shiftIds.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Only fill in fields you want to change. Empty fields will be left
            as-is.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-start-time">Start Time</Label>
              <Input
                id="bulk-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-end-time">End Time</Label>
              <Input
                id="bulk-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="No change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>No change</SelectItem>
                <SelectItem value="none">Remove position</SelectItem>
                {positions.map(
                  (p: { id: string; name: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <ShiftColorPicker
                value={color ?? null}
                onChange={(c) => setColor(c)}
              />
              <span className="text-sm text-muted-foreground">
                {color === undefined
                  ? "No change"
                  : color === null
                    ? "Default"
                    : "Custom"}
              </span>
              {color !== undefined && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColor(undefined)}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Updating..."
                : `Update ${shiftIds.length} Shift${shiftIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
