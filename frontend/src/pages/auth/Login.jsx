import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLE_DASHBOARD_PATH } from '../../constants/roles';
import TextField from '../../components/common/TextField';
import Alert from '../../components/common/Alert';

/* NiSHKA fan/peacock logo — rose on blush */
const NishkaLogo = () => (
  <svg viewBox="0 0 80 80" fill="none" className="h-20 w-20 drop-shadow-md">
    <circle cx="40" cy="50" r="7" fill="#c13575" />
    <circle cx="40" cy="50" r="3" fill="#fde0ec" />
    {[
      [0,-22],[8,-20],[15,-14],[20,-7],[22,0],[20,8],
      [-8,-20],[-15,-14],[-20,-7],[-22,0],[-20,8],
    ].map(([dx, dy], i) => (
      <g key={i}>
        <line
          x1="40" y1="50" x2={40 + dx} y2={50 + dy}
          stroke="#c13575" strokeWidth="1.8" strokeLinecap="round"
        />
        <circle cx={40 + dx} cy={50 + dy} r="2.8" fill="#c13575" />
      </g>
    ))}
  </svg>
);

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const onSubmit = async (values) => {
    setServerError('');
    setSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      const redirectTo = location.state?.from?.pathname || ROLE_DASHBOARD_PATH[user.role] || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #fdf0f5 0%, #fde0ec 60%, #fbbdd6 100%)' }}
    >
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center">
          <NishkaLogo />
          <h1
            className="mt-3 font-display text-4xl font-extrabold tracking-[0.18em]"
            style={{ color: '#c13575' }}
          >
            NiSHKA
          </h1>
          <p className="mt-0.5 text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: '#a12860' }}>
            Momentous Jewellery
          </p>
          <div className="mt-4 h-px w-20 rounded-full" style={{ background: 'linear-gradient(90deg,transparent,#c13575,transparent)' }} />
          <p className="mt-3 text-sm font-medium" style={{ color: '#6e1f41' }}>
            Procurement Management System
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border bg-white/90 backdrop-blur-sm px-8 py-8 shadow-brand-lg"
          style={{ borderColor: 'rgba(193,53,117,0.18)' }}
        >
          <h2 className="mb-1 text-lg font-bold" style={{ color: '#2d0a1a' }}>Welcome back</h2>
          <p className="mb-6 text-sm text-slate-500">Sign in to access your dashboard.</p>

          {serverError && (
            <div className="mb-4">
              <Alert variant="error">{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                placeholder="you@nishka.com"
                autoComplete="email"
                className="input-field"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold hover:underline"
                  style={{ color: '#c13575' }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="input-field"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-2 py-3 text-base"
            >
              {submitting
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: '#a12860' }}>
          © {new Date().getFullYear()} NiSHKA Momentous Jewellery
        </p>
      </div>
    </div>
  );
};

export default Login;
