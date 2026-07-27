// Reusable labeled text input designed to plug into react-hook-form's register().
const TextField = ({ label, name, type = 'text', register, error, registerOptions, ...rest }) => {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="field-label">
          {label}
        </label>
      )}
      <input
        id={name}
        type={type}
        className="input-field"
        {...(register ? register(name, registerOptions) : {})}
        {...rest}
      />
      {error && <p className="field-error">{error.message}</p>}
    </div>
  );
};

export default TextField;
