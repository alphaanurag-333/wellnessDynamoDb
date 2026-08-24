export const SOP_CATEGORIES = [
  { id: "onboarding", label: "Onboarding" },
  { id: "escalation", label: "Escalation" },
  { id: "nutrition", label: "Nutrition" },
  { id: "reviews", label: "Reviews" },
  { id: "payments", label: "Payments" },
];

export const SOP_CONTENT_TYPES = [
  { id: "text", label: "Text" },
  { id: "word", label: "Word" },
  { id: "pdf", label: "PDF" },
  { id: "video", label: "Video" },
];

/** Legacy labels when audienceRole was stored as account roleKey. */
export const LEGACY_AUDIENCE_ROLE_LABELS = {
  all: "All staff",
  admin: "Admin",
  wellness_coach: "Wellness Coach",
  assistant_wellness_coach: "Assistant WC",
  trainee: "Trainee",
  support: "Support",
};

export const SOP_TITLE_MIN_LEN = 3;
export const SOP_TITLE_MAX_LEN = 100;
export const SOP_STEP_MIN_COUNT = 1;
export const SOP_STEP_MAX_COUNT = 20;
export const SOP_STEP_MAX_LEN = 240;
export const SOP_STEPS_TEXT_MAX_LEN = SOP_STEP_MAX_COUNT * (SOP_STEP_MAX_LEN + 1);
export const SOP_FILE_MAX_BYTES = 100 * 1024 * 1024;

export const SOP_CATEGORY_STYLES = {
  onboarding: { bg: "#e8eefc", color: "#3d5bb5", border: "#c9d6f5" },
  escalation: { bg: "#fdecea", color: "#c0392b", border: "#f5c6c6" },
  nutrition: { bg: "#e7f6ee", color: "#2b8f5b", border: "#bfe6cf" },
  reviews: { bg: "#f3eefc", color: "#7c3aed", border: "#ddd0f5" },
  payments: { bg: "#eef1f7", color: "#5a6b85", border: "#d8dee9" },
};

export const SOP_AUDIENCE_ROLE_STYLES = {
  all: { bg: "#eef1f7", color: "#5a6b85", border: "#d8dee9" },
  admin: { bg: "#eceefc", color: "#5e6ad2", border: "#d5daf7" },
  wellness_coach: { bg: "#f3e8ff", color: "#7c3aed", border: "#ddd0f5" },
  assistant_wellness_coach: { bg: "#eef0fc", color: "#6366f1", border: "#d5daf7" },
  trainee: { bg: "#fdf8ec", color: "#b8860b", border: "#f0e0b8" },
  support: { bg: "#e6f6f2", color: "#0d9488", border: "#bfe6cf" },
};

export function formatSopDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function stepsToText(steps) {
  return Array.isArray(steps) ? steps.join("\n") : "";
}

