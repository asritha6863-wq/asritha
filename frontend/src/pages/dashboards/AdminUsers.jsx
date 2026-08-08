import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import Button from '../../components/common/Button';
import TextField from '../../components/common/TextField';
import Alert from '../../components/common/Alert';
import { ALL_ROLES } from '../../constants/roles';
import { fileUrl } from '../../utils/fileUrl';

const emptyForm = {
  employeeId: '', firstName: '', lastName: '',
  email: '', password: '', role: ALL_ROLES[0], phone: '',
  department: '',
};

const Avatar = ({ src, name, size = 'sm' }) => {
  const dim = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-9 w-9 text-sm';
  const initials = name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
  const imgSrc = src ? fileUrl(src) : null;
  if (imgSrc) {
    return (
      <img src={imgSrc} alt={name}
        className={`${dim} rounded-full object-cover border-2 border-pink-100 shrink-0`}
        onError={e => { e.target.style.display='none'; }}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers]               = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const LIMIT = 15;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues: emptyForm });

  const loadUsers = useCallback(async (pg = page) => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/admin/users', {
        params: { page: pg, limit: LIMIT, ...(search ? { search } : {}) }
      });
      setUsers(data.users);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / LIMIT));
    } catch (err) { setError(err.message || 'Failed to load users.'); }
    finally { setLoading(false); }
  }, [search, page]);

  const loadDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/departments');
      setDepartments(data.departments || []);
    } catch { /* graceful */ }
  }, []);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { loadUsers(page); loadDepartments(); }, [loadUsers, loadDepartments, page]);

  const openCreateForm = () => {
    setEditingId(null);
    reset(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingId(user._id);
    reset({
      employeeId: user.employeeId,
      firstName:  user.firstName,
      lastName:   user.lastName,
      email:      user.email,
      password:   '',
      role:       user.role,
      phone:      user.phone || '',
      department: user.department?._id || user.department || '',
    });
    setShowForm(true);
  };

  const onSubmit = async (values) => {
    setSaving(true); setError('');
    try {
      if (editingId) {
        const payload = { ...values };
        delete payload.password;
        if (!payload.department) delete payload.department;
        await api.put(`/admin/users/${editingId}`, payload);
      } else {
        await api.post('/admin/users', values);
      }
      setShowForm(false);
      await loadUsers();
    } catch (err) { setError(err.message || 'Failed to save user.'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try { await api.delete(`/admin/users/${id}`); await loadUsers(); }
    catch (err) { setError(err.message || 'Failed to deactivate user.'); }
  };

  const currentRole = watch('role');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-slate-800">Users</h1>
        <Button onClick={openCreateForm}>+ New User</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="card p-4">
        <input type="text" placeholder="Search by name, email or employee ID…"
          className="input-field max-w-sm" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="mb-5 text-base font-semibold text-slate-900">{editingId ? 'Edit User' : 'New User'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* ── User fields ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Employee ID" name="employeeId" register={register}
                registerOptions={{ required: 'Required' }} error={errors.employeeId} />
              <TextField label="First name" name="firstName" register={register}
                registerOptions={{ required: 'Required' }} error={errors.firstName} />
              <TextField label="Last name" name="lastName" register={register}
                registerOptions={{ required: 'Required' }} error={errors.lastName} />
              <TextField label="Email" name="email" type="email" register={register}
                registerOptions={{ required: 'Required' }} error={errors.email} />
              <TextField label="Phone" name="phone" register={register} />
              {!editingId && (
                <TextField label="Temporary password" name="password" type="password" register={register}
                  registerOptions={{ required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } }}
                  error={errors.password} />
              )}
            </div>

            {/* ── Role ── */}
            <div>
              <label className="field-label" htmlFor="role-select">Role <span className="text-red-500">*</span></label>
              <select id="role-select" className="input-field" {...register('role', { required: true })}>
                {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* ── Department ── */}
            <div>
              <label className="field-label" htmlFor="dept-select">Department</label>
              <select id="dept-select" className="input-field" {...register('department')}>
                <option value="">— No department assigned —</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.departmentName} ({d.departmentCode})</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Employees must be assigned to a department to submit purchase requests.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saving}>{editingId ? 'Save changes' : 'Create user'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Users Table ── */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-pink-50 text-sm">
          <thead className="bg-pink-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Photo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No users found.</td></tr>
            )}
            {users.map(u => (
              <tr key={u._id} className="hover:bg-pink-50/30 transition-colors">
                <td className="px-4 py-3">
                  <Avatar src={u.profileImage} name={`${u.firstName} ${u.lastName}`} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-slate-400">{u.employeeId}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {u.department?.departmentName || <span className="text-slate-400 italic">None</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEditForm(u)} className="mr-3 text-sm font-medium text-pink-600 hover:text-pink-800">Edit</button>
                  {u.isActive && (
                    <button onClick={() => handleDeactivate(u._id)} className="text-sm font-medium text-red-600 hover:text-red-800">Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}</span> of <span className="font-medium">{total}</span> users
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
              ‹ Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? totalPages : page - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`min-w-[2rem] rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${p === page ? 'bg-pink-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
