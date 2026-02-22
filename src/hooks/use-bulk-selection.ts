"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { Shift } from "@/hooks/use-shifts";

export function useBulkSelection(shifts: Shift[], timezone: string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Prune orphaned IDs when shifts array changes (e.g. realtime deletions)
  useEffect(() => {
    const currentIds = new Set(shifts.map((s) => s.id));
    setSelectedIds((prev) => {
      const pruned = new Set([...prev].filter((id) => currentIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [shifts]);

  // Lookup maps for efficient group operations
  const { shiftsByUser, shiftsByDate } = useMemo(() => {
    const byUser = new Map<string, Shift[]>();
    const byDate = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const userKey =
        shift.is_open || !shift.user_id ? "__open__" : shift.user_id;
      if (!byUser.has(userKey)) byUser.set(userKey, []);
      byUser.get(userKey)!.push(shift);

      const dateStr = formatInTimeZone(
        new Date(shift.start_time),
        timezone,
        "yyyy-MM-dd"
      );
      if (!byDate.has(dateStr)) byDate.set(dateStr, []);
      byDate.get(dateStr)!.push(shift);
    }
    return { shiftsByUser: byUser, shiftsByDate: byDate };
  }, [shifts, timezone]);

  const selectedCount = selectedIds.size;

  const selectedShifts = useMemo(
    () => shifts.filter((s) => selectedIds.has(s.id)),
    [shifts, selectedIds]
  );

  const isSelected = useCallback(
    (shiftId: string) => selectedIds.has(shiftId),
    [selectedIds]
  );

  const toggleShift = useCallback((shiftId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) next.delete(shiftId);
      else next.add(shiftId);
      return next;
    });
  }, []);

  const toggleUser = useCallback(
    (userId: string) => {
      const userShifts = shiftsByUser.get(userId) ?? [];
      if (userShifts.length === 0) return;

      setSelectedIds((prev) => {
        const allSelected = userShifts.every((s) => prev.has(s.id));
        const next = new Set(prev);
        if (allSelected) {
          userShifts.forEach((s) => next.delete(s.id));
        } else {
          userShifts.forEach((s) => next.add(s.id));
        }
        return next;
      });
    },
    [shiftsByUser]
  );

  const toggleDay = useCallback(
    (dateStr: string) => {
      const dayShifts = shiftsByDate.get(dateStr) ?? [];
      if (dayShifts.length === 0) return;

      setSelectedIds((prev) => {
        const allSelected = dayShifts.every((s) => prev.has(s.id));
        const next = new Set(prev);
        if (allSelected) {
          dayShifts.forEach((s) => next.delete(s.id));
        } else {
          dayShifts.forEach((s) => next.add(s.id));
        }
        return next;
      });
    },
    [shiftsByDate]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(shifts.map((s) => s.id)));
  }, [shifts]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isUserFullySelected = useCallback(
    (userId: string) => {
      const userShifts = shiftsByUser.get(userId) ?? [];
      return userShifts.length > 0 && userShifts.every((s) => selectedIds.has(s.id));
    },
    [shiftsByUser, selectedIds]
  );

  const isDayFullySelected = useCallback(
    (dateStr: string) => {
      const dayShifts = shiftsByDate.get(dateStr) ?? [];
      return dayShifts.length > 0 && dayShifts.every((s) => selectedIds.has(s.id));
    },
    [shiftsByDate, selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    selectedShifts,
    isSelected,
    toggleShift,
    toggleUser,
    toggleDay,
    selectAll,
    selectNone,
    isUserFullySelected,
    isDayFullySelected,
  };
}
