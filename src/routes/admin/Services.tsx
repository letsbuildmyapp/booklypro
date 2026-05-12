import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createService, deleteService, getBusinessBySlug, listLocations, listServices, listStaff, subscribe, updateService } from "@/lib/api";
import { streamServiceDescription } from "@/lib/ai";
import { formatDuration, formatPriceCents } from "@/lib/utils";
import type { DepositType, Service } from "@/lib/types";

export default function AdminServices() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const services = listServices(business.id);
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1">What customers can book — pricing, duration, deposits.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add service</Button>
      </div>

      <div className="grid gap-3">
        {services.map((s) => (
          <Card key={s.id} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-headline truncate">{s.name}</h3>
                  {!s.active && <Badge variant="muted">Hidden</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                  <Edit className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteService(s.id); }}
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Uniform meta row: duration · price · staff, then deposit badge below */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums">
              <span className="text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-semibold">{formatPriceCents(s.priceCents)}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-muted-foreground">{s.eligibleStaffIds.length} staff</span>
            </div>
            {s.depositType !== "none" && (
              <div className="mt-2">
                <Badge variant="accent" className="text-[11px]">
                  {s.depositType === "percent" ? `${s.depositAmount}% deposit` : `${formatPriceCents(s.depositAmount)} deposit`}
                </Badge>
              </div>
            )}
          </Card>
        ))}
      </div>

      {(editing || creating) && (
        <ServiceFormDialog
          businessId={business.id}
          tone={business.description}
          service={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function ServiceFormDialog({ businessId, service, onClose, tone }: { businessId: string; service: Service | null; onClose: () => void; tone: string }) {
  const staff = listStaff(businessId);
  const locations = listLocations(businessId);

  const [draft, setDraft] = useState<Omit<Service, "id" | "businessId" | "sortOrder"> & { id?: string }>({
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMinutes: service?.durationMinutes ?? 60,
    bufferBeforeMinutes: service?.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: service?.bufferAfterMinutes ?? 10,
    priceCents: service?.priceCents ?? 5000,
    depositType: service?.depositType ?? "none",
    depositAmount: service?.depositAmount ?? 0,
    eligibleStaffIds: service?.eligibleStaffIds ?? staff.map((s) => s.userId),
    eligibleLocationIds: service?.eligibleLocationIds ?? locations.map((l) => l.id),
    color: service?.color ?? "primary",
    active: service?.active ?? true,
  });
  const [aiLoading, setAiLoading] = useState(false);

  async function generateDescription() {
    if (!draft.name) { toast.error("Add a service name first"); return; }
    setAiLoading(true);
    try {
      let last = "";
      for await (const chunk of streamServiceDescription({
        serviceName: draft.name,
        businessTone: tone,
        durationMinutes: draft.durationMinutes,
      })) {
        last = chunk;
        setDraft((d) => ({ ...d, description: chunk }));
      }
      if (last) toast.success("Drafted with AI");
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally { setAiLoading(false); }
  }

  function save() {
    if (service) {
      updateService(service.id, { ...draft });
      toast.success("Service updated");
    } else {
      createService({ businessId, ...draft } as any);
      toast.success("Service created");
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "Create service"}</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <Button variant="ghost" size="sm" onClick={generateDescription} disabled={aiLoading}>
                <Sparkles className="h-3.5 w-3.5" /> {aiLoading ? "Drafting…" : "AI draft"}
              </Button>
            </div>
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (min)</Label>
            <Input type="number" min={5} step={5} value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Price (USD)</Label>
            <Input type="number" min={0} step={1} value={draft.priceCents / 100} onChange={(e) => setDraft({ ...draft, priceCents: Math.round(Number(e.target.value) * 100) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Buffer before (min)</Label>
            <Input type="number" min={0} value={draft.bufferBeforeMinutes} onChange={(e) => setDraft({ ...draft, bufferBeforeMinutes: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Buffer after (min)</Label>
            <Input type="number" min={0} value={draft.bufferAfterMinutes} onChange={(e) => setDraft({ ...draft, bufferAfterMinutes: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Deposit type</Label>
            <Select value={draft.depositType} onValueChange={(v) => setDraft({ ...draft, depositType: v as DepositType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="percent">Percent of price</SelectItem>
                <SelectItem value="flat">Flat amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Deposit amount {draft.depositType === "percent" ? "(%)" : draft.depositType === "flat" ? "(USD)" : ""}</Label>
            <Input
              type="number" min={0}
              value={draft.depositType === "flat" ? draft.depositAmount / 100 : draft.depositAmount}
              onChange={(e) => setDraft({ ...draft, depositAmount: draft.depositType === "flat" ? Math.round(Number(e.target.value) * 100) : Number(e.target.value) })}
              disabled={draft.depositType === "none"}
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-2xl bg-secondary/40 p-4">
            <div>
              <Label className="font-semibold">Active</Label>
              <p className="text-xs text-muted-foreground">Show this service on the public booking page.</p>
            </div>
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Eligible staff</Label>
            <div className="flex flex-wrap gap-2">
              {staff.map((s) => {
                const on = draft.eligibleStaffIds.includes(s.userId);
                return (
                  <button
                    key={s.id}
                    onClick={() => setDraft({ ...draft, eligibleStaffIds: on ? draft.eligibleStaffIds.filter((id) => id !== s.userId) : [...draft.eligibleStaffIds, s.userId] })}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                  >
                    {s.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
