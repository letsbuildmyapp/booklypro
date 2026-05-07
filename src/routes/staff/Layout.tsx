import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Calendar, Clock, LogOut, MessageSquare, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getBusinessBySlug } from "@/lib/api";
import NotFoundPage from "@/routes/NotFound";

const NAV = [
  { to: "calendar", label: "Calendar", icon: Calendar, tour: "staff-calendar" },
  { to: "hours", label: "My hours", icon: Clock, tour: "staff-hours" },
  { to: "services", label: "Services", icon: Wrench },
  { to: "messages", label: "Messages", icon: MessageSquare, tour: "staff-messages" },
];

export default function StaffLayout() {
  const { bizSlug = "" } = useParams();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const business = getBusinessBySlug(bizSlug);
  if (!business || !user) return <NotFoundPage />;

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/"><Logo /></Link>
          <span className="hidden md:inline text-sm text-muted-foreground">·</span>
          <span className="hidden md:inline text-sm font-medium">{business.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user.roles.includes("admin") && (
            <Button asChild variant="ghost" size="sm"><Link to={`/admin/${bizSlug}`}>Admin view</Link></Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => { signOut(); nav("/"); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <Avatar className="h-9 w-9">
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="container grid lg:grid-cols-[220px_1fr] gap-8 pb-20">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-card border border-border p-3 flex lg:flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-tour={item.tour}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all touch-target",
                  isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
