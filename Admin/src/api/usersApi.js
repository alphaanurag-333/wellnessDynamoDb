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
  const normalized = String(status || "").toLowerCase();
  if (normalized === "deleted") return "Archived";
  if (normalized === "active") return "Active";
  return "Disabled";
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

function mapUtype(user) {
  if (String(user?.clientCategory || "").toLowerCase().trim() === "eagle") {
    return "team";
  }
  const t = String(user?.userTier || "").toLowerCase().trim();
  if (t === "maintenance") return "app";
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
  const raw = String(phone || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : raw;
  const cc = String(countryCode || "").trim();
  return cc ? `${cc} ${local}` : local;
}

function parseIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar YYYY-MM-DD in admin timezone (India). */
function calendarDayKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Whole calendar days since join (IST), not rolling 24h windows. */
function ageDaysFrom(iso) {
  const d = parseIso(iso);
  if (!d) return 0;
  const joined = new Date(`${calendarDayKey(d)}T00:00:00Z`);
  const today = new Date(`${calendarDayKey(new Date())}T00:00:00Z`);
  return Math.max(0, Math.round((today.getTime() - joined.getTime()) / 86400000));
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
  if (!iso) return "";
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${Number(match[3])} ${MONTHS_SHORT[Number(match[2]) - 1]} ${match[1]}`;
  }
  const d = parseIso(iso);
  if (!d) return "";
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatAddress(user) {
  const state = String(user?.state || "").trim();
  const pincode = String(user?.pincode || "").trim();
  const statePin = [state, pincode].filter(Boolean).join(" ");
  return [user?.addressLine1, user?.addressLine2, user?.city, statePin]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(", ");
}

function formatStateDisplay(stateRaw, country) {
  if (stateRaw && country) return `${stateRaw} (${country})`;
  return stateRaw || country || "";
}

function istParts(iso) {
  const d = parseIso(iso);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function formatIstDateTime(iso) {
  const parts = istParts(iso);
  if (!parts) return "";
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} IST`;
}

function formatTermsAccepted(user) {
  const at = formatIstDateTime(user?.termsAcceptedAt);
  if (!at) return user?.termsAccepted ? "Accepted" : "";
  return at;
}

function resolveTermsIp(user) {
  return String(user?.termsAcceptedIp || user?.termsIp || "").trim();
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
  const raw = String(value || "").toLowerCase().trim();
  const map = {
    male: "Boy",
    female: "Girl",
    other: "Guess",
    boy: "Boy",
    girl: "Girl",
    guess: "Guess",
    m: "Boy",
    f: "Girl",
  };
  return map[raw] || titleCaseToken(raw);
}

/** Map UI label/value back to API gender (male | female | other). */
export function toApiGender(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "boy" || raw === "male" || raw === "m") return "male";
  if (raw === "girl" || raw === "female" || raw === "f") return "female";
  if (raw === "guess" || raw === "other") return "other";
  return "";
}

export const GENDER_UI_OPTIONS = [
  { value: "male", label: "Boy" },
  { value: "female", label: "Girl" },
  { value: "other", label: "Guess" },
];

function formatDietaryPreference(value) {
  return titleCaseToken(value);
}

function wellnessJourneyLabel(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    const candidate =
      value.title ??
      value.name ??
      value.label ??
      value.value ??
      value.id ??
      value._id;
    return titleCaseToken(candidate);
  }
  return titleCaseToken(value);
}

function formatWellnessJourney(value) {
  if (Array.isArray(value)) {
    return value.map(wellnessJourneyLabel).filter(Boolean).join(", ");
  }
  return wellnessJourneyLabel(value);
}

