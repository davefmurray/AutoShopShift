"use client";

import { useEffect } from "react";
import { useCalendarStore } from "@/stores/calendar-store";
import { addDays, addWeeks, subDays, subWeeks } from "date-fns";
import { usePathname } from "next/navigation";

type ShortcutHandlers = {
  onNewShift?: () => void;
};

export function useKeyboardShortcuts(handlers?: ShortcutHandlers) {
  const pathname = usePathname();
  const { view, currentDate, setCurrentDate, setView } = useCalendarStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs, textareas, or selects
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore when modifier keys are held (except shift for some)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Only enable schedule shortcuts on the schedule page
      const isSchedulePage = pathname === "/schedule";

      switch (e.key) {
        case "n":
        case "N":
          if (isSchedulePage && handlers?.onNewShift) {
            e.preventDefault();
            handlers.onNewShift();
          }
          break;

        case "t":
        case "T":
          if (isSchedulePage) {
            e.preventDefault();
            setCurrentDate(new Date());
          }
          break;

        case "ArrowLeft":
          if (isSchedulePage) {
            e.preventDefault();
            if (view === "day") {
              setCurrentDate(subDays(currentDate, 1));
            } else {
              setCurrentDate(subWeeks(currentDate, 1));
            }
          }
          break;

        case "ArrowRight":
          if (isSchedulePage) {
            e.preventDefault();
            if (view === "day") {
              setCurrentDate(addDays(currentDate, 1));
            } else {
              setCurrentDate(addWeeks(currentDate, 1));
            }
          }
          break;

        case "1":
          if (isSchedulePage) {
            e.preventDefault();
            setView("week");
          }
          break;

        case "2":
          if (isSchedulePage) {
            e.preventDefault();
            setView("day");
          }
          break;

        case "3":
          if (isSchedulePage) {
            e.preventDefault();
            setView("list");
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, view, currentDate, setCurrentDate, setView, handlers]);
}
