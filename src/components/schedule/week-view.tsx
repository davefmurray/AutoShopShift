"use client";

import { format, addDays, isSameDay, startOfWeek } from "date-fns";
import { useDroppable } from "@dnd-kit/core";
import { useCalendarStore } from "@/stores/calendar-store";
import { useMembers, usePositions, type Shift } from "@/hooks/use-shifts";
import { ShiftCard } from "./shift-card";

function DayColumn({
  date,
  shifts,
  members,
  positions,
  onShiftClick,
}: {
  date: Date;
  shifts: Shift[];
  members: { user_id: string; profile?: { full_name: string | null } }[];
  positions: { id: string; name: string; color: string }[];
  onShiftClick?: (shift: Shift) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `user-open-${format(date, "yyyy-MM-dd")}`,
  });

  const isToday = isSameDay(date, new Date());
  const dayShifts = shifts.filter((s) =>
    isSameDay(new Date(s.start_time), date)
  );
  const openShifts = dayShifts.filter((s) => s.is_open || !s.user_id);
  const assignedShifts = dayShifts.filter((s) => !s.is_open && s.user_id);

  return (
    <div className="flex-1 min-w-0">
      <div
        className={`text-center py-2 border-b text-sm font-medium ${
          isToday ? "bg-primary/10 text-primary" : ""
        }`}
      >
        <div>{format(date, "EEE")}</div>
        <div className={isToday ? "font-bold" : "text-muted-foreground"}>
          {format(date, "d")}
        </div>
      </div>

      {/* Open shifts drop zone */}
      {openShifts.length > 0 && (
        <div
          ref={setNodeRef}
          className={`p-1 border-b border-dashed bg-muted/30 min-h-[40px] space-y-1 ${
            isOver ? "bg-primary/10" : ""
          }`}
        >
          {openShifts.map((shift) => {
            const pos = positions.find((p) => p.id === shift.position_id);
            return (
              <ShiftCard
                key={shift.id}
                shift={shift}
                positionColor={pos?.color}
                positionName={pos?.name}
                compact
                onClick={() => onShiftClick?.(shift)}
              />
            );
          })}
        </div>
      )}

      {/* Assigned shifts */}
      <div className="p-1 space-y-1 min-h-[100px]">
        {assignedShifts.map((shift) => {
          const member = members.find(
            (m) => m.user_id === shift.user_id
          );
          const pos = positions.find((p) => p.id === shift.position_id);
          return (
            <ShiftCard
              key={shift.id}
              shift={shift}
              memberName={member?.profile?.full_name ?? undefined}
              positionColor={pos?.color}
              positionName={pos?.name}
              compact
              onClick={() => onShiftClick?.(shift)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function WeekView({ shifts, onShiftClick }: { shifts: Shift[]; onShiftClick?: (shift: Shift) => void }) {
  const { currentDate } = useCalendarStore();
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = usePositions();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="border rounded-lg overflow-x-auto">
      <div className="flex divide-x min-w-[640px]">
        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            date={day}
            shifts={shifts}
            members={members}
            positions={positions}
            onShiftClick={onShiftClick}
          />
        ))}
      </div>
    </div>
  );
}
