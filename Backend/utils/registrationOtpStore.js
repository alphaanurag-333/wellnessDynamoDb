const {
  saveRegistrationOtp,
  deleteRegistrationOtp,
  verifyRegistrationOtp,
} = require("../models/registrationOtpModel");

/** DynamoDB-backed registration OTP (shared across instances, TTL auto-cleanup). */
async function setRegistrationOtp(identifiers, payload) {
  await saveRegistrationOtp(identifiers, payload);
}

async function clearRegistrationOtp(identifiers) {
  await deleteRegistrationOtp(identifiers);
}

module.exports = {
  setRegistrationOtp,
  clearRegistrationOtp,
  verifyRegistrationOtp,
};
