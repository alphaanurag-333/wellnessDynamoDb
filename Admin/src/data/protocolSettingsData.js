export const PROTOCOL_ONBOARDING_STEP = 8;
export const PROTOCOL_MAX_POINTS = 50;
export const PROTOCOL_MAX_SECTIONS = 20;
export const PROTOCOL_MIN_POINT_LENGTH = 2;
export const PROTOCOL_MIN_HEADING_LENGTH = 2;
export const PROTOCOL_MAX_HEADING_LENGTH = 120;

export function pointCountLabel(count) {
  return `${count} point${count === 1 ? "" : "s"}`;
}

export function sectionCountLabel(count) {
  return `${count} section${count === 1 ? "" : "s"}`;
}

export function newProtocolSectionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `section-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sanitizeProtocolPoint(raw) {
  return String(raw ?? "");
}

export function validateProtocolPoint(raw, { required = true } = {}) {
  const text = String(raw ?? "").trim();
  if (!text) return required ? "Protocol point cannot be empty." : "";
  if (text.length < PROTOCOL_MIN_POINT_LENGTH) {
    return `Protocol point must be at least ${PROTOCOL_MIN_POINT_LENGTH} characters.`;
  }
  if (/^(.)\1+$/.test(text) && text.length >= 8) {
    return "Enter a meaningful protocol point, not a repeated character.";
  }
  return "";
}

export function validateProtocolHeading(raw, { required = true } = {}) {
  const text = String(raw ?? "").trim();
  if (!text) return required ? "Section heading cannot be empty." : "";
  if (text.length < PROTOCOL_MIN_HEADING_LENGTH) {
    return `Section heading must be at least ${PROTOCOL_MIN_HEADING_LENGTH} characters.`;
  }
  if (text.length > PROTOCOL_MAX_HEADING_LENGTH) {
    return `Section heading cannot be longer than ${PROTOCOL_MAX_HEADING_LENGTH} characters.`;
  }
  return "";
}

export function validateProtocolPoints(points, { sectionLabel = "" } = {}) {
  const list = Array.isArray(points) ? points : [];
  const trimmed = list.map((point) => String(point ?? "").trim()).filter(Boolean);
  const prefix = sectionLabel ? `${sectionLabel}: ` : "";

  if (!trimmed.length) {
    return {
      ok: false,
      message: sectionLabel
        ? `${sectionLabel} needs at least one point.`
        : "Add at least one protocol point before saving.",
      errors: [],
    };
  }
  if (trimmed.length > PROTOCOL_MAX_POINTS) {
    return {
      ok: false,
      message: `${prefix}A section cannot have more than ${PROTOCOL_MAX_POINTS} points.`,
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
    return { ok: false, message: `${prefix}${firstError}`, errors };
  }

  return { ok: true, message: "", errors, points: trimmed };
}

export function validateProtocolSections(sections) {
  const list = Array.isArray(sections) ? sections : [];
  if (!list.length) {
    return { ok: false, message: "Add at least one section before saving.", errors: [] };
  }
  if (list.length > PROTOCOL_MAX_SECTIONS) {
    return {
      ok: false,
      message: `A protocol cannot have more than ${PROTOCOL_MAX_SECTIONS} sections.`,
      errors: [],
    };
  }

  const errors = list.map((section) => {
    const heading = validateProtocolHeading(section?.heading);
    const points = validateProtocolPoints(section?.points || [], {
      sectionLabel: String(section?.heading || "").trim() || "Section",
    });
    return {
      heading,
      points: points.errors || [],
      message: heading || points.message || "",
    };
  });

  const firstError = errors.find((entry) => entry.message);
  if (firstError) {
    return { ok: false, message: firstError.message, errors };
  }

  return {
    ok: true,
    message: "",
    errors,
    sections: list.map((section) => ({
      id: String(section.id || newProtocolSectionId()),
      heading: String(section.heading || "").trim(),
      points: (section.points || []).map((point) => String(point ?? "").trim()).filter(Boolean),
    })),
  };
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
