const USER_TIERS = new Set(["seek", "consultancy_only", "heal"]);
const ASSIGNMENT_STATUSES = new Set(["assigned", "pending_admin"]);
const ASSIGNED_COACH_TYPES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const ASSIGNMENT_SOURCES = new Set(["referral", "admin_manual", "coach_reassign"]);
const REFERRED_BY_ENTITY_TYPES = new Set(["wellness_coach", "assistant_wellness_coach", "user"]);

function normalizeUserTier(value, fallback = "seek") {
  const next = String(value || fallback).toLowerCase().trim();
  return USER_TIERS.has(next) ? next : fallback;
}

function normalizeAssignmentStatus(value, fallback = "pending_admin") {
  const next = String(value || fallback).toLowerCase().trim();
  return ASSIGNMENT_STATUSES.has(next) ? next : fallback;
}

function normalizeAssignedCoachType(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNED_COACH_TYPES.has(next) ? next : null;
}

function normalizeReferredByEntityType(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return REFERRED_BY_ENTITY_TYPES.has(next) ? next : null;
}

function normalizeAssignmentSource(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNMENT_SOURCES.has(next) ? next : null;
}

function isHealTier(value) {
  return normalizeUserTier(value) === "heal";
}

function isConsultancyOnlyTier(value) {
  return normalizeUserTier(value) === "consultancy_only";
}

/** Users with a paid consultancy relationship (consultancy or full subscription). */
function isPaidClientTier(value) {
  const tier = normalizeUserTier(value);
  return tier === "consultancy_only" || tier === "heal";
}

/** Seek, consultancy, and Heal users can use water/steps tracking in the mobile app. */
function isWellnessTrackingTier(value) {
  return USER_TIERS.has(normalizeUserTier(value));
}

/** Coach/assistant client lists: assigned users across all tracking-eligible tiers. */
function matchesAssignedClientTier(value, filter = "client") {
  const tier = normalizeUserTier(value);
  const normalizedFilter = String(filter || "client").toLowerCase().trim();
  if (normalizedFilter === "all") return true;
  if (normalizedFilter === "client") return isWellnessTrackingTier(tier);
  return tier === normalizeUserTier(normalizedFilter, "");
}

/**
 * Resolve assignment fields at Seek → Heal conversion time (write-time resolution).
 * @param {object|null} referralRecord - ReferralCode registry row
 * @param {object} context - Loaded entities keyed by type
 * @param {string|null} referralCodeInput - Raw referral code from request
 */
function resolveConversionAssignment(referralRecord, context, referralCodeInput) {
  const normalizedInput = referralCodeInput ? String(referralCodeInput).trim().toUpperCase() : "";

  if (!normalizedInput) {
    return {
      referredByUserId: null,
      referredByCode: null,
      referredByEntityType: null,
      referredByEntityId: null,
      assignedCoachId: null,
      assignedCoachType: null,
      parentCoachId: null,
      assignmentStatus: "pending_admin",
      assignmentSource: null,
    };
  }

  if (!referralRecord) {
    const err = new Error("Invalid referral code");
    err.name = "InvalidReferralCodeError";
    throw err;
  }

  const referredByCode = referralRecord.referralCode;

  if (referralRecord.entityType === "wellness_coach") {
    const coach = context.wellnessCoach;
    if (!coach) {
      const err = new Error("Referral wellness coach not found");
      err.name = "InvalidReferralCodeError";
      throw err;
    }
    if (coach.status !== "active") {
      const err = new Error("Referral wellness coach is not active");
      err.name = "InvalidReferralCodeError";
      throw err;
    }

    return {
      referredByUserId: null,
      referredByCode,
      referredByEntityType: "wellness_coach",
      referredByEntityId: coach.id,
      assignedCoachId: coach.id,
      assignedCoachType: "wellness_coach",
      parentCoachId: coach.id,
      assignmentStatus: "assigned",
      assignmentSource: "referral",
    };
  }

  if (referralRecord.entityType === "assistant_wellness_coach") {
    const assistant = context.assistantWellnessCoach;
    if (!assistant) {
      const err = new Error("Referral assistant wellness coach not found");
      err.name = "InvalidReferralCodeError";
      throw err;
    }
    if (assistant.status !== "active") {
      const err = new Error("Referral assistant wellness coach is not active");
      err.name = "InvalidReferralCodeError";
      throw err;
    }

    const parentCoachId = String(assistant.wellnessCoachId || "").trim();
    if (!parentCoachId) {
      const err = new Error("Referral assistant has no parent wellness coach");
      err.name = "InvalidReferralCodeError";
      throw err;
    }

    return {
      referredByUserId: null,
      referredByCode,
      referredByEntityType: "assistant_wellness_coach",
      referredByEntityId: assistant.id,
      assignedCoachId: assistant.id,
      assignedCoachType: "assistant_wellness_coach",
      parentCoachId,
      assignmentStatus: "assigned",
      assignmentSource: "referral",
    };
  }

  if (referralRecord.entityType === "user") {
    const referer = context.refererUser;
    if (!referer) {
      const err = new Error("Referring user not found");
      err.name = "InvalidReferralCodeError";
      throw err;
    }
    if (normalizeUserTier(referer.userTier) !== "heal") {
      const err = new Error("Referral code belongs to a non-Heal user");
      err.name = "InvalidReferralCodeError";
      throw err;
    }

    const owningCoachId = String(referer.parentCoachId || "").trim();
    if (!owningCoachId) {
      const err = new Error("Referring user has no owning wellness coach");
      err.name = "InvalidReferralCodeError";
      throw err;
    }

    return {
      referredByUserId: referer.id,
      referredByCode,
      referredByEntityType: "user",
      referredByEntityId: referer.id,
      assignedCoachId: owningCoachId,
      assignedCoachType: "wellness_coach",
      parentCoachId: owningCoachId,
      assignmentStatus: "assigned",
      assignmentSource: "referral",
    };
  }

  const err = new Error("Unsupported referral entity type");
  err.name = "InvalidReferralCodeError";
  throw err;
}

