import { Link } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

function tierLabel(tier) {
  const key = String(tier || "").toLowerCase();
  if (key === "heal") return "Heal";
  if (key === "seek") return "Seek";
  if (key === "consultancy_only") return "Consultancy";
  if (key === "maintenance") return "Maintenance";
  return tier || "";
}

function kindLabel(node) {
  if (node?.nodeKind === "coach") return "Coach";
  if (node?.nodeKind === "awc") return "Assistant WC";
  return tierLabel(node?.userTier) || "Client";
}

function shortLabel(value, max = 26) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function OrgCard({ node, canOpenUser, collapsed, onToggle }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isStaff = node.nodeKind === "coach" || node.nodeKind === "awc";
  const name = node.name || (isStaff ? "Staff referrer" : "Unnamed user");
  const code = node.referralCode || "—";
  const via = node.joinedViaCode || node.referredByCode || null;

  return (
    <div className={`ua-org-card${isStaff ? " ua-org-card--staff" : ""}`}>
      <div className="ua-org-card__avatar" aria-hidden="true">
        {initials(name)}
      </div>
      <div className="ua-org-card__body">
        {canOpenUser && !isStaff ? (
          <Link className="ua-org-card__name" to={UPDATED_ADMIN_PATHS.userDetail(node.id)} title={name}>
            {shortLabel(name, 28)}
          </Link>
        ) : (
          <span className="ua-org-card__name" title={name}>
            {shortLabel(name, 28)}
          </span>
        )}
        <div className="ua-org-card__meta">
          <span className="ua-rt-chip">{code}</span>
          <span className={`ua-rt-chip${isStaff ? " ua-rt-chip--staff" : " ua-rt-chip--muted"}`}>
            {kindLabel(node)}
          </span>
          {via ? <span className="ua-rt-chip ua-rt-chip--via">via {via}</span> : null}
        </div>
        {hasChildren ? (
          <button type="button" className="ua-org-card__toggle" onClick={() => onToggle(node.id)}>
            {collapsed ? `Show ${node.children.length} ↓` : `Hide ${node.children.length} ↑`}
          </button>
        ) : (
          <span className="ua-org-card__leaf">No sub-referrals</span>
        )}
      </div>
    </div>
  );
}

function OrgBranch({ node, collapsedMap, onToggle, canOpenUser }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const collapsed = collapsedMap.has(node.id);

  return (
    <li className="ua-org-node">
      <OrgCard node={node} canOpenUser={canOpenUser} collapsed={collapsed} onToggle={onToggle} />
      {hasChildren && !collapsed ? (
        <ul className="ua-org-children">
          {node.children.map((child) => (
            <OrgBranch
              key={child.id}
              node={child}
              collapsedMap={collapsedMap}
              onToggle={onToggle}
              canOpenUser={canOpenUser}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Classic top-down org chart with connector lines. */
export function ReferralOrgTree({ root, collapsedMap, onToggle, canOpenUser }) {
  if (!root) return null;

  return (
    <div className="ua-org-scroll">
      <ul className="ua-org-tree">
        <OrgBranch
          node={root}
          collapsedMap={collapsedMap}
          onToggle={onToggle}
          canOpenUser={canOpenUser}
        />
      </ul>
    </div>
  );
}
