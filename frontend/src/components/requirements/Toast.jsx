import { useEffect, useState } from 'react';

const TYPES = {
  success: { bg: 'bg-emerald-600', icon: '✓' },
  error:   { bg: 'bg-red-600',     icon: '✕' },
  info:    { bg: 'bg-navy-700',    icon: 'ℹ' },
  warning: { bg: 'bg-amber-500',   icon: '⚠' },
};

let _show = null;

export const toast = {
  success: (msg) => _show?.({ type: 'success', msg }),
  error:   (msg) => _show?.({ type: 'error',   msg }),
  info:    (msg) => _show?.({ type: 'info',     msg }),
  warning: (msg) => _show?.({ type: 'warning',  msg }),
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _show = ({ type, msg }) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { _show = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2" aria-live="polite">
      {toasts.map(({ id, type, msg }) => {
        const c = TYPES[type] || TYPES.info;
        return (
          <div key={id} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${c.bg} max-w-sm animate-fade-in`}>
            <span className="mt-0.5 font-bold">{c.icon}</span>
            <span className="flex-1">{msg}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== id))} className="ml-1 opacity-70 hover:opacity-100">✕</button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
