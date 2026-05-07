import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { getBusinessBySlug, listServices, listStaff, subscribe } from "@/lib/api";
import { mutate } from "@/lib/store";
import { formatDuration, formatPriceCents } from "@/lib/utils";

export default function StaffServices() {
  const { bizSlug = "" } = useParams();
  const { user } = useAuth();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const profile = listStaff(business.id).find((s) => s.userId === user!.id);
  const services = listServices(business.id);
  const [selected, setSelected] = useState<Set<string>>(new Set(profile?.serviceIds ?? []));

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function save() {
    mutate((s) => {
      const idx = s.staff.findIndex((sp) => sp.userId === user!.id && sp.businessId === business.id);
      if (idx >= 0) s.staff[idx].serviceIds = Array.from(selected);
    });
    toast.success("Updated which services you perform");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">My services</h1>
          <p className="text-muted-foreground mt-1">Pick which services you'll show up for.</p>
        </div>
        <Button onClick={save}>Save preferences</Button>
      </div>

      <div className="grid gap-3 max-w-2xl">
        {services.map((s) => {
          const eligible = s.eligibleStaffIds.includes(user!.id);
          return (
            <Card key={s.id} className={`p-5 ${!eligible ? "opacity-60" : ""}`}>
              <label className="flex items-start gap-4 cursor-pointer">
                <Checkbox checked={selected.has(s.id)} onCheckedChange={() => eligible && toggle(s.id)} disabled={!eligible} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-headline">{s.name}</h3>
                    {!eligible && <Badge variant="muted">Admin hasn't enabled this service for you</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                  <div className="mt-2 text-sm text-muted-foreground tabular-nums">{formatDuration(s.durationMinutes)} · {formatPriceCents(s.priceCents)}</div>
                </div>
              </label>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
