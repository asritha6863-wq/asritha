import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import Button from '../../components/common/Button';
import TextField from '../../components/common/TextField';
import Alert from '../../components/common/Alert';
import { ALL_ROLES } from '../../constants/roles';

const emptyForm = {
  employeeId: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: ALL_ROLES[0],
  phone: '',
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: emptyForm });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/users', { params: search ? { search } : {} });
      setUsers(data.users);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateForm = () => {
    setEditingId(null);
    reset(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingId(user._id);
    reset({
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
    });
    setShowForm(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const payload = { ...values };
        delete payload.password; // password changes aren't handled via this form
        await api.put(`/admin/users/${editingId}`, payload);
      } else {
        await api.post('/admin/users', values);
      }
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user? They will no longer be able to log in.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to deactivate user.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage employee accounts and role assignments.</p>
        </div>
        <Button onClick={openCreateForm}>+ New User</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="card p-4">
        <input
          type="text"
          placeholder="Search by name, email, or employee ID…"
          className="input-field max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            {editingId ? 'Edit User' : 'New User'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Employee ID"
                name="employeeId"
                register={register}
                registerOptions={{ required: 'Required' }}
                error={errors.employeeId}
              />
              <TextField
                label="First name"
                name="firstName"
                register={register}
                registerOptions={{ required: 'Required' }}
                error={errors.firstName}
              />
              <TextField
                label="Last name"
                name="lastName"
                register={register}
                registerOptions={{ required: 'Required' }}
                error={errors.lastName}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                register={register}
                registerOptions={{ required: 'Required' }}
                error={errors.email}
              />
              <TextField label="Phone" name="phone" register={register} />
              {!editingId && (
                <TextField
                  label="Temporary password"
                  name="password"
                  type="password"
                  register={register}
                  registerOptions={{ required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } }}
                  error={errors.password}
                />
              )}
            </div>

            {/* Role select rendered manually since TextField is a plain input */}
            <div>
              <label className="field-label" htmlFor="role-select">
                Role
              </label>
              <select id="role-select" className="input-field" {...register('role', { required: true })}>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={saving}>
                {editingId ? 'Save changes' : 'Create user'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEditForm(u)}
                    className="mr-3 font-medium text-navy-600 hover:text-navy-800"
                  >
                    Edit
                  </button>
                  {u.isActive && (
                    <button
                      onClick={() => handleDeactivate(u._id)}
                      className="font-medium text-red-600 hover:text-red-800"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
