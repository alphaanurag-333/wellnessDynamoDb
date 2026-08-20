import api, { normalizeApiError } from "../api.js";
import {
  normalizeCommitmentLetterText,
} from "../data/commitmentLetterData.js";
import { MEASUREMENT_IMAGE_MAX_SIZE_MB, MEASUREMENT_VIDEO_MAX_SIZE_MB } from "../data/measurementVideoData.js";
import { readVideoFileDuration } from "../data/wellnessLibraryData.js";

const AVATAR_COLORS = ["#22c55e", "#8b5cf6", "#14b8a6", "#f97316", "#a78bfa", "#a16207", "#3b82f6", "#ec4899"];
const MY_CONTENT_AVATAR_COLORS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#a855f7", "#c2661d"];
const MY_CONTENT_ROLE_KEYS = ["wellness_coach", "assistant_wellness_coach", "trainee"];

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export const ONBOARDING_PAGE_SIZE = 20;

function introStatus(intro = {}) {
  const hasMedia = Boolean(intro.videoUrl || intro.linkUrl);
  if (intro.live && hasMedia) return "live";
  if (hasMedia) return "draft";
  return "not-uploaded";
}

export function coachIntroDisplayTitle(name, intro = {}) {
  const title = String(intro.title || "").trim();
  if (title) return title;
  if (intro.videoUrl || intro.linkUrl) return `Coach intro — ${name || "coach"}`;
  return "";
}

export function mapAccountToOnboardingCoach(account, index = 0) {
  const intro = account?.coach_content?.intro || {};
  const hasMedia = Boolean(intro.videoUrl || intro.linkUrl);
  const live = Boolean(intro.live) && hasMedia;
  const name = account.name || "Unnamed coach";
  return {
    id: account.id,
    tag: `ONB-${String(index + 1).padStart(2, "0")}`,
    name,
    clients: 0,
    title: intro.title || "",
    displayTitle: coachIntroDisplayTitle(name, intro),
    description: intro.description || "",
    duration: intro.duration || "",
    status: introStatus(intro),
    live,
    hasMedia,
    version: Number(intro.version) || 0,
    sourceType: intro.sourceType || "",
    hasCover: Boolean(intro.coverUrl),
    coverUrl: intro.coverUrl || "",
    videoUrl: intro.videoUrl || "",
    galleryPickId: intro.galleryPickId || null,
    linkUrl: intro.linkUrl || "",
  };
}

export function mergeOnboardingCoach(previous, account) {
  const mapped = mapAccountToOnboardingCoach(account, 0);
  return {
    ...mapped,
    tag: previous?.tag || mapped.tag,
    clients: previous?.clients ?? mapped.clients,
  };
}

export function mapAccountToLetterCoach(account, letterVersion = 1, index = 0) {
  const letter = account?.coach_content?.letter || {};
  const signedVersion = Number(letter.signedVersion) || 0;
  const hasFile = Boolean(letter.fileUrl);
  const signed = hasFile && (Boolean(letter.signed) || signedVersion === Number(letterVersion));
  return {
    id: account.id,
    name: account.name || "Unnamed coach",
    initials: initialsFromName(account.name),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    status: signed ? "signed" : "pending",
    signedAt: letter.signedAt || "",
    fileUrl: letter.fileUrl || "",
    live: Boolean(letter.live) && hasFile,
  };
}

export function mapCommitmentLetterConfig(config = {}) {
  const text = normalizeCommitmentLetterText(config.commitment_letter_text);
  const version = Math.max(1, Number(config.commitment_letter_version) || 1);
  return { text, version };
}

const COACH_ROLE_LABELS = {
  wellness_coach: "Wellness Coach",
  assistant_wellness_coach: "Assistant Wellness Coach",
  trainee: "Trainee",
};

async function listWellnessCoachAccounts({
  page = 1,
  limit = ONBOARDING_PAGE_SIZE,
  roleKey = "wellness_coach",
} = {}) {
  const { data } = await api.get("/account/accounts", {
    params: { roleKey, status: "active", page, limit },
  });
  return {
    accounts: Array.isArray(data?.accounts) ? data.accounts : [],
    pagination: data?.pagination || {
      page,
      limit,
      total: Array.isArray(data?.accounts) ? data.accounts.length : 0,
      pages: 1,
    },
  };
}

