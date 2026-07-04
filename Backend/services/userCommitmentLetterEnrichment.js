const { getUserById, toPublicUser } = require("../models/userModel");
const { resolvePublicUrl } = require("../utils/s3");

function normalizeStoredFields(row) {
  if (!row) return null;
  const userId = String(row.userId || "").trim();
  return {
    ...row,
    _id: row.id,
    userId,
    pdfUrl: resolvePublicUrl(row.pdfKey) || null,
  };
}

async function buildUserContext(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  const publicUser = toPublicUser(user);
  return {
    userName: user.name || "Member",
    userEmail: user.email || "",
    userAvatar: publicUser?.profileImage || null,
    profileImage: publicUser?.profileImage || null,
    user: {
      id: user.id,
      name: user.name || "Member",
      email: user.email || "",
      profileImage: publicUser?.profileImage || null,
    },
  };
}

async function enrichUserCommitmentLetter(row) {
  const base = normalizeStoredFields(row);
  if (!base) return null;

  const userId = base.userId;
  if (!userId) return base;

  const ctx = await buildUserContext(userId);
  return ctx ? { ...base, ...ctx } : base;
}

async function enrichUserCommitmentLetters(rows) {
  const userCache = new Map();
  const enriched = [];

  for (const row of rows || []) {
    const base = normalizeStoredFields(row);
    if (!base) continue;

    const userId = base.userId;
    if (userId) {
      if (!userCache.has(userId)) {
        userCache.set(userId, await buildUserContext(userId));
      }
      const ctx = userCache.get(userId);
      enriched.push(ctx ? { ...base, ...ctx } : base);
    } else {
      enriched.push(base);
    }
  }

  return enriched;
}

module.exports = {
  enrichUserCommitmentLetter,
  enrichUserCommitmentLetters,
};
