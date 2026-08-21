const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { toPublicProfile } = require("../utils/toPublicProfile");
const {
  normalizeStoredMedia,
  resolvePublicUrl,
} = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  paginateItems,
} = require("../utils/dynamoList");
const { matchesAssignedClientTier, normalizeClientCategory } = require("./userAssignmentLogic");
const {
  registerReferralCode,
  generateUniqueReferralCode,
} = require("./referralCodeModel");
const { computeDobMonthDay, birthdayQueryMonthDays, userBirthdayMatchesDate } = require("../utils/dobMonthDay");

const TABLE = "User";

/** GSI partition keys must be omitted when unset — DynamoDB rejects NULL index keys. */
const SPARSE_GSI_ATTRIBUTES = new Set([
  "parentCoachId",
  "dobMonthDay",
  "referredByUserId",
  "referredByEntityId",
]);

const USER_ALLOWED_STATUS = ["active", "inactive", "blocked"];
const USER_ALLOWED_GENDERS = ["male", "female", "other"];
/** Legacy UI aliases accepted on write, stored as canonical values above. */
const USER_GENDER_ALIASES = {
  boy: "male",
  girl: "female",
  guess: "other",
  m: "male",
  f: "female",
  man: "male",
  woman: "female",
};
const USER_ALLOWED_TIERS = ["seek", "consultancy_only", "heal", "maintenance"];
const USER_ALLOWED_CLIENT_CATEGORIES = ["individual", "eagle"];
const USER_ALLOWED_ASSIGNMENT_STATUSES = ["assigned", "pending_admin"];
const USER_ALLOWED_ASSIGNED_COACH_TYPES = ["wellness_coach", "assistant_wellness_coach"];
const USER_ALLOWED_ASSIGNMENT_SOURCES = ["referral", "admin_manual", "coach_reassign"];
const USER_ALLOWED_DIETARY_PREFERENCES = [
  "vegetarian",
  "eggetarian",
  "vegan",
  "non_vegetarian",
  "jain",
];
const USER_ALLOWED_MEAL_TRACKING_MODES = ["macro", "detailed_macro"];
const {
  USER_ALLOWED_PAID_ONBOARDING_STEPS,
  normalizePaidOnboardingStep,
  defaultPaidOnboardingStepStatus,
  normalizePaidOnboardingStepStatus,
  computePaidOnboardingCompleted,
} = require("../utils/paidOnboardingHelpers");
const {
  defaultHealthProgressFeatures,
  normalizeHealthProgressFeatures,
} = require("../utils/healthProgressHelpers");

const STATUS = new Set(USER_ALLOWED_STATUS);
const GENDERS = new Set(USER_ALLOWED_GENDERS);
const TIERS = new Set(USER_ALLOWED_TIERS);
const ASSIGNMENT_STATUSES = new Set(USER_ALLOWED_ASSIGNMENT_STATUSES);
const ASSIGNED_COACH_TYPES = new Set(USER_ALLOWED_ASSIGNED_COACH_TYPES);
const ASSIGNMENT_SOURCES = new Set(USER_ALLOWED_ASSIGNMENT_SOURCES);
const DIETARY_PREFERENCES = new Set(USER_ALLOWED_DIETARY_PREFERENCES);
const MEAL_TRACKING_MODES = new Set(USER_ALLOWED_MEAL_TRACKING_MODES);
const PRESENTABLE_PIC_STATUSES = new Set(["pending", "approved", "rejected"]);

function normalizePresentablePicStatus(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return PRESENTABLE_PIC_STATUSES.has(next) ? next : null;
}

/** Missing field on existing users means enabled (legacy default). */
function isPresentablePicsEnabled(user) {
  return user?.presentablePicsEnabled !== false;
}

/** Missing field on existing users means the diet plan is visible in the app. */
function isDietPlanEnabled(user) {
  return user?.dietPlanEnabled !== false;
}

/** Missing field on existing users means heart rate is visible in the app. */
function isHeartRateEnabled(user) {
  return user?.heartRateEnabled !== false;
}

/** Missing field on existing users means sleep tracking is visible in the app. */
function isSleepTrackingEnabled(user) {
  return user?.sleepTrackingEnabled !== false;
}

function normalizeDietaryPreference(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return DIETARY_PREFERENCES.has(next) ? next : null;
}

function normalizeMealTrackingMode(value, fallback = "macro") {
  const next = String(value || fallback).toLowerCase().trim();
  return MEAL_TRACKING_MODES.has(next) ? next : fallback;
}

function normalizeWellnessJourneyFor(value) {
  if (value == null) return null;
  let raw = value;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      raw = parsed;
    } catch {
      raw = raw.split(",");
    }
  }
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((v) => String(v || "").trim())
    .filter((v) => v.length > 0);
  return out.length ? out : null;
}

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function normalizePhone(phone) {
  return String(phone || "").trim();
}

function normalizeCountryCode(code, fallback = "+91") {
  const raw = String(code ?? fallback).trim();
  if (!raw) return fallback;
  return raw.startsWith("+") ? raw : `+${raw}`;
}

