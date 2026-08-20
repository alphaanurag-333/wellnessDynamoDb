export const PROTOCOL_ONBOARDING_STEP = 8;
export const PROTOCOL_MAX_POINTS = 50;
export const PROTOCOL_MAX_POINT_LENGTH = 500;
export const PROTOCOL_MIN_POINT_LENGTH = 2;

export function pointCountLabel(count) {
  return `${count} point${count === 1 ? "" : "s"}`;
}

export function sanitizeProtocolPoint(raw, maxLen = PROTOCOL_MAX_POINT_LENGTH) {
  return String(raw ?? "").slice(0, maxLen);
}

export function validateProtocolPoint(raw, { required = true } = {}) {
  const text = String(raw ?? "").trim();
  if (!text) return required ? "Protocol point cannot be empty." : "";
  if (text.length < PROTOCOL_MIN_POINT_LENGTH) {
    return `Protocol point must be at least ${PROTOCOL_MIN_POINT_LENGTH} characters.`;
  }
  if (text.length > PROTOCOL_MAX_POINT_LENGTH) {
    return `Protocol point cannot exceed ${PROTOCOL_MAX_POINT_LENGTH} characters.`;
  }
  if (/^(.)\1+$/.test(text) && text.length >= 8) {
    return "Enter a meaningful protocol point, not a repeated character.";
  }
  return "";
}

export function validateProtocolPoints(points) {
  const list = Array.isArray(points) ? points : [];
  const trimmed = list.map((point) => String(point ?? "").trim()).filter(Boolean);

  if (!trimmed.length) {
    return { ok: false, message: "Add at least one protocol point before saving.", errors: [] };
  }
  if (trimmed.length > PROTOCOL_MAX_POINTS) {
    return {
      ok: false,
      message: `A protocol cannot have more than ${PROTOCOL_MAX_POINTS} points.`,
      errors: [],
    };
  }

  const errors = list.map((point, index) => {
    const text = String(point ?? "").trim();
    if (!text) return `Point ${index + 1} cannot be empty.`;
    return validateProtocolPoint(text);
  });

  const firstError = errors.find(Boolean);
  if (firstError) {
    return { ok: false, message: firstError, errors };
  }

  return { ok: true, message: "", errors, points: trimmed };
}

export function formatProtocolSavedAt(date = new Date()) {
  const formatted = date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  return `${formatted} IST`;
}

export function historyDeltaLabel(currentCount, previousCount) {
  const delta = currentCount - (previousCount ?? 0);
  if (delta === 0) return "No change vs previous";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} vs previous`;
}
