"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Plus, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import Link from "next/link";

type Shop = {
  id: string;
  name: string;
  timezone: string;
};

export function ShopSwitcher() {
  const { activeShopId, setActiveShopId } = useShopStore();

  const { data: shops } = useQuery({
    queryKey: ["shops"],
    queryFn: async (): Promise<Shop[]> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: members } = await supabase
        .from("shop_members")
        .select("shop_id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (!members?.length) return [];

      const shopIds = members.map((m: { shop_id: string }) => m.shop_id);
      const { data: shopData } = await supabase
        .from("shops")
        .select("id, name, timezone")
        .in("id", shopIds);

      return (shopData as Shop[]) ?? [];
    },
  });

  const activeShop = shops?.find((s) => s.id === activeShopId) ?? shops?.[0];

  // Auto-select first shop if none active
  if (shops?.length && !activeShopId && shops[0]) {
    setActiveShopId(shops[0].id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="truncate">
              {activeShop?.name ?? "Select shop"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
        {shops?.map((shop) => (
          <DropdownMenuItem
            key={shop.id}
            onClick={() => setActiveShopId(shop.id)}
          >
            <Store className="mr-2 h-4 w-4" />
            {shop.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <Plus className="mr-2 h-4 w-4" />
            Create new shop
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
