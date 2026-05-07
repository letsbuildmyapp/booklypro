import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { aiSchedulingAssistant, type SchedulingProposal } from "@/lib/ai";
import { getBusinessBySlug, listBookings, listServices, listStaff, rescheduleBooking } from "@/lib/api";
import { toast } from "sonner";

const SAMPLES = [
  "Move all my Thursday afternoon appointments to Friday morning",
  "Block off next Tuesday for me",
  "What's my busiest day this week?",
];

export default function AdminAi() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<SchedulingProposal | null>(null);
  const isPro = business.tier === "pro";

  async function ask() {
    if (!prompt.trim()) return;
    setLoading(true);
    setProposal(null);
    try {
      const bookings = listBookings({ businessId: business.id });
      const staff = listStaff(business.id);
      const services = listServices(business.id);
      const result = await aiSchedulingAssistant({
        businessId: business.id, prompt,
        context: {
          bookings,
          staff: staff.map((s) => ({ id: s.userId, name: s.displayName })),
          services: services.map((s) => ({ id: s.id, name: s.name })),
        },
      });
      setProposal(result);
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally { setLoading(false); }
  }

  function applyAll() {
    if (!proposal) return;
    let n = 0;
    for (const change of proposal.changes) {
      if (change.action === "reschedule" && change.bookingId && change.payload?.newStartAt) {
        rescheduleBooking(change.bookingId, change.payload.newStartAt);
        n++;
      }
    }
    toast.success(`Applied ${n} change${n === 1 ? "" : "s"}`);
    setProposal(null); setPrompt("");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" /> AI scheduling assistant
          </h1>
          <p className="text-muted-foreground mt-1">Talk to your calendar like a person. Confirm before anything changes.</p>
        </div>
        <Badge variant={isPro ? "accent" : "muted"}>{isPro ? "Pro tier" : `${business.tier} tier — Pro feature`}</Badge>
      </div>

      {!isPro && (
        <Card className="p-5 bg-accent/10 border-accent/20 mb-6">
          <p className="text-sm">This feature is included with the <strong>Pro</strong> tier. You can still try it in demo mode below.</p>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card className="p-6">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Move all my Thursday afternoon appointments to Friday morning" rows={4} />
          <div className="mt-4 flex justify-between items-center flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button key={s} onClick={() => setPrompt(s)} className="rounded-full bg-secondary text-secondary-foreground text-xs px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors">
                  {s}
                </button>
              ))}
            </div>
            <Button onClick={ask} disabled={loading || !prompt.trim()} size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ask
            </Button>
          </div>

          {proposal && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5"
            >
              <h3 className="font-semibold text-headline">Proposed changes</h3>
              <p className="text-sm text-muted-foreground mt-1">{proposal.summary}</p>
              {proposal.changes.length > 0 && (
                <>
                  <ul className="mt-4 space-y-2">
                    {proposal.changes.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>{c.description}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex gap-2 flex-wrap">
                    <Button onClick={applyAll}><CheckCircle2 className="h-4 w-4" /> Apply all changes</Button>
                    <Button variant="outline" onClick={() => setProposal(null)}>Discard</Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </Card>

        <Card className="p-5 bg-secondary/40 border-none">
          <h3 className="font-semibold text-headline">How it works</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            The assistant calls <code>claude-opus-4-7</code> via a Cloud Function with tool-use enabled. It can read your calendar, propose reschedules, block time, and add buffers — but never executes anything until you confirm.
          </p>
          <p className="text-xs text-muted-foreground mt-4">Prompt caching enabled on system prompt + business context for fast replies.</p>
        </Card>
      </div>
    </div>
  );
}