/** Stable GSI key for unique phone lookups (country code + number). */
function buildPhoneKey(phoneCountryCode, phone) {
  const cc = normalizeCountryCode(phoneCountryCode);
  const num = normalizePhone(phone);
  if (!num) return "";
  return `${cc}#${num}`;
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeGender(value, fallback = "male") {
  const raw = String(value || fallback).toLowerCase().trim();
  const next = USER_GENDER_ALIASES[raw] || raw;
  return GENDERS.has(next) ? next : fallback;
}

function normalizeUserTier(value, fallback = "seek") {
  const next = String(value || fallback).toLowerCase().trim();
  return TIERS.has(next) ? next : fallback;
}

function normalizeAssignmentStatus(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNMENT_STATUSES.has(next) ? next : null;
}

function normalizeAssignedCoachType(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNED_COACH_TYPES.has(next) ? next : null;
}

function normalizeAssignmentSource(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNMENT_SOURCES.has(next) ? next : null;
}

function normalizeReferralCodeField(value) {
  if (value == null || value === "") return null;
  return String(value).trim().toUpperCase() || null;
}

function normalizeDob(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return null;
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. user/photo.jpg)");
  }
  return objectKey;
}

function toPublicUser(user) {
  const pub = toPublicProfile(user);
  if (!pub) return null;
  if (pub.profileImage) {
    pub.profileImage = resolvePublicUrl(pub.profileImage);
  }
  if (pub.presentablePic) {
    pub.presentablePic = resolvePublicUrl(pub.presentablePic);
  }
  if (Array.isArray(pub.presentablePicHistory)) {
    pub.presentablePicHistory = pub.presentablePicHistory.map((item) => {
      if (!item || typeof item !== "object") return item;
      if (item.url) return { ...item, url: resolvePublicUrl(item.url) };
      return item;
    });
  }
  return withLegacyId(pub);
}

