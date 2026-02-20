import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Send reminder notifications to users who have been clocked in for over 10 hours
// Intended to be called by a cron job every 30 minutes
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const tenHoursAgo = new Date();
  tenHoursAgo.setHours(tenHoursAgo.getHours() - 10);

  // Find active time records that started more than 10 hours ago
  const { data: staleRecords, error: fetchError } = await supabase
    .from("time_records")
    .select("id, user_id, shop_id, clock_in")
    .in("status", ["clocked_in", "on_break"])
    .lt("clock_in", tenHoursAgo.toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!staleRecords?.length) {
    return NextResponse.json({ reminded: 0 });
  }

  // Create reminder notifications (avoid duplicates by checking recent notifications)
  let reminded = 0;
  for (const record of staleRecords) {
    const r = record as { id: string; user_id: string; shop_id: string; clock_in: string };

    // Check if we already sent a reminder for this time record today
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", r.user_id)
      .eq("shop_id", r.shop_id)
      .eq("type", "clock_reminder")
      .gte("created_at", new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) continue;

    const hoursElapsed = Math.round(
      (Date.now() - new Date(r.clock_in).getTime()) / (1000 * 60 * 60)
    );

    await supabase.from("notifications").insert({
      user_id: r.user_id,
      shop_id: r.shop_id,
      type: "clock_reminder",
      title: "Did you forget to clock out?",
      body: `You've been clocked in for ${hoursElapsed} hours. Remember to clock out when your shift ends.`,
      data: { time_record_id: r.id },
    });

    reminded++;
  }

  return NextResponse.json({ reminded });
}
