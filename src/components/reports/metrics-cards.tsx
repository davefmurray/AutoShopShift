"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MetricItem = {
  label: string;
  value: string | number;
  sublabel?: string;
};

export function MetricsCards({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            {item.sublabel && (
              <p className="text-xs text-muted-foreground">{item.sublabel}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
