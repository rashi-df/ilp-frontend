import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, icon: Icon, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-text-muted" />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border bg-surface text-text-primary placeholder:text-text-muted
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 text-sm
            ${error ? 'border-danger' : 'border-surface-border'}
            ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

export default Input;
