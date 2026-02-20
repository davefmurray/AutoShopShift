"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useUser } from "@/hooks/use-user";
import { clockIn, clockOut, startBreak, endBreak } from "@/actions/time-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInMinutes, startOfWeek, endOfWeek } from "date-fns";
import { useState, useEffect } from "react";
import { Clock, Coffee, LogOut, Plus } from "lucide-react";
import { ManualEntryDialog } from "@/components/time-clock/manual-entry-dialog";

export default function TimeClockPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const { data: user } = useUser(shopId ?? undefined);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [manualOpen, setManualOpen] = useState(false);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Active time record
  const { data: activeRecord } = useQuery({
    queryKey: ["active-time-record", shopId, user?.id],
    queryFn: async () => {
      if (!shopId || !user?.id) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("time_records")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user.id)
        .in("status", ["clocked_in", "on_break"])
        .single();
      return data;
    },
    enabled: !!shopId && !!user?.id,
    refetchInterval: 30000,
  });

  // Weekly time records
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  const { data: weekRecords = [] } = useQuery({
    queryKey: ["time-records", shopId, user?.id, weekStart.toISOString()],
    queryFn: async () => {
      if (!shopId || !user?.id) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("time_records")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user.id)
        .gte("clock_in", weekStart.toISOString())
        .lte("clock_in", weekEnd.toISOString())
        .order("clock_in", { ascending: false });
      return data ?? [];
    },
    enabled: !!shopId && !!user?.id,
  });

  const isActive = !!activeRecord;
  const isOnBreak = (activeRecord as { status?: string } | null)?.status === "on_break";

  const elapsed = activeRecord
    ? differenceInMinutes(now, new Date((activeRecord as { clock_in: string }).clock_in))
    : 0;
  const hours = Math.floor(elapsed / 60);
  const minutes = elapsed % 60;

  // Weekly total hours
  const weeklyMinutes = weekRecords.reduce((total: number, record: { clock_in: string; clock_out: string | null }) => {
    const clockOutTime = record.clock_out ? new Date(record.clock_out) : new Date();
    return total + differenceInMinutes(clockOutTime, new Date(record.clock_in));
  }, 0);
  const weeklyHours = (weeklyMinutes / 60).toFixed(1);

  async function handleClockIn() {
    if (!shopId) return;
    setLoading(true);
    await clockIn(shopId);
    await queryClient.invalidateQueries({ queryKey: ["active-time-record"] });
    await queryClient.invalidateQueries({ queryKey: ["time-records"] });
    setLoading(false);
  }

  async function handleClockOut() {
    if (!activeRecord) return;
    setLoading(true);
    await clockOut((activeRecord as { id: string }).id);
    await queryClient.invalidateQueries({ queryKey: ["active-time-record"] });
    await queryClient.invalidateQueries({ queryKey: ["time-records"] });
    setLoading(false);
  }

  async function handleBreak() {
    if (!activeRecord) return;
    setLoading(true);
    if (isOnBreak) {
      await endBreak((activeRecord as { id: string }).id);
    } else {
      await startBreak((activeRecord as { id: string }).id);
    }
    await queryClient.invalidateQueries({ queryKey: ["active-time-record"] });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Time Clock</h1>
        {user?.role !== "technician" && (
          <Button variant="outline" onClick={() => setManualOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
        )}
      </div>

      {/* Clock widget */}
      <Card className="mx-auto max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="text-4xl font-mono font-bold">
            {format(now, "h:mm:ss a")}
          </div>

          {isActive && (
            <div>
              <div className="text-lg text-muted-foreground">
                {hours}h {minutes}m elapsed
              </div>
              {isOnBreak && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 mt-1">
                  On Break
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {!isActive ? (
              <Button
                size="lg"
                className="w-40"
                onClick={handleClockIn}
                disabled={loading}
              >
                <Clock className="mr-2 h-5 w-5" />
                Clock In
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleBreak}
                  disabled={loading}
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  {isOnBreak ? "End Break" : "Break"}
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleClockOut}
                  disabled={loading}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Clock Out
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>This Week</span>
            <span className="text-lg font-normal text-muted-foreground">
              {weeklyHours} hours
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {weekRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No time records this week.
              </p>
            ) : (
              weekRecords.map((record: { id: string; clock_in: string; clock_out: string | null; status: string; is_manual: boolean }) => {
                const dur = record.clock_out
                  ? differenceInMinutes(
                      new Date(record.clock_out),
                      new Date(record.clock_in)
                    )
                  : differenceInMinutes(now, new Date(record.clock_in));
                const h = Math.floor(dur / 60);
                const m = dur % 60;

                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="font-medium">
                        {format(new Date(record.clock_in), "EEE, MMM d")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(record.clock_in), "h:mm a")} -{" "}
                        {record.clock_out
                          ? format(new Date(record.clock_out), "h:mm a")
                          : "Active"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {h}h {m}m
                      </div>
                      <div className="flex gap-1">
                        {record.status !== "clocked_out" && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Active
                          </Badge>
                        )}
                        {record.is_manual && (
                          <Badge variant="outline" className="text-xs">
                            Manual
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <ManualEntryDialog open={manualOpen} onOpenChange={setManualOpen} />
    </div>
  );
}
