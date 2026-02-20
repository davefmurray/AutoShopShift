"use client";

import { useState, useMemo } from "react";
import { CalendarToolbar } from "@/components/schedule/calendar-toolbar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { WeekView } from "@/components/schedule/week-view";
import { DayView } from "@/components/schedule/day-view";
import { ListView } from "@/components/schedule/list-view";
import { ShiftDialog } from "@/components/schedule/shift-dialog";
import { PublishBar } from "@/components/schedule/publish-bar";
import { useCalendarStore } from "@/stores/calendar-store";
import { useShifts, type Shift } from "@/hooks/use-shifts";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useShopStore } from "@/stores/shop-store";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SchedulePage() {
  const { currentDate, view } = useCalendarStore();
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const rangeStart =
    view === "day"
      ? format(startOfDay(currentDate), "yyyy-MM-dd'T'HH:mm:ss")
      : format(weekStart, "yyyy-MM-dd'T'HH:mm:ss");
  const rangeEnd =
    view === "day"
      ? format(endOfDay(currentDate), "yyyy-MM-dd'T'HH:mm:ss")
      : format(weekEnd, "yyyy-MM-dd'T'HH:mm:ss");

  const { data: shifts = [], isLoading } = useShifts(rangeStart, rangeEnd);

  const shortcutHandlers = useMemo(
    () => ({ onNewShift: handleNewShift }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useKeyboardShortcuts(shortcutHandlers);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleNewShift() {
    setEditingShift(null);
    setDialogOpen(true);
  }

  function handleEditShift(shift: Shift) {
    setEditingShift(shift);
    setDialogOpen(true);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const shiftId = active.id as string;
    const dropTarget = over.id as string;

    const supabase = createClient();

    if (dropTarget.startsWith("user-")) {
      const parts = dropTarget.split("-");
      const userId = parts[1];
      const targetDate = parts.slice(2).join("-");

      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) return;

      const shiftDate = format(new Date(shift.start_time), "yyyy-MM-dd");
      const updates: Record<string, string | null> = {
        user_id: userId === "open" ? null : userId,
      };

      if (targetDate !== shiftDate) {
        const startTime = format(new Date(shift.start_time), "HH:mm:ss");
        const endTime = format(new Date(shift.end_time), "HH:mm:ss");
        updates.start_time = `${targetDate}T${startTime}`;
        updates.end_time = `${targetDate}T${endTime}`;
      }

      await supabase.from("shifts").update(updates).eq("id", shiftId);
      queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    }
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CalendarToolbar />
        <Button onClick={handleNewShift} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Shift
        </Button>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading schedule...
          </div>
        ) : view === "week" ? (
          <WeekView shifts={shifts} onShiftClick={handleEditShift} />
        ) : view === "day" ? (
          <DayView shifts={shifts} onShiftClick={handleEditShift} />
        ) : (
          <ListView shifts={shifts} onShiftClick={handleEditShift} />
        )}
      </DndContext>

      <PublishBar shifts={shifts} />

      <ShiftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shift={editingShift}
        defaultDate={format(currentDate, "yyyy-MM-dd")}
      />
    </div>
  );
}
