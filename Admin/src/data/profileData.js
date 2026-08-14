import { userInitials } from "./usersData.js";

/** Format phone for display, e.g. "+91 9820011002". */
export function formatAccountPhone(account) {
  const phone = String(account?.phone || "").trim();
  if (!phone) return "—";
  const cc = String(account?.phoneCountryCode || "").trim();
  if (!cc) return phone;
  const normalized = cc.startsWith("+") ? cc : `+${cc.replace(/^\+/, "")}`;
  return `${normalized} ${phone}`;
}

/** City / state / country — no street address on account yet. */
export function formatAccountAddress(account) {
  const parts = [account?.city, account?.state, account?.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export function formatMemberSince(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Map logged-in account + active UI role into ProfileModal display shape.
 */
export function buildProfileFromAccount(account, activeRole) {
  const name = String(account?.name || "").trim() || "Account";
  const roleName = activeRole?.name || "Member";
  const email = String(account?.email || "").trim() || "—";
  const phone = formatAccountPhone(account);
  const hasPhone = phone !== "—";

  return {
    id: account?.id || null,
    initial: userInitials(name).charAt(0) || "?",
    initials: userInitials(name),
    name,
    role: roleName,
    roleNote: "set by admin",
    email,
    whatsapp: phone,
    whatsappHint: hasPhone
      ? "Verified · a new number needs an OTP before it replaces this one."
      : "No WhatsApp number on file — ask an admin to add one.",
    address: formatAccountAddress(account),
    bio: String(account?.bio || ""),
    profileImage: account?.profileImage || null,
    memberSince: formatMemberSince(account?.createdAt),
    lastSignIn: account?.lastSignInAt
      ? formatMemberSince(account.lastSignInAt)
      : "—",
    twoFactor: account?.twoFactorEnabled ? "Enabled" : "Not configured",
  };
}
