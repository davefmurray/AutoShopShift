"use client";

import { format, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendarStore, type CalendarView } from "@/stores/calendar-store";

const viewOptions: { value: CalendarView; label: string; icon: React.ElementType }[] = [
  { value: "week", label: "Week", icon: LayoutGrid },
  { value: "day", label: "Day", icon: CalendarIcon },
  { value: "list", label: "List", icon: List },
];

export function CalendarToolbar() {
  const { currentDate, view, setCurrentDate, setView } = useCalendarStore();

  function navigateBack() {
    if (view === "day") {
      setCurrentDate(subDays(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  }

  function navigateForward() {
    if (view === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const dateLabel =
    view === "day"
      ? format(currentDate, "EEEE, MMMM d, yyyy")
      : `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Schedule</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={navigateBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={navigateForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium min-w-[180px] text-center hidden sm:block">
          {dateLabel}
        </span>
        <div className="flex items-center border rounded-md">
          {viewOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={view === opt.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView(opt.value)}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
            >
              <opt.icon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{opt.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