function sanitizeUpdateField(key, value) {
  if (key === "email") return normalizeEmail(value);
  if (key === "phone") return normalizePhone(value);
  if (key === "phoneCountryCode" || key === "whatsappCountryCode") {
    return normalizeCountryCode(value);
  }
  if (key === "status") return normalizeStatus(value);
  if (key === "gender") return normalizeGender(value);
  if (key === "dob") return normalizeDob(value);
  if (key === "termsAcceptedAt") return normalizeDob(value);
  if (key === "otpExpire" || key === "resetPasswordExpire") {
    return value ? normalizeDob(value) : null;
  }
  if (key === "whatsappSameAsMobile" || key === "termsAccepted") {
    return Boolean(value);
  }
  if (key === "termsAcceptedIp") {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  if (key === "profileImage" || key === "presentablePic") {
    return normalizeProfileImageField(value);
  }
  if (key === "presentablePicStatus") return normalizePresentablePicStatus(value);
  if (key === "presentablePicReviewedAt") return normalizeDob(value);
  if (key === "presentablePicUploadedAt") return normalizeDob(value);
  if (key === "presentablePicReviewedById") {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  if (key === "userTier") return normalizeUserTier(value);
  if (key === "clientCategory") return normalizeClientCategory(value);
  if (key === "assignmentStatus") return normalizeAssignmentStatus(value);
  if (key === "assignedCoachType") return normalizeAssignedCoachType(value);
  if (key === "assignmentSource") return normalizeAssignmentSource(value);
  if (key === "referralCode" || key === "referredByCode") return normalizeReferralCodeField(value);
  if (key === "convertedAt" || key === "assignedAt" || key === "consultancyPaidAt") return normalizeDob(value);
  if (key === "healPaidAt" || key === "lastActiveAt") return normalizeDob(value);
  if (
    key === "paidOnboardingCompleted" ||
    key === "energyExchangeEnabled" ||
    key === "programEnabled" ||
    key === "programPurchased" ||
    key === "presentablePicsEnabled" ||
    key === "dietPlanEnabled" ||
    key === "heartRateEnabled" ||
    key === "sleepTrackingEnabled"
  ) {
    return Boolean(value);
  }
  if (key === "programPurchasedAt") return normalizeDob(value);
  if (key === "paidOnboardingStep") return normalizePaidOnboardingStep(value);
  if (key === "paidOnboardingStepStatus") return normalizePaidOnboardingStepStatus(value);
  if (key === "dietaryPreference") return normalizeDietaryPreference(value);
  if (key === "mealTrackingMode") return normalizeMealTrackingMode(value);
  if (key === "healthProgressFeatures") return normalizeHealthProgressFeatures(value);
  if (key === "wellnessJourneyFor") return normalizeWellnessJourneyFor(value);
  if (
    [
      "name",
      "passwordHash",
      "whatsappPhone",
      "country",
      "state",
      "city",
      "primaryHealthConcern",
      "primaryHealthConcernOther",
      "fcm_id",
      "otp",
      "resetPasswordToken",
      "assignedCoachId",
      "parentCoachId",
      "assignedProgramId",
      "referredByUserId",
      "referredByEntityType",
      "referredByEntityId",
      "addressLine1",
      "addressLine2",
      "pincode",
      "pendingPhone",
      "pendingPhoneCountryCode",
      "pendingWhatsappPhone",
      "pendingWhatsappCountryCode",
    ].includes(key)
  ) {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  return value;
}

function omitSparseGsiAttributes(item) {
  const next = { ...item };
  for (const key of SPARSE_GSI_ATTRIBUTES) {
    if (next[key] == null || next[key] === "") {
      delete next[key];
    }
  }
  return next;
}

function buildUserItem(input, { id, now } = {}) {
  const phoneCountryCode = normalizeCountryCode(input.phoneCountryCode);
  const phone = normalizePhone(input.phone);
  const whatsappSameAsMobile = Boolean(input.whatsappSameAsMobile);
  const whatsappCountryCode = whatsappSameAsMobile
    ? phoneCountryCode
    : normalizeCountryCode(input.whatsappCountryCode);
  const whatsappPhone = whatsappSameAsMobile
    ? phone
    : input.whatsappPhone != null
      ? normalizePhone(input.whatsappPhone) || null
      : null;

  const email = normalizeEmail(input.email);
  const phoneKey = buildPhoneKey(phoneCountryCode, phone);

  return {
    id: id || uuidv4(),
    name: String(input.name || "").trim(),
    email,
    passwordHash: input.passwordHash != null ? String(input.passwordHash) : null,
    phoneCountryCode,
    phone,
    phoneKey,
    whatsappSameAsMobile,
    whatsappCountryCode,
    whatsappPhone,
    dob: normalizeDob(input.dob),
    dobMonthDay: computeDobMonthDay(normalizeDob(input.dob)),
    gender: normalizeGender(input.gender),
    country: input.country != null ? String(input.country).trim() || null : null,
    state: input.state != null ? String(input.state).trim() || null : null,
    city: input.city != null ? String(input.city).trim() || null : null,
    primaryHealthConcern:
      input.primaryHealthConcern != null ? String(input.primaryHealthConcern).trim() || null : null,
    primaryHealthConcernOther:
      input.primaryHealthConcernOther != null
        ? String(input.primaryHealthConcernOther).trim() || null
        : null,
    termsAccepted: Boolean(input.termsAccepted),
    termsAcceptedAt: input.termsAcceptedAt ? normalizeDob(input.termsAcceptedAt) : null,
    termsAcceptedIp: input.termsAcceptedIp != null ? String(input.termsAcceptedIp).trim() || null : null,
    profileImage: input.profileImage != null ? normalizeProfileImageField(input.profileImage) : null,
    presentablePic: input.presentablePic != null ? normalizeProfileImageField(input.presentablePic) : null,
    presentablePicStatus: normalizePresentablePicStatus(input.presentablePicStatus),
    presentablePicUploadedAt: input.presentablePicUploadedAt
      ? normalizeDob(input.presentablePicUploadedAt)
      : null,
    presentablePicReviewedAt: input.presentablePicReviewedAt
      ? normalizeDob(input.presentablePicReviewedAt)
      : null,
    presentablePicReviewedById:
      input.presentablePicReviewedById != null
        ? String(input.presentablePicReviewedById).trim() || null
        : null,
    presentablePicsEnabled: input.presentablePicsEnabled !== false,
    dietPlanEnabled: input.dietPlanEnabled !== false,
    heartRateEnabled: input.heartRateEnabled !== false,
    sleepTrackingEnabled: input.sleepTrackingEnabled !== false,
    fcm_id: input.fcm_id != null ? String(input.fcm_id).trim() || null : null,
    status: normalizeStatus(input.status),
    otp: input.otp != null ? String(input.otp) : null,
    otpExpire: input.otpExpire ? normalizeDob(input.otpExpire) : null,
    resetPasswordToken: input.resetPasswordToken != null ? String(input.resetPasswordToken) : null,
    resetPasswordExpire: input.resetPasswordExpire ? normalizeDob(input.resetPasswordExpire) : null,
    userTier: normalizeUserTier(input.userTier),
    clientCategory: normalizeClientCategory(input.clientCategory),
    referralCode: normalizeReferralCodeField(input.referralCode),
    referredByUserId: input.referredByUserId != null ? String(input.referredByUserId).trim() || null : null,
    referredByCode: normalizeReferralCodeField(input.referredByCode),
    referredByEntityType:
      input.referredByEntityType != null ? String(input.referredByEntityType).trim() || null : null,
    referredByEntityId:
      input.referredByEntityId != null ? String(input.referredByEntityId).trim() || null : null,
    assignedCoachId: input.assignedCoachId != null ? String(input.assignedCoachId).trim() || null : null,
    assignedCoachType: normalizeAssignedCoachType(input.assignedCoachType),
    parentCoachId: input.parentCoachId != null ? String(input.parentCoachId).trim() || null : null,
    assignmentStatus: normalizeAssignmentStatus(input.assignmentStatus),
    assignmentSource: normalizeAssignmentSource(input.assignmentSource),
    assignedAt: input.assignedAt ? normalizeDob(input.assignedAt) : null,
    consultancyPaidAt: input.consultancyPaidAt ? normalizeDob(input.consultancyPaidAt) : null,
    convertedAt: input.convertedAt ? normalizeDob(input.convertedAt) : null,
    paidOnboardingCompleted: Boolean(input.paidOnboardingCompleted),
    paidOnboardingStep: normalizePaidOnboardingStep(input.paidOnboardingStep),
    paidOnboardingStepStatus: normalizePaidOnboardingStepStatus(
      input.paidOnboardingStepStatus
    ),
    energyExchangeEnabled: Boolean(input.energyExchangeEnabled),
    assignedProgramId: input.assignedProgramId != null ? String(input.assignedProgramId).trim() || null : null,
    programEnabled: Boolean(input.programEnabled),
    programPurchased: Boolean(input.programPurchased),
    programPurchasedAt: input.programPurchasedAt ? normalizeDob(input.programPurchasedAt) : null,
    addressLine1: input.addressLine1 != null ? String(input.addressLine1).trim() || null : null,
    addressLine2: input.addressLine2 != null ? String(input.addressLine2).trim() || null : null,
    pincode: input.pincode != null ? String(input.pincode).trim() || null : null,
    dietaryPreference: normalizeDietaryPreference(input.dietaryPreference),
    mealTrackingMode: normalizeMealTrackingMode(input.mealTrackingMode),
    healthProgressFeatures: normalizeHealthProgressFeatures(
      input.healthProgressFeatures,
      defaultHealthProgressFeatures()
    ),
    wellnessJourneyFor: normalizeWellnessJourneyFor(input.wellnessJourneyFor),
    healPaidAt: input.healPaidAt ? normalizeDob(input.healPaidAt) : null,
    lastActiveAt: input.lastActiveAt ? normalizeDob(input.lastActiveAt) : now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createUser(fields) {
  const now = new Date().toISOString();
  const referralCode = fields.referralCode || (await generateUniqueReferralCode());
  const item = omitSparseGsiAttributes(buildUserItem({ ...fields, referralCode }, { now }));

  if (!item.name) throw new Error("name is required");
  if (!item.email) throw new Error("email is required");
  if (!item.phone) throw new Error("phone is required");
  if (!item.phoneKey) throw new Error("phoneKey is required");
  if (!item.referralCode) throw new Error("referralCode is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  await registerReferralCode({
    referralCode: item.referralCode,
    entityType: "user",
    entityId: item.id,
    ownerCoachId: String(item.parentCoachId || "").trim() || "pending",
  });

  return withLegacyId(item);
}

async function getUserById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function getUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalized },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function getUserByPhone(phoneCountryCode, phone) {
  const phoneKey = buildPhoneKey(phoneCountryCode, phone);
  if (!phoneKey) return null;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "PhoneKeyIndex",
      KeyConditionExpression: "phoneKey = :phoneKey",
      ExpressionAttributeValues: { ":phoneKey": phoneKey },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function updateUser(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "phoneKey"]);
  const immutableOnceFields = new Set([
    "referredByUserId",
    "referredByCode",
    "referredByEntityType",
    "referredByEntityId",
    "convertedAt",
  ]);

  const current = await getUserById(id);
  if (!current) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  for (const key of immutableOnceFields) {
    if (updates?.[key] !== undefined && current[key] != null && String(current[key]).trim() !== "") {
      const err = new Error(`${key} is immutable referral history`);
      err.name = "ImmutableFieldError";
      throw err;
    }
  }

  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  const merged = { ...current };
  for (const [k, v] of entries) {
    merged[k] = v;
  }

  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    merged.phoneKey = buildPhoneKey(merged.phoneCountryCode, merged.phone);
  }

  if (updates.whatsappSameAsMobile === true || updates.whatsappSameAsMobile === false) {
    if (merged.whatsappSameAsMobile) {
      merged.whatsappCountryCode = merged.phoneCountryCode;
      merged.whatsappPhone = merged.phone;
    }
  }

  if (updates.dob !== undefined) {
    merged.dobMonthDay = computeDobMonthDay(merged.dob);
  }

  const patchKeys = entries.map(([k]) => k);
  if (patchKeys.includes("phone") || patchKeys.includes("phoneCountryCode")) {
    patchKeys.push("phoneKey");
  }
  if (patchKeys.includes("whatsappSameAsMobile")) {
    patchKeys.push("whatsappCountryCode", "whatsappPhone");
  }
  if (patchKeys.includes("dob")) {
    patchKeys.push("dobMonthDay");
  }

  const uniquePatch = [...new Set(patchKeys)];
  const removeKeys = uniquePatch.filter(
    (key) => SPARSE_GSI_ATTRIBUTES.has(key) && (merged[key] == null || merged[key] === "")
  );
  const setKeys = uniquePatch.filter((key) => !removeKeys.includes(key));

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let updateExpr = "SET updatedAt = :updatedAt";

  for (const key of setKeys) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    updateExpr += `, #${key} = :${key}`;
  }

  if (removeKeys.length) {
    for (const key of removeKeys) {
      exprNames[`#${key}`] = key;
    }
    updateExpr += ` REMOVE ${removeKeys.map((key) => `#${key}`).join(", ")}`;
  }

  if (setKeys.length === 0 && removeKeys.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return withLegacyId(Attributes || null);
}

async function deleteUser(id) {
  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        "SET #status = :deleted, deletedAt = :deletedAt, updatedAt = :updatedAt, " +
        "deletedEmail = if_not_exists(email, :empty), " +
        "deletedPhoneKey = if_not_exists(phoneKey, :empty) " +
        "REMOVE email, phoneKey, passwordHash, otp, otpExpire, resetPasswordToken, " +
        "resetPasswordExpire, fcm_id, profileImage, presentablePic",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":deleted": "deleted",
        ":deletedAt": now,
        ":updatedAt": now,
        ":empty": "",
      },
      ConditionExpression:
        "attribute_exists(id) AND (attribute_not_exists(#status) OR #status <> :deleted)",
      ReturnValues: "ALL_NEW",
    })
  );
  return withLegacyId(Attributes || null);
}

