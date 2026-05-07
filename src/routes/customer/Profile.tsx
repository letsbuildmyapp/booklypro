import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { mutate } from "@/lib/store";

export default function CustomerProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ displayName: user?.displayName ?? "", phone: user?.phone ?? "", timezone: user?.timezone ?? "" });

  if (!user) return null;

  function save() {
    mutate((s) => {
      const u = s.users.find((x) => x.id === user!.id);
      if (u) Object.assign(u, form);
    });
    toast.success("Profile updated");
  }

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight">Profile</h1>
      <p className="text-muted-foreground mt-1 mb-6">Your account, your timezone.</p>

      <Card className="p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-headline">{user.email}</div>
            <div className="text-xs text-muted-foreground">Member since {new Date(user.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tz">Timezone</Label>
            <Input id="tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="America/New_York" />
            <p className="text-xs text-muted-foreground">All booking times in your inbox use this timezone.</p>
          </div>
        </div>
        <Button size="lg" onClick={save} className="mt-6">Save changes</Button>
      </Card>
    </div>
  );
}
