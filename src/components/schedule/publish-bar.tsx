"use client";

import { Button } from "@/components/ui/button";
import { publishShifts } from "@/actions/shifts";
import { useQueryClient } from "@tanstack/react-query";
import { useShopStore } from "@/stores/shop-store";
import { useState } from "react";
import type { Shift } from "@/hooks/use-shifts";
import { Send } from "lucide-react";

export function PublishBar({ shifts }: { shifts: Shift[] }) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const draftShifts = shifts.filter((s) => s.status === "draft");
  if (draftShifts.length === 0) return null;

  async function handlePublish() {
    setLoading(true);
    await publishShifts(draftShifts.map((s) => s.id));
    await queryClient.invalidateQueries({ queryKey: ["shifts", shopId] });
    setLoading(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-3 shadow-lg">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <span className="text-sm text-muted-foreground">
          {draftShifts.length} unpublished shift{draftShifts.length !== 1 ? "s" : ""}
        </span>
        <Button onClick={handlePublish} disabled={loading}>
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Publishing..." : "Publish all"}
        </Button>
      </div>
    </div>
  );
}
