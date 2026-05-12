import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin, RotateCcw, Search, Sparkles, Wallet, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listBookings, listBusinesses, listServices } from "@/lib/api";
import { formatPriceCents, cn } from "@/lib/utils";
import type { Business } from "@/lib/types";

const CATEGORIES: Array<{ id: string; label: string; match: (b: Business) => boolean }> = [
  { id: "all", label: "All", match: () => true },
  { id: "beauty", label: "Beauty & hair", match: (b) => /salon|hair|cut|color|stylist/i.test(`${b.name} ${b.description}`) },
  { id: "wellness", label: "Health & wellness", match: (b) => /yoga|wellness|fitness|massage|therapy|meditation/i.test(`${b.name} ${b.description}`) },
  { id: "education", label: "Tutoring & lessons", match: (b) => /tutor|lesson|prep|teach|coach/i.test(`${b.name} ${b.description}`) },
  { id: "pets", label: "Pet care", match: (b) => /pet|dog|cat|grooming|spa/i.test(`${b.name} ${b.description}`) },
];

export default function CustomerDiscover() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  const all = listBusinesses().filter((b) => b.status === "active");
  const myBookings = user ? listBookings({ customerUserId: user.id }) : [];
  const everBooked = new Set(myBookings.map((b) => b.businessId));

  // Featured = top 2 active businesses by tier (Pro/Team first), excluding ones the user has already booked.
  const featured = useMemo(() => {
    const tierWeight = { pro: 3, team: 2, solo: 1 } as const;
    return [...all]
      .filter((b) => !everBooked.has(b.id))
      .sort((a, b) => tierWeight[b.tier] - tierWeight[a.tier])
      .slice(0, 2);
  }, [all, everBooked]);

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === category)!;
    const term = q.trim().toLowerCase();
    return all.filter((b) => {
      if (!cat.match(b)) return false;
      if (!term) return true;
      return (
        b.name.toLowerCase().includes(term) ||
        b.description.toLowerCase().includes(term) ||
        b.address.toLowerCase().includes(term)
      );
    });
  }, [all, q, category]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title1 font-semibold tracking-tight">Discover</h1>
        <p className="text-muted-foreground mt-1">Find a business and book your next appointment.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={useResponsivePlaceholder()}
          className="pl-11 pr-10 h-12"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-secondary text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-7">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all touch-target",
              category === c.id
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Featured row — only when no query/all category, otherwise too noisy */}
      {!q && category === "all" && featured.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="eyebrow text-accent">Featured · try something new</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {featured.map((b, i) => <FeaturedCard key={b.id} business={b} delay={i * 0.06} />)}
          </div>
        </section>
      )}

      {/* Main grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline font-semibold">
            {q || category !== "all" ? "Results" : "Everywhere on BooklyPro"}
            <span className="text-muted-foreground font-normal"> · {filtered.length}</span>
          </h2>
        </div>
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-7 w-7 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No matches</h3>
            <p className="text-sm text-muted-foreground mt-1">Try a different search or category.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setQ(""); setCategory("all"); }}>Clear filters</Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((b, i) => <BusinessCard key={b.id} business={b} delay={i * 0.04} alreadyBooked={everBooked.has(b.id)} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function FeaturedCard({ business, delay }: { business: Business; delay: number }) {
  const services = listServices(business.id).filter((s) => s.active);
  const startingPrice = services.length ? Math.min(...services.map((s) => s.priceCents)) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, type: "spring", bounce: 0.2 }}
    >
      <Link to={`/b/${business.slug}`} className="block group">
        <Card className="overflow-hidden hover:shadow-pillow transition-all hover:-translate-y-0.5">
          <div className="grid md:grid-cols-[180px_1fr]">
            <div className="aspect-[4/3] md:aspect-auto bg-muted overflow-hidden">
              {business.heroImage && (
                <img src={business.heroImage} alt="" loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="accent" className="mb-2">Featured</Badge>
                  <h3 className="text-headline font-semibold">{business.name}</h3>
                </div>
                <Badge variant={business.tier === "pro" ? "accent" : "muted"}>{business.tier}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{business.description}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {business.address.split(",").slice(-2).join(",").trim()}</span>
                {startingPrice > 0 && (
                  <span className="flex items-center gap-1.5 tabular-nums"><Wallet className="h-3 w-3" /> from {formatPriceCents(startingPrice)}</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-primary text-sm font-medium">
                Book now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function BusinessCard({ business, delay, alreadyBooked }: { business: Business; delay: number; alreadyBooked: boolean }) {
  const services = listServices(business.id).filter((s) => s.active);
  const startingPrice = services.length ? Math.min(...services.map((s) => s.priceCents)) : 0;
  const shortestDuration = services.length ? Math.min(...services.map((s) => s.durationMinutes)) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, type: "spring", bounce: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-pillow transition-all hover:-translate-y-0.5 h-full flex flex-col group">
        <Link to={`/b/${business.slug}`} className="contents">
          <div className="aspect-[5/3] bg-muted overflow-hidden relative">
            {business.heroImage && (
              <img src={business.heroImage} alt="" loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
            )}
          </div>
          <div className="p-5 flex flex-col flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-headline font-semibold">{business.name}</h3>
              <Badge variant={business.tier === "pro" ? "accent" : business.tier === "team" ? "default" : "muted"}>{business.tier}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed flex-1">{business.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {startingPrice > 0 && <span className="flex items-center gap-1 tabular-nums"><Wallet className="h-3 w-3" /> from {formatPriceCents(startingPrice)}</span>}
              {shortestDuration > 0 && <span className="flex items-center gap-1 tabular-nums"><Clock className="h-3 w-3" /> {shortestDuration} min+</span>}
            </div>
          </div>
        </Link>
        <div className="px-5 pb-5">
          {alreadyBooked ? (
            <Button asChild size="sm" className="w-full">
              <Link to={`/b/${business.slug}`}><RotateCcw className="h-3.5 w-3.5" /> Book again</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to={`/b/${business.slug}`}>Browse services <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function useResponsivePlaceholder() {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isNarrow ? "Search…" : "Search businesses, services, neighborhoods…";
}
