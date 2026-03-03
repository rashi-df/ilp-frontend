import { useState } from 'react';

/**
 * Manages search + page state for paginated lists.
 * handleSearch(val) — sets search and resets page to 1.
 * resetPagination() — clears both search and page.
 */
export function usePaginatedQuery() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const resetPagination = () => { setSearch(''); setPage(1); };

  return { search, setSearch, page, setPage, handleSearch, resetPagination };
}
