"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShopStore } from "@/stores/shop-store";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
import { useMembers, usePositions, useSchedules, type Shift } from "@/hooks/use-shifts";
import { createShift, updateShift, deleteShift } from "@/actions/shifts";
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
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

type ShiftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: Shift | null;
  defaultDate?: string;
  defaultUserId?: string;
};

export function ShiftDialog({
  open,
  onOpenChange,
  shift,
  defaultDate,
  defaultUserId,
}: ShiftDialogProps) {
  const shopId = useShopStore((s) => s.activeShopId);
  const timezone = useShopTimezone();
  const queryClient = useQueryClient();
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = usePositions();
  const { data: schedules = [] } = useSchedules();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getInitialState() {
    if (shift) {
      return {
        date: formatInTimeZone(new Date(shift.start_time), timezone, "yyyy-MM-dd"),
        startTime: formatInTimeZone(new Date(shift.start_time), timezone, "HH:mm"),
        endTime: formatInTimeZone(new Date(shift.end_time), timezone, "HH:mm"),
        userId: shift.user_id ?? "none",
        positionId: shift.position_id ?? "none",
        scheduleId: shift.schedule_id ?? "none",
        breakMinutes: String(shift.break_minutes),
        isOpen: shift.is_open,
        notes: shift.notes ?? "",
      };
    }
    return {
      date: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
      startTime: "08:00",
      endTime: "17:00",
      userId: defaultUserId ?? "none",
      positionId: "none",
      scheduleId: "none",
      breakMinutes: "30",
      isOpen: false,
      notes: "",
    };
  }

  const initial = getInitialState();
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [userId, setUserId] = useState<string>(initial.userId);
  const [positionId, setPositionId] = useState<string>(initial.positionId);
  const [scheduleId, setScheduleId] = useState<string>(initial.scheduleId);
  const [breakMinutes, setBreakMinutes] = useState(initial.breakMinutes);
  const [isOpen, setIsOpen] = useState(initial.isOpen);
  const [notes, setNotes] = useState(initial.notes);

  // Reset form when shift/defaultDate changes (dialog opens with new data)
  const shiftId = shift?.id ?? null;
  useEffect(() => {
    const state = getInitialState();
    setDate(state.date);
    setStartTime(state.startTime);
    setEndTime(state.endTime);
    setUserId(state.userId);
    setPositionId(state.positionId);
    setScheduleId(state.scheduleId);
    setBreakMinutes(state.breakMinutes);
    setIsOpen(state.isOpen);
    setNotes(state.notes);
    // Only reset when the shift being edited changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId, defaultDate, defaultUserId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setLoading(true);
    setError(null);

    // Convert shop-local times to UTC ISO strings
    const startUtc = fromZonedTime(`${date}T${startTime}:00`, timezone);
    const endUtc = fromZonedTime(`${date}T${endTime}:00`, timezone);

    const payload = {
      shop_id: shopId,
      user_id: userId === "none" ? undefined : userId,
      position_id: positionId === "none" ? undefined : positionId,
      schedule_id: scheduleId === "none" ? undefined : scheduleId,
      start_time: startUtc.toISOString(),
      end_time: endUtc.toISOString(),
      break_minutes: parseInt(breakMinutes) || 0,
      is_open: isOpen,
      notes: notes || undefined,
    };

    const result = shift
      ? await updateShift(shift.id, payload)
      : await createShift(payload);

    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    setLoading(false);
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!shift) return;
    setLoading(true);
    await deleteShift(shift.id);
    await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{shift ? "Edit Shift" : "New Shift"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Start</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m: { user_id: string; profile?: { full_name: string | null } }) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name ?? "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {positions.map((p: { id: string; name: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select value={scheduleId} onValueChange={setScheduleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {schedules.map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Break (min)</Label>
              <Input
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                min="0"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) => setIsOpen(e.target.checked)}
                  className="rounded"
                />
                Open shift
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            {shift && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1" />
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : shift ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