async function listUsersByParentCoachId(
  parentCoachId,
  {
    page = 1,
    limit = 20,
    search,
    userTier = "client",
    scope = "all",
    unpaginated = false,
    clientCategory,
    subscriptionExpiryUserIds,
  } = {}
) {
  const coachId = String(parentCoachId || "").trim();
  if (!coachId) {
    return { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedTier = String(userTier || "client").toLowerCase().trim();
  const normalizedScope = String(scope || "all").toLowerCase().trim();
  const normalizedCategory = clientCategory ? normalizeClientCategory(clientCategory, "") : "";
  const expiryIdSet = Array.isArray(subscriptionExpiryUserIds)
    ? new Set(
        subscriptionExpiryUserIds
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      )
    : null;

  if (expiryIdSet && !expiryIdSet.size) {
    return {
      users: [],
      pagination: { page: safePage, limit: safeLimit, total: 0, pages: 1 },
    };
  }

  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "ParentCoachIndex",
      KeyConditionExpression: "parentCoachId = :parentCoachId",
      ExpressionAttributeValues: { ":parentCoachId": coachId },
      ScanIndexForward: false,
    })
  );

  let rows = Items.map(withLegacyId).filter(
    (row) =>
      row.status !== "deleted" &&
      matchesAssignedClientTier(row.userTier, normalizedTier)
  );

  if (expiryIdSet) {
    rows = rows.filter((row) => expiryIdSet.has(String(row.id || "").trim()));
  }

  if (normalizedScope === "direct") {
    rows = rows.filter(
      (row) =>
        normalizeAssignedCoachType(row.assignedCoachType) === "wellness_coach" &&
        String(row.assignedCoachId || "") === coachId
    );
  } else if (normalizedScope === "assistant") {
    rows = rows.filter(
      (row) => normalizeAssignedCoachType(row.assignedCoachType) === "assistant_wellness_coach"
    );
  }

  if (normalizedSearch) {
    rows = rows.filter(
      (r) =>
        String(r.name || "").toLowerCase().includes(normalizedSearch) ||
        String(r.email || "").toLowerCase().includes(normalizedSearch) ||
        String(r.phone || "").includes(normalizedSearch)
    );
  }

  if (normalizedCategory) {
    rows = rows.filter((row) => normalizeClientCategory(row.clientCategory) === normalizedCategory);
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;

  return {
    users: unpaginated ? rows : rows.slice(start, start + safeLimit),
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

function toReferralTreeNode(user, depth = 0, extras = {}) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name || null,
    email: user.email || null,
    referralCode: user.referralCode || null,
    userTier: user.userTier || null,
    status: user.status || null,
    referredByUserId: user.referredByUserId || null,
    referredByCode: user.referredByCode || null,
    referredByEntityType: user.referredByEntityType || null,
    referredByEntityId: user.referredByEntityId || null,
    createdAt: user.createdAt || null,
    nodeKind: extras.nodeKind || "user",
    depth,
    children: [],
    ...extras,
  };
}

