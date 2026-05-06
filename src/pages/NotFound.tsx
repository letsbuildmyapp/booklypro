import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-6">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-3">404</p>
        <h1 className="font-display text-5xl mb-4">Lost in the studio.</h1>
        <p className="text-lg text-ink-600 dark:text-ink-200 mb-8">
          The page you were looking for isn't here. Maybe it never was.
        </p>
        <Link to="/" className="btn-primary">Back home</Link>
      </div>
    </div>
  );
}
