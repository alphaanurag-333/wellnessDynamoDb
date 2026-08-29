export function youtubeEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  if (raw.includes("/embed/")) {
    try {
      const parsed = new URL(raw);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;

      const parts = parsed.pathname.split("/").filter(Boolean);
      // /shorts/VIDEO_ID, /live/VIDEO_ID, /v/VIDEO_ID
      const pathTypes = new Set(["shorts", "live", "v", "embed"]);
      if (parts.length >= 2 && pathTypes.has(parts[0]) && parts[1]) {
        return `https://www.youtube.com/embed/${parts[1]}`;
      }
    }

    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    return "";
  }

  return "";
}
