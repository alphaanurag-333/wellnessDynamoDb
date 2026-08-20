import { useViewAs } from "../../context/ViewAsContext.jsx";
import {
  clientSectionLabel,
  resolveClientSectionPermissions,
} from "../../utils/clientProfilePermissions.js";

export function ClientSectionDenied({ title, subtitle }) {
  return (
    <div className="ua-cp-section ua-cp-placeholder" role="status">
      <h2 className="ua-cp-placeholder__title">{title || "Access restricted"}</h2>
      <p className="ua-cp-placeholder__sub">
        {subtitle || "Your role does not include permission to view this section."}
      </p>
      <p className="ua-cp-placeholder__note">
        Ask an admin to adjust your permissions in Access Control if you need access.
      </p>
    </div>
  );
}

/** Hides a client profile panel when the signed-in role lacks section view permission. */
export function ClientProfileSectionGate({ section, label, children }) {
  const { can } = useViewAs();
  const { canView } = resolveClientSectionPermissions(can, section);
  if (!canView) {
    return <ClientSectionDenied title={label || clientSectionLabel(section)} />;
  }
  return children;
}

/** Hook for section-level read/write permission flags inside profile panels. */
export function useClientSectionPermissions(sectionId) {
  const { can } = useViewAs();
  return resolveClientSectionPermissions(can, sectionId);
}
