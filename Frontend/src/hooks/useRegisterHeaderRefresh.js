import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

export function useRegisterHeaderRefresh({ onRefresh, refreshing = false } = {}) {
  const ctx = useOutletContext();

  useEffect(() => {
    const register = ctx?.setHeaderRefresh;
    if (!register) return undefined;
    if (!onRefresh) {
      register(null);
      return undefined;
    }
    register({ onRefresh, refreshing });
    return () => register(null);
  }, [ctx, onRefresh, refreshing]);
}
