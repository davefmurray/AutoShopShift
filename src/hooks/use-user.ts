"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/types/supabase";

export type UserWithProfile = {
  id: string;
  email: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  shopMember: {
    id: string;
    shop_id: string;
    user_id: string;
    role: Enums<"shop_role">;
    hourly_rate: number | null;
    max_hours_per_week: number | null;
    is_active: boolean;
  } | null;
  shop: {
    id: string;
    name: string;
    timezone: string;
  } | null;
  role: Enums<"shop_role"> | null;
};

export function useUser(shopId?: string) {
  return useQuery({
    queryKey: ["user", shopId],
    queryFn: async (): Promise<UserWithProfile | null> => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let shopMember: UserWithProfile["shopMember"] = null;
      let shop: UserWithProfile["shop"] = null;

      if (shopId) {
        const { data: memberData } = await supabase
          .from("shop_members")
          .select("*")
          .eq("shop_id", shopId)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();
        shopMember = memberData;

        if (shopMember) {
          const { data: shopData } = await supabase
            .from("shops")
            .select("id, name, timezone")
            .eq("id", shopId)
            .single();
          shop = shopData;
        }
      }

      return {
        id: user.id,
        email: user.email ?? "",
        profile,
        shopMember,
        shop,
        role: shopMember?.role ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
