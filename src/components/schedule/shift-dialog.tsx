"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShopStore } from "@/stores/shop-store";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
import {
  useMembers,
  usePositions,
  useSchedules,
  useShiftBreaks,
  useShiftTagIds,
  type Shift,
} from "@/hooks/use-shifts";
import { createShift, updateShift, deleteShift } from "@/actions/shifts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Trash2, History, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { ShiftColorPicker } from "./shift-color-picker";
import {
  ShiftBreaksEditor,
  type BreakItem,
} from "./shift-breaks-editor";
import { ShiftTagsInput } from "./shift-tags-input";
import {
  ShiftRepeatConfig,
  type RecurrenceConfig,
} from "./shift-repeat-config";
import { ShiftHistoryPanel } from "./shift-history-panel";

type ShiftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: Shift | null;
  defaultDate?: string;
  defaultUserId?: string;
};

export function ShiftDialog({
  open,
  onOpenChange,
  shift,
  defaultDate,
  defaultUserId,
}: ShiftDialogProps) {
  const shopId = useShopStore((s) => s.activeShopId);
  const timezone = useShopTimezone();
  const queryClient = useQueryClient();
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = usePositions();
  const { data: schedules = [] } = useSchedules();

  // Load existing breaks/tags when editing
  const shiftId = shift?.id ?? null;
  const { data: existingBreaks = [] } = useShiftBreaks(shiftId);
  const { data: existingTagIds = [] } = useShiftTagIds(shiftId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [userId, setUserId] = useState<string>("none");
  const [positionId, setPositionId] = useState<string>("none");
  const [scheduleId, setScheduleId] = useState<string>("none");
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // New feature state
  const [color, setColor] = useState<string | null>(null);
  const [breaks, setBreaks] = useState<BreakItem[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);

  // Reset form when shift/defaultDate changes
  useEffect(() => {
    if (shift) {
      setDate(
        formatInTimeZone(new Date(shift.start_time), timezone, "yyyy-MM-dd")
      );
      setStartTime(
        formatInTimeZone(new Date(shift.start_time), timezone, "HH:mm")
      );
      setEndTime(
        formatInTimeZone(new Date(shift.end_time), timezone, "HH:mm")
      );
      setUserId(shift.user_id ?? "none");
      setPositionId(shift.position_id ?? "none");
      setScheduleId(shift.schedule_id ?? "none");
      setIsOpen(shift.is_open);
      setNotes(shift.notes ?? "");
      setColor(shift.color ?? null);
    } else {
      setDate(defaultDate ?? format(new Date(), "yyyy-MM-dd"));
      setStartTime("08:00");
      setEndTime("17:00");
      setUserId(defaultUserId ?? "none");
      setPositionId("none");
      setScheduleId("none");
      setIsOpen(false);
      setNotes("");
      setColor(null);
      setBreaks([]);
      setTagIds([]);
    }
    setRecurrence(null);
    setSaveAsTemplate(false);
    setTemplateName("");
    setHistoryOpen(false);
    setMoreDetailsOpen(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId, defaultDate, defaultUserId]);

  // Populate breaks from loaded data (edit mode)
  useEffect(() => {
    if (existingBreaks.length > 0) {
      setBreaks(
        existingBreaks.map((b) => ({
          id: b.id,
          label: b.label,
          duration_minutes: b.duration_minutes,
          is_paid: b.is_paid,
        }))
      );
    }
  }, [existingBreaks]);

  // Populate tags from loaded data (edit mode)
  useEffect(() => {
    if (existingTagIds.length > 0) {
      setTagIds(existingTagIds);
    }
  }, [existingTagIds]);

  const isEditing = !!shift;
  const isPublished = shift?.status === "published";
  const computedBreakMinutes = breaks.reduce(
    (sum, b) => sum + b.duration_minutes,
    0
  );

  // Build dialog title
  const memberName =
    isEditing && shift?.user_id
      ? (
          members.find(
            (m: { user_id: string }) => m.user_id === shift.user_id
          ) as { profile?: { full_name: string | null } } | undefined
        )?.profile?.full_name
      : null;

  const dialogTitle = isEditing
    ? memberName
      ? `Edit Shift for ${memberName} on ${formatInTimeZone(
          new Date(shift!.start_time),
          timezone,
          "EEEE, MMM d"
        )}`
      : "Edit Shift"
    : "New Shift";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const startUtc = fromZonedTime(`${date}T${startTime}:00`, timezone);
    const endUtc = fromZonedTime(`${date}T${endTime}:00`, timezone);

    if (isEditing) {
      const result = await updateShift(shift!.id, {
        user_id: userId === "none" ? null : userId,
        position_id: positionId === "none" ? null : positionId,
        schedule_id: scheduleId === "none" ? null : scheduleId,
        start_time: startUtc.toISOString(),
        end_time: endUtc.toISOString(),
        break_minutes: computedBreakMinutes,
        is_open: isOpen,
        notes: notes || null,
        color,
        breaks,
        tag_ids: tagIds,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    } else {
      const result = await createShift({
        shop_id: shopId,
        user_id: userId === "none" ? undefined : userId,
        position_id: positionId === "none" ? undefined : positionId,
        schedule_id: scheduleId === "none" ? undefined : scheduleId,
        start_time: startUtc.toISOString(),
        end_time: endUtc.toISOString(),
        break_minutes: computedBreakMinutes,
        is_open: isOpen,
        notes: notes || undefined,
        color: color ?? undefined,
        breaks: breaks.length > 0 ? breaks : undefined,
        tag_ids: tagIds.length > 0 ? tagIds : undefined,
        recurrence: recurrence ?? undefined,
        save_as_template: saveAsTemplate
          ? { name: templateName || "Untitled Template" }
          : undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    setLoading(false);
    onOpenChange(false);
  }

  async function handleSaveUnpublish() {
    if (!shift || !shopId) return;
    setLoading(true);
    setError(null);

    const startUtc = fromZonedTime(`${date}T${startTime}:00`, timezone);
    const endUtc = fromZonedTime(`${date}T${endTime}:00`, timezone);

    const result = await updateShift(shift.id, {
      user_id: userId === "none" ? null : userId,
      position_id: positionId === "none" ? null : positionId,
      schedule_id: scheduleId === "none" ? null : scheduleId,
      start_time: startUtc.toISOString(),
      end_time: endUtc.toISOString(),
      break_minutes: computedBreakMinutes,
      is_open: isOpen,
      notes: notes || null,
      color,
      status: "draft",
      breaks,
      tag_ids: tagIds,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    setLoading(false);
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!shift) return;
    setLoading(true);
    await deleteShift(shift.id);
    await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base pr-2">{dialogTitle}</DialogTitle>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee + Color */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label>Employee</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members.map(
                      (m: {
                        user_id: string;
                        profile?: { full_name: string | null };
                      }) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name ?? "Unknown"}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ShiftColorPicker value={color} onChange={setColor} />
              </div>
            </div>

            {/* Date + Position */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={positionId} onValueChange={setPositionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {positions.map((p: { id: string; name: string }) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start/End times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Breaks */}
            <ShiftBreaksEditor value={breaks} onChange={setBreaks} />

            {/* Collapsible More Details */}
            <Collapsible
              open={moreDetailsOpen}
              onOpenChange={setMoreDetailsOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground"
                >
                  Add more shift details
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      moreDetailsOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Schedule */}
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={scheduleId} onValueChange={setScheduleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {schedules.map(
                        (s: { id: string; name: string }) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <ShiftTagsInput
                  selectedTagIds={tagIds}
                  onChange={setTagIds}
                />

                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Notes</Label>
                    <span className="text-xs text-muted-foreground">
                      {notes.length}/350
                    </span>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      if (e.target.value.length <= 350) {
                        setNotes(e.target.value);
                      }
                    }}
                    placeholder="Optional notes..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Open shift */}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={isOpen}
                    onCheckedChange={(checked) =>
                      setIsOpen(checked === true)
                    }
                  />
                  Open shift
                </label>
              </CollapsibleContent>
            </Collapsible>

            {/* Repeat config — create mode only */}
            {!isEditing && (
              <ShiftRepeatConfig
                value={recurrence}
                onChange={setRecurrence}
              />
            )}

            {/* Save as template — create mode only */}
            {!isEditing && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={saveAsTemplate}
                    onCheckedChange={(checked) =>
                      setSaveAsTemplate(checked === true)
                    }
                  />
                  Save as shift template
                </label>
                {saveAsTemplate && (
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name..."
                    className="h-8 text-sm"
                  />
                )}
              </div>
            )}

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Footer */}
            <DialogFooter className="gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1" />
              {isEditing && isPublished && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveUnpublish}
                  disabled={loading}
                >
                  Save &amp; Unpublish
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : isEditing
                    ? "Save"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History panel */}
      {isEditing && shiftId && (
        <ShiftHistoryPanel
          shiftId={shiftId}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}
    </>
  );
}
