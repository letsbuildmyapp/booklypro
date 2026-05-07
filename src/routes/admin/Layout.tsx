import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { BarChart3, Building2, Calendar as CalIcon, CreditCard, ExternalLink, FileText, LogOut, MessageSquare, Palette, Phone, ScrollText, Sparkles, Users, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { initials, cn } from "@/lib/utils";
import { getBusinessBySlug, listConversationsForBusiness, subscribe } from "@/lib/api";
import NotFoundPage from "@/routes/NotFound";

const NAV: Array<{ to: string; label: string; icon: any; tour?: string; section: "operate" | "configure" }> = [
  { to: "dashboard", label: "Dashboard", icon: BarChart3, section: "operate" },
  { to: "calendar", label: "Calendar", icon: CalIcon, tour: "admin-calendar", section: "operate" },
  { to: "messages", label: "Messages", icon: MessageSquare, tour: "admin-messages", section: "operate" },
  { to: "ai", label: "AI assistant", icon: Sparkles, tour: "admin-ai", section: "operate" },
  { to: "reports", label: "Reports", icon: FileText, section: "operate" },
  { to: "services", label: "Services", icon: Wrench, tour: "admin-services", section: "configure" },
  { to: "staff", label: "Staff", icon: Users, section: "configure" },
  { to: "locations", label: "Locations", icon: Building2, section: "configure" },
  { to: "policy", label: "Policies", icon: ScrollText, section: "configure" },
  { to: "branding", label: "Branding", icon: Palette, tour: "admin-branding", section: "configure" },
  { to: "billing", label: "Billing", icon: CreditCard, section: "configure" },
  { to: "sms-log", label: "SMS log", icon: Phone, section: "configure" },
];

export default function AdminLayout() {
  const { bizSlug = "" } = useParams();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const business = getBusinessBySlug(bizSlug);
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  if (!business || !user) return <NotFoundPage />;

  const totalUnread = listConversationsForBusiness(business.id).reduce(
    (sum, c) => sum + Object.values(c.unreadCounts).reduce((s, n) => s + (n ?? 0), 0),
    0
  );
  const badges: Record<string, number> = { messages: totalUnread };

  const operate = NAV.filter((n) => n.section === "operate");
  const configure = NAV.filter((n) => n.section === "configure");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/"><Logo /></Link>
            <span className="hidden md:inline text-sm text-muted-foreground">/</span>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-semibold">{business.name}</span>
              <Badge variant={business.tier === "pro" ? "accent" : business.tier === "team" ? "default" : "muted"}>{business.tier}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/b/${bizSlug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View public page
              </Link>
            </Button>
            <ThemeToggle />
            {user.roles.includes("staff") && <Button asChild variant="ghost" size="sm"><Link to={`/staff/${bizSlug}`}>Staff view</Link></Button>}
            <Button variant="ghost" size="sm" onClick={() => { signOut(); nav("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Avatar className="h-9 w-9">
              {user.avatar && <AvatarImage src={user.avatar} alt="" />}
              <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="container grid lg:grid-cols-[224px_1fr] gap-8 py-6 pb-20">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-1">
            <SectionLabel>Operate</SectionLabel>
            {operate.map((n) => <SidebarItem key={n.to} {...n} badge={badges[n.to]} />)}
            <SectionLabel className="mt-4">Configure</SectionLabel>
            {configure.map((n) => <SidebarItem key={n.to} {...n} badge={badges[n.to]} />)}
          </div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("eyebrow text-muted-foreground px-3 mb-1.5", className)}>{children}</div>;
}

function SidebarItem({ to, label, icon: Icon, tour, badge }: { to: string; label: string; icon: any; tour?: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      data-tour={tour}
      end
      className={({ isActive }) => cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
        isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-accent text-accent-foreground text-[10px] font-semibold tabular-nums px-1.5 min-w-[18px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}
