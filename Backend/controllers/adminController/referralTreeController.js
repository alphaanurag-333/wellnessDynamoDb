const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  buildCoachReferralTree,
  buildReferralOverview,
  buildReferralTree,
  getUserById,
} = require("../../models/userModel");
const { correctUserReferralAttribution } = require("../../models/userConversionModel");
const { getReferralCodeRecord } = require("../../models/referralCodeModel");
const { scanTable, tableExists } = require("../../migration/lib/helpers");
const { getAccountById } = require("../../models/accountModel");
const {
  getAssistantWellnessCoachByIdResolved,
  getWellnessCoachByIdResolved,
} = require("../../services/accountResolver");
const { resolveStaffActor, listStaffClientIdSet } = require("../staffAccess");
const { notifyClientProfileFromReq } = require("../../services/clientProfileRealtime");

const STAFF_ENTITY_TYPES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const GLOBAL_REFERRAL_ROLES = new Set(["admin", "support"]);

async function resolveStaffEntity(entityId) {
  const id = String(entityId || "").trim();
  if (!id) return null;

  const account = await getAccountById(id);
  if (account) {
    const roleKeys = Array.isArray(account.roleKeys)
      ? account.roleKeys.map((k) => String(k || "").toLowerCase())
      : [];
    const fromMemberships = Array.isArray(account.memberships)
      ? account.memberships.map((m) => String(m?.roleKey || "").toLowerCase())
      : [];
    const keys = [...new Set([...roleKeys, ...fromMemberships])];
    const entityType = keys.find((k) => STAFF_ENTITY_TYPES.has(k));
    if (entityType) {
      return {
        id: account.id,
        name: account.name || null,
        email: account.email || null,
        referralCode: account.referralCode || null,
        status: account.status || null,
        createdAt: account.createdAt || null,
        entityType,
      };
    }
  }

  const coach = await getWellnessCoachByIdResolved(id);
  if (coach) {
    return {
      id: coach.id,
      name: coach.name || null,
      email: coach.email || null,
      referralCode: coach.referralCode || null,
      status: coach.status || null,
      createdAt: coach.createdAt || null,
      entityType: "wellness_coach",
    };
  }

  const assistant = await getAssistantWellnessCoachByIdResolved(id);
  if (assistant) {
    return {
      id: assistant.id,
      name: assistant.name || null,
      email: assistant.email || null,
      referralCode: assistant.referralCode || null,
      status: assistant.status || null,
      createdAt: assistant.createdAt || null,
      entityType: "assistant_wellness_coach",
    };
  }

  return null;
}

async function resolveTreeTarget({ rootUserId, rootEntityId, referralCode, mode }) {
  const preferredMode = String(mode || "").toLowerCase().trim();

  if (rootEntityId) {
    const staff = await resolveStaffEntity(rootEntityId);
    if (staff) return { kind: "coach", staff };
  }

  if (rootUserId && preferredMode !== "coach") {
    const user = await getUserById(rootUserId);
    if (user && user.status !== "deleted") {
      return { kind: "user", userId: user.id };
    }
  }

  const code = String(referralCode || "").trim();
  if (!code) return null;

  const record = await getReferralCodeRecord(code);
  if (!record) return null;

  const entityType = String(record.entityType || "").toLowerCase();
  const entityId = String(record.entityId || "").trim();
  if (!entityId) return null;

  if (STAFF_ENTITY_TYPES.has(entityType) || preferredMode === "coach") {
    const staff = await resolveStaffEntity(entityId);
    if (staff) {
      if (!staff.referralCode) staff.referralCode = record.referralCode || code;
      if (!staff.entityType) staff.entityType = entityType;
      return { kind: "coach", staff };
    }
  }

  if (entityType === "user" || preferredMode === "user") {
    const user = await getUserById(entityId);
    if (user && user.status !== "deleted") {
      return { kind: "user", userId: user.id };
    }
  }

  return null;
}

async function enrichStaffReferrers(rows) {
  const out = [];
  for (const row of rows || []) {
    const staff = await resolveStaffEntity(row.id);
    out.push({
      ...row,
      name: staff?.name || row.name || null,
      email: staff?.email || row.email || null,
      referralCode: staff?.referralCode || row.referralCode || null,
      entityType: staff?.entityType || row.entityType || null,
      status: staff?.status || null,
      missing: !staff,
    });
  }
  return out;
}

async function buildPeerReferralCodeNameMap() {
  const map = new Map();
  if (!(await tableExists("User"))) return map;

  const users = await scanTable("User");
  for (const row of users) {
    if (String(row.status || "").toLowerCase() === "deleted") continue;
    const code = String(row.referralCode || "")
      .trim()
      .toUpperCase();
    const name = row.name ? String(row.name).trim() : "";
    if (code && name) map.set(code, name);
  }
  return map;
}

