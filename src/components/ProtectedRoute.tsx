import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  const allowed = roles.some((r) => user.roles.includes(r));
  if (!allowed) return <Navigate to="/me" replace />;
  return <Outlet />;
}
