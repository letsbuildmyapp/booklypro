import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, CreditCard, Download, Receipt, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcessingModal } from "@/components/ProcessingModal";
import { cn } from "@/lib/utils";
import { getBusinessBySlug, setBusinessTier } from "@/lib/api";
import type { Tier } from "@/lib/types";

const TIERS: Array<{ id: Tier; name: string; price: number; perks: string[] }> = [
  { id: "solo", name: "Solo", price: 19, perks: ["1 staff", "1 location", "Email reminders", "Card deposits"] },
  { id: "team", name: "Team", price: 59, perks: ["10 staff", "3 locations", "SMS reminders", "Cancellation policy"] },
  { id: "pro", name: "Pro", price: 149, perks: ["Unlimited staff & locations", "AI scheduling assistant", "Custom branding", "No platform footer"] },
];

const PRICE_BY_TIER: Record<Tier, number> = { solo: 19, team: 59, pro: 149 };

export default function AdminBilling() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [portalOpen, setPortalOpen] = useState(false);

  const currentPrice = PRICE_BY_TIER[business.tier];

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight mb-1">Billing</h1>
      <p className="text-muted-foreground mb-6">
        Pick the tier that fits. {business.subscriptionStatus === "active" ? "Your subscription is active." : `Status: ${business.subscriptionStatus}.`}
      </p>

      <div className="grid md:grid-cols-3 gap-4 max-w-5xl items-stretch">
        {TIERS.map((t) => {
          const current = business.tier === t.id;
          return (
            <Card
              key={t.id}
              className={cn(
                "p-6 flex flex-col h-full",
                current && "border-primary ring-2 ring-primary/30",
              )}
            >
              <div className="flex items-center justify-between gap-2 min-h-[28px]">
                <h3 className="text-title2 font-semibold">{t.name}</h3>
                {current && (
                  <Badge variant="default" className="text-[10px] shrink-0">
                    Current plan
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums">${t.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-5 mb-8 space-y-2 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />{p}</li>
                ))}
              </ul>
              <Button
                className="w-full mt-auto"
                disabled={current || pendingTier !== null}
                onClick={() => setPendingTier(t.id)}
              >
                {current ? "Currently on this plan" : `Switch to ${t.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 mt-6 max-w-3xl bg-secondary/40 border-none">
        <h3 className="font-semibold text-headline flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" /> Billing portal
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage payment methods, download invoices, cancel anytime.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setPortalOpen(true)}>
          Open billing portal
        </Button>
      </Card>

      <ProcessingModal
        open={pendingTier !== null}
        title="Updating subscription"
        subtitle={pendingTier ? `Switching to ${pendingTier.charAt(0).toUpperCase() + pendingTier.slice(1)} · $${PRICE_BY_TIER[pendingTier]}/mo` : ""}
        onSettled={() => {
          if (pendingTier) {
            setBusinessTier(business.id, pendingTier);
            toast.success(`You're on the ${pendingTier.charAt(0).toUpperCase() + pendingTier.slice(1)} plan.`);
            setPendingTier(null);
          }
        }}
      />

      <BillingPortal
        open={portalOpen}
        onClose={() => setPortalOpen(false)}
        currentTier={business.tier}
        currentPrice={currentPrice}
        businessName={business.name}
      />
    </div>
  );
}

function BillingPortal({
  open, onClose, currentTier, currentPrice, businessName,
}: {
  open: boolean;
  onClose: () => void;
  currentTier: Tier;
  currentPrice: number;
  businessName: string;
}) {
  const invoices = useMemo(() => {
    // Build last six invoices, monthly, in reverse chronological order.
    const out: Array<{ id: string; date: string; amount: number; status: "paid" }> = [];
    const today = new Date();
    today.setUTCDate(1);
    for (let i = 0; i < 6; i++) {
      const d = new Date(today);
      d.setUTCMonth(d.getUTCMonth() - i);
      const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      out.push({
        id: `inv_${ym}`,
        date: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        amount: currentPrice,
        status: "paid",
      });
    }
    return out;
  }, [currentPrice]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="portal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[140] grid place-items-center bg-foreground/40 backdrop-blur-sm p-6"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ type: "spring", bounce: 0.22, duration: 0.45 }}
            className="bg-card rounded-3xl shadow-pillow border border-border w-full max-w-xl p-7"
            role="dialog"
            aria-modal="true"
            aria-label="Billing portal"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-title2 font-semibold tracking-tight">Billing portal</h2>
                <p className="text-sm text-muted-foreground mt-1">{businessName}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-2xl p-2 hover:bg-secondary text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Card className="p-5 mb-5 bg-secondary/40 border-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Payment method</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="font-medium">Visa ending in 4242</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Expires 11 / 28</div>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-headline font-semibold">Recent invoices</h3>
                <Badge variant="muted">{currentTier} · ${currentPrice}/mo</Badge>
              </div>
              <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium tabular-nums">{inv.date}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{inv.id}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="text-[11px]">Paid</Badge>
                      <span className="text-sm font-semibold tabular-nums">${inv.amount}.00</span>
                      <button
                        className="rounded-2xl p-1.5 hover:bg-secondary text-muted-foreground"
                        aria-label={`Download invoice ${inv.id}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>Need help? Email billing@booklypro.app</span>
              <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
