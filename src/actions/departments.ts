"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  const { error } = await supabase
    .from("departments")
    .update(data)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) return { error: error.message };
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

  const { error } = await supabase
    .from("shop_members")
    .update({ department_id: departmentId })
    .eq("id", memberId);

  if (error) return { error: error.message };
  revalidatePath("/team");
  return { success: true };
}
