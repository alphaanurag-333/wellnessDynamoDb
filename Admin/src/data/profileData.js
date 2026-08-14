/** Map logged-in account + active role into the profile modal shape. */

function formatPhone(countryCode, phone) {
  const digits = String(phone || "").trim();
  if (!digits) return "—";
  const cc = String(countryCode || "").trim();
  if (!cc) return digits;
  const normalized = cc.startsWith("+") ? cc : `+${cc}`;
  return `${normalized} ${digits}`;
}

function formatAddress(account) {
  const parts = [account?.city, account?.state, account?.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function formatMemberSince(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * @param {object|null} account
 * @param {{ name?: string, id?: string }|null} activeRole
 */
export function buildProfileFromAccount(account, activeRole) {
  if (!account) {
    return {
      initial: "?",
      name: "Not signed in",
      role: activeRole?.name || "—",
      roleNote: "set by admin",
      email: "—",
      whatsapp: "—",
      whatsappHint: "",
      address: "—",
      bio: "",
      memberSince: "—",
      lastSignIn: "—",
      twoFactor: "—",
      profileImage: "",
      hasPhone: false,
    };
  }

  const whatsapp = formatPhone(account.phoneCountryCode, account.phone);
  const hasPhone = Boolean(String(account.phone || "").trim());

  return {
    initial: initialsFromName(account.name),
    name: account.name || "—",
    role: activeRole?.name || account.designation || "—",
    roleNote: "set by admin",
    email: account.email || "—",
    whatsapp,
    whatsappHint: hasPhone
      ? "Verified · a new number needs an OTP before it replaces this one."
      : "No WhatsApp number on file.",
    address: formatAddress(account),
    bio: account.bio || "",
    memberSince: formatMemberSince(account.createdAt),
    lastSignIn: "—",
    twoFactor: "—",
    profileImage: account.profileImage || "",
    hasPhone,
  };
}

export function accountAvatarInitial(account, fallback = "?") {
  return initialsFromName(account?.name) || fallback;
}

/** @deprecated Prefer buildProfileFromAccount — kept only for empty fallback. */
export const ADMIN_PROFILE = buildProfileFromAccount(null, { name: "Admin" });
