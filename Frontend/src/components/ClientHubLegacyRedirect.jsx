import { Navigate, useParams } from "react-router-dom";
import { LEGACY_TAB_REDIRECTS } from "./clientHubShared.js";

/**
 * Redirect legacy deep links into Client Hub `?tab=` URLs.
 * Coach/assistant: `${basePath}/my-users/${userId}?tab=`
 * Admin: pass hubPathSuffix="hub" → `${basePath}/${userId}/hub?tab=`
 */
export function ClientHubLegacyRedirect({ segment, basePath, hubPathSuffix = "my-users" }) {
  const { userId } = useParams();
  const tab = LEGACY_TAB_REDIRECTS[segment] || "water";
  const to =
    hubPathSuffix === "hub"
      ? `${basePath}/${userId}/hub?tab=${tab}`
      : `${basePath}/${hubPathSuffix}/${userId}?tab=${tab}`;
  return <Navigate to={to} replace />;
}
