import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`w-full rounded-lg border bg-surface text-text-primary placeholder:text-text-muted
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          pl-3 pr-3 py-2 text-sm
          ${error ? 'border-danger' : 'border-surface-border'}
          ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

export default Textarea;
