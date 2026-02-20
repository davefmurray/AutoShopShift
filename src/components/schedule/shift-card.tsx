"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatInTimeZone } from "date-fns-tz";
import type { Shift } from "@/hooks/use-shifts";
import { cn } from "@/lib/utils";

type ShiftCardProps = {
  shift: Shift;
  memberName?: string;
  positionColor?: string;
  positionName?: string;
  timezone?: string;
  compact?: boolean;
  onClick?: () => void;
};

export function ShiftCard({
  shift,
  memberName,
  positionColor = "#6B7280",
  positionName,
  timezone = "America/New_York",
  compact = false,
  onClick,
}: ShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: shift.id,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    borderLeftColor: positionColor,
  };

  const timeDisplay = `${formatInTimeZone(new Date(shift.start_time), timezone, "h:mm a")} - ${formatInTimeZone(
    new Date(shift.end_time),
    timezone,
    "h:mm a"
  )}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "rounded-md border-l-4 bg-card p-2 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg",
        shift.status === "draft" && "border-dashed opacity-75",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <div className="font-medium truncate">
        {shift.is_open ? "Open Shift" : memberName ?? "Unassigned"}
      </div>
      <div className="text-muted-foreground truncate">{timeDisplay}</div>
      {!compact && positionName && (
        <div className="text-xs mt-1" style={{ color: positionColor }}>
          {positionName}
        </div>
      )}
      {shift.status === "draft" && (
        <div className="text-xs text-amber-600 mt-0.5">Draft</div>
      )}
    </div>
  );
}
