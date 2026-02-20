import { create } from "zustand";
import { startOfWeek, endOfWeek } from "date-fns";

export type CalendarView = "week" | "day" | "list";

interface CalendarState {
  currentDate: Date;
  view: CalendarView;
  filterPositionIds: string[];
  filterMemberIds: string[];
  filterScheduleIds: string[];
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  setFilterPositionIds: (ids: string[]) => void;
  setFilterMemberIds: (ids: string[]) => void;
  setFilterScheduleIds: (ids: string[]) => void;
  getWeekRange: () => { start: Date; end: Date };
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: new Date(),
  view: "week",
  filterPositionIds: [],
  filterMemberIds: [],
  filterScheduleIds: [],
  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),
  setFilterPositionIds: (ids) => set({ filterPositionIds: ids }),
  setFilterMemberIds: (ids) => set({ filterMemberIds: ids }),
  setFilterScheduleIds: (ids) => set({ filterScheduleIds: ids }),
  getWeekRange: () => {
    const { currentDate } = get();
    return {
      start: startOfWeek(currentDate, { weekStartsOn: 0 }),
      end: endOfWeek(currentDate, { weekStartsOn: 0 }),
    };
  },
}));
