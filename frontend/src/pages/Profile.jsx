import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';
import TextField from '../components/common/TextField';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const getAvatarSrc = (profileImage) => {
  if (!profileImage) return null;
  if (profileImage.startsWith('http')) return profileImage;
  return `${BASE_URL}/${profileImage}`;
};

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  // ── Profile photo ─────────────────────────────────────────────────────────
  const [photoFile,     setPhotoFile]     = useState(null);
  const [photoPreview,  setPhotoPreview]  = useState('');
  const [photoSaving,   setPhotoSaving]   = useState(false);
  const [photoMessage,  setPhotoMessage]  = useState('');
  const [photoError,    setPhotoError]    = useState('');

  const handlePhotoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setPhotoError('Photo must be under 5 MB.'); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setPhotoError('');
  };

  const handlePhotoSave = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setPhotoMessage('');
    setPhotoError('');
    try {
      await authService.uploadMyAvatar(photoFile);
      await refreshUser();
      setPhotoMessage('Profile photo updated!');
      setPhotoFile(null);
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const currentAvatar = photoPreview || getAvatarSrc(user?.profileImage);
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '?';

  // ── Profile info ──────────────────────────────────────────────────────────
  const profileForm = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName:  user?.lastName  || '',
      phone:     user?.phone     || '',
    },
  });
  const [profileSaving,  setProfileSaving]  = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError,   setProfileError]   = useState('');

  const onSaveProfile = async (values) => {
    setProfileSaving(true);
    setProfileMessage(''); setProfileError('');
    try {
      await authService.updateProfile(values);
      await refreshUser();
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally { setProfileSaving(false); }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const passwordForm = useForm();
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwError,   setPwError]   = useState('');
  const newPassword = passwordForm.watch('newPassword');

  const onChangePassword = async (values) => {
    setPwSaving(true);
    setPwMessage(''); setPwError('');
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      setPwMessage('Password changed successfully.');
      passwordForm.reset();
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally { setPwSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>

      {/* ── Profile Photo Card ─────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-5 text-base font-semibold text-slate-900">Profile Photo</h2>

        {photoMessage && <div className="mb-4"><Alert variant="success">{photoMessage}</Alert></div>}
        {photoError   && <div className="mb-4"><Alert variant="error">{photoError}</Alert></div>}

        <div className="flex items-center gap-6">
          {/* Avatar preview */}
          <div className="relative shrink-0">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Profile"
                className="h-24 w-24 rounded-full object-cover border-4 border-pink-100 shadow-sm" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-pink-100 border-4 border-pink-200 flex items-center justify-center text-pink-600 text-2xl font-bold shadow-sm">
                {initials}
              </div>
            )}
            {/* Camera overlay button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-pink-600 text-white flex items-center justify-center text-sm shadow-md hover:bg-pink-700 transition-colors"
              title="Change photo"
            >
              📷
            </button>
          </div>

          {/* Info & actions */}
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.role} · {user?.department?.departmentName || '—'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.employeeId}</p>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-100 transition-colors"
              >
                {photoFile ? '🔄 Change Photo' : '📷 Upload Photo'}
              </button>

              {photoFile && (
                <>
                  <Button onClick={handlePhotoSave} loading={photoSaving}>
                    Save Photo
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
                    className="text-sm text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">JPG or PNG · Max 5 MB</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* ── Info Card ─────────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div><p className="text-slate-500">Employee ID</p><p className="font-medium text-slate-800">{user?.employeeId}</p></div>
          <div><p className="text-slate-500">Role</p><p className="font-medium text-slate-800">{user?.role}</p></div>
          <div><p className="text-slate-500">Department</p><p className="font-medium text-slate-800">{user?.department?.departmentName || '—'}</p></div>
        </div>
      </div>

      {/* ── Personal Information ──────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Personal Information</h2>
        {profileMessage && <div className="mb-4"><Alert variant="success">{profileMessage}</Alert></div>}
        {profileError   && <div className="mb-4"><Alert variant="error">{profileError}</Alert></div>}
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="First name" name="firstName" register={profileForm.register}
              registerOptions={{ required: 'First name is required' }}
              error={profileForm.formState.errors.firstName} />
            <TextField label="Last name" name="lastName" register={profileForm.register}
              registerOptions={{ required: 'Last name is required' }}
              error={profileForm.formState.errors.lastName} />
          </div>
          <TextField label="Email" name="email" value={user?.email || ''} disabled className="opacity-70" />
          <TextField label="Phone" name="phone" register={profileForm.register} />
          <Button type="submit" loading={profileSaving}>Save changes</Button>
        </form>
      </div>

      {/* ── Change Password ────────────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Change Password</h2>
        {pwMessage && <div className="mb-4"><Alert variant="success">{pwMessage}</Alert></div>}
        {pwError   && <div className="mb-4"><Alert variant="error">{pwError}</Alert></div>}
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          <TextField label="Current password" name="currentPassword" type="password"
            register={passwordForm.register}
            registerOptions={{ required: 'Current password is required' }}
            error={passwordForm.formState.errors.currentPassword} />
          <TextField label="New password" name="newPassword" type="password"
            register={passwordForm.register}
            registerOptions={{ required: 'New password is required', minLength: { value: 8, message: 'Must be at least 8 characters' } }}
            error={passwordForm.formState.errors.newPassword} />
          <TextField label="Confirm new password" name="confirmNewPassword" type="password"
            register={passwordForm.register}
            registerOptions={{ required: 'Please confirm your new password', validate: v => v === newPassword || 'Passwords do not match' }}
            error={passwordForm.formState.errors.confirmNewPassword} />
          <Button type="submit" loading={pwSaving}>Update password</Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