/**
 * Validate coach assignment invariants for paid client tiers.
 * Seek users skip assignment validation.
 */
function validateHealUserAssignment(user) {
  const errors = [];
  if (!user) {
    return { valid: false, errors: ["User is required"] };
  }

  const tier = normalizeUserTier(user.userTier, "seek");
  if (!isPaidClientTier(tier)) {
    return { valid: true, errors: [] };
  }

  const assignmentStatus = normalizeAssignmentStatus(user.assignmentStatus, "");

  if (!ASSIGNMENT_STATUSES.has(assignmentStatus)) {
    errors.push("Paid client must have assignmentStatus assigned or pending_admin");
    return { valid: false, errors };
  }

  if (assignmentStatus === "pending_admin") {
    if (user.assignedCoachId || user.assignedCoachType || user.parentCoachId) {
      errors.push("Pending-admin client must not have coach assignment fields set");
    }
    return { valid: errors.length === 0, errors };
  }

  const assignedCoachId = String(user.assignedCoachId || "").trim();
  const assignedCoachType = normalizeAssignedCoachType(user.assignedCoachType);
  const parentCoachId = String(user.parentCoachId || "").trim();

  if (!assignedCoachId) errors.push("Assigned client must have assignedCoachId");
  if (!assignedCoachType) errors.push("Assigned client must have assignedCoachType");
  if (!parentCoachId) errors.push("Assigned client must have parentCoachId");

  if (assignedCoachType === "wellness_coach" && assignedCoachId !== parentCoachId) {
    errors.push("Direct wellness coach assignment requires parentCoachId to match assignedCoachId");
  }

  return { valid: errors.length === 0, errors };
}

function assertHealUserAssignment(user) {
  const result = validateHealUserAssignment(user);
  if (!result.valid) {
    const err = new Error(result.errors.join("; "));
    err.name = "InvalidHealAssignmentError";
    throw err;
  }
  return true;
}

/**
 * Build assignment patch for admin/coach reassignment (referredBy* stays immutable).
 */
function resolveReassignmentPatch({ assignedCoachId, assignedCoachType, parentCoachId, assignmentSource = "admin_manual" }) {
  const normalizedCoachId = String(assignedCoachId || "").trim();
  const normalizedType = normalizeAssignedCoachType(assignedCoachType);
  const normalizedParentCoachId = String(parentCoachId || "").trim();

  if (!normalizedCoachId) throw new Error("assignedCoachId is required");
  if (!normalizedType) throw new Error("assignedCoachType must be wellness_coach or assistant_wellness_coach");
  if (!normalizedParentCoachId) throw new Error("parentCoachId is required");

  if (normalizedType === "wellness_coach" && normalizedCoachId !== normalizedParentCoachId) {
    throw new Error("Direct wellness coach assignment requires parentCoachId to match assignedCoachId");
  }

  const normalizedSource = normalizeAssignmentSource(assignmentSource) || "admin_manual";
  const now = new Date().toISOString();

  return {
    assignedCoachId: normalizedCoachId,
    assignedCoachType: normalizedType,
    parentCoachId: normalizedParentCoachId,
    assignmentStatus: "assigned",
    assignmentSource: normalizedSource,
    assignedAt: now,
  };
}

module.exports = {
  USER_TIERS,
  ASSIGNMENT_STATUSES,
  ASSIGNED_COACH_TYPES,
  ASSIGNMENT_SOURCES,
  REFERRED_BY_ENTITY_TYPES,
  normalizeUserTier,
  normalizeAssignmentStatus,
  normalizeAssignedCoachType,
  normalizeAssignmentSource,
  normalizeReferredByEntityType,
  isHealTier,
  isConsultancyOnlyTier,
  isPaidClientTier,
  isWellnessTrackingTier,
  matchesAssignedClientTier,
  resolveConversionAssignment,
  validateHealUserAssignment,
  assertHealUserAssignment,
  resolveReassignmentPatch,
};
