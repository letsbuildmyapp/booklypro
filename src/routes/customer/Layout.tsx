import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Calendar, Compass, Heart, LogOut, MessageSquare, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { listMemberBusinesses, listNotifications } from "@/lib/api";
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
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  if (!user) return null;
  const memberOf = listMemberBusinesses(user.id);
  const unread = listNotifications(user.id).filter((n) => !n.readAt).length;

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="container py-5 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <div className="flex items-center gap-2">
          <button
            aria-label="Messages"
            className="relative touch-target rounded-2xl px-3 hover:bg-secondary text-muted-foreground"
            onClick={() => nav("/me/messages")}
          >
            <MessageSquare className="h-5 w-5" />
            {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" />}
          </button>
          <ThemeToggle />
          {memberOf.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to={user.roles.includes("admin") ? `/admin/${memberOf[0].slug}` : `/staff/${memberOf[0].slug}`}>
                Switch to {user.roles.includes("admin") ? "admin" : "staff"}
              </Link>
            </Button>
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

      <div className="container grid lg:grid-cols-[240px_1fr] gap-8 pb-20">
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
          <div className="hidden lg:block mt-4 rounded-3xl bg-secondary/50 p-4 text-xs">
            <div className="font-semibold mb-1">Hi, {user.displayName.split(" ")[0]}</div>
            <p className="text-muted-foreground">Your timezone: {user.timezone.replace("_", " ")}</p>
          </div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
