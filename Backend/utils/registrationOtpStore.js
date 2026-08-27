const {
  saveRegistrationOtp,
  getRegistrationOtpRecord,
  deleteRegistrationOtp,
  verifyRegistrationOtp,
} = require("../models/registrationOtpModel");

/** DynamoDB-backed registration OTP (shared across instances, TTL auto-cleanup). */
async function setRegistrationOtp(identifiers, payload) {
  await saveRegistrationOtp(identifiers, payload);
}

async function getRegistrationOtpMeta(identifiers) {
  return getRegistrationOtpRecord(identifiers);
}

async function clearRegistrationOtp(identifiers) {
  await deleteRegistrationOtp(identifiers);
}

module.exports = {
  setRegistrationOtp,
  getRegistrationOtpMeta,
  clearRegistrationOtp,
  verifyRegistrationOtp,
};
