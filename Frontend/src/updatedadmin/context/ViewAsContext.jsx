import { createContext, useContext, useMemo, useState } from "react";
import { VIEW_AS_ROLES } from "../data/dashboardData.js";

const VIEW_AS_STORAGE_KEY = "ua-view-as";

const ViewAsContext = createContext(null);

function readStoredViewAs() {
  try {
    const stored = localStorage.getItem(VIEW_AS_STORAGE_KEY);
    if (stored && VIEW_AS_ROLES.some((role) => role.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return "admin";
}

export function ViewAsProvider({ children }) {
  const [viewAs, setViewAsState] = useState(readStoredViewAs);

  const setViewAs = (roleId) => {
    setViewAsState(roleId);
    try {
      localStorage.setItem(VIEW_AS_STORAGE_KEY, roleId);
    } catch {
      /* ignore */
    }
  };

  const activeRole = useMemo(
    () => VIEW_AS_ROLES.find((role) => role.id === viewAs) ?? VIEW_AS_ROLES[0],
    [viewAs],
  );

  const value = useMemo(
    () => ({ viewAs, setViewAs, activeRole }),
    [viewAs, activeRole],
  );

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs must be used within ViewAsProvider");
  return ctx;
}
