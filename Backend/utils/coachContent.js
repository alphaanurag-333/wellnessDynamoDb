const { normalizeStoredMedia, resolvePublicUrl, getObjectLastModified } = require("./s3");

const INTRO_SOURCE_TYPES = new Set(["upload", "link", "gallery"]);

const LEGACY_COMMITMENT_LETTER_TEXT =
  "I commit to following my personalised wellness protocol, logging my daily reflection, and partnering with my wellness coach for the full duration of my program.";

const DEFAULT_COMMITMENT_LETTER_TEXT = [
  "I, {name}, commit to following the wellness programme designed for me by India Redefining Wellness (IRW). I understand this is a partnership — my coach guides me, but lasting change comes from my daily choices.",
  "• I will track my meals, water, and reflection honestly in the app.",
  "• I will communicate openly with my coach about challenges.",
  "• I will attend scheduled check-ins and complete assigned protocols.",
  "• I understand that results depend on consistency over time, and I commit to giving this programme my genuine effort for the full duration of my membership.",
].join("\n\n");

function resolveCommitmentLetterText(value) {
  const text = asString(value);
  if (!text || text === LEGACY_COMMITMENT_LETTER_TEXT) return DEFAULT_COMMITMENT_LETTER_TEXT;
  return text;
}

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function asBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return Boolean(fallback);
}

function asInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function asMediaKey(value) {
  const raw = asString(value);
  if (!raw) return "";
  return normalizeStoredMedia(raw) || "";
}

function emptyIntroVideo() {
  return {
    title: "",
    description: "",
    sourceType: "",
    videoKey: "",
    linkUrl: "",
    coverKey: "",
    live: false,
    version: 0,
    duration: "",
    uploadedAt: "",
    galleryPickId: "",
  };
}

function emptyLetterSignoff() {
  return {
    signed: false,
    signedAt: "",
    signedVersion: 0,
    fileKey: "",
    live: false,
  };
}

function normalizeIntroVideo(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const sourceType = asString(src.sourceType).toLowerCase();
  return {
    title: asString(src.title),
    description: asString(src.description),
    sourceType: INTRO_SOURCE_TYPES.has(sourceType) ? sourceType : "",
    videoKey: asMediaKey(src.videoKey || src.videoUrl),
    linkUrl: asString(src.linkUrl),
    coverKey: asMediaKey(src.coverKey || src.coverUrl),
    live: asBool(src.live, false),
    version: asInt(src.version, 0),
    duration: asString(src.duration),
    uploadedAt: asString(src.uploadedAt),
    galleryPickId: asString(src.galleryPickId),
  };
}

function normalizeLetterSignoff(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    signed: asBool(src.signed, false),
    signedAt: asString(src.signedAt),
    signedVersion: asInt(src.signedVersion, 0),
    fileKey: asMediaKey(src.fileKey || src.fileUrl),
    live: asBool(src.live, false),
  };
}

function normalizeCoachContent(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    intro: normalizeIntroVideo(src.intro),
    letter: normalizeLetterSignoff(src.letter),
  };
}

function toPublicIntroVideo(intro) {
  const normalized = normalizeIntroVideo(intro);
  const videoUrl = resolvePublicUrl(normalized.videoKey) || "";
  const coverUrl = resolvePublicUrl(normalized.coverKey) || "";
  const hasMedia = Boolean(videoUrl || normalized.linkUrl);
  const live = Boolean(normalized.live) && hasMedia;
  return {
    title: normalized.title,
    description: normalized.description,
    sourceType: normalized.sourceType,
    videoUrl,
    linkUrl: normalized.linkUrl,
    coverUrl,
    live,
    version: normalized.version,
    duration: normalized.duration,
    uploadedAt: normalized.uploadedAt,
    galleryPickId: normalized.galleryPickId,
  };
}

function toPublicLetterSignoff(letter) {
  const normalized = normalizeLetterSignoff(letter);
  const fileUrl = resolvePublicUrl(normalized.fileKey) || "";
  const hasFile = Boolean(fileUrl);
  return {
    signed: Boolean(normalized.signed) && hasFile,
    signedAt: normalized.signedAt,
    signedVersion: normalized.signedVersion,
    fileUrl,
    live: Boolean(normalized.live) && hasFile,
  };
}

function toPublicCoachContent(content) {
  const normalized = normalizeCoachContent(content);
  return {
    intro: toPublicIntroVideo(normalized.intro),
    letter: toPublicLetterSignoff(normalized.letter),
  };
}

function introHasMedia(intro) {
  const normalized = normalizeIntroVideo(intro);
  return Boolean(normalized.videoKey || normalized.linkUrl);
}

function letterHasFile(letter) {
  return Boolean(normalizeLetterSignoff(letter).fileKey);
}

/**
 * Ensure intro.uploadedAt is set when media exists.
 * Prefers S3 LastModified for uploaded files; falls back to now for links.
 * Returns { intro, changed }.
 */
async function ensureIntroUploadedAt(intro) {
  const normalized = normalizeIntroVideo(intro);
  if (!introHasMedia(normalized) || normalized.uploadedAt) {
    return { intro: normalized, changed: false };
  }
  let uploadedAt = "";
  if (normalized.videoKey) {
    uploadedAt = await getObjectLastModified(normalized.videoKey);
  }
  if (!uploadedAt) uploadedAt = new Date().toISOString();
  return {
    intro: { ...normalized, uploadedAt },
    changed: true,
  };
}

module.exports = {
  DEFAULT_COMMITMENT_LETTER_TEXT,
  LEGACY_COMMITMENT_LETTER_TEXT,
  resolveCommitmentLetterText,
  emptyIntroVideo,
  emptyLetterSignoff,
  normalizeIntroVideo,
  normalizeLetterSignoff,
  normalizeCoachContent,
  toPublicIntroVideo,
  toPublicLetterSignoff,
  toPublicCoachContent,
  introHasMedia,
  letterHasFile,
  ensureIntroUploadedAt,
  asBool,
  asString,
  asInt,
};
