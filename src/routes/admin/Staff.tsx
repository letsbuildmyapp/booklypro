import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createStaffInvite, getBusinessBySlug, listLocations, listServices, listStaff, subscribe } from "@/lib/api";
import { mutate } from "@/lib/store";
import { initials } from "@/lib/utils";

export default function AdminStaff() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);
  const staff = listStaff(business.id);
  const services = listServices(business.id);
  const locations = listLocations(business.id);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1">Invite team members and assign services and locations.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /> Invite staff</Button>
      </div>

      <div className="grid gap-3 max-w-3xl">
        {staff.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <Avatar className="h-12 w-12">
                {s.avatar && <AvatarImage src={s.avatar} alt="" />}
                <AvatarFallback>{initials(s.displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-headline">{s.displayName}</h3>
                  {!s.active && <Badge variant="muted">Inactive</Badge>}
                  {s.userId === business.ownerUserId && <Badge variant="accent">Owner</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.bio || "No bio yet."}</p>
                <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {s.serviceIds.length} services · {s.locationIds.length} location{s.locationIds.length === 1 ? "" : "s"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                mutate((store) => {
                  const sp = store.staff.find((x) => x.id === s.id);
                  if (sp) sp.active = !sp.active;
                });
                toast.success(`${s.displayName} ${s.active ? "deactivated" : "reactivated"}`);
              }}>
                {s.active ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} businessId={business.id} services={services} locations={locations} />
    </div>
  );
}

function InviteDialog({ open, onClose, businessId, services, locations }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>(services.map((s: any) => s.id));
  const [locationIds, setLocationIds] = useState<string[]>(locations.map((l: any) => l.id));

  function submit() {
    if (!name || !email) return toast.error("Name and email required");
    createStaffInvite({ businessId, displayName: name, email, serviceIds, locationIds });
    toast.success(`Invite sent to ${email} (auto-accepted in demo mode)`);
    setName(""); setEmail("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a staff member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="text-xs text-muted-foreground"><Mail className="h-3 w-3 inline" /> They'll get a magic-link invite.</p>
          </div>
          <div className="space-y-2">
            <Label>Services they can perform</Label>
            <div className="flex flex-wrap gap-2">
              {services.map((s: any) => {
                const on = serviceIds.includes(s.id);
                return (
                  <button key={s.id} onClick={() => setServiceIds(on ? serviceIds.filter((x: string) => x !== s.id) : [...serviceIds, s.id])}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Send invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
