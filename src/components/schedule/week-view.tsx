"use client";

import { useMemo } from "react";
import { format, addDays, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useDroppable } from "@dnd-kit/core";
import { useCalendarStore } from "@/stores/calendar-store";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
import {
  useMembers,
  usePositions,
  useWeekTimeOff,
  type Shift,
  type WeekTimeOff,
} from "@/hooks/use-shifts";
import { ShiftCard } from "./shift-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CirclePlus } from "lucide-react";

type WeekViewProps = {
  shifts: Shift[];
  onShiftClick?: (shift: Shift) => void;
  onCellClick?: (userId: string, dateStr: string) => void;
};

// ---------------------------------------------------------------------------
// GridHeader
// ---------------------------------------------------------------------------

function GridHeader({ days }: { days: Date[] }) {
  return (
    <div className="flex border-b">
      <div className="w-48 shrink-0" />
      {days.map((day) => {
        const isToday = isSameDay(day, new Date());
        return (
          <div
            key={day.toISOString()}
            className={`flex-1 min-w-[100px] text-center py-2 text-sm font-medium ${
              isToday ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <div>{format(day, "EEE")}</div>
            <div className={isToday ? "font-bold" : "text-muted-foreground"}>
              {format(day, "d")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShiftCell
// ---------------------------------------------------------------------------

function ShiftCell({
  droppableId,
  shifts,
  timeOffs,
  dateStr,
  positions,
  timezone,
  onShiftClick,
  onCellClick,
}: {
  droppableId: string;
  shifts: Shift[];
  timeOffs: WeekTimeOff[];
  dateStr: string;
  positions: { id: string; name: string; color: string }[];
  timezone: string;
  onShiftClick?: (shift: Shift) => void;
  onCellClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  // Check if this date falls within any time-off period
  const dayTimeOff = timeOffs.filter((to) => to.start_date <= dateStr && to.end_date >= dateStr);

  return (
    <div
      ref={setNodeRef}
      onClick={shifts.length === 0 && dayTimeOff.length === 0 ? onCellClick : undefined}
      className={`flex-1 min-w-[100px] min-h-[60px] p-1 space-y-1 border-l ${
        isOver ? "bg-primary/10" : ""
      } ${shifts.length === 0 && dayTimeOff.length === 0 ? "hover:bg-muted/20 cursor-pointer" : ""}`}
    >
      {dayTimeOff.map((to) => (
        <div
          key={to.id}
          className="rounded border border-dashed border-muted-foreground/40 bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
        >
          TIME OFF{to.reason ? ` - ${to.reason}` : ""}
        </div>
      ))}
      {shifts.map((shift) => {
        const pos = positions.find((p) => p.id === shift.position_id);
        return (
          <ShiftCard
            key={shift.id}
            shift={shift}
            positionColor={pos?.color}
            positionName={pos?.name}
            timezone={timezone}
            compact
            onClick={() => onShiftClick?.(shift)}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OpenShiftsRow
// ---------------------------------------------------------------------------

function OpenShiftsRow({
  days,
  shiftsByDate,
  positions,
  timezone,
  onShiftClick,
  onCellClick,
}: {
  days: Date[];
  shiftsByDate: Map<string, Shift[]>;
  positions: { id: string; name: string; color: string }[];
  timezone: string;
  onShiftClick?: (shift: Shift) => void;
  onCellClick?: (userId: string, dateStr: string) => void;
}) {
  return (
    <div className="flex border-b bg-muted/20">
      <div className="w-48 shrink-0 flex items-center gap-2 px-3 py-2 border-r">
        <CirclePlus className="h-5 w-5 text-green-600" />
        <span className="text-sm font-medium">Open Shifts</span>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        return (
          <ShiftCell
            key={dateStr}
            droppableId={`cell-open-${dateStr}`}
            shifts={shiftsByDate.get(dateStr) ?? []}
            timeOffs={[]}
            dateStr={dateStr}
            positions={positions}
            timezone={timezone}
            onShiftClick={onShiftClick}
            onCellClick={() => onCellClick?.("__open__", dateStr)}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeRow
// ---------------------------------------------------------------------------

function EmployeeRow({
  userId,
  name,
  avatarUrl,
  weeklyHours,
  maxHours,
  days,
  shiftsByDate,
  timeOffs,
  positions,
  timezone,
  onShiftClick,
  onCellClick,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  weeklyHours: number;
  maxHours: number;
  days: Date[];
  shiftsByDate: Map<string, Shift[]>;
  timeOffs: WeekTimeOff[];
  positions: { id: string; name: string; color: string }[];
  timezone: string;
  onShiftClick?: (shift: Shift) => void;
  onCellClick?: (userId: string, dateStr: string) => void;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hoursVariant: "destructive" | "secondary" | "outline" =
    weeklyHours > maxHours
      ? "destructive"
      : weeklyHours >= maxHours * 0.9
        ? "secondary"
        : "outline";

  return (
    <div className="flex border-b hover:bg-muted/5">
      <div className="w-48 shrink-0 flex items-center gap-2 px-3 py-2 border-r">
        <Avatar size="sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{name}</div>
        </div>
        <Badge variant={hoursVariant} className="text-[10px] px-1.5">
          {weeklyHours.toFixed(1)}h
        </Badge>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        return (
          <ShiftCell
            key={dateStr}
            droppableId={`cell-${userId}-${dateStr}`}
            shifts={shiftsByDate.get(dateStr) ?? []}
            timeOffs={timeOffs}
            dateStr={dateStr}
            positions={positions}
            timezone={timezone}
            onShiftClick={onShiftClick}
            onCellClick={() => onCellClick?.(userId, dateStr)}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TotalsRow
// ---------------------------------------------------------------------------

function TotalsRow({
  days,
  dailyTotals,
}: {
  days: Date[];
  dailyTotals: Map<string, number>;
}) {
  return (
    <div className="flex bg-muted/10">
      <div className="w-48 shrink-0 flex items-center px-3 py-2 border-r">
        <span className="text-sm font-medium text-muted-foreground">Daily Total</span>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const total = dailyTotals.get(dateStr) ?? 0;
        return (
          <div
            key={dateStr}
            className="flex-1 min-w-[100px] flex items-center justify-center border-l text-sm text-muted-foreground py-2"
          >
            {total > 0 ? `${total.toFixed(1)}h` : "\u2014"}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeekView (main export)
// ---------------------------------------------------------------------------

export function WeekView({ shifts, onShiftClick, onCellClick }: WeekViewProps) {
  const { currentDate } = useCalendarStore();
  const timezone = useShopTimezone();
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = usePositions();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");
  const { data: timeOffs = [] } = useWeekTimeOff(startStr, endStr);

  // Pre-compute lookup maps
  const { shiftsByUserDate, timeOffByUser, weeklyHours, dailyTotals } = useMemo(() => {
    // Group shifts by user+date
    const byUserDate = new Map<string, Map<string, Shift[]>>();
    for (const shift of shifts) {
      const dateStr = formatInTimeZone(new Date(shift.start_time), timezone, "yyyy-MM-dd");
      const userKey = shift.is_open || !shift.user_id ? "__open__" : shift.user_id;
      if (!byUserDate.has(userKey)) byUserDate.set(userKey, new Map());
      const userMap = byUserDate.get(userKey)!;
      if (!userMap.has(dateStr)) userMap.set(dateStr, []);
      userMap.get(dateStr)!.push(shift);
    }

    // Group time-off by user
    const toByUser = new Map<string, WeekTimeOff[]>();
    for (const to of timeOffs) {
      if (!toByUser.has(to.user_id)) toByUser.set(to.user_id, []);
      toByUser.get(to.user_id)!.push(to);
    }

    // Compute weekly hours per user
    const wkHours = new Map<string, number>();
    for (const shift of shifts) {
      if (!shift.user_id || shift.is_open) continue;
      const start = new Date(shift.start_time).getTime();
      const end = new Date(shift.end_time).getTime();
      const hours = (end - start) / 3_600_000 - (shift.break_minutes ?? 0) / 60;
      wkHours.set(shift.user_id, (wkHours.get(shift.user_id) ?? 0) + Math.max(0, hours));
    }

    // Compute daily totals (assigned shifts only)
    const dTotals = new Map<string, number>();
    for (const shift of shifts) {
      if (!shift.user_id || shift.is_open) continue;
      const dateStr = formatInTimeZone(new Date(shift.start_time), timezone, "yyyy-MM-dd");
      const start = new Date(shift.start_time).getTime();
      const end = new Date(shift.end_time).getTime();
      const hours = (end - start) / 3_600_000 - (shift.break_minutes ?? 0) / 60;
      dTotals.set(dateStr, (dTotals.get(dateStr) ?? 0) + Math.max(0, hours));
    }

    return {
      shiftsByUserDate: byUserDate,
      timeOffByUser: toByUser,
      weeklyHours: wkHours,
      dailyTotals: dTotals,
    };
  }, [shifts, timeOffs, timezone]);

  return (
    <div className="border rounded-lg overflow-x-auto">
      <div className="min-w-[840px]">
        <GridHeader days={days} />
        <OpenShiftsRow
          days={days}
          shiftsByDate={shiftsByUserDate.get("__open__") ?? new Map()}
          positions={positions}
          timezone={timezone}
          onShiftClick={onShiftClick}
          onCellClick={onCellClick}
        />
        {members.map(
          (m: {
            user_id: string;
            max_hours_per_week: number | null;
            profile?: { full_name: string | null; avatar_url: string | null };
          }) => (
            <EmployeeRow
              key={m.user_id}
              userId={m.user_id}
              name={m.profile?.full_name ?? "Unknown"}
              avatarUrl={m.profile?.avatar_url ?? null}
              weeklyHours={weeklyHours.get(m.user_id) ?? 0}
              maxHours={m.max_hours_per_week ?? 40}
              days={days}
              shiftsByDate={shiftsByUserDate.get(m.user_id) ?? new Map()}
              timeOffs={timeOffByUser.get(m.user_id) ?? []}
              positions={positions}
              timezone={timezone}
              onShiftClick={onShiftClick}
              onCellClick={onCellClick}
            />
          )
        )}
        <TotalsRow days={days} dailyTotals={dailyTotals} />
      </div>
    </div>
  );
}
