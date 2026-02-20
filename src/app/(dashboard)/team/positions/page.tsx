"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

type Position = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

export default function PositionsPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);

  const { data: positions, isLoading } = useQuery({
    queryKey: ["positions", shopId],
    queryFn: async (): Promise<Position[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("positions")
        .select("*")
        .eq("shop_id", shopId)
        .order("sort_order");
      return (data as Position[]) ?? [];
    },
    enabled: !!shopId,
  });

  async function addPosition() {
    if (!shopId || !newName.trim()) return;
    setSaving(true);

    const supabase = createClient();
    await supabase.from("positions").insert({
      shop_id: shopId,
      name: newName.trim(),
      color: newColor,
      sort_order: (positions?.length ?? 0),
    });

    await queryClient.invalidateQueries({ queryKey: ["positions", shopId] });
    setNewName("");
    setNewColor("#3B82F6");
    setSaving(false);
  }

  async function deletePosition(id: string) {
    const supabase = createClient();
    await supabase.from("positions").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["positions", shopId] });
  }

  async function updatePosition(id: string, updates: Partial<Position>) {
    const supabase = createClient();
    await supabase.from("positions").update(updates).eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["positions", shopId] });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/team">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Positions</h1>
          <p className="text-muted-foreground">
            Manage job roles and their colors
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border p-0.5"
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Position name"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addPosition()}
            />
            <Button onClick={addPosition} disabled={saving || !newName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Loading positions...</div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {positions?.map((pos) => (
              <div
                key={pos.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <input
                  type="color"
                  value={pos.color}
                  onChange={(e) =>
                    updatePosition(pos.id, { color: e.target.value })
                  }
                  className="h-8 w-8 cursor-pointer rounded border p-0.5"
                />
                <Input
                  defaultValue={pos.name}
                  onBlur={(e) => {
                    if (e.target.value !== pos.name) {
                      updatePosition(pos.id, { name: e.target.value });
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePosition(pos.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {!positions?.length && (
              <div className="p-4 text-center text-muted-foreground">
                No positions yet. Add one above.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