async function queryReferralIndex(indexName, keyName, keyValue, { limit = 500 } = {}) {
  const parentId = String(keyValue || "").trim();
  if (!parentId) return [];

  const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 500));
  const rows = [];
  let lastKey;

  do {
    const { Items = [], LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: indexName,
        KeyConditionExpression: `${keyName} = :key`,
        ExpressionAttributeValues: { ":key": parentId },
        ScanIndexForward: true,
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items) {
      const row = withLegacyId(item);
      if (row?.status === "deleted") continue;
      rows.push(row);
      if (rows.length >= safeLimit) break;
    }

    lastKey = rows.length >= safeLimit ? undefined : LastEvaluatedKey;
  } while (lastKey);

  return rows;
}

async function listUsersByReferredByUserId(referredByUserId, { limit = 500 } = {}) {
  return queryReferralIndex("ReferredByUserIndex", "referredByUserId", referredByUserId, { limit });
}

async function listUsersByReferredByEntityIdFallback(entityId, { limit = 500 } = {}) {
  const parentId = String(entityId || "").trim();
  if (!parentId) return [];
  const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 500));

  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    statusPartitions: ["active", "inactive", "blocked"],
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
  });

  const rows = [];
  for (const item of items) {
    const row = withLegacyId(item);
    if (!row || row.status === "deleted") continue;
    if (String(row.referredByEntityId || "").trim() !== parentId) continue;
    rows.push(row);
    if (rows.length >= safeLimit) break;
  }
  return rows;
}

async function listUsersByReferredByEntityId(entityId, { limit = 500 } = {}) {
  try {
    return await queryReferralIndex("ReferredByEntityIndex", "referredByEntityId", entityId, { limit });
  } catch (err) {
    const msg = String(err?.message || err?.name || "");
    if (/cannot be found|ResourceNotFound|ValidationException|Specified index/i.test(msg)) {
      return listUsersByReferredByEntityIdFallback(entityId, { limit });
    }
    throw err;
  }
}

async function attachPeerDownlines(seedNodes, { maxDepth, maxNodes, nodeCountRef, seen }) {
  let truncated = false;
  const queue = seedNodes
    .filter((node) => node.depth < maxDepth)
    .map((node) => ({ node, userId: node.id }));

  while (queue.length > 0) {
    const { node, userId } = queue.shift();
    if (node.depth >= maxDepth) continue;
    if (nodeCountRef.count >= maxNodes) {
      truncated = true;
      break;
    }

    const remaining = maxNodes - nodeCountRef.count;
    const children = await listUsersByReferredByUserId(userId, { limit: remaining + 1 });
    if (children.length > remaining) truncated = true;

    for (const child of children.slice(0, remaining)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      const childNode = toReferralTreeNode(child, node.depth + 1);
      node.children.push(childNode);
      nodeCountRef.count += 1;
      if (nodeCountRef.count >= maxNodes) {
        truncated = true;
        break;
      }
      if (childNode.depth < maxDepth) {
        queue.push({ node: childNode, userId: child.id });
      }
    }

    if (truncated && nodeCountRef.count >= maxNodes) break;
  }

  return truncated;
}

