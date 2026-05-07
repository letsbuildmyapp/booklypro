import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background bg-grain">
      <header className="container py-6"><Link to="/"><Logo /></Link></header>
      <main className="flex-1 grid place-items-center px-6">
        <div className="text-center max-w-lg">
          <span className="eyebrow text-primary">Lost in the schedule</span>
          <h1 className="mt-3 text-display font-semibold tracking-tight" style={{ fontSize: "clamp(64px, 12vw, 128px)", lineHeight: 1 }}>404</h1>
          <p className="mt-4 text-muted-foreground">We couldn't find that page. The booking might have moved — try the homepage.</p>
          <Button asChild size="lg" className="mt-6"><Link to="/">Back home</Link></Button>
        </div>
      </main>
    </div>
  );
}
