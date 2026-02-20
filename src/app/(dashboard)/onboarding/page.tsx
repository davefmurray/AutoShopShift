"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const DEFAULT_POSITIONS = [
  { name: "Lead Technician", color: "#EF4444" },
  { name: "General Technician", color: "#3B82F6" },
  { name: "Service Advisor", color: "#10B981" },
  { name: "Express Lube Tech", color: "#F59E0B" },
  { name: "Apprentice", color: "#8B5CF6" },
];

type Step = "shop" | "positions" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setActiveShopId = useShopStore((s) => s.setActiveShopId);

  const [step, setStep] = useState<Step>("shop");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shop form
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");

  // Positions
  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [shopId, setShopId] = useState<string | null>(null);

  async function handleCreateShop(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Generate shop ID client-side so we can insert shop + member
    // without needing to SELECT the shop back (blocked by RLS until member exists)
    const newShopId = crypto.randomUUID();

    // Create the shop
    const { error: shopError } = await supabase
      .from("shops")
      .insert({ id: newShopId, name: shopName, address, city, state, zip, phone, timezone });

    if (shopError) {
      setError(shopError.message);
      setLoading(false);
      return;
    }

    // Add current user as owner
    const { error: memberError } = await supabase
      .from("shop_members")
      .insert({ shop_id: newShopId, user_id: user.id, role: "owner" });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    setShopId(newShopId);
    setActiveShopId(newShopId);
    setStep("positions");
    setLoading(false);
  }

  async function handleCreatePositions() {
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: posError } = await supabase.from("positions").insert(
      positions.map((p, i) => ({
        shop_id: shopId,
        name: p.name,
        color: p.color,
        sort_order: i,
      }))
    );

    if (posError) {
      setError(posError.message);
      setLoading(false);
      return;
    }

    // Also create a default schedule
    await supabase
      .from("schedules")
      .insert({ shop_id: shopId, name: "Main Floor", color: "#6366F1" });

    await queryClient.invalidateQueries({ queryKey: ["shops"] });
    setStep("done");
    setLoading(false);
  }

  function removePosition(index: number) {
    setPositions(positions.filter((_, i) => i !== index));
  }

  function addPosition() {
    setPositions([...positions, { name: "", color: "#6B7280" }]);
  }

  if (step === "done") {
    return (
      <div className="mx-auto max-w-lg py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
            <CardDescription>
              Your shop is ready. Start by creating your schedule.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push("/schedule")}>
              Go to Schedule
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === "positions") {
    return (
      <div className="mx-auto max-w-lg py-12">
        <Card>
          <CardHeader>
            <CardTitle>Set up positions</CardTitle>
            <CardDescription>
              Define the job roles at your shop. You can change these later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {positions.map((pos, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={pos.color}
                  onChange={(e) => {
                    const updated = [...positions];
                    updated[i] = { ...pos, color: e.target.value };
                    setPositions(updated);
                  }}
                  className="h-9 w-9 cursor-pointer rounded border p-0.5"
                />
                <Input
                  value={pos.name}
                  onChange={(e) => {
                    const updated = [...positions];
                    updated[i] = { ...pos, name: e.target.value };
                    setPositions(updated);
                  }}
                  placeholder="Position name"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePosition(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addPosition}>
              Add position
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep("shop")}>
              Back
            </Button>
            <Button onClick={handleCreatePositions} disabled={loading}>
              {loading ? "Creating..." : "Continue"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create your shop</CardTitle>
          <CardDescription>
            Set up your auto repair shop to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="shop-form"
            onSubmit={handleCreateShop}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="shop-name">Shop name *</Label>
              <Input
                id="shop-name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Main Street Auto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street"
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
                placeholder="(555) 555-0100"
              />
            </div>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" form="shop-form" disabled={loading}>
            {loading ? "Creating..." : "Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