async function buildReferralTree(rootUserId, { maxDepth = 5, maxNodes = 500 } = {}) {
  const rootId = String(rootUserId || "").trim();
  if (!rootId) {
    return { root: null, meta: { maxDepth: 0, nodeCount: 0, truncated: false, mode: "user" } };
  }

  const safeMaxDepth = Math.min(20, Math.max(0, Number(maxDepth) || 5));
  const safeMaxNodes = Math.min(2000, Math.max(1, Number(maxNodes) || 500));

  const rootUser = await getUserById(rootId);
  if (!rootUser || rootUser.status === "deleted") {
    return { root: null, meta: { maxDepth: safeMaxDepth, nodeCount: 0, truncated: false, mode: "user" } };
  }

  const root = toReferralTreeNode(rootUser, 0);
  const seen = new Set([root.id]);
  const nodeCountRef = { count: 1 };
  const truncated = await attachPeerDownlines([root], {
    maxDepth: safeMaxDepth,
    maxNodes: safeMaxNodes,
    nodeCountRef,
    seen,
  });

  return {
    root,
    meta: {
      maxDepth: safeMaxDepth,
      nodeCount: nodeCountRef.count,
      truncated,
      mode: "user",
    },
  };
}

async function buildCoachReferralTree(entityId, entityMeta = {}, { maxDepth = 5, maxNodes = 500 } = {}) {
  const rootId = String(entityId || "").trim();
  if (!rootId) {
    return { root: null, meta: { maxDepth: 0, nodeCount: 0, truncated: false, mode: "coach" } };
  }

  const safeMaxDepth = Math.min(20, Math.max(0, Number(maxDepth) || 5));
  const safeMaxNodes = Math.min(2000, Math.max(1, Number(maxNodes) || 500));

  const entityType = String(entityMeta.entityType || "wellness_coach").toLowerCase();
  const nodeKind = entityType === "assistant_wellness_coach" ? "awc" : "coach";

  const root = {
    id: rootId,
    name: entityMeta.name || null,
    email: entityMeta.email || null,
    referralCode: entityMeta.referralCode || null,
    userTier: null,
    status: entityMeta.status || null,
    referredByUserId: null,
    referredByCode: null,
    referredByEntityType: null,
    referredByEntityId: null,
    createdAt: entityMeta.createdAt || null,
    nodeKind,
    entityType,
    depth: 0,
    children: [],
  };

  const seen = new Set([root.id]);
  const nodeCountRef = { count: 1 };
  let truncated = false;

  if (safeMaxDepth >= 1 && nodeCountRef.count < safeMaxNodes) {
    const remaining = safeMaxNodes - nodeCountRef.count;
    const direct = await listUsersByReferredByEntityId(rootId, { limit: remaining + 1 });
    if (direct.length > remaining) truncated = true;

    const seedNodes = [];
    for (const child of direct.slice(0, remaining)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      const childNode = toReferralTreeNode(child, 1, {
        joinedViaCode: child.referredByCode || entityMeta.referralCode || null,
      });
      root.children.push(childNode);
      nodeCountRef.count += 1;
      seedNodes.push(childNode);
      if (nodeCountRef.count >= safeMaxNodes) {
        truncated = true;
        break;
      }
    }

    if (nodeCountRef.count < safeMaxNodes) {
      const peerTruncated = await attachPeerDownlines(seedNodes, {
        maxDepth: safeMaxDepth,
        maxNodes: safeMaxNodes,
        nodeCountRef,
        seen,
      });
      truncated = truncated || peerTruncated;
    }
  }

  return {
    root,
    meta: {
      maxDepth: safeMaxDepth,
      nodeCount: nodeCountRef.count,
      truncated,
      mode: "coach",
      directCount: root.children.length,
    },
  };
}

function entityTypeBucket(entityType) {
  const key = String(entityType || "").toLowerCase().trim();
  if (key === "user") return "peer";
  if (key === "wellness_coach") return "coach";
  if (key === "assistant_wellness_coach") return "awc";
  return "other";
}

