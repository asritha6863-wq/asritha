import { useState } from 'react';
import { useForm } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';
import TextField from '../components/common/TextField';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

const Profile = () => {
  const { user, refreshUser } = useAuth();

  // --- Profile info form ---
  const profileForm = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const onSaveProfile = async (values) => {
    setProfileSaving(true);
    setProfileMessage('');
    setProfileError('');
    try {
      await authService.updateProfile(values);
      await refreshUser();
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Change password form ---
  const passwordForm = useForm();
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const newPassword = passwordForm.watch('newPassword');

  const onChangePassword = async (values) => {
    setPwSaving(true);
    setPwMessage('');
    setPwError('');
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      setPwMessage('Password changed successfully.');
      passwordForm.reset();
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your personal information and password.</p>
      </div>

      <div className="card p-6">
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-slate-500">Employee ID</p>
            <p className="font-medium text-slate-800">{user?.employeeId}</p>
          </div>
          <div>
            <p className="text-slate-500">Role</p>
            <p className="font-medium text-slate-800">{user?.role}</p>
          </div>
          <div>
            <p className="text-slate-500">Department</p>
            <p className="font-medium text-slate-800">{user?.department?.departmentName || '—'}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Personal Information</h2>
        {profileMessage && (
          <div className="mb-4">
            <Alert variant="success">{profileMessage}</Alert>
          </div>
        )}
        {profileError && (
          <div className="mb-4">
            <Alert variant="error">{profileError}</Alert>
          </div>
        )}
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="First name"
              name="firstName"
              register={profileForm.register}
              registerOptions={{ required: 'First name is required' }}
              error={profileForm.formState.errors.firstName}
            />
            <TextField
              label="Last name"
              name="lastName"
              register={profileForm.register}
              registerOptions={{ required: 'Last name is required' }}
              error={profileForm.formState.errors.lastName}
            />
          </div>
          <TextField
            label="Email"
            name="email"
            value={user?.email || ''}
            disabled
            className="opacity-70"
          />
          <TextField label="Phone" name="phone" register={profileForm.register} />
          <Button type="submit" loading={profileSaving}>
            Save changes
          </Button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Change Password</h2>
        {pwMessage && (
          <div className="mb-4">
            <Alert variant="success">{pwMessage}</Alert>
          </div>
        )}
        {pwError && (
          <div className="mb-4">
            <Alert variant="error">{pwError}</Alert>
          </div>
        )}
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          <TextField
            label="Current password"
            name="currentPassword"
            type="password"
            register={passwordForm.register}
            registerOptions={{ required: 'Current password is required' }}
            error={passwordForm.formState.errors.currentPassword}
          />
          <TextField
            label="New password"
            name="newPassword"
            type="password"
            register={passwordForm.register}
            registerOptions={{
              required: 'New password is required',
              minLength: { value: 8, message: 'Must be at least 8 characters' },
            }}
            error={passwordForm.formState.errors.newPassword}
          />
          <TextField
            label="Confirm new password"
            name="confirmNewPassword"
            type="password"
            register={passwordForm.register}
            registerOptions={{
              required: 'Please confirm your new password',
              validate: (value) => value === newPassword || 'Passwords do not match',
            }}
            error={passwordForm.formState.errors.confirmNewPassword}
          />
          <Button type="submit" loading={pwSaving}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
