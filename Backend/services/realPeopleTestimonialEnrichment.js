const { getUserById, toPublicUser } = require("../models/userModel");
const { getHealthConcernById } = require("../models/healthConcernModel");

function memberSinceYearFromUser(user) {
  if (!user?.createdAt) return null;
  const year = new Date(user.createdAt).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function memberSinceYearFromRow(row) {
  if (row?.createdAt) {
    const year = new Date(row.createdAt).getFullYear();
    if (Number.isFinite(year)) return year;
  }
  return null;
}

async function resolveHealthConcern(healthConcernId) {
  const concernId = String(healthConcernId || "").trim();
  if (!concernId) return null;
  return getHealthConcernById(concernId);
}

async function buildLegacyUserContext(userId, storedHealthConcernId) {
  const user = await getUserById(userId);
  if (!user) return null;

  const concernId = String(storedHealthConcernId || user.primaryHealthConcern || "").trim();
  const concern = concernId ? await getHealthConcernById(concernId) : null;
  const publicUser = toPublicUser(user);

  return {
    userName: user.name || "Member",
    name: user.name || "Member",
    userAvatar: publicUser?.profileImage || null,
    profileImage: publicUser?.profileImage || null,
    memberSinceYear: memberSinceYearFromUser(user),
    healthConcernId: concern?.id || null,
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
  const review = String(row.review ?? row.content ?? "").trim();
  const stars = row.stars ?? row.rating ?? null;
  const name = String(row.name || row.userName || "").trim();

  return {
    ...row,
    _id: row.id || row._id,
    name,
    review,
    stars,
    content: review,
    rating: stars,
  };
}

async function enrichRealPeopleTestimonial(row) {
  const base = normalizeStoredFields(row);
  if (!base) return null;

  const concern = await resolveHealthConcern(base.healthConcernId);
  if (concern) {
    base.healthConcernId = concern.id;
    base.healthConcernTitle = concern.title;
    base.heading = concern.title;
    base.healthConcern = { id: concern.id, title: concern.title };
  }

  if (!base.name || !base.profileImage) {
    const legacyUserId = String(base.userId || base.submittedByUserId || "").trim();
    if (legacyUserId) {
      const ctx = await buildLegacyUserContext(legacyUserId, base.healthConcernId);
      if (ctx) {
        if (!base.name) base.name = ctx.name;
        if (!base.userName) base.userName = ctx.userName;
        if (!base.profileImage) base.profileImage = ctx.profileImage;
        if (!base.userAvatar) base.userAvatar = ctx.userAvatar;
        if (!base.memberSinceYear) base.memberSinceYear = ctx.memberSinceYear;
        if (!base.healthConcern && ctx.healthConcern) {
          base.healthConcernId = ctx.healthConcernId;
          base.healthConcernTitle = ctx.healthConcernTitle;
          base.heading = ctx.heading;
          base.healthConcern = ctx.healthConcern;
        }
        base.user = ctx.user;
      }
    }
  }

  if (!base.userName && base.name) base.userName = base.name;
  if (!base.userAvatar && base.profileImage) base.userAvatar = base.profileImage;
  if (!base.memberSinceYear) base.memberSinceYear = memberSinceYearFromRow(base);

  return base;
}

async function enrichRealPeopleTestimonials(rows) {
  const concernCache = new Map();
  const userCache = new Map();
  const enriched = [];

  for (const row of rows || []) {
    const base = normalizeStoredFields(row);
    if (!base) continue;

    const concernId = String(base.healthConcernId || "").trim();
    if (concernId) {
      if (!concernCache.has(concernId)) {
        concernCache.set(concernId, await resolveHealthConcern(concernId));
      }
      const concern = concernCache.get(concernId);
      if (concern) {
        base.healthConcernId = concern.id;
        base.healthConcernTitle = concern.title;
        base.heading = concern.title;
        base.healthConcern = { id: concern.id, title: concern.title };
      }
    }

    if (!base.name || !base.profileImage) {
      const legacyUserId = String(base.userId || base.submittedByUserId || "").trim();
      if (legacyUserId) {
        const cacheKey = `${legacyUserId}:${base.healthConcernId || ""}`;
        if (!userCache.has(cacheKey)) {
          userCache.set(cacheKey, await buildLegacyUserContext(legacyUserId, base.healthConcernId));
        }
        const ctx = userCache.get(cacheKey);
        if (ctx) {
          if (!base.name) base.name = ctx.name;
          if (!base.userName) base.userName = ctx.userName;
          if (!base.profileImage) base.profileImage = ctx.profileImage;
          if (!base.userAvatar) base.userAvatar = ctx.userAvatar;
          if (!base.memberSinceYear) base.memberSinceYear = ctx.memberSinceYear;
          if (!base.healthConcern && ctx.healthConcern) {
            base.healthConcernId = ctx.healthConcernId;
            base.healthConcernTitle = ctx.healthConcernTitle;
            base.heading = ctx.heading;
            base.healthConcern = ctx.healthConcern;
          }
          base.user = ctx.user;
        }
      }
    }

    if (!base.userName && base.name) base.userName = base.name;
    if (!base.userAvatar && base.profileImage) base.userAvatar = base.profileImage;
    if (!base.memberSinceYear) base.memberSinceYear = memberSinceYearFromRow(base);

    enriched.push(base);
  }

  return enriched;
}

module.exports = {
  enrichRealPeopleTestimonial,
  enrichRealPeopleTestimonials,
  buildLegacyUserContext,
  memberSinceYearFromUser,
};
