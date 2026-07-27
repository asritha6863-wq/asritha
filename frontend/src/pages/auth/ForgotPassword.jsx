import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import TextField from '../../components/common/TextField';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

const ForgotPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (values) => {
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const { data } = await authService.forgotPassword(values.email);
      setMessage(data.message);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Forgot your password?</h2>
          <p className="mb-6 text-sm text-slate-500">
            Enter your email and we will send you a link to reset your password.
          </p>

          {message && (
            <div className="mb-4">
              <Alert variant="success">{message}</Alert>
            </div>
          )}
          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
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
            <Button type="submit" loading={submitting} className="w-full">
              Send reset link
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

export default ForgotPassword;
