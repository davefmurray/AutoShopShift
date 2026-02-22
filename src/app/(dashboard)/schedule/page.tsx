"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { CalendarToolbar } from "@/components/schedule/calendar-toolbar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { WeekView } from "@/components/schedule/week-view";
import { DayView } from "@/components/schedule/day-view";
import { ListView } from "@/components/schedule/list-view";
import { ShiftDialog } from "@/components/schedule/shift-dialog";
import { CopyWeekDialog } from "@/components/schedule/copy-week-dialog";
import { PublishBar } from "@/components/schedule/publish-bar";
import { BulkEditToolbar } from "@/components/schedule/bulk-edit-toolbar";
import { BulkEditDialog } from "@/components/schedule/bulk-edit-dialog";
import { useCalendarStore } from "@/stores/calendar-store";
import { useShifts, type Shift } from "@/hooks/use-shifts";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkDeleteShifts } from "@/actions/shifts";
import { Copy, Plus, CheckSquare } from "lucide-react";

export default function SchedulePage() {
  const { currentDate, view } = useCalendarStore();
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const timezone = useShopTimezone();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [defaultUserId, setDefaultUserId] = useState<string | undefined>();
  const [dialogDefaultDate, setDialogDefaultDate] = useState(format(currentDate, "yyyy-MM-dd"));

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  const bulk = useBulkSelection(shifts, timezone);

  // Auto-exit bulk mode when view or date changes
  useEffect(() => {
    setBulkMode(false);
    bulk.selectNone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate]);

  const handleNewShift = useCallback(() => {
    setEditingShift(null);
    setDefaultUserId(undefined);
    setDialogDefaultDate(format(currentDate, "yyyy-MM-dd"));
    setDialogOpen(true);
  }, [currentDate]);

  function handleCellClick(userId: string, dateStr: string) {
    setEditingShift(null);
    setDefaultUserId(userId === "__open__" ? undefined : userId);
    setDialogDefaultDate(dateStr);
    setDialogOpen(true);
  }

  const handleExitBulkMode = useCallback(() => {
    setBulkMode(false);
    bulk.selectNone();
  }, [bulk]);

  const shortcutHandlers = useMemo(
    () => ({
      onNewShift: handleNewShift,
      onEscape: bulkMode ? handleExitBulkMode : undefined,
    }),
    [handleNewShift, bulkMode, handleExitBulkMode]
  );
  useKeyboardShortcuts(shortcutHandlers);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: bulkMode ? Infinity : 8 },
    })
  );

  function handleEditShift(shift: Shift) {
    setEditingShift(shift);
    setDialogOpen(true);
  }

  async function handleBulkDelete() {
    setDeleteLoading(true);
    const ids = [...bulk.selectedIds];
    const result = await bulkDeleteShifts(ids);
    if (!result.error) {
      await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
      bulk.selectNone();
    }
    setDeleteLoading(false);
    setDeleteConfirmOpen(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const shiftId = active.id as string;
    const dropTarget = over.id as string;

    const supabase = createClient();

    if (dropTarget.startsWith("cell-")) {
      const withoutPrefix = dropTarget.slice(5); // strip "cell-"
      let targetUserId: string | null;
      let targetDate: string;

      if (withoutPrefix.startsWith("open-")) {
        targetUserId = null;
        targetDate = withoutPrefix.slice(5); // strip "open-"
      } else {
        // Format: {userId}-{YYYY-MM-DD} — date is always last 10 chars
        targetDate = withoutPrefix.slice(-10);
        targetUserId = withoutPrefix.slice(0, -(10 + 1)); // strip "-YYYY-MM-DD"
      }

      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) return;

      const shiftDate = format(new Date(shift.start_time), "yyyy-MM-dd");
      const updates: Record<string, string | boolean | null> = {};

      // User change
      if (targetUserId !== (shift.user_id ?? null)) {
        updates.user_id = targetUserId;
        updates.is_open = targetUserId === null;
      }

      // Date change
      if (targetDate !== shiftDate) {
        const startTime = format(new Date(shift.start_time), "HH:mm:ss");
        const endTime = format(new Date(shift.end_time), "HH:mm:ss");
        updates.start_time = `${targetDate}T${startTime}`;
        updates.end_time = `${targetDate}T${endTime}`;
      }

      if (Object.keys(updates).length === 0) return;

      await supabase.from("shifts").update(updates).eq("id", shiftId);
      queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    }
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CalendarToolbar />
        <div className="flex gap-2">
          {!bulkMode && view === "week" && shifts.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setCopyDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Week
              </Button>
              <Button
                variant="outline"
                onClick={() => setBulkMode(true)}
                className="w-full sm:w-auto"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Bulk Edit
              </Button>
            </>
          )}
          {!bulkMode && (
            <Button onClick={handleNewShift} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Shift
            </Button>
          )}
        </div>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading schedule...
          </div>
        ) : view === "week" ? (
          <WeekView
            shifts={shifts}
            onShiftClick={bulkMode ? undefined : handleEditShift}
            onCellClick={bulkMode ? undefined : handleCellClick}
            bulkMode={bulkMode}
            bulkSelection={bulkMode ? bulk : undefined}
          />
        ) : view === "day" ? (
          <DayView shifts={shifts} onShiftClick={handleEditShift} />
        ) : (
          <ListView shifts={shifts} onShiftClick={handleEditShift} />
        )}
      </DndContext>

      {bulkMode ? (
        <BulkEditToolbar
          selectedCount={bulk.selectedCount}
          totalCount={shifts.length}
          onSelectAll={bulk.selectAll}
          onSelectNone={bulk.selectNone}
          onEdit={() => setBulkEditDialogOpen(true)}
          onDelete={() => setDeleteConfirmOpen(true)}
          onDone={handleExitBulkMode}
        />
      ) : (
        <PublishBar shifts={shifts} />
      )}

      <ShiftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shift={editingShift}
        defaultDate={dialogDefaultDate}
        defaultUserId={defaultUserId}
      />

      <CopyWeekDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        weekStart={weekStart}
        currentShiftCount={shifts.length}
      />

      <BulkEditDialog
        open={bulkEditDialogOpen}
        onOpenChange={setBulkEditDialogOpen}
        shiftIds={[...bulk.selectedIds]}
        onSuccess={() => bulk.selectNone()}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {bulk.selectedCount} Shift{bulk.selectedCount !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? "Deleting..."
                : `Delete ${bulk.selectedCount} Shift${bulk.selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
