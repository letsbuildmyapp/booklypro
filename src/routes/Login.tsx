import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, Sparkles } from "lucide-react";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type FormData = z.infer<typeof schema>;

const DEMO_ACCOUNTS: Array<{ email: string; label: string; roleLabel: string }> = [
  { email: "ada@example.com", label: "Ada Reyes", roleLabel: "Customer" },
  { email: "owner@bloomandco.salon", label: "Maya Bloom", roleLabel: "Admin · Salon (Team)" },
  { email: "owner@stillwateryoga.com", label: "Devi Saito", roleLabel: "Admin · Yoga (Pro)" },
  { email: "rosa@bloomandco.salon", label: "Rosa Mendez", roleLabel: "Staff · Salon" },
  { email: "platform@booklypro.app", label: "Platform Admin", roleLabel: "Super-admin" },
];
const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const { signIn, signInGoogle } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/me";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const u = await signIn(data.email, data.password);
      toast.success(`Welcome back, ${u.displayName.split(" ")[0]}`);
      // Route to role-appropriate landing
      if (u.roles.includes("superadmin")) nav("/platform");
      else if (u.roles.includes("admin") && u.memberOf?.[0]) {
        const slug = await import("@/lib/api").then((m) => m.getBusiness(u.memberOf![0])?.slug);
        nav(slug ? `/admin/${slug}` : next);
      } else if (u.roles.includes("staff") && u.memberOf?.[0]) {
        const slug = await import("@/lib/api").then((m) => m.getBusiness(u.memberOf![0])?.slug);
        nav(slug ? `/staff/${slug}` : next);
      } else {
        nav(next);
      }
    } catch (e: any) {
      toast.error(e.message || "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-grain">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 grid place-items-center px-6 py-12">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-title1 font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-muted-foreground">Sign in to manage your bookings.</p>
          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <span className="text-xs text-muted-foreground">Demo: any password works</span>
              </div>
              <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" size="lg" className="w-full" onClick={async () => {
            try { await signInGoogle(); toast.success("Signed in with Google"); nav("/me"); }
            catch (e: any) { toast.error(e.message); }
          }}>
            <GoogleG /> Continue with Google
          </Button>
          <div className="mt-6 text-sm text-muted-foreground text-center">
            New here? <Link to="/signup" className="text-primary font-medium hover:underline">Create an account</Link>
          </div>

          <div className="mt-6 rounded-2xl bg-secondary/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Demo accounts</span>
              <span className="text-[11px] text-muted-foreground ml-auto">click to prefill</span>
            </div>
            <div className="grid gap-1.5">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => {
                    form.setValue("email", acct.email, { shouldValidate: true });
                    form.setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                    toast.success(`Filled ${acct.label}`, { description: "Click Sign in to continue" });
                  }}
                  className="text-left rounded-xl bg-card hover:bg-card/80 hover:ring-2 hover:ring-primary/30 transition-all px-3 py-2 group touch-target"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{acct.label}</div>
                      <code className="text-[11px] text-muted-foreground truncate block">{acct.email}</code>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-primary font-semibold opacity-60 group-hover:opacity-100 transition-opacity shrink-0">{acct.roleLabel}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path fill="#4285F4" d="M15.51 8.18c0-.55-.05-1.07-.13-1.57H8v3.04h4.21c-.18.96-.74 1.78-1.57 2.32v1.93h2.54c1.49-1.37 2.33-3.4 2.33-5.72z"/>
      <path fill="#34A853" d="M8 16c2.12 0 3.9-.7 5.19-1.91l-2.54-1.93c-.7.47-1.6.75-2.65.75-2.04 0-3.77-1.38-4.39-3.23H.99v2c1.29 2.57 3.95 4.32 7.01 4.32z"/>
      <path fill="#FBBC04" d="M3.61 9.68A4.79 4.79 0 0 1 3.36 8c0-.58.1-1.15.26-1.68v-2H.99A8 8 0 0 0 0 8a8 8 0 0 0 .99 3.68l2.62-2z"/>
      <path fill="#EA4335" d="M8 3.18c1.15 0 2.18.4 2.99 1.17L13.22 2.1C11.9.79 10.13 0 8 0 4.95 0 2.29 1.75 1 4.32l2.62 2C4.23 4.56 5.96 3.18 8 3.18z"/>
    </svg>
  );
}
