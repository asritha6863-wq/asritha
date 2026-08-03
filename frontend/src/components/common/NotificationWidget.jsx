/**
 * NotificationWidget.jsx
 * Inline dashboard notification panel — shows last 5 unread notifications.
 * Placed at the bottom of any role dashboard for at-a-glance alerts.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';

const TYPE_ICON = {
  requirement_submitted:  '📋',
  requirement_approved:   '✅',
  requirement_returned:   '↩️',
  requirement_rejected:   '❌',
  quotation_pending:      '📁',
  quotation_submitted:    '📤',
  quotation_approved:     '📋',
  po_pending:             '🛒',
  po_submitted:           '📄',
  po_review:              '🔍',
  po_signed:              '✍️',
  grn_pending:            '📦',
  grn_submitted:          '📦',
  grn_approved:           '✅',
  payment_pending:        '💳',
  payment_verification:   '🔍',
  process_completed:      '🎉',
};

const fmtTime = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const NotificationWidget = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await notificationService.getAll({ page: 1, limit: 5, unreadOnly: 'true' });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Refresh every 30 seconds
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleClick = async (n) => {
    if (!n.read) {
      try {
        await notificationService.markRead(n._id);
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch { /* silent */ }
    }
    if (n.actionUrl) navigate(n.actionUrl);
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={handleMarkAll}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
              ✓ Mark all read
            </button>
          )}
          <button onClick={() => navigate('/notifications')}
            className="text-xs font-medium text-navy-600 hover:underline">
            View all →
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-px p-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 px-3 py-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-2.5 bg-slate-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-3xl mb-2">🔔</p>
          <p className="text-sm font-medium text-slate-600">All caught up!</p>
          <p className="text-xs text-slate-400 mt-0.5">No unread notifications.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {notifications.map(n => (
            <button key={n._id} onClick={() => handleClick(n)}
              className={`w-full text-left flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50 border-l-2
                ${n.read ? 'border-l-transparent' : 'border-l-blue-400 bg-blue-50/30'}`}>
              <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-sm
                ${n.read ? 'bg-slate-100' : 'bg-white border border-slate-200 shadow-sm'}`}>
                {TYPE_ICON[n.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs leading-snug ${n.read ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>
                    {n.title}
                  </p>
                  <span className="shrink-0 text-xs text-slate-400">{fmtTime(n.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{n.message}</p>
                {n.requirementNumber && (
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500">
                    {n.requirementNumber}
                  </span>
                )}
              </div>
              {!n.read && <div className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationWidget;
