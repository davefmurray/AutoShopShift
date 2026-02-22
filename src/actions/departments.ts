"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

export async function createDepartment(data: {
  shop_id: string;
  name: string;
  pto_accrual_rate?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("departments").insert({
    shop_id: data.shop_id,
    name: data.name,
    pto_accrual_rate: data.pto_accrual_rate ?? 0,
  });

  if (error) return { error: error.message };

  await logActivity(supabase, {
    shop_id: data.shop_id,
    entity_type: "department",
    action: "create",
    actor_id: user.id,
    description: `Created department ${data.name}`,
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updateDepartment(
  id: string,
  data: { name?: string; pto_accrual_rate?: number; sort_order?: number }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: dept } = await supabase
    .from("departments")
    .select("shop_id, name")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("departments")
    .update(data)
    .eq("id", id);

  if (error) return { error: error.message };

  if (dept) {
    const d = dept as { shop_id: string; name: string };
    await logActivity(supabase, {
      shop_id: d.shop_id,
      entity_type: "department",
      entity_id: id,
      action: "update",
      actor_id: user.id,
      description: `Updated department ${data.name ?? d.name}`,
    });
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: dept } = await supabase
    .from("departments")
    .select("shop_id, name")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) return { error: error.message };

  if (dept) {
    const d = dept as { shop_id: string; name: string };
    await logActivity(supabase, {
      shop_id: d.shop_id,
      entity_type: "department",
      entity_id: id,
      action: "delete",
      actor_id: user.id,
      description: `Deleted department ${d.name}`,
    });
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function assignMemberDepartment(
  memberId: string,
  departmentId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: member } = await supabase
    .from("shop_members")
    .select("shop_id, user_id")
    .eq("id", memberId)
    .single();

  const { error } = await supabase
    .from("shop_members")
    .update({ department_id: departmentId })
    .eq("id", memberId);

  if (error) return { error: error.message };

  if (member) {
    const m = member as { shop_id: string; user_id: string };
    await logActivity(supabase, {
      shop_id: m.shop_id,
      entity_type: "member",
      entity_id: memberId,
      action: "update",
      actor_id: user.id,
      target_user_id: m.user_id,
      description: departmentId
        ? "Assigned to department"
        : "Removed from department",
    });
  }

  revalidatePath("/team");
  return { success: true };
}
