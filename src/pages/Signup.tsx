import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

export function Signup() {
  const { signUp, signInGoogle } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await signUp(email, password, name, 'customer');
      toast.success('Welcome to BooklyPro');
      nav('/home');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-ink-900 grid place-items-center p-6 text-ink-900 dark:text-ink-50">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-sage-600 grid place-items-center text-white font-display text-lg">b</div>
          <span className="font-display text-2xl">BooklyPro</span>
        </Link>
        <div className="card p-8">
          <p className="eyebrow mb-3">Create account</p>
          <h1 className="font-display text-3xl mb-6">Welcome.</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? 'Creating…' : (<>Continue <ArrowRight size={16} /></>)}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-ink-200 dark:bg-ink-700" />
            <span className="eyebrow">or</span>
            <div className="flex-1 h-px bg-ink-200 dark:bg-ink-700" />
          </div>
          <button onClick={async () => { try { await signInGoogle(); nav('/home'); } catch (e) { toast.error((e as Error).message); } }} className="btn-secondary w-full">
            Continue with Google
          </button>
        </div>
        <p className="mt-6 text-sm text-ink-500 dark:text-ink-300 text-center">
          Already have an account? <Link to="/login" className="text-sage-700 dark:text-sage-300 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
