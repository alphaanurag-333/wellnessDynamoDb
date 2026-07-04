import { Link } from "react-router-dom";
import { AiOutlineEye } from "react-icons/ai";
import { getClientHubModuleCount, isHealTier } from "./clientHubShared.js";

export function getClientInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ClientTableUserCell({ user }) {
  return (
    <div className="user-cell">
      <span className="user-cell__avatar" aria-hidden="true">
        {getClientInitials(user?.name)}
      </span>
      <div>
        <div className="user-cell__name">{user?.name || "—"}</div>
        <div className="user-cell__id">{user?.email || "—"}</div>
      </div>
    </div>
  );
}

export function ClientListRowPrograms({ user }) {
  const heal = isHealTier(user.userTier);
  const moduleCount = getClientHubModuleCount(user.userTier);

  return (
    <div className="client-list-programs">
      <span className="client-list-programs__count">
        {moduleCount} module{moduleCount === 1 ? "" : "s"}
      </span>
      <span className="client-list-programs__tags">
        <span className="pill pill--pay-neutral">Water</span>
        <span className="pill pill--pay-neutral">Steps</span>
        {heal ? <span className="pill pill--active">+Wellness</span> : null}
      </span>
    </div>
  );
}

export function ClientListRowActions({ user, viewPath, onReassign }) {
  const userId = user._id || user.id;

  return (
    <div className="row-actions row-actions--tight">
      {onReassign ? (
        <button
          type="button"
          className="icon-btn icon-btn--ghost"
          title="Reassign client"
          aria-label={`Reassign ${user.name || "client"}`}
          onClick={() => onReassign(user)}
        >
          ↻
        </button>
      ) : null}
      <Link
        to={viewPath || `${userId}`}
        className="icon-btn icon-btn--view"
        title="View client"
        aria-label={`View ${user.name || "client"}`}
      >
        <AiOutlineEye size={18} />
      </Link>
    </div>
  );
}

/** @deprecated Use ClientListRowPrograms + ClientListRowActions */
export function ClientListRowStats(props) {
  return (
    <div className="client-list-row-stats">
      <ClientListRowPrograms user={props.user} />
      <ClientListRowActions {...props} />
    </div>
  );
}
