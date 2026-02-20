"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) return { error: error.message };
  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead(shopId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { error: error.message };
  revalidatePath("/notifications");
  return { success: true };
}

export async function createNotification(data: {
  shop_id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert(data);

  if (error) return { error: error.message };
  return { success: true };
}

// Helper to notify multiple users at once
export async function notifyShopMembers(
  shopId: string,
  type: string,
  title: string,
  body?: string,
  excludeUserId?: string
) {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("shop_members")
    .select("user_id")
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (!members?.length) return { success: true };

  const notifications = members
    .filter((m: { user_id: string }) => m.user_id !== excludeUserId)
    .map((m: { user_id: string }) => ({
      shop_id: shopId,
      user_id: m.user_id,
      type,
      title,
      body,
    }));

  if (notifications.length === 0) return { success: true };

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) return { error: error.message };
  return { success: true };
}
