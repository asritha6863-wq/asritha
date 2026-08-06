import { useState, useEffect } from 'react';
import { fileUrl } from '../../utils/fileUrl';
import { useParams, useNavigate } from 'react-router-dom';
import requirementService from '../../services/requirementService';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import ApprovalTimeline from '../../components/requirements/ApprovalTimeline';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';

const Section = ({ title, children }) => (
  <div className="card p-6">
    <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
    {children}
  </div>
);

const Info = ({ label, value, mono = false }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className={`text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
  </div>
);

const RequirementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await requirementService.getOne(id);
        setReq(data.requirement);
      } catch {
        toast.error('Failed to load requirement');
        navigate('/requirements');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!window.confirm('Submit this requirement for approval?')) return;
    setSubmitting(true);
    try {
      await requirementService.submit(id);
      toast.success('Submitted for approval!');
      const { data } = await requirementService.getOne(id);
      setReq(data.requirement);
    } catch (err) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await requirementService.addComment(id, comment);
      toast.success('Comment added');
      setComment('');
      const { data } = await requirementService.getOne(id);
      setReq(data.requirement);
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
      </div>
    );
  }

  if (!req) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-navy-800 font-mono">{req.requirementNumber}</h1>
            <StatusBadge status={req.status} size="lg" />
            <PriorityBadge priority={req.priority} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Created {new Date(req.createdAt).toLocaleString()}
            {req.submittedAt && ` · Submitted ${new Date(req.submittedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate('/requirements')} className="btn-secondary text-sm">← Back</button>
          {['Draft','Returned'].includes(req.status) && (
            <button onClick={() => navigate(`/requirements/${id}/edit`)} className="btn-secondary text-sm">Edit</button>
          )}
          {['Draft','Returned'].includes(req.status) && (
            <Button onClick={handleSubmit} loading={submitting}>
              {req.status === 'Returned' ? 'Resubmit' : 'Submit for Approval'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Employee Info */}
          <Section title="Employee Information">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Employee Name" value={req.employeeName} />
              <Info label="Employee ID" value={req.employeeId} mono />
              <Info label="Department" value={req.departmentName} />
              <Info label="Designation" value={req.designationName} />
              <Info label="Request Date" value={new Date(req.createdAt).toLocaleDateString()} />
            </div>
          </Section>

          {/* Item Details */}
          <Section title="Item Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Category" value={req.category} />
              <Info label="Item Name" value={req.itemName} />
              <Info label="Brand" value={req.brand} />
              <Info label="Model" value={req.model} />
              <Info label="Quantity" value={req.quantity} />
              <Info label="Unit" value={req.unit} />
              <Info label="Est. Unit Price" value={`₹ ${(req.estimatedUnitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
              <Info label="Est. Total Price" value={`₹ ${(req.estimatedTotalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            </div>
            {req.specification && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Technical Specification</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.specification}</p>
              </div>
            )}
          </Section>

          {/* Purchase Details */}
          <Section title="Purchase Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Priority" value={<PriorityBadge priority={req.priority} />} />
              <Info label="Required Delivery Date" value={new Date(req.requiredDate).toLocaleDateString()} />
              <Info label="Delivery Location" value={req.deliveryLocation} />
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Purpose / Justification</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.purpose}</p>
            </div>
          </Section>

          {/* Attachments */}
          <Section title={`Attachments (${req.attachments?.length || 0})`}>
            {req.attachments?.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No attachments uploaded.</p>
            ) : (
              <div className="space-y-2">
                {req.attachments.map(att => (
                  <div key={att._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">📄</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{att.originalName}</p>
                        <p className="text-xs text-slate-500">
                          {(att.size / 1024 / 1024).toFixed(2)} MB · {new Date(att.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
    {(() => {
                      const viewUrl = fileUrl(att.path);
                      return (
                        <a href={viewUrl} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700 shrink-0">
                          👁️ View
                        </a>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Comments */}
          <Section title="Comments">
            {req.comments?.length === 0 ? (
              <p className="text-sm text-slate-400 italic mb-4">No comments yet.</p>
            ) : (
              <div className="mb-4 space-y-3">
                {req.comments.map(c => (
                  <div key={c._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800">{c.authorName}</span>
                      <span className="text-xs text-slate-400">{c.role}</span>
                      <span className="ml-auto text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {['Draft','Submitted','Returned'].includes(req.status) && (
              <div className="flex gap-2">
                <textarea rows={2} className="input-field flex-1 resize-none text-sm" placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} />
                <Button onClick={handleAddComment} loading={submittingComment} disabled={!comment.trim()} className="self-start">Post</Button>
              </div>
            )}
          </Section>
        </div>

        {/* Sidebar: Timeline */}
        <div>
          <Section title="Approval Timeline">
            <ApprovalTimeline status={req.status} timeline={req.timeline || []} />
          </Section>
        </div>
      </div>
    </div>
  );
};

export default RequirementDetail;
