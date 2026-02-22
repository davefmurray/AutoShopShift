"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPayPeriod } from "@/lib/pay-period";

type PayPeriodNavigatorProps = {
  start: Date;
  end: Date;
  onNavigate: (direction: "prev" | "next") => void;
};

export function PayPeriodNavigator({
  start,
  end,
  onNavigate,
}: PayPeriodNavigatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onNavigate("prev")}
        aria-label="Previous period"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[180px] text-center">
        {formatPayPeriod(start, end)}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onNavigate("next")}
        aria-label="Next period"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
