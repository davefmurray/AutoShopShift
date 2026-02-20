"use client";

import { CalendarToolbar } from "@/components/schedule/calendar-toolbar";
import { WeekView } from "@/components/schedule/week-view";
import { DayView } from "@/components/schedule/day-view";
import { ListView } from "@/components/schedule/list-view";
import { useCalendarStore } from "@/stores/calendar-store";
import { useShifts } from "@/hooks/use-shifts";
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

export default function SchedulePage() {
  const { currentDate, view } = useCalendarStore();
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const shiftId = active.id as string;
    const dropTarget = over.id as string;

    // Drop target format: "day-<date>" for reschedule or "user-<userId>-<date>" for reassign
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

      // If dropped on a different date, recalculate times
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
    <div className="space-y-4">
      <CalendarToolbar />
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading schedule...
          </div>
        ) : view === "week" ? (
          <WeekView shifts={shifts} />
        ) : view === "day" ? (
          <DayView shifts={shifts} />
        ) : (
          <ListView shifts={shifts} />
        )}
      </DndContext>
    </div>
  );
}
