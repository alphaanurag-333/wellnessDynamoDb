const { isReferralCodeValidForDiscount } = require("./consultancyPricingService");
const { loadReferralContext } = require("../models/userConversionModel");
const { resolveConversionAssignment } = require("../models/userAssignmentLogic");

/**
 * Resolve referral history and staff assignment for new Seek user registration.
 * Invalid codes are ignored unless `strict` is true (admin create-user).
 */
async function resolveRegistrationReferralFields(referralCodeInput, { strict = false } = {}) {
  const normalizedInput = referralCodeInput
    ? String(referralCodeInput).trim().toUpperCase()
    : "";
  if (!normalizedInput) return {};

  const referral = await isReferralCodeValidForDiscount(normalizedInput);
  if (!referral.valid || !referral.record) {
    if (strict) {
      const err = new Error("Invalid referral code");
      err.name = "InvalidReferralCodeError";
      throw err;
    }
    return {};
  }

  const context = await loadReferralContext(referral.record);
  try {
    const assignment = resolveConversionAssignment(
      referral.record,
      context,
      normalizedInput
    );
    return {
      ...assignment,
      assignedAt:
        assignment.assignmentStatus === "assigned"
          ? new Date().toISOString()
          : null,
    };
  } catch (err) {
    if (err?.name === "InvalidReferralCodeError" && !strict) return {};
    throw err;
  }
}

module.exports = {
  resolveRegistrationReferralFields,
};
