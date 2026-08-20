/** Map logged-in account + active role into the profile modal shape. */

const COACH_ROLE_IDS = new Set(["wc", "awc", "trainee"]);

function formatPhone(countryCode, phone) {
  const digits = String(phone || "").trim();
  if (!digits) return "—";
  const cc = String(countryCode || "").trim();
  if (!cc) return digits;
  const normalized = cc.startsWith("+") ? cc : `+${cc}`;
  return `${normalized} ${digits}`;
}

function formatAddress(account) {
  const parts = [
    account?.address,
    account?.addressLine1,
    account?.addressLine2,
    account?.city,
    account?.state,
    account?.country,
    account?.pincode || account?.pinCode || account?.postalCode,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return [...new Set(parts)].join(", ") || "—";
}

function formatMemberSince(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLastSignIn(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return `${day} · ${time} IST`;
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

function roleInitial(roleName) {
  const name = String(roleName || "").trim();
  return name ? name.charAt(0).toUpperCase() : "?";
}

export function isCoachProfileRole(roleId) {
  return COACH_ROLE_IDS.has(String(roleId || "").trim());
}

/**
 * @param {object|null} account
 * @param {{ name?: string, id?: string }|null} activeRole
 */
export function buildProfileFromAccount(account, activeRole) {
  const roleName = activeRole?.name || account?.designation || "—";
  if (!account) {
    return {
      id: "",
      initial: roleInitial(roleName),
      name: "Not signed in",
      role: roleName,
      roleId: activeRole?.id || "",
      roleNote: "set by admin",
      email: "—",
      whatsapp: "—",
      phoneDigits: "",
      phoneCountryCode: "+91",
      whatsappHint: "",
      address: "—",
      bio: "",
      memberSince: "—",
      lastSignIn: "—",
      referralCode: "",
      profileImage: "",
      hasPhone: false,
      isCoach: isCoachProfileRole(activeRole?.id),
      totpRequired: false,
      totpConfigured: false,
      twoFactorStatus: "Disabled",
    };
  }

  const whatsapp = formatPhone(account.phoneCountryCode, account.phone);
  const hasPhone = Boolean(String(account.phone || "").trim());
  const totpRequired = Boolean(account.totpRequired);
  const totpConfigured = Boolean(account.totpConfigured ?? account.totpSecret);

  return {
    id: account.id || "",
    initial: roleInitial(roleName),
    name: account.name || "—",
    role: roleName,
    roleId: activeRole?.id || "",
    roleNote: "set by admin",
    email: account.email || "—",
    whatsapp,
    phoneDigits: String(account.phone || "").trim(),
    phoneCountryCode: String(account.phoneCountryCode || "+91").trim() || "+91",
    whatsappHint: hasPhone
      ? "This number is used for WhatsApp and OTP sign-in."
      : "Add a mobile number for WhatsApp and OTP sign-in.",
    address: formatAddress(account),
    bio: account.bio || "",
    memberSince: formatMemberSince(account.createdAt),
    lastSignIn: formatLastSignIn(account.lastLoginAt || account.lastSignIn || account.updatedAt),
    referralCode: String(account.referralCode || "").trim().toUpperCase(),
    profileImage: account.profileImage || "",
    hasPhone,
    isCoach: isCoachProfileRole(activeRole?.id),
    totpRequired,
    totpConfigured,
    twoFactorStatus: totpRequired
      ? totpConfigured
        ? "Enabled · authenticator app"
        : "Enabled · key pending"
      : "Disabled",
  };
}

export function accountAvatarInitial(account, fallback = "?") {
  return initialsFromName(account?.name) || fallback;
}

/** @deprecated Prefer buildProfileFromAccount — kept only for empty fallback. */
export const ADMIN_PROFILE = buildProfileFromAccount(null, { id: "admin", name: "Admin" });
