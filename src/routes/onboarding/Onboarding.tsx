import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { mutate } from "@/lib/store";
import { newId } from "@/lib/store";
import { browserTimezone } from "@/lib/time";
import { slugify } from "@/lib/utils";
import type { Business, Service, StaffProfile, Location } from "@/lib/types";

export default function OnboardBusinessPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    name: "", description: "", address: "", phone: "", timezone: browserTimezone(),
    serviceName: "", serviceDuration: 60, servicePrice: 5000,
  });

  function finish() {
    if (!draft.name) return toast.error("Business name required");
    const bizId = newId("biz");
    const slug = slugify(draft.name);
    mutate((s) => {
      const u = s.users.find((x) => x.id === user!.id)!;
      if (!u.roles.includes("admin")) u.roles.push("admin");
      u.memberOf = Array.from(new Set([...(u.memberOf ?? []), bizId]));
      const business: Business = {
        id: bizId, slug, name: draft.name, description: draft.description,
        timezone: draft.timezone, address: draft.address, phone: draft.phone,
        ownerUserId: u.id, staffUserIds: [u.id],
        status: "active", tier: "solo", subscriptionStatus: "trialing",
        brandColors: { hue: 152 }, cancellationPolicy: { hoursBefore: 24, chargePercent: 0 },
        showPlatformFooter: true, createdAt: new Date().toISOString(),
      };
      s.businesses.push(business);
      const loc: Location = { id: newId("loc"), businessId: bizId, name: "Primary location", address: draft.address, timezone: draft.timezone, active: true };
      s.locations.push(loc);
      const svc: Service = {
        id: newId("svc"), businessId: bizId, name: draft.serviceName || "Initial consultation",
        description: "Edit me to describe what customers get.", durationMinutes: draft.serviceDuration,
        bufferBeforeMinutes: 0, bufferAfterMinutes: 10, priceCents: draft.servicePrice,
        depositType: "none", depositAmount: 0,
        eligibleStaffIds: [u.id], eligibleLocationIds: [loc.id],
        color: "primary", active: true, sortOrder: 0,
      };
      s.services.push(svc);
      const staff: StaffProfile = {
        id: newId("staff"), userId: u.id, businessId: bizId,
        displayName: u.displayName, bio: "", avatar: u.avatar ?? "",
        serviceIds: [svc.id], locationIds: [loc.id], active: true, sortOrder: 0,
      };
      s.staff.push(staff);
      s.availability.push({
        id: u.id, businessId: bizId,
        weeklySchedule: { sun: [], mon: [{ start: "09:00", end: "17:00" }], tue: [{ start: "09:00", end: "17:00" }], wed: [{ start: "09:00", end: "17:00" }], thu: [{ start: "09:00", end: "17:00" }], fri: [{ start: "09:00", end: "17:00" }], sat: [] },
        specialDates: {}, timeOff: [],
      });
    });
    toast.success("Welcome! Your business is live.");
    nav(`/admin/${slug}`);
  }

  const steps = [
    { title: "Business basics", body: <BasicsStep draft={draft} setDraft={setDraft} /> },
    { title: "First service", body: <ServiceStep draft={draft} setDraft={setDraft} /> },
    { title: "All set", body: <ReviewStep draft={draft} /> },
  ];

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="container py-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="container max-w-2xl pb-20">
        <div className="flex items-center gap-3 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`grid place-items-center h-7 w-7 rounded-full text-xs font-semibold tabular-nums ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</span>
              {i < steps.length - 1 && <div className={`h-px w-6 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8">
          <h2 className="text-title2 font-semibold mb-1">{steps[step].title}</h2>
          <div className="mt-5">{steps[step].body}</div>
          <div className="mt-7 flex justify-between gap-3">
            {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
            {step < steps.length - 1
              ? <Button onClick={() => setStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button>
              : <Button onClick={finish}>Create my business</Button>
            }
          </div>
        </Card>
      </main>
    </div>
  );
}

function BasicsStep({ draft, setDraft }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Business name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Bloom & Co. Salon" /></div>
      <div className="space-y-1.5"><Label>Short description</Label><Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Address</Label><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Timezone</Label><Input value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} /></div>
    </div>
  );
}

function ServiceStep({ draft, setDraft }: any) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add one to get started — you can add more later.</p>
      <div className="space-y-1.5"><Label>Service name</Label><Input value={draft.serviceName} onChange={(e) => setDraft({ ...draft, serviceName: e.target.value })} placeholder="e.g. Cut & Style" /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" min={5} value={draft.serviceDuration} onChange={(e) => setDraft({ ...draft, serviceDuration: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label>Price (USD)</Label><Input type="number" min={0} value={draft.servicePrice / 100} onChange={(e) => setDraft({ ...draft, servicePrice: Math.round(Number(e.target.value) * 100) })} /></div>
      </div>
    </div>
  );
}

function ReviewStep({ draft }: any) {
  return (
    <div className="space-y-3 text-sm">
      <Row label="Business" value={draft.name} />
      <Row label="Description" value={draft.description || "—"} />
      <Row label="Address" value={draft.address || "—"} />
      <Row label="Timezone" value={draft.timezone} />
      <Row label="First service" value={`${draft.serviceName || "Initial consultation"} · ${draft.serviceDuration} min · $${(draft.servicePrice / 100).toFixed(2)}`} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
