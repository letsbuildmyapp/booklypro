import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { listMemberBusinesses } from "@/lib/api";

/**
 * The brand logo with smart destination: signed-in users land on their role's
 * dashboard; anonymous users land on the marketing page. Used on every page
 * where the logo appears so it never sends a signed-in user back to landing.
 */
export function HomeLink({ className }: { className?: string }) {
  const { user } = useAuth();

  let to = "/";
  if (user) {
    if (user.roles.includes("superadmin")) {
      to = "/platform";
    } else {
      const memberOf = listMemberBusinesses(user.id);
      if (user.roles.includes("admin") && memberOf[0]) to = `/admin/${memberOf[0].slug}`;
      else if (user.roles.includes("staff") && memberOf[0]) to = `/staff/${memberOf[0].slug}`;
      else to = "/me";
    }
  }

  return (
    <Link to={to} aria-label="Home" className={className}>
      <Logo />
    </Link>
  );
}
