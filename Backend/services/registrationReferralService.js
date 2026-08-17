const { isReferralCodeValidForDiscount } = require("./consultancyPricingService");
const { loadReferralContext } = require("../models/userConversionModel");
const { resolveConversionAssignment } = require("../models/userAssignmentLogic");

/**
 * Resolve referral history and staff assignment for new Seek user registration.
 * Only returns fields when the code is valid; invalid codes are ignored silently.
 */
async function resolveRegistrationReferralFields(referralCodeInput) {
  const normalizedInput = referralCodeInput
    ? String(referralCodeInput).trim().toUpperCase()
    : "";
  if (!normalizedInput) return {};

  const referral = await isReferralCodeValidForDiscount(normalizedInput);
  if (!referral.valid || !referral.record) return {};

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
    if (err?.name === "InvalidReferralCodeError") return {};
    throw err;
  }
}

module.exports = {
  resolveRegistrationReferralFields,
};
