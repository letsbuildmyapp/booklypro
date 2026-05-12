import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getStore as readStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HomeLink } from "@/components/HomeLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResetDemo } from "@/components/ResetDemo";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tile {
  email: string;
  description: string;
  badge?: string;
}

const TILES: Tile[] = [
  {
    email: "ada@example.com",
    description: "Browse two businesses, manage upcoming visits, message staff.",
    badge: "Customer",
  },
  {
    email: "rosa@bloomandco.salon",
    description: "Stylist's view — your calendar, your hours, your services.",
    badge: "Staff",
  },
  {
    email: "owner@bloomandco.salon",
    description: "Run a multi-stylist salon. Calendar, deposits, reminders.",
    badge: "Admin",
  },
];

function homePathFor(user: User, fallback: string): string {
  const store = readStore();
  if (user.roles.includes("superadmin")) return "/platform";
  if (user.roles.includes("admin") && user.memberOf?.[0]) {
    const biz = store.businesses.find((b) => b.id === user.memberOf![0]);
    if (biz) return `/admin/${biz.slug}`;
  }
  if (user.roles.includes("staff") && user.memberOf?.[0]) {
    const biz = store.businesses.find((b) => b.id === user.memberOf![0]);
    if (biz) return `/staff/${biz.slug}`;
  }
  return fallback;
}

export default function LoginPage() {
  const { signInAs } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const nextParam = params.get("next");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const tiles = useMemo(() => {
    const store = readStore();
    return TILES.map((t) => {
      const user = store.users.find((u) => u.email === t.email);
      return user ? { ...t, user } : null;
    }).filter((x): x is Tile & { user: User } => x !== null);
  }, []);

  async function pick(user: User) {
    setPendingId(user.id);
    try {
      await signInAs(user.id);
      // Role-based home takes precedence. `next` only applies to pure-customer
      // users so admin/staff/superadmin tiles can't get hijacked by a redirect
      // that captured them on the way to a protected route.
      const target = homePathFor(user, nextParam || "/me");
      // Tiny pause so the picked-tile press state lands before route transition
      await new Promise((r) => setTimeout(r, 180));
      nav(target);
    } catch (e: any) {
      toast.error(e.message ?? "Could not sign in");
      setPendingId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-grain">
      <header className="container py-6 flex items-center justify-between">
        <HomeLink />
        <ThemeToggle />
      </header>

      <main className="flex-1 grid place-items-center px-6 py-10">
        <div className="w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center mb-9"
          >
            <h1 className="text-largeTitle font-semibold tracking-tight">Pick how you want to enter</h1>
            <p className="mt-3 text-muted-foreground text-[17px] leading-relaxed max-w-xl mx-auto">
              Every tile drops you straight into a fully populated workspace — real bookings, real conversations, real reports.
            </p>
          </motion.div>

          <div className="flex flex-col gap-4">
            {tiles.map((t, i) => {
              const isPending = pendingId === t.user.id;
              const isOther = pendingId && !isPending;
              return (
                <motion.button
                  key={t.user.id}
                  type="button"
                  onClick={() => !pendingId && pick(t.user)}
                  disabled={!!pendingId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: isOther ? 0.4 : 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.05, type: "spring", bounce: 0.18 }}
                  whileHover={!pendingId ? { y: -2 } : undefined}
                  whileTap={!pendingId ? { scale: 0.985 } : undefined}
                  className={cn(
                    "text-left rounded-3xl border border-border bg-card p-6 transition-all touch-target",
                    "hover:border-primary/40 hover:shadow-pillow",
                    isPending && "border-primary ring-2 ring-primary/30 shadow-pillow",
                    pendingId && !isPending && "cursor-not-allowed",
                  )}
                  aria-label={`Sign in as ${t.user.displayName}, ${t.badge}`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 shrink-0">
                      {t.user.avatar && <AvatarImage src={t.user.avatar} alt="" />}
                      <AvatarFallback>{initials(t.user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-headline truncate">{t.user.displayName}</h3>
                        <ArrowRight
                          className={cn(
                            "h-4 w-4 text-primary transition-transform shrink-0",
                            isPending && "translate-x-1",
                          )}
                        />
                      </div>
                      {t.badge && (
                        <Badge variant="muted" className="mt-1.5 text-[11px]">{t.badge}</Badge>
                      )}
                      <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Tap any tile · your changes during this session are saved to this browser only.
          </p>
        </div>
      </main>

      <ResetDemo />
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
