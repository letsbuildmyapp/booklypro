import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HomeLink } from "@/components/HomeLink";
import { useAuth } from "@/lib/auth";
import { listMemberBusinesses } from "@/lib/api";

export default function NotFoundPage() {
  const { user } = useAuth();

  let homeHref = "/";
  if (user) {
    if (user.roles.includes("superadmin")) {
      homeHref = "/platform";
    } else {
      const memberOf = listMemberBusinesses(user.id);
      if (user.roles.includes("admin") && memberOf[0]) homeHref = `/admin/${memberOf[0].slug}`;
      else if (user.roles.includes("staff") && memberOf[0]) homeHref = `/staff/${memberOf[0].slug}`;
      else homeHref = "/me";
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-grain">
      <header className="container py-6"><HomeLink /></header>
      <main className="flex-1 grid place-items-center px-6">
        <div className="text-center max-w-lg">
          <span className="eyebrow text-primary">Lost in the schedule</span>
          <h1 className="mt-3 text-display font-semibold tracking-tight" style={{ fontSize: "clamp(64px, 12vw, 128px)", lineHeight: 1 }}>404</h1>
          <p className="mt-4 text-muted-foreground">We couldn't find that page. The booking might have moved — try the homepage.</p>
          <Button asChild size="lg" className="mt-6"><Link to={homeHref}>{user ? "Back to my dashboard" : "Back home"}</Link></Button>
        </div>
      </main>
    </div>
  );
}
