import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Heart, Shield } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-cream dark:bg-ink-900 text-ink-900 dark:text-ink-50">
      {/* Header */}
      <header className="px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sage-600 grid place-items-center text-white font-display text-xl">b</div>
            <span className="font-display text-2xl">BooklyPro</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/signup" className="btn-primary hidden sm:inline-flex">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 sm:px-8 pt-10 sm:pt-20 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow text-sage-700 dark:text-sage-300 mb-6"
          >
            Booking, reimagined
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-4xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-ink-900 dark:text-ink-50"
          >
            A calmer way to <em className="text-sage-600 italic">book</em> the salon.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-lg sm:text-xl text-ink-600 dark:text-ink-200 max-w-2xl mx-auto leading-relaxed"
          >
            BooklyPro keeps clients booked, stylists informed, and managers in flow — all from one
            beautifully simple interface.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/login" className="btn-primary text-base">
              Try the demo
            </Link>
            <Link to="/signup" className="btn-secondary text-base">
              Create an account
            </Link>
          </motion.div>
          <p className="mt-6 text-sm text-ink-500 dark:text-ink-300">
            One-click sign-in tiles inside · No credit card needed
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-5 sm:px-8 pb-24">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: Calendar, title: 'Calendar that works', body: 'Real-time availability across staff and locations. No double-bookings, ever.' },
            { icon: Clock,    title: 'Reschedule with grace', body: 'Clients move appointments themselves. Stylists see updates instantly.' },
            { icon: Heart,    title: 'Lovely confirmations', body: 'Beautiful emails go out automatically. No more awkward voicemails.' },
            { icon: Shield,   title: 'Role-aware by design', body: 'Customer, staff, and admin each see exactly what they need — nothing more.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-6 sm:p-8">
              <div className="h-12 w-12 rounded-2xl bg-sage-100 dark:bg-sage-800/40 grid place-items-center text-sage-700 dark:text-sage-300 mb-5">
                <Icon size={22} />
              </div>
              <h3 className="font-display text-xl mb-2">{title}</h3>
              <p className="text-base text-ink-600 dark:text-ink-200 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="px-5 sm:px-8 pb-20">
        <div className="max-w-4xl mx-auto card p-8 sm:p-12 text-center bg-gradient-to-br from-sage-50 to-blush-50 dark:from-sage-800/30 dark:to-blush-800/20 border-sage-200 dark:border-sage-700">
          <h2 className="font-display text-3xl sm:text-4xl mb-4">See all three sides.</h2>
          <p className="text-lg text-ink-600 dark:text-ink-200 max-w-xl mx-auto mb-8">
            Sign in as a customer, stylist, or studio manager — every role has a tailored experience.
          </p>
          <Link to="/login" className="btn-primary text-base">Open the demo</Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 dark:border-ink-700 py-8 text-center text-sm text-ink-500 dark:text-ink-300">
        Built by{' '}
        <a href="https://letsbuildmyapp.com" className="text-sage-700 dark:text-sage-300 hover:underline">
          letsbuildmyapp.com
        </a>
      </footer>
    </div>
  );
}
