"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, Users, ArrowLeftRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/time-clock", icon: Clock, label: "Clock" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/swaps", icon: ArrowLeftRight, label: "Swaps" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
