"use client";

import { format } from "date-fns";
import { useMembers, usePositions, type Shift } from "@/hooks/use-shifts";
import { Badge } from "@/components/ui/badge";

export function ListView({ shifts }: { shifts: Shift[] }) {
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = usePositions();

  const sorted = [...shifts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No shifts for this period. Create one to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 text-sm font-medium">Date</th>
            <th className="text-left p-3 text-sm font-medium">Time</th>
            <th className="text-left p-3 text-sm font-medium">Employee</th>
            <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Position</th>
            <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((shift) => {
            const member = members.find(
              (m: { user_id: string }) => m.user_id === shift.user_id
            );
            const pos = positions.find(
              (p: { id: string }) => p.id === shift.position_id
            );
            return (
              <tr key={shift.id} className="hover:bg-muted/50">
                <td className="p-3 text-sm">
                  {format(new Date(shift.start_time), "EEE, MMM d")}
                </td>
                <td className="p-3 text-sm">
                  {format(new Date(shift.start_time), "h:mm a")} -{" "}
                  {format(new Date(shift.end_time), "h:mm a")}
                </td>
                <td className="p-3 text-sm">
                  {shift.is_open
                    ? "Open Shift"
                    : (member as { profile?: { full_name: string | null } } | undefined)
                        ?.profile?.full_name ?? "Unassigned"}
                </td>
                <td className="p-3 text-sm hidden sm:table-cell">
                  {pos ? (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: (pos as { color: string }).color,
                        color: (pos as { color: string }).color,
                      }}
                    >
                      {(pos as { name: string }).name}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 text-sm hidden sm:table-cell">
                  <Badge
                    variant={shift.status === "published" ? "default" : "secondary"}
                  >
                    {shift.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
