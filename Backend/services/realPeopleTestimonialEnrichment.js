const { getUserById, toPublicUser } = require("../models/userModel");
const { getHealthConcernById } = require("../models/healthConcernModel");

function memberSinceYearFromUser(user) {
  if (!user?.createdAt) return null;
  const year = new Date(user.createdAt).getFullYear();
  return Number.isFinite(year) ? year : null;
}

async function buildUserContext(userId) {
  const user = await getUserById(userId);
  if (!user) return null;

  const concernId = String(user.primaryHealthConcern || "").trim();
  const concern = concernId ? await getHealthConcernById(concernId) : null;
  const publicUser = toPublicUser(user);

  return {
    userName: user.name || "Member",
    userAvatar: publicUser?.profileImage || null,
    profileImage: publicUser?.profileImage || null,
    memberSinceYear: memberSinceYearFromUser(user),
    healthConcernTitle: concern?.title || null,
    heading: concern?.title || null,
    healthConcern: concern ? { id: concern.id, title: concern.title } : null,
    user: {
      id: user.id,
      name: user.name || "Member",
      profileImage: publicUser?.profileImage || null,
      memberSinceYear: memberSinceYearFromUser(user),
      primaryHealthConcern: concern ? { id: concern.id, title: concern.title } : null,
    },
  };
}

function normalizeStoredFields(row) {
  if (!row) return null;
  const userId = String(row.userId || row.submittedByUserId || "").trim();
  const review = String(row.review ?? row.content ?? "").trim();
  const stars = row.stars ?? row.rating ?? null;

  return {
    ...row,
    _id: row.id,
    userId,
    review,
    stars,
    content: review,
    rating: stars,
  };
}

async function enrichRealPeopleTestimonial(row) {
  const base = normalizeStoredFields(row);
  if (!base) return null;

  const userId = base.userId;
  if (!userId) return base;

  const ctx = await buildUserContext(userId);
  return ctx ? { ...base, ...ctx } : base;
}

async function enrichRealPeopleTestimonials(rows) {
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
      if (ctx) Object.assign(base, ctx);
    }
    enriched.push(base);
  }

  return enriched;
}

module.exports = {
  enrichRealPeopleTestimonial,
  enrichRealPeopleTestimonials,
  buildUserContext,
  memberSinceYearFromUser,
};
