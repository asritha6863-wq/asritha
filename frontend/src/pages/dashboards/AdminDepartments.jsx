import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import Button from '../../components/common/Button';
import TextField from '../../components/common/TextField';
import Alert from '../../components/common/Alert';

const emptyForm = { departmentName: '', departmentCode: '' };

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: emptyForm });

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/departments');
      setDepartments(data.departments);
    } catch (err) {
      setError(err.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const openCreateForm = () => {
    setEditingId(null);
    reset(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (dept) => {
    setEditingId(dept._id);
    reset({ departmentName: dept.departmentName, departmentCode: dept.departmentCode });
    setShowForm(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/admin/departments/${editingId}`, values);
      } else {
        await api.post('/admin/departments', values);
      }
      setShowForm(false);
      await loadDepartments();
    } catch (err) {
      setError(err.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/departments/${id}`);
      await loadDepartments();
    } catch (err) {
      setError(err.message || 'Failed to delete department.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the organization&apos;s departments.</p>
        </div>
        <Button onClick={openCreateForm}>+ New Department</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {showForm && (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            {editingId ? 'Edit Department' : 'New Department'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Department name"
                name="departmentName"
                register={register}
                registerOptions={{ required: 'Required' }}
                error={errors.departmentName}
              />
              <TextField
                label="Department code"
                name="departmentCode"
                register={register}
                registerOptions={{ required: 'Required' }}
                error={errors.departmentCode}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" loading={saving}>
                {editingId ? 'Save changes' : 'Create department'}
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && departments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No departments found.
                </td>
              </tr>
            )}
            {departments.map((d) => (
              <tr key={d._id}>
                <td className="px-4 py-3 font-medium text-slate-800">{d.departmentName}</td>
                <td className="px-4 py-3 text-slate-600">{d.departmentCode}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEditForm(d)}
                    className="mr-3 font-medium text-navy-600 hover:text-navy-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(d._id)}
                    className="font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDepartments;
