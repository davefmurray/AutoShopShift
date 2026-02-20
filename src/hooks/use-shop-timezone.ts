"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";

export function useShopTimezone() {
  const shopId = useShopStore((s) => s.activeShopId);

  const { data: timezone = "America/New_York" } = useQuery({
    queryKey: ["shop-timezone", shopId],
    queryFn: async () => {
      if (!shopId) return "America/New_York";
      const supabase = createClient();
      const { data } = await supabase
        .from("shops")
        .select("timezone")
        .eq("id", shopId)
        .single();
      return data?.timezone ?? "America/New_York";
    },
    enabled: !!shopId,
    staleTime: 30 * 60 * 1000, // timezone rarely changes
  });

  return timezone;
}
