import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Calendar, Home, LogOut, Moon, Sun, Users, Sparkles, Layers } from 'lucide-react';
import { initials } from '@/lib/utils';
import { toast } from 'sonner';
import type { Role } from '@/lib/types';

interface NavItem { to: string; label: string; icon: typeof Home; tour?: string; end?: boolean }

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  customer: [
    { to: '/app', label: 'My bookings', icon: Calendar, tour: 'nav-bookings', end: true },
    { to: '/app/book', label: 'Book',    icon: Sparkles, tour: 'nav-book' },
  ],
  staff: [
    { to: '/staff', label: 'My day', icon: Calendar, end: true, tour: 'nav-day' },
  ],
  admin: [
    { to: '/admin',          label: 'Calendar',  icon: Calendar, end: true, tour: 'nav-cal' },
    { to: '/admin/calendar', label: 'All staff', icon: Layers,             tour: 'nav-all' },
    { to: '/admin/services', label: 'Services',  icon: Sparkles,           tour: 'nav-services' },
    { to: '/admin/staff',    label: 'Staff',     icon: Users,              tour: 'nav-staff' },
  ],
};

export function AppShell() {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  if (!profile) return null;
  const items = NAV_BY_ROLE[profile.role];

  async function out() {
    await signOut();
    toast.success('Signed out');
    nav('/');
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-ink-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-ink-100 dark:border-ink-700 bg-white/80 dark:bg-ink-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3" data-tour="brand">
            <div className="w-9 h-9 rounded-2xl bg-sage-600 grid place-items-center text-white font-display text-lg">b</div>
            <div>
              <p className="font-display text-lg leading-none">BooklyPro</p>
              <p className="text-xs text-ink-500 dark:text-ink-300 leading-tight mt-0.5">Bloom &amp; Bough Salon</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 px-1.5 py-1 rounded-2xl bg-ink-50 dark:bg-ink-700/40">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  data-tour={it.tour}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white dark:bg-ink-800 text-sage-700 dark:text-sage-300 shadow-soft'
                        : 'text-ink-600 dark:text-ink-200 hover:text-ink-900 dark:hover:text-ink-50'
                    }`
                  }
                >
                  <Icon size={16} />
                  {it.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2" data-tour="account">
            <button
              onClick={toggle}
              className="h-10 w-10 grid place-items-center rounded-xl text-ink-500 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-700/40"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <div className="h-9 w-9 rounded-full bg-sage-100 dark:bg-sage-800 grid place-items-center text-sage-700 dark:text-sage-200 font-medium text-sm">
                {initials(profile.name)}
              </div>
              <div className="text-right leading-tight">
                <p className="text-sm font-medium">{profile.name}</p>
                <p className="text-xs text-ink-500 dark:text-ink-300 capitalize">{profile.role}</p>
              </div>
            </div>
            <button
              onClick={out}
              className="h-10 w-10 grid place-items-center rounded-xl text-ink-500 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-700/40"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-3 pb-3 overflow-x-auto">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-sage-600 text-white'
                      : 'bg-ink-50 dark:bg-ink-700/40 text-ink-700 dark:text-ink-200'
                  }`
                }
              >
                <Icon size={14} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-ink-100 dark:border-ink-700 py-6 text-center text-xs text-ink-500 dark:text-ink-400">
        Built by <a href="https://letsbuildmyapp.com" className="text-sage-700 dark:text-sage-300 hover:underline">letsbuildmyapp.com</a>
      </footer>
    </div>
  );
}
