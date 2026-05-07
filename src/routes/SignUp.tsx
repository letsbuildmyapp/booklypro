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
import { Loader2 } from "lucide-react";

const schema = z.object({
  displayName: z.string().min(2, "Tell us your name"),
  email: z.string().email("Valid email please"),
  phone: z.string().optional(),
  password: z.string().min(6, "At least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function SignUpPage() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/me";
  const intent = params.get("intent"); // "business" → onboarding flow
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { displayName: "", email: "", phone: "", password: "" } });

  async function onSubmit(d: FormData) {
    setSubmitting(true);
    try {
      await signUp({ displayName: d.displayName, email: d.email, phone: d.phone, password: d.password });
      toast.success("Account created. Welcome!");
      if (intent === "business") nav("/onboarding/business");
      else nav(next);
    } catch (e: any) {
      toast.error(e.message || "Could not create account");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-grain">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 grid place-items-center px-6 py-12">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-title1 font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-muted-foreground">Free for customers, free trial for businesses.</p>
          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" autoComplete="name" {...form.register("displayName")} />
              {form.formState.errors.displayName && <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="phone" type="tel" autoComplete="tel" {...form.register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create account
            </Button>
          </form>
          <div className="mt-6 text-sm text-muted-foreground text-center">
            Have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
