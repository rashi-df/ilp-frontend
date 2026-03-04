import { ChevronLeft, ChevronRight } from 'lucide-react';

const btnBase = `inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm
  transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30`;

export default function Pagination({ page = 1, totalPages = 1, onPageChange }) {
  if (totalPages <= 1) return null;

  // Build visible page numbers
  const getPages = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPages();

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {/* Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Go to previous page"
        className={`${btnBase} text-text-secondary hover:bg-surface-alt
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Page numbers */}
      {pages[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            aria-label="Page 1"
            className={`${btnBase} text-text-secondary hover:bg-surface-alt`}
          >
            1
          </button>
          {pages[0] > 2 && (
            <span className="w-9 h-9 flex items-center justify-center text-text-muted text-sm" aria-hidden="true">
              …
            </span>
          )}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          className={`${btnBase}
            ${
              p === page
                ? 'bg-primary text-white font-medium'
                : 'text-text-secondary hover:bg-surface-alt'
            }`}
        >
          {p}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="w-9 h-9 flex items-center justify-center text-text-muted text-sm" aria-hidden="true">
              …
            </span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            aria-label={`Page ${totalPages}`}
            className={`${btnBase} text-text-secondary hover:bg-surface-alt`}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Go to next page"
        className={`${btnBase} text-text-secondary hover:bg-surface-alt
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