function formatOnboardingFieldDisplay(field) {
  if (!hasOnboardingValue(field.value)) return "";
  if (typeof field.value === "boolean") return field.value ? "Yes" : "No";
  if (field.key === "wellnessJourneyFor") return formatWellnessJourney(field.value);
  if (field.key === "dietaryPreference") return formatDietaryPreference(field.value);
  if (Array.isArray(field.value)) {
    return field.value.map((entry) => String(entry ?? "").trim()).filter(Boolean).join(", ");
  }
  return String(field.value);
}

/** Paid-onboarding step keys stored on User.paidOnboardingStepStatus */
export const PAID_ONBOARDING_STATUS_KEYS = [
  "personalDetails",
  "bodyAnalytics",
  "internalParameter",
  "launch",
  "rca",
  "reportsBriefing",
  "hap",
  "protocolSettings",
  "commitmentLetter",
  "programInitiation",
];

export const PAID_ONBOARDING_STEP_LABELS = {
  personalDetails: "Personal details",
  bodyAnalytics: "Body analytics",
  internalParameter: "Internal parameters",
  launch: "LAUNCH",
  rca: "RCA",
  reportsBriefing: "Reports briefing",
  hap: "HAP",
  protocolSettings: "Protocol settings",
  commitmentLetter: "Commitment letter",
  programInitiation: "Program initiation",
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
      display: formatOnboardingFieldDisplay(field),
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
  const state = formatStateDisplay(stateRaw, country);
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
    email: String(user?.email || user?.deletedEmail || "").trim(),
    phone,
    whatsapp: whatsapp || "",
    dob: formatDob(user?.dob),
    dobIso: String(user?.dob || "").trim(),
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
    utype: mapUtype(user),
    clientCategory: String(user?.clientCategory || "individual").toLowerCase(),
    team: "",
    ageDays: ageDaysFrom(createdAt),
    joined: formatLongDate(createdAt),
    joinedAgo: formatJoinedAgo(createdAt),
    lastUpdated: formatShortDate(updatedAt),
    lastReviewed: formatRelativeDate(lastReviewedAt),
    termsIp: resolveTermsIp(user),
    termsAccepted: termsAcceptedLabel,
    termsAcceptedBool: Boolean(user?.termsAccepted),
    programs: assignedProgram ? 1 : 0,
    programLabel: assignedProgramTitle || tierLabel(tier) || "",
    assignedProgram,
    assignedProgramId: String(user?.assignedProgramId || assignedProgram?.id || "").trim(),
    assignedProgramTitle,
    assignedProgramStatus,
    assignedCatalogProgramId: String(assignedProgram?.catalogProgramId || "").trim(),
    subscriptionDays: Number(user?.subscriptionDaysLeft) || 0,
    tags: buildTags(user, goal),
    goals: goal ? [goal] : [],
    profileImage: user?.profileImage || "",
    presentablePic: user?.presentablePic || "",
    presentablePicStatus: String(user?.presentablePicStatus || "").toLowerCase(),
    presentablePicUploadedAt: user?.presentablePicUploadedAt || "",
    presentablePicHistory: Array.isArray(user?.presentablePicHistory) ? user.presentablePicHistory : [],
    presentablePicsEnabled: user?.presentablePicsEnabled !== false,
    dietPlanEnabled: user?.dietPlanEnabled !== false,
    heartRateEnabled: user?.heartRateEnabled !== false,
    sleepTrackingEnabled: user?.sleepTrackingEnabled !== false,
    referralCode: String(user?.referralCode || "").trim(),
    referredByCode: String(user?.referredByCode || "").trim(),
    userTier: String(user?.userTier || "").toLowerCase(),
    parentCoachId: user?.parentCoachId || user?.parentCoach?.id || "",
    assignedCoachId: user?.assignedCoachId || user?.assignedCoach?.id || "",
    assignedCoachType: user?.assignedCoachType || "",
    assignmentStatus: String(user?.assignmentStatus || "").toLowerCase(),
    rawStatus: String(user?.status || "").toLowerCase(),
    createdAt,
    updatedAt,
    lastActiveAt,
    lastReviewedAt,
    deletedAt: user?.deletedAt || "",
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

export function mapApiArchivedUserToRow(user, index = 0) {
  const id = resolveUserId(user);
  const tier = mapApiTierToUi(user?.userTier);
  const deletedAt = user?.deletedAt || "";
  const lastActiveAt = user?.lastActiveAt || "";
  return {
    id,
    n: index + 1,
    name: String(user?.name || "").trim() || "Unnamed",
    email: String(user?.email || user?.deletedEmail || "").trim(),
    phone: formatPhoneParts(user?.phoneCountryCode, user?.phone),
    tier,
    lastActive: formatLastActive(lastActiveAt),
    lastActiveAt,
    deletedAt,
    deletedLabel: formatLongDate(deletedAt),
    deletedAgo: formatRelativeDate(deletedAt),
    joined: formatLongDate(user?.createdAt),
    rawStatus: "deleted",
    status: "Archived",
  };
}

export async function createUser(fields = {}, profileFile) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "boolean") form.append(key, value ? "true" : "false");
    else form.append(key, String(value));
  });
  if (profileFile instanceof File) form.append("file", profileFile);

  try {
    const { data } = await api.post("/account/users", form, { headers: authHeader() });
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUsers({
  page = 1,
  limit = 20,
  status,
  search,
  userTier,
  assignmentStatus,
  parentCoachId,
  clientCategory,
  excludeUserTier,
  excludeClientCategory,
  subscriptionExpiryDays,
} = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (userTier) q.set("userTier", userTier);
  if (assignmentStatus) q.set("assignmentStatus", assignmentStatus);
  if (parentCoachId) q.set("parentCoachId", String(parentCoachId).trim());
  if (clientCategory) q.set("clientCategory", String(clientCategory).trim());
  if (excludeUserTier) q.set("excludeUserTier", String(excludeUserTier).trim());
  if (excludeClientCategory) q.set("excludeClientCategory", String(excludeClientCategory).trim());
  if (subscriptionExpiryDays) q.set("subscriptionExpiryDays", String(subscriptionExpiryDays));

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

/** Admin-only: soft-deleted clients with archive timestamps. */
export async function fetchArchivedUsers({ page = 1, limit = 20, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search && String(search).trim()) q.set("search", String(search).trim());

  try {
    const { data } = await api.get(`/account/users/archived?${q}`, { headers: authHeader() });
    if (!Array.isArray(data.users)) {
      if (data.user) {
        throw new Error("Archived users API is unavailable. Restart or deploy the latest backend.");
      }
      throw new Error("Unexpected archived users response");
    }
    const users = data.users;
    return {
      users: users.map((u, i) => mapApiArchivedUserToRow(u, i)),
      pagination: data.pagination ?? { page, limit, total: users.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

/** Role-scoped clients for WC/AWC/trainee console sessions. */
export async function fetchScopedUsers({
  page = 1,
  limit = 20,
  search,
  scope = "all",
  userTier,
  subscriptionExpiryDays,
} = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (scope) q.set("scope", String(scope));
  if (userTier) q.set("userTier", userTier);
  if (subscriptionExpiryDays) q.set("subscriptionExpiryDays", String(subscriptionExpiryDays));

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
    if (error?.response?.status === 403) {
      try {
        const { data } = await api.get(`/account/heal-users/${encodeURIComponent(id)}`, {
          headers: authHeader(),
        });
        return mapApiUserToRow(data.user);
      } catch (scopedError) {
        normalizeApiError(scopedError);
      }
    }
    normalizeApiError(error);
  }
}

export async function fetchUserAtAGlance(id) {
  try {
    const { data } = await api.get(
      `/account/users/${encodeURIComponent(id)}/at-a-glance`,
      { headers: authHeader() },
    );
    return data.glance || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserMedicalConditions(id) {
  try {
    const { data } = await api.get(
      `/account/users/${encodeURIComponent(id)}/medical-conditions`,
      { headers: authHeader() },
    );
    return data.medicalCondition || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserBodyAnalytics(id) {
  try {
    const { data } = await api.get(
      `/account/users/${encodeURIComponent(id)}/body-analytics`,
      { headers: authHeader() },
    );
    return data.bodyAnalytics || {
      measurements: [],
      metabolicMetrics: [],
      photos: [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function downloadUserProgressPhoto(userId, photoId, angle, filename) {
  try {
    const q = new URLSearchParams();
    if (filename) q.set("filename", filename);
    const { data } = await api.get(
      `/account/users/${encodeURIComponent(userId)}/body-analytics/photos/${encodeURIComponent(photoId)}/${encodeURIComponent(angle)}/download${q.toString() ? `?${q}` : ""}`,
      {
        headers: authHeader(),
        responseType: "blob",
      },
    );
    if (!(data instanceof Blob) || data.size === 0) {
      throw new Error("Could not download photo");
    }
    if (data.type && data.type.includes("application/json")) {
      const text = await data.text();
      let message = "Could not download photo";
      try {
        message = JSON.parse(text)?.message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return data;
  } catch (error) {
    if (error?.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        if (parsed?.message) throw new Error(parsed.message);
      } catch (inner) {
        if (inner?.message && !(inner instanceof SyntaxError)) throw inner;
      }
    }
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

/** PATCH /account/users/:id — personal profile fields (name, dob, phone, address, goal, …). */
export async function updateUserPersonalDetails(id, payload) {
  try {
    const { data } = await api.patch(
      `/account/users/${encodeURIComponent(id)}`,
      payload,
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

/** PATCH /account/users/:id — upload or replace profile photo (multipart field: file). */
export async function updateUserProfileImage(id, profileFile) {
  if (!(profileFile instanceof File)) {
    throw new Error("Profile image file is required");
  }
  const form = new FormData();
  form.append("file", profileFile);
  try {
    const { data } = await api.patch(
      `/account/users/${encodeURIComponent(id)}`,
      form,
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

export async function moveUserToHeal(id) {
  try {
    const { data } = await api.post(
      `/account/users/${encodeURIComponent(id)}/convert-to-heal`,
      {},
      { headers: authHeader() },
    );
    return mapApiUserToRow(data.user);
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

export async function moveUserToSeek(id) {
  try {
    const { data } = await api.post(
      `/account/users/${encodeURIComponent(id)}/convert-to-seek`,
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

export async function fetchUserCoachInsight(id) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(id)}/coach-insight`,
      { headers: authHeader() },
    );
    return data.coachInsight || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserReminders(id) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(id)}/reminders`,
      { headers: authHeader() },
    );
    return Array.isArray(data.reminders) ? data.reminders : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createUserReminder(id, payload) {
  try {
    const { data } = await api.post(
      `/account/heal-users/${encodeURIComponent(id)}/reminders`,
      payload,
      { headers: authHeader() },
    );
    return data.reminder || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteUserReminder(id, reminderId) {
  try {
    await api.delete(
      `/account/heal-users/${encodeURIComponent(id)}/reminders/${encodeURIComponent(reminderId)}`,
      { headers: authHeader() },
    );
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveUserCoachInsight(id, message) {
  try {
    const { data } = await api.put(
      `/account/heal-users/${encodeURIComponent(id)}/coach-insight`,
      { message: String(message ?? "") },
      { headers: authHeader() },
    );
    return data.coachInsight || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchConsultancyClient(id) {
  try {
    const { data } = await api.get(
      `/account/consultancy/clients/${encodeURIComponent(id)}`,
      { headers: authHeader() },
    );
    return data?.client || null;
  } catch (error) {
    const status = error?.response?.status;
    if (status === 403 || status === 404) return null;
    normalizeApiError(error);
  }
}

export { resolveUserId };
