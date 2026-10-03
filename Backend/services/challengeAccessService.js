const { getUserById, updateUser } = require("../models/userModel");
const {
  getChallengeById,
  getChallengeRecordById,
  listExpiredPublishedChallenges,
  updateChallenge,
} = require("../models/challengeModel");
const { todayIstDateString } = require("../utils/challengeAvailability");
const {
  listEnrollmentsByStatus,
  updateEnrollment,
  getEnrollmentById,
} = require("../models/challengeEnrollmentModel");
const {
  buildChallengeOnboardingUpdates,
  buildRestoreAccessUpdates,
} = require("../utils/challengeOnboardingHelpers");
const { normalizeUserTier } = require("../models/userAssignmentLogic");

async function grantChallengeAccess(enrollment, challenge) {
  if (!enrollment || enrollment.wasOriginallyPaid || !enrollment.temporaryAccess) {
    return updateEnrollment(enrollment.id, {
      status: "active",
      accessGrantedAt: new Date().toISOString(),
    });
  }

  const user = await getUserById(enrollment.userId);
  if (!user) return enrollment;

  const onboarding = buildChallengeOnboardingUpdates(challenge?.onboardingStepKeys || []);
  const endsAt = challenge?.endDate
    ? `${challenge.endDate}T23:59:59.999+05:30`
    : null;

  await updateUser(user.id, {
    userTier: "heal",
    healPaidAt: user.healPaidAt || new Date().toISOString(),
    ...onboarding,
    challengeTemporaryAccess: {
      challengeId: enrollment.challengeId,
      enrollmentId: enrollment.id,
      endsAt,
      grantedAt: new Date().toISOString(),
    },
  });

  return updateEnrollment(enrollment.id, {
    status: "active",
    accessGrantedAt: new Date().toISOString(),
  });
}

async function revokeChallengeAccess(enrollment) {
  if (!enrollment) return null;

  if (enrollment.wasOriginallyPaid || !enrollment.temporaryAccess) {
    return updateEnrollment(enrollment.id, {
      status: "completed",
      accessRevokedAt: new Date().toISOString(),
    });
  }

  const user = await getUserById(enrollment.userId);
  if (user) {
    // Real Heal purchase during challenge — do not downgrade.
    const temp = user.challengeTemporaryAccess;
    const stillTemporary =
      temp &&
      String(temp.enrollmentId || "") === String(enrollment.id) &&
      !user.programPurchased;

    if (stillTemporary) {
      const restore = buildRestoreAccessUpdates(
        enrollment.previousUserTier || "seek",
        enrollment.previousAccessSnapshot
      );
      await updateUser(user.id, restore);
    } else {
      await updateUser(user.id, { challengeTemporaryAccess: null });
    }
  }

  return updateEnrollment(enrollment.id, {
    status: "completed",
    accessRevokedAt: new Date().toISOString(),
    temporaryAccess: false,
  });
}

/**
 * If a temporary challenge user buys a real Heal product, clear temporary flag
 * so end-cron will not downgrade them.
 */
async function clearTemporaryChallengeFlagOnRealPurchase(userId) {
  const user = await getUserById(userId);
  if (!user?.challengeTemporaryAccess?.enrollmentId) return null;

  const enrollmentId = user.challengeTemporaryAccess.enrollmentId;
  const enrollment = await getEnrollmentById(enrollmentId);
  if (enrollment) {
    await updateEnrollment(enrollmentId, {
      wasOriginallyPaid: true,
      temporaryAccess: false,
    });
  }
  await updateUser(userId, { challengeTemporaryAccess: null });
  return enrollment;
}

async function hideExpiredChallenges(today) {
  const rows = await listExpiredPublishedChallenges(today);
  let hidden = 0;
  for (const row of rows) {
    await updateChallenge(row.id, { status: "completed" });
    hidden += 1;
  }
  return hidden;
}

async function runChallengeLifecycleJob({ now = new Date() } = {}) {
  const today = todayIstDateString(now);
  let granted = 0;
  let completed = 0;
  let failed = 0;
  let expiredChallenges = 0;

  try {
    expiredChallenges = await hideExpiredChallenges(today);
  } catch (err) {
    failed += 1;
    console.error("[ChallengeLifecycle] hide expired challenges failed", err.message);
  }

  const booked = await listEnrollmentsByStatus("booked", { page: 1, limit: 500 });
  for (const enrollment of booked.enrollments) {
    try {
      const start = enrollment.challengeStartDate;
      const end = enrollment.challengeEndDate;
      if (!start || start > today) continue;
      if (end && end < today) {
        await revokeChallengeAccess(enrollment);
        completed += 1;
        continue;
      }
      const challenge =
        (await getChallengeById(enrollment.challengeId)) ||
        (await getChallengeRecordById(enrollment.challengeId));
      await grantChallengeAccess(enrollment, challenge);
      granted += 1;
    } catch (err) {
      failed += 1;
      console.error("[ChallengeLifecycle] grant failed", enrollment.id, err.message);
    }
  }

  const active = await listEnrollmentsByStatus("active", { page: 1, limit: 500 });
  for (const enrollment of active.enrollments) {
    try {
      const end = enrollment.challengeEndDate;
      if (!end || end >= today) continue;
      await revokeChallengeAccess(enrollment);
      completed += 1;
    } catch (err) {
      failed += 1;
      console.error("[ChallengeLifecycle] revoke failed", enrollment.id, err.message);
    }
  }

  return { today, granted, completed, failed, expiredChallenges };
}

module.exports = {
  todayIstDateString,
  grantChallengeAccess,
  revokeChallengeAccess,
  clearTemporaryChallengeFlagOnRealPurchase,
  runChallengeLifecycleJob,
  normalizeUserTier,
};
