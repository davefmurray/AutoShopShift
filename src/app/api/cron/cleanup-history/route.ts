import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cleanup shift_history records older than 90 days
// Intended to be called by a cron job (e.g., Railway cron or external scheduler)
// Authorization: requires CRON_SECRET header
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const { error, data } = await supabase
    .from("shift_history")
    .delete()
    .lt("changed_at", cutoff.toISOString())
    .select("id");

  const count = (data as unknown[] | null)?.length ?? 0;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count ?? 0 });
}
