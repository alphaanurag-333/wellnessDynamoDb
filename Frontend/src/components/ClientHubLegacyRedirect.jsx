import { Navigate, useParams } from "react-router-dom";
import { LEGACY_TAB_REDIRECTS } from "./clientHubShared.js";

export function ClientHubLegacyRedirect({ segment, basePath }) {
  const { userId } = useParams();
  const tab = LEGACY_TAB_REDIRECTS[segment] || "water";
  return <Navigate to={`${basePath}/my-users/${userId}?tab=${tab}`} replace />;
}
