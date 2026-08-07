// Small alert banner for success/error/info messages on auth forms.
const VARIANT_STYLES = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
};

const Alert = ({ variant = 'info', children }) => {
  if (!children) return null;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${VARIANT_STYLES[variant]}`} role="alert">
      {children}
    </div>
  );
};

export default Alert;
