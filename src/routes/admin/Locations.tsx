import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createLocation, getBusinessBySlug, listLocations, subscribe } from "@/lib/api";

export default function AdminLocations() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);
  const locations = listLocations(business.id);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", address: "", timezone: business.timezone });

  function add() {
    if (!draft.name) return toast.error("Name required");
    createLocation({ businessId: business.id, ...draft, active: true });
    toast.success("Location added");
    setDraft({ name: "", address: "", timezone: business.timezone });
    setOpen(false);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">Locations</h1>
          <p className="text-muted-foreground mt-1">Where you operate. Each location can have its own timezone.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add location</Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
        {locations.map((l) => (
          <Card key={l.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-2xl bg-primary/15 grid place-items-center text-primary"><MapPin className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-headline">{l.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{l.address}</p>
                <p className="text-xs text-muted-foreground mt-1">{l.timezone.replace("_", " ")}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add location</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Timezone</Label><Input value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
