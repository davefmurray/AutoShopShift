"use client";

import { useState } from "react";
import { useShopStore } from "@/stores/shop-store";
import { useUser } from "@/hooks/use-user";
import {
  useTimeOffRequests,
  usePtoBalance,
  useTeamPtoBalances,
  type TimeOffRequest,
} from "@/hooks/use-time-off";
import { cancelTimeOff } from "@/actions/time-off";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestTimeOffDialog } from "@/components/time-off/request-dialog";
import { RequestCard } from "@/components/time-off/request-card";
import { ApprovalDialog } from "@/components/time-off/approval-dialog";
import { Plus } from "lucide-react";

export default function TimeOffPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const { data: currentUser } = useUser(shopId ?? undefined);
  const { data: requests = [], isLoading } = useTimeOffRequests();
  const { data: balance } = usePtoBalance();
  const { data: teamBalances = [] } = useTeamPtoBalances();

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<TimeOffRequest | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "manager";
  const userId = currentUser?.id;

  const pendingRequests = requests.filter((r) => r.status === "pending");

  async function handleCancel(requestId: string) {
    setLoading(requestId);
    await cancelTimeOff(requestId);
    await queryClient.invalidateQueries({ queryKey: ["time-off-requests", shopId] });
    await queryClient.invalidateQueries({ queryKey: ["pto-balance"] });
    setLoading(null);
  }

  function handleApprove(requestId: string) {
    const req = requests.find((r) => r.id === requestId);
    if (req) setApprovalRequest(req);
  }

  function handleDeny(requestId: string) {
    const req = requests.find((r) => r.id === requestId);
    if (req) setApprovalRequest(req);
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading time off...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Time Off</h1>
        <Button onClick={() => setRequestDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Request Time Off
        </Button>
      </div>

      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accrued
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.hours_accrued}</div>
              <p className="text-xs text-muted-foreground">hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.hours_used}</div>
              <p className="text-xs text-muted-foreground">hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.hours_pending}</div>
              <p className="text-xs text-muted-foreground">hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.hours_available}</div>
              <p className="text-xs text-muted-foreground">hours</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          {isAdmin && <TabsTrigger value="team">Team Balances</TabsTrigger>}
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No pending requests.
            </p>
          ) : (
            pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                isAdmin={isAdmin}
                isSelf={request.user_id === userId}
                loading={loading === request.id}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onCancel={handleCancel}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No time off requests yet.
            </p>
          ) : (
            requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                isAdmin={isAdmin}
                isSelf={request.user_id === userId}
                loading={loading === request.id}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onCancel={handleCancel}
              />
            ))
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team">
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-3 font-medium">Team Member</th>
                      <th className="p-3 font-medium text-right">Accrued</th>
                      <th className="p-3 font-medium text-right">Used</th>
                      <th className="p-3 font-medium text-right">Pending</th>
                      <th className="p-3 font-medium text-right">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamBalances.map((member) => (
                      <tr key={member.user_id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{member.full_name}</td>
                        <td className="p-3 text-right">{member.hours_accrued}</td>
                        <td className="p-3 text-right">{member.hours_used}</td>
                        <td className="p-3 text-right">{member.hours_pending}</td>
                        <td className="p-3 text-right font-medium">
                          {member.hours_available}
                        </td>
                      </tr>
                    ))}
                    {teamBalances.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No team members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <RequestTimeOffDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
      />

      <ApprovalDialog
        request={approvalRequest}
        open={!!approvalRequest}
        onOpenChange={(open) => {
          if (!open) setApprovalRequest(null);
        }}
      />
    </div>
  );
}
