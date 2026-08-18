export const WELLNESS_LIBRARY_PAGE_SIZE = 20;
export const WELLNESS_VIDEO_MAX_MB = 25;
export const WELLNESS_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo";

export const WELLNESS_LIBRARY_TYPES = [
  { value: "video", label: "Video (Upload file)" },
  { value: "ytlink", label: "YT Link (YouTube URL)" },
];

export const WELLNESS_LIBRARY_KINDS = {
  mental: {
    id: "mental",
    title: "Mental & Emotional Wellbeing",
    noun: "item",
    subtitle: "Private library of videos. Coaches pick which appear in a client’s app.",
    addLabel: "+ Add item",
    configId: "common-mental-wellbeing",
  },
  yoga: {
    id: "yoga",
    title: "Yoga",
    noun: "session",
    subtitle: "Private yoga library. Coaches pick which sessions appear in a client’s app.",
    addLabel: "+ Add yoga",
    configId: "common-wellness-yoga",
  },
  exercise: {
    id: "exercise",
    title: "Physical Exercise",
    noun: "exercise",
    subtitle: "Private exercise library. Coaches pick which videos appear in a client’s app.",
    addLabel: "+ Add exercise",
    configId: "common-physical-exercise",
  },
};

export function emptyWellnessDraft() {
  return {
    title: "",
    type: "ytlink",
    ytLink: "",
    duration: "",
  };
}

export function resolveLibraryType(type) {
  const next = String(type || "").toLowerCase();
  if (next === "video" || next === "ytlink" || next === "audio") return next;
  return "ytlink";
}

export function durationFromSeconds(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (!Number.isFinite(Number(totalSeconds)) || !total) return "";
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function sanitizeTimeInput(value) {
  return String(value || "").replace(/[^\d:]/g, "").slice(0, 8);
}

export function isBareNumber(value) {
  return /^\d+$/.test(String(value || "").trim());
}

export function isValidDuration(value) {
  return /^(?:\d{1,2}:[0-5]\d:[0-5]\d|\d{1,3}:[0-5]\d)$/.test(String(value || "").trim());
}

export function extractYoutubeId(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./i, "");
    if (host === "youtu.be") return parsed.pathname.replace(/^\//, "").split("/")[0] || "";
    if (!host.endsWith("youtube.com")) return "";
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") return parts[1] || "";
    return "";
  } catch {
    return "";
  }
}

export function isValidYoutubeUrl(url) {
  return Boolean(extractYoutubeId(url));
}

export function readVideoFileDuration(file) {
  return new Promise((resolve) => {
    if (!(file instanceof File)) {
      resolve("");
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? durationFromSeconds(video.duration) : "";
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("");
    };
    video.src = url;
  });
}

export function displayTypeLabel(type) {
  if (type === "audio") return "Audio";
  if (type === "ytlink") return "YouTube";
  return "Video";
}

export function youtubeSourceLabel(url) {
  return extractYoutubeId(url) ? "YouTube" : "";
}

export function mapWellnessLibraryItem(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const type = resolveLibraryType(row.type || row.mediaType);
  const ytLink = String(row.ytLink || (type === "ytlink" ? row.link : "") || "").trim();
  const fileUrl = type === "video" || type === "audio"
    ? String(row.file || (type === "video" ? row.link : "") || "").trim()
    : "";
  return {
    id: String(id),
    title: String(row.title || "").trim(),
    type,
    ytLink,
    fileUrl,
    hasFile: Boolean(fileUrl),
    thumbnail: row.thumbnail || "",
    duration: String(row.duration || "").trim(),
    status: row.status === "inactive" ? "inactive" : "active",
    live: row.status !== "inactive",
    source: type === "ytlink" ? youtubeSourceLabel(ytLink) || "YouTube" : type === "audio" ? "Audio" : "Uploaded video",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
