export const PROFILE_PASSWORD_MIN_LEN = 8;
export const PROFILE_PASSWORD_MAX_LEN = 15;

export function validateCurrentPassword(value) {
  if (!String(value ?? "").trim()) return "Current password is required.";
  return "";
}

export function validateRegistrationPassword(value) {
  const trimmed = String(value ?? "");
  if (!trimmed.trim()) return "Password is required.";
  if (trimmed.length < PROFILE_PASSWORD_MIN_LEN) {
    return `Password must be at least ${PROFILE_PASSWORD_MIN_LEN} characters.`;
  }
  if (trimmed.length > PROFILE_PASSWORD_MAX_LEN) {
    return `Password cannot exceed ${PROFILE_PASSWORD_MAX_LEN} characters.`;
  }
  return "";
}

export function validateRegistrationConfirmPassword(value, password = "") {
  const trimmed = String(value ?? "");
  if (!trimmed.trim()) return "Please confirm your password.";
  if (trimmed !== password) return "Passwords do not match.";
  return "";
}

export function validateNewPassword(value, currentPassword = "") {
  const trimmed = String(value ?? "");
  if (!trimmed.trim()) return "New password is required.";
  if (trimmed.length < PROFILE_PASSWORD_MIN_LEN) {
    return `New password must be at least ${PROFILE_PASSWORD_MIN_LEN} characters.`;
  }
  if (trimmed.length > PROFILE_PASSWORD_MAX_LEN) {
    return `New password cannot exceed ${PROFILE_PASSWORD_MAX_LEN} characters.`;
  }
  if (currentPassword && trimmed === currentPassword) {
    return "New password must be different from current password.";
  }
  return "";
}

export function validateConfirmPassword(value, newPassword = "") {
  const trimmed = String(value ?? "");
  if (!trimmed.trim()) return "Please confirm your new password.";
  if (trimmed !== newPassword) return "Passwords do not match.";
  return "";
}

export function validateProfilePasswordFields({ currentPassword, newPassword, confirmPassword }) {
  const errors = {
    currentPassword: validateCurrentPassword(currentPassword),
    newPassword: validateNewPassword(newPassword, currentPassword),
    confirmPassword: validateConfirmPassword(confirmPassword, newPassword),
  };
  const valid = !errors.currentPassword && !errors.newPassword && !errors.confirmPassword;
  return { errors, valid };
}
