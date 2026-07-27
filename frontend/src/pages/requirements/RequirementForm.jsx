import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useAuth from '../../hooks/useAuth';
import requirementService from '../../services/requirementService';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';

const CATEGORIES = ['IT Equipment','Office Supplies','Furniture','Machinery','Software','Services','Raw Materials','Other'];
const PRIORITIES = ['Low','Medium','High','Urgent'];
const UNITS = ['Piece','Set','Box','Carton','Kg','Liter','Meter','Unit','Pack','Pair'];
const ALLOWED_EXTS = ['.pdf','.doc','.docx','.xls','.xlsx','.jpg','.jpeg','.png'];
const MAX_SIZE = 20 * 1024 * 1024;

const Field = ({ label, error, required, children }) => (
  <div>
    <label className="field-label">
      {label}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="field-error">{error.message}</p>}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
    {children}
  </h3>
);

const RequirementForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: { priority: 'Medium', quantity: 1, estimatedUnitPrice: 0 },
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEdit);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const qty = watch('quantity');
  const price = watch('estimatedUnitPrice');
  const total = (parseFloat(qty) || 0) * (parseFloat(price) || 0);

  // Load existing requirement for edit
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const { data } = await requirementService.getOne(id);
        const r = data.requirement;
        reset({
          category: r.category, itemName: r.itemName, brand: r.brand, model: r.model,
          specification: r.specification, quantity: r.quantity, unit: r.unit,
          estimatedUnitPrice: r.estimatedUnitPrice, priority: r.priority,
          purpose: r.purpose, requiredDate: r.requiredDate?.split('T')[0],
          deliveryLocation: r.deliveryLocation,
        });
        setExistingAttachments(r.attachments || []);
      } catch {
        toast.error('Failed to load requirement');
        navigate('/requirements');
      } finally {
        setFetchingData(false);
      }
    };
    load();
  }, [id, isEdit, navigate, reset]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const addFiles = (incoming) => {
    const valid = incoming.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) { toast.error(`${f.name}: file type not allowed`); return false; }
      if (f.size > MAX_SIZE) { toast.error(`${f.name}: exceeds 20 MB limit`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
  };

  const removeNewFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const removeExisting = async (attId) => {
    if (!id) return;
    try {
      await requirementService.removeAttachment(id, attId);
      setExistingAttachments(prev => prev.filter(a => a._id !== attId));
      toast.success('Attachment removed');
    } catch {
      toast.error('Failed to remove attachment');
    }
  };

  const saveData = async (values, submitAfter = false) => {
    const payload = { ...values };
    let reqId = id;

    try {
      if (isEdit) {
        await requirementService.update(reqId, payload);
      } else {
        const { data } = await requirementService.create(payload);
        reqId = data.requirement._id;
      }

      // Upload new files if any
      if (files.length > 0) {
        await requirementService.upload(reqId, files);
      }

      if (submitAfter) {
        await requirementService.submit(reqId);
        toast.success('Requirement submitted for approval!');
      } else {
        toast.success(isEdit ? 'Draft updated.' : 'Requirement saved as draft.');
      }

      navigate('/requirements');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const onSaveDraft = handleSubmit(async (values) => {
    setLoading(true);
    await saveData(values, false);
    setLoading(false);
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    await saveData(values, true);
    setSubmitting(false);
  });

  const formatSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  if (fetchingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">
            {isEdit ? 'Edit Requirement' : 'New Requirement'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEdit ? 'Update draft details or submit for approval' : 'Fill in the details and save as draft or submit directly'}
          </p>
        </div>
        <button onClick={() => navigate('/requirements')} className="btn-secondary text-sm">← Back</button>
      </div>

      {/* General Info */}
      <div className="card p-6">
        <SectionTitle>General Information</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Requesting Employee">
            <input className="input-field bg-slate-50" value={`${user?.firstName} ${user?.lastName}`} readOnly />
          </Field>
          <Field label="Employee ID">
            <input className="input-field bg-slate-50" value={user?.employeeId || '—'} readOnly />
          </Field>
          <Field label="Department">
            <input className="input-field bg-slate-50" value={user?.department?.departmentName || '—'} readOnly />
          </Field>
          <Field label="Designation">
            <input className="input-field bg-slate-50" value={user?.designation?.designationName || '—'} readOnly />
          </Field>
          <Field label="Request Date">
            <input className="input-field bg-slate-50" value={new Date().toLocaleDateString()} readOnly />
          </Field>
        </div>
      </div>

      {/* Item Information */}
      <div className="card p-6">
        <SectionTitle>Item Information</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Item Category" error={errors.category} required>
            <select className="input-field" {...register('category', { required: 'Category is required' })}>
              <option value="">Select category...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Item Name" error={errors.itemName} required>
            <input className="input-field" placeholder="e.g. Dell Laptop XPS 15" {...register('itemName', { required: 'Item name is required', maxLength: { value: 200, message: 'Max 200 chars' } })} />
          </Field>

          <Field label="Brand" error={errors.brand}>
            <input className="input-field" placeholder="e.g. Dell" {...register('brand')} />
          </Field>

          <Field label="Model" error={errors.model}>
            <input className="input-field" placeholder="e.g. XPS-9530" {...register('model')} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Technical Specification" error={errors.specification}>
              <textarea rows={3} className="input-field resize-none" placeholder="Describe technical details, requirements, specs..." {...register('specification', { maxLength: { value: 2000, message: 'Max 2000 chars' } })} />
            </Field>
          </div>

          <Field label="Quantity" error={errors.quantity} required>
            <input type="number" min="1" step="1" className="input-field" {...register('quantity', { required: 'Quantity is required', min: { value: 1, message: 'Must be ≥ 1' }, valueAsNumber: true })} />
          </Field>

          <Field label="Unit" error={errors.unit} required>
            <select className="input-field" {...register('unit', { required: 'Unit is required' })}>
              <option value="">Select unit...</option>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <Field label="Estimated Unit Price (₹)" error={errors.estimatedUnitPrice} required>
            <input type="number" min="0" step="0.01" className="input-field" {...register('estimatedUnitPrice', { required: 'Price is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })} />
          </Field>

          <Field label="Estimated Total Price">
            <input className="input-field bg-emerald-50 font-semibold text-emerald-700" value={`₹ ${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} readOnly />
          </Field>
        </div>
      </div>

      {/* Purchase Details */}
      <div className="card p-6">
        <SectionTitle>Purchase Details</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Priority" error={errors.priority} required>
            <select className="input-field" {...register('priority', { required: 'Priority is required' })}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Required Delivery Date" error={errors.requiredDate} required>
            <input type="date" className="input-field" min={new Date().toISOString().split('T')[0]} {...register('requiredDate', {
              required: 'Delivery date is required',
              validate: v => new Date(v) >= new Date(new Date().toDateString()) || 'Date cannot be in the past',
            })} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Delivery Location" error={errors.deliveryLocation} required>
              <input className="input-field" placeholder="e.g. Block A, IT Department, 2nd Floor" {...register('deliveryLocation', { required: 'Delivery location is required', maxLength: { value: 300, message: 'Max 300 chars' } })} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Purpose / Justification" error={errors.purpose} required>
              <textarea rows={4} className="input-field resize-none" placeholder="Explain why this item is needed and how it will be used..." {...register('purpose', { required: 'Purpose is required', maxLength: { value: 2000, message: 'Max 2000 chars' } })} />
            </Field>
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="card p-6">
        <SectionTitle>Attachments</SectionTitle>

        {/* Existing attachments */}
        {existingAttachments.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Existing Files</p>
            {existingAttachments.map(att => (
              <div key={att._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">📄</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{att.originalName}</p>
                    <p className="text-xs text-slate-500">{formatSize(att.size)}</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <a href={`${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}/${att.path}`} target="_blank" rel="noreferrer" className="text-xs text-navy-600 hover:underline">Preview</a>
                  <button onClick={() => removeExisting(att._id)} className="text-xs text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={handleFileDrop}
          onDragOver={e => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:border-navy-400 hover:bg-navy-50 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input').click()}
        >
          <p className="text-4xl mb-2">📁</p>
          <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
          <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG · Max 20 MB per file</p>
          <input id="file-input" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" className="hidden" onChange={e => addFiles(Array.from(e.target.files))} />
        </div>

        {/* New files queued */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Files to Upload ({files.length})</p>
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">🆕</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-500">{formatSize(f.size)}</p>
                  </div>
                </div>
                <button onClick={() => removeNewFile(i)} className="ml-4 shrink-0 text-xs text-red-600 hover:underline">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <button onClick={() => navigate('/requirements')} className="btn-secondary text-sm">Cancel</button>
        <div className="flex gap-3">
          <button onClick={() => reset()} type="button" className="btn-secondary text-sm">Reset Form</button>
          <Button variant="secondary" onClick={onSaveDraft} loading={loading} disabled={submitting}>Save Draft</Button>
          <Button onClick={onSubmit} loading={submitting} disabled={loading}>Submit Requirement</Button>
        </div>
      </div>
    </div>
  );
};

export default RequirementForm;
