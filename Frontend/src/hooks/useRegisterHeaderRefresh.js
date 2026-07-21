import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

export function useRegisterHeaderRefresh({
  onRefresh,
  refreshing = false,
  lastRefreshedAt = null,
} = {}) {
  const { setHeaderRefresh } = useOutletContext() ?? {};

  useEffect(() => {
    if (!setHeaderRefresh) return undefined;
    if (!onRefresh) {
      setHeaderRefresh(null);
      return undefined;
    }
    setHeaderRefresh({ onRefresh, refreshing, lastRefreshedAt });
    return () => setHeaderRefresh(null);
  }, [setHeaderRefresh, onRefresh, refreshing, lastRefreshedAt]);
}
