import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
    <p className="font-display text-7xl font-extrabold text-navy-700">404</p>
    <h1 className="mt-4 text-xl font-semibold text-slate-900">Page not found</h1>
    <p className="mt-2 max-w-sm text-sm text-slate-500">
      The page you are looking for does not exist or may have been moved.
    </p>
    <Link to="/dashboard" className="btn-primary mt-6">
      Back to dashboard
    </Link>
  </div>
);

export default NotFound;
