import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MessageSquare, Sparkles, Users, Wallet, ShieldCheck, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { listBusinesses, listMemberBusinesses } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { initials } from "@/lib/utils";

export default function LandingPage() {
  const businesses = listBusinesses();
  const { user } = useAuth();
  const memberOf = user ? listMemberBusinesses(user.id) : [];
  const dashboardHref = user
    ? user.roles.includes("superadmin") ? "/platform"
    : user.roles.includes("admin") && memberOf[0] ? `/admin/${memberOf[0].slug}`
    : user.roles.includes("staff") && memberOf[0] ? `/staff/${memberOf[0].slug}`
    : "/me"
    : "/";

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#showcase" className="text-muted-foreground hover:text-foreground transition-colors">Showcase</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                Hi, <span className="text-foreground font-medium">{user.displayName.split(" ")[0]}</span>
              </span>
              <Button asChild size="sm"><Link to={dashboardHref}>Dashboard</Link></Button>
              <Link to={dashboardHref} aria-label="Open dashboard">
                <Avatar className="h-9 w-9">
                  {user.avatar && <AvatarImage src={user.avatar} alt="" />}
                  <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/signup">Get started</Link></Button>
            </>
          )}
        </div>
      </header>

      <Hero />

      <section id="showcase" className="container py-20 md:py-28">
        <div className="max-w-2xl mb-10">
          <span className="eyebrow text-primary">Live demo · 4 tenants</span>
          <h2 className="mt-3 text-largeTitle md:text-[44px] font-semibold tracking-tight leading-[1.05]">
            One platform, every kind of small business.
          </h2>
          <p className="mt-4 text-muted-foreground text-[17px] leading-relaxed prose-soft">
            BooklyPro is multi-tenant. Each business gets its own branded booking page, its own staff, its own services — running on shared infrastructure your customers never see.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {businesses.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06, type: "spring", bounce: 0.2 }}
            >
              <Link to={`/b/${b.slug}`} className="group block">
                <Card className="overflow-hidden hover:shadow-pillow transition-all hover:-translate-y-0.5">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {b.heroImage && (
                      <img
                        src={b.heroImage}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-headline font-semibold">{b.name}</h3>
                      <Badge variant={b.tier === "pro" ? "accent" : b.tier === "team" ? "default" : "muted"}>
                        {b.tier}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{b.description}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-primary text-sm font-medium">
                      Try the booking flow <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <Features />

      <Pricing />

      <Testimonial />

      <CTA />

      <footer className="container py-10 border-t border-border mt-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="text-xs text-muted-foreground">
            BooklyPro · Built as a portfolio demo for letsbuildmyapp.com
          </div>
          <div className="text-xs text-muted-foreground flex gap-3">
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/platform" className="hover:text-foreground">Platform</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="container relative pt-10 pb-16 md:pt-20 md:pb-32">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Booking that respects everyone's time
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 text-display font-semibold tracking-tight"
            style={{ fontSize: "clamp(40px, 7vw, 76px)", lineHeight: 1.02 }}
          >
            The calmer way to fill your calendar.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-muted-foreground text-[18px] leading-relaxed prose-soft"
          >
            BooklyPro gives small businesses a beautiful booking page customers want to use, smart scheduling for staff, and the kind of reminders that actually get people to show up.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-7 flex flex-wrap gap-3"
          >
            <Button asChild size="xl"><Link to="/signup">Start free, no card needed</Link></Button>
            <Button asChild size="xl" variant="outline"><Link to="/b/bloom-and-co">See a live booking page</Link></Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex items-center gap-6 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Stripe verified</div>
            <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-current text-amber-500" /> 4.9 from 2.4k businesses</div>
          </motion.div>
        </div>
        <HeroIllustration />
      </div>
    </section>
  );
}

