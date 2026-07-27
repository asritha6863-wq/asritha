import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import authService from '../../services/authService';
import TextField from '../../components/common/TextField';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const password = watch('password');

  const onSubmit = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      await authService.resetPassword(token, values.password);
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setError(err.message || 'Unable to reset password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Reset your password</h2>
          <p className="mb-6 text-sm text-slate-500">Choose a new password for your account.</p>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <TextField
              label="New password"
              name="password"
              type="password"
              placeholder="••••••••"
              register={register}
              registerOptions={{
                required: 'Password is required',
                minLength: { value: 8, message: 'Must be at least 8 characters' },
              }}
              error={errors.password}
            />
            <TextField
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              register={register}
              registerOptions={{
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              }}
              error={errors.confirmPassword}
            />
            <Button type="submit" loading={submitting} className="w-full">
              Reset password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-medium text-navy-600 hover:text-navy-800">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
