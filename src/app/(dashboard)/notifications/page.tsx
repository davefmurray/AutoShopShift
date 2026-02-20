"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { useShopStore } from "@/stores/shop-store";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCheck, Bell, Calendar, Clock, Users, ArrowLeftRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, React.ElementType> = {
  shift_published: Calendar,
  shift_assigned: Calendar,
  shift_updated: Calendar,
  shift_deleted: Calendar,
  swap_requested: ArrowLeftRight,
  swap_approved: ArrowLeftRight,
  swap_denied: ArrowLeftRight,
  open_shift_available: Calendar,
  open_shift_claimed: Calendar,
  open_shift_approved: Calendar,
  open_shift_denied: Calendar,
  clock_reminder: Clock,
  schedule_updated: Calendar,
  team_invite: Users,
};

export default function NotificationsPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const { data: notifications = [], unreadCount, isLoading } = useNotifications();
  const queryClient = useQueryClient();

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications", shopId] });
  }

  async function handleMarkAllRead() {
    if (!shopId) return;
    await markAllNotificationsRead(shopId);
    queryClient.invalidateQueries({ queryKey: ["notifications", shopId] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] ?? Bell;
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-4 ${
                  !notification.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                role={!notification.is_read ? "button" : undefined}
              >
                <div className="mt-0.5">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${!notification.is_read ? "font-semibold" : ""}`}>
                      {notification.title}
                    </span>
                    {!notification.is_read && (
                      <Badge variant="default" className="text-xs h-5">
                        New
                      </Badge>
                    )}
                  </div>
                  {notification.body && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
