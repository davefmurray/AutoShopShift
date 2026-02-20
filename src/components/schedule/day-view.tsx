"use client";

import { format } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { useCalendarStore } from "@/stores/calendar-store";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
import { useMembers, usePositions, type Shift } from "@/hooks/use-shifts";
import { ShiftCard } from "./shift-card";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export function DayView({ shifts, onShiftClick }: { shifts: Shift[]; onShiftClick?: (shift: Shift) => void }) {
  const { currentDate } = useCalendarStore();
  const timezone = useShopTimezone();
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = usePositions();

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const dayShifts = shifts.filter(
    (s) => formatInTimeZone(new Date(s.start_time), timezone, "yyyy-MM-dd") === dateStr
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="divide-y">
        {HOURS.map((hour) => {
          const hourShifts = dayShifts.filter((s) => {
            const zonedStart = toZonedTime(new Date(s.start_time), timezone);
            return zonedStart.getHours() === hour;
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
                      timezone={timezone}
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