async function buildReferralOverview({ topLimit = 25, recentLimit = 40 } = {}) {
  const safeTop = Math.min(100, Math.max(1, Number(topLimit) || 25));
  const safeRecent = Math.min(100, Math.max(1, Number(recentLimit) || 40));

  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    statusPartitions: ["active", "inactive", "blocked"],
    scanIndexForward: false,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
  });

  const users = items.map(withLegacyId).filter((row) => row && row.status !== "deleted");
  const byId = new Map(users.map((row) => [row.id, row]));

  let totalWithReferral = 0;
  let peerReferred = 0;
  let coachReferred = 0;
  let awcReferred = 0;
  let otherReferred = 0;
  const directCounts = new Map();
  const staffDirectCounts = new Map(); // entityId -> { count, entityType, code }
  const attributed = [];

  for (const user of users) {
    const referredByUserId = user.referredByUserId ? String(user.referredByUserId).trim() : "";
    const referredByEntityId = user.referredByEntityId ? String(user.referredByEntityId).trim() : "";
    const hasAttribution = Boolean(
      referredByUserId || user.referredByCode || user.referredByEntityType || referredByEntityId
    );
    if (!hasAttribution) continue;

    totalWithReferral += 1;
    attributed.push(user);

    const bucket = referredByUserId ? "peer" : entityTypeBucket(user.referredByEntityType);
    if (bucket === "peer") peerReferred += 1;
    else if (bucket === "coach") coachReferred += 1;
    else if (bucket === "awc") awcReferred += 1;
    else otherReferred += 1;

    if (referredByUserId) {
      directCounts.set(referredByUserId, (directCounts.get(referredByUserId) || 0) + 1);
    }

    if (referredByEntityId && (bucket === "coach" || bucket === "awc")) {
      const prev = staffDirectCounts.get(referredByEntityId) || {
        count: 0,
        entityType: user.referredByEntityType || null,
        code: user.referredByCode || null,
      };
      prev.count += 1;
      if (!prev.entityType && user.referredByEntityType) prev.entityType = user.referredByEntityType;
      if (!prev.code && user.referredByCode) prev.code = user.referredByCode;
      staffDirectCounts.set(referredByEntityId, prev);
    }
  }

  attributed.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const topReferrers = [...directCounts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, safeTop)
    .map(([id, directCount]) => {
      const user = byId.get(id);
      return {
        id,
        name: user?.name || null,
        email: user?.email || null,
        referralCode: user?.referralCode || null,
        userTier: user?.userTier || null,
        status: user?.status || null,
        directCount,
        missing: !user,
      };
    });

  const topStaffReferrers = [...staffDirectCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count || String(a[0]).localeCompare(String(b[0])))
    .slice(0, safeTop)
    .map(([id, info]) => ({
      id,
      name: null,
      email: null,
      referralCode: info.code || null,
      entityType: info.entityType || null,
      directCount: info.count,
    }));

  const recentReferrals = attributed.slice(0, safeRecent).map((user) => {
    const referrerId = user.referredByUserId ? String(user.referredByUserId).trim() : "";
    const referrer = referrerId ? byId.get(referrerId) : null;
    return {
      id: user.id,
      name: user.name || null,
      referralCode: user.referralCode || null,
      userTier: user.userTier || null,
      status: user.status || null,
      referredByUserId: referrerId || null,
      referredByEntityId: user.referredByEntityId || null,
      referredByCode: user.referredByCode || null,
      referredByEntityType: user.referredByEntityType || null,
      createdAt: user.createdAt || null,
      referrerName: referrer?.name || null,
      referrerCode: referrer?.referralCode || user.referredByCode || null,
    };
  });

  return {
    summary: {
      totalUsers: users.length,
      totalWithReferral,
      peerReferred,
      coachReferred,
      awcReferred,
      otherReferred,
      referrersWithDownline: directCounts.size,
      staffReferrersWithDownline: staffDirectCounts.size,
    },
    topReferrers,
    topStaffReferrers,
    recentReferrals,
  };
}

async function listUsersByAssignedCoachId(
  assignedCoachId,
  {
    parentCoachId,
    page = 1,
    limit = 20,
    search,
    userTier = "client",
    unpaginated = false,
    subscriptionExpiryUserIds,
  } = {}
) {
  const assigneeId = String(assignedCoachId || "").trim();
  const ownerCoachId = String(parentCoachId || "").trim();
  if (!assigneeId || !ownerCoachId) {
    return { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedTier = String(userTier || "client").toLowerCase().trim();
  const expiryIdSet = Array.isArray(subscriptionExpiryUserIds)
    ? new Set(
        subscriptionExpiryUserIds
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      )
    : null;

  if (expiryIdSet && !expiryIdSet.size) {
    return {
      users: [],
      pagination: { page: safePage, limit: safeLimit, total: 0, pages: 1 },
    };
  }

  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "ParentCoachIndex",
      KeyConditionExpression: "parentCoachId = :parentCoachId",
      ExpressionAttributeValues: { ":parentCoachId": ownerCoachId },
      ScanIndexForward: false,
    })
  );

  let rows = Items.map(withLegacyId).filter((row) => {
    if (row.status === "deleted") return false;
    if (String(row.assignedCoachId || "") !== assigneeId) return false;
    if (normalizeAssignedCoachType(row.assignedCoachType) !== "assistant_wellness_coach") return false;
    return matchesAssignedClientTier(row.userTier, normalizedTier);
  });

  if (expiryIdSet) {
    rows = rows.filter((row) => expiryIdSet.has(String(row.id || "").trim()));
  }

  if (normalizedSearch) {
    rows = rows.filter(
      (r) =>
        String(r.name || "").toLowerCase().includes(normalizedSearch) ||
        String(r.email || "").toLowerCase().includes(normalizedSearch) ||
        String(r.phone || "").includes(normalizedSearch)
    );
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;

  return {
    users: unpaginated ? rows : rows.slice(start, start + safeLimit),
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

async function listPendingAssignmentUsers({ page = 1, limit = 20, search, userTier } = {}) {
  if (userTier) {
    return listUsers({
      page,
      limit,
      search,
      status: "active",
      userTier,
      assignmentStatus: "pending_admin",
    });
  }

  // Default: all active pending clients (consultancy_only + heal), matching dashboard intent.
  const data = await listUsers({
    page: 1,
    limit: 200,
    search,
    status: "active",
    assignmentStatus: "pending_admin",
  });

  const filtered = data.users.filter((row) => {
    const tier = normalizeUserTier(row.userTier);
    return tier === "consultancy_only" || tier === "heal";
  });

  const paged = paginateItems(filtered, page, limit, 200);
  return {
    users: paged.items,
    pagination: paged.pagination,
  };
}

async function listUsersWithBirthdayOnDate(dateOnly) {
  const monthDays = birthdayQueryMonthDays(dateOnly);
  if (monthDays.length === 0) return [];

  const byId = new Map();

  for (const monthDay of monthDays) {
    let lastKey;

    do {
      const { Items, LastEvaluatedKey } = await docClient.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: "DobMonthDayIndex",
          KeyConditionExpression: "dobMonthDay = :dobMonthDay",
          FilterExpression: "#status = :active",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":dobMonthDay": monthDay,
            ":active": "active",
          },
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of Items || []) {
        byId.set(item.id, withLegacyId(item));
      }
      lastKey = LastEvaluatedKey;
    } while (lastKey);
  }

  return [...byId.values()].filter((user) => userBirthdayMatchesDate(user.dob, dateOnly));
}

