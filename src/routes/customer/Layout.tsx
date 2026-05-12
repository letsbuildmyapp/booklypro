import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ArrowLeftRight, Calendar, Compass, Heart, MessageSquare, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResetDemo } from "@/components/ResetDemo";
import { MobileNav } from "@/components/MobileNav";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";
import { listConversationsForUser, listMemberBusinesses } from "@/lib/api";
import { useEffect, useState } from "react";
import { subscribe } from "@/lib/api";

const NAV = [
  { to: "discover", label: "Discover", icon: Compass, tour: "customer-discover" },
  { to: "bookings", label: "Bookings", icon: Calendar, tour: "customer-bookings" },
  { to: "messages", label: "Messages", icon: MessageSquare, tour: "customer-messages" },
  { to: "saved", label: "Saved", icon: Heart, tour: "customer-saved" },
  { to: "profile", label: "Profile", icon: UserIcon },
];

export default function CustomerLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  if (!user) return null;
  const memberOf = listMemberBusinesses(user.id);
  // Count unread *messages* (not notifications) so the Messages nav dot accurately reflects
  // unread chat threads — and clears once the user has viewed them.
  const unread = listConversationsForUser(user.id)
    .reduce((sum, c) => sum + (c.unreadCounts[user.id] ?? 0), 0);

  const switchTargetSlug = memberOf[0]?.slug;
  const switchKind = user.roles.includes("admin") ? "admin" : "staff";

  const extraItems = switchTargetSlug
    ? [{
        label: `Switch to ${switchKind} view`,
        icon: <ArrowLeftRight className="h-4 w-4" />,
        onSelect: () => nav(switchKind === "admin" ? `/admin/${switchTargetSlug}` : `/staff/${switchTargetSlug}`),
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
          {item.to === "messages" && unread > 0 && (
            <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="container py-4 sm:py-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <MobileNav label="Open navigation">
            {({ close }) => renderNav(close)}
          </MobileNav>
          <Link to="/me" aria-label="Home"><Logo /></Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <UserMenu
            contextLabel={`Your timezone: ${user.timezone.replace("_", " ")}`}
            extra={extraItems}
          />
        </div>
      </header>

      <div className="container grid lg:grid-cols-[240px_1fr] gap-6 lg:gap-8 pb-20">
        <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-card border border-border p-3">
            {renderNav()}
          </div>
          <div className="mt-4 rounded-3xl bg-secondary/50 p-4 text-xs">
            <div className="font-semibold mb-1">Hi, {user.displayName.split(" ")[0]}</div>
            <p className="text-muted-foreground">Your timezone: {user.timezone.replace("_", " ")}</p>
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
