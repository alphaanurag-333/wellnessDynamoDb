import { Link } from "react-router-dom";
import { AiOutlineEye } from "react-icons/ai";
import { getClientHubModuleCount, isHealTier } from "./clientHubShared.js";

export function ClientListRowStats({ user, viewPath, onReassign }) {
  const userId = user._id || user.id;
  const heal = isHealTier(user.userTier);
  const moduleCount = getClientHubModuleCount(user.userTier);

  return (
    <div className="client-list-row-stats">
      <div className="client-list-row-stats__info">
        <span className="client-list-row-stats__count">
          {moduleCount} module{moduleCount === 1 ? "" : "s"}
        </span>
        <span className="client-list-row-stats__tags">
          <span className="client-list-row-stats__tag">Water</span>
          <span className="client-list-row-stats__tag">Steps</span>
          {heal ? <span className="client-list-row-stats__tag client-list-row-stats__tag--heal">+Wellness</span> : null}
        </span>
      </div>
      <div className="client-list-row-stats__actions">
        {onReassign ? (
          <button
            type="button"
            className="icon-btn icon-btn--ghost"
            title="Reassign client"
            aria-label="Reassign client"
            onClick={() => onReassign(user)}
          >
            ↻
          </button>
        ) : null}
        <Link
          to={viewPath || `${userId}`}
          className="icon-btn icon-btn--view"
          title="View client details"
          aria-label={`View ${user.name || "client"} details`}
        >
          <AiOutlineEye size={18} />
        </Link>
      </div>
    </div>
  );
}
