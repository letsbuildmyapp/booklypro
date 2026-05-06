import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { ArrowRight, User, Scissors, Settings } from 'lucide-react';
import { SEED_USERS, DEMO_TILES } from '@/lib/seed-data';

const TILE_ICON = { Customer: User, Staff: Scissors, Admin: Settings };

export function Login() {
  const { signIn, signInGoogle } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@booklypro.demo');
  const [password, setPassword] = useState('demo1234');
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back');
      nav('/home');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function googleIn() {
    setPending(true);
    try {
      await signInGoogle();
      nav('/home');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function quick(uid: string) {
    const u = SEED_USERS.find((x) => x.uid === uid);
    if (!u) return;
    setEmail(u.email);
    setPassword('demo1234');
    setPending(true);
    try {
      await signIn(u.email, 'demo1234');
      toast.success(`Signed in as ${u.role}`);
      nav('/home');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-cream dark:bg-ink-900 text-ink-900 dark:text-ink-50">
      {/* Left visual panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-sage-100 via-cream to-blush-100 dark:from-sage-800 dark:via-ink-800 dark:to-blush-800/40 border-r border-ink-100 dark:border-ink-700">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sage-600 grid place-items-center text-white font-display text-xl">b</div>
          <span className="font-display text-2xl">BooklyPro</span>
        </Link>
        <div>
          <p className="eyebrow text-sage-700 dark:text-sage-200 mb-5">Today at Bloom &amp; Bough</p>
          <h2 className="font-display text-5xl xl:text-6xl leading-[1.05] tracking-tight">
            <em className="italic text-sage-700 dark:text-sage-300">Four</em> appointments.<br />
            Three stylists.<br />
            One <span className="text-blush-600 dark:text-blush-300">very calm</span> Tuesday.
          </h2>
          <p className="mt-6 text-lg text-ink-700 dark:text-ink-200 max-w-md leading-relaxed">
            Demo data is seeded and safe to break. Try every role; tour each one.
          </p>
        </div>
        <p className="text-sm text-ink-500 dark:text-ink-300">demo · seeded · friendly</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-sage-600 grid place-items-center text-white font-display text-lg">b</div>
            <span className="font-display text-2xl">BooklyPro</span>
          </Link>
          <p className="eyebrow mb-3">Welcome back</p>
          <h1 className="font-display text-4xl mb-8">Sign in.</h1>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? 'Signing in…' : (<>Continue <ArrowRight size={16} /></>)}
            </button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <div className="flex-1 h-px bg-ink-200 dark:bg-ink-700" />
            <span className="eyebrow">or</span>
            <div className="flex-1 h-px bg-ink-200 dark:bg-ink-700" />
          </div>

          <button onClick={googleIn} disabled={pending} className="btn-secondary w-full">
            Continue with Google
          </button>

          <div className="mt-10">
            <p className="eyebrow mb-3">Demo accounts · one click</p>
            <div className="grid grid-cols-3 gap-3">
              {DEMO_TILES.map((t) => {
                const Icon = TILE_ICON[t.label as keyof typeof TILE_ICON];
                return (
                  <button
                    key={t.uid}
                    type="button"
                    onClick={() => quick(t.uid)}
                    disabled={pending}
                    className="card p-4 text-left hover:border-sage-400 hover:shadow-lift transition-all disabled:opacity-50"
                  >
                    <div className="h-9 w-9 rounded-xl bg-sage-100 dark:bg-sage-800/40 grid place-items-center text-sage-700 dark:text-sage-300 mb-3">
                      <Icon size={16} />
                    </div>
                    <div className="font-display text-base">{t.label}</div>
                    <div className="text-xs text-ink-500 dark:text-ink-300 mt-0.5">{t.sub}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink-500 dark:text-ink-300">password: <code className="num font-mono">demo1234</code></p>
          </div>

          <p className="mt-10 text-sm text-ink-500 dark:text-ink-300">
            New here? <Link to="/signup" className="text-sage-700 dark:text-sage-300 hover:underline font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
