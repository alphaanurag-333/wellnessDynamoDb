import { useCallback, useEffect, useState } from "react";

/** Default delay (ms) for list/search inputs across admin and coach panels. */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Debounced search state for list filters: instant input + delayed value for API calls.
 */
export function useDebouncedSearch(initialValue = "", { delay = SEARCH_DEBOUNCE_MS, trim = true, maxLength } = {}) {
  const [searchInput, setSearchInput] = useState(initialValue);
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    trim ? String(initialValue).trim() : String(initialValue)
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(trim ? searchInput.trim() : searchInput);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [delay, searchInput, trim]);

  const onSearchChange = useCallback(
    (value) => {
      const next = maxLength != null ? String(value).slice(0, maxLength) : String(value);
      setSearchInput(next);
    },
    [maxLength]
  );

  return { searchInput, setSearchInput, debouncedSearch, onSearchChange };
}
