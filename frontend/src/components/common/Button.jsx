// Reusable button with a primary/secondary variant and a built-in loading state.
const Button = ({
  children,
  variant = 'primary',
  loading = false,
  type = 'button',
  className = '',
  disabled,
  ...rest
}) => {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button type={type} disabled={disabled || loading} className={`${base} ${className}`} {...rest}>
      {loading && (
        <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
