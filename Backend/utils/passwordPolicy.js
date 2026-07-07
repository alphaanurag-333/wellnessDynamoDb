const AppError = require("./AppError");

const PASSWORD_MIN_LEN = 8;
const PASSWORD_MAX_LEN = 15;

function validatePasswordPolicy(password, { required = true, label = "Password" } = {}) {
  const value = String(password ?? "");
  if (!value.trim()) {
    return required ? `${label} is required` : "";
  }
  if (value.length < PASSWORD_MIN_LEN) {
    return `${label} must be at least ${PASSWORD_MIN_LEN} characters`;
  }
  if (value.length > PASSWORD_MAX_LEN) {
    return `${label} cannot exceed ${PASSWORD_MAX_LEN} characters`;
  }
  return "";
}

function assertPasswordPolicy(password, options = {}) {
  const message = validatePasswordPolicy(password, options);
  if (message) throw new AppError(message, 400);
  return String(password ?? "");
}

module.exports = {
  PASSWORD_MIN_LEN,
  PASSWORD_MAX_LEN,
  validatePasswordPolicy,
  assertPasswordPolicy,
};
