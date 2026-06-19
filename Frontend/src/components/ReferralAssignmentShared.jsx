import { useState } from "react";

export function sanitizeReferralCodeInput(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

export function CopyReferralCode({ code, label = "Referral code" }) {
  const [copied, setCopied] = useState(false);
  const display = code ? String(code).trim().toUpperCase() : "";

  const handleCopy = async () => {
    if (!display) return;
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!display) {
    return (
      <div className="referral-code-block">
        <span className="user-detail-row__label">{label}</span>
        <span className="user-detail-row__value">—</span>
      </div>
    );
  }

  return (
    <div className="referral-code-block">
      <span className="user-detail-row__label">{label}</span>
      <div className="referral-code-block__row">
        <code className="referral-code-block__code">{display}</code>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function UserTierBadge({ tier, assignmentStatus }) {
  const normalizedTier = String(tier || "seek").toLowerCase();
  const isHeal = normalizedTier === "heal";
  const pending = isHeal && assignmentStatus === "pending_admin";

  let className = "tier-badge tier-badge--seek";
  let label = "Seek";

  if (isHeal && pending) {
    className = "tier-badge tier-badge--pending";
    label = "Heal · Pending";
  } else if (isHeal) {
    className = "tier-badge tier-badge--heal";
    label = "Heal";
  }

  return <span className={className}>{label}</span>;
}

export function formatAssignedCoachLabel(user) {
  if (!user) return "—";
  if (user.assignmentStatus === "pending_admin") return "Pending admin assignment";
  if (user.assignedCoach?.name) {
    const typeLabel = user.assignedCoachType === "assistant_wellness_coach" ? "Assistant" : "Coach";
    return `${user.assignedCoach.name} (${typeLabel})`;
  }
  if (user.assignedCoachId) return user.assignedCoachId;
  return "—";
}

export function formatReferredByLabel(user) {
  if (!user?.referredByCode) return "—";
  const type = user.referredByEntityType;
  if (type === "user") return `Peer · ${user.referredByCode}`;
  if (type === "wellness_coach") return `Wellness Coach · ${user.referredByCode}`;
  if (type === "assistant_wellness_coach") return `Assistant · ${user.referredByCode}`;
  return user.referredByCode;
}
