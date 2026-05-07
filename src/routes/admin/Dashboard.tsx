import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { ArrowUpRight, Calendar as CalIcon, Plus, TrendingUp, Users, Wallet, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBusinessBySlug, listBookings, listServices, listStaff, subscribe } from "@/lib/api";
import { fmtInTz, ymdInTz } from "@/lib/time";
import { formatPriceCents, initials } from "@/lib/utils";

export default function AdminDashboard() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const bookings = listBookings({ businessId: business.id });
  const services = listServices(business.id);
  const staff = listStaff(business.id);
  const tz = business.timezone;
  const today = ymdInTz(new Date().toISOString(), tz);

  const todays = bookings.filter((b) => ymdInTz(b.startAt, tz) === today && b.status !== "cancelled_by_customer" && b.status !== "cancelled_by_business");

  // Revenue this week
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6);
  const weekRevenueByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      return ymdInTz(d.toISOString(), tz);
    });
    return days.map((d) => {
      const dayB = bookings.filter((b) => ymdInTz(b.startAt, tz) === d && (b.status === "completed" || b.status === "confirmed"));
      return {
        day: fmtInTz(`${d}T12:00:00Z`, tz, "EEE"),
        revenue: dayB.reduce((sum, b) => sum + b.priceCents, 0) / 100,
      };
    });
  }, [bookings, tz, weekStart]);

  const weekRevenueTotal = weekRevenueByDay.reduce((s, d) => s + d.revenue, 0);

  // No-show rate
  const completed = bookings.filter((b) => b.status === "completed").length;
  const noShows = bookings.filter((b) => b.status === "no_show").length;
  const noShowRate = completed + noShows > 0 ? (noShows / (completed + noShows)) * 100 : 0;

  // Top services
  const topServices = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) m.set(b.serviceId, (m.get(b.serviceId) ?? 0) + 1);
    return Array.from(m.entries()).map(([id, count]) => ({ name: services.find((s) => s.id === id)?.name ?? "?", count })).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [bookings, services]);

  // Top staff
  const topStaff = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number }>();
    for (const b of bookings) {
      if (b.status !== "completed" && b.status !== "confirmed") continue;
      const cur = m.get(b.staffUserId) ?? { count: 0, revenue: 0 };
      m.set(b.staffUserId, { count: cur.count + 1, revenue: cur.revenue + b.priceCents });
    }
    return Array.from(m.entries()).map(([userId, v]) => ({ profile: staff.find((s) => s.userId === userId), ...v })).filter((r) => r.profile).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [bookings, staff]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">Hi, {business.name.split(" ")[0]}.</h1>
          <p className="text-muted-foreground mt-1">{fmtInTz(new Date().toISOString(), tz, "EEEE, MMMM d")} · {tz.replace("_", " ")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline"><Link to="../calendar"><CalIcon className="h-4 w-4" /> Master calendar</Link></Button>
          <Button asChild><Link to="../calendar?action=new"><Plus className="h-4 w-4" /> New booking</Link></Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Today's bookings" value={String(todays.length)} icon={<CalIcon className="h-4 w-4" />} sub={todays.length === 0 ? "Quiet day" : "Looking busy"} />
        <Stat label="This week revenue" value={formatPriceCents(Math.round(weekRevenueTotal * 100))} icon={<Wallet className="h-4 w-4" />} sub="Across confirmed + completed" />
        <Stat label="No-show rate" value={`${noShowRate.toFixed(1)}%`} icon={<AlertTriangle className="h-4 w-4" />} sub={noShowRate < 5 ? "Excellent" : noShowRate < 10 ? "Healthy" : "Worth a look"} tone={noShowRate >= 10 ? "warn" : "ok"} />
        <Stat label="Active staff" value={String(staff.filter((s) => s.active).length)} icon={<Users className="h-4 w-4" />} sub={`${services.filter((s) => s.active).length} services live`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline font-semibold">Revenue · last 7 days</h3>
            <Badge variant="default" className="gap-1.5"><TrendingUp className="h-3 w-3" /> {formatPriceCents(Math.round(weekRevenueTotal * 100))}</Badge>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekRevenueByDay}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "16px", padding: "8px 12px" }} formatter={(v: any) => [`$${v}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-headline font-semibold mb-4">Today's lineup</h3>
          {todays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
          ) : (
            <div className="space-y-3">
              {todays.slice(0, 6).map((b) => {
                const svc = services.find((s) => s.id === b.serviceId)!;
                const sp = staff.find((s) => s.userId === b.staffUserId);
                return (
                  <div key={b.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {sp?.avatar && <AvatarImage src={sp.avatar} alt="" />}
                      <AvatarFallback>{initials(sp?.displayName ?? "?")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{svc.name} · {b.customerSnapshot.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{fmtInTz(b.startAt, tz, "h:mm a")} · {sp?.displayName}</div>
                    </div>
                    <Badge variant={b.status === "confirmed" ? "confirmed" : "completed"}>{b.status === "confirmed" ? "On" : "Done"}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-headline font-semibold mb-4">Top services</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topServices} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "16px" }} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-headline font-semibold mb-4">Top staff</h3>
          <div className="space-y-3">
            {topStaff.map((row) => (
              <div key={row.profile!.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {row.profile!.avatar && <AvatarImage src={row.profile!.avatar} alt="" />}
                  <AvatarFallback>{initials(row.profile!.displayName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{row.profile!.displayName}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{row.count} bookings · {formatPriceCents(row.revenue)} revenue</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, sub, tone }: { label: string; value: string; icon: React.ReactNode; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-largeTitle font-semibold tracking-tight tabular-nums">{value}</span>
        <ArrowUpRight className="h-4 w-4 text-primary" />
      </div>
      {sub && <div className={`text-xs mt-1 ${tone === "warn" ? "text-status-noshow" : "text-muted-foreground"}`}>{sub}</div>}
    </Card>
  );
}
