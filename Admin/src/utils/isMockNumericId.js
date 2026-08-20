/**
 * Legacy Admin seed profiles used plain integers (`/users/1`).
 * Live clients use UUID ids. Never treat numeric route ids as real users.
 */
export function isMockNumericId(userId) {
  if (userId == null || userId === "") return false;
  const raw = String(userId).trim();
  if (!raw) return false;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 && String(numeric) === raw;
}