async function enrichRecentReferrals(rows) {
  const peerCodeNames = await buildPeerReferralCodeNameMap();
  const userNameCache = new Map();
  const staffCache = new Map();
  const codeCache = new Map();

  async function lookupUserName(userId) {
    const id = String(userId || "").trim();
    if (!id) return null;
    if (userNameCache.has(id)) return userNameCache.get(id);
    const user = await getUserById(id);
    if (!user || user.status === "deleted") {
      userNameCache.set(id, null);
      return null;
    }
    const name = user.name ? String(user.name).trim() : null;
    userNameCache.set(id, name);
    return name;
  }

  async function lookupStaff(entityId) {
    const id = String(entityId || "").trim();
    if (!id) return null;
    if (staffCache.has(id)) return staffCache.get(id);
    const staff = await resolveStaffEntity(id);
    const entry = staff
      ? {
          name: staff.name ? String(staff.name).trim() : null,
          referralCode: staff.referralCode ? String(staff.referralCode).trim() : null,
        }
      : null;
    staffCache.set(id, entry);
    return entry;
  }

  async function lookupReferrerByCode(code) {
    const normalized = String(code || "")
      .trim()
      .toUpperCase();
    if (!normalized) return null;
    if (codeCache.has(normalized)) return codeCache.get(normalized);

    const record = await getReferralCodeRecord(normalized);
    if (!record) {
      codeCache.set(normalized, null);
      return null;
    }

    const entityType = String(record.entityType || "").toLowerCase();
    const entityId = String(record.entityId || "").trim();
    let name = null;
    let referralCode = record.referralCode || normalized;

    if (entityType === "user" && entityId) {
      name = await lookupUserName(entityId);
    } else if (
      (entityType === "wellness_coach" || entityType === "assistant_wellness_coach") &&
      entityId
    ) {
      const staff = await lookupStaff(entityId);
      name = staff?.name || null;
      if (staff?.referralCode) referralCode = staff.referralCode;
    }

    const entry = name ? { name, referralCode } : null;
    codeCache.set(normalized, entry);
    return entry;
  }

  const out = [];
  for (const row of rows || []) {
    let referrerName = row.referrerName ? String(row.referrerName).trim() : null;
    let referrerCode = row.referrerCode || row.referredByCode || null;

    if (!referrerName && row.referredByUserId) {
      referrerName = await lookupUserName(row.referredByUserId);
    }

    const entityType = String(row.referredByEntityType || "").toLowerCase();
    const entityId = row.referredByEntityId ? String(row.referredByEntityId).trim() : "";

    if (!referrerName && entityId) {
      if (entityType === "user") {
        referrerName = await lookupUserName(entityId);
      } else if (entityType === "wellness_coach" || entityType === "assistant_wellness_coach") {
        const staff = await lookupStaff(entityId);
        referrerName = staff?.name || referrerName;
        if (staff?.referralCode) referrerCode = staff.referralCode;
      }
    }

    if (!referrerName && referrerCode) {
      const fromCode = await lookupReferrerByCode(referrerCode);
      if (fromCode?.name) {
        referrerName = fromCode.name;
        referrerCode = fromCode.referralCode || referrerCode;
      }
    }

    if (!referrerName && referrerCode) {
      const codeKey = String(referrerCode).trim().toUpperCase();
      if (peerCodeNames.has(codeKey)) {
        referrerName = peerCodeNames.get(codeKey);
      }
    }

    const hasReferrerLink = Boolean(
      row.referredByUserId || row.referredByEntityId || row.referredByCode || referrerCode
    );
    const referrerMissing = hasReferrerLink && !referrerName;

    out.push({
      ...row,
      referrerName: referrerName || null,
      referrerCode: referrerCode || null,
      referrerMissing,
    });
  }
  return out;
}

function isGlobalReferralViewer(req) {
  if (req.auth?.isSuperAdmin) return true;
  const actor = resolveStaffActor(req);
  return GLOBAL_REFERRAL_ROLES.has(actor.role);
}

async function resolveReferralTreeScope(req) {
  if (isGlobalReferralViewer(req)) return null;

  const actor = resolveStaffActor(req);
  const rosterUserIds = await listStaffClientIdSet(req);

  if (actor.role === "wellness_coach") {
    return { staffEntityId: actor.id, rosterUserIds };
  }

  if (actor.role === "assistant_wellness_coach") {
    return { staffEntityId: actor.id, rosterUserIds };
  }

  if (actor.role === "trainee") {
    if (!actor.parentCoachId) {
      throw new AppError("Trainee is not linked to a wellness coach", 400);
    }
    return { staffEntityId: actor.parentCoachId, rosterUserIds };
  }

  throw new AppError("Forbidden", 403);
}

