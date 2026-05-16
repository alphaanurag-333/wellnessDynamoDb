export const LIST_LIMIT = 10;
export const TYPE_OPTIONS = ["link", "video"];
export const NAME_MAX_LEN = 100;
export const YTLINK_MAX_LEN = 500;
export const SEARCH_MAX_LEN = 120;
export const VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024;
export const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function emptyForm() {
  return { name: "", type: "link", ytLink: "", video: "", profile_image: "", status: "active" };
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}
