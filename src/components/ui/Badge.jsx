const variants = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-primary/10 text-primary',
  default: 'bg-surface-alt text-text-secondary',
};

export default function Badge({ variant = 'default', children }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
