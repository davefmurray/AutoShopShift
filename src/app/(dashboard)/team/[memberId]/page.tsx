"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useDepartments, usePtoBalance } from "@/hooks/use-time-off";
import { useWorkforceMetrics } from "@/hooks/use-reports";
import { startOfWeek, endOfWeek } from "date-fns";

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const queryClient = useQueryClient();
  const shopId = useShopStore((s) => s.activeShopId);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const { data: departments = [] } = useDepartments();

  // Resolve user_id for metric hooks (needs member data)
  const { data: memberUserId } = useQuery({
    queryKey: ["team-member-userid", memberId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("shop_members")
        .select("user_id")
        .eq("id", memberId)
        .single();
      return (data as { user_id: string } | null)?.user_id ?? null;
    },
    enabled: !!memberId,
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const { data: weekMetrics } = useWorkforceMetrics(
    memberUserId ?? undefined,
    weekStart,
    weekEnd
  );
  const { data: ptoBalance } = usePtoBalance(memberUserId ?? undefined);

  const { data: member, isLoading } = useQuery({
    queryKey: ["team-member", memberId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: memberData } = await supabase
        .from("shop_members")
        .select("*")
        .eq("id", memberId)
        .single();

      if (!memberData) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", (memberData as { user_id: string }).user_id)
        .single();

      // Get positions for this member
      const { data: memberPositions } = await supabase
        .from("member_positions")
        .select("position_id")
        .eq("member_id", memberId);

      const posIds = (memberPositions ?? []).map((mp: { position_id: string }) => mp.position_id);
      const { data: positions } = posIds.length
        ? await supabase.from("positions").select("*").in("id", posIds)
        : { data: [] };

      // Get all positions for the shop
      const { data: allPositions } = await supabase
        .from("positions")
        .select("*")
        .eq("shop_id", shopId!);

      // Set form state
      setRole((memberData as { role: string }).role);
      setDepartmentId((memberData as { department_id: string | null }).department_id ?? "none");
      setHourlyRate(String((memberData as { hourly_rate: number | null }).hourly_rate ?? ""));
      setMaxHours(String((memberData as { max_hours_per_week: number | null }).max_hours_per_week ?? "40"));

      return {
        ...memberData,
        profile,
        positions: positions ?? [],
        allPositions: allPositions ?? [],
        assignedPositionIds: posIds,
      };
    },
    enabled: !!memberId && !!shopId,
  });

  async function handleSave() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("shop_members")
      .update({
        role,
        department_id: departmentId === "none" ? null : departmentId,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        max_hours_per_week: maxHours ? parseInt(maxHours) : 40,
      })
      .eq("id", memberId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["team", shopId] });
    await queryClient.invalidateQueries({ queryKey: ["team-member", memberId] });
    setSaving(false);
  }

  async function togglePosition(positionId: string, assigned: boolean) {
    const supabase = createClient();
    if (assigned) {
      await supabase
        .from("member_positions")
        .delete()
        .eq("member_id", memberId)
        .eq("position_id", positionId);
    } else {
      await supabase
        .from("member_positions")
        .insert({ member_id: memberId, position_id: positionId });
    }
    await queryClient.invalidateQueries({ queryKey: ["team-member", memberId] });
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!member) {
    return <div className="text-muted-foreground">Member not found</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/team">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {(member.profile as { full_name: string | null } | null)?.full_name ?? "Team Member"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
          <CardDescription>Update role, wage, and hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="No department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly rate ($)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="25.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Max hours/week</Label>
              <Input
                id="hours"
                type="number"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                placeholder="40"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>
            Select which positions this member can fill
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(member.allPositions as { id: string; name: string; color: string }[]).map((pos) => {
              const assigned = (member.assignedPositionIds as string[]).includes(pos.id);
              return (
                <Badge
                  key={pos.id}
                  variant={assigned ? "default" : "outline"}
                  className="cursor-pointer"
                  style={
                    assigned
                      ? { backgroundColor: pos.color, color: "white" }
                      : { borderColor: pos.color, color: pos.color }
                  }
                  onClick={() => togglePosition(pos.id, assigned)}
                >
                  {pos.name}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {weekMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>This week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Hours</span>
                <p className="text-lg font-semibold">
                  {weekMetrics.total_hours_worked}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Overtime</span>
                <p className="text-lg font-semibold">
                  {weekMetrics.overtime_hours}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Late</span>
                <p className="text-lg font-semibold">
                  {weekMetrics.late_arrivals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {ptoBalance && (
        <Card>
          <CardHeader>
            <CardTitle>PTO Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Accrued</span>
                <p className="text-lg font-semibold">
                  {ptoBalance.hours_accrued}h
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Available</span>
                <p className="text-lg font-semibold">
                  {ptoBalance.hours_available}h
                </p>
              </div>
            </div>
            <Link
              href={`/reports/${memberId}`}
              className="text-sm text-primary hover:underline"
            >
              View Full Report &rarr;
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