async function listUsers({
  page = 1,
  limit = 20,
  status,
  search,
  userTier,
  assignmentStatus,
  clientCategory,
  subscriptionExpiryUserIds,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedTier = userTier ? normalizeUserTier(userTier, "") : "";
  const normalizedAssignment = assignmentStatus ? normalizeAssignmentStatus(assignmentStatus) : "";
  const normalizedCategory = clientCategory ? normalizeClientCategory(clientCategory, "") : "";
  const expiryIdSet = Array.isArray(subscriptionExpiryUserIds)
    ? new Set(
        subscriptionExpiryUserIds
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      )
    : null;

  if (expiryIdSet) {
    if (!expiryIdSet.size) {
      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
      return {
        users: [],
        pagination: { page: safePage, limit: safeLimit, total: 0, pages: 1 },
      };
    }

    const fetched = await Promise.all([...expiryIdSet].map((id) => getUserById(id)));
    let users = fetched
      .filter(Boolean)
      .map(withLegacyId)
      .filter((row) => row.status !== "deleted");

    if (normalizedStatus) {
      users = users.filter((row) => normalizeStatus(row.status) === normalizedStatus);
    }
    if (normalizedTier) {
      users = users.filter((row) => normalizeUserTier(row.userTier) === normalizedTier);
    }
    if (normalizedAssignment) {
      users = users.filter(
        (row) => normalizeAssignmentStatus(row.assignmentStatus) === normalizedAssignment,
      );
    }
    if (normalizedCategory) {
      users = users.filter(
        (row) => normalizeClientCategory(row.clientCategory) === normalizedCategory,
      );
    }

    const searchFilter = buildContainsFilter(["name", "email", "phone"], search);
    const normalizedSearch = String(searchFilter.search || "").trim().toLowerCase();
    if (normalizedSearch) {
      users = users.filter(
        (row) =>
          String(row.name || "").toLowerCase().includes(normalizedSearch) ||
          String(row.email || "").toLowerCase().includes(normalizedSearch) ||
          String(row.phone || "").includes(normalizedSearch),
      );
    }

    users.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const paged = paginateItems(users, page, limit, 200);
    return {
      users: paged.items,
      pagination: paged.pagination,
    };
  }

  const needsPostFilter = Boolean(normalizedTier || normalizedAssignment || normalizedCategory);
  const searchFilter = buildContainsFilter(["name", "email", "phone"], search);

  // When filtering by tier/assignment in memory, load the full status set first, then page.
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    statusPartitions: ["active", "inactive", "blocked"],
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page: needsPostFilter ? 1 : page,
    limit: needsPostFilter ? Number.MAX_SAFE_INTEGER : limit,
    maxLimit: needsPostFilter ? Number.MAX_SAFE_INTEGER : 200,
  });

  let users = items.map(withLegacyId);

  if (normalizedTier) {
    users = users.filter((row) => normalizeUserTier(row.userTier) === normalizedTier);
  }
  if (normalizedAssignment) {
    users = users.filter((row) => normalizeAssignmentStatus(row.assignmentStatus) === normalizedAssignment);
  }
  if (normalizedCategory) {
    users = users.filter((row) => normalizeClientCategory(row.clientCategory) === normalizedCategory);
  }

  if (needsPostFilter) {
    const paged = paginateItems(users, page, limit, 200);
    return {
      users: paged.items,
      pagination: paged.pagination,
    };
  }

  return {
    users,
    pagination,
  };
}

module.exports = {
  TABLE,
  USER_ALLOWED_STATUS,
  USER_ALLOWED_GENDERS,
  USER_ALLOWED_TIERS,
  USER_ALLOWED_CLIENT_CATEGORIES,
  USER_ALLOWED_ASSIGNMENT_STATUSES,
  USER_ALLOWED_ASSIGNED_COACH_TYPES,
  USER_ALLOWED_DIETARY_PREFERENCES,
  USER_ALLOWED_PAID_ONBOARDING_STEPS,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
  normalizeStatus,
  normalizeGender,
  normalizeUserTier,
  normalizeAssignmentStatus,
  normalizeAssignedCoachType,
  normalizeDietaryPreference,
  normalizeMealTrackingMode,
  normalizeHealthProgressFeatures,
  defaultHealthProgressFeatures,
  normalizePaidOnboardingStep,
  defaultPaidOnboardingStepStatus,
  normalizePaidOnboardingStepStatus,
  computePaidOnboardingCompleted,
  normalizeWellnessJourneyFor,
  normalizeDob,
  isPresentablePicsEnabled,
  isDietPlanEnabled,
  isHeartRateEnabled,
  isSleepTrackingEnabled,
  buildUserItem,
  toPublicUser,
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  deleteUser,
  listUsersByParentCoachId,
  listUsersByReferredByUserId,
  listUsersByReferredByEntityId,
  buildReferralTree,
  buildCoachReferralTree,
  buildReferralOverview,
  listUsersByAssignedCoachId,
  listPendingAssignmentUsers,
  listUsers,
  listUsersWithBirthdayOnDate,
};
