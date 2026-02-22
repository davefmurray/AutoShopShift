"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  ArrowLeftRight,
  CalendarOff,
  UserPlus,
  UserMinus,
  FileSignature,
  Settings,
  Copy,
} from "lucide-react";
import { useActivityLog } from "@/hooks/use-activity-log";
import { useMembers } from "@/hooks/use-shifts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActivityLogEntry } from "@/types/activity-log";

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "shift", label: "Shifts" },
  { value: "time_record", label: "Time Records" },
  { value: "time_off", label: "Time Off" },
  { value: "swap", label: "Swaps" },
  { value: "claim", label: "Claims" },
  { value: "department", label: "Departments" },
  { value: "member", label: "Team" },
  { value: "template", label: "Templates" },
  { value: "timesheet", label: "Timesheets" },
  { value: "settings", label: "Settings" },
  { value: "pto", label: "PTO" },
];

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  create: { label: "Created", icon: Plus, color: "text-green-600" },
  update: { label: "Updated", icon: Pencil, color: "text-blue-600" },
  delete: { label: "Deleted", icon: Trash2, color: "text-red-600" },
  publish: { label: "Published", icon: Check, color: "text-green-600" },
  unpublish: { label: "Unpublished", icon: X, color: "text-orange-600" },
  assign: { label: "Assigned", icon: UserPlus, color: "text-blue-600" },
  unassign: { label: "Unassigned", icon: UserMinus, color: "text-orange-600" },
  approve: { label: "Approved", icon: Check, color: "text-green-600" },
  deny: { label: "Denied", icon: X, color: "text-red-600" },
  cancel: { label: "Cancelled", icon: X, color: "text-orange-600" },
  clock_in: { label: "Clocked in", icon: Clock, color: "text-green-600" },
  clock_out: { label: "Clocked out", icon: Clock, color: "text-orange-600" },
  start_break: { label: "Break started", icon: Clock, color: "text-blue-600" },
  end_break: { label: "Break ended", icon: Clock, color: "text-blue-600" },
  sign: { label: "Signed", icon: FileSignature, color: "text-green-600" },
  edit: { label: "Edited", icon: Pencil, color: "text-blue-600" },
  adjust: { label: "Adjusted", icon: Pencil, color: "text-blue-600" },
  archive: { label: "Archived", icon: UserMinus, color: "text-red-600" },
  restore: { label: "Restored", icon: UserPlus, color: "text-green-600" },
  apply: { label: "Applied", icon: Copy, color: "text-blue-600" },
  swap: { label: "Swapped", icon: ArrowLeftRight, color: "text-blue-600" },
};

const ENTITY_LABELS: Record<string, string> = {
  shift: "Shift",
  time_record: "Time",
  time_off: "Time Off",
  swap: "Swap",
  claim: "Claim",
  department: "Dept",
  member: "Team",
  template: "Template",
  timesheet: "Timesheet",
  settings: "Settings",
  pto: "PTO",
};

function ActivityLogItem({ entry }: { entry: ActivityLogEntry }) {
  const config = ACTION_CONFIG[entry.action] ?? {
    label: entry.action,
    icon: Settings,
    color: "text-muted-foreground",
  };
  const Icon = config.icon;

  const actorName = entry.actor?.full_name ?? "System";
  const targetName = entry.target_user?.full_name;
  const showTarget =
    targetName && entry.target_user_id !== entry.actor_id;

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${config.color}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm">
            {entry.description && (
              <span className="font-medium">{entry.description}</span>
            )}
            {!entry.description && (
              <span className="font-medium">{config.label}</span>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          by {actorName}
          {showTarget && <> for {targetName}</>}
          {" · "}
          {formatDistanceToNow(new Date(entry.created_at), {
            addSuffix: true,
          })}
        </div>
      </div>
    </div>
  );
}

export function ActivityLogFeed() {
  const [entityType, setEntityType] = useState("all");
  const [actorId, setActorId] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: members = [] } = useMembers();

  const { data: entries = [], isLoading } = useActivityLog({
    entityType: entityType === "all" ? undefined : entityType,
    actorId: actorId === "all" ? undefined : actorId,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actorId} onValueChange={(v) => { setActorId(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {members.map(
              (m: { user_id: string; profile?: { full_name: string | null } }) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name ?? "Unknown"}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        {isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Loading activity...
          </p>
        )}
        {!isLoading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No activity found.
          </p>
        )}
        {entries.map((entry) => (
          <ActivityLogItem key={entry.id} entry={entry} />
        ))}
      </div>

      {entries.length === PAGE_SIZE && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
          >
            Load more
          </Button>
        </div>
      )}

      {page > 0 && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(0)}
          >
            Back to latest
          </Button>
        </div>
      )}
    </div>
  );
}
