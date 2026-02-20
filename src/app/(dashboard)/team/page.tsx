"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import Link from "next/link";

type Member = {
  id: string;
  user_id: string;
  role: string;
  hourly_rate: number | null;
  max_hours_per_week: number | null;
  is_active: boolean;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  positions: { id: string; name: string; color: string }[];
};

export default function TeamPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ["team", shopId],
    queryFn: async (): Promise<Member[]> => {
      if (!shopId) return [];
      const supabase = createClient();

      const { data: memberData } = await supabase
        .from("shop_members")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true);

      if (!memberData?.length) return [];

      // Get profiles for all members
      const userIds = memberData.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      // Get member positions
      const memberIds = memberData.map((m: { id: string }) => m.id);
      const { data: memberPositions } = await supabase
        .from("member_positions")
        .select("member_id, position_id")
        .in("member_id", memberIds);

      const positionIds = [...new Set((memberPositions ?? []).map((mp: { position_id: string }) => mp.position_id))];
      const { data: positions } = positionIds.length
        ? await supabase.from("positions").select("id, name, color").in("id", positionIds)
        : { data: [] };

      return memberData.map((m: { id: string; user_id: string; role: string; hourly_rate: number | null; max_hours_per_week: number | null; is_active: boolean }) => {
        const profile = (profiles ?? []).find((p: { id: string }) => p.id === m.user_id) ?? null;
        const memberPosIds = (memberPositions ?? [])
          .filter((mp: { member_id: string }) => mp.member_id === m.id)
          .map((mp: { position_id: string }) => mp.position_id);
        const memberPos = (positions ?? []).filter((p: { id: string }) => memberPosIds.includes(p.id));

        return {
          ...m,
          profile,
          positions: memberPos,
        };
      });
    },
    enabled: !!shopId,
  });

  const roleColors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-800",
    manager: "bg-blue-100 text-blue-800",
    technician: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage your shop members and positions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/team/positions">Positions</Link>
          </Button>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading team...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members?.map((member) => (
            <Link
              key={member.id}
              href={`/team/${member.id}`}
              className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>
                    {member.profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {member.profile?.full_name ?? "Unknown"}
                    </span>
                    <Badge
                      variant="secondary"
                      className={roleColors[member.role] ?? ""}
                    >
                      {member.role}
                    </Badge>
                  </div>
                  {member.profile?.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{member.profile.email}</span>
                    </div>
                  )}
                  {member.profile?.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {member.profile.phone}
                    </div>
                  )}
                  {member.positions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.positions.map((pos) => (
                        <Badge
                          key={pos.id}
                          variant="outline"
                          style={{ borderColor: pos.color, color: pos.color }}
                          className="text-xs"
                        >
                          {pos.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
