import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getBusinessBySlug, updateBusiness } from "@/lib/api";

export default function AdminBranding() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [draft, setDraft] = useState({
    name: business.name,
    description: business.description,
    heroImage: business.heroImage ?? "",
    hue: business.brandColors.hue,
  });

  function save() {
    updateBusiness(business.id, {
      name: draft.name,
      description: draft.description,
      heroImage: draft.heroImage || undefined,
      brandColors: { ...business.brandColors, hue: draft.hue },
    });
    toast.success("Branding saved");
  }

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight mb-1">Branding</h1>
      <p className="text-muted-foreground mb-6">Make your booking page yours.</p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 max-w-4xl">
        <Card className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Business name</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Hero image URL</Label>
            <Input value={draft.heroImage} onChange={(e) => setDraft({ ...draft, heroImage: e.target.value })} placeholder="https://images.unsplash.com/..." />
          </div>
          <div className="space-y-1.5">
            <Label>Brand hue · {draft.hue}°</Label>
            <input type="range" min={0} max={360} value={draft.hue} onChange={(e) => setDraft({ ...draft, hue: Number(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, oklch(0.7 0.18 0), oklch(0.7 0.18 60), oklch(0.7 0.18 120), oklch(0.7 0.18 180), oklch(0.7 0.18 240), oklch(0.7 0.18 300), oklch(0.7 0.18 360))` }}
            />
          </div>
          <Button onClick={save} size="lg">Save changes</Button>
        </Card>

        <div>
          <p className="text-sm font-medium mb-3">Live preview</p>
          <Card className="overflow-hidden" style={{ ["--primary" as any]: `${draft.hue} 35% 46%` }}>
            <div className="aspect-[4/3] bg-muted">
              {draft.heroImage && <img src={draft.heroImage} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{draft.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{draft.description}</p>
              <Button size="sm" className="mt-3 w-full" style={{ background: `hsl(${draft.hue} 35% 46%)`, color: "hsl(var(--primary-foreground))" }}>
                Book now
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