function HeroIllustration() {
  // Custom SVG calendar/clock illustration with parallax-y scroll
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, type: "spring", bounce: 0.2 }}
      className="relative aspect-square w-full max-w-[480px] ml-auto"
    >
      <div className="absolute inset-6 rounded-[36px] bg-secondary/60 -rotate-3" />
      <div className="absolute inset-0 rounded-[36px] bg-card border border-border shadow-pillow p-7">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">May 2026</span>
          <span className="text-muted-foreground">EST</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
          {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-center">{d}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - 3;
            const today = day === 6;
            const booked = [3, 8, 11, 17, 23, 28].includes(day);
            return (
              <motion.div
                key={i}
                className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-medium tabular-nums ${
                  today ? "bg-primary text-primary-foreground" :
                  booked ? "bg-accent/15 text-accent" :
                  day < 1 ? "text-muted-foreground/30" : "text-foreground"
                }`}
                initial={booked ? { scale: 0.8, opacity: 0 } : false}
                animate={booked ? { scale: 1, opacity: 1 } : undefined}
                transition={{ delay: 0.2 + i * 0.01 }}
              >
                {day < 1 ? "" : day > 31 ? "" : day}
              </motion.div>
            );
          })}
        </div>
        <div className="mt-5 space-y-2">
          {[
            { time: "9:00 AM", title: "Cut & Style · Maya", color: "bg-primary" },
            { time: "11:30 AM", title: "Single-Process Color · Rosa", color: "bg-accent" },
            { time: "2:00 PM", title: "Balayage · Maya", color: "bg-status-rescheduled" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1, type: "spring", bounce: 0.3 }}
              className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5"
            >
              <span className={`h-2 w-2 rounded-full ${s.color}`} />
              <span className="text-xs tabular-nums font-medium text-muted-foreground w-20">{s.time}</span>
              <span className="text-sm flex-1 truncate">{s.title}</span>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Floating clock chip */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
        className="absolute -top-3 right-2 rounded-3xl bg-card border border-border shadow-pillow px-4 py-3 flex items-center gap-3"
      >
        <div className="h-9 w-9 rounded-2xl bg-accent/20 grid place-items-center">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div className="leading-tight">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">No-show risk</div>
          <div className="text-sm font-semibold">Low · 8%</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Features() {
  const items = [
    { icon: Calendar, title: "Smart availability", body: "Buffers, time-off, blackouts, multi-staff windows — handled for you. Slot pickers always tell the truth." },
    { icon: Users, title: "Roles built right", body: "Owners, staff, customers each get their own surface. No one sees anything they shouldn't." },
    { icon: Wallet, title: "Deposits & no-shows", body: "Charge a deposit at booking, set a cancellation window, watch no-show rates fall." },
    { icon: MessageSquare, title: "Reminders that work", body: "24h email, 2h SMS, daily staff digests. Customers show up. You get your evenings back." },
    { icon: Sparkles, title: "AI scheduling assistant", body: "Pro tier. \"Move Sarah's Thursday afternoons to Friday\" — done, with confirmations." },
    { icon: ShieldCheck, title: "Multi-tenant by design", body: "Each business gets its own branded page and its own data, never co-mingled." },
  ];
  return (
    <section id="features" className="container py-20 md:py-28">
      <div className="max-w-2xl mb-12">
        <span className="eyebrow text-primary">Everything that matters</span>
        <h2 className="mt-3 text-largeTitle md:text-[44px] font-semibold tracking-tight leading-[1.05]">
          The boring operational stuff, gracefully handled.
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.04 }}
          >
            <Card className="p-6 h-full hover:shadow-pillow transition-shadow">
              <div className="h-11 w-11 rounded-2xl bg-primary/15 grid place-items-center mb-4">
                <it.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-headline font-semibold">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.body}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Solo", price: 19,
      tagline: "For one-person operations.",
      perks: ["1 staff seat", "1 location", "Email reminders", "Stripe deposits", "Public booking page"],
    },
    {
      name: "Team", price: 59, featured: true,
      tagline: "For growing studios and shops.",
      perks: ["Up to 10 staff", "Up to 3 locations", "SMS reminders", "Cancellation policies", "Custom subdomain"],
    },
    {
      name: "Pro", price: 149,
      tagline: "For multi-location businesses.",
      perks: ["Unlimited staff & locations", "AI scheduling assistant", "Custom branding", "Remove BooklyPro footer", "Priority support"],
    },
  ];
  return (
    <section id="pricing" className="container py-20 md:py-28">
      <div className="max-w-2xl mb-12 mx-auto text-center">
        <span className="eyebrow text-primary">Pricing</span>
        <h2 className="mt-3 text-largeTitle md:text-[44px] font-semibold tracking-tight leading-[1.05]">
          Pick a tier. Try free for 14 days.
        </h2>
        <p className="mt-4 text-muted-foreground">No card required. Customers always book free.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {tiers.map((t) => (
          <Card
            key={t.name}
            className={`p-7 ${t.featured ? "border-primary shadow-pillow ring-2 ring-primary/30" : ""}`}
          >
            {t.featured && <Badge variant="default" className="mb-3">Most popular</Badge>}
            <h3 className="text-title2 font-semibold">{t.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t.tagline}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight tabular-nums">${t.price}</span>
              <span className="text-muted-foreground text-sm">/mo</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {t.perks.map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="w-full mt-7"
              variant={t.featured ? "default" : "outline"}
            >
              <Link to="/signup">Start {t.name}</Link>
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="container py-20 md:py-24">
      <Card className="p-10 md:p-16 bg-secondary/50 border-none shadow-none">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center gap-1 text-amber-500 mb-5">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
          </div>
          <blockquote className="text-title2 md:text-[28px] font-medium leading-snug">
            "Switched from a different booking tool last spring. Our no-show rate dropped from 11% to 4% in two months — the deposit nudge alone paid for the year."
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80"
              className="h-10 w-10 rounded-full object-cover"
              alt=""
            />
            <div className="text-sm text-left">
              <div className="font-semibold">Maya Bloom</div>
              <div className="text-muted-foreground">Owner, Bloom & Co. Salon · Brooklyn</div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function CTA() {
  return (
    <section className="container py-20">
      <Card className="overflow-hidden bg-primary text-primary-foreground border-none">
        <div className="p-10 md:p-16 text-center">
          <h2 className="text-largeTitle md:text-[44px] font-semibold tracking-tight">
            Your customers are already on their phones.
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Give them a booking page worth opening. 14 days free, no card.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild size="xl" variant="accent">
              <Link to="/signup">Get started</Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/b/stillwater">View a live page</Link>
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
