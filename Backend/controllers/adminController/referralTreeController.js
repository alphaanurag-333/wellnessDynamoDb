const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  buildCoachReferralTree,
  buildReferralOverview,
  buildReferralTree,
  getUserById,
} = require("../../models/userModel");
const { getReferralCodeRecord } = require("../../models/referralCodeModel");
const { getAccountById } = require("../../models/accountModel");
const {
  getAssistantWellnessCoachByIdResolved,
  getWellnessCoachByIdResolved,
} = require("../../services/accountResolver");

const STAFF_ENTITY_TYPES = new Set(["wellness_coach", "assistant_wellness_coach"]);

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

exports.getReferralOverviewController = asyncHandler(async (req, res) => {
  const topLimit = req.query.topLimit != null ? Number(req.query.topLimit) : 25;
  const recentLimit = req.query.recentLimit != null ? Number(req.query.recentLimit) : 40;
  const data = await buildReferralOverview({ topLimit, recentLimit });
  const topStaffReferrers = await enrichStaffReferrers(data.topStaffReferrers);
  return res.status(200).json({ status: true, ...data, topStaffReferrers });
});

exports.getReferralTreeController = asyncHandler(async (req, res) => {
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
