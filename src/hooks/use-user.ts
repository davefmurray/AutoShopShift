"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/types/supabase";

export type UserWithProfile = {
  id: string;
  email: string;
  profile: Tables<"profiles"> | null;
  shopMember: Tables<"shop_members"> | null;
  shop: Tables<"shops"> | null;
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

      let shopMember: Tables<"shop_members"> | null = null;
      let shop: Tables<"shops"> | null = null;

      if (shopId) {
        const { data: memberData } = await supabase
          .from("shop_members")
          .select("*")
          .eq("shop_id", shopId)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();
        shopMember = memberData as Tables<"shop_members"> | null;

        if (shopMember) {
          const { data: shopData } = await supabase
            .from("shops")
            .select("*")
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
