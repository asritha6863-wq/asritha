import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import { toast } from '../components/requirements/Toast';

// Icon map per notification type
const TYPE_ICON = {
  requirement_submitted:   '📋',
  requirement_approved:    '✅',
  requirement_returned:    '↩️',
  requirement_rejected:    '❌',
  quotation_pending:       '📁',
  quotation_submitted:     '📤',
  quotation_approved:      '📋',
  po_pending:              '🛒',
  po_submitted:            '📄',
  po_review:               '🔍',
  po_signed:               '✍️',
  grn_pending:             '📦',
  grn_submitted:           '📦',
  grn_approved:            '✅',
  payment_pending:         '💳',
  payment_verification:    '🔍',
  process_completed:       '🎉',
};

const TYPE_COLOR = {
  requirement_rejected: 'border-l-red-500',
  requirement_returned: 'border-l-orange-400',
  process_completed:    'border-l-emerald-500',
  payment_verification: 'border-l-fuchsia-500',
  po_signed:            'border-l-violet-500',
  grn_approved:         'border-l-amber-500',
};

const fmtTime = (date) => {
  const d   = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('all');   // 'all' | 'unread'
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [total, setTotal]         = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearing, setClearing]   = useState(false);

  const load = useCallback(async (pg = 1, currentTab = tab) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 20 };
      if (currentTab === 'unread') params.unreadOnly = 'true';
      const { data } = await notificationService.getAll(params);
      setNotifications(data.notifications);
      setTotal(data.total);
      setPages(data.pages);
      setUnreadCount(data.unreadCount);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(1, tab); setPage(1); }, [tab]);

  const handleMarkRead = async (n) => {
    if (!n.read) {
      try {
        await notificationService.markRead(n._id);
        setUnreadCount(c => Math.max(0, c - 1));
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      } catch { /* silent */ }
    }
    if (n.actionUrl) navigate(n.actionUrl);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch { toast.error('Failed to mark all read'); }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await notificationService.clearAll();
      toast.success('Read notifications cleared.');
      load(1, tab);
    } catch { toast.error('Failed to clear notifications'); }
    finally { setClearing(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0 ? <><span className="font-semibold text-amber-600">{unreadCount} unread</span> · {total} total</> : `${total} notifications`}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              ✓ Mark all read
            </button>
          )}
          <button onClick={handleClearAll} disabled={clearing}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
            {clearing ? 'Clearing…' : '🗑 Clear read'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {[
          { key: 'all',    label: 'All' },
          { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${tab === t.key ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex gap-3 px-5 py-4 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-5xl mb-4">🔔</p>
            <h3 className="text-base font-semibold text-slate-700">
              {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {tab === 'unread' ? "You're all caught up!" : 'Notifications will appear here when actions are required.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(n => (
              <button key={n._id} onClick={() => handleMarkRead(n)}
                className={`w-full text-left flex gap-3 px-5 py-4 transition-colors border-l-4
                  ${n.read ? 'bg-white border-l-transparent hover:bg-slate-50' : 'bg-blue-50/40 border-l-blue-400 hover:bg-blue-50/60'}
                  ${TYPE_COLOR[n.type] && !n.read ? TYPE_COLOR[n.type] : ''}`}>
                {/* Icon */}
                <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-lg
                  ${n.read ? 'bg-slate-100' : 'bg-white shadow-sm border border-slate-200'}`}>
                  {TYPE_ICON[n.type] || '🔔'}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${n.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-400 mt-0.5">{fmtTime(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                  {n.requirementNumber && (
                    <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-600">
                      {n.requirementNumber}
                    </span>
                  )}
                </div>
                {/* Unread dot */}
                {!n.read && (
                  <div className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { setPage(p => p - 1); load(page - 1, tab); }}
            disabled={page === 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            ← Prev
          </button>
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <button onClick={() => { setPage(p => p + 1); load(page + 1, tab); }}
            disabled={page === pages}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