export async function listOnboardingCoaches({ page = 1, limit = ONBOARDING_PAGE_SIZE } = {}) {
  try {
    const { accounts, pagination } = await listWellnessCoachAccounts({ page, limit });
    const offset = (Math.max(1, Number(pagination.page) || page) - 1) * (Number(pagination.limit) || limit);
    return {
      coaches: accounts.map((account, index) => mapAccountToOnboardingCoach(account, offset + index)),
      pagination: {
        page: Number(pagination.page) || page,
        limit: Number(pagination.limit) || limit,
        total: Number(pagination.total) || accounts.length,
        pages: Number(pagination.pages) || 1,
      },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachIntroCopy(accountId, { title, description }) {
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, {
      title: String(title || "").trim(),
      description: String(description || "").trim(),
    });
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachIntroLink(accountId, url) {
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, {
      sourceType: "link",
      linkUrl: String(url || "").trim(),
    });
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachIntroVideo(accountId, file) {
  const fd = new FormData();
  fd.append("intro_video", file);
  const duration = await readVideoFileDuration(file);
  if (duration) fd.append("duration", duration);
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, fd);
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachIntroCover(accountId, file) {
  const fd = new FormData();
  fd.append("intro_cover", file);
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, fd);
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachIntroLive(accountId, live) {
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, {
      live: Boolean(live),
    });
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachLetterFile(accountId, file) {
  const fd = new FormData();
  fd.append("letter_file", file);
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, fd);
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachLetterLive(accountId, live) {
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, {
      letter_live: Boolean(live),
    });
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachIntroGalleryPick(accountId, galleryPickId) {
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(accountId)}/coach-content`, {
      galleryPickId,
    });
    return data?.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function getCommitmentLetterConfig() {
  try {
    const { data } = await api.get("/admin/app-config");
    return mapCommitmentLetterConfig(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCommitmentLetterText(text) {
  try {
    const { data } = await api.patch("/admin/app-config", {
      commitment_letter_text: String(text || "").trim(),
    });
    return mapCommitmentLetterConfig(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listCommitmentLetterCoaches(letterVersion = 1) {
  try {
    const { accounts } = await listWellnessCoachAccounts({ page: 1, limit: 200 });
    return accounts.map((account, index) => mapAccountToLetterCoach(account, letterVersion, index));
  } catch (error) {
    normalizeApiError(error);
  }
}

export function validateIntroVideoFile(file) {
  if (!file) return "Choose a video file";
  const type = String(file.type || "").toLowerCase();
  if (type && !type.startsWith("video/")) return "Upload a video file";
  if (file.size > MEASUREMENT_VIDEO_MAX_SIZE_MB * 1024 * 1024) {
    return `Video must be ${MEASUREMENT_VIDEO_MAX_SIZE_MB} MB or smaller`;
  }
  return "";
}

export function validateIntroCoverFile(file) {
  if (!file) return "Choose an image file";
  const type = String(file.type || "").toLowerCase();
  if (type && !type.startsWith("image/")) return "Upload an image file";
  if (file.size > MEASUREMENT_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
    return `Image must be ${MEASUREMENT_IMAGE_MAX_SIZE_MB} MB or smaller`;
  }
  return "";
}

export function validateLetterPdfFile(file) {
  if (!file) return "Choose a PDF file";
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  if (type && type !== "application/pdf" && !name.endsWith(".pdf")) return "Upload a PDF file";
  if (file.size > MEASUREMENT_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
    return `PDF must be ${MEASUREMENT_IMAGE_MAX_SIZE_MB} MB or smaller`;
  }
  return "";
}

function formatContentDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatIntroVideoMeta(intro = {}) {
  const hasVideo = Boolean(intro.videoUrl || intro.linkUrl || intro.hasMedia);
  if (!hasVideo) return "Not uploaded yet";
  const uploadedLabel = formatContentDate(intro.uploadedAt);
  const parts = [];
  if (intro.duration) parts.push(intro.duration);
  if (uploadedLabel) {
    parts.push(`Uploaded ${uploadedLabel}`);
  } else if (intro.sourceType === "link") {
    parts.push("Linked video");
  } else {
    parts.push("Uploaded");
  }
  return parts.join(" · ") || "Uploaded";
}

export function buildCoachProfileContent(account, letterConfig = {}) {
  const intro = account?.coach_content?.intro || {};
  const letter = account?.coach_content?.letter || {};
  const hasVideo = Boolean(intro.videoUrl || intro.linkUrl);
  const hasLetter = Boolean(letter.fileUrl);
  const signedLabel = formatContentDate(letter.signedAt);

  return {
    video: {
      id: "intro",
      kind: "video",
      title: "My intro video",
      meta: formatIntroVideoMeta(intro),
      live: Boolean(intro.live) && hasVideo,
      hasMedia: hasVideo,
      videoUrl: intro.videoUrl || "",
      linkUrl: intro.linkUrl || "",
      coverUrl: intro.coverUrl || "",
      description: intro.description || "",
      duration: intro.duration || "",
      uploadedAt: intro.uploadedAt || "",
      version: Number(intro.version) || 0,
      sourceType: intro.sourceType || "",
    },
    letter: {
      id: "letter",
      kind: "letter",
      title: "My commitment letter",
      meta: hasLetter
        ? [signedLabel ? `Signed ${signedLabel}` : "Uploaded", "PDF"].join(" · ")
        : "Not uploaded yet",
      live: Boolean(letter.live) && hasLetter,
      hasMedia: hasLetter,
      fileUrl: letter.fileUrl || "",
      signedAt: letter.signedAt || "",
      text: letterConfig.text || "",
      version: letterConfig.version || 1,
      templateUrl: letterConfig.templateUrl || "",
    },
  };
}

function primaryCoachRoleKey(account) {
  const keys = Array.isArray(account?.roleKeys) ? account.roleKeys.map(String) : [];
  if (keys.includes("wellness_coach")) return "wellness_coach";
  if (keys.includes("assistant_wellness_coach")) return "assistant_wellness_coach";
  if (keys.includes("trainee")) return "trainee";
  return "wellness_coach";
}

export function mapAccountToMyContentCoach(account, letterConfig = {}, index = 0) {
  const content = buildCoachProfileContent(account, letterConfig);
  const video = {
    ...content.video,
    title: "Intro video",
    primaryAction: content.video.hasMedia ? "Replace" : "Upload",
    secondaryAction: "View",
  };
  const letter = {
    ...content.letter,
    title: "Commitment letter",
    primaryAction: content.letter.hasMedia ? "Replace" : "Upload",
    secondaryAction: "View",
    letterCoachId: account?.id,
  };
  const liveCount = [video, letter].filter((item) => item.live).length;
  const clients = Number(account?.clientCount);
  const roleKey = primaryCoachRoleKey(account);
  const supportName =
    account?.supportsCoachName ||
    account?.supportedCoachName ||
    account?.assistantOfName ||
    account?.wellnessCoachName ||
    "";
  const meta =
    Number.isFinite(clients) && clients > 0
      ? `${clients} clients`
      : supportName
        ? `supports ${supportName}`
        : "";
  return {
    id: account?.id,
    name: account?.name || "Unnamed coach",
    role: COACH_ROLE_LABELS[roleKey] || "Coach",
    meta,
    clients: Number.isFinite(clients) ? clients : null,
    initial: initialsFromName(account?.name),
    color: MY_CONTENT_AVATAR_COLORS[index % MY_CONTENT_AVATAR_COLORS.length],
    liveCount,
    liveLabel: `${liveCount} of 2 live`,
    items: [video, letter],
  };
}

export async function listMyContentCoaches({
  roleKey,
  roleKeys = MY_CONTENT_ROLE_KEYS,
  letterConfig,
} = {}) {
  try {
    const config = letterConfig || (await getCommitmentLetterConfig().catch(() => ({ text: "", version: 1 })));
    const keys = roleKey
      ? [roleKey]
      : Array.isArray(roleKeys) && roleKeys.length
        ? roleKeys
        : MY_CONTENT_ROLE_KEYS;
    const batches = await Promise.all(
      keys.map((key) =>
        listWellnessCoachAccounts({ page: 1, limit: 200, roleKey: key }).catch(() => ({ accounts: [] })),
      ),
    );
    const unique = [];
    const seen = new Set();
    for (const batch of batches) {
      for (const account of batch.accounts || []) {
        if (!account?.id || seen.has(account.id)) continue;
        seen.add(account.id);
        unique.push(account);
      }
    }
    const coaches = unique
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }))
      .map((account, index) => mapAccountToMyContentCoach(account, config, index));
    return { coaches, letterConfig: config };
  } catch (error) {
    normalizeApiError(error);
  }
}

export function videoPreviewSrc(item) {
  const url = String(item?.linkUrl || item?.videoUrl || "").trim();
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { type: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (item?.videoUrl) return { type: "video", src: item.videoUrl };
  return { type: "iframe", src: url };
}

export async function getMyCoachContent() {
  try {
    const { data } = await api.get("/account/auth/me/coach-content");
    return {
      account: data?.account || null,
      letter: data?.letter || {},
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMyIntroVideo(file) {
  const fd = new FormData();
  fd.append("intro_video", file);
  const duration = await readVideoFileDuration(file);
  if (duration) fd.append("duration", duration);
  try {
    const { data } = await api.patch("/account/auth/me/coach-content", fd);
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMyIntroLink(url) {
  try {
    const { data } = await api.patch("/account/auth/me/coach-content", {
      sourceType: "link",
      linkUrl: String(url || "").trim(),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMyIntroLive(live) {
  try {
    const { data } = await api.patch("/account/auth/me/coach-content", { live: Boolean(live) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMyLetterFile(file) {
  const fd = new FormData();
  fd.append("letter_file", file);
  try {
    const { data } = await api.patch("/account/auth/me/coach-content", fd);
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMyLetterLive(live) {
  try {
    const { data } = await api.patch("/account/auth/me/coach-content", { letter_live: Boolean(live) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
