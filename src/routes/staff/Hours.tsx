import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { getBusinessBySlug, getStaffAvailability, setStaffAvailability, subscribe } from "@/lib/api";
import { WEEKDAYS, type Weekday } from "@/lib/time";
import type { Availability, AvailabilitySlot } from "@/lib/types";

const DAY_LABELS: Record<Weekday, string> = { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };

export default function StaffHours() {
  const { bizSlug = "" } = useParams();
  const { user } = useAuth();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const av = getStaffAvailability(user!.id, business.id);
  const [draft, setDraft] = useState<Availability["weeklySchedule"]>(av?.weeklySchedule ?? { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] });

  function update(day: Weekday, slots: AvailabilitySlot[]) {
    setDraft({ ...draft, [day]: slots });
  }
  function addSlot(day: Weekday) { update(day, [...draft[day], { start: "09:00", end: "17:00" }]); }
  function removeSlot(day: Weekday, idx: number) { update(day, draft[day].filter((_, i) => i !== idx)); }
  function copyToAll(day: Weekday) {
    const next = { ...draft };
    for (const d of WEEKDAYS) if (d !== "sun") next[d] = [...draft[day]];
    setDraft(next);
    toast.success(`Copied ${DAY_LABELS[day]} to weekdays`);
  }
  function save() {
    setStaffAvailability(user!.id, business.id, { weeklySchedule: draft });
    toast.success("Hours saved");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">My weekly hours</h1>
          <p className="text-muted-foreground mt-1">When customers can book you. All times in {business.timezone.replace("_", " ")}.</p>
        </div>
        <Button onClick={save} size="lg">Save changes</Button>
      </div>

      <div className="grid gap-3 max-w-2xl">
        {WEEKDAYS.map((day) => (
          <Card key={day} className="p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-headline font-semibold w-32">{DAY_LABELS[day]}</h3>
              <div className="flex flex-1 flex-wrap gap-3">
                {draft[day].length === 0 && <span className="text-muted-foreground italic">Closed</span>}
                {draft[day].map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => update(day, draft[day].map((s, j) => j === i ? { ...s, start: e.target.value } : s))}
                      className="w-32 tabular-nums"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => update(day, draft[day].map((s, j) => j === i ? { ...s, end: e.target.value } : s))}
                      className="w-32 tabular-nums"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeSlot(day, i)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addSlot(day)}><Plus className="h-3.5 w-3.5" /> Add window</Button>
                {draft[day].length > 0 && day !== "sun" && day !== "sat" && (
                  <Button variant="ghost" size="sm" onClick={() => copyToAll(day)}><Copy className="h-3.5 w-3.5" /> Copy to weekdays</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
