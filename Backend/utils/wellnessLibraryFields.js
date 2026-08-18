const DURATION_RE = /^(?:\d{1,2}:[0-5]\d:[0-5]\d|\d{1,3}:[0-5]\d)$/;
const YT_HOSTS = /(^|\.)youtube\.com$/i;
const YT_SHORT = /(^|\.)youtu\.be$/i;

function durationFromSeconds(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (!total) return "";
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function normalizeDuration(value, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/^\d+$/.test(raw)) return "";
  if (!DURATION_RE.test(raw)) return "";
  const parts = raw.split(":");
  if (parts.length === 2) {
    return `${String(Number(parts[0]))}:${String(parts[1]).padStart(2, "0")}`;
  }
  return `${String(Number(parts[0]))}:${String(parts[1]).padStart(2, "0")}:${String(parts[2]).padStart(2, "0")}`;
}

function isValidDuration(value) {
  return Boolean(normalizeDuration(value));
}

function extractYoutubeId(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./i, "");
    if (YT_SHORT.test(host)) {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || "";
    }
    if (!YT_HOSTS.test(host)) return "";
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      return parts[1] || "";
    }
    return "";
  } catch {
    return "";
  }
}

function isValidYoutubeUrl(url) {
  return Boolean(extractYoutubeId(url));
}

function displayMediaType(type) {
  const next = String(type || "").toLowerCase();
  if (next === "audio") return "audio";
  if (next === "video") return "video";
  return "ytlink";
}

function resolveLibraryType(value, fallback = "ytlink") {
  const next = String(value || fallback).toLowerCase().trim();
  if (next === "video" || next === "ytlink" || next === "audio") return next;
  return fallback;
}

async function fetchYoutubeDuration(url) {
  const id = extractYoutubeId(url);
  if (!id) return "";
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const seconds = html.match(/"lengthSeconds":"(\d+)"/) || html.match(/"lengthSeconds":(\d+)/);
    if (seconds) return durationFromSeconds(seconds[1]);
    const millis = html.match(/"approxDurationMs":"(\d+)"/);
    if (millis) return durationFromSeconds(Number(millis[1]) / 1000);
    return "";
  } catch {
    return "";
  }
}

async function resolveDuration({ duration, ytLink } = {}) {
  const raw = String(duration ?? "").trim();
  if (raw) return normalizeDuration(raw);
  if (ytLink) return fetchYoutubeDuration(ytLink);
  return "";
}

module.exports = {
  normalizeDuration,
  isValidDuration,
  durationFromSeconds,
  extractYoutubeId,
  isValidYoutubeUrl,
  displayMediaType,
  resolveLibraryType,
  fetchYoutubeDuration,
  resolveDuration,
};
