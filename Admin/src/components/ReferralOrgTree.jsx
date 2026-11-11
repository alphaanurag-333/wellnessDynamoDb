import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { userTierBadgeFromApi } from "../data/usersData.js";

function kindLabel(node, badge) {
  if (node?.nodeKind === "coach") return "Coach";
  if (node?.nodeKind === "awc") return "Assistant WC";
  return badge?.label || "Client";
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

function OrgCard({ node, canOpenUser, canEditReferralUsed, onCorrectReferralUsed, collapsed, onToggle }) {
  const [editingVia, setEditingVia] = useState(false);
  const [viaDraft, setViaDraft] = useState("");
  const [viaError, setViaError] = useState("");
  const [viaSaving, setViaSaving] = useState(false);

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isStaff = node.nodeKind === "coach" || node.nodeKind === "awc";
  const name = node.name || (isStaff ? "Staff referrer" : "Unnamed user");
  const code = node.referralCode || "—";
  const via = node.joinedViaCode || node.referredByCode || null;
  const hasTier = Boolean(
    node.userTier || node.tier || String(node.clientCategory || "").toLowerCase() === "eagle"
  );
  const tierBadge = !isStaff && hasTier ? userTierBadgeFromApi(node) : null;
  const tierTextStyle = tierBadge ? { color: tierBadge.style.color } : undefined;
  const canEditVia = Boolean(canEditReferralUsed && onCorrectReferralUsed && !isStaff);

  const startViaEdit = () => {
    setViaDraft(String(via || "").trim());
    setViaError("");
    setEditingVia(true);
  };

  const cancelViaEdit = () => {
    setEditingVia(false);
    setViaError("");
  };

  const submitViaEdit = async () => {
    const code = String(viaDraft || "").trim();
    if (!code) {
      setViaError("Enter a referral code");
      return;
    }
    setViaSaving(true);
    setViaError("");
    try {
      await onCorrectReferralUsed(node.id, code);
      setEditingVia(false);
    } catch (err) {
      setViaError(err?.message || "Could not update referral code");
    } finally {
      setViaSaving(false);
    }
  };

  return (
    <div className={`ua-org-card${isStaff ? " ua-org-card--staff" : ""}`}>
      <div className="ua-org-card__avatar" aria-hidden="true">
        {initials(name)}
      </div>
      <div className="ua-org-card__body">
        {canOpenUser && !isStaff ? (
          <Link
            className="ua-org-card__name"
            to={UPDATED_ADMIN_PATHS.userDetail(node.id)}
            title={name}
            style={tierTextStyle}
          >
            {shortLabel(name, 28)}
          </Link>
        ) : (
          <span className="ua-org-card__name" title={name} style={tierTextStyle}>
            {shortLabel(name, 28)}
          </span>
        )}
        <div className="ua-org-card__meta">
          <span className="ua-rt-chip" style={tierTextStyle}>
            {code}
          </span>
          {tierBadge ? (
            <span
              className="ua-tier"
              style={{
                background: tierBadge.style.bg,
                color: tierBadge.style.color,
                borderColor: tierBadge.style.border,
              }}
            >
              {kindLabel(node, tierBadge)}
            </span>
          ) : (
            <span className={`ua-rt-chip${isStaff ? " ua-rt-chip--staff" : " ua-rt-chip--muted"}`}>
              {kindLabel(node, tierBadge)}
            </span>
          )}
          {canEditVia && editingVia ? (
            <span className="ua-org-card__via-form">
              <input
                type="text"
                className="ua-org-card__via-input"
                value={viaDraft}
                onChange={(event) => setViaDraft(event.target.value.toUpperCase())}
                placeholder="Referral code"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={viaSaving}
              />
              <span className="ua-org-card__via-actions">
                <button type="button" className="ua-org-card__via-save" disabled={viaSaving} onClick={submitViaEdit}>
                  {viaSaving ? "…" : "Save"}
                </button>
                <button type="button" className="ua-org-card__via-cancel" disabled={viaSaving} onClick={cancelViaEdit}>
                  Cancel
                </button>
              </span>
              {viaError ? <span className="ua-org-card__via-error">{viaError}</span> : null}
            </span>
          ) : null}
          {!editingVia && via ? (
            <span className="ua-rt-chip ua-rt-chip--via" style={tierTextStyle}>
              via {via}
            </span>
          ) : null}
          {canEditVia && !editingVia ? (
            <button type="button" className="ua-org-card__via-edit" onClick={startViaEdit}>
              {via ? "Change" : "Set code used"}
            </button>
          ) : null}
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

function OrgBranch({ node, collapsedMap, onToggle, canOpenUser, canEditReferralUsed, onCorrectReferralUsed }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const collapsed = collapsedMap.has(node.id);

  return (
    <li className="ua-org-node">
      <OrgCard
        node={node}
        canOpenUser={canOpenUser}
        canEditReferralUsed={canEditReferralUsed}
        onCorrectReferralUsed={onCorrectReferralUsed}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {hasChildren && !collapsed ? (
        <ul className="ua-org-children">
          {node.children.map((child) => (
            <OrgBranch
              key={child.id}
              node={child}
              collapsedMap={collapsedMap}
              onToggle={onToggle}
              canOpenUser={canOpenUser}
              canEditReferralUsed={canEditReferralUsed}
              onCorrectReferralUsed={onCorrectReferralUsed}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Classic top-down org chart with connector lines. */
export function ReferralOrgTree({
  root,
  collapsedMap,
  onToggle,
  canOpenUser,
  canEditReferralUsed = false,
  onCorrectReferralUsed,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const center = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max > 0) el.scrollLeft = Math.round(max / 2);
    };
    center();
    const id = window.requestAnimationFrame(center);
    return () => window.cancelAnimationFrame(id);
  }, [root, collapsedMap]);

  if (!root) return null;

  return (
    <div className="ua-org-scroll" ref={scrollRef}>
      <ul className="ua-org-tree">
        <li className="ua-org-node">
          <div className="ua-org-admin">Admin</div>
          <ul className="ua-org-children">
            <OrgBranch
              node={root}
              collapsedMap={collapsedMap}
              onToggle={onToggle}
              canOpenUser={canOpenUser}
              canEditReferralUsed={canEditReferralUsed}
              onCorrectReferralUsed={onCorrectReferralUsed}
            />
          </ul>
        </li>
      </ul>
    </div>
  );
}
