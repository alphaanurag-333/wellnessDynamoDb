const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;
const PATH_TYPES = new Set(["shorts", "live", "v", "embed"]);

function cleanVideoId(value) {
  const id = String(value || "").trim();
  return VIDEO_ID_PATTERN.test(id) ? id : "";
}

export function youtubeVideoId(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "");
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") return cleanVideoId(parts[0]);

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = cleanVideoId(parsed.searchParams.get("v"));
      if (fromQuery) return fromQuery;
      // /shorts/VIDEO_ID, /live/VIDEO_ID, /v/VIDEO_ID, /embed/VIDEO_ID
      const typeIndex = parts.findIndex((part) => PATH_TYPES.has(part));
      if (typeIndex >= 0) return cleanVideoId(parts[typeIndex + 1]);
    }
  } catch {
    return "";
  }

  return "";
}

export function youtubeEmbedUrl(url) {
  const videoId = youtubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

export function youtubeThumbnailUrl(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
}

let iframeApiPromise = null;

export function loadYouTubeIframeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") previousReady();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      iframeApiPromise = null;
      script.remove();
      reject(new Error("Failed to load YouTube IFrame API"));
    };
    document.head.appendChild(script);
  });

  return iframeApiPromise;
}
