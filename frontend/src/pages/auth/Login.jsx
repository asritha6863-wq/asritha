import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLE_DASHBOARD_PATH } from '../../constants/roles';
import TextField from '../../components/common/TextField';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
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
      setServerError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500">
            <span className="font-display text-2xl font-extrabold text-navy-900">E</span>
          </div>
          <h1 className="text-center font-display text-2xl font-bold text-white">ERP Procurement</h1>
          <p className="mt-1 text-center text-sm text-slate-400">& Payment Management System</p>
        </div>

        <div className="card p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mb-6 text-sm text-slate-500">Enter your credentials to access your dashboard.</p>

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
              placeholder="you@company.com"
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
              <Link to="/forgot-password" className="text-sm font-medium text-navy-600 hover:text-navy-800">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={submitting} className="w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Demo accounts: admin@example.com, department_manager@example.com, etc. Password: Passw0rd!
        </p>
      </div>
    </div>
  );
};

export default Login;
