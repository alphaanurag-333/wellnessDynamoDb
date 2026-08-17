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

export function mapUiStatusToApi(statusFilter) {
  if (statusFilter === "Active") return "active";
  if (statusFilter === "Disabled") return "inactive";
  return undefined;
}

export function mapUiTierToApi(tierFilter) {
  if (tierFilter === "Seek to Heal") return "heal";
  if (tierFilter === "Consultancy") return "consultancy_only";
  if (tierFilter === "Seek") return "seek";
  if (tierFilter === "Maintenance") return "maintenance";
  return undefined;
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

function resolveHealthConcernId(user) {
  const concern = user?.primaryHealthConcern;
  if (concern && typeof concern === "object") {
    return String(concern.id || concern._id || "").trim();
  }
  return String(concern || "").trim();
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

/** Relative date label suitable for profile activity badges. */
export function formatRelativeDate(iso) {
  const d = parseIso(iso);
  if (!d) return "";

  const elapsed = Date.now() - d.getTime();
  if (elapsed < 0) return "";

  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
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

function titleCaseToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatGender(value) {
  return titleCaseToken(value);
}

function formatDietaryPreference(value) {
  return titleCaseToken(value);
}

function formatWellnessJourney(value) {
  if (Array.isArray(value)) {
    return value.map((v) => titleCaseToken(v)).filter(Boolean).join(", ");
  }
  return titleCaseToken(value);
}

/** Paid-onboarding step keys stored on User.paidOnboardingStepStatus */
export const PAID_ONBOARDING_STATUS_KEYS = [
  "personalDetails",
  "profileSetup",
  "bodyMeasurement",
  "progressPhotos180",
  "medicalConditions",
  "internalParameter",
  "launch",
];

export const PAID_ONBOARDING_STEP_LABELS = {
  personalDetails: "Personal details",
  profileSetup: "Profile setup",
  bodyMeasurement: "Body measurements",
  progressPhotos180: "180° progress photos",
  medicalConditions: "Medical conditions",
  internalParameter: "Internal parameters",
  launch: "LAUNCH",
};

function normalizeOnboardingStepStatus(raw) {
  const out = {};
  for (const key of PAID_ONBOARDING_STATUS_KEYS) {
    const value = String(raw?.[key] || "pending").toLowerCase().trim();
    out[key] = value === "done" || value === "skipped" ? value : "pending";
  }
  return out;
}

function countOnboardingDone(stepStatus) {
  return PAID_ONBOARDING_STATUS_KEYS.filter(
    (key) => stepStatus[key] === "done" || stepStatus[key] === "skipped",
  ).length;
}

/** Next incomplete paid-onboarding step label, or empty when complete/unknown. */
export function getNextOnboardingStepLabel(stepStatus) {
  if (!stepStatus || typeof stepStatus !== "object") return "";
  for (const key of PAID_ONBOARDING_STATUS_KEYS) {
    const value = stepStatus[key];
    if (value !== "done" && value !== "skipped") {
      return PAID_ONBOARDING_STEP_LABELS[key] || key;
    }
  }
  return "";
}

function hasOnboardingValue(value) {
  if (value == null) return false;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
}

/** Fields users submit during register + paid onboarding (User table). */
export function buildOnboardingAvailability(userRow) {
  const fields = [
    { key: "name", label: "Full name", value: userRow?.name },
    { key: "email", label: "Email", value: userRow?.email },
    { key: "phone", label: "Phone", value: userRow?.phone },
    { key: "whatsapp", label: "WhatsApp", value: userRow?.whatsapp },
    { key: "dob", label: "Date of birth", value: userRow?.dob },
    { key: "gender", label: "Gender", value: userRow?.gender },
    { key: "country", label: "Country", value: userRow?.country },
    { key: "state", label: "State", value: userRow?.stateRaw || userRow?.state },
    { key: "city", label: "City", value: userRow?.city },
    { key: "addressLine1", label: "Address line 1", value: userRow?.addressLine1 },
    { key: "addressLine2", label: "Address line 2", value: userRow?.addressLine2 },
    { key: "pincode", label: "Pincode", value: userRow?.pincode },
    { key: "goal", label: "Primary health concern", value: userRow?.goal },
    { key: "dietaryPreference", label: "Dietary preference", value: userRow?.dietaryPreference },
    { key: "wellnessJourneyFor", label: "Wellness journey for", value: userRow?.wellnessJourneyFor },
    { key: "profileImage", label: "Profile photo", value: userRow?.profileImage },
    { key: "presentablePic", label: "Presentable pic", value: userRow?.presentablePic },
    { key: "termsAccepted", label: "Terms accepted", value: userRow?.termsAcceptedBool ? (userRow?.termsAccepted || "Yes") : "" },
    { key: "referralCode", label: "Referral code", value: userRow?.referralCode },
  ];

  const items = fields.map((field) => {
    const available = hasOnboardingValue(field.value);
    return {
      ...field,
      available,
      display: available
        ? typeof field.value === "boolean"
          ? field.value
            ? "Yes"
            : "No"
          : String(field.value)
        : "",
    };
  });

  const availableCount = items.filter((item) => item.available).length;
  return {
    items,
    availableCount,
    totalCount: items.length,
  };
}

/** Map GET /account/users item → list + profile UI shape. Missing unique fields stay empty. */
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
  // Prefer a purpose-built review timestamp when the API provides one. Existing
  // users still get a meaningful value from their latest persisted update.
  const lastReviewedAt = user?.lastReviewedAt || updatedAt;
  const tier = mapApiTierToUi(user?.userTier);
  const address = formatAddress(user);
  const stateRaw = String(user?.state || "").trim();
  const country = String(user?.country || "").trim();
  const city = String(user?.city || "").trim();
  const state = [stateRaw, country].filter(Boolean).join(" · ") || stateRaw;
  const paidOnboardingStepStatus = normalizeOnboardingStepStatus(user?.paidOnboardingStepStatus);
  const onboardingDone = countOnboardingDone(paidOnboardingStepStatus);
  const onboardingTotal = PAID_ONBOARDING_STATUS_KEYS.length;
  const dietaryPreference = formatDietaryPreference(user?.dietaryPreference);
  const wellnessJourneyFor = formatWellnessJourney(user?.wellnessJourneyFor);
  const gender = formatGender(user?.gender);
  const addressLine1 = String(user?.addressLine1 || "").trim();
  const addressLine2 = String(user?.addressLine2 || "").trim();
  const pincode = String(user?.pincode || "").trim();
  const termsAcceptedLabel = formatTermsAccepted(user);
  const assignedProgram = user?.assignedProgram && typeof user.assignedProgram === "object"
    ? user.assignedProgram
    : null;
  const assignedProgramTitle = String(assignedProgram?.title || "").trim();
  const assignedProgramStatus = String(assignedProgram?.status || "").trim().toLowerCase();

  return {
    id,
    n: index + 1,
    name,
    email: String(user?.email || "").trim(),
    phone,
    whatsapp: whatsapp || "",
    dob: formatDob(user?.dob),
    gender,
    country,
    city,
    addressLine1,
    addressLine2,
    pincode,
    address,
    state,
    stateRaw,
    tier,
    goal,
    healthConcernId: resolveHealthConcernId(user),
    dietaryPreference,
    wellnessJourneyFor,
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
    lastReviewed: formatRelativeDate(lastReviewedAt),
    termsIp: "",
    termsAccepted: termsAcceptedLabel,
    termsAcceptedBool: Boolean(user?.termsAccepted),
    programs: assignedProgram ? 1 : 0,
    programLabel: assignedProgramTitle || tierLabel(tier) || "",
    assignedProgram,
    assignedProgramId: String(user?.assignedProgramId || assignedProgram?.id || "").trim(),
    assignedProgramTitle,
    assignedProgramStatus,
    assignedCatalogProgramId: String(assignedProgram?.catalogProgramId || "").trim(),
    subscriptionDays: 0,
    tags: buildTags(user, goal),
    goals: goal ? [goal] : [],
    profileImage: user?.profileImage || "",
    presentablePic: user?.presentablePic || "",
    referralCode: String(user?.referralCode || "").trim(),
    parentCoachId: user?.parentCoachId || user?.parentCoach?.id || "",
    assignedCoachId: user?.assignedCoachId || user?.assignedCoach?.id || "",
    assignedCoachType: user?.assignedCoachType || "",
    assignmentStatus: String(user?.assignmentStatus || "").toLowerCase(),
    rawStatus: String(user?.status || "").toLowerCase(),
    createdAt,
    updatedAt,
    lastActiveAt,
    lastReviewedAt,
    paidOnboardingCompleted: Boolean(user?.paidOnboardingCompleted),
    paidOnboardingStep: String(user?.paidOnboardingStep || "").trim(),
    paidOnboardingStepStatus,
    onboardingDone,
    onboardingTotal,
    onboardingPct: Math.round((onboardingDone / onboardingTotal) * 100),
    energyExchangeEnabled: Boolean(user?.energyExchangeEnabled),
    healPaidAt: user?.healPaidAt || "",
    whatsappSameAsMobile: Boolean(user?.whatsappSameAsMobile),
  };
}

export async function fetchUsers({
  page = 1,
  limit = 20,
  status,
  search,
  userTier,
  assignmentStatus,
  parentCoachId,
} = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (userTier) q.set("userTier", userTier);
  if (assignmentStatus) q.set("assignmentStatus", assignmentStatus);
  if (parentCoachId) q.set("parentCoachId", String(parentCoachId).trim());

  try {
    const { data } = await api.get(`/account/users?${q}`, { headers: authHeader() });
    const users = Array.isArray(data.users) ? data.users : [];
    return {
      users: users.map((u, i) => mapApiUserToRow(u, i)),
      pagination: data.pagination ?? { page, limit, total: users.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

/** Role-scoped clients for WC/AWC/trainee console sessions. */
export async function fetchScopedUsers({ page = 1, limit = 20, search, scope = "all" } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (scope) q.set("scope", String(scope));

  try {
    const { data } = await api.get(`/account/heal-users?${q}`, {
      headers: authHeader(),
    });
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
    const { data } = await api.get(`/account/users/${encodeURIComponent(id)}`, {
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
      `/account/users/${encodeURIComponent(id)}`,
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
    await api.delete(`/account/users/${encodeURIComponent(id)}`, { headers: authHeader() });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function moveUserToMaintenance(id) {
  try {
    const { data } = await api.post(
      `/account/users/${encodeURIComponent(id)}/convert-to-maintenance`,
      {},
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function moveMaintenanceUserToHeal(id) {
  try {
    const { data } = await api.post(
      `/account/users/${encodeURIComponent(id)}/maintenance-to-heal`,
      {},
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

/** First-time coach assignment (pending_admin clients). */
export async function assignUserCoach(id, payload) {
  try {
    const { data } = await api.post(
      `/account/users/${encodeURIComponent(id)}/assign-coach`,
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
      `/account/users/${encodeURIComponent(id)}/reassign-coach`,
      payload,
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export { resolveUserId };
