"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TimesheetSignature } from "@/types/timesheets";

export type TeamTimesheetMember = {
  member_id: string;
  user_id: string;
  full_name: string | null;
  hours_worked: number;
  overtime_hours: number;
  time_off_hours: number;
};

type TeamTimesheetListProps = {
  members: TeamTimesheetMember[];
  periodStart: string;
  periodEnd: string;
  signatures: TimesheetSignature[];
};

export function TeamTimesheetList({
  members,
  periodStart,
  periodEnd,
  signatures,
}: TeamTimesheetListProps) {
  // Suppress unused variable warnings — values used for future filtering
  void periodStart;
  void periodEnd;

  const signatureByUserId = new Map(
    signatures.map((s) => [s.user_id, s])
  );

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium text-right">Hours</th>
              <th className="p-3 font-medium text-right">OT</th>
              <th className="p-3 font-medium text-right">Time Off</th>
              <th className="p-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.member_id} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  <Link
                    href={`/timesheets/${m.member_id}`}
                    className="hover:underline"
                  >
                    {m.full_name ?? "Unknown"}
                  </Link>
                </td>
                <td className="p-3 text-right">
                  {(m.hours_worked ?? 0).toFixed(1)}
                </td>
                <td className="p-3 text-right">
                  {(m.overtime_hours ?? 0).toFixed(1)}
                </td>
                <td className="p-3 text-right">
                  {(m.time_off_hours ?? 0).toFixed(1)}
                </td>
                <td className="p-3 text-right">
                  {signatureByUserId.has(m.user_id) ? (
                    <Badge variant="default" title={
                      `Signed ${format(
                        new Date(signatureByUserId.get(m.user_id)!.signed_at),
                        "MMM d, yyyy"
                      )}`
                    }>
                      Signed{" "}
                      <span className="ml-1 text-xs opacity-80">
                        {format(
                          new Date(signatureByUserId.get(m.user_id)!.signed_at),
                          "M/d"
                        )}
                      </span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Unsigned</Badge>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  No team members for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
