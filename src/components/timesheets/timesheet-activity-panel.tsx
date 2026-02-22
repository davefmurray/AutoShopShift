"use client";

import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTimesheetActivityLog } from "@/hooks/use-timesheets";
import type { TimesheetActivityEntry } from "@/types/timesheets";

type TimesheetActivityPanelProps = {
  userId: string;
  startDate: string;
  endDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timezone: string;
};

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  edit: { label: "Edited", icon: Pencil, color: "text-blue-600" },
  create: { label: "Added", icon: Plus, color: "text-green-600" },
  delete: { label: "Deleted", icon: Trash2, color: "text-red-600" },
};

function formatTimeValue(value: unknown, tz: string): string {
  if (!value || typeof value !== "string") return "—";
  try {
    return formatInTimeZone(new Date(value), tz, "h:mm a");
  } catch {
    return String(value);
  }
}

function ChangeSummary({ entry, timezone }: { entry: TimesheetActivityEntry; timezone: string }) {
  if (entry.action === "create" && entry.new_data) {
    return (
      <p className="text-xs text-muted-foreground">
        {formatTimeValue(entry.new_data.clock_in, timezone)} –{" "}
        {formatTimeValue(entry.new_data.clock_out, timezone)}
      </p>
    );
  }

  if (entry.action === "edit" && entry.old_data && entry.new_data) {
    const changes: string[] = [];
    if (entry.old_data.clock_in !== entry.new_data.clock_in) {
      changes.push(
        `Clock in: ${formatTimeValue(entry.old_data.clock_in, timezone)} → ${formatTimeValue(entry.new_data.clock_in, timezone)}`
      );
    }
    if (entry.old_data.clock_out !== entry.new_data.clock_out) {
      changes.push(
        `Clock out: ${formatTimeValue(entry.old_data.clock_out, timezone)} → ${formatTimeValue(entry.new_data.clock_out, timezone)}`
      );
    }
    if (changes.length === 0) return null;
    return (
      <div className="text-xs text-muted-foreground">
        {changes.map((c, i) => (
          <p key={i}>{c}</p>
        ))}
      </div>
    );
  }

  return null;
}

function ActivityItem({ entry, timezone }: { entry: TimesheetActivityEntry; timezone: string }) {
  const config = ACTION_CONFIG[entry.action] ?? {
    label: entry.action,
    icon: Pencil,
    color: "text-muted-foreground",
  };
  const Icon = config.icon;
  const actorName = entry.profiles?.full_name ?? "System";

  return (
    <div className="flex gap-3 py-2">
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted ${config.color}`}
      >
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-medium">{config.label}</span>
          <span className="text-muted-foreground"> by {actorName}</span>
        </div>
        <ChangeSummary entry={entry} timezone={timezone} />
        {entry.notes && (
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{entry.notes}&rdquo;
          </p>
        )}
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(entry.created_at), {
            addSuffix: true,
          })}
        </div>
      </div>
    </div>
  );
}

export function TimesheetActivityPanel({
  userId,
  startDate,
  endDate,
  open,
  onOpenChange,
  timezone,
}: TimesheetActivityPanelProps) {
  const { data: entries = [], isLoading } = useTimesheetActivityLog(
    open ? userId : undefined,
    startDate,
    endDate
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Activity Log</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No edits recorded for this period.
            </p>
          )}
          {entries.map((entry) => (
            <ActivityItem key={entry.id} entry={entry} timezone={timezone} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
