import { useSelector } from "react-redux";
import { selectIsSuperAdmin, selectPermissions } from "../../store/authSelectors.js";
import { parentClientHubPermissionKey } from "../data/adminClientHubPermissionKeys.js";

/**
 * `useHasPermission("banners.edit")` -> true/false.
 * Super admins always pass, matching the backend's authorize() semantics.
 * For users.clientHub.* child keys, the parent section key is also required.
 */
export function useHasPermission(slug) {
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const permissions = useSelector(selectPermissions);

  if (isSuperAdmin) return true;
  if (!slug) return false;
  if (!permissions.includes(slug)) return false;
  const parent = parentClientHubPermissionKey(slug);
  if (parent && !permissions.includes(parent)) return false;
  return true;
}

/**
 * Resource leaf from navItems `to` (e.g. `banners`, `program-testimonials`).
 * Returns `{ canView, canEdit, canDelete }` for UI gating on list/detail pages.
 */
export function useResourcePermissions(resource) {
  const base = String(resource || "").trim();
  const canView = useHasPermission(base ? `${base}.view` : "");
  const canEdit = useHasPermission(base ? `${base}.edit` : "");
  const canDelete = useHasPermission(base ? `${base}.delete` : "");
  return { canView, canEdit, canDelete };
}
