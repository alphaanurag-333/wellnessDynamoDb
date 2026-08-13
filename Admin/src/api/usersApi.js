import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { UNASSIGNED_COACH, tierLabel } from "../data/usersData.js";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveUserId(user) {
  if (!user) return "";
  return String(user.id || user._id || "");
}

function mapApiTierToUi(userTier) {
  const t = String(userTier || "").toLowerCase().trim();
  if (t === "heal") return "Seek to Heal";
  if (t === "consultancy_only" || t === "consultancy") return "Consultancy";
  if (t === "maintenance") return "Maintenance";
  return "Seek";
}

function mapApiStatusToUi(status) {
  return String(status || "").toLowerCase() === "active" ? "Active" : "Disabled";
}

function mapUtype(userTier) {
  const t = String(userTier || "").toLowerCase().trim();
  if (t === "seek") return "app";
  return "individual";
}

function resolveGoal(user) {
  const phc = user?.primaryHealthConcern;
  if (phc && typeof phc === "object") {
    return String(phc.title || "").trim();
  }
  const other = String(user?.primaryHealthConcernOther || "").trim();
  return other;
}

function resolveCoachName(user) {
  if (user?.parentCoach?.name) return String(user.parentCoach.name).trim();
  if (user?.assignedCoachType === "wellness_coach" && user?.assignedCoach?.name) {
    return String(user.assignedCoach.name).trim();
  }
  return "";
}

function resolveAwcName(user) {
  if (user?.assignedCoachType === "assistant_wellness_coach" && user?.assignedCoach?.name) {
    return String(user.assignedCoach.name).trim();
  }
  return "";
}

function formatPhoneParts(countryCode, phone) {
  const digits = String(phone || "").trim();
  if (!digits) return "";
  const cc = String(countryCode || "").trim();
  return cc ? `${cc} ${digits}` : digits;
}

function parseIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageDaysFrom(iso) {
  const d = parseIso(iso);
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

/** Relative label like "3 days ago" / "today". Empty when no date. */
export function formatJoinedAgo(iso) {
  const d = parseIso(iso);
  if (!d) return "";
  const days = ageDaysFrom(iso);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/** Short label like "22 Jul". Empty when no date. */
export function formatShortDate(iso) {
  const d = parseIso(iso);
  if (!d) return "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Long label like "19 Jul 2026". Empty when no date. */
export function formatLongDate(iso) {
  const d = parseIso(iso);
  if (!d) return "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatLastActive(iso) {
  const d = parseIso(iso);
  if (!d) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 0) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDob(iso) {
  const d = parseIso(iso);
  if (!d) return "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatAddress(user) {
  const parts = [
    user?.addressLine1,
    user?.addressLine2,
    user?.city,
    user?.state,
    user?.country,
    user?.pincode,
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function formatTermsAccepted(user) {
  const at = formatLongDate(user?.termsAcceptedAt);
  if (!at) return user?.termsAccepted ? "Accepted" : "";
  return at;
}

function buildTags(user, goal) {
  const tags = [];
  if (goal) tags.push(goal);
  const tierUi = mapApiTierToUi(user?.userTier);
  const label = tierLabel(tierUi);
  if (label && !tags.includes(label)) tags.push(label);
  return tags;
}

/** Map GET /admin/users item → list + profile UI shape. Missing unique fields stay empty. */
export function mapApiUserToRow(user, index = 0) {
  const id = resolveUserId(user);
  const coach = resolveCoachName(user);
  const name = String(user?.name || "").trim() || "Unnamed";
  const status = mapApiStatusToUi(user?.status);
  const goal = resolveGoal(user);
  const phone = formatPhoneParts(user?.phoneCountryCode, user?.phone);
  const whatsapp = user?.whatsappSameAsMobile
    ? phone
    : formatPhoneParts(user?.whatsappCountryCode, user?.whatsappPhone);
  const createdAt = user?.createdAt || "";
  const updatedAt = user?.updatedAt || createdAt;
  const lastActiveAt = user?.lastActiveAt || "";
  const tier = mapApiTierToUi(user?.userTier);
  const address = formatAddress(user);
  const state = [user?.state, user?.country].filter(Boolean).join(" · ") || String(user?.state || "").trim();

  return {
    id,
    n: index + 1,
    name,
    email: String(user?.email || "").trim(),
    phone,
    whatsapp: whatsapp || "",
    dob: formatDob(user?.dob),
    address,
    state,
    tier,
    goal,
    coach: coach || UNASSIGNED_COACH,
    awc: resolveAwcName(user),
    lastActive: formatLastActive(lastActiveAt),
    status,
    utype: mapUtype(user?.userTier),
    team: "",
    ageDays: ageDaysFrom(createdAt),
    joined: formatLongDate(createdAt),
    joinedAgo: formatJoinedAgo(createdAt),
    lastUpdated: formatShortDate(updatedAt),
    // No dedicated review timestamp on user — leave empty so UI shows "—"
    lastReviewed: "",
    termsIp: "",
    termsAccepted: formatTermsAccepted(user),
    programs: 0,
    programLabel: tierLabel(tier) || "",
    subscriptionDays: 0,
    tags: buildTags(user, goal),
    goals: goal ? [goal] : [],
    profileImage: user?.profileImage || "",
    parentCoachId: user?.parentCoachId || user?.parentCoach?.id || "",
    assignedCoachId: user?.assignedCoachId || user?.assignedCoach?.id || "",
    assignedCoachType: user?.assignedCoachType || "",
    assignmentStatus: String(user?.assignmentStatus || "").toLowerCase(),
    rawStatus: String(user?.status || "").toLowerCase(),
    createdAt,
    updatedAt,
    lastActiveAt,
    paidOnboardingCompleted: Boolean(user?.paidOnboardingCompleted),
    onboardingDone: user?.paidOnboardingCompleted ? 10 : undefined,
    onboardingTotal: 10,
  };
}

export async function fetchUsers({ page = 1, limit = 200, status, search, userTier, assignmentStatus } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (userTier) q.set("userTier", userTier);
  if (assignmentStatus) q.set("assignmentStatus", assignmentStatus);

  try {
    const { data } = await api.get(`/admin/users?${q}`, { headers: authHeader() });
    const users = Array.isArray(data.users) ? data.users : [];
    return {
      users: users.map((u, i) => mapApiUserToRow(u, i)),
      pagination: data.pagination ?? { page, limit, total: users.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUser(id) {
  try {
    const { data } = await api.get(`/admin/users/${encodeURIComponent(id)}`, {
      headers: authHeader(),
    });
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateUserStatus(id, status) {
  try {
    const { data } = await api.patch(
      `/admin/users/${encodeURIComponent(id)}`,
      { status },
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteUser(id) {
  try {
    await api.delete(`/admin/users/${encodeURIComponent(id)}`, { headers: authHeader() });
  } catch (error) {
    normalizeApiError(error);
  }
}

/** First-time coach assignment (pending_admin clients). */
export async function assignUserCoach(id, payload) {
  try {
    const { data } = await api.post(
      `/admin/users/${encodeURIComponent(id)}/assign-coach`,
      payload,
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

/** Change an existing coach / assistant assignment. */
export async function reassignUserCoach(id, payload) {
  try {
    const { data } = await api.post(
      `/admin/users/${encodeURIComponent(id)}/reassign-coach`,
      payload,
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export { resolveUserId };
