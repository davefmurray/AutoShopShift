"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { approveClaim, denyClaim } from "@/actions/claims";
import { approveSwap, denySwap } from "@/actions/swaps";
import { format } from "date-fns";
import { useState } from "react";
import { Check, X } from "lucide-react";

type ClaimRow = {
  id: string;
  shift_id: string;
  user_id: string;
  status: string;
  created_at: string;
  user_name?: string;
  shift_start?: string;
  shift_end?: string;
};

type SwapRow = {
  id: string;
  requester_id: string;
  target_id: string | null;
  status: string;
  reason: string | null;
  created_at: string;
  requester_name?: string;
  target_name?: string;
  requester_shift_start?: string;
  target_shift_start?: string;
};

export default function SwapsPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const { data: claims = [] } = useQuery({
    queryKey: ["claims", shopId],
    queryFn: async (): Promise<ClaimRow[]> => {
      if (!shopId) return [];
      const supabase = createClient();

      const { data } = await supabase
        .from("open_shift_claims")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (!data?.length) return [];

      // Enrich with user names and shift times
      const userIds = [...new Set(data.map((c: { user_id: string }) => c.user_id))];
      const shiftIds = [...new Set(data.map((c: { shift_id: string }) => c.shift_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const { data: shifts } = await supabase
        .from("shifts")
        .select("id, start_time, end_time")
        .in("id", shiftIds);

      return data.map((c: ClaimRow & { user_id: string; shift_id: string }) => ({
        ...c,
        user_name: (profiles ?? []).find((p: { id: string }) => p.id === c.user_id)?.full_name,
        shift_start: (shifts ?? []).find((s: { id: string }) => s.id === c.shift_id)?.start_time,
        shift_end: (shifts ?? []).find((s: { id: string }) => s.id === c.shift_id)?.end_time,
      }));
    },
    enabled: !!shopId,
  });

  const { data: swaps = [] } = useQuery({
    queryKey: ["swaps", shopId],
    queryFn: async (): Promise<SwapRow[]> => {
      if (!shopId) return [];
      const supabase = createClient();

      const { data } = await supabase
        .from("swap_requests")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (!data?.length) return [];

      const userIds = [
        ...new Set([
          ...data.map((s: { requester_id: string }) => s.requester_id),
          ...data.filter((s: { target_id: string | null }) => s.target_id).map((s: { target_id: string }) => s.target_id),
        ]),
      ];
      const shiftIds = [
        ...new Set([
          ...data.map((s: { requester_shift_id: string }) => s.requester_shift_id),
          ...data.filter((s: { target_shift_id: string | null }) => s.target_shift_id).map((s: { target_shift_id: string }) => s.target_shift_id),
        ]),
      ];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const { data: shifts } = await supabase
        .from("shifts")
        .select("id, start_time")
        .in("id", shiftIds);

      return data.map((s: SwapRow & { requester_id: string; target_id: string | null; requester_shift_id: string; target_shift_id: string | null }) => ({
        ...s,
        requester_name: (profiles ?? []).find((p: { id: string }) => p.id === s.requester_id)?.full_name,
        target_name: s.target_id
          ? (profiles ?? []).find((p: { id: string }) => p.id === s.target_id)?.full_name
          : null,
        requester_shift_start: (shifts ?? []).find((sh: { id: string }) => sh.id === s.requester_shift_id)?.start_time,
        target_shift_start: s.target_shift_id
          ? (shifts ?? []).find((sh: { id: string }) => sh.id === s.target_shift_id)?.start_time
          : null,
      }));
    },
    enabled: !!shopId,
  });

  const pendingClaims = claims.filter((c) => c.status === "pending");
  const pendingSwaps = swaps.filter((s) => s.status === "pending");

  async function handleClaimAction(claimId: string, action: "approve" | "deny") {
    setLoading(claimId);
    if (action === "approve") await approveClaim(claimId);
    else await denyClaim(claimId);
    await queryClient.invalidateQueries({ queryKey: ["claims", shopId] });
    setLoading(null);
  }

  async function handleSwapAction(swapId: string, action: "approve" | "deny") {
    setLoading(swapId);
    if (action === "approve") await approveSwap(swapId);
    else await denySwap(swapId);
    await queryClient.invalidateQueries({ queryKey: ["swaps", shopId] });
    setLoading(null);
  }

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Swaps & Claims</h1>

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">
            Open Shift Claims
            {pendingClaims.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {pendingClaims.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="swaps">
            Swap Requests
            {pendingSwaps.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {pendingSwaps.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-4">
          {claims.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No open shift claims yet.
            </p>
          ) : (
            claims.map((claim) => (
              <Card key={claim.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{claim.user_name ?? "Unknown"}</div>
                    <div className="text-sm text-muted-foreground">
                      {claim.shift_start &&
                        `${format(new Date(claim.shift_start), "EEE, MMM d h:mm a")} - ${
                          claim.shift_end
                            ? format(new Date(claim.shift_end), "h:mm a")
                            : ""
                        }`}
                    </div>
                    <Badge variant="secondary" className={statusColor[claim.status] ?? ""}>
                      {claim.status}
                    </Badge>
                  </div>
                  {claim.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleClaimAction(claim.id, "approve")}
                        disabled={loading === claim.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClaimAction(claim.id, "deny")}
                        disabled={loading === claim.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="swaps" className="space-y-4">
          {swaps.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No swap requests yet.
            </p>
          ) : (
            swaps.map((swap) => (
              <Card key={swap.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">
                      {swap.requester_name ?? "Unknown"} wants to swap
                    </div>
                    {swap.target_name && (
                      <div className="text-sm text-muted-foreground">
                        with {swap.target_name}
                      </div>
                    )}
                    {swap.requester_shift_start && (
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(swap.requester_shift_start), "EEE, MMM d h:mm a")}
                        {swap.target_shift_start &&
                          ` ↔ ${format(new Date(swap.target_shift_start), "EEE, MMM d h:mm a")}`}
                      </div>
                    )}
                    {swap.reason && (
                      <div className="text-sm text-muted-foreground italic">
                        &quot;{swap.reason}&quot;
                      </div>
                    )}
                    <Badge variant="secondary" className={statusColor[swap.status] ?? ""}>
                      {swap.status}
                    </Badge>
                  </div>
                  {swap.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSwapAction(swap.id, "approve")}
                        disabled={loading === swap.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSwapAction(swap.id, "deny")}
                        disabled={loading === swap.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
