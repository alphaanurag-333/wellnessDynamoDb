import { AccessRestrictedView } from "./AccessRestrictedView.jsx";
import { useCoachPermissions, useHasPermission } from "../hooks/useHasPermission.jsx";

/**
 * Route-level guard: shows AccessRestrictedView when the coach lacks `permission`.
 */
export function RequireCoachPermission({ permission, children }) {
  const { loading } = useCoachPermissions();
  const allowed = useHasPermission(permission);

  if (loading) return children;
  if (!allowed) return <AccessRestrictedView />;
  return children;
}
