import { Link } from 'react-router-dom';

export function ServerError() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-6">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-3">500</p>
        <h1 className="font-display text-5xl mb-4">Something snipped.</h1>
        <p className="text-lg text-ink-600 dark:text-ink-200 mb-8">
          The server hit a snag. Refresh, or come back in a moment.
        </p>
        <Link to="/" className="btn-primary">Back home</Link>
      </div>
    </div>
  );
}
