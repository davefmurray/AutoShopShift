"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { usePositions } from "@/hooks/use-shifts";
import {
  createShiftTemplate,
  deleteShiftTemplate,
  createScheduleTemplate,
  deleteScheduleTemplate,
  applyScheduleTemplate,
} from "@/actions/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play } from "lucide-react";
import { useState } from "react";
import { format, startOfWeek, addWeeks } from "date-fns";

type ShiftTemplate = {
  id: string;
  name: string;
  position_id: string | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
};

type ScheduleTemplate = {
  id: string;
  name: string;
  created_at: string;
};

export default function TemplatesPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const { data: positions = [] } = usePositions();

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Shift template form
  const [stName, setStName] = useState("");
  const [stPositionId, setStPositionId] = useState("none");
  const [stStart, setStStart] = useState("08:00");
  const [stEnd, setStEnd] = useState("17:00");
  const [stBreak, setStBreak] = useState("30");

  // Schedule template form
  const [scName, setScName] = useState("");

  // Apply form
  const [applyDate, setApplyDate] = useState(
    format(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 0 }), "yyyy-MM-dd")
  );

  const { data: shiftTemplates = [] } = useQuery({
    queryKey: ["shift-templates", shopId],
    queryFn: async (): Promise<ShiftTemplate[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("shop_id", shopId)
        .order("name");
      return (data as ShiftTemplate[]) ?? [];
    },
    enabled: !!shopId,
  });

  const { data: scheduleTemplates = [] } = useQuery({
    queryKey: ["schedule-templates", shopId],
    queryFn: async (): Promise<ScheduleTemplate[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("schedule_templates")
        .select("*")
        .eq("shop_id", shopId)
        .order("name");
      return (data as ScheduleTemplate[]) ?? [];
    },
    enabled: !!shopId,
  });

  async function handleCreateShiftTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setLoading(true);
    await createShiftTemplate({
      shop_id: shopId,
      name: stName,
      position_id: stPositionId === "none" ? undefined : stPositionId,
      start_time: stStart,
      end_time: stEnd,
      break_minutes: parseInt(stBreak) || 0,
    });
    await queryClient.invalidateQueries({ queryKey: ["shift-templates", shopId] });
    setStName("");
    setLoading(false);
    setShiftDialogOpen(false);
  }

  async function handleDeleteShiftTemplate(id: string) {
    await deleteShiftTemplate(id);
    await queryClient.invalidateQueries({ queryKey: ["shift-templates", shopId] });
  }

  async function handleCreateScheduleTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setLoading(true);
    await createScheduleTemplate({ shop_id: shopId, name: scName });
    await queryClient.invalidateQueries({ queryKey: ["schedule-templates", shopId] });
    setScName("");
    setLoading(false);
    setScheduleDialogOpen(false);
  }

  async function handleDeleteScheduleTemplate(id: string) {
    await deleteScheduleTemplate(id);
    await queryClient.invalidateQueries({ queryKey: ["schedule-templates", shopId] });
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !applyTemplateId) return;
    setLoading(true);
    await applyScheduleTemplate(applyTemplateId, shopId, applyDate);
    setLoading(false);
    setApplyDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Templates</h1>

      <Tabs defaultValue="shift">
        <TabsList>
          <TabsTrigger value="shift">Shift Templates</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="shift" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShiftDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Shift Template
            </Button>
          </div>

          {shiftTemplates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No shift templates yet. Create one to save reusable shift patterns.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shiftTemplates.map((t) => {
                const pos = (positions as { id: string; name: string; color: string }[]).find(
                  (p) => p.id === t.position_id
                );
                return (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {t.start_time} - {t.end_time}
                          </div>
                          {t.break_minutes > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {t.break_minutes}min break
                            </div>
                          )}
                          {pos && (
                            <Badge
                              variant="outline"
                              className="mt-1 text-xs"
                              style={{ borderColor: pos.color, color: pos.color }}
                            >
                              {pos.name}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteShiftTemplate(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setScheduleDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Schedule Template
            </Button>
          </div>

          {scheduleTemplates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No schedule templates yet. Create one to build reusable weekly schedules.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scheduleTemplates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Created {format(new Date(t.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setApplyTemplateId(t.id);
                            setApplyDialogOpen(true);
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteScheduleTemplate(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Shift Template Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Shift Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateShiftTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={stName}
                onChange={(e) => setStName(e.target.value)}
                placeholder="Morning shift"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={stStart}
                  onChange={(e) => setStStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={stEnd}
                  onChange={(e) => setStEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={stPositionId} onValueChange={setStPositionId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(positions as { id: string; name: string }[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Break (min)</Label>
              <Input
                type="number"
                value={stBreak}
                onChange={(e) => setStBreak(e.target.value)}
                min="0"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Schedule Template Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Schedule Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateScheduleTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={scName}
                onChange={(e) => setScName(e.target.value)}
                placeholder="Standard week"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Schedule Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-2">
              <Label>Week starting</Label>
              <Input
                type="date"
                value={applyDate}
                onChange={(e) => setApplyDate(e.target.value)}
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This will create draft shifts for the selected week based on the template entries.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Applying..." : "Apply Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