async function assertUserReferralEditAllowed(req, userId) {
  const id = String(userId || "").trim();
  if (!id) throw new AppError("User id is required", 400);

  const user = await getUserById(id);
  if (!user || user.status === "deleted") {
    throw new AppError("User not found", 404);
  }

  const scope = await resolveReferralTreeScope(req);
  if (!scope) return user;

  if (!scope.rosterUserIds?.has(id)) {
    throw new AppError("You can only update referral attribution for your clients", 403);
  }
  return user;
}

async function assertReferralTreeTargetAllowed(req, target, scope) {
  if (!scope) return;

  if (target.kind === "coach") {
    if (String(target.staff.id) !== String(scope.staffEntityId)) {
      throw new AppError("You can only view your own referral tree", 403);
    }
    return;
  }

  const userId = String(target.userId || "").trim();
  if (!userId || !scope.rosterUserIds?.has(userId)) {
    throw new AppError("You can only view referral trees for your clients", 403);
  }
}

exports.getReferralOverviewController = asyncHandler(async (req, res) => {
  const topLimit = req.query.topLimit != null ? Number(req.query.topLimit) : 25;
  const recentLimit = req.query.recentLimit != null ? Number(req.query.recentLimit) : 40;
  const scope = await resolveReferralTreeScope(req);
  const data = await buildReferralOverview({
    topLimit,
    recentLimit,
    restrictToUserIds: scope?.rosterUserIds || null,
    restrictStaffEntityIds: scope?.staffEntityId ? new Set([scope.staffEntityId]) : null,
  });
  const topStaffReferrers = await enrichStaffReferrers(data.topStaffReferrers);
  if (scope?.staffEntityId) {
    const ownId = String(scope.staffEntityId);
    const hasOwn = topStaffReferrers.some((row) => String(row.id) === ownId);
    if (!hasOwn) {
      const staff = await resolveStaffEntity(ownId);
      if (staff) {
        topStaffReferrers.unshift({
          id: staff.id,
          name: staff.name || null,
          email: staff.email || null,
          referralCode: staff.referralCode || null,
          entityType: staff.entityType || null,
          directCount: 0,
          missing: false,
        });
      }
    }
  }
  const recentReferrals = await enrichRecentReferrals(data.recentReferrals);
  return res.status(200).json({ status: true, ...data, topStaffReferrers, recentReferrals });
});

exports.getReferralTreeController = asyncHandler(async (req, res) => {
  const scope = await resolveReferralTreeScope(req);
  const target = await resolveTreeTarget({
    rootUserId: req.query.rootUserId,
    rootEntityId: req.query.rootEntityId,
    referralCode: req.query.referralCode,
    mode: req.query.mode,
  });

  if (!target) {
    throw new AppError(
      "Root not found. Provide rootUserId, rootEntityId, or a referralCode (user or staff).",
      404
    );
  }

  await assertReferralTreeTargetAllowed(req, target, scope);

  const maxDepth = req.query.maxDepth != null ? Number(req.query.maxDepth) : 5;
  const maxNodes = req.query.maxNodes != null ? Number(req.query.maxNodes) : 500;

  if (target.kind === "coach") {
    const { root, meta } = await buildCoachReferralTree(target.staff.id, target.staff, {
      maxDepth,
      maxNodes,
    });
    if (!root) throw new AppError("Staff referrer not found", 404);
    return res.status(200).json({ status: true, root, meta });
  }

  const { root, meta } = await buildReferralTree(target.userId, { maxDepth, maxNodes });
  if (!root) throw new AppError("Root user not found", 404);
  return res.status(200).json({ status: true, root, meta });
});

exports.patchUserReferralUsedController = asyncHandler(async (req, res) => {
  const userId = String(req.params.userId || "").trim();
  const referralCode = req.body?.referralCode ?? req.body?.referral_code ?? "";

  await assertUserReferralEditAllowed(req, userId);

  try {
    const user = await correctUserReferralAttribution(userId, referralCode);
    notifyClientProfileFromReq(req, userId, "personal", "profile.updated", { field: "referral" });
    notifyClientProfileFromReq(req, userId, "glance", "profile.updated", { field: "referral" });
    return res.status(200).json({
      status: true,
      user: {
        id: user.id,
        referredByUserId: user.referredByUserId || null,
        referredByCode: user.referredByCode || null,
        referredByEntityType: user.referredByEntityType || null,
        referredByEntityId: user.referredByEntityId || null,
      },
    });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError("User not found", 404);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    if (err?.name === "InvalidReferralCodeError") throw new AppError(err.message, 400);
    throw err;
  }
});
