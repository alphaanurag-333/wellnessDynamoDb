const AppError = require("./AppError");

const BIO_MAX_LEN = 150;

function validateBioPolicy(bio, { label = "Bio" } = {}) {
  if (bio == null || bio === "") return "";
  const value = String(bio);
  if (value.length > BIO_MAX_LEN) {
    return `${label} cannot exceed ${BIO_MAX_LEN} characters`;
  }
  return "";
}

function assertBioPolicy(bio, options = {}) {
  const message = validateBioPolicy(bio, options);
  if (message) throw new AppError(message, 400);
  if (bio == null || bio === "") return null;
  return String(bio).trim() || null;
}

module.exports = {
  BIO_MAX_LEN,
  validateBioPolicy,
  assertBioPolicy,
};
