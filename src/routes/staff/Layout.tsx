import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftRight, Calendar, Clock, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResetDemo } from "@/components/ResetDemo";
import { MobileNav } from "@/components/MobileNav";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";
import { getBusinessBySlug } from "@/lib/api";
import NotFoundPage from "@/routes/NotFound";

const NAV = [
  { to: "calendar", label: "Calendar", icon: Calendar, tour: "staff-calendar" },
  { to: "hours", label: "My hours", icon: Clock, tour: "staff-hours" },
  { to: "services", label: "Services", icon: Wrench },
];

export default function StaffLayout() {
  const { bizSlug = "" } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const business = getBusinessBySlug(bizSlug);
  if (!business || !user) return <NotFoundPage />;

  const extraItems = user.roles.includes("admin")
    ? [{
        label: "Switch to admin view",
        icon: <ArrowLeftRight className="h-4 w-4" />,
        onSelect: () => nav(`/admin/${bizSlug}`),
      }]
    : undefined;

  const renderNav = (onSelect?: () => void) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          data-tour={item.tour}
          onClick={onSelect}
          className={({ isActive }) => cn(
            "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all touch-target",
            isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-4 sm:py-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <MobileNav label="Open navigation">
            {({ close }) => (
              <div className="space-y-5">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5 px-3.5">{business.name}</div>
                  {renderNav(close)}
                </div>
              </div>
            )}
          </MobileNav>
          <Link to={`/staff/${bizSlug}`} aria-label="Home" className="shrink-0"><Logo /></Link>
          <span className="hidden md:inline text-sm text-muted-foreground ml-3">·</span>
          <span className="hidden md:inline text-sm font-medium ml-3 truncate">{business.name}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <UserMenu contextLabel={business.name} extra={extraItems} />
        </div>
      </header>

      <div className="container grid lg:grid-cols-[220px_1fr] gap-6 lg:gap-8 pb-20">
        <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-card border border-border p-3">
            {renderNav()}
          </div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>

      <ResetDemo />
    </div>
  );
}
