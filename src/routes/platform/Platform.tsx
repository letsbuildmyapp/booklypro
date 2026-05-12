import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ExternalLink, ShieldCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResetDemo } from "@/components/ResetDemo";
import { UserMenu } from "@/components/UserMenu";
import { listBusinesses, listBookings, updateBusiness, subscribe } from "@/lib/api";
import { formatPriceCents } from "@/lib/utils";

const TIER_PRICE = { solo: 19, team: 59, pro: 149 };

export default function PlatformPage() {
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);
  const [q, setQ] = useState("");

  const businesses = listBusinesses();
  const filtered = businesses.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()) || b.slug.toLowerCase().includes(q.toLowerCase()));

  const allBookings = listBookings({});
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weekBookings = allBookings.filter((b) => new Date(b.createdAt).getTime() >= weekAgo);

  const mrr = businesses.filter((b) => b.subscriptionStatus === "active").reduce((sum, b) => sum + TIER_PRICE[b.tier] * 100, 0);
  const tierCounts = useMemo(() => ({
    solo: businesses.filter((b) => b.tier === "solo").length,
    team: businesses.filter((b) => b.tier === "team").length,
    pro: businesses.filter((b) => b.tier === "pro").length,
  }), [businesses]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/platform" aria-label="Home"><Logo /></Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-semibold flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Platform admin</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu contextLabel="Platform admin" />
          </div>
        </div>
      </header>

      <div className="container py-6 pb-20">
        <h1 className="text-title1 font-semibold tracking-tight">Platform</h1>
        <p className="text-muted-foreground mt-1">All tenants, in one place.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Stat label="Total businesses" value={String(businesses.length)} icon={<Building2 className="h-4 w-4" />} />
          <Stat label="Bookings this week" value={String(weekBookings.length)} icon={<TrendingUp className="h-4 w-4" />} />
          <Stat label="MRR (test)" value={formatPriceCents(mrr)} icon={<Wallet className="h-4 w-4" />} />
          <Stat label="Tier mix" value={`${tierCounts.solo}/${tierCounts.team}/${tierCounts.pro}`} icon={<Users className="h-4 w-4" />} sub="Solo / Team / Pro" />
        </div>

        <Card className="p-5 mt-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h3 className="font-semibold text-headline">Tenants · {filtered.length}</h3>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or slug…" className="max-w-xs" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Business", "Tier", "Status", "Bookings", "Slug", ""].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const bb = allBookings.filter((x) => x.businessId === b.id).length;
                  return (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-3 px-3 font-medium">{b.name}</td>
                      <td className="py-3 px-3"><Badge variant={b.tier === "pro" ? "accent" : b.tier === "team" ? "default" : "muted"}>{b.tier}</Badge></td>
                      <td className="py-3 px-3">
                        <Badge variant={b.status === "active" ? "confirmed" : "noshow"}>{b.status}</Badge>
                      </td>
                      <td className="py-3 px-3 tabular-nums">{bb}</td>
                      <td className="py-3 px-3 text-muted-foreground"><code className="text-xs">{b.slug}</code></td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2 flex-wrap">
                          <Button asChild size="sm" variant="outline" data-tour="platform-tenants">
                            <Link to={`/admin/${b.slug}`}><ExternalLink className="h-3 w-3" /> Open</Link>
                          </Button>
                          <Button size="sm" variant={b.status === "active" ? "destructive" : "default"}
                            onClick={() => updateBusiness(b.id, { status: b.status === "active" ? "suspended" : "active" })}>
                            {b.status === "active" ? "Suspend" : "Reactivate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ResetDemo />
    </div>
  );
}

function Stat({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">{label}<span>{icon}</span></div>
      <div className="mt-2 text-largeTitle font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}
