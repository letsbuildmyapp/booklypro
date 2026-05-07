import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBusinessBySlug, setBusinessTier } from "@/lib/api";
import type { Tier } from "@/lib/types";

const TIERS: Array<{ id: Tier; name: string; price: number; perks: string[] }> = [
  { id: "solo", name: "Solo", price: 19, perks: ["1 staff", "1 location", "Email reminders", "Stripe deposits"] },
  { id: "team", name: "Team", price: 59, perks: ["10 staff", "3 locations", "SMS reminders", "Cancellation policy"] },
  { id: "pro", name: "Pro", price: 149, perks: ["Unlimited staff & locations", "AI scheduling assistant", "Custom branding", "No platform footer"] },
];

export default function AdminBilling() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;

  function pick(tier: Tier) {
    // Demo: skip Stripe Checkout, flip the tier flag.
    // Production: redirect to Stripe Checkout, finalize via webhook.
    setBusinessTier(business.id, tier);
    toast.success(`Now on ${tier} tier · Stripe test mode`);
  }

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight mb-1">Billing</h1>
      <p className="text-muted-foreground mb-6">Pick the tier that fits. {business.subscriptionStatus === "active" ? "Your subscription is active." : `Status: ${business.subscriptionStatus}.`}</p>

      <div className="grid md:grid-cols-3 gap-4 max-w-5xl">
        {TIERS.map((t) => {
          const current = business.tier === t.id;
          return (
            <Card key={t.id} className={`p-6 ${current ? "border-primary ring-2 ring-primary/30" : ""}`}>
              {current && <Badge variant="default" className="mb-3">Current plan</Badge>}
              <h3 className="text-title2 font-semibold">{t.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums">${t.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />{p}</li>
                ))}
              </ul>
              <Button className="w-full mt-6" disabled={current} onClick={() => pick(t.id)}>
                {current ? "Currently on this plan" : `Switch to ${t.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 mt-6 max-w-3xl bg-secondary/40 border-none">
        <h3 className="font-semibold text-headline">Stripe Customer Portal</h3>
        <p className="text-sm text-muted-foreground mt-1">Manage payment methods, invoices, and cancel from Stripe's hosted portal.</p>
        <Button variant="outline" className="mt-4" onClick={() => toast.info("Portal would open in a new tab. Wire STRIPE_SECRET_KEY in functions/.env.")}>
          Open portal
        </Button>
      </Card>
    </div>
  );
}
