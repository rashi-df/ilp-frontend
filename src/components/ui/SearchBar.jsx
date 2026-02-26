import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search...',
}) {
  const [internal, setInternal] = useState(value);
  const timerRef = useRef(null);

  // Sync from parent when value prop changes externally
  useEffect(() => {
    setInternal(value);
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInternal(val);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(val);
    }, 300);
  };

  const handleClear = () => {
    setInternal('');
    clearTimeout(timerRef.current);
    onChange('');
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-text-muted" />
      </div>
      <input
        type="text"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border bg-surface text-text-primary
          placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30
          focus:border-primary pl-10 pr-9 py-2 text-sm"
      />
      {internal && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
