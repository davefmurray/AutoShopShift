"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useDepartments, type Department } from "@/hooks/use-time-off";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/actions/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export default function SettingsPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");

  // Department state
  const { data: departments = [] } = useDepartments();
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptRate, setNewDeptRate] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRate, setEditRate] = useState("");

  const { isLoading } = useQuery({
    queryKey: ["shop-settings", shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (data) {
        const shop = data as {
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          phone: string | null;
          timezone: string;
        };
        setName(shop.name);
        setAddress(shop.address ?? "");
        setCity(shop.city ?? "");
        setState(shop.state ?? "");
        setZip(shop.zip ?? "");
        setPhone(shop.phone ?? "");
        setTimezone(shop.timezone);
      }
      return data;
    },
    enabled: !!shopId,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("shops")
      .update({ name, address, city, state, zip, phone, timezone })
      .eq("id", shopId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["shops"] });
    await queryClient.invalidateQueries({ queryKey: ["shop-settings", shopId] });
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleAddDepartment() {
    if (!shopId || !newDeptName.trim()) return;
    setDeptSaving(true);
    setDeptError(null);

    const result = await createDepartment({
      shop_id: shopId,
      name: newDeptName.trim(),
      pto_accrual_rate: newDeptRate ? parseFloat(newDeptRate) : 0,
    });

    if (result.error) {
      setDeptError(result.error);
    } else {
      setNewDeptName("");
      setNewDeptRate("");
      await queryClient.invalidateQueries({ queryKey: ["departments", shopId] });
    }
    setDeptSaving(false);
  }

  async function handleUpdateDepartment(dept: Department) {
    setDeptSaving(true);
    setDeptError(null);

    const result = await updateDepartment(dept.id, {
      name: editName.trim() || dept.name,
      pto_accrual_rate: editRate ? parseFloat(editRate) : dept.pto_accrual_rate,
    });

    if (result.error) {
      setDeptError(result.error);
    } else {
      setEditingDept(null);
      await queryClient.invalidateQueries({ queryKey: ["departments", shopId] });
    }
    setDeptSaving(false);
  }

  async function handleDeleteDepartment(id: string) {
    setDeptSaving(true);
    setDeptError(null);

    const result = await deleteDepartment(id);
    if (result.error) {
      setDeptError(result.error);
    } else {
      await queryClient.invalidateQueries({ queryKey: ["departments", shopId] });
    }
    setDeptSaving(false);
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>
            Update your shop name, address, and timezone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="settings-form" onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop-name">Shop name</Label>
              <Input
                id="shop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="tz">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Settings saved!</p>
            )}
          </div>
          <Button type="submit" form="settings-form" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            Manage departments and their PTO accrual rates (hours earned per week
            worked)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {departments.length > 0 && (
            <div className="space-y-2">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center gap-2 rounded-md border p-3"
                >
                  {editingDept === dept.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Department name"
                        className="flex-1"
                      />
                      <Input
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="PTO rate"
                        className="w-28"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateDepartment(dept)}
                        disabled={deptSaving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingDept(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{dept.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {dept.pto_accrual_rate} hrs/week
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingDept(dept.id);
                          setEditName(dept.name);
                          setEditRate(String(dept.pto_accrual_rate));
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDepartment(dept.id)}
                        disabled={deptSaving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="dept-name">New department</Label>
              <Input
                id="dept-name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Back Shop"
              />
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="dept-rate">PTO rate</Label>
              <Input
                id="dept-rate"
                value={newDeptRate}
                onChange={(e) => setNewDeptRate(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
            <Button
              onClick={handleAddDepartment}
              disabled={deptSaving || !newDeptName.trim()}
            >
              Add
            </Button>
          </div>

          {deptError && (
            <p className="text-sm text-destructive">{deptError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
