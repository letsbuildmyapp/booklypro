import type { ReactNode } from "react";
import { Calendar, Clock, Compass, MessageSquare, Heart, Sparkles, Wallet, Users, Building2, Wrench, ShieldCheck, Palette, BarChart3 } from "lucide-react";
import type { Role } from "@/lib/types";

export interface TutorialStep {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  target?: string; // data-tour selector value
  placement?: "top" | "bottom" | "left" | "right";
}

export const TUTORIAL_STEPS: Record<Role, TutorialStep[]> = {
  customer: [
    {
      icon: <Heart className="h-5 w-5" />,
      title: "Welcome to BooklyPro",
      body: <>Your personal calendar across every business you book with. Two minutes to get oriented.</>,
    },
    {
      icon: <Compass className="h-5 w-5" />,
      title: "Find new businesses",
      body: <>Browse every business on the platform — search by name, neighborhood, or service type.</>,
      target: "customer-discover",
      placement: "right",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Your bookings",
      body: <>Upcoming and past appointments live here. Click any to manage, reschedule, or cancel.</>,
      target: "customer-bookings",
      placement: "right",
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Talk to your business",
      body: <>Each booking has its own thread. Quick questions, parking notes, last-minute updates.</>,
      target: "customer-messages",
      placement: "right",
    },
    {
      icon: <Heart className="h-5 w-5" />,
      title: "Saved for next time",
      body: <>Businesses you've used appear here for one-tap rebooking.</>,
      target: "customer-saved",
      placement: "right",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "All set",
      body: <>You're good to go. Find a business and book in under a minute.</>,
    },
  ],
  staff: [
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Your day, at a glance",
      body: <>Day, week, and month views of your own bookings — drag to reschedule within your column.</>,
      target: "staff-calendar",
      placement: "right",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Set your hours",
      body: <>Click into <strong>My hours</strong> to set when customers can book you. Copy-to-weekdays makes it fast.</>,
      target: "staff-hours",
      placement: "right",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "You're all set",
      body: <>Mark complete or no-show as your day progresses. Your numbers update in real time on the admin dashboard.</>,
    },
  ],
  admin: [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Welcome to your control room",
      body: <>You can do everything your staff can, plus configure the business itself. Tour takes 90 seconds.</>,
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Master calendar",
      body: <>One grid, every staff member as a column. Drag bookings between staff or across times.</>,
      target: "admin-calendar",
      placement: "right",
    },
    {
      icon: <Wrench className="h-5 w-5" />,
      title: "Services",
      body: <>Set durations, prices, deposits, buffers, and which staff can perform what.</>,
      target: "admin-services",
      placement: "right",
    },
    {
      icon: <Palette className="h-5 w-5" />,
      title: "Brand the page",
      body: <>Your booking page can match your business — logo, hero image, brand hue. Pro tier hides the BooklyPro footer.</>,
      target: "admin-branding",
      placement: "right",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "AI scheduling assistant",
      body: <>Pro feature. Ask in plain English to move appointments, block time, or batch-update — confirm before anything changes.</>,
      target: "admin-ai",
      placement: "right",
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      title: "Ready to publish",
      body: <>Your booking page is live at <code>/b/your-slug</code>. Share the link, watch it fill up.</>,
    },
  ],
  superadmin: [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Platform view",
      body: <>You see every tenant. Suspend, reactivate, dive into any account.</>,
    },
    {
      icon: <Building2 className="h-5 w-5" />,
      title: "Tenants table",
      body: <>Search, filter, and step into any business as if you were the owner.</>,
      target: "platform-tenants",
      placement: "top",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "All set",
      body: <>Use it sparingly — most issues resolve themselves once businesses learn the tools.</>,
    },
  ],
};