export function textToSteps(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sanitizeSopTitle(raw, maxLen = SOP_TITLE_MAX_LEN) {
  return String(raw ?? "").replace(/\s{2,}/g, " ").slice(0, maxLen);
}

export function sanitizeSopStepsText(raw, maxLen = SOP_STEPS_TEXT_MAX_LEN) {
  return String(raw ?? "").slice(0, maxLen);
}

export function validateSopTitle(title) {
  const trimmed = String(title ?? "").trim();
  if (!trimmed) return "Title is required.";
  if (trimmed.length < SOP_TITLE_MIN_LEN) {
    return `Title must be at least ${SOP_TITLE_MIN_LEN} characters.`;
  }
  if (trimmed.length > SOP_TITLE_MAX_LEN) {
    return `Title must be at most ${SOP_TITLE_MAX_LEN} characters.`;
  }
  return "";
}

export function validateSopCategory(category) {
  if (!SOP_CATEGORIES.some((row) => row.id === category)) return "Pick a category.";
  return "";
}

export function validateSopContentType(contentType) {
  if (!SOP_CONTENT_TYPES.some((row) => row.id === contentType)) return "Pick a content type.";
  return "";
}

export function buildSopAudienceOptions(accessRoles = []) {
  const options = [{ id: "all", value: "all", label: "All staff" }];
  for (const role of accessRoles) {
    if (!role?.id) continue;
    const name = String(role.name || "Role").trim();
    const label = role.system ? name : `${name} (Custom)`;
    options.push({ id: role.id, value: role.id, label });
  }
  return options;
}

export function defaultSopAudienceRole(accessRoles = []) {
  const wc = accessRoles.find((role) => String(role.roleKey || "").toLowerCase() === "wc");
  if (wc?.id) return wc.id;
  const coach = accessRoles.find((role) => !role.system && String(role.name || "").toLowerCase().includes("coach"));
  if (coach?.id) return coach.id;
  return accessRoles[0]?.id || "all";
}

export function validateSopAudienceRole(audienceRole, accessRoles = []) {
  if (audienceRole === "all") return "";
  const options = buildSopAudienceOptions(accessRoles);
  if (options.some((row) => row.value === audienceRole)) return "";
  if (LEGACY_AUDIENCE_ROLE_LABELS[audienceRole]) return "";
  return "Pick who this SOP is for.";
}

export function audienceRoleLabel(audienceRole, accessRoles = []) {
  if (!audienceRole || audienceRole === "all") return "All staff";
  const match = accessRoles.find((role) => role.id === audienceRole);
  if (match) {
    const name = String(match.name || "Role").trim();
    return match.system ? name : `${name} (Custom)`;
  }
  return LEGACY_AUDIENCE_ROLE_LABELS[audienceRole] || "Role";
}

export function audienceRoleStyle(audienceRole, accessRoles = []) {
  if (!audienceRole || audienceRole === "all") return SOP_AUDIENCE_ROLE_STYLES.all;
  const match = accessRoles.find((role) => role.id === audienceRole);
  if (match?.color) {
    return {
      bg: match.bg || "#eef1f7",
      color: match.color,
      border: match.bd || match.bg || "#d8dee9",
    };
  }
  const legacyKey = Object.keys(LEGACY_AUDIENCE_ROLE_LABELS).includes(audienceRole)
    ? audienceRole
    : "all";
  return SOP_AUDIENCE_ROLE_STYLES[legacyKey] || SOP_AUDIENCE_ROLE_STYLES.all;
}

export function sopVisibleToAudience(sop, { consoleRoleId, roleKey, accessRoles = [] } = {}) {
  const audience = sop?.audienceRole || "all";
  if (audience === "all") return true;

  const normalizedRoleKey = roleKey ? String(roleKey).toLowerCase() : "";
  const normalizedRoleId = consoleRoleId ? String(consoleRoleId).toLowerCase() : "";

  if (normalizedRoleId && audience.toLowerCase() === normalizedRoleId) return true;
  if (normalizedRoleKey && audience === normalizedRoleKey) return true;

  const byId = Object.fromEntries(accessRoles.map((role) => [role.id, role]));
  const target = byId[audience];
  if (target && normalizedRoleId && target.id?.toLowerCase() === normalizedRoleId) return true;

  const UI_TO_ACCOUNT = {
    admin: "admin",
    wc: "wellness_coach",
    awc: "assistant_wellness_coach",
    trainee: "trainee",
    support: "support",
  };

  if (target?.roleKey && normalizedRoleKey) {
    const accountKey = UI_TO_ACCOUNT[target.roleKey] || target.roleKey;
    if (accountKey === normalizedRoleKey || target.roleKey === normalizedRoleKey) return true;
  }

  if (normalizedRoleKey) {
    const viewerRole = accessRoles.find((role) => role.id === normalizedRoleId)
      || accessRoles.find((role) => {
        const accountKey = UI_TO_ACCOUNT[role.roleKey] || role.roleKey;
        return accountKey === normalizedRoleKey || role.roleKey === normalizedRoleKey;
      });
    if (viewerRole?.id === audience) return true;
  }

  return LEGACY_AUDIENCE_ROLE_LABELS[audience] && normalizedRoleKey === audience;
}

export function validateSopStepsText(text) {
  const steps = textToSteps(text);
  if (steps.length < SOP_STEP_MIN_COUNT) return "Add at least one step.";
  if (steps.length > SOP_STEP_MAX_COUNT) {
    return `Use at most ${SOP_STEP_MAX_COUNT} steps.`;
  }
  const tooLong = steps.findIndex((step) => step.length > SOP_STEP_MAX_LEN);
  if (tooLong !== -1) {
    return `Step ${tooLong + 1} must be at most ${SOP_STEP_MAX_LEN} characters.`;
  }
  return "";
}

export function isYoutubeOrVimeoUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "vimeo.com" ||
      host.endsWith(".vimeo.com")
    );
  } catch {
    return false;
  }
}

export function sopVideoEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.includes("/embed/")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return "";
  }
  return "";
}

export function validateSopFile(contentType, file, { required = true, hasExisting = false } = {}) {
  if (!file) {
    if (required && !hasExisting) {
      if (contentType === "pdf") return "PDF file is required.";
      if (contentType === "word") return "Word document is required.";
      if (contentType === "video") return "Upload a video or paste a YouTube / Vimeo link.";
    }
    return "";
  }
  if (file.size > SOP_FILE_MAX_BYTES) return "File must be 100 MB or smaller.";
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.type || "").toLowerCase();
  if (contentType === "word") {
    if (/\.(doc|docx)$/.test(name) || mime.includes("msword") || mime.includes("wordprocessingml")) {
      return "";
    }
    return "Upload a Word document (.doc or .docx).";
  }
  if (contentType === "pdf") {
    if (name.endsWith(".pdf") || mime === "application/pdf") return "";
    return "Upload a PDF file.";
  }
  if (contentType === "video") {
    if (/\.(mp4|webm|mov|avi)$/.test(name) || mime.startsWith("video/")) return "";
    return "Upload an MP4, WebM, or MOV video.";
  }
  return "";
}

export function validateSopLinkUrl(url, { required = false } = {}) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return required ? "Paste a YouTube or Vimeo link." : "";
  if (!isYoutubeOrVimeoUrl(trimmed)) return "Use a valid YouTube or Vimeo link.";
  return "";
}

export function contentTypeLabel(contentType) {
  return SOP_CONTENT_TYPES.find((row) => row.id === contentType)?.label || "Text";
}

export function withStepCount(sop) {
  const steps = Array.isArray(sop?.steps) ? sop.steps : [];
  const contentType = sop?.contentType || (steps.length ? "text" : "text");
  return {
    ...sop,
    contentType,
    audienceRole: sop?.audienceRole || "all",
    steps,
    stepCount: steps.length,
  };
}
