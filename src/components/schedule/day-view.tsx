"use client";

import { format, isSameDay } from "date-fns";
import { useCalendarStore } from "@/stores/calendar-store";
import { useMembers, usePositions, type Shift } from "@/hooks/use-shifts";
import { ShiftCard } from "./shift-card";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export function DayView({ shifts, onShiftClick }: { shifts: Shift[]; onShiftClick?: (shift: Shift) => void }) {
  const { currentDate } = useCalendarStore();
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = usePositions();

  const dayShifts = shifts.filter((s) =>
    isSameDay(new Date(s.start_time), currentDate)
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="divide-y">
        {HOURS.map((hour) => {
          const hourShifts = dayShifts.filter((s) => {
            const startHour = new Date(s.start_time).getHours();
            return startHour === hour;
          });

          return (
            <div key={hour} className="flex min-h-[60px]">
              <div className="w-16 shrink-0 p-2 text-xs text-muted-foreground text-right border-r">
                {format(new Date(2000, 0, 1, hour), "h a")}
              </div>
              <div className="flex-1 p-1 flex gap-1 flex-wrap">
                {hourShifts.map((shift) => {
                  const member = members.find(
                    (m: { user_id: string }) => m.user_id === shift.user_id
                  );
                  const pos = positions.find(
                    (p: { id: string }) => p.id === shift.position_id
                  );
                  return (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      onClick={() => onShiftClick?.(shift)}
                      memberName={
                        (member as { profile?: { full_name: string | null } } | undefined)
                          ?.profile?.full_name ?? undefined
                      }
                      positionColor={(pos as { color?: string } | undefined)?.color}
                      positionName={(pos as { name?: string } | undefined)?.name}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
