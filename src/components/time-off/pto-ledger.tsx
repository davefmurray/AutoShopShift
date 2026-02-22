"use client";

import { usePtoLedger, type PtoLedgerEntry } from "@/hooks/use-reports";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const badgeVariants: Record<
  PtoLedgerEntry["type"],
  { label: string; className: string }
> = {
  accrual: {
    label: "Accrual",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  usage: {
    label: "Usage",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  adjustment: {
    label: "Adjustment",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
};

export function PtoLedger({ userId }: { userId?: string }) {
  const { data: entries = [], isLoading } = usePtoLedger(userId);

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading ledger...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        No PTO ledger entries yet.
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Description</th>
              <th className="p-3 font-medium text-right">Hours</th>
              <th className="p-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const variant = badgeVariants[entry.type];
              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 text-sm">{entry.date}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={variant.className}>
                      {variant.label}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm">{entry.description}</td>
                  <td
                    className={`p-3 text-right text-sm font-medium ${
                      entry.hours >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {entry.hours >= 0 ? "+" : ""}
                    {entry.hours}
                  </td>
                  <td className="p-3 text-right text-sm font-medium">
                    {entry.balance_after}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
