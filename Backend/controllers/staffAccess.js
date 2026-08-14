const AppError = require("../utils/AppError");
const { normalizeRoleKey } = require("../config/accountRoles");
const {
  listUsers,
  listUsersByParentCoachId,
  listUsersByAssignedCoachId,
} = require("../models/userModel");
const { matchesAssignedClientTier } = require("../models/userAssignmentLogic");

const CLINICAL_ROLES = Object.freeze([
  "admin",
  "wellness_coach",
  "assistant_wellness_coach",
  "trainee",
]);

const READ_ONLY_ROLES = new Set(["trainee"]);
const NO_CLIENT_ROLES = new Set(["support"]);

function resolveStaffActor(req) {
  const id = String(req.auth?.sub || "").trim();
  if (!id) throw new AppError("Unauthorized", 401);

  const role = normalizeRoleKey(req.auth?.role);
  if (!role) throw new AppError("Forbidden", 403);

  const parentCoachId = String(
    req.user?.wellnessCoachId ||
      req.user?.parentAccountId ||
      req.account?.parentAccountId ||
      ""
  ).trim();

  return {
    id,
    role,
    displayName: String(req.user?.name || req.account?.name || "Staff").trim() || "Staff",
    parentCoachId: parentCoachId || null,
  };
}

function getStaffScopeCoachId(req) {
  const actor = resolveStaffActor(req);
  if (actor.role === "wellness_coach") return actor.id;
  if (actor.role === "assistant_wellness_coach" || actor.role === "trainee") {
    return actor.parentCoachId;
  }
  return null;
}

function assertStaffCanMutate(req) {
  const actor = resolveStaffActor(req);
  if (READ_ONLY_ROLES.has(actor.role)) {
    throw new AppError("You do not have permission to perform this action", 403);
  }
  return actor;
}

async function assertStaffCanAccessUser(req, user) {
  const actor = resolveStaffActor(req);

  if (NO_CLIENT_ROLES.has(actor.role)) {
    throw new AppError("Support cannot access client records", 403);
  }

  if (actor.role === "admin") return actor;

  if (actor.role === "wellness_coach") {
    if (String(user?.parentCoachId || "") !== String(actor.id)) {
      throw new AppError("User is not under your coaching hierarchy", 403);
    }
    return actor;
  }

  if (actor.role === "assistant_wellness_coach") {
    if (String(user?.assignedCoachId || "") !== String(actor.id)) {
      throw new AppError("User is not assigned to you", 403);
    }
    return actor;
  }

  if (actor.role === "trainee") {
    const parent = actor.parentCoachId;
    if (!parent || String(user?.parentCoachId || "") !== String(parent)) {
      throw new AppError("User is not under your coaching hierarchy", 403);
    }
    return actor;
  }

  throw new AppError("Forbidden", 403);
}

async function listHealUsersForStaff(req, { page = 1, limit = 20, search, scope = "all", userTier = "client" } = {}) {
  const actor = resolveStaffActor(req);

  if (actor.role === "admin") {
    const data = await listUsers({ page: 1, limit: 10000, search, assignmentStatus: "assigned" });
    const rows = (data.users || []).filter((row) => matchesAssignedClientTier(row.userTier, userTier));
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / safeLimit));
    const start = (safePage - 1) * safeLimit;
    return {
      users: rows.slice(start, start + safeLimit),
      pagination: { page: safePage, limit: safeLimit, total, pages },
    };
  }

  if (actor.role === "wellness_coach") {
    return listUsersByParentCoachId(actor.id, { page, limit, search, userTier, scope });
  }

  if (actor.role === "assistant_wellness_coach") {
    if (!actor.parentCoachId) {
      throw new AppError("Assistant is not linked to a wellness coach", 400);
    }
    return listUsersByAssignedCoachId(actor.id, {
      parentCoachId: actor.parentCoachId,
      page,
      limit,
      search,
      userTier,
    });
  }

  if (actor.role === "trainee") {
    if (!actor.parentCoachId) {
      throw new AppError("Trainee is not linked to a wellness coach", 400);
    }
    return listUsersByParentCoachId(actor.parentCoachId, { page, limit, search, userTier, scope });
  }

  throw new AppError("Forbidden", 403);
}

module.exports = {
  CLINICAL_ROLES,
  READ_ONLY_ROLES,
  resolveStaffActor,
  getStaffScopeCoachId,
  assertStaffCanMutate,
  assertStaffCanAccessUser,
  listHealUsersForStaff,
};
