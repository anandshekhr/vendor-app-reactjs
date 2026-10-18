import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-ink-muted">The page you are looking for does not exist or was moved.</p>
      <Link to="/dashboard" className="mt-5">
        <Button>Go to dashboard</Button>
      </Link>
    </div>
  );
}
