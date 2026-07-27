import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8 text-red-500">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5 14.5 14.5M14.5 9.5 9.5 14.5" strokeLinecap="round" />
      </svg>
    </div>
    <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
    <p className="mt-2 max-w-sm text-sm text-slate-500">
      Your role does not have permission to view this page. Contact your administrator if you believe this is a mistake.
    </p>
    <Link to="/dashboard" className="btn-primary mt-6">
      Back to dashboard
    </Link>
  </div>
);

export default Unauthorized;
