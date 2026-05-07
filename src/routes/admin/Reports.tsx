import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getBusinessBySlug, listBookings, listServices, listStaff } from "@/lib/api";
import { fmtInTz, ymdInTz } from "@/lib/time";
import { formatPriceCents } from "@/lib/utils";

export default function AdminReports() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const bookings = listBookings({ businessId: business.id });
  const services = listServices(business.id);
  const staff = listStaff(business.id);
  const tz = business.timezone;

  const byService = useMemo(() => {
    const m = new Map<string, { name: string; count: number; revenue: number }>();
    for (const b of bookings) {
      const cur = m.get(b.serviceId) ?? { name: services.find((s) => s.id === b.serviceId)?.name ?? "?", count: 0, revenue: 0 };
      cur.count += 1;
      if (b.status === "completed" || b.status === "confirmed") cur.revenue += b.priceCents;
      m.set(b.serviceId, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [bookings, services]);

  const byStaff = useMemo(() => {
    const m = new Map<string, { name: string; count: number; revenue: number; noshows: number }>();
    for (const b of bookings) {
      const cur = m.get(b.staffUserId) ?? { name: staff.find((s) => s.userId === b.staffUserId)?.displayName ?? "?", count: 0, revenue: 0, noshows: 0 };
      cur.count += 1;
      if (b.status === "completed" || b.status === "confirmed") cur.revenue += b.priceCents;
      if (b.status === "no_show") cur.noshows += 1;
      m.set(b.staffUserId, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [bookings, staff]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      const k = fmtInTz(b.startAt, tz, "EEEE");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([day, count]) => ({ day, count }));
  }, [bookings, tz]);

  function downloadCsv(rows: string[][], filename: string) {
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  }

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight mb-1">Reports</h1>
      <p className="text-muted-foreground mb-6">Where the bookings — and the money — are going.</p>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">By service</TabsTrigger>
          <TabsTrigger value="staff">By staff</TabsTrigger>
          <TabsTrigger value="days">Busiest days</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-headline">Service performance</h3>
              <Button variant="outline" size="sm" onClick={() => downloadCsv(
                [["Service", "Bookings", "Revenue"], ...byService.map((r) => [r.name, String(r.count), formatPriceCents(r.revenue)])],
                "services.csv"
              )}><Download className="h-3.5 w-3.5" /> CSV</Button>
            </div>
            <Table headers={["Service", "Bookings", "Revenue"]} rows={byService.map((r) => [r.name, String(r.count), formatPriceCents(r.revenue)])} />
          </Card>
        </TabsContent>
        <TabsContent value="staff">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-headline">Staff performance</h3>
              <Button variant="outline" size="sm" onClick={() => downloadCsv(
                [["Staff", "Bookings", "No-shows", "Revenue"], ...byStaff.map((r) => [r.name, String(r.count), String(r.noshows), formatPriceCents(r.revenue)])],
                "staff.csv"
              )}><Download className="h-3.5 w-3.5" /> CSV</Button>
            </div>
            <Table headers={["Staff", "Bookings", "No-shows", "Revenue"]} rows={byStaff.map((r) => [r.name, String(r.count), String(r.noshows), formatPriceCents(r.revenue)])} />
          </Card>
        </TabsContent>
        <TabsContent value="days">
          <Card className="p-6">
            <h3 className="font-semibold text-headline mb-4">Busiest days of the week</h3>
            <Table headers={["Day", "Bookings"]} rows={byDay.map((r) => [r.day, String(r.count)])} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h) => <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
              {r.map((c, j) => <td key={j} className={`py-3 px-3 ${j > 0 ? "tabular-nums" : "font-medium"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
