"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useShiftHistory, type ShiftHistoryEntry } from "@/hooks/use-shifts";
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Undo2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ShiftHistoryPanelProps = {
  shiftId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  create: { label: "Created", icon: Plus, color: "text-green-600" },
  update: { label: "Updated", icon: Pencil, color: "text-blue-600" },
  delete: { label: "Deleted", icon: Trash2, color: "text-red-600" },
  publish: { label: "Published", icon: Send, color: "text-primary" },
  unpublish: { label: "Unpublished", icon: Undo2, color: "text-amber-600" },
  assign: { label: "Assigned", icon: UserPlus, color: "text-teal-600" },
  unassign: { label: "Unassigned", icon: UserMinus, color: "text-orange-600" },
};

function HistoryItem({ entry }: { entry: ShiftHistoryEntry }) {
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
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(entry.created_at), {
            addSuffix: true,
          })}
        </div>
      </div>
    </div>
  );
}

export function ShiftHistoryPanel({
  shiftId,
  open,
  onOpenChange,
}: ShiftHistoryPanelProps) {
  const { data: history = [], isLoading } = useShiftHistory(
    open ? shiftId : null
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Shift History</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {!isLoading && history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No history recorded yet.
            </p>
          )}
          {history.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
