import { createContext, useContext } from "react";

/** When true, client profile sections are view-only (archived / deleted users). */
export const ClientProfileArchivedContext = createContext(false);

export function useClientProfileArchived() {
  return useContext(ClientProfileArchivedContext);
}

export function isArchivedClientUser(user) {
  return (
    String(user?.rawStatus || "").toLowerCase() === "deleted"
    || Boolean(user?.deletedAt)
  );
}
