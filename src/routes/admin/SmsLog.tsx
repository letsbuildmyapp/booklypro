import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStore, subscribe } from "@/lib/store";
import { getBusinessBySlug } from "@/lib/api";
import { fmtInTz } from "@/lib/time";

export default function AdminSmsLog() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);
  const log = getStore().smsLog.filter((s) => s.businessId === business.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight mb-1">SMS log</h1>
      <p className="text-muted-foreground mb-6">Every reminder, confirmation, and follow-up sent from this business. Reminders fire 2 hours before each booking.</p>

      {log.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No SMS sent yet. Reminders fire 2 hours before each booking.</Card>
      ) : (
        <div className="grid gap-3">
          {log.map((entry) => (
            <Card key={entry.id} className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="muted">sent</Badge>
                <span className="text-sm text-muted-foreground tabular-nums">{fmtInTz(entry.createdAt, business.timezone, "MMM d · h:mm a")}</span>
                <span className="text-sm font-medium">→ {entry.to}</span>
              </div>
              <p className="mt-2 text-sm">{entry.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
