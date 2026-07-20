const { isReferralCodeValidForDiscount } = require("./consultancyPricingService");
const { loadReferralContext } = require("../models/userConversionModel");

/**
 * Resolve referral history fields for new Seek user registration.
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
  const record = referral.record;
  const referredByCode = record.referralCode;

  if (record.entityType === "wellness_coach") {
    const coach = context.wellnessCoach;
    if (!coach || coach.status !== "active") return {};
    return {
      referredByUserId: null,
      referredByCode,
      referredByEntityType: "wellness_coach",
      referredByEntityId: coach.id,
    };
  }

  if (record.entityType === "assistant_wellness_coach") {
    const assistant = context.assistantWellnessCoach;
    if (!assistant || assistant.status !== "active") return {};
    return {
      referredByUserId: null,
      referredByCode,
      referredByEntityType: "assistant_wellness_coach",
      referredByEntityId: assistant.id,
    };
  }

  if (record.entityType === "user") {
    const referer = context.refererUser;
    if (!referer) return {};
    return {
      referredByUserId: referer.id,
      referredByCode,
      referredByEntityType: "user",
      referredByEntityId: referer.id,
    };
  }

  return {};
}

module.exports = {
  resolveRegistrationReferralFields,
};
