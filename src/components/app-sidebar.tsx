"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarOff,
  Clock,
  Users,
  LayoutTemplate,
  Bell,
  Settings,
  Wrench,
  ArrowLeftRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ShopSwitcher } from "@/components/shop-switcher";
import { UserNav } from "@/components/user-nav";

const navItems = [
  { title: "Schedule", href: "/schedule", icon: Calendar },
  { title: "Time Clock", href: "/time-clock", icon: Clock },
  { title: "Team", href: "/team", icon: Users },
  { title: "Swaps", href: "/swaps", icon: ArrowLeftRight },
  { title: "Time Off", href: "/time-off", icon: CalendarOff },
  { title: "Templates", href: "/templates", icon: LayoutTemplate },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Wrench className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">AutoShopShift</span>
        </div>
        <ShopSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
