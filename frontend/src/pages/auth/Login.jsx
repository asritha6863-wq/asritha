import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLE_DASHBOARD_PATH } from '../../constants/roles';
import TextField from '../../components/common/TextField';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

// NiSHKA teal/sky SVG logo (updated colors)
const NishkaLogo = () => (
  <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16">
    {/* Center circle */}
    <circle cx="40" cy="50" r="7" fill="#0369a1"/>
    <circle cx="40" cy="50" r="3.5" fill="#bfdbfe"/>
    {/* Fan rays */}
    {[
      [0,-22],[8,-20],[15,-15],[20,-8],[22,0],[20,8],
      [-8,-20],[-15,-15],[-20,-8],[-22,0],[-20,8]
    ].map(([dx,dy],i)=>(
      <g key={i}>
        <line x1="40" y1="50" x2={40+dx} y2={50+dy} stroke="#0369a1" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx={40+dx} cy={50+dy} r="2.5" fill="#0369a1"/>
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #bfdbfe 100%)' }}>
      <div className="w-full max-w-md">

        {/* NiSHKA Brand Header */}
        <div className="mb-8 flex flex-col items-center">
          <NishkaLogo />
          <h1 className="mt-3 font-display text-3xl font-bold tracking-widest" style={{ color: '#0369a1', letterSpacing: '0.15em' }}>
            NiSHKA
          </h1>
          <p className="mt-0.5 text-xs tracking-widest text-sky-600 uppercase">Momentous Jewellery</p>
          <div className="mt-4 h-px w-16 bg-sky-300" />
          <p className="mt-3 text-sm font-medium text-sky-700">Procurement Management System</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-sky-100 bg-white shadow-xl shadow-sky-100/50 px-8 py-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Sign in</h2>
          <p className="mb-6 text-sm text-slate-500">Enter your credentials to continue.</p>

          {serverError && (
            <div className="mb-4">
              <Alert variant="error">{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <TextField
              label="Email address"
              name="email"
              type="email"
              placeholder="you@nishka.com"
              register={register}
              registerOptions={{
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              }}
              error={errors.email}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              register={register}
              registerOptions={{ required: 'Password is required' }}
              error={errors.password}
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-sky-600 hover:text-sky-800">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
              style={{ background: submitting ? '#7dd3fc' : '#0ea5e9' }}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-sky-600">
          © {new Date().getFullYear()} NiSHKA Momentous Jewellery
        </p>
      </div>
    </div>
  );
};

export default Login;
