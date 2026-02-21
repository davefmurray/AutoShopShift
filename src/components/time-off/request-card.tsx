"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Ban } from "lucide-react";
import type { TimeOffRequest } from "@/hooks/use-time-off";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function RequestCard({
  request,
  isAdmin,
  isSelf,
  loading,
  onApprove,
  onDeny,
  onCancel,
}: {
  request: TimeOffRequest;
  isAdmin: boolean;
  isSelf: boolean;
  loading: boolean;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="font-medium">
            {request.profile?.full_name ?? "Unknown"}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(request.start_date), "MMM d, yyyy")}
            {request.start_date !== request.end_date &&
              ` - ${format(new Date(request.end_date), "MMM d, yyyy")}`}
          </div>
          <div className="text-sm text-muted-foreground">
            {request.hours_requested} hours
          </div>
          {request.reason && (
            <div className="text-sm text-muted-foreground italic">
              &quot;{request.reason}&quot;
            </div>
          )}
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className={statusColor[request.status] ?? ""}
            >
              {request.status}
            </Badge>
            {request.status === "approved" && request.is_paid !== null && (
              <Badge variant="outline">
                {request.is_paid ? "Paid" : "Unpaid"}
              </Badge>
            )}
          </div>
          {request.reviewer_notes && (
            <div className="text-sm text-muted-foreground">
              Note: {request.reviewer_notes}
            </div>
          )}
        </div>
        {request.status === "pending" && (
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  onClick={() => onApprove(request.id)}
                  disabled={loading}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeny(request.id)}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Deny
                </Button>
              </>
            )}
            {isSelf && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel(request.id)}
                disabled={loading}
              >
                <Ban className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
