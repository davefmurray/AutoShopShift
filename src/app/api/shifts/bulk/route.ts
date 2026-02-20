import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type BulkAction = {
  action: "create" | "update" | "delete" | "publish" | "unpublish";
  id?: string;
  data?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { actions } = (await request.json()) as { actions: BulkAction[] };
  const results: { action: string; success: boolean; error?: string }[] = [];

  for (const item of actions) {
    switch (item.action) {
      case "create": {
        const { error } = await supabase
          .from("shifts")
          .insert({ ...item.data, created_by: user.id });
        results.push({ action: "create", success: !error, error: error?.message });
        break;
      }
      case "update": {
        if (!item.id) {
          results.push({ action: "update", success: false, error: "Missing id" });
          break;
        }
        const { error } = await supabase
          .from("shifts")
          .update(item.data ?? {})
          .eq("id", item.id);
        results.push({ action: "update", success: !error, error: error?.message });
        break;
      }
      case "delete": {
        if (!item.id) {
          results.push({ action: "delete", success: false, error: "Missing id" });
          break;
        }
        const { error } = await supabase
          .from("shifts")
          .delete()
          .eq("id", item.id);
        results.push({ action: "delete", success: !error, error: error?.message });
        break;
      }
      case "publish": {
        if (!item.id) {
          results.push({ action: "publish", success: false, error: "Missing id" });
          break;
        }
        const { error } = await supabase
          .from("shifts")
          .update({ status: "published" })
          .eq("id", item.id);
        results.push({ action: "publish", success: !error, error: error?.message });
        break;
      }
      case "unpublish": {
        if (!item.id) {
          results.push({ action: "unpublish", success: false, error: "Missing id" });
          break;
        }
        const { error } = await supabase
          .from("shifts")
          .update({ status: "draft" })
          .eq("id", item.id);
        results.push({ action: "unpublish", success: !error, error: error?.message });
        break;
      }
    }
  }

  return NextResponse.json({ results });
}
