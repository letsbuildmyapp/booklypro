import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBusinessBySlug, updateBusiness } from "@/lib/api";

export default function AdminPolicy() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [hours, setHours] = useState(business.cancellationPolicy.hoursBefore);
  const [percent, setPercent] = useState(business.cancellationPolicy.chargePercent);

  function save() {
    updateBusiness(business.id, { cancellationPolicy: { hoursBefore: hours, chargePercent: percent } });
    toast.success("Policy updated");
  }

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight mb-1">Policies</h1>
      <p className="text-muted-foreground mb-6">Cancellation, no-shows, and what you charge for them.</p>

      <Card className="p-6 max-w-2xl space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Cancellation window (hours)</Label>
            <Input type="number" min={0} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Cancellations within this window get charged.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Charge percent</Label>
            <Input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">% of service price charged on late cancel.</p>
          </div>
        </div>
        <Button onClick={save} size="lg">Save policy</Button>
      </Card>
    </div>
  );
}
